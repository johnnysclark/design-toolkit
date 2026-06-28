"use client";

// Presentational renderers for the two gated AI passes. The run controls + auth
// gating live in the orchestrator; these just display a result once it exists.

import type { Contamination, Synthesis } from "./types";
import { Card, ClaimChip, ClaimList, Read } from "./ui";

// Always-visible synthesis "headline" — the cross-scale reads (climate/topo/flood/
// contamination) are surfaced inside the macro/micro cards instead.
export function SynthesisStrip({ synthesis }: { synthesis: Synthesis }) {
  return (
    <Card accent title="AI Design Synthesis" className="space-y-4">
      <p className="max-w-prose text-base font-medium leading-snug text-neutral-900">
        {synthesis.site_in_a_sentence}
      </p>

      {synthesis.design_opportunities?.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
            Design opportunities
          </div>
          <ClaimList claims={synthesis.design_opportunities} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Read label="Key tensions">{synthesis.key_tensions}</Read>
        <Read label="What this analysis cannot tell you">
          {synthesis.what_this_analysis_cannot_tell_you}
        </Read>
      </div>

      {synthesis.field_checklist?.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
            Field checklist — verify before you design
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-neutral-900">
            {synthesis.field_checklist.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        AI judgment, not ground truth. Every tagged claim is for you to verify — consult drawings,
        a site visit, and humans before designing.
      </p>
    </Card>
  );
}

// Contamination brief — Superfund mode only, a micro-scale (on-site) card.
export function ContaminationPanel({ contamination }: { contamination: Contamination }) {
  const c = contamination;
  return (
    <Card title="Contamination (EPA-grounded)" className="space-y-4">
      <p className="text-sm leading-relaxed text-neutral-900">{c.summary}</p>

      {c.contaminants_of_concern?.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
            Contaminants of concern
          </div>
          <ul className="space-y-2">
            {c.contaminants_of_concern.map((x, i) => (
              <li key={i} className="rounded-md border border-neutral-200 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{x.name}</span>
                  <ClaimChip status={x.claim.status} />
                </div>
                <div className="text-xs text-neutral-900">in {x.media}</div>
                <p className="mt-1 text-sm text-neutral-900">{x.health_or_design_note}</p>
                {x.claim.source && (
                  <a
                    href={x.claim.source}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block truncate text-xs text-sky-700 underline underline-offset-2"
                  >
                    {x.claim.source}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Read label="Plume & extent">{c.plume_and_extent}</Read>

      {c.institutional_controls?.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
            Institutional controls
          </div>
          <ClaimList claims={c.institutional_controls} />
        </div>
      )}

      <Read label="Remediation status">{c.remediation_status}</Read>

      {c.sources?.length > 0 && (
        <div className="text-xs text-neutral-900">
          <span className="font-semibold uppercase tracking-wide text-neutral-900">Sources </span>
          {c.sources.map((s, i) => (
            <a
              key={i}
              href={s}
              target="_blank"
              rel="noreferrer"
              className="mr-2 inline-block truncate text-sky-700 underline underline-offset-2"
            >
              [{i + 1}]
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
