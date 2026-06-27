"use client";

import { useMemo, useState } from "react";
import { ClaimList } from "./claim-tag";
import Thinking from "@/components/Thinking";
import {
  card,
  field,
  ghostBtn,
  inYourWordsPct,
  primaryBtn,
  type PortfolioDraftResult,
  type SelfAttackResult,
  type ThesisResult
} from "./types";

// Minimum divergence from the scaffold before the statement can be exported —
// a NUDGE, not a security control. The server independently refuses to attack
// an empty statement; nothing here guarantees an exported file is in the
// student's voice. The point is to make ghostwriting visibly the wrong path.
const EXPORT_THRESHOLD = 60;

export default function Portfolio({
  sessionId,
  setSessionId,
  tier
}: {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  tier?: string;
}) {
  const [title, setTitle] = useState("");
  const [thesis, setThesis] = useState("");
  const [brief, setBrief] = useState("");

  const [draft, setDraft] = useState<PortfolioDraftResult | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [studentText, setStudentText] = useState("");

  const [busy, setBusy] = useState<null | "draft" | "attack" | "thesis">(null);
  const [error, setError] = useState<string | null>(null);
  const [attack, setAttack] = useState<SelfAttackResult | null>(null);
  const [thesisOut, setThesisOut] = useState<ThesisResult | null>(null);

  const pct = useMemo(() => (draft ? inYourWordsPct(studentText, draft.ai_draft) : 0), [studentText, draft]);
  const canExport = studentText.trim().length > 0 && pct >= EXPORT_THRESHOLD;

  function ctx() {
    return { title, thesis, brief, sessionId, tier };
  }

  async function generateDraft() {
    setError(null);
    if (!title.trim() && !thesis.trim() && !brief.trim()) {
      setError("Tell the critic about your project first.");
      return;
    }
    setBusy("draft");
    setAttack(null);
    try {
      const res = await fetch("/api/design-critic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "portfolio-draft", ...ctx() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not build a scaffold.");
      if (data.sessionId) setSessionId(data.sessionId);
      setPortfolioId(data.portfolioId || null);
      setDraft(data.result as PortfolioDraftResult);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function stressTest() {
    setError(null);
    if (!studentText.trim()) {
      setError("Write your statement in your own words first — there's nothing to stress-test yet.");
      return;
    }
    setBusy("attack");
    setAttack(null);
    try {
      const res = await fetch("/api/design-critic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "self-attack", ...ctx(), portfolioId, studentText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not stress-test your writing.");
      setAttack(data.result as SelfAttackResult);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function buildThesis() {
    setError(null);
    if (!title.trim() && !thesis.trim() && !brief.trim()) {
      setError("Tell the critic about your project first.");
      return;
    }
    setBusy("thesis");
    setThesisOut(null);
    try {
      const res = await fetch("/api/design-critic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "thesis", ...ctx(), portfolioId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not build theses.");
      if (data.sessionId) setSessionId(data.sessionId);
      setThesisOut(data.result as ThesisResult);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function exportStatement() {
    const blob = new Blob([studentText.trim() + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title.trim() || "statement").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <section className={card}>
        <h2 className="display-font text-lg">Portfolio &amp; thesis</h2>
        <p className="mt-1 text-sm text-neutral-900">
          A rehearsal room, never a ghostwriter. The critic drafts a rough scaffold you demolish and rewrite in your own
          voice — <span className="font-medium">your edits are the deliverable</span>. Then it attacks your own words.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <input className={field} placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input
            className={field}
            placeholder="Your thesis / the one claim this project makes"
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
          />
          <textarea
            className={`${field} resize-y`}
            rows={3}
            placeholder="Brief / context — program, the move you're proudest of, what you're nervous about…"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button className={primaryBtn} onClick={generateDraft} disabled={busy !== null}>
              {busy === "draft" ? "Scaffolding…" : "Generate a scaffold"}
            </button>
            <button className={ghostBtn} onClick={buildThesis} disabled={busy !== null}>
              {busy === "thesis" ? "Building…" : "Build defensible theses"}
            </button>
            {(busy === "draft" || busy === "thesis") && <Thinking />}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </section>

      {thesisOut && (
        <section className={card}>
          <h3 className="display-font text-base">Defensible thesis options</h3>
          <div className="mt-3 space-y-3">
            {thesisOut.candidates?.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg border p-3 ${c.id === thesisOut.strongest_id ? "border-neutral-900" : "border-neutral-200"}`}
              >
                <p className="text-sm font-medium text-neutral-900">
                  {c.thesis}
                  {c.id === thesisOut.strongest_id && (
                    <span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">most defensible</span>
                  )}
                </p>
                <p className="mt-1 text-sm text-neutral-900">{c.why_defensible}</p>
                {c.likely_attacks?.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-sm text-neutral-900">
                    {c.likely_attacks.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
                <ClaimList claims={c.claims} />
              </div>
            ))}
          </div>
        </section>
      )}

      {draft && (
        <section className={card}>
          <h3 className="display-font text-base">Draft / your voice</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left: read-only scaffold — NOT a deliverable, cannot be exported. */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-900">Scaffold — not your deliverable</p>
              <div className="mt-1 h-full rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900">
                {draft.ai_draft}
              </div>
            </div>
            {/* Right: the student's own writing — starts empty. */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-900">Your statement</p>
                <p className="text-xs text-neutral-900">{pct}% in your words</p>
              </div>
              <textarea
                className={`${field} mt-1 h-48 resize-y`}
                placeholder="Write it in your own words. Don't paste the scaffold — rewrite it."
                value={studentText}
                onChange={(e) => setStudentText(e.target.value)}
              />
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className={`h-full ${pct >= EXPORT_THRESHOLD ? "bg-green-600" : "bg-amber-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {!canExport && studentText.trim().length > 0 && (
                <p className="mt-1 text-xs text-neutral-900">
                  Too close to the scaffold — keep making it yours before exporting.
                </p>
              )}
            </div>
          </div>

          {draft.voice_prompts?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-900">Questions to pull your voice out</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-neutral-900">
                {draft.voice_prompts.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className={primaryBtn} onClick={stressTest} disabled={busy !== null || !studentText.trim()}>
              {busy === "attack" ? "Attacking your words…" : "Stress-test my writing"}
            </button>
            <button className={ghostBtn} onClick={exportStatement} disabled={!canExport} title={canExport ? "" : "Make it yours first"}>
              Export statement
            </button>
            {busy === "attack" && <Thinking />}
          </div>
        </section>
      )}

      {attack && (
        <section className={card}>
          <h3 className="display-font text-base">Stress test — on your own words</h3>
          {attack.attacks?.map((a, i) => (
            <div key={i} className="mt-3 rounded-lg border border-neutral-200 p-3">
              <p className="text-sm italic text-neutral-900">&ldquo;{a.quote}&rdquo;</p>
              <p className="mt-1 text-sm text-neutral-900">{a.problem}</p>
              <ClaimList claims={a.claims} />
              {a.stronger_version_hint && (
                <p className="mt-2 text-sm text-neutral-900">
                  <span className="font-medium">Toward a stronger version: </span>
                  {a.stronger_version_hint}
                </p>
              )}
            </div>
          ))}
          <ClaimList claims={attack.unsupported_assertions} label="Unsupported assertions" />
          {attack.what_holds_up?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-900">What holds up</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-neutral-900">
                {attack.what_holds_up.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
