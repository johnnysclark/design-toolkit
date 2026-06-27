# AI Assistants — shared architecture & handoff

**Status:** Shipped + **LIVE** (PR #39, squash `81bdb07`, 2026-06-27). The five AI tools —
**Coach** (`skills-coach`), **Surveyor** (`site-analysis`), **Librarian**, **Critic**
(`design-critic`), **RAP** (`rap/agent`) — share one model + UX layer. Build green;
**not yet exercised signed-in** (the AI turns need a Supabase session + Anthropic key).

## Why this exists
The five assistants had drifted: only Librarian had a thinking *animation* (the rest showed
plain "Thinking…" text), there was no shared "answer depth" control, the chats force-scrolled so
you couldn't read while they streamed, and the 60s Vercel cap cut long answers off. This unifies
all of that and adds the real cost lever (model choice).

## The shared layer — reuse these, don't reinvent per tool
| File | What it is |
|---|---|
| `apps/toolkit/src/lib/anthropic/models.ts` | The **Fast ⇄ Deep** tiers. `MODELS.fast = claude-haiku-4-5` (~3× cheaper), `MODELS.deep = claude-sonnet-4-6` (default). `resolveModel(value)` → `{ model, tier, reasoning }`. `webSearchTool(tier, maxUses)` → the correct web_search variant. `MODEL` is re-exported here; each `*-prompts.ts` re-exports it. |
| `apps/toolkit/src/lib/anthropic/limits.ts` | `AI_MAX_DURATION=300`, `SOFT_TIMEOUT_MS=285_000`, `STREAM_SOFT_TIMEOUT_MS=290_000`. |
| `apps/toolkit/src/components/ModelToggle.tsx` | The toggle UI + `useModelTier(toolKey)` (per-tool localStorage, defaults Deep, SSR-safe). |
| `apps/toolkit/src/components/Thinking.tsx` | The geometric thinking animation (promoted from Librarian; React-19 dedupes the `<style>`). |
| `apps/toolkit/src/lib/useStickToBottom.ts` | Pause-autoscroll-when-scrolled-up; returns `{ ref, onScroll, pinned, scrollToBottom }` for a Jump-to-latest button. |

## The per-route contract — how to wire a NEW AI tool
1. Read tier: `const { model, tier, reasoning } = resolveModel(body?.tier)`.
2. Use `model` in the Anthropic call **and** in the `meta`/`tool_runs` trace (record what ran).
3. **Effort + adaptive thinking are Deep-only.** Haiku 4.5 returns **400** on both
   `output_config.effort` and `thinking:{type:"adaptive"}`. Gate them on `reasoning`.
4. **Grounded / web-search passes:** `tools: [webSearchTool(tier, n)]` — Haiku needs
   `web_search_20250305`, not the `_20260209` dynamic-filtering variant.
5. **Cache the system prompt:** `system: [{ type:"text", text: SYS, cache_control:{ type:"ephemeral" } }]`.
   Silently no-ops below the model's min cacheable size, so it's always safe.
6. `export const maxDuration = 300` (a literal — Next reads it statically). Keep a soft-timeout
   from `limits.ts` that aborts a few seconds early and returns a clean error / terminal SSE frame.
7. **Streamed routes:** always emit a terminal `done`/`error` frame, and the client must
   **finalize-on-stream-end** (commit the accumulated partial) so the bubble never freezes.

## Client wiring
- `const [tier, setTier] = useModelTier("<toolKey>")`; render `<ModelToggle value={tier} onChange={setTier} />`;
  put `tier` in the fetch body. (Surveyor lifts tier in the parent and passes it to the `Results`
  child + all four passes.)
- Loading state → `<Thinking label="…" />`.
- Streaming chat → `const { ref, onScroll, pinned, scrollToBottom } = useStickToBottom()`; attach
  `ref` + `onScroll` to the scroll container; show a Jump-to-latest button when `!pinned`; call
  `scrollToBottom()` on send to re-pin.

## Per-tool notes
- **Coach** — streaming SSE, `useModelTier("coach")`. Keeps its beginner/intermediate/advanced
  **teaching-level** toggle — that's a *pedagogical* axis, not model/cost; leave it. Now finalizes
  on stream-end (fixed a latent frozen-half-answer bug).
- **Surveyor** — 4 passes: `chat` + `sources` are streamed; `synthesis` + `contamination` go through
  the shared `structured.ts`. One tier, lifted in `site-analysis-tool.tsx` → `Results` → all 4.
  The auto `sources` pass uses the tier set at analyze time (flipping the toggle after applies to
  the design read + chat going forward — intentional, avoids re-spend).
- **Librarian** — buffered vision. Replaced its old low/med/high **effort slider** with the toggle.
- **Critic** — buffered, 6 modes through its **own** local `runStructured` (made tier-aware: model +
  Deep-only thinking + caching + 285s soft-timeout). 3 client components (jury / review-prep /
  portfolio) each send `tier`; the `Depth` toggle lives in `critic-tool.tsx`. Jury's `body.effort ===
  "deep"` is a separate "should it think" flag (only meaningful on Deep anyway).
- **RAP** — buffered agent. Toggle in `AgentPanel`; tier threaded `onSubmit(instruction, tier)` →
  `runAgent` → fetch body. Console uses the autoscroll hook. (Main has since added mode-scoped
  prompts `buildAgentSystem(mode)` on top of this — fully compatible; my caching wraps it.)

## Gotchas / watch-outs
- **`maxDuration=300` assumes Vercel Pro.** On Hobby's 60s cap it would fail to deploy. (Confirmed Pro.)
- **`main` moves FAST + concurrently.** During this work it advanced ~8 commits of RAP/Eco-Architect
  changes, then moved again right after deploy. **Always `git fetch origin main` and verify
  `git log HEAD..origin/main` is empty before merging/pushing**, or you'll silently revert other
  sessions' work. Don't `git add -A` blindly here — it sweeps up unrelated uncommitted files from
  the shared worktree (it pulled in `plans/librarian-openrouter-engine.md` + a `BUILD-BACKLOG.md` edit
  during this work).
- **`node_modules` was committed on `main` as self-referential symlinks** (a loop → `next build` dies
  with a cryptic `too many levels of symbolic links` / exit 194). Removed in this PR. If a build dies
  that way: `git ls-files | grep node_modules`, `git rm` them, reinstall. **Never force-add node_modules.**

## Verified / NOT verified
- ✅ Build + typecheck (29/29 pages). ✅ All 8 AI routes read `tier`; all 5 tools render the toggle;
  the 3 streaming surfaces use the autoscroll hook. ✅ Production returns 200 on every tool page.
- ❌ **Not run signed-in.** The AI turns need auth (absent in the build env).
  **NEXT SESSION: do a signed-in smoke test of each tool** — especially flip Surveyor to **Fast
  (Haiku)** (exercises the basic `web_search_20250305` path) and re-run the **Tar Creek** analysis
  (the case that historically stalled). Confirm the toggle changes the model in `tool_runs`, the
  Thinking animation shows, and scrolling up pauses autoscroll.

## Next ideas
- The **OpenRouter / Qwen "open" tier** (`plans/librarian-openrouter-engine.md`) slots into
  `models.ts` `resolveModel` / `webSearchTool` as a third tier without touching any tool's code.
- Per-tool default tuning (everything defaults Deep; Coach/RAP could reasonably default Fast).
- Now that 300s removes the timeout pressure, the buffered passes (Critic / Librarian) could be
  streamed for nicer UX.

## Closing comment
The feature itself is small and mechanical — the shared layer is five files and the per-route
contract above. The hard part was landing it on a `main` that moved 8+ commits of concurrent RAP
work mid-flight, on top of a pre-existing broken-symlink commit. Both handled; full-containment was
checked so nothing got reverted, and the next commit on main already built mode-scoped RAP prompts
on top of this layer (proof it's a clean seam). The one real open item is the **signed-in smoke
test** — everything else (build, types, prod 200s, the wiring across all five tools) is verified.
