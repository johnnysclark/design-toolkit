import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { chatSystem } from "@/lib/anthropic/site-analysis-prompts";
import { resolveModel, webSearchTool } from "@/lib/anthropic/models";
import { STREAM_SOFT_TIMEOUT_MS } from "@/lib/anthropic/limits";

// Cost pass: the grounded follow-up chat. Web search + STREAMED so a slow search
// never trips an idle timeout and tokens show up live. Auth-gated — the key must
// never be reachable anonymously. Vercel Pro gives the function up to ~300s.
export const runtime = "nodejs";
export const maxDuration = 300;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in to use the AI chat." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages: Msg[] = Array.isArray(body?.messages)
    ? body.messages
        .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
        .map((m: any) => ({ role: m.role, content: m.content.slice(0, 8000) }))
        .slice(-16)
    : [];
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  const context = JSON.stringify(body?.context ?? {}, null, 2).slice(0, 60000);
  const system = chatSystem(context);
  const { model, tier } = resolveModel(body?.tier);

  const client = new Anthropic();
  const ctrl = new AbortController();
  // No `thinking` block → fastest path; web search does the heavy lifting here.
  const stream = client.messages.stream(
    {
      model,
      max_tokens: 4000,
      // Cache the system prefix — identical across a place's follow-up turns.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
      // Cap searches so a turn can't spiral (cost + the server-tool pause_turn limit).
      // Four is enough to answer well and leaves time to actually write the answer.
      // Tool version tracks the model — Haiku needs the basic web_search variant.
      tools: [webSearchTool(tier, 4)]
    } as any,
    { signal: ctrl.signal }
  );

  const enc = new TextEncoder();
  const rs = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      // Collect sources as they stream so a soft-timeout still ships them.
      const sources: { title: string; url: string }[] = [];
      const seen = new Set<string>();
      const addSources = (blocks: any[]) => {
        for (const block of blocks || []) {
          if (block?.type === "web_search_tool_result" && Array.isArray(block.content)) {
            for (const r of block.content) {
              if (r?.type === "web_search_result" && r.url && !seen.has(r.url)) {
                seen.add(r.url);
                sources.push({ title: (r.title || r.url).slice(0, 200), url: r.url });
              }
            }
          }
        }
      };

      let full = "";
      let stopReason: string | null = null;
      let searching = false;
      let timedOut = false;
      // Stop a few seconds before the function cap and finish cleanly. A hard-kill
      // would close the connection with no terminal frame → the UI hangs on a
      // half-answer. (Streaming means the user sees tokens long before this fires.)
      const timer = setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, STREAM_SOFT_TIMEOUT_MS);

      try {
        try {
          for await (const ev of stream as any) {
            if (ev.type === "content_block_start") {
              if (ev.content_block?.type === "server_tool_use" && !searching) {
                searching = true;
                send("status", { searching: true });
              } else if (ev.content_block?.type === "web_search_tool_result") {
                addSources([ev.content_block]);
              }
            } else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
              full += ev.delta.text;
              send("token", { text: ev.delta.text });
            } else if (ev.type === "message_delta" && ev.delta?.stop_reason) {
              stopReason = ev.delta.stop_reason;
            }
          }
          // Sweep the final message for any sources the events didn't carry.
          const final = await stream.finalMessage();
          addSources((final?.content ?? []) as any[]);
        } catch (err: any) {
          // Soft-timeout (or a dropped upstream) — finish with what we have.
          if (!ctrl.signal.aborted) throw err;
        }

        if (stopReason === "refusal") {
          send("error", { message: "The model declined this request." });
          return;
        }

        try {
          await supabase.from("tool_runs").insert({
            owner: user.id,
            tool: "site-analysis:chat",
            input: { question: messages[messages.length - 1].content, turns: messages.length },
            output: { answer: full.slice(0, 8000), sources, model }
          });
        } catch {
          // never let trace logging break the response
        }

        send("sources", { sources });
        send("done", {
          text:
            (full &&
              (timedOut || stopReason === "max_tokens"
                ? full + "\n\n_(Answer stopped early to stay within the time limit — ask me to continue or narrow the question.)_"
                : full)) ||
            (timedOut
              ? "(That one ran long and was stopped — try a narrower question.)"
              : "(No answer was produced — please try again.)")
        });
      } catch (err: any) {
        send("error", { message: err?.message || "Something went wrong." });
      } finally {
        clearTimeout(timer);
        controller.close();
      }
    },
    cancel() {
      try {
        ctrl.abort();
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
