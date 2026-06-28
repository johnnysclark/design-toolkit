import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBrainstormSystem, type BrainstormContext } from "@/lib/anthropic/gable-brainstorm-prompts";
import { resolveModel } from "@/lib/anthropic/models";

export const runtime = "nodejs";
// Streaming for instant first-token; Vercel Pro allows up to ~300s. (Mirror AI_MAX_DURATION.)
export const maxDuration = 300;

const MAX_TURNS = 20; // cap replayed history (defense against oversized payloads)
const MAX_CONTENT = 4000; // per-message char cap

type ChatMsg = { role: "user" | "assistant"; content: string };

// Sanitize the live design context the client sends (current metric values +
// the goals already on the board) so it can be fed safely into the system prompt.
function readContext(raw: any): BrainstormContext {
  const ctx: BrainstormContext = {};
  if (raw && typeof raw === "object") {
    if (raw.metrics && typeof raw.metrics === "object") {
      const m: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw.metrics)) {
        if (typeof k === "string" && k.length < 40 && typeof v === "number" && Number.isFinite(v)) m[k] = v;
      }
      ctx.metrics = m;
    }
    if (Array.isArray(raw.goals)) {
      ctx.goals = raw.goals
        .filter((g: any) => g && typeof g.metricKey === "string" && typeof g.op === "string")
        .slice(0, 24)
        .map((g: any) => ({ metricKey: String(g.metricKey).slice(0, 40), op: String(g.op).slice(0, 8), rhs: g.rhs }));
    }
  }
  return ctx;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });
  }

  // Cost protection: the studio is public to browse, but this route spends the
  // Anthropic key, so it must never run for an anonymous caller.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in to use the force brainstormer." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawMsgs: any[] = Array.isArray(body?.messages) ? body.messages : [];
  const messages: ChatMsg[] = rawMsgs
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_CONTENT) }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-MAX_TURNS);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Ask a question to brainstorm goals." }, { status: 400 });
  }

  // Shared Fast ⇄ Deep toggle (Haiku vs Sonnet) — the toolkit-wide cost lever.
  const { model } = resolveModel(body?.tier);
  const ctx = readContext(body?.context);
  const system = buildBrainstormSystem(ctx);

  const client = new Anthropic();
  const anthropicStream = client.messages.stream({
    model,
    max_tokens: 1600, // short prose + a small goals block
    // The catalog + method in the system prompt are stable across a session, so
    // cache it — only the (small) live context differs per call.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages
  });

  const enc = new TextEncoder();
  const rs = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      let full = "";
      let stopReason: string | null = null;

      try {
        for await (const ev of anthropicStream as any) {
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
            full += ev.delta.text;
            send("token", { text: ev.delta.text });
          } else if (ev.type === "message_delta" && ev.delta?.stop_reason) {
            stopReason = ev.delta.stop_reason;
          }
        }

        if (stopReason === "refusal") {
          send("error", { message: "The model declined this request." });
          controller.close();
          return;
        }

        const finalText =
          full.trim() ||
          (stopReason === "max_tokens"
            ? "(That got cut off — try describing one quality at a time.)"
            : "(No reply was produced — please try again.)");

        // One tool_runs row per turn ("the trace"). Never let logging break the response.
        try {
          await supabase.from("tool_runs").insert({
            owner: user.id,
            tool: "gable-studio:brainstorm",
            input: { turns: messages.length, question: messages[messages.length - 1].content, goals: ctx.goals?.length ?? 0 },
            output: { reply: finalText, model }
          });
        } catch {
          // ignore trace failures
        }

        send("done", { text: finalText });
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
