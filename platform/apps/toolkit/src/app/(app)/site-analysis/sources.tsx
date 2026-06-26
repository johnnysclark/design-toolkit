"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "./ui";

type Source = { title: string; url: string };

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Auto first pass. As soon as a place is analyzed this fires on its own (no button)
// and streams back a short orientation + the authoritative links a studio should
// start from — so the student opens to a trail, not a blank chat. Re-keyed per site.
export default function SiteSources({ place, context }: { place: any; context: any }) {
  const [note, setNote] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setNote("");
    setSources([]);
    setError(null);
    setStatus("loading");

    function mergeSources(incoming: Source[]) {
      if (!incoming?.length) return;
      setSources((prev) => {
        const seen = new Set(prev.map((s) => s.url));
        const add = incoming.filter((s) => s.url && !seen.has(s.url));
        return add.length ? [...prev, ...add] : prev;
      });
    }

    function handleFrame(frame: string, turn: { terminal: boolean }) {
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
      if (cancelled) return;
      if (event === "token") setNote((t) => t + (data.text ?? ""));
      else if (event === "sources") mergeSources(data.sources ?? []);
      else if (event === "done") {
        turn.terminal = true;
        setStatus("done");
      } else if (event === "error") {
        turn.terminal = true;
        setError(data.message || "Could not gather sources.");
        setStatus("error");
      }
    }

    (async () => {
      const turn = { terminal: false };
      try {
        const res = await fetch("/api/site-analysis/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place, context }),
          signal: ctrl.signal
        });
        if (!res.ok || !res.body) {
          let msg = "Could not gather sources.";
          try {
            msg = (await res.json()).error || msg;
          } catch {
            /* non-JSON */
          }
          if (!cancelled) {
            setError(msg);
            setStatus("error");
          }
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
        if (!cancelled && !turn.terminal) setStatus("done");
      } catch (err: any) {
        if (!cancelled && err?.name !== "AbortError") {
          setError(err?.message || "Could not gather sources.");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return (
    <Card title="Sources & documents (AI · web search)">
      <p className="-mt-1 mb-3 text-xs text-neutral-900">
        Found automatically when the place loaded — a first trail of authoritative links to verify
        and dig into. Ask follow-ups in the chat below.
      </p>

      {status === "loading" && !note && sources.length === 0 && (
        <p className="text-sm text-neutral-900">Scanning the web for the best sources on this place…</p>
      )}

      {note && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">{note}</p>
      )}

      {sources.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {sources.map((s, i) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-neutral-200 bg-white p-2 hover:border-neutral-400"
              >
                <div className="line-clamp-2 text-xs font-medium text-neutral-900">
                  {i + 1}. {s.title}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-sky-700">{domain(s.url)}</div>
              </a>
            </li>
          ))}
        </ul>
      )}

      {status === "loading" && (note || sources.length > 0) && (
        <p className="mt-2 text-[11px] text-neutral-900">Still searching…</p>
      )}

      {status === "error" && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setNonce((n) => n + 1)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
          >
            Retry
          </button>
        </div>
      )}

      {status === "done" && sources.length === 0 && !note && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-neutral-900">No clear sources surfaced on the first pass.</p>
          <button
            onClick={() => setNonce((n) => n + 1)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
          >
            Retry
          </button>
        </div>
      )}

      <p className="mt-3 text-[11px] text-neutral-900">
        AI-gathered, web-searched — open the links and verify before you rely on them.
      </p>
    </Card>
  );
}
