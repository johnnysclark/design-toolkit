"use client";

// Renders a CLAIM as a tagged chip: ✓ supported / ? unverified / ⚠ likely-wrong.
// The colored backgrounds carry the signal; the text itself stays dark (the
// studio's all-black-text rule — no grey body text).

import type { Claim, ClaimTagKind } from "./types";

const STYLE: Record<ClaimTagKind, { glyph: string; chip: string; label: string }> = {
  supported: { glyph: "✓", chip: "bg-green-100 text-green-900", label: "supported" },
  unverified: { glyph: "?", chip: "bg-amber-100 text-amber-900", label: "verify" },
  "likely-wrong": { glyph: "⚠", chip: "bg-red-100 text-red-900", label: "likely wrong" }
};

export function ClaimTag({ claim }: { claim: Claim }) {
  const s = STYLE[claim.tag] ?? STYLE.unverified;
  return (
    <div className="flex items-start gap-2 py-1">
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.chip}`}
        title={s.label}
      >
        <span aria-hidden="true">{s.glyph}</span>
        <span className="sr-only">{s.label}: </span>
        {s.label}
      </span>
      <span className="text-sm text-neutral-900">
        {claim.text}
        {claim.why ? <span className="text-neutral-900"> — {claim.why}</span> : null}
      </span>
    </div>
  );
}

export function ClaimList({ claims, label }: { claims?: Claim[]; label?: string }) {
  if (!claims || claims.length === 0) return null;
  return (
    <div className="mt-2">
      {label ? <p className="text-xs font-medium uppercase tracking-wide text-neutral-900">{label}</p> : null}
      <div className="mt-1">
        {claims.map((c, i) => (
          <ClaimTag key={i} claim={c} />
        ))}
      </div>
    </div>
  );
}
