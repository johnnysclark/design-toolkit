"use client";

// Shared presentational primitives for Site Analysis — bold + graphic, Archivo
// Black titles (via .display-font), neutral palette with an orange accent.

import type { ReactNode } from "react";
import type { Claim, ClaimStatus, Coverage } from "./types";

export function Card({
  title,
  accent,
  source,
  children,
  className = ""
}: {
  title?: string;
  accent?: boolean;
  source?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border bg-white p-5 ${
        accent ? "border-neutral-900" : "border-neutral-200"
      } ${className}`}
    >
      {title && (
        <h3 className="display-font mb-3 text-xs uppercase tracking-tight text-neutral-900">
          {title}
        </h3>
      )}
      {children}
      {source && (
        <p className="mt-3 border-t border-neutral-100 pt-2 text-[11px] text-neutral-900">
          <span className="font-semibold uppercase tracking-wide">Source</span> · {source}
        </p>
      )}
    </section>
  );
}

// `hint` shows a hover tooltip explaining the metric (matches the Site Design tool's
// title= + ⓘ pattern).
export function Stat({
  label,
  value,
  sub,
  hint
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900"
        title={hint}
      >
        {label}
        {hint && (
          <span className="cursor-help text-neutral-300" aria-label={hint}>
            ⓘ
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-neutral-900">{value ?? "—"}</div>
      {sub && <div className="text-xs text-neutral-900">{sub}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-900",
    good: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    bad: "bg-red-100 text-red-800",
    info: "bg-sky-100 text-sky-800"
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// Honest coverage readout — every layer that failed shows a visible ✕, never faked.
export function CoverageStrip({ coverage, mode }: { coverage: Coverage; mode: "place" | "superfund" }) {
  const layers: { key: keyof Coverage; label: string; show: boolean }[] = [
    { key: "boundary", label: "Boundary", show: mode === "superfund" },
    { key: "climate", label: "Climate", show: true },
    { key: "terrain", label: "Terrain", show: true },
    { key: "flood", label: "Flood", show: true }
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold uppercase tracking-wide text-neutral-900">Coverage</span>
      {layers
        .filter((l) => l.show)
        .map((l) => {
          const ok = coverage[l.key];
          return (
            <span
              key={l.key}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${
                ok ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-900"
              }`}
            >
              <span aria-hidden>{ok ? "✓" : "✕"}</span>
              {l.label}
            </span>
          );
        })}
    </div>
  );
}

// --- Claim tags (shared with the Librarian's honesty primitive) -------------

const CLAIM_META: Record<ClaimStatus, { icon: string; label: string; cls: string }> = {
  verified: { icon: "✓", label: "verified", cls: "bg-emerald-100 text-emerald-800" },
  "plausible-unverified": { icon: "?", label: "plausible", cls: "bg-amber-100 text-amber-800" },
  "likely-hallucination": { icon: "⚠", label: "likely fabricated", cls: "bg-red-100 text-red-800" }
};

export function ClaimChip({ status }: { status: ClaimStatus }) {
  const m = CLAIM_META[status] ?? CLAIM_META["plausible-unverified"];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}
    >
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </span>
  );
}

export function ClaimRow({ claim }: { claim: Claim }) {
  return (
    <li className="flex flex-col gap-1 border-l-2 border-neutral-200 py-1.5 pl-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-neutral-800">{claim.claim}</span>
        <ClaimChip status={claim.status} />
      </div>
      {claim.reason && <span className="text-xs text-neutral-900">{claim.reason}</span>}
      {claim.source && (
        <a
          href={claim.source}
          target="_blank"
          rel="noreferrer"
          className="truncate text-xs text-sky-700 underline underline-offset-2"
        >
          {claim.source}
        </a>
      )}
    </li>
  );
}

export function ClaimList({ claims }: { claims: Claim[] }) {
  if (!claims?.length) return null;
  return <ul className="space-y-1">{claims.map((c, i) => <ClaimRow key={i} claim={c} />)}</ul>;
}

// Prose with a soft label — used for the synthesis "reads".
export function Read({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </div>
      <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-neutral-900">{children}</p>
    </div>
  );
}
