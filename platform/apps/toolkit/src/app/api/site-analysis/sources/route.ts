import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { sourcesSystem, sourcesUser } from "@/lib/anthropic/site-analysis-prompts";
import { resolveModel, webSearchTool } from "@/lib/anthropic/models";
import { STREAM_SOFT_TIMEOUT_MS } from "@/lib/anthropic/limits";

// Auto first pass: the moment a place is analyzed the client fires this (no button)
// to surface the authoritative links/documents a studio should start from. Streamed
// so the links land as soon as the model finds them; a server-side soft-timeout
// guarantees a clean finish. Auth-gated — it spends the studio key, so it must never
// be reachable anonymously. Vercel Pro gives it up to ~300s.
export const runtime = "nodejs";
export const maxDuration = 300;

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
    return Response.json({ error: "Sign in to use the AI." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const place = body?.place;
  if (!place || typeof place !== "object" || !place?.name) {
    return Response.json({ error: "A place is required." }, { status: 400 });
  }

  const context = JSON.stringify(body?.context ?? {}, null, 2).slice(0, 24000);
  const { model, tier } = resolveModel(body?.tier);

  const client = new Anthropic();
  const ctrl = new AbortController();
  const stream = client.messages.stream(
    {
      model,
      max_tokens: 1600,
      system: [{ type: "text", text: sourcesSystem(context), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: sourcesUser(place) }],
      // A first pass — keep it cheap and fast. A handful of searches is plenty.
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

      const sources: { title: string; url: string }[] = [];
      const seen = new Set<string>();
      const addSources = (blocks: any[]) => {
        let added = false;
        for (const block of blocks || []) {
          if (block?.type === "web_search_tool_result" && Array.isArray(block.content)) {
            for (const r of block.content) {
              if (r?.type === "web_search_result" && r.url && !seen.has(r.url)) {
                seen.add(r.url);
                sources.push({ title: (r.title || r.url).slice(0, 200), url: r.url });
                added = true;
              }
            }
          }
        }
        if (added) send("sources", { sources });
      };

      let full = "";
      let searching = false;
      // Stop a few seconds early and finish cleanly rather than let Vercel hard-kill us.
      const timer = setTimeout(() => ctrl.abort(), STREAM_SOFT_TIMEOUT_MS);

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
            }
          }
          // Sweep the final message for any sources the stream events didn't carry.
          const final = await stream.finalMessage();
          addSources((final?.content ?? []) as any[]);
        } catch (err: any) {
          // Soft-timeout (or a dropped stream) — finish with whatever we gathered.
          if (!ctrl.signal.aborted) throw err;
        }

        try {
          await supabase.from("tool_runs").insert({
            owner: user.id,
            tool: "site-analysis:sources",
            input: { place: place?.name },
            output: { note: full.slice(0, 4000), sources, model }
          });
        } catch {
          // never let trace logging break the response
        }

        send("sources", { sources });
        send("done", { text: full });
      } catch (err: any) {
        send("error", { message: err?.message || "Could not gather sources." });
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
