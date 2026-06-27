"use client";

import { useState } from "react";
import Jury from "./jury";
import ReviewPrep from "./review-prep";
import Portfolio from "./portfolio";
import ModelToggle, { useModelTier } from "@/components/ModelToggle";

type Tab = "jury" | "review" | "portfolio";

const TABS: { id: Tab; label: string }[] = [
  { id: "jury", label: "Jury" },
  { id: "review", label: "Review Prep" },
  { id: "portfolio", label: "Portfolio" }
];

export default function CriticTool() {
  const [tab, setTab] = useState<Tab>("jury");
  // A critique session groups the work brought to the critic across modes.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tier, setTier] = useModelTier("critic");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Critic
          <span className="font-sans text-lg font-normal normal-case text-neutral-900"> — Storytelling and Design Feedback</span>
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-900">
          An adversarial, honest critic for your work: a persona jury, a forecast of your review, and a portfolio rehearsal
          room. Use with caution — every claim is yours to verify, and you should always consult a range of humans too.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Critic modes">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`display-font rounded-md px-3 py-2 text-sm ${
                tab === t.id ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-neutral-900">Depth</span>
          <ModelToggle value={tier} onChange={setTier} size="sm" />
        </div>
      </div>

      {tab === "jury" && <Jury sessionId={sessionId} setSessionId={setSessionId} tier={tier} />}
      {tab === "review" && <ReviewPrep sessionId={sessionId} setSessionId={setSessionId} tier={tier} />}
      {tab === "portfolio" && <Portfolio sessionId={sessionId} setSessionId={setSessionId} tier={tier} />}
    </div>
  );
}
