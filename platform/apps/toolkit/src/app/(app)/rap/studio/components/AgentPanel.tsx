"use client";

// The Digital Assistant, web edition — natural language → Controller commands.
// The model never edits state directly; it returns a list of commands that the
// SAME interpreter applies, so every AI move is auditable as plain commands and
// announced like any other edit. Spends the API key, so it gates to signed-in
// members (the real guard is a 401 in /api/rap/agent).

import { useRef, useState } from "react";

export interface AgentResult {
  ok: boolean;
  reply?: string;
  commands?: string[];
  question?: string; // assistant needs a missing dimension / position / layer
  error?: string;
  needsAuth?: boolean;
}

const EXAMPLES = [
  "add a 36 by 20 floor plate on a new slab layer",
  "make a 24 by 24 extruded box 40 feet tall on a massing layer",
  "give the slab layer a crosshatch tactile texture at 5 mm",
  "add a hidden-line layer with a dotted linetype"
];

export default function AgentPanel({ onSubmit }: { onSubmit: (instruction: string) => Promise<AgentResult> }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const run = async (text: string) => {
    const instruction = text.trim();
    if (!instruction || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await onSubmit(instruction);
      setResult(r);
      // When the assistant asks for a missing detail, keep the user's text and
      // return focus to the box so they can add it and send again.
      if (r.question) taRef.current?.focus();
    } catch (e: unknown) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-neutral-900">
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setValue(ex)}
            className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs text-neutral-900 hover:border-[#ff3b21]"
          >
            {ex}
          </button>
        ))}
      </div>
      <label htmlFor="rap-agent" className="sr-only">
        Describe a change in plain language
      </label>
      <textarea
        id="rap-agent"
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(value);
        }}
        rows={2}
        placeholder="Describe a change in plain language…  (⌘/Ctrl + Enter to send)"
        className="w-full rounded-md border-2 border-neutral-900 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#ff3b21] focus-visible:ring-2 focus-visible:ring-[#ff3b21] focus-visible:ring-offset-1"
      />
      <button
        type="button"
        onClick={() => run(value)}
        disabled={busy}
        className="display-font rounded-md border-2 border-neutral-900 bg-neutral-900 px-4 py-2 text-sm uppercase text-white hover:bg-[#ff3b21] hover:border-[#ff3b21] disabled:opacity-50"
      >
        {busy ? "Thinking…" : "Ask the assistant"}
      </button>

      {result && (
        <div className="rounded-md border border-neutral-300 p-3 text-sm">
          {result.question ? (
            <div className="rounded-md border-2 border-[#ff3b21] bg-[#fff7f5] p-3" role="status">
              <div className="display-font text-xs uppercase text-neutral-900">Assistant asks</div>
              <p className="mt-1 text-sm text-neutral-900">{result.question}</p>
              <p className="mt-1 text-xs text-neutral-900">Answer in the box above (add the missing dimension, position, or layer) and send again.</p>
            </div>
          ) : result.needsAuth ? (
            <p className="text-neutral-900">
              Sign in to use the AI assistant — the deterministic console, forms, and exports work without it.{" "}
              <a href="/login" className="font-semibold underline underline-offset-2 hover:text-[#ff3b21]">
                Sign in →
              </a>
            </p>
          ) : result.error ? (
            <p className="text-neutral-900">{result.error}</p>
          ) : (
            <>
              {result.reply && <p className="text-neutral-900">{result.reply}</p>}
              {result.commands && result.commands.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-bold uppercase text-neutral-900">Commands run</div>
                  <ul className="mt-1 font-mono text-xs text-neutral-900">
                    {result.commands.map((c, i) => (
                      <li key={i}>›&nbsp;{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
