"use client";

import { useState } from "react";
import WorkIntake from "./work-intake";
import { ClaimList } from "./claim-tag";
import {
  card,
  field,
  ghostBtn,
  primaryBtn,
  type RebuttalResult,
  type WeatherCategory,
  type WeatherResult,
  type WorkInput
} from "./types";

const EMPTY: WorkInput = { title: "", thesis: "", brief: "", images: [] };

const CAT: Record<WeatherCategory, string> = {
  fair: "bg-neutral-200 text-neutral-900",
  loaded: "bg-amber-100 text-amber-900",
  "out-of-scope": "border border-neutral-300 text-neutral-900"
};

export default function ReviewPrep({
  sessionId,
  setSessionId
}: {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
}) {
  const [work, setWork] = useState<WorkInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);

  // Rebuttal rehearsal
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [rebutting, setRebutting] = useState(false);
  const [rebuttal, setRebuttal] = useState<RebuttalResult | null>(null);
  const [rebutErr, setRebutErr] = useState<string | null>(null);

  async function forecast() {
    setError(null);
    setBusy(true);
    setWeather(null);
    try {
      const res = await fetch("/api/design-critic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "weather",
          sessionId,
          title: work.title,
          thesis: work.thesis,
          brief: work.brief,
          imagePaths: work.images.map((im) => im.path)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not forecast the review.");
      if (data.sessionId) setSessionId(data.sessionId);
      setWeather(data.result as WeatherResult);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function rehearse() {
    setRebutErr(null);
    if (!question.trim() || !answer.trim()) {
      setRebutErr("Pick a question and write your answer.");
      return;
    }
    setRebutting(true);
    setRebuttal(null);
    try {
      const res = await fetch("/api/design-critic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "rebuttal",
          sessionId,
          title: work.title,
          thesis: work.thesis,
          brief: work.brief,
          question,
          answer
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not play the follow-up.");
      if (data.sessionId) setSessionId(data.sessionId);
      setRebuttal(data.result as RebuttalResult);
    } catch (e: any) {
      setRebutErr(e?.message || "Something went wrong.");
    } finally {
      setRebutting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <section className={card}>
        <h2 className="display-font text-lg">Crit weather report</h2>
        <p className="mt-1 text-sm text-neutral-900">
          Forecast the questions a real jury is likely to ask — sorted fair / loaded / out-of-scope so you triage instead of
          panicking equally.
        </p>
        <div className="mt-4">
          <WorkIntake value={work} onChange={setWork} disabled={busy} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className={primaryBtn} onClick={forecast} disabled={busy}>
            {busy ? "Reading the weather…" : "Forecast the review"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </section>

      {weather && (
        <section className={card}>
          {weather.prep_note && <p className="text-sm text-neutral-900">{weather.prep_note}</p>}
          <div className="mt-3 space-y-3">
            {weather.forecast?.map((q, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-900">{q.question}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CAT[q.category]}`}>
                    {q.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-900">{q.why}</p>
                {q.what_it_probes && (
                  <p className="mt-1 text-sm text-neutral-900">
                    <span className="font-medium">Probing: </span>
                    {q.what_it_probes}
                  </p>
                )}
                <ClaimList claims={q.claims} />
                <button
                  type="button"
                  className={`${ghostBtn} mt-2`}
                  onClick={() => {
                    setQuestion(q.question);
                    if (typeof window !== "undefined") {
                      document.getElementById("rebuttal-card")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  Rehearse this →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="rebuttal-card" className={card}>
        <h2 className="display-font text-lg">Rebuttal rehearsal</h2>
        <p className="mt-1 text-sm text-neutral-900">
          Answer a forecasted question and the critic plays the follow-up a real jury would ask next.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            className={field}
            placeholder="The question you're rehearsing"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={rebutting}
          />
          <textarea
            className={`${field} resize-y`}
            rows={4}
            placeholder="Your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={rebutting}
          />
          <div className="flex items-center gap-3">
            <button className={primaryBtn} onClick={rehearse} disabled={rebutting}>
              {rebutting ? "The critic is thinking…" : "Hear the follow-up"}
            </button>
            {rebutErr && <p className="text-sm text-red-600">{rebutErr}</p>}
          </div>
        </div>

        {rebuttal && (
          <div className="mt-4 rounded-lg border border-neutral-200 p-3">
            {rebuttal.acknowledged && <p className="text-sm text-neutral-900">{rebuttal.acknowledged}</p>}
            <p className="mt-2 text-sm font-medium text-neutral-900">
              Follow-up{" "}
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs">{rebuttal.fair_or_loaded}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-900">{rebuttal.follow_up}</p>
            {rebuttal.pressure_point && (
              <p className="mt-2 text-sm text-neutral-900">
                <span className="font-medium">Weakest seam: </span>
                {rebuttal.pressure_point}
              </p>
            )}
            <ClaimList claims={rebuttal.claims} label="Claims in your own answer" />
          </div>
        )}
      </section>
    </div>
  );
}
