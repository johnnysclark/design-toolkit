import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  MODEL,
  META_SENTINEL,
  splitMeta,
  buildSystem,
  type Level
} from "@/lib/anthropic/skills-coach-prompts";
import { DISCIPLINES, type Discipline } from "@/lib/skills-coach/concepts";

export const runtime = "nodejs";
// Streaming gives instant first-token, but the Hobby plan still caps the whole
// function at 60s. Raise on Vercel Pro (up to 300) if answers run long.
export const maxDuration = 60;

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
const DISC_IDS = DISCIPLINES.map((d) => d.id) as Discipline[];

const BUCKET = "coach-uploads";

// Anthropic vision accepts only these raster formats; PDFs go in a document
// block. Anything else (HEIC, 3D files, .ghx) is handled client-side / deferred.
const IMAGE_MEDIA: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp"
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // keep base64 well under the 10MB image cap
const MAX_PDF_BYTES = 24 * 1024 * 1024; // keep base64 under the 32MB request cap

type Attachment = { path: string; kind: "image" | "pdf" };

// Turn a stored attachment into an Anthropic content block, or null if it can't
// be used (missing, too big, unsupported). Never throws — a bad attachment just
// degrades to a text-only turn.
async function attachmentBlock(
  supabase: any,
  userId: string,
  att: Attachment
): Promise<any | null> {
  if (!att?.path || !att.path.startsWith(`${userId}/`)) return null; // defense in depth (RLS also enforces)
  const ext = att.path.split(".").pop()?.toLowerCase() ?? "";

  const { data, error } = await supabase.storage.from(BUCKET).download(att.path);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());

  if (att.kind === "pdf" || ext === "pdf") {
    if (buf.length > MAX_PDF_BYTES) return null;
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") }
    };
  }
  const media = IMAGE_MEDIA[ext];
  if (!media || buf.length > MAX_IMAGE_BYTES) return null;
  return {
    type: "image",
    source: { type: "base64", media_type: media, data: buf.toString("base64") }
  };
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  // Cost protection: the Toolkit shell is public, but this route spends the
  // Anthropic key + writes per-user rows, so it must never run for an anon caller.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in to use Coach." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = String(body?.message ?? "").trim();
  const att: Attachment | null = body?.attachment?.path
    ? { path: String(body.attachment.path), kind: body.attachment.kind === "pdf" ? "pdf" : "image" }
    : null;
  if (!message && !att) {
    return Response.json({ error: "Type a question or attach a file." }, { status: 400 });
  }

  const level: Level = LEVELS.includes(body?.level) ? body.level : "intermediate";
  const discipline: Discipline = DISC_IDS.includes(body?.discipline)
    ? body.discipline
    : "general";

  // Resolve / create the conversation (RLS scopes selects to the owner, so a
  // foreign conversationId simply isn't found and we start a fresh thread).
  let conversationId: string | null = null;
  if (body?.conversationId) {
    const { data } = await supabase
      .from("coach_conversations")
      .select("id")
      .eq("id", body.conversationId)
      .maybeSingle();
    conversationId = data?.id ?? null;
  }
  if (!conversationId) {
    const title = message ? message.slice(0, 80) : "Uploaded a file";
    const { data, error } = await supabase
      .from("coach_conversations")
      .insert({ owner: user.id, discipline, title })
      .select("id")
      .single();
    if (error || !data) {
      return Response.json({ error: "Could not start a conversation." }, { status: 500 });
    }
    conversationId = data.id;
  }

  // Replay prior turns (text only — a past upload was analyzed in that turn's
  // answer; we don't re-send old image bytes every request).
  const { data: history } = await supabase
    .from("coach_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messages: any[] = (history ?? [])
    .filter((m: any) => m.role === "user" || m.role === "assistant")
    .map((m: any) => ({
      role: m.role,
      content: m.content && m.content.trim() ? m.content : "[uploaded a file]"
    }));

  // Build the current user turn (attachment block first, then the text).
  const block = att ? await attachmentBlock(supabase, user.id, att) : null;
  const userText = message || "Here's my file — can you take a look and help?";
  messages.push(
    block
      ? { role: "user", content: [block, { type: "text", text: userText }] }
      : { role: "user", content: userText }
  );

  // Persist the student's turn before calling the model, so it survives a
  // mid-stream failure. Store the original typed text (may be empty + attachment).
  await supabase.from("coach_messages").insert({
    conversation_id: conversationId,
    owner: user.id,
    role: "user",
    content: message,
    level,
    attachment_path: att?.path ?? null
  });

  const system = buildSystem(level, discipline);
  const client = new Anthropic();
  const anthropicStream = client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages
  });

  const enc = new TextEncoder();
  const HOLD = META_SENTINEL.length; // never flash the sentinel (or a partial of it)

  const rs = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      let full = "";
      let forwarded = 0;
      let metaSeen = false;
      let stopReason: string | null = null;

      const pump = () => {
        if (metaSeen) return;
        const i = full.indexOf(META_SENTINEL);
        let safeEnd: number;
        if (i !== -1) {
          safeEnd = i;
          metaSeen = true;
        } else {
          // withhold a trailing window that could be the start of the sentinel
          safeEnd = Math.max(forwarded, full.length - (HOLD - 1));
        }
        if (safeEnd > forwarded) {
          send("token", { text: full.slice(forwarded, safeEnd) });
          forwarded = safeEnd;
        }
      };

      try {
        for await (const ev of anthropicStream as any) {
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
            full += ev.delta.text;
            pump();
          } else if (ev.type === "message_delta" && ev.delta?.stop_reason) {
            stopReason = ev.delta.stop_reason;
          }
        }

        if (stopReason === "refusal") {
          send("error", { message: "The model declined this request." });
          controller.close();
          return;
        }

        const { prose, meta } = splitMeta(full);
        const finalProse =
          prose ||
          (stopReason === "max_tokens"
            ? "(That answer got cut off — try asking for a shorter version or one step.)"
            : "(No answer was produced — please try again.)");

        // Persist the assistant turn + one tool_runs row ("the trace").
        const { data: inserted } = await supabase
          .from("coach_messages")
          .insert({
            conversation_id: conversationId,
            owner: user.id,
            role: "assistant",
            content: finalProse,
            level,
            meta
          })
          .select("id")
          .single();

        try {
          await supabase.from("tool_runs").insert({
            owner: user.id,
            tool: "skills-coach",
            input: { conversationId, level, discipline, message, attachment: att },
            output: { prose: finalProse, meta, model: MODEL }
          });
        } catch {
          // never let trace logging break the response
        }

        send("meta", {
          concept: meta.concept,
          claims: meta.claims,
          report_back: meta.report_back,
          further_ideas: meta.further_ideas
        });
        send("done", {
          conversationId,
          messageId: inserted?.id ?? null,
          prose: finalProse
        });
      } catch (err: any) {
        send("error", { message: err?.message || "Something went wrong." });
      } finally {
        controller.close();
      }
    },
    cancel() {
      // client disconnected — stop billing the model call
      try {
        const s = anthropicStream as any;
        s.abort?.();
        s.controller?.abort?.();
      } catch {
        // ignore
      }
    }
  });

  return new Response(rs, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
