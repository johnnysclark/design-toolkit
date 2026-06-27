// Central model registry for every toolkit AI assistant.
//
// All five assistants (Coach, Surveyor, Librarian, Critic, RAP) share ONE
// "Fast ⇄ Deep" control. It picks the *model*, which is the real cost lever:
// Haiku 4.5 is ~3× cheaper than Sonnet 4.6 ($1/$5 vs $3/$15 per 1M tokens).
// Sonnet is the default (best answers); Fast drops to Haiku for quick, cheap runs.
//
// Verified against the Claude API reference (Jun 2026): the *effort* parameter
// (output_config.effort) and adaptive thinking are Sonnet-only — Haiku 4.5
// rejects effort and is not an adaptive-thinking model — so `reasoning` below
// tells callers when it's safe to send those.

export const MODELS = {
  fast: "claude-haiku-4-5",
  deep: "claude-sonnet-4-6"
} as const;

export type ModelTier = keyof typeof MODELS; // "fast" | "deep"

export const DEFAULT_TIER: ModelTier = "deep";

// UI metadata for the shared toggle (kept here so server + client agree).
export const TIERS: { tier: ModelTier; label: string; sublabel: string; hint: string }[] = [
  { tier: "deep", label: "Deep", sublabel: "Sonnet", hint: "Best answers — slower, costs more" },
  { tier: "fast", label: "Fast", sublabel: "Haiku", hint: "Quick & cheap — good for simple questions" }
];

export function coerceTier(value: unknown): ModelTier {
  return value === "fast" ? "fast" : "deep";
}

export interface ResolvedModel {
  tier: ModelTier;
  model: string;
  /** True only on Deep (Sonnet). When false (Fast/Haiku) callers MUST omit
   *  output_config.effort and adaptive `thinking` — Haiku 4.5 errors on both. */
  reasoning: boolean;
}

export function resolveModel(value: unknown): ResolvedModel {
  const tier = coerceTier(value);
  return { tier, model: MODELS[tier], reasoning: tier === "deep" };
}

/**
 * The web_search tool version depends on the model. The dynamic-filtering
 * variant (_20260209) requires Sonnet 4.6+/Opus; Haiku 4.5 only supports the
 * basic _20250305. Both return the same `web_search_tool_result` block shape,
 * so callers parse them identically. Use this so the Fast (Haiku) tier doesn't
 * 400 on a grounded pass.
 */
export function webSearchTool(tier: ModelTier, maxUses: number) {
  return {
    type: tier === "deep" ? "web_search_20260209" : "web_search_20250305",
    name: "web_search",
    max_uses: maxUses
  };
}

// Back-compat: the per-tool `MODEL` export now points here (the Deep default),
// so existing `import { MODEL } from "./<tool>-prompts"` call sites keep working.
export const MODEL = MODELS.deep;
