import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { MODEL, chatSystem } from "@/lib/anthropic/site-analysis-prompts";

// Cost pass: the grounded follow-up chat. Sonnet + web search, STREAMED so a slow
// search never trips an idle timeout and tokens show up live. Auth-gated — the key
// must never be reachable anonymously. Its own request, ≤60s on Vercel Hobby.
export const runtime = "nodejs";
export const maxDuration = 60;

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

  const client = new Anthropic();
  // No `thinking` block → fastest path; web search does the heavy lifting here.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages,
    // Cap searches so a turn can't spiral (cost + the server-tool pause_turn limit).
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }]
  } as any);

  const enc = new TextEncoder();
  const rs = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      let full = "";
      let stopReason: string | null = null;
      let searching = false;

      try {
        for await (const ev of stream as any) {
          if (ev.type === "content_block_start" && ev.content_block?.type === "server_tool_use") {
            // tell the UI a web search is running
            if (!searching) {
              searching = true;
              send("status", { searching: true });
            }
          } else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
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

        // Pull every web source the model actually looked at.
        const final = await stream.finalMessage();
        const sources: { title: string; url: string }[] = [];
        const seen = new Set<string>();
        for (const block of (final?.content ?? []) as any[]) {
          if (block?.type === "web_search_tool_result" && Array.isArray(block.content)) {
            for (const r of block.content) {
              if (r?.type === "web_search_result" && r.url && !seen.has(r.url)) {
                seen.add(r.url);
                sources.push({ title: (r.title || r.url).slice(0, 200), url: r.url });
              }
            }
          }
        }

        try {
          await supabase.from("tool_runs").insert({
            owner: user.id,
            tool: "site-analysis:chat",
            input: { question: messages[messages.length - 1].content, turns: messages.length },
            output: { answer: full.slice(0, 8000), sources, model: MODEL }
          });
        } catch {
          // never let trace logging break the response
        }

        send("sources", { sources });
        send("done", {
          text:
            full ||
            (stopReason === "max_tokens"
              ? "(That answer got cut off — try a narrower question.)"
              : "(No answer was produced — please try again.)")
        });
      } catch (err: any) {
        send("error", { message: err?.message || "Something went wrong." });
      } finally {
        controller.close();
      }
    },
    cancel() {
      try {
        const s = stream as any;
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
