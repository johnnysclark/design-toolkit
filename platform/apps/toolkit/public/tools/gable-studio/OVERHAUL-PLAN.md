# Eco-Architect (Gable Studio) — Studio-Ready Overhaul Plan

> **What this is.** An overhaul plan to turn Eco-Architect from a single-massing tinkering
> tool into a **method**: students design a *series of variations* of the kit of parts
> (gable roof · box walls · apertures · plinth) where every decision is a *response to a
> site force* (sun, wind, terrain, views, humidity…), with the **ruleset + feedback loop
> embedded in the interface and in the method itself**.
>
> Produced by a multi-agent analysis (6 subsystem recon readers + 3 field researchers →
> 3 competing north-star visions + 4 specialist deep-dives → 3 judges + 2 adversarial
> critics → synthesis). All three judges independently ranked the **Force → Move → Rule**
> vision as the spine; a second multi-agent pass then added the **Benchmark Track**
> (Ladybug-comparability + all-data-visible) below. Technical claims were vetted against
> `web/core.js` and the parity test. No code yet.

---

## Resolved decisions

- **Name & scope (resolved):** keep the name **Eco-Architect**, and publish an explicit,
  always-visible **scope statement** so it can chase fidelity without overclaiming:
  > *Eco-Architect is a transparent, checkable first-order site-force analysis you can
  > benchmark against the standard tools. Every input, intermediate, and formula is visible,
  > and headline metrics read in real physical units (kWh/m², h, %, °C, m³/s, ACH). Where
  > Ladybug itself uses only geometry and closed-form physics — incident/cumulative radiation,
  > direct sun hours, sky-view factor, the EPW wind rose, the comfort indices — Eco-Architect
  > reproduces that method and publishes a measured residual against a real Ladybug run. It is
  > honestly **not a simulation engine** (no Radiance daylight, no EnergyPlus, no CFD), so
  > daylight lux/DA/sDA/UDI, energy EUI, and wind pressure/Cp are taught as vocabulary, never
  > shown as Ladybug-comparable.*
- **Do both (resolved):** (1) push the browser proxies as close to the standard tools as a
  zero-build tool honestly can — real EPW weather in, physical units out; **and** (2) a
  first-class in-tool **"Run in Rhino" link** that fires the matching **Ladybug** run on the
  identical model + weather for a **side-by-side comparison**. See **The Benchmark Track** below.
- **Meta-goal:** the comparison *is* the product and the lesson — show our number, Ladybug's,
  the delta, and *why* they diverge — and demonstrate how far a hand-built, dependency-free
  tool authored with Claude Code can get toward the industry standard, honestly.

---

## Build status — shipped & in flight (2026-06-27)

