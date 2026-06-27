"use client";

// The command console — the PRIMARY authoring surface (the way the real RAP
// student works). A log of confirmations + a single text input, with ↑/↓
// history. Mirrors the desktop CLI; forms and the AI assistant both compile
// down to these same commands.

import { useState } from "react";
import { useStickToBottom } from "@/lib/useStickToBottom";

export interface LogEntry {
  id: number;
  input?: string; // the command typed (omitted for system lines)
  output: string; // the OK:/ERROR: confirmation or read-back
  ok: boolean;
}

export default function Console({
  log,
  history,
  onCommand
}: {
  log: LogEntry[];
  history: string[];
  onCommand: (raw: string) => void;
}) {
  const [value, setValue] = useState("");
  const [hIdx, setHIdx] = useState(-1); // -1 = current line
  const { ref: logRef, onScroll, pinned, scrollToBottom } = useStickToBottom<HTMLDivElement>();

  const submit = () => {
    const raw = value.trim();
    if (!raw) return;
    onCommand(raw);
    setValue("");
    setHIdx(-1);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(next);
      setValue(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx < 0) return;
      const next = hIdx + 1;
      if (next >= history.length) {
        setHIdx(-1);
        setValue("");
      } else {
        setHIdx(next);
        setValue(history[next]);
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1" style={{ minHeight: 200 }}>
      <div
        ref={logRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto rounded-md bg-[#0e0e0e] p-3 font-mono text-[12.5px] leading-relaxed"
        aria-label="Command log"
      >
        {log.length === 0 && <div className="text-[#a3a3a3]">Type a command, or “help”. Try: wall A off</div>}
        {log.map((e) => (
          <div key={e.id} className="mb-1.5 whitespace-pre-wrap break-words">
            {e.input !== undefined && (
              <div>
                <span className="text-[#7fd17f]">&gt;&gt; </span>
                <span className="text-[#e8e8e8]">{e.input}</span>
              </div>
            )}
            <div className={e.ok ? "text-[#cfcfcf]" : "text-[#ff7a6c]"}>{e.output}</div>
          </div>
        ))}
      </div>
      {!pinned && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-medium text-neutral-900 shadow-sm hover:bg-neutral-100"
        >
          ↓ Jump to latest
        </button>
      )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-sm text-neutral-900" aria-hidden>
          &gt;&gt;
        </span>
        <label htmlFor="rap-cmd" className="sr-only">
          Command input
        </label>
        <input
          id="rap-cmd"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoComplete="off"
          placeholder="e.g. corridor A width 10"
          className="flex-1 rounded-md border-2 border-neutral-900 px-3 py-2 font-mono text-sm text-neutral-900 outline-none focus:border-[#ff3b21] focus-visible:ring-2 focus-visible:ring-[#ff3b21] focus-visible:ring-offset-1"
        />
        <button
          type="button"
          onClick={submit}
          className="display-font rounded-md border-2 border-neutral-900 bg-neutral-900 px-4 py-2 text-sm uppercase text-white hover:bg-[#ff3b21] hover:border-[#ff3b21]"
        >
          Run
        </button>
      </div>
      <p className="mt-1.5 text-xs text-neutral-900">
        Type <code className="font-mono">help</code> for the full command list · <kbd>↑</kbd> / <kbd>↓</kbd> for history.
      </p>
    </div>
  );
}
