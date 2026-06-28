# HANDOFF — Eco-Architect **V3** (NSGA-II optimizer + extensible forces + manual geometry)

Notes for the next agent. Written 2026-06-28 (session that built V3).

## TL;DR

V3 is **built, merged, and LIVE** (PRs **#56 → #57 → #58**) at
`toolkit.allmeans.works/site-design` → the **V3 "Optimizer + forces"** pill.
The default version stays **V2** (students unaffected until they click V3). It is the
realization of `OVERHAUL-PLAN.md`'s deferred **Phase 3**: a hand-built, dependency-free,
**in-browser NSGA-II multi-objective optimizer** (Wallacei/Galapagos-inspired), plus a
batch of new + user-authorable site forces, plus the V2-style **manual geometry editing**.

All green: full `npm test` (parity Δ≈6e-14 unchanged + the new 240-assertion v3 suite) and
a **production headless-Chrome smoke** (optimizer evolves a feasible front, both chart modes
render, geometry sliders live-update, spawn + authoring work, **0 console exceptions**).

## The product, in one breath

Two ways to design, both feeding one **Series** (the gradeable genealogy):
1. **Shape the geometry by hand** — center tab "✏ Shape the geometry": the V2 MAKE sliders
   (wall/roof/plinth, feet-and-inches) + a full aperture editor, model updates live.
2. **Run the optimizer** — right dock recipe **1 Charter → 2 Genes → 3 Objectives → 4 Run**:
   evolve a Pareto **front** of variations, hover to preview, select a phenotype, **Spawn** it
   into the Series with a written "why". **Decision-support: it populates & suggests a knee;
   the student selects.** No auto-apply (this is deliberate — see OVERHAUL-PLAN L185/220/504).

## Where the code lives (all NEW under `web/v3/`, reusing V2/core UNCHANGED)

| File | Role |
|---|---|
| `nsga2.js` | Pure, headless NSGA-II. mulberry32 seeded PRNG · fast non-dominated sort · **constrained domination** (Deb feasibility rule) · crowding distance (per-objective normalized) · binary tournament · SBX + polynomial mutation · elitist μ+λ. Exports `nsga2()` (sync) + `nsga2Stepper()` (one gen/step, for rAF). No DOM, no core import. |
| `genome.js` | `GENE_CATALOG` (geometry + apertures + site, mirrors V2 ranges) · `DEFAULT_GENES` (8) · `encode`/`decode`/`snap` · `getPath`/`setPath`. Engine works in **SI**; decode snaps to the slider grid so a result is slider-reproducible. |
| `objectives.js` | `deriveObjectives(rules, manual)` — **soft rule → objective** (op→direction: `>=`/`>`→max, `<=`/`<`→min, between/==→derived distance), **hard rule → constraint** with `g = −evaluateRule.margin` (reuses the parity-locked evaluator). Mode routing: empty / feasibility / single (Galapagos) / scatter (2) / parallel (≥3). `makeEvaluator()`. |
| `charts.js` | Hand-built SVG (no charting lib): 2-obj **scatter** (front highlighted), **parallel-coordinates + brushing** (≥3), **convergence** sparkline, `kneePoint()` (suggested compromise). |
| `spawn.js` | `buildPhenotypeVariation()` → `makeVariation()` (series.js, **unchanged**) with a `decision.optimizer` provenance bundle: seed, run params, geneSet, objectives, **charterSnapshot**, chosen vector, `coreVersion`. Self-consistent: re-`run()`ing the saved seed reproduces the chosen objectives to 1e-6. |
| `forces_extra.js` | `EXTRA_FORCES` (compactness · glazing budget · form · solar-skin · buoyant-vent) + `EXTRA_TENSIONS`. **All bind to EXISTING metrics → zero parity cost.** |
| `authoring.js` | `buildCustomForce`/`validateForce` (existing metrics only, scalar ops only) · `buildTension` · `mergeForces`/`mergeTensions`. |
| `app3.js` | Orchestrator: force deck (+ site sliders + live metric reads) · MAKE geometry sliders + aperture editor (center tabs) · charter (standing/tensions/clauses) · gene panel · objective picker · rAF run loop · charts · phenotype preview/select · spawn dialog · define-a-force · mark-a-tension · localStorage + project export · series board. `liveUpdate()` = light recompute for slider drags (no DOM rebuild); `rebuildBase()` = structural. |
| `index.html` / `v3.css` | 3 labelled zones (site & forces / center design / optimizer) · center two-tab · collapsible `<details>` right-dock accordions. |
| `test_*.mjs` (7) | 240 assertions: engine vs ZDT1/Binh–Korn + determinism · genome round-trip + finiteness sweep · objective-derivation table + `g=−margin` · full integration · forces validity · spawn self-consistency · authoring. Wired into `npm run test:v3`. |

**Only existing files edited:** `web/shell.html` (one VERSIONS line for the V3 pill) and the tool's
`package.json` (added `test:v3`, chained into `test`). `core.js` / `gable_core.py` / `radiation.*`
were **never touched**.

## Invariants — DON'T BREAK THESE

- **Parity is sacred.** `core.js ↔ python/gable_core.py` are line-for-line; `web/radiation.js ↔
  python/radiation.py` too. V3 only *reads* `run()`. Adding a NEW metric = edit both cores +
  `test/parity*` (expensive) — that's why every v3 force/objective reuses an existing metric.
- **SI engine, imperial display.** Genome + state are SI; UI converts via `web/v2/units.js`
  (`sliderUnit`, `fmtMetricImp`, `impConv`). Don't store imperial.
- **Reproducibility.** Seeded PRNG: same seed+config → identical front. The seed is stored in the
  spawn provenance so a graded submission regenerates. Don't introduce `Math.random()`.
- **Decision-support, not auto-design.** Optimizer populates + suggests; student selects + writes
  the why + declares the tension winner. Keep it that way (repo pedagogy + honesty contract).
- **Shared Series store** key `ecoArchitect.v2.series` → a phenotype spawned in V3 also shows up in
  V2's genealogy (intended). `makeVariation`'s free-form `decision` carries the optimizer bundle, so
  `series.js` stays untouched.

## How to verify

```
cd platform/apps/toolkit/public/tools/gable-studio
npm test          # parity + sensitivity + occlusion + radiation + npm run test:v3 (240)
```
Browser: `npm run serve` (or static-serve `web/`) → open `web/shell.html#v3` (or `web/v3/index.html`).
Headless WebGL: swiftshader flags + CDP-over-WebSocket (Node 26 has global `WebSocket`); recipe in the
`headless-webgl-r3f-testing` memory. The session's CDP smoke drivers were in the scratchpad
(NOT committed) — re-author if needed; they: propose a charter → Run → assert front renders +
drag a geometry slider changes a metric read + tabs switch + spawn works + 0 exceptions.

## Honest gaps / known limits

- Objectives use the **fast proxy metrics only** (~1–2 ms/eval). **Radiation objectives**
  (`incidentByModel`, ~5–10 ms/eval, real self-shaded kWh/m²) are NOT wired yet — they need the
  deferred **Web Worker** (the architecture is ready: `evaluate()` is the only seam; an ES-module
  worker can import `core.js`/`radiation.js` zero-build). Gate behind a "needs EPW · slower" badge.
- **EPW climate** isn't wired into V3 (V2 has `weather.js`/`sky.js`/`compare.js` + `climateBlock`).
- Custom forces bind to **existing metrics only**; a formula editor for new metrics is a non-goal
  (parity cost).
- Only `apertures.0.{w,h}` are catalog genes (the south window); apertures 1–3 + u/v aren't genes yet.
- **Inherited bug:** the live gable-geometry issue (enclosed in PEN, not analysis) from PRs #53/#54
  is INDEPENDENT of v3 but affects it — the metrics still use the rectangular wall *tube*, not the
  gabled shell. Tracked in `HANDOFF-fix-gable-geometry.md`. Fixing that improves V3's numbers too.
- Right-dock accordions + the forces list are independent toggles (not one-open-at-a-time).

## Possible next steps (a menu, not a mandate)

1. **Radiation objectives via Web Worker** — biggest fidelity win; the `evaluate()` seam is ready.
2. **EPW climate in V3** — load `.epw` → set site inputs/genes from the file; show measured climate on
   the force cards (port V2's `climateBlock`).
3. **Wallacei-parity analytics** — K-means cluster the front; per-objective std-dev + convergence
   charts; per-phenotype diamond/radar (charts.js has hooks); a hypervolume readout.
4. **More genes** — apertures 1–3 (host/w/h/u/v) as optional genes; wall thickness; ridge position.
5. **UX polish** — one-open-at-a-time accordions; collapse forces by default; short onboarding overlay;
   in-canvas radiation overlay (touches shared `viewport.js` — parity-safe but shared).
6. **Persist the run, not just the pick** — a revisitable "front gallery"; re-run from a stored seed.
7. **Apply `HANDOFF-fix-gable-geometry.md`** so V3 metrics use the true enclosed gable.
8. **Pedagogy** — export the front as CSV; a "my hand design vs the optimizer's knee" compare;
   a worked-example deep link.

## Pointers
- Plan: `~/.claude/plans/virtual-napping-dragonfly.md`
- Auto-loaded memory: `eco-architect-overhaul-direction.md`
- Worktree: `design-toolkit-eco-v3`. Branches `feat/eco-architect-v3` (#56) + `fix/eco-architect-v3-geometry` (#57) + `fix/eco-architect-v3-layout` (#58) were all merged + deleted.