- **V1** (original) — unchanged, preserved at `web/index.html`.
- **V2** (this plan's Phase-1 method spine) — **BUILT** at `web/v2/`: a Force Deck
  (READ/NAME), a Force→Move→Rule **Charter** with live standing + tension detection
  (COMMIT/WATCH), MAKE sliders, and a seed-is-truth **Series** genealogy (SPAWN). A
  version toggle (`web/shell.html`) switches V1/V2 and is built to add v3+. *(PR #41.)*
- **Benchmark Track (Phase 2.5)** — largely **BUILT** on branch
  `feat/eco-architect-benchmark`:
  - EPW weather parser (`web/v2/weather.js`) → real climate + wind rose.
  - Cumulative sky matrix (`web/v2/sky.js`, Tregenza-145) → real incident **kWh/m²**.
  - **The parity buy**: occluded per-surface kWh/m² in `web/radiation.js` ↔
    `python/radiation.py`, proven identical by `test/parity_rad.py` (worst Δ≈6e-14,
    now in `npm test`). `core.js`/`gable_core.py` left **untouched** — existing
    parity/sensitivity/occlusion stay green, V1 unaffected.
  - **Ladybug side-by-side**: `⚖ Compare to Ladybug` (ours vs a pasted Ladybug CSV,
    with honest divergence notes) + `LADYBUG_RECIPE.md` + a comparison-pack export.
- **Honest gaps still open**: the diffuse sky is **isotropic** (Perez is the next
  refinement — a parity-safe `sky.js`-only change); no ground-reflected component;
  no comfort/`es(T)` yet; the radiation overlay isn't drawn in the (shared)
  viewport; no `.ghx` auto-generation (a recipe + the Validate tab instead, by
  choice — an untestable `.ghx` would be fragile).

---

## North-star thesis

Today the tool lets a student drag sliders and chase a green percentage. The overhaul makes
it impossible to design *without reasoning*: every saved variation is a recorded **MOVE**
that answers a **NAMED FORCE** under a **COMMITTED RULE**, and the series of forks reads as
an argument an instructor can grade.

The discipline throughout: we spend the project's scarce currency — **JS↔Python parity** —
almost nowhere. The entire method, series, and feedback loop ride the existing pure `run()`
and the ~30 metrics already in `core.js` at **zero parity cost**. The only parity money in
the MVP buys one cheap, brief-relevant force (overhang shading geometry, which needs no new
site input). Humidity — the one new physics the brief names — is bought as a single
primitive `es(T)` in Phase 2, fanning out into a whole comfort family. Everything risky or
server-shaped (occlusion-into-parity, an auto-coach that says "rotate +8°", drag-the-sun
gizmos, an LLM assistant, the Surveyor/Coach channel) is deliberately deferred so the
teaching loop runs **fully offline in studio from day one**, and the honesty contract
(every number is a transparent proxy with a "can't tell you" caveat) is never traded away
for the appearance of simulation.

A guiding caution: **parity-cheap is not the same as cheap-to-build.** The MVP is small
bespoke UI over already-computed numbers, plus exactly one small parity buy.

---

## The redesigned METHOD (the student loop)

Six first-class verbs, mapped onto the Olgyay/Givoni two-step ("read forces → name a
strategy → shape the part"). **The dock layout *is* the loop**, read left → right → center
→ bottom.

1. **READ** — the site arrives as a **Force Deck** of cards (left dock), not as
   undifferentiated `site` sliders. Each card carries value + formula + assumptions + a
   mandatory "can't tell you" caveat + a provenance stamp (`student-typed` / `preset` /
   `measured`). Honest *absences* are also cards: on a ravine-edge site,
   **flood / erosion / slope-stability is foregrounded as a "force we can't model honestly"**
   card that demands a hand-judgment note, rather than buried as a dead flag.
2. **NAME** — the student tags the 2–3 forces that govern *this* fork. Tagging is the act of
   committing intent and is what every later artifact (genealogy edge, decision card) keys to.
3. **COMMIT** — for each governing force the student picks a canonical move from the
   **Force → Move → Rule palette** (swatches: "shade summer / admit winter", "berm all but
   the solar face", "shed away from the ravine"). Picking a move *auto-drafts* a testable
   rule `{force, move, lhs, op, rhs, weight, hard, caveat, provenance}` into the ruleset,
   pre-filled with a defensible, **named and student-editable** threshold (provenance string
   says where the number came from, e.g. "YourHome 7% rule" or "baseline ×1.25").
4. **MAKE** — the student edits kit parameters with the existing sliders; the governing
   force paints live on the geometry it changed (same orthographic view), and the rule's
   standing updates.
5. **WATCH** — each rule reads against an explicit baseline (the parent fork or a stated
   target) as a **standing, not a grade**. For a red rule, a *passive* **lever hint**
   highlights which sliders are known to move its left-hand side — **no ranked magnitude, no
   "rotate +8°" imperative** (that auto-coach is deferred).
6. **SPAWN** — the student **forks** the next variation as a deliberate response and fills a
   one-card decision "why" (force answered / alternative rejected / trade-off accepted / rule
   encoded). The fork is captured into the **Series Board** with thumbnail, seed, metric
   vector, rule cards, and that card.

**Submission = the Series**: a genealogy of forks, each a force→move→rule→result→why, plus a
closing reflection. The instructor reads *reasoning*; the downstream Coach (later) critiques
the same artifact.

---

## The kit of parts — what changes

**Almost nothing in the geometry, by design.** The independent-rectangles + two-pitch +
`ridgePos` primitive (gable/shed/butterfly for free) and the 4 aperture cuts on ravine
terrain are kept intact — **no new primitive**. Adding a kit part multiplies cost across
`buildFrames`/`massingTriangles`/`plinthFaces` + the four Rhino builders + import.

What changes is *how the existing parts are read as force-responders*, surfaced in the move
palette:

- **Plinth** = thermal mass **and** the raise-for-humidity/airflow move (its "value" flips
  with the climate once `es(T)` lands).
- **Roof type** = the snow/rain/solar/stack-outlet negotiation — the richest staged
  conflict, delivered with zero geometry change.
- **Overhang depth** is *derived* from the existing roof-vs-wall rectangle offset, not a new
  parameter — so the shading lesson is delivered without touching the kit. *(In v1 overhang
  stays a derived read controlled by the roof/wall sliders; a draggable eave handle is a
  Phase-3 gizmo.)*
- **Berming** = a per-face attribute of the wall tube, not a new part.

Two known inconsistencies are **kept and labeled as honesty lessons, not fixed**: apertures
double-count wall-behind-glass in `envelopeArea`, and headline solar ignores self-shadow
while the overlay raycasts it. Fixing either is a parity-AND-curriculum migration that
shifts every authored threshold. We instead make the seam *visible* (see Interface).

---

## The SITE-FORCE model — new forces as honest proxies

Architecture: the Olgyay/Givoni **two layers** — a STRATEGY layer (which move the climate
calls for) feeding a GEOMETRY-RULE layer (trig/ratio proxies on the existing kit). Forces
still enter at one funnel: the `site` object consumed by `analyze(params, site)`. Each new
force lands via the existing registration (`computeMetrics` return → `VARIABLE_DEFS` →
`flatten`) mirrored in `python/gable_core.py` with a parity case.

See the **New Site-Forces** table below for every proxy, formula, and caveat. Headlines:

- **MVP (one force, no new site input) — `[PARITY: small]`** — **Overhang shading.**
  `alt(decl) = 90 − |latitude − decl|`; `shaded_drop = overhangDepth × tan(alt)`;
  `shadeFraction = clamp(shaded_drop / apertureHeadHeight, 0, 1)`; E/W "overhang
  ineffective" flag for low-angle sun. Reuses the altitude already in `sunSamples` and the
  roof/wall offset as overhang depth. Proves the force→move→rule pipeline end-to-end without
  new physics.
- **Phase-2 — the ONE new primitive — `[PARITY: expensive but bounded]`** —
  `es(T) = 6.112·exp(17.62·T/(243.12+T))` (Magnus). Built once, ported once, parity-tested
  once over a temperature grid. Everything humid derives as one-line cheap functions off it
  (RH, dewpoint, humidity ratio, enthalpy). This is what lets a variation differ for a
  *real* reason — humidity flips the plinth's thermal mass from asset to liability.
- **Phase-2 comfort (cheap given `es`)** — Humidex + ASHRAE-55 adaptive band + a
  `comfortBox` boolean — a comfort *target*, never a claim the building reaches it.
- **Phase-2 strategy — candidates, never a verdict** — a Givoni gate emits the top 2–3
  strategies with their *threshold distances*, **integer-coded** so it survives the `1e-6`
  comparator, rendered as 2–3 candidates, not one authoritative badge.
- **Later/optional** — daylight (BRE Average Daylight Factor, shown as a **number**, never a
  faked floor gradient), rain shed go/no-go + wind-driven-rain exposure, terrain drainage
  direction.
- **Views stay deliberately judgmental** — keep the solid-angle metrics; add a derived
  `tradeoffTension` so the view-vs-sun conflict is *surfaced* and resolved by the student in
  the decision card, never auto-optimized.

**Discrete-output parity hazard (named):** `summerShadeOK`, `shedsOK`, `comfortBox`, the
strategy enum are booleans/ints from float comparisons; two cores can agree to `1e-9` yet
flip a category at a threshold. Mitigation: keep enums integer, place parity test points away
from boundaries, and centralize every inline constant (Magnus a/b, `W<0.012`, min-pitch
table, DF coefficients) into one shared named-constants block edited in both files.

---

## The VARIATIONS / genealogy system (seed-is-truth)

The cheapest, highest-leverage subsystem and the literal Phase-1 backbone — **zero parity
cost**, because `run(params, site, ruleset)` is already pure and deterministic, so a SERIES
is just `run()` over an array of seeds.

- **Data model (new `web/series.js`):**
  `Variation = {id, parentId, rootId, title, seed:{params, site, ruleset},
  decision:{force, move, changed[], intent, feedback, note}, cache:{metrics, evaluation},
  schemaVersion, coreVersion}`. **The seed is truth; the cache is a convenience.** A
  `coreVersion` fingerprint + a **"Recompute all"** button stop stale proxy numbers from
  quietly lying after a parity-locked core change — the subsystem designs against its own
  dishonesty.
- **Fork + auto-diff:** forking loads `parent.seed`; on save the system auto-diffs
  `child.seed` vs `parent.seed` into `decision.changed[]` and computes `metricDeltas` +
  flipped rules. The causal chain force→move→param→metric-delta→rule-flip is captured
  *mechanically*; the student only writes the prose. *(Surfaced caveat: a delta attributes
  to the whole bundle of changes in that save, not a controlled A/B — reinforcing "test one
  decision at a time.")*
- **The board (v1 = deliberately flat):** a thumbnail/list board you click to reload a seed,
  plus an **indented lineage list** (not a rendered node-link DAG in v1).
- **Series-relative normalization (honestly labeled):** colors compare across a set, but the
  legend states **"relative to this set"** and surfaces the moving-baseline caveat. It is
  comparability, not an absolute performance scale.
- **Deferred to Phase 3:** deterministic parameter sweeps that *populate* but never *select*;
  parallel-coordinates with brushing; a Pareto highlight on one force-pair; a rendered
  genealogy DAG.

---

## The RULESET-as-medium + embedded FEEDBACK LOOP

The engine is already ahead of the UI: `evaluateRule` supports `< <= > >= == between
outside` + weight + hard, and `flatten()` exposes every param/metric. So this is pure
UI/data over existing metrics — **MVP is entirely parity-free** and round-trip-safe (the
unchanged `{lhs,op,rhs,weight,hard}` predicate is what the Rhino python evaluator consumes;
new metadata fields are inert).

- **Clause, not rule:** the right dock becomes a **Charter** ("your brief to the site").
  Each clause renders as a sentence triad **FORCE chip → MOVE → TEST**, with raw `lhs/op/rhs`
  under an "advanced" disclosure. A beginner who doesn't know the metric vars can still
  author defensible intent.
- **Site proposes the charter (`FORCE_CATALOG`, new `web/charter.js`):** on site load, a
  baseline `run()` reads current metrics and proposes provenance-bearing clauses. Worked
  example for strong winter sun: clause A `{solarWinterUseful ≥ baseline×1.25}` **and** its
  competitor clause B `{overheatRatio ≤ 1.8}` arrive together so admit-winter and
  reject-summer **visibly fight**. Every suggested constant stays named and editable — no
  anonymous oracle.
- **Standing, not a grade:** each clause row shows value-vs-threshold + a zero-centered
  signed-margin bar (from `evaluateRule.margin`) + the engine reason + the caveat inline.
  The headline becomes a compact standing read — `4 met · 1 within reach · 1 fighting` —
  with the weighted % demoted to an on-demand detail. The cosmetic dashboard "soft" bars are
  **deleted** so there is exactly one notion of good (baseline + target).
- **Conflict is the learning event:** two clauses are designed to fire and disagree
  (snow-steep vs summer-shallow roof; view vs solar). The student must declare a winner.
  *(Open question: weight slider vs a declared, logged decision in the card.)*
- **Feedback loop, defanged:** for a red clause, a **passive lever map** (authored per
  metric: which params move this LHS) highlights the relevant sliders — **no ranked
  magnitude, no imperative.** The finite-difference "closest move + its trade-off" coach
  returns in Phase 3 only as "try this next, not the optimum," debounced and scoped, never
  auto-applied.

---

## The INTERFACE / viewport redesign

Keep the dock grid, the central orthographic CAD camera, the white hidden-line Pen look,
Archivo-Black headings, the all-text-black rule, and the honest Möller–Trumbore self-shadow
**overlay** (kept as an overlay, never ported into parity). Re-tenant the docks around the
loop:

- **LEFT = Force Deck** (READ/NAME): force cards with value/formula/caveat/provenance and a
  "governs this" toggle, visually distinct from geometry sliders. Includes the honest
  "can't-model" cards (flood).
- **RIGHT = Charter** (COMMIT/WATCH): move palette → auto-drafted clauses → standing rows
  with inline caveats.
- **CENTER = viewport**, driven by an **overlay registry** that replaces the `applyDisplay`
  if/else ladder:
  `OVERLAYS = [{id, force, accent, paint:'face'|'cell'|'glyph', legend, register:['analysis','pen'], caveat}]`,
  dispatched through one `paintScalarField` helper. New forces *register*, not surgery.
  Critically, overlays can annotate **Pen mode** (sun arc, view-cone outline, drainage
  linework in the force's accent) so the drawing register students actually draw in finally
  carries forces.
- **The labeled solar seam:** a visible **"headline vs shaded"** toggle/label on the solar
  overlay names which fidelity you're seeing — turning the silent inconsistency into the
  explicit honesty lesson, *without* the occlusion-into-parity port.
- **In-canvas caveat ribbon** under the legend so "can't tell you" lives in the view, not
  only a modal.
- **Deferred to Phase 3:** Raycaster direct-manipulation gizmos (grab the sun/wind/view).
  Sliders already write the same deterministic path, so v1 ships without them.

**Accessibility note (open):** the feedback channel is green/amber/red + spectral ramps with
no colorblind-safe encoding, and it fights the all-text-black rule — must be designed before
the color language hardens.

---

## The Rhino round-trip's evolving role

Unchanged and preserved: ship-python-verbatim (fetch, not codegen), the embedded parity
self-test (`run_rhino3dm.py`, `<1e-6` vs browser metrics), the three Rhino on-ramps, the
hand-rolled STORE zip, and graceful WASM degradation. The round-trip is the live 4th parity
gate; new forces flow through it for free because metrics are JSON-embedded and re-derived.

Two concrete asks: (1) **stamp `params.json` with a schema/coreVersion** so an old bundle
never silently compares a stale metric vector; (2) per-variation export is the v1 default,
with whole-series export (series.json + contact sheet) as a Phase-3 add. The bbox-only,
honestly-caveated re-import stays as-is; do **not** "improve" it to infer pitch/rotation
(that would present reconstructed-as-measured).

---

## The Benchmark Track — Ladybug-comparable, all data visible (Pillar 8)

> **The instructor's directive:** get as close to common energy-analysis tools as a zero-build
> browser tool *honestly* can, keep **all data visible**, and ship an in-tool **"Run in Rhino"
> link** for a **side-by-side comparison with Ladybug**. This **adds** a track and **reschedules**
> the roadmap — it does not replace the Force→Move→Rule spine.

**Reframing: from "honest proxy" to "checkable analysis with a visible residual."** A proxy
*asserts*; a checkable analysis *invites comparison and names its own error*. Every metric is
tiered **in data, not just UI** — each `VARIABLE_DEFS` entry gains a `tier` and `provenance`:

- **COMPARABLE** — where Ladybug *itself* uses no Radiance/EnergyPlus/CFD: incident/cumulative
  radiation (kWh/m²), direct sun hours (h), sky-view factor (%), the EPW wind rose (freq %), and
  the closed-form comfort indices. A side-by-side here is honest.
- **ESTIMATE** — first-order, never benchmarked, never in the comparable column: daylight BRE ADF
  (a number), stack flow, earth-coupling capacitance.
- **OUT OF SCOPE** — Radiance daylight (lux/DF/DA/sDA/UDI), EnergyPlus EUI, CFD wind pressure/Cp:
  taught as vocabulary + thresholds, shown at most as a raw climate readout, never a green badge.

The engine **refuses to emit a kWh/m² number unless `provenance==='measured'`** (a real EPW is
loaded). The Phase-1 "headline vs shaded" solar toggle is the *on-ramp*: the shaded number there
is exactly the one that becomes Ladybug-comparable here.

**The honesty correction this forces (loudly):** agreeing with Ladybug to a few percent proves
**method reproduction, not accuracy.** Ladybug's own Incident Radiation "uses ray intersection"
and "NO REFLECTIONS OF SOLAR ENERGY ARE INCLUDED" — we reproduce that *same* simplification, so a
row reads **"reproduces Ladybug to X%"**, never "X% accurate," with a separate, always-visible
**"gap to reality (shared with Ladybug: no multi-bounce, turbidity, spectral)"** line. The
side-by-side measures the gap to the *tool*, not to *the world*, and we say so on every row.

### The fidelity climb (per metric)

| Metric | Today | Ladybug-comparable target | How | Irreducible gap |
|---|---|---|---|---|
| Incident / cumulative solar | unitless `idx`, 15 samples, latitude-only, no self-shade in headline | **kWh/m²** (toggle W/m²) | Perez-1990 sky over a **Tregenza-145** patch dome from EPW DNI+DHI; per surface sum unblocked patches × cos-incidence + one emissive ground hemisphere; mask with the promoted raycast — **Ladybug's own method** | no interreflection (*but neither does Ladybug*); residual = discretization + Perez-vs-gendaymtx |
| Seasonal / overheat | `x` ratio of toy declination indices | **kWh/m²** per season + ratio | same sky, date-filtered to Dec/Jun bins | + monthly binning, no thermal lag |
| **Direct sun hours** *(new)* | only a 0–1 overlay | **hours** | raycast test points vs annual sun vectors (dual-ported SPA sun position) | highest-confidence; residual = sun-pos algorithm + timestep |
| **Sky-view factor** *(new)* | solid-angle proxy (sr) | **% of hemisphere** | hemispherical ray sampling | pure geometry → comparable within sampling density |
| **Comfort** *(new)* | only a ΔT knob | **UTCI °C / PMV / adaptive °C** | exact `ladybug-comfort` polynomial ports, driven by EPW dry-bulb + RH + wind | exact *given MRT*; MRT is an assumption, flagged on every row |
| Stack ventilation | `stackIndex` mislabeled `idx` (already physically m³/s) | **m³/s + ACH** | feed real EPW ΔT; divide Q by enclosed volume; relabel | single-zone steady; no wind-stack, no partitions |
| Wind | m², N proxies | **EPW wind rose (freq %)** comparable; pressure/Cp stays ESTIMATE | bin EPW dir×speed; relabel proxies "geometry, not CFD" | velocity/Cp/channelling need CFD |
| Daylight / energy | none / `glazingRatio` | **ESTIMATE only** (ADF number; teach LM-83 sDA≥300lux/50%, UDI 100–2000lux); **HDD/CDD** readout, no EUI | keep ADF, hard-lock to ESTIMATE | lux/DA/sDA need Radiance; EUI needs E+ |

### Weather in — EPW, two-stage for parity sanity

A new `web/weather.js` (dual-ported) replaces the latitude-only sun driver:

- **Stage A (JS-canonical, runs once on load, *not* in the parity compare):** zero-dependency
  parse of the EPW (read DATA PERIODS for row count / leap year — don't hardcode 8760; convert
  every missing-value sentinel to NaN *before* summing), then aggregate 8760 hours into a Perez
  sky matrix over 145 patches + a wind rose. ~1.5 MB / <100 ms.
- **Stage B (`run()`, the parity surface):** consumes only a **fixed-size** `site.climate`
  (145 annual + 12×145 monthly sky radiances, 12 monthly scalar arrays, wind rose, design +
  ground conditions). Patch directions regenerate deterministically in both engines, so only a
  few hundred radiance floats ride in the payload. **8760-row arrays never cross the parity
  surface or ride in `params.json`** — the single decision that keeps the cross-language test
  tractable.

Three honestly-tiered load paths: **(a)** drag-drop an `.epw` (`measured` — the only path that
prints kWh/m²); **(b)** ~6–8 bundled `.epw.gz` (one per Köppen zone, ~2 MB, read via the existing
hand-rolled inflate) so a student loads the **same file** into Ladybug; **(c)** lat/long →
monthly-normals or clear-sky fallback (`modeled` — never prints kWh/m², reverts to today's
labeled index). No EPW → degrade to exactly today's behavior. Field names mirror Ladybug's Import
EPW so the side-by-side is a column join; `epwSha256` is the match-guard key.

### The side-by-side harness (the "Run in Rhino" link)

Your existing export already bakes the massing on layers and ships verbatim python — *exactly
where Ladybug runs.* Three additions close the loop:

1. **In the export bundle** (the only step needing Rhino): `ladybug_compare.ghx` (Grasshopper is
   XML → zero-build/offline/diffable) + `LADYBUG_RECIPE.md` + `run-manifest.json`. The `.ghx`
   wires the baked layers (Walls+Roof+Plinth as context occluders, Apertures as analysis
   geometry) → LB Import EPW → Cumulative Sky Matrix (Tregenza-145) → Incident Radiation +
   Direct Sun Hours + Wind Rose → a fixed-schema `ladybug_results.csv`. The manifest **pins**
   patch count, north angle, ground reflectance, date range, and MRT identically to the browser run.
2. **In the browser** (client-side only — Ladybug never runs here): a **Validate** tab ingests
   that CSV, matches by `metricKey`, and shows `{ours, Ladybug, delta, %diff, tier badge,
   why-diverge}`. A **match-guard** refuses to show agreement if `epwSha256`/`geomHash` ≠ the
   loaded design (a stale CSV can't fake "validated").
3. **Discipline (non-negotiable):** **like-for-like** — ours-no-context vs LB-no-context *and*
   ours-with-context vs LB-with-context (so a missing-occlusion bug can't be tuned away by a
   compensating sky-coefficient error); **auto-tuning the sky to hit Ladybug is forbidden**;
   every row prints the residual *and* the shared "gap to reality" line. We claim "reproduces the
   cumulative radiation *integral*," not "reproduces the sky matrix." The harness itself is
   **zero parity** — UI/data over numbers core already computes; the cost lives entirely in
   promoting the *ours* column to physical units.

### All data visible

An `explain(model)` pass kept **strictly outside** `run()`'s parity-bound return (it reads
numbers back from core, never recomputes) feeds a **Data drawer**: Inputs (every param, site
field, EPW header, rule constant) → Intermediates (sun-position table, sky-matrix patch table,
per-face incidence + shaded fraction, EPW aggregates incl. recomputed 99.6/0.4% design temps) →
Outputs (each metric with its formula string and the numeric substitution). Export bundles
`inputs.csv`, `sun_positions.csv`, `sky_matrix.csv`, `per_face.csv`, `epw_aggregates.csv`,
`outputs.csv` with column names mirroring the `.ghx` dump, so a student can diff `sky_matrix.csv`
against Ladybug row-for-row. The gap is *shown*, not asserted.

### Honesty reconciliation

- **The "spend parity almost nowhere" thesis bends for one bounded, opt-in track.** The Benchmark
  Track is the single largest parity buy in the tool's history; the method spine (Phases 1–2)
  still ships first at near-zero parity cost. The Track is an advanced module, not a precondition
  for studio use.
- **Tolerance is `ABS_TOL=1e-6 / REL_TOL=1e-9`** (verified in `test/parity_check.py`; the README's
  "~1e-8" is the *observed* worst Δ, not the gate). A kWh/m² in the thousands is safe; small-valued
  metrics (sky-view fraction, near-zero winter shade, small PMV) need boundary-avoiding test points
  or tightened per-metric tolerances.
- **The load-bearing buy:** `rayHitsAny` exists only in `core.js` and only feeds the viewport
  overlay; `gable_core.py` has **no intersection code at all** (verified). Promoting it into the
  headline *and* into python — triangle-loop float accumulation matching V8↔CPython — is the
  biggest new parity liability, not a free reuse.
- **No energy/daylight number leaks** (numbers travel, labels don't): no EUI, no earth-coupling
  kWh/yr; daylight stays a labeled ESTIMATE; the Cp-by-orientation lookup is **cut** as fake
  precision that would invite a CFD comparison it loses.

---

## Pillars (the eight moving parts)

| # | Pillar | Parity cost | Addresses |
|---|---|---|---|
| 1 | **Force Deck** — forces as first-class cards (incl. honest absences like flood) | Cheap (pure UI over `site` + `VARIABLE_DEFS`) | sun, wind, terrain, views, humidity, flood |
| 2 | **Force → Move → Rule palette** — the ruleset-as-medium spine; moves auto-draft provenance-bearing clauses; conflict pairs by design | Cheap (rides `evaluateRule`; metadata inert to the Rhino evaluator) | sun, wind, terrain, views, humidity |
| 3 | **Standing-not-a-grade + per-rule read + defanged lever hints** | Cheap (UI over the `evaluation` object) | all (feedback layer) |
| 4 | **The Series** — seed-is-truth genealogy + decision cards + `coreVersion` guard | Zero parity, **not** zero engineering (rewrites the single-state hot path) | all (the series is the argument) |
| 5 | **Shading force + labeled solar-fidelity seam** — the one MVP physics buy | Expensive-but-small (closed-form, dual-ported, one parity case) | sun (rain later, shared eave geometry) |
| 6 | **Humidity buy: `es(T)` + comfort + strategy candidates** (Phase 2) | Expensive but bounded (one primitive + ~6 derived, dual-ported) | humidity, thermal comfort |
| 7 | **Viewport legibility: overlay registry + Pen-mode force annotations** | Cheap (viewport refactor over existing data) | sun, wind, views, terrain/drainage (later) |
| 8 | **Benchmark Track** — physical units (kWh/m², h, %, UTCI °C) from a real EPW + the in-tool Ladybug side-by-side, all data visible | **Largest parity buy** (raycast→python + Perez sky + EPW parser + comfort ports); opt-in, after the spine | sun, comfort, wind (rose) + the *comparison* itself |

---

## New site-forces (proxy · formula · caveat)

### Sun — overhang shading `[MVP, PARITY: small]`
- **Why:** highest payoff, lowest risk; needs no new site input; exercises orientation + a
  wall aperture + the roof + overhang at once.
- **Formula:** `alt(decl) = 90 − |latitude − decl|` (decl = +23.45 summer, −23.45 winter);
  `shaded_drop = overhangDepth · tan(alt)`;
  `shadeFraction = clamp(shaded_drop / apertureHeadHeight, 0, 1)`; E/W flag when facade
  normal is within ±45° of due E/W.
- **Caveat:** clear-sky, solar-noon, solstice geometry on the equator-facing facade only.
  Ignores diffuse/reflected light, azimuth swing, clock-vs-solar time, clouds, seasonal lag,
  glare. It is the geometric shadow line, not a heat balance.

### Humidity — psychrometric family off `es(T)` `[Phase 2, one bounded primitive]`
- **Why:** the one new force the brief names; flips the plinth's mass from asset to liability;
  one primitive unlocks the whole family.
- **Formula:** `es(T) = 6.112·exp(17.62·T/(243.12+T))` [hPa]; `e = RH/100·es(T)`;
  `Td = 243.12·ln(e/6.112)/(17.62 − ln(e/6.112))`; `W = 0.622·e/(1013.25 − e)`;
  `h = 1.006·T + W·(2501 + 1.86·T)`.
- **Caveat:** instantaneous equilibrium psychrometry at one assumed pressure, from a single
  representative RH, not an hourly weather file. Cannot tell you actual indoor moisture loads
  or condensation risk on real surfaces, or anything time-varying.

### Thermal comfort — Humidex + ASHRAE-55 adaptive band `[Phase 2, cheap given es(T)]`
- **Why:** gives the student a comfort *target* and a humid-heat scalar to rank variations;
  the adaptive band suits a free-running, unconditioned student building.
- **Formula:** `Humidex = T + 0.5555·(e − 10)`; `T_comf = 0.31·Tpma_out + 17.8`, band ±3.5
  (80%); `comfortBox = (T in band) AND (W < 0.012)`.
- **Caveat:** apparent temperature, not measured comfort; ignores air speed, radiant temp,
  clothing, metabolism, acclimatization; Humidex meaningful only above ~20 °C. The band says
  a *target* temp is plausibly comfortable, never that the building reaches it.

### Strategy gate — Givoni candidates (not a verdict) `[Phase 2, cheap]`
- **Why:** supplies the missing "read forces → name a strategy" step before geometry is
  touched, but as candidates so it never reads as an authoritative diagnosis.
- **Formula:** VENTILATE if outdoor enthalpy < indoor AND RH 30–70%; DEHUMIDIFY if `W` high
  but `T` ok; THERMAL_MASS if `diurnalRange > ~8 °C`; PASSIVE_SOLAR if design winter is cold.
  UI shows the nearest 2–3 by distance, never a single answer. Integer-coded.
- **Caveat:** rule-of-thumb thresholds (0.012 kg/kg, 30–70%, 8 °C), not site-calibrated.
  Selects a strategy *family*, never a magnitude.

### Daylight — BRE Average Daylight Factor `[later/optional, PARITY: small]`
- **Formula:** `DF% = 100·(T·Ag·θ)/(envelopeArea·(1−R²))`, T≈0.65, θ = visible-sky angle,
  R≈0.5; secondary `ADF_wfr = 0.2·glazingArea/footprint`. **Render as a number, not a floor
  gradient.**
- **Caveat:** overcast CIE-sky average and orientation-blind (pair with the solar proxy);
  says nothing about glare, direct sun, uniformity, or penetration depth; inherits the known
  double-counted `envelopeArea` — a proxy on a bug, labeled as such.

### Rain — roof shed go/no-go + wind-driven-rain `[later/optional, PARITY: small]`
- **Formula:** `shedsOK = (pitchLeft ≥ minPitch) AND (pitchRight ≥ minPitch)`, minPitch ≈ 10°
  asphalt / 14° metal / 18° shakes (butterfly/valley flagged collecting); `DRI = windSpeed·
  annualRain`; `facadeExposure = DRI·max(0, dot(n_aperture, −windFromHat))`.
- **Caveat:** threshold rules of thumb, not a drainage/structural calc; Lacy DRI is a coarse
  high/low ranking, not catch-ratio.

### Terrain — drainage direction `[later/optional, PARITY: small]`
- **Formula:** analytic gradient of the existing smoothstep ravine field;
  `drainageToRavine = dot(downslopeAz, ravineAz)`; flag when roof/ground sheds toward the drop.
- **Caveat:** slope geometry only; no rainfall volume, soil, infiltration, or stability —
  flags direction, sizes nothing.

### Views — keep the solid-angle metrics, add `tradeoffTension`
- `tradeoffTension = angularDist(equatorAz, viewTargetAz)` so the view-vs-sun conflict is
  surfaced and resolved by the student, never auto-optimized. **Caveat:** single target
  azimuth, no occlusion — orientation-toward-view, not a viewshed.

---

## Phased roadmap

### Phase 1 — The method spine (MVP)
**Goal:** make force→move→rule→series structurally enforced and shippable into a studio next
term, fully offline.
**Deliverables:** Force Deck (cards replace `renderEnvControls`; flood as honest-absence
card) · Force→Move→Rule palette auto-drafting provenance-bearing editable clauses
(`web/charter.js` + `FORCE_CATALOG`) · Charter UI (FORCE→MOVE→TEST rows, standing-not-a-grade
headline, deleted cosmetic soft bars, passive lever hints) · Series store (`web/series.js`:
seed-is-truth, fork+auto-diff, decision card, flat board + indented lineage, series-relative
normalization, `coreVersion` stamp + Recompute all, localStorage + Save/Load series) ·
Overlay registry + `paintScalarField` + Pen-mode annotations + in-canvas caveat ribbon · the
ONE new force (overhang shading, no new site input) + visible headline-vs-shaded solar label
· re-author the two example rulesets as charters · `params.json` schema/coreVersion stamp.
**Parity cost:** zero for the entire UI/series layer; ONE small parity buy (shading metrics,
dual-ported with a parity case). No server route.
**Risks:** the `app.js` single-state → array rewrite has a broad blast radius (Save/Load,
exporter, localStorage); four docks + board can overwhelm novices — sequence the reveal;
auto-drafted thresholds could read as oracles unless every constant stays named/editable;
the series/board is real bespoke engineering, not free because "parity-cheap."

### Phase 2 — The humidity buy + conflict substrate
**Goal:** add the brief-named force (humidity) and enough closed-form proxies that variations
differ for real reasons (mass-flip, roof conflict).
**Deliverables:** `es(T)` Magnus primitive + temperature-grid parity case · derived humidity
family (RH/dewpoint/W/enthalpy) + Humidex + ASHRAE-55 band + `comfortBox` · Givoni strategy
as 2–3 candidates (integer-coded) · optional daylight BRE ADF as a number + rain shed
go/no-go · shared named-constants block in both cores; new `site.climate` scalars +
sensitivity coverage · `tradeoffTension` (view vs solar) · two force-organized example
charters · **comparability wins pulled forward (need no raycast):** the dual-ported Stage-A
EPW parser (`web/weather.js`), the EPW **wind rose**, the closed-form **comfort ports**
(UTCI/PMV/ASHRAE-55 adaptive) now driven by real EPW dry-bulb/RH, and the
`stackIndex → m³/s + ACH` relabel *(these also answer the open questions on wind realism — a
rose, not one bearing — and time fidelity — hourly EPW, not snapshots)*.
**Parity cost:** expensive but bounded — one new physics primitive + the comfort/EPW ports +
~6–10 closed-form metrics, all dual-ported; ~116 → ~220–260 checked values.
**Risks:** categorical parity flips at thresholds (use boundary-avoiding test points); new
`site` scalars added before consuming metrics can trip sensitivity dead-field checks;
ADF/daylight inherit the double-counted `envelopeArea` (label it); caveat fatigue as the
metric count climbs.

### Phase 2.5 — Benchmark Track core (the physical-units climb)
**Goal:** make the COMPARABLE-tier numbers real, behind an explicit compute.
**Deliverables:** promote Möller–Trumbore (`rayHitsAny` + `massingTriangles`) into the headline
radiation/direct-sun path **and dual-port it into `gable_core.py`** (brand-new parity surface —
the load-bearing buy) · Perez sky + Tregenza-145 generator · masked **incident radiation
(kWh/m²)** + **direct sun hours (h)** + **sky-view factor (%)** · the `tier`/`provenance` gating
enforced in data. Heavy analyses run behind an explicit deterministic **"Compute analysis"**
action (not live recompute) so the force→move→rule loop stays interactive in the iframe.
**Parity cost:** the largest in the tool's history; ~300+ checked values; summation/iteration
order pinned byte-identical across engines; one shared named-constants table (patch centroids,
Perez bins, sun-position terms).
**Risks:** main-thread compute latency (may need a Web Worker — new offline complexity); float
determinism in the triangle loop (V8↔CPython); small-valued-metric tolerance fragility at `1e-6`.

### Phase 3 — Embodiment & comparison depth
**Goal:** add tactile input and structured comparison once the method is proven, without
letting the board become a flat catalog or the coach an oracle.
**Deliverables:** ranked finite-difference lever coach behind a guard ("try this next + the
trade-off it costs", debounced/scoped, never auto-applied) · Raycaster gizmos (grab the
sun/wind/view) writing the same state · parallel-coordinates with brushing + ONE Pareto
force-pair highlight; rendered genealogy DAG · deterministic parameter sweeps that populate
but never select · DRI / terrain-drainage overlays (labeled diagram-of-proxy); whole-series
Rhino export · **the Ladybug side-by-side ships here** — `ladybug_compare.ghx` + recipe +
`run-manifest.json` in the export bundle, the browser **Validate** tab with the
`epwSha256`/`geomHash` match-guard, the `explain()` **Data drawer** + multi-CSV export, and an
opt-in **Reinhart-577** discretization-demo toggle (Tregenza-145 stays the default).
**Parity cost:** mostly cheap; DRI/drainage are small dual-ported buys if pursued.
**Risks:** coach perf on the recompute loop; statistical views alien to novices (keep
optional); decorative flow overlays read as CFD/hydrology (caveat ribbon unmissable); dual
control (slider + gizmo) desync.

### Phase 4 — Ecosystem & assist (first server surface)
**Goal:** wire the sibling tools + an optional LLM assistant without ever making the offline
loop depend on a network.
**Deliverables:** shared "site forces" JSON contract; Surveyor `AnalyzeResult` → `site` via a
host↔iframe channel (degrades to standalone) · Coach handoff (export series.json as the
critique payload) · optional LLM site-reader/critic as the tool's **first Vercel route**:
the toolkit's shared AI-route pattern (Vercel Pro, 300s), 401-for-anon, server-side key, cost-logged — turns prose into scalar
site inputs and narrates strategy candidates; **never computes or validates a metric.**
**Parity cost:** zero parity, but crosses to the first gated server surface (auth/cost/timeout).
**Risks:** an LLM fabricating site inputs launders a guess through the honest pipe — frame as
a draft to verify, not measurement; the channel must not break standalone/offline operation;
scope-creep magnet — keep strictly off the critical path.

### Deferred / never-in-MVP (high risk)
- **Möller–Trumbore self-shadow occlusion INTO the parity core** — **reclassified to Phase 2.5**
  (scheduled, behind a flag, prototype-first): the instructor's Ladybug directive is exactly the
  "only if a lesson proves it central" trigger this was waiting on. `gable_core.py` has no
  intersection code today, so this remains the single biggest new parity surface.
- **Boolean-aperture area fix** (subtract glazing from host face) — only behind a flagged
  "v3 metrics" switch with a migrated curriculum.
- Both are parity-AND-curriculum migrations: they shift every existing solar/glazing
  threshold and invalidate authored rulesets mid-course.

---

## What to KEEP

- The `core.js` ↔ `gable_core.py` line-for-line parity discipline + the parity gate
  (`ABS_TOL=1e-6 / REL_TOL=1e-9`; ~116 values today, growing with the Benchmark Track) +
  sensitivity + occlusion tests — the trust spine; extend, never weaken.
- The kit of parts (plinth slab + wall tube + two-pitch roof + 4 aperture cuts on ravine
  terrain) — **no new primitive**.
- The rule engine (7 ops incl. between/outside, weight, hard, weighted score + hardPass) and
  the `flatten()`/`VARIABLE_DEFS` registration pattern — the engine is ahead of the metric set.
- `run()` as the single pure, deterministic entry point — the seam the series/coach layer
  rides for free.
- The honest-proxy chrome (proxies badge, Sources & math modal, How-to "Know the limits") —
  extended per new metric, never dressed up as simulation.
- The orthographic CAD Pen + Analysis viewport, north arrow, sun-path arcs, contours, and the
  honest self-shadow **overlay** (kept as overlay, not parity).
- The Rhino 8 / Grasshopper round-trip; zero-build / offline / local-first delivery; the
  SI-internal / feet-at-display unit boundary; the single `recompute()` write channel.

## What to CUT (from v1)

- Porting Möller–Trumbore occlusion **into parity** — deferred; achieve the cheap half via a
  visible "headline vs shaded" label.
- The finite-difference auto-coach's ranked "rotate +8°" imperative — defanged to a passive
  "which sliders move this rule" highlight; returns guarded in Phase 3.
- Raycaster direct-manipulation gizmos — out of v1.
- The LLM assistant in every form — out of v1 (first server surface; would fabricate inputs).
- Surveyor inbound + Coach outbound + host↔iframe channel — stretch only.
- Pareto scatter, 2-D sweep matrices, force-robustness sweeps, rendered DAG — reduce to a
  flat board + indented lineage first.
- The boolean-aperture area "fix" — defer (parity-AND-curriculum migration).
- The long tail of forces in v1 — keep at most ONE new force beyond shading; humidity is the
  Phase-2 buy.
- `dominantStrategy` as a single authoritative enum verdict — replace with 2–3 candidates.
- Painting daylight ADF as a floor gradient — show as a number with its caveat.
- The cosmetic dashboard "soft" bars — delete; keep only baseline + target.
- The verbose multi-clause "standing sentence" as the headline — keep it compact.

---

## Open questions for the instructor (John Clark)

1. **Grading contract** — how does a genealogy-of-forks map to an actual grade, and what
   stops a student gaming green by lowering editable thresholds or padding the lineage with
   trivial forks?
2. **Instructor authoring/audit** — do you need a path to centrally override/version the
   shipped thresholds and constants, define assignment presets, and lock certain rules per
   cohort?
3. **Name/scope — RESOLVED** ✓ keep **Eco-Architect** + publish the scope statement (see
   *Resolved decisions*). The Benchmark Track gives it a real, benchmarkable analysis spine, so
   the name no longer overclaims.
4. **Flood / erosion / slope-stability** — arguably the dominant force on a ravine-edge site,
   with no honest closed-form proxy. Foreground as an explicit "force we cannot model" card
   requiring a hand-judgment note, or handle out-of-tool?
5. **Program / use / occupancy** — should the kit carry a nominal program so ventilation
   depth, daylight reach, and mass mean something against an occupancy pattern, or stay
   deliberately program-free?
6. **Non-environmental forces** (structure/span, material, cost, constructability) — in scope
   at all, or explicitly bracketed as "not this instrument"?
7. **Conflict adjudication** — is a per-rule weight slider the right vehicle for "which force
   wins," or does it re-import aesthetic whim? Should priority be a declared, logged decision
   in the card instead?
8. **Hemisphere/latitude generality** — adopt equator-facing (latitude-sign) language to
   de-chauvinize "south sun"; how should the tropics be handled?
9. **Wind realism** — is a single prevailing bearing acceptable, or add a second seasonal
   bearing (summer breeze vs winter wind) so the admit-vs-block conflict becomes teachable?
   (cheap: `windExposure` computed twice.)
10. **Time fidelity** — thermal mass needs the diurnal cycle, but the model collapses time to
    snapshots + a single `diurnalRange` scalar — acceptable if surfaced, and how loudly?
11. **Caveat fatigue** — with ~45 metrics each carrying a "can't tell you" string, how do we
    keep caveats actually read (surface-on-first-use, rotate, require acknowledgment)?
12. **Accessibility** — the feedback channel is green/amber/red + spectral ramps and fights
    the all-text-black rule — what colorblind-safe encoding before the color language hardens?
13. **Data durability** — a localStorage-only series risks losing a semester's lineage —
    periodic export reminders, undo/history, or a cloud save?
14. **Studio-display ergonomics** — does four-dock + canvas + board fit a projector and a
    small laptop, and can two students read it together at a desk crit?

**Benchmark Track — additional open questions:**

15. **Parity-budget reorder** — is the Benchmark Track worth the largest parity buy in the
    tool's history, or does it stay a clearly opt-in advanced module so the method spine
    (Phases 1–2) reaches studio first?
16. **Compute performance** — masked incident radiation and direct-sun-hours are
    seconds-per-variation on the iframe's main thread. Is an explicit **"Compute analysis"**
    button (which breaks the live force→move→rule loop for those metrics) acceptable, or do we
    take on a Web Worker (new offline/zero-build complexity)?
17. **Who runs Ladybug?** — will students realistically install Ladybug Tools 1.x in Rhino 8 and
    run the `.ghx` themselves, or is the side-by-side an **instructor demo** (one EPW + one
    massing, published as checked-in golden values) rather than a per-student step?
18. **MRT loudness** — ship a labeled SolarCal-style MRT estimate, or require the student to type
    MRT? Either way every UTCI/PMV row is conditioned on an assumption — how loudly must that be
    surfaced so "UTCI °C" is never read as a validated comfort study?
19. **EPW bundling weight** — ~6–8 `.epw.gz` (~2 MB) + the inflate path + the modeled/clear-sky
    fallback multiply the surface the "no npm / vendored-minimal" constraint was meant to keep
    small. Acceptable, or upload-only with a single tiny bundled default city?

---

## Success criteria

- A student **cannot** create a variation without naming the governing force(s), choosing a
  move, and committing an editable rule — force→move→rule is structurally enforced.
- Every rule names its force and provenance; there is no anonymous magic number; every
  constant is named and student-editable.
- Two rules can fire and visibly **disagree** on the same design, and the student records a
  declared priority as a logged decision (not a silent weight).
- The submission is a navigable genealogy of forks, each carrying a force→move→rule→why card
  plus a closing reflection — gradeable as reasoning rather than geometry.
- `npm test` stays green after every phase: parity (`ABS_TOL=1e-6/REL_TOL=1e-9`; ~116 → ~300+ values across the Benchmark Track), sensitivity (no
  dead/NaN), occlusion; integer enums compared as ints; new constants centralized and
  identical in both cores.
- The tool runs **fully offline** from a static server with no npm install and no server
  route through Phase 3; LLM/Surveyor/Coach surfaces are optional and off the critical path.
- The headline-vs-shaded solar fidelity seam is visibly labeled; no metric anywhere is
  presented as validated simulation; daylight is shown as a number, not a faked spatial field.
- Series colors are comparable within a set and the legend states "relative to this set."
- `es(T)` is added as a single primitive with a dedicated temperature-grid parity case; the
  humidity/comfort family derives off it; the Givoni strategy is shown as 2–3 candidates.
- The flood gap and the "Eco-Architect"/energy-scope mismatch are explicitly surfaced to
  students as known limits, not hidden behind apparent completeness.
