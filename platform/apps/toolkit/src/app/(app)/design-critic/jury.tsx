"use client";

import { useState } from "react";
import { PERSONAS } from "@/lib/anthropic/critic-prompts";
import WorkIntake from "./work-intake";
import { ClaimList } from "./claim-tag";
import { card, primaryBtn, type JuryResult, type WorkInput } from "./types";

const EMPTY: WorkInput = { title: "", thesis: "", brief: "", images: [] };

export default function Jury({
  sessionId,
  setSessionId
}: {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
}) {
  const [work, setWork] = useState<WorkInput>(EMPTY);
  const [adopted, setAdopted] = useState<string[]>(["technical", "theory"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JuryResult | null>(null);

  function togglePersona(id: string) {
    setAdopted((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function convene() {
    setError(null);
    if (!adopted.length) {
      setError("Adopt at least one critic persona.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/design-critic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "jury",
          sessionId,
          personas: adopted,
          title: work.title,
          thesis: work.thesis,
          brief: work.brief,
          imagePaths: work.images.map((im) => im.path)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "The jury could not be convened.");
      if (data.sessionId) setSessionId(data.sessionId);
      setResult(data.result as JuryResult);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <section className={card}>
        <h2 className="display-font text-lg">Convene a jury</h2>
        <p className="mt-1 text-sm text-neutral-900">
          Adopt the critics you want in the room. Each makes the strongest case your project fails — then tells you what
          would change its mind.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PERSONAS.map((p) => {
            const on = adopted.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePersona(p.id)}
                aria-pressed={on}
                title={p.stance}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <WorkIntake value={work} onChange={setWork} disabled={busy} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button className={primaryBtn} onClick={convene} disabled={busy}>
            {busy ? "The jury is deliberating…" : "Convene the jury"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </section>

      {result && (
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-medium text-neutral-900">
              ⚠ These are claims to verify, not verdicts. The critic can be confidently wrong — consult humans too.
            </p>
            {result.overall_note && <p className="mt-1 text-sm text-neutral-900">{result.overall_note}</p>}
          </div>

          {result.critiques?.map((c, i) => (
            <section key={i} className={card}>
              <h3 className="display-font text-base">{c.persona_name}</h3>
              <p className="mt-2 text-sm font-medium text-neutral-900">{c.strongest_case_it_fails}</p>

              {c.lines_of_attack?.length > 0 && (
                <div className="mt-3 space-y-3">
                  {c.lines_of_attack.map((la, j) => (
                    <div key={j}>
                      <p className="text-sm text-neutral-900">• {la.point}</p>
                      <ClaimList claims={la.claims} />
                    </div>
                  ))}
                </div>
              )}

              {c.questions_it_would_ask?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-900">Questions it would ask</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-neutral-900">
                    {c.questions_it_would_ask.map((q, k) => (
                      <li key={k}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {c.what_would_change_my_mind && (
                <p className="mt-3 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-900">
                  <span className="font-medium">What would change my mind: </span>
                  {c.what_would_change_my_mind}
                </p>
              )}
            </section>
          ))}

          {result.blind_spots?.length > 0 && (
            <section className={card}>
              <h3 className="display-font text-base">Blind spots</h3>
              <p className="mt-1 text-sm text-neutral-900">What the jury thinks you aren&apos;t seeing.</p>
              <ClaimList claims={result.blind_spots} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
