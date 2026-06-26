"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "./ui";

type Msg = { id: string; role: "user" | "assistant"; content: string };
type Source = { title: string; url: string };

const STARTERS = [
  "What's the history of this site?",
  "What's nearby — context, amenities, hazards?",
  "Any recent development or rezoning proposals here?"
];

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Grounded follow-up chat. Streams Sonnet + web search; every source the model
// looks at lands in the rail so students can verify and follow the trail.
export default function SiteChat({ context }: { context: any }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [searching, setSearching] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  function mergeSources(incoming: Source[]) {
    if (!incoming?.length) return;
    setSources((prev) => {
      const seen = new Set(prev.map((s) => s.url));
      const add = incoming.filter((s) => s.url && !seen.has(s.url));
      return add.length ? [...prev, ...add] : prev;
    });
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || streaming) return;
    setError(null);
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: q };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);
    setStreamingText("");
    setSearching(false);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    // Track the turn locally so we can finalize even if the connection drops with
    // no terminal frame (e.g. a function hard-kill) instead of hanging forever.
    const turn = { acc: "", terminal: false };
    try {
      const res = await fetch("/api/site-analysis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context
        }),
        signal: ctrl.signal
      });
      if (!res.ok || !res.body) {
        let msg = "Request failed.";
        try {
          msg = (await res.json()).error || msg;
        } catch {
          /* non-JSON */
        }
        setError(msg);
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) handleFrame(frame, turn);
      }
      // Stream ended without a done/error frame — commit whatever streamed so the
      // student keeps the partial answer instead of staring at a frozen bubble.
      if (!turn.terminal) {
        const text = turn.acc.trim();
        if (text) {
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: text + "\n\n_(Connection ended early — this answer may be cut off. Ask me to continue.)_"
            }
          ]);
        } else {
          setError("The answer didn't come through. Please try again.");
        }
        setStreamingText("");
        setSearching(false);
        setStreaming(false);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") setError(err?.message || "Connection lost.");
      setStreaming(false);
      setStreamingText("");
      setSearching(false);
    }
  }

  function handleFrame(frame: string, turn: { acc: string; terminal: boolean }) {
    let event = "";
    let dataStr = "";
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataStr = line.slice(5).trim();
    }
    if (!event || !dataStr) return;
    let data: any;
    try {
      data = JSON.parse(dataStr);
    } catch {
      return;
    }
    if (event === "token") {
      turn.acc += data.text ?? "";
      setStreamingText((t) => t + (data.text ?? ""));
    } else if (event === "status") {
      if (data.searching) setSearching(true);
    } else if (event === "sources") {
      mergeSources(data.sources ?? []);
    } else if (event === "done") {
      turn.terminal = true;
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: data.text ?? "" }]);
      setStreamingText("");
      setSearching(false);
      setStreaming(false);
    } else if (event === "error") {
      turn.terminal = true;
      setError(data.message || "Something went wrong.");
      setStreamingText("");
      setSearching(false);
      setStreaming(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const empty = messages.length === 0 && !streaming;

  return (
    <Card title="Ask about this place (AI · web search)">
      <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
        {/* chat */}
        <div className="flex flex-col">
          <div className="max-h-[22rem] min-h-[8rem] flex-1 space-y-3 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            {empty && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-500">
                  Go deeper than the measured data — history, ownership, nearby context, current
                  proposals. Answers are web-searched and the sources land on the right.
                </p>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-sm text-neutral-700 hover:border-neutral-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-neutral-900 text-white"
                      : "rounded-bl-sm border border-neutral-200 bg-white text-neutral-800"
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-800">
                  {searching && !streamingText && (
                    <span className="text-neutral-400">Searching the web…</span>
                  )}
                  {streamingText ? (
                    <span className="whitespace-pre-wrap">{streamingText}</span>
                  ) : (
                    !searching && <span className="text-neutral-400">Thinking…</span>
                  )}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-2 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask a follow-up…  (Enter to send)"
              className="max-h-32 min-h-[2.5rem] flex-1 resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
            {streaming ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="shrink-0 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
              >
                Send
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            AI judgment, web-searched — verify the sources before you rely on it.
          </p>
        </div>

        {/* sources rail */}
        <aside className="lg:border-l lg:border-neutral-100 lg:pl-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            Sources {sources.length > 0 && `(${sources.length})`}
          </div>
          {sources.length === 0 ? (
            <p className="text-xs text-neutral-400">Links the AI cites will appear here.</p>
          ) : (
            <ul className="space-y-2">
              {sources.map((s, i) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-neutral-200 bg-white p-2 hover:border-neutral-400"
                  >
                    <div className="line-clamp-2 text-xs font-medium text-neutral-800">
                      {i + 1}. {s.title}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-sky-700">{domain(s.url)}</div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </Card>
  );
}
