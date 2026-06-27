"use client";

import { useCallback, useEffect, useState } from "react";
import { coerceTier, DEFAULT_TIER, TIERS, type ModelTier } from "@/lib/anthropic/models";

export type { ModelTier };

/**
 * Remembers the chosen tier per tool in localStorage so a student's preference
 * sticks across visits. Defaults to Deep (Sonnet). SSR-safe: starts at the
 * default and reads localStorage only after mount, so there's no hydration
 * mismatch.
 */
export function useModelTier(toolKey: string): [ModelTier, (t: ModelTier) => void] {
  const storageKey = `amw.tier.${toolKey}`;
  const [tier, setTier] = useState<ModelTier>(DEFAULT_TIER);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setTier(coerceTier(saved));
    } catch {
      /* localStorage blocked — keep the default */
    }
  }, [storageKey]);

  const update = useCallback(
    (t: ModelTier) => {
      setTier(t);
      try {
        window.localStorage.setItem(storageKey, t);
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  return [tier, update];
}

/**
 * The shared Fast ⇄ Deep model control used by every AI assistant. It picks the
 * model (Haiku vs Sonnet) — the main cost lever — not a reasoning knob, so it
 * behaves identically across tools. All text stays black per the site rule.
 */
export default function ModelToggle({
  value,
  onChange,
  disabled,
  size = "md"
}: {
  value: ModelTier;
  onChange: (t: ModelTier) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <div
      role="group"
      aria-label="Answer depth"
      className="inline-flex overflow-hidden rounded-lg border border-neutral-300"
    >
      {TIERS.map((t) => {
        const active = value === t.tier;
        return (
          <button
            key={t.tier}
            type="button"
            title={t.hint}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(t.tier)}
            className={[
              pad,
              "whitespace-nowrap transition-colors disabled:opacity-50",
              active ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 hover:bg-neutral-100"
            ].join(" ")}
          >
            <span className="display-font">{t.label}</span>
            <span className="ml-1.5 font-normal">{t.sublabel}</span>
          </button>
        );
      })}
    </div>
  );
}
