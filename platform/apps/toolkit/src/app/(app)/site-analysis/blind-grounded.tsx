"use client";

// The hallucination lesson, made visible: the same place-profile prompt run blind
// (from memory) and grounded (web search), side by side. The chips make the point —
// the blind column carries unverifiable/likely-fabricated claims with no sources;
// the grounded column verifies and cites. Auth-gated (it spends the studio's key).

import { useState } from "react";
import { Card, ClaimChip, ClaimList } from "./ui";
import Thinking from "@/components/Thinking";
import type { Claim, ClaimStatus } from "./types";

type Profile = { answer: string; claims: Claim[] } | { error: string };

function tally(claims: Claim[]): Record<ClaimStatus, number> {
  const t: Record<ClaimStatus, number> = { verified: 0, "plausible-unverified": 0, "likely-hallucination": 0 };
  for (const c of claims || []) if (t[c.status] != null) t[c.status]++;
  return t;
}

export default function BlindVsGrounded({ place, tier }: { place: any; tier?: string }) {
  const [data, setData] = useState<{ blind: Profile; grounded: Profile } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/site-analysis/blind-vs-grounded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place, tier })
      });
      const d = await res.json();
      if (res.status === 401) throw new Error("Sign in to run the AI analysis.");
      if (!res.ok) throw new Error(d?.error || "Comparison failed.");
      setData({ blind: d.blind, grounded: d.grounded });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Hallucination test — blind vs. grounded">
      <p className="-mt-1 mb-3 text-xs text-neutral-900">
        The same question, asked twice: once from memory (<span className="font-semibold">blind</span>), once with web search
        (<span className="font-semibold">grounded</span>). Compare what the model invents against what it can actually cite — that gap is the lesson.
      </p>
      <button
        onClick={run}
        disabled={loading}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? "Running both passes…" : data ? "Re-run the test" : "Run the hallucination test"}
      </button>
      {loading && (
        <div className="mt-3">
          <Thinking label="Asking the model blind, then grounded…" />
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-neutral-900">{error}</p>}
      {data && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Column title="Blind — from memory, no search" profile={data.blind} />
          <Column title="Grounded — web search" profile={data.grounded} />
        </div>
      )}
    </Card>
  );
}

function Column({ title, profile }: { title: string; profile: Profile }) {
  if ("error" in profile) {
    return (
      <div className="rounded-lg border border-neutral-200 p-3">
        <h4 className="display-font text-[11px] uppercase tracking-tight text-neutral-900">{title}</h4>
        <p className="mt-2 text-sm text-neutral-900">Couldn’t complete this pass: {profile.error}</p>
      </div>
    );
  }
  const t = tally(profile.claims);
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="display-font text-[11px] uppercase tracking-tight text-neutral-900">{title}</h4>
        <div className="flex flex-wrap gap-1">
          {t.verified > 0 && (
            <span className="inline-flex items-center gap-1">
              <ClaimChip status="verified" /> {t.verified}
            </span>
          )}
          {t["plausible-unverified"] > 0 && (
            <span className="inline-flex items-center gap-1">
              <ClaimChip status="plausible-unverified" /> {t["plausible-unverified"]}
            </span>
          )}
          {t["likely-hallucination"] > 0 && (
            <span className="inline-flex items-center gap-1">
              <ClaimChip status="likely-hallucination" /> {t["likely-hallucination"]}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-neutral-900">{profile.answer}</p>
      {profile.claims?.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">Atomic claims</div>
          <ClaimList claims={profile.claims} />
        </div>
      )}
    </div>
  );
}
