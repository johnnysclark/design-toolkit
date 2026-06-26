"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RAP Studio — the orchestrator. One canonical state.json in the browser; every
// authoring channel (console, forms, AI assistant) compiles to the same
// Controller commands and runs through the same interpreter; every renderer
// (3D, tactile plan, read-back text, Braille, JSON tree) reads that one state.
// That's the project's thesis — sense-agnostic state + renderer parity — made
// runnable. Exports (state.json, command log, PIAF PNG, STL) are the on-ramp to
// driving real Rhino via the Watcher.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import type { CommandResult, State } from "./engine/types";
import { makeSeedState } from "./engine/seed";
import { applyCommand, describe } from "./engine/interpreter";
import { fullStateString } from "./engine/exportState";
import PlanSvg from "./render/PlanSvg";
import JsonTree from "./components/JsonTree";
import Console, { type LogEntry } from "./components/Console";
import Forms from "./components/Forms";
import AgentPanel, { type AgentResult } from "./components/AgentPanel";
import DrivePanel from "./components/DrivePanel";
import { buildPiafCanvas } from "./render/piaf";
import { buildStl } from "./render/stl";

const Scene3D = dynamic(() => import("./render/Scene3D"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-neutral-900">Loading 3D…</div>
});

// ── changed-path diff (so the JSON tree can highlight what an edit touched) ──
function diffPaths(a: unknown, b: unknown, path = "state", out = new Set<string>()): Set<string> {
  if (a === b) return out;
  const ao = typeof a === "object" && a !== null;
  const bo = typeof b === "object" && b !== null;
  if (!ao || !bo) {
    if (a !== b) out.add(path);
    return out;
  }
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
  for (const k of keys) {
    diffPaths((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out);
  }
  return out;
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type AuthorTab = "console" | "forms" | "assistant";
type ViewTab = "3d" | "plan";

export default function RapStudio({ signedIn }: { signedIn: boolean }) {
  const seed = useMemo(() => makeSeedState(), []);
  const [state, setState] = useState<State>(seed);
  const stateRef = useRef<State>(seed); // synchronous mirror for sequential applies
  const [log, setLog] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(""); // aria-live announcement
  const [speak, setSpeak] = useState(false);
  const [authorTab, setAuthorTab] = useState<AuthorTab>("assistant");
  const [viewTab, setViewTab] = useState<ViewTab>("3d");
  const [activeLevel, setActiveLevel] = useState<number | null>(null); // null = all levels
  const idRef = useRef(1);
  // Undo/redo history (applyCommand is pure, so history lives in the caller).
  const undoRef = useRef<State[]>([]);
  const redoRef = useRef<State[]>([]);
  const [histLen, setHistLen] = useState({ undo: 0, redo: 0 });

  const announce = useCallback(
    (msg: string) => {
      // Force a real text-node change even for an identical message, so a
      // screen reader re-announces it (a second "wall A off" must still speak).
      // The trailing no-break space is not voiced but guarantees a diff.
      setLive((prev) => (prev === msg ? msg + " " : msg));
      if (speak && typeof window !== "undefined" && "speechSynthesis" in window) {
        const clean = msg.replace(/^(OK:|ERROR:)\s*/, "");
        const u = new SpeechSynthesisUtterance(clean);
        u.rate = 1.05;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    },
    [speak]
  );

  // The single path every channel runs through.
  const runCommand = useCallback(
    (raw: string): CommandResult => {
      const cmd = raw.trim().toLowerCase();

      // Undo / redo are handled here, stepping the whole-state history stacks.
      if (cmd === "undo" || cmd === "redo") {
        const from = cmd === "undo" ? undoRef.current : redoRef.current;
        const to = cmd === "undo" ? redoRef.current : undoRef.current;
        if (from.length === 0) {
          const msg = `ERROR: Nothing to ${cmd}.`;
          setLog((l) => [...l, { id: idRef.current++, input: raw, output: msg, ok: false }]);
          announce(msg);
          return { state: stateRef.current, message: msg, ok: false, readOnly: true };
        }
        const prev = stateRef.current;
        const target = from.pop() as State;
        to.push(prev);
        stateRef.current = target;
        setState(target);
        setChanged(diffPaths(prev, target));
        setHistLen({ undo: undoRef.current.length, redo: redoRef.current.length });
        const msg = `OK: ${cmd === "undo" ? "Undid" : "Redid"} the last change.`;
        setLog((l) => [...l, { id: idRef.current++, input: raw, output: msg, ok: true }]);
        setHistory((h) => [...h, raw]);
        announce(msg);
        return { state: target, message: msg, ok: true };
      }

      const prev = stateRef.current;
      const res = applyCommand(prev, raw);
      setLog((l) => [...l, { id: idRef.current++, input: raw, output: res.message, ok: res.ok }]);
      setHistory((h) => (h[h.length - 1] === raw ? h : [...h, raw]));
      if (res.ok && !res.readOnly) {
        // Only a real change touches history — an idempotent command (e.g. set
        // rotation to its current value) must not pollute undo/redo.
        const d = diffPaths(prev, res.state);
        if (d.size > 0) {
          undoRef.current.push(prev);
          if (undoRef.current.length > 50) undoRef.current.shift();
          redoRef.current = [];
          setHistLen({ undo: undoRef.current.length, redo: 0 });
          stateRef.current = res.state;
          setState(res.state);
          setChanged(d);
        }
      }
      announce(res.message);
      return res;
    },
    [announce]
  );

  const runAgent = useCallback(
    async (instruction: string): Promise<AgentResult> => {
      let res: Response;
      try {
        res = await fetch("/api/rap/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ instruction, state: stateRef.current })
        });
      } catch {
        const msg = "Couldn't reach the assistant. Check your connection.";
        announce("ERROR: " + msg);
        return { ok: false, error: msg };
      }
      if (res.status === 401) {
        announce("Sign in to use the AI assistant.");
        return { ok: false, needsAuth: true };
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "The assistant is unavailable right now.";
        announce("ERROR: " + msg);
        return { ok: false, error: msg };
      }
      // Defense-in-depth: a 200 that still carries an {error} (e.g. a refusal)
      // must be announced as a failure, never fall through to "Done.".
      if (typeof data?.error === "string") {
        announce("ERROR: " + data.error);
        return { ok: false, error: data.error };
      }

      const commands: string[] = Array.isArray(data.commands) ? data.commands : [];
      setLog((l) => [...l, { id: idRef.current++, output: `ASSISTANT: ${data.reply ?? "(applied changes)"}`, ok: true }]);
      const before = stateRef.current;
      const applied: string[] = [];
      for (const c of commands) {
        const r = runCommand(c);
        if (r.ok) applied.push(c);
      }
      // Highlight the net before→after diff of the whole batch (not just the
      // last command), so the JSON tree shows everything the assistant changed.
      setChanged(diffPaths(before, stateRef.current));
      // Failure-aware: if a command didn't apply, don't announce a cheerful
      // reply — the per-command ERROR was batched away, so say it plainly.
      const failed = commands.length - applied.length;
      const base = data.reply ?? "Done.";
      announce(failed > 0 ? `ERROR: Applied ${applied.length} of ${commands.length} changes; ${failed} could not be applied. ${base}` : base);
      return { ok: true, reply: data.reply, commands: applied };
    },
    [runCommand, announce]
  );

  // ── exports ────────────────────────────────────────────────────────────────
  const fullState = useMemo(() => fullStateString(state), [state]);
  const scopeLabel = activeLevel === null ? "all levels" : `level ${activeLevel}${state.levels[activeLevel]?.label ? ` · ${state.levels[activeLevel].label}` : ""}`;
  const exportState = () => {
    download("state.json", new Blob([fullState], { type: "application/json" }));
    announce("OK: Downloaded state.json.");
  };
  const exportLog = () => {
    const text = log.filter((e) => e.input).map((e) => `>> ${e.input}\n${e.output}`).join("\n");
    download("rap-command-log.txt", new Blob([text], { type: "text/plain" }));
    announce("OK: Saved the command log.");
  };
  const exportPiaf = () =>
    buildPiafCanvas(state, 1700, activeLevel).toBlob((b) => {
      if (b) {
        download("rap-tactile-piaf.png", b);
        announce(`OK: Exported the PIAF tactile image (${scopeLabel}).`);
      } else {
        announce("ERROR: Could not export the PIAF image.");
      }
    }, "image/png");
  const exportStl = () => {
    download("rap-tactile.stl", new Blob([buildStl(state, activeLevel)], { type: "model/stl" }));
    announce(`OK: Exported the STL (${scopeLabel}).`);
  };
  const restoreSample = () => {
    if (typeof window === "undefined" || window.confirm("Restore the sample building? Your current model will be discarded — you can Undo this.")) runCommand("reset");
  };
  const startFromScratch = () => {
    if (typeof window === "undefined" || window.confirm("Start from scratch with an empty model? Your current model will be discarded — you can Undo this.")) runCommand("clear");
  };

  const readback = describe(state, activeLevel);
  const bayList = Object.values(state.bays);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-neutral-900 p-2.5">
        <ToolbarBtn onClick={exportState}>Download state.json</ToolbarBtn>
        <ToolbarBtn onClick={exportPiaf}>Export PIAF PNG{activeLevel !== null ? ` · L${activeLevel}` : ""}</ToolbarBtn>
        <ToolbarBtn onClick={exportStl}>Export STL{activeLevel !== null ? ` · L${activeLevel}` : ""}</ToolbarBtn>
        <ToolbarBtn onClick={exportLog}>Save command log</ToolbarBtn>
        <span className="flex-1" />
        <ToolbarBtn onClick={() => runCommand("undo")} disabled={histLen.undo === 0}>
          Undo
        </ToolbarBtn>
        <ToolbarBtn onClick={() => runCommand("redo")} disabled={histLen.redo === 0}>
          Redo
        </ToolbarBtn>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
          <input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} />
          Speak confirmations
        </label>
        <ToolbarBtn onClick={startFromScratch}>Start from scratch</ToolbarBtn>
        <ToolbarBtn onClick={restoreSample}>Restore sample</ToolbarBtn>
      </div>

      <p className="text-sm text-neutral-900">
        Loaded with a <b>sample building</b> (Bay A — ground-floor retail + lobby, two levels) so you can see what the tool does. The{" "}
        <b>Assistant</b> is the main way to author: describe what you want in plain language and it writes the Controller commands for you —
        the same way a designer directs <b>Claude Code</b> in a terminal. Every change is read back in all channels (plan, 3D, text, Braille,
        state tree). Prefer to type commands yourself? Switch to the <b>Console</b>. Hit <b>Start from scratch</b> to build your own from an
        empty model, or <b>Restore sample</b> to bring the example back.
      </p>

      {/* Row 1 — visual model + canonical state */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Model — visual test"
          right={
            <div className="flex items-center gap-2">
              <LevelSelect levels={state.levels} value={activeLevel} onChange={setActiveLevel} />
              <Tabs label="Choose the model view" tabs={[["3d", "3D"], ["plan", "Tactile plan"]]} active={viewTab} onPick={(t) => setViewTab(t as ViewTab)} />
            </div>
          }
        >
          <div
            className="h-80 w-full overflow-hidden rounded-md border border-neutral-300 bg-white"
            aria-hidden={viewTab === "3d" ? true : undefined}
          >
            {viewTab === "3d" ? <Scene3D state={state} levelFilter={activeLevel} /> : <PlanSvg state={state} levelFilter={activeLevel} className="h-full w-full p-2" />}
          </div>
          <p className="mt-2 text-xs text-neutral-900">
            The 3D view is an aid for sighted testing (hidden from screen readers). The model is fully readable in the tactile plan, the read-back text, and the state tree — none is the source of truth.
          </p>
        </Panel>

        <Panel title="Canonical state.json">
          <div className="h-80 overflow-auto rounded-md border border-neutral-300 bg-white p-2">
            <JsonTree data={state} changed={changed} />
          </div>
        </Panel>
      </div>

      {/* Row 2 — authoring + read-back */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Author"
          right={<Tabs label="Choose an authoring channel" tabs={[["assistant", "Assistant"], ["console", "Console"], ["forms", "Forms"]]} active={authorTab} onPick={(t) => setAuthorTab(t as AuthorTab)} />}
        >
          <div className="min-h-[20rem]">
            {authorTab === "console" && <Console log={log} history={history} onCommand={runCommand} />}
            {authorTab === "forms" && <Forms state={state} onCommand={runCommand} />}
            {authorTab === "assistant" && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-900">
                  Ask in plain language; the assistant replies and shows the exact <b>commands it ran</b> — nothing happens you can&apos;t see.
                  This models directing <b>Claude Code</b> in a terminal: you describe intent, it writes the precise edits.
                </p>
                {!signedIn && (
                  <p className="rounded-md bg-[#fff2f0] px-3 py-2 text-xs text-neutral-900">
                    The AI assistant needs sign-in (it spends the studio&apos;s API budget). The console, forms, and exports all work signed-out.
                  </p>
                )}
                <AgentPanel onSubmit={runAgent} />
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Read-back — the non-visual model">
          <div className="h-80 overflow-auto rounded-md border border-neutral-300 bg-white p-3">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-900">{readback}</pre>
            <div className="mt-3 border-t border-neutral-200 pt-3">
              <div className="text-xs font-bold uppercase text-neutral-900">Braille key</div>
              {bayList.map((b) => (
                <div key={b.label} className="mt-1 text-neutral-900">
                  <span className="text-sm" style={{ fontFamily: "'Apple Braille','Segoe UI Symbol',monospace" }}>
                    {b.braille}
                  </span>{" "}
                  <span className="text-xs">— {b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 3 — drive real Rhino */}
      <Panel title="Drive Rhino — talk to state.json + the Watcher">
        <DrivePanel
          stateText={fullState}
          onDownloadState={exportState}
          webOnly={{ walls: state.walls.length, columns: state.columns.length, openings: state.openings.length, rooms: state.rooms.length }}
        />
      </Panel>

      {/* Instructions + helpful tips */}
      <Panel title="How to use this — instructions & tips">
        <div className="grid gap-5 text-sm text-neutral-900 md:grid-cols-2">
          <div>
            <h3 className="display-font text-xs uppercase tracking-tight text-neutral-900">The idea</h3>
            <p className="mt-1.5">
              There is one <b>canonical model</b> (the <code className="font-mono">state.json</code> above). Every way of building —
              the Assistant, the Console, and the Forms — writes the <i>same</i> commands to it, and every view — the tactile plan, the
              3D aid, the read-back text, the Braille key, and the state tree — reads from that one model. Change it once, and it&apos;s
              correct in every channel at the same time. That parity is the whole point: a designer using a screen reader and a designer
              looking at the plan are working on the identical building.
            </p>
            <h3 className="display-font mt-4 text-xs uppercase tracking-tight text-neutral-900">Getting started</h3>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5">
              <li>Read the <b>sample building</b> in the views to see what a finished model looks like.</li>
              <li>Press <b>Start from scratch</b> to empty it (or <b>Restore sample</b> to bring it back).</li>
              <li>In the <b>Assistant</b>, describe a move — e.g. <i>&ldquo;lay out a lobby and two retail units.&rdquo;</i></li>
              <li>Watch the commands it ran, and confirm the change in the read-back and the plan.</li>
              <li>Keep going one move at a time; <b>export</b> when you&apos;re ready to drive Rhino.</li>
            </ol>
          </div>
          <div>
            <h3 className="display-font text-xs uppercase tracking-tight text-neutral-900">Tips</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li><b>Assistant</b> is fastest for whole moves; <b>Console</b> gives you exact control — type <code className="font-mono">help</code> for every command.</li>
              <li>Send an assistant request with <b>⌘/Ctrl + Enter</b>.</li>
              <li>Made a wrong move? <b>Undo</b> / <b>Redo</b> step through your whole history (the Reset/Start-from-scratch buttons are undoable too).</li>
              <li>Turn on <b>Speak confirmations</b> to hear every change announced aloud.</li>
              <li>Use the <b>level selector</b> on the model to view and export one floor at a time.</li>
              <li>The <b>3D view is only a sighted aid</b> — it&apos;s hidden from screen readers. The plan, read-back, and Braille are the real model.</li>
              <li>Exports — <b>state.json</b>, <b>PIAF PNG</b> (tactile print), <b>STL</b> (3D print), and the <b>command log</b> — all match what&apos;s on screen.</li>
            </ul>
          </div>
        </div>
      </Panel>

      {/* Screen-reader announcements for every state change */}
      <div aria-live="polite" className="sr-only">
        {live}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border-2 border-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900"
    >
      {children}
    </button>
  );
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border-2 border-neutral-900 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="display-font text-sm uppercase tracking-tight text-neutral-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function LevelSelect({ levels, value, onChange }: { levels: { label: string }[]; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <select
      value={value === null ? "all" : String(value)}
      onChange={(e) => onChange(e.target.value === "all" ? null : Number(e.target.value))}
      className="rounded border border-neutral-300 px-1.5 py-1 text-xs font-semibold text-neutral-900"
      aria-label="Active level to view and export"
    >
      <option value="all">All levels</option>
      {levels.map((l, i) => (
        <option key={i} value={i}>
          L{i} · {l.label}
        </option>
      ))}
    </select>
  );
}

// Honest toggle-button group. (A full ARIA tab pattern needs all panels present
// + roving tabindex + arrow keys; here only the selected panel is rendered, so
// aria-pressed buttons in a labelled group are the correct, non-misleading model.)
function Tabs({ tabs, active, onPick, label }: { tabs: string[][]; active: string; onPick: (t: string) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {tabs.map(([id, lbl]) => (
        <button
          key={id}
          type="button"
          aria-pressed={active === id}
          onClick={() => onPick(id)}
          className={`rounded px-2.5 py-1 text-xs font-semibold ${active === id ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-900 hover:border-neutral-900"}`}
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}
