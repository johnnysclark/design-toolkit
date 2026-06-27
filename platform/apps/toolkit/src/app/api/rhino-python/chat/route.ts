import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildSystem, type SnippetEnv } from "@/lib/anthropic/rhino-python-prompts";
import { resolveModel } from "@/lib/anthropic/models";

export const runtime = "nodejs";
// Streaming for instant first-token; Vercel Pro allows up to ~300s so long
// rewrites finish instead of getting cut off. (Mirror AI_MAX_DURATION.)
export const maxDuration = 300;

const MAX_TURNS = 24; // cap replayed history (defense against oversized payloads)
const MAX_CONTENT = 8000; // per-message char cap
const MAX_CODE = 20000; // snippet code cap

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  // Cost protection: the gallery is public to browse, but this route spends the
  // Anthropic key, so it must never run for an anonymous caller.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in to edit snippets with AI." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = String(body?.script?.title ?? "Snippet").slice(0, 160);
  const env: SnippetEnv = body?.script?.env === "rhino" ? "rhino" : "gh";
  const code = String(body?.script?.code ?? "").slice(0, MAX_CODE);
  if (!code.trim()) {
    return Response.json({ error: "Missing snippet code." }, { status: 400 });
  }

  const rawMsgs: any[] = Array.isArray(body?.messages) ? body.messages : [];
  const messages: ChatMsg[] = rawMsgs
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_CONTENT) }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-MAX_TURNS);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Send a message to edit the snippet." }, { status: 400 });
  }

  // Shared Fast ⇄ Deep toggle (Haiku vs Sonnet) — the toolkit-wide cost lever.
  const { model } = resolveModel(body?.tier);
  const system = buildSystem({ title, env, code });

  const client = new Anthropic();
  const anthropicStream = client.messages.stream({
    model,
    max_tokens: 4000,
    // The system prompt (with the original snippet) is identical across a card's
    // conversation, so cache it — every turn after the first reads it cheaply.
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
            ? "(That reply got cut off — ask for a shorter change or one step at a time.)"
            : "(No reply was produced — please try again.)");

        // One tool_runs row per turn ("the trace"). Never let logging break the response.
        try {
          await supabase.from("tool_runs").insert({
            owner: user.id,
            tool: "rhino-python",
            input: { title, env, turns: messages.length, message: messages[messages.length - 1].content },
            output: { reply: finalText, model }
          });
        } catch {
          // ignore trace failures
        }

        send("done", { reply: finalText });
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
