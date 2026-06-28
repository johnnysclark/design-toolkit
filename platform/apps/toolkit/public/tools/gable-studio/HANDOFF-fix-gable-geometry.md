# Handoff prompt — make the gable-enclosed walls the CANONICAL geometry (fix pen-vs-analysis mismatch + the wrong math)

Paste everything below into a fresh session working in this repo.

---

## Your task

In **Eco-Architect** (codebase name: *Gable Studio*), the building's **walls** were recently changed to
extend up and be **clipped by the roof planes** so the massing is a **fully-enclosed gable** (gable ends
close into triangles; eave walls meet the roof underside) instead of the old open-clerestory **tube**.

**The bug:** that change was made in **only one place** — the pen-mode rendered wall meshes in
`web/viewport.js` (`buildBuilding()` → `clippedWallSlab` / `roofUnderZ`). Everything *else* still uses the
old rectangular tube:

- **Analysis mode** colors the solar grid over the **tube** (built from the unchanged metric faces), so the
  building looks enclosed in **pen** mode but **not** in **analysis** mode.
- The **performance metrics** (solar, wind, envelope area, glazing ratio, views) are computed on the **tube**
  faces, so the numbers are for the wrong shape.
- The **self-shadow occluders** + the **kWh/m² incident-radiation** use `massingTriangles()` (still the tube),
  so shadows + the Ladybug-comparable radiation are for the wrong shape.

**Goal:** make the gable-clipped wall geometry the **single source of truth** used everywhere — the render
(both pen *and* analysis), the metric faces, the occluders, and the **JS↔Python parity ports** — so the
building is enclosed in **both** display modes **and** the math reflects the gable. Keep the existing
"walls poke past the roof" warning. Keep `npm test` green.

---

## The codebase, how to run, how to test

- Tool lives in **`platform/apps/toolkit/public/tools/gable-studio/`** (work from here; call it `$GS`).
- **Zero-build static app.** Serve and open in a browser:
  ```bash
  cd "$GS" && python3 -m http.server 8000
  # V2 (the demo the user cares about): http://localhost:8000/web/v2/index.html
  # V1 (original):                      http://localhost:8000/web/index.html
  # version toggle wrapper:             http://localhost:8000/web/shell.html
  ```
- **Tests (MUST stay green):**
  ```bash
  cd "$GS" && npm test
  # = parity.mjs + parity_check.py (metrics JS↔Py) + sensitivity.mjs + occlusion.mjs
  #   + rad_ref.mjs + parity_rad.py (radiation JS↔Py)
  ```
- Live in production at `toolkit.allmeans.works/site-design`. **Do NOT push to `main`** (it auto-deploys);
  work on a feature branch and open a PR.

## Architecture & the rules you must not break

1. **One source of truth for geometry + metric math:** `web/core.js` (pure — no DOM, no three.js). Entry:
   `run(params, site, ruleset) → { model, metrics, vars, evaluation }`. `python/gable_core.py` is a
   **line-for-line port** of it. `web/radiation.js` (Tregenza-145 occluded incident radiation, kWh/m²) is
   ported to `python/radiation.py`. **Edit JS → edit the Python twin.** `npm test` proves they agree
   (`ABS_TOL=1e-6 / REL_TOL=1e-9`; observed Δ ~1e-14).
2. **SI internal.** core.js computes in **metres/SI** so parity + the Rhino export stay valid. Imperial
   (feet-and-inches) is a **display-only** layer in `web/v2/units.js` — do not change the SI engine's units.
3. **V1 and V2 share** `web/core.js` and `web/viewport.js`. V1 = `web/` (`app.js`, `ui.js`). V2 = `web/v2/`
   (`app2.js`, `forces.js`, `series.js`, `weather.js`, `sky.js`, `compare.js`, `units.js`). Your geometry
   change is shared, so **verify both V1 and V2 still render**.
4. **Honest proxies** — metrics are simplified, transparent, labeled as proxies. Keep that framing.
5. Zero-build / offline (three.js is vendored in `web/vendor/`; no `npm install` for the app itself).

## The kit of parts (the fixed prototypical form)

Three independent plan rectangles, each with its own centre `(cx,cy)`, width `W`, length `L`, rotation `R`:
**Plinth** slab (thickness `t`), **Walls** tube (height `h`, wall thickness `wt`), **Roof** = overhanging
plane with one ridge + two independent pitches (`pitchL` for the −X slope, `pitchR` for the +X slope; gable /
shed / butterfly), plus `ridgeRise`, `ridgePos`, thickness `t`. Plus 4 aperture cuts. Coords: **+X East,
+Y North, +Z Up**, degrees, floor (plinth top) `z=0`. The roof ridge runs along **local Y**; the roof slopes
in **local X**. So the **gable-end walls are the ±Y faces** (`wall_py`/`wall_ny`); the **eave walls are the
±X faces** (`wall_px`/`wall_nx`).

## The target geometry (precise)

Each wall = its plan rectangle (the thin tube slab from `buildFrames`) extruded from `z=0` **up to the
underside of the roof slab**, clipped by the two roof planes. The roof-plane underside height at any world
`(x,y)` (already worked out — currently in `web/viewport.js`):

```js
// tanL = tan(pitchL·π/180), tanR = tan(pitchR·π/180); roofGeom has {zRidge, ridgeX}
roofUnderZ(wx, wy):
  a  = rotZ([wx, wy, 0], -north)                       // undo site north
  rl = rotZ([a[0]-roof.cx, a[1]-roof.cy, 0], -roof.R)  // into the roof's own frame
  slope = rl[0] <= roofGeom.ridgeX ? tanL : tanR
  topZ  = rl[0] <= ridgeX ? zRidge - (ridgeX - rl[0])*slope
                          : zRidge - (rl[0] - ridgeX)*slope
  return topZ - roof.t * sqrt(1 + slope*slope)          // slab underside (along the roof normal)
```

- **Eave walls (±X):** roof height is ~constant along their run → near-flat top.
- **Gable-end walls (±Y):** they cross the ridge → top is a triangle/pentagon peaking at the ridge. For a
  **crisp ridge**, insert the exact ridge-crossing vertex (solve `roof-local-x = ridgeX` along each wall
  edge — it's affine in world position, so linear in the edge parameter). The current render uses a fixed
  `NSAMP=64` sampled clip (slightly rounds the ridge); prefer the exact ridge vertex, but whichever you
  choose **must be identical in JS `core.js` and Python `radiation.py`** for parity.
- **Precondition (already enforced):** the wall footprint must sit inside the roof footprint, else it can't
  be enclosed. The warning for this already exists (keep it — see below).

## What to change (and keep mutually consistent)

**Recommended approach: add ONE canonical wall-geometry function in `core.js`** (e.g.
`wallSolids(model) → per-wall { triangles, area, centroid, eaveHeight }`) and have the metric faces, the
occluders, the renderer, and the Python ports all consume it. Then a single definition can't drift between
render / analysis / metrics again.

1. **`web/core.js`**
   - Add `tanL`/`tanR` (and any needed terms) to `roofGeom` in `buildFrames`, plus a `roofUnderZ`-style
     helper.
   - **Metric faces (`buildFrames`)**: each wall face's `area` must become the **clipped** area; set
     `c` (centre) to the clipped centroid. The face **normal is unchanged**. For **aperture placement**,
     `buildApertures` uses `faceWidth`/`faceHeight` — keep openings inside the solid wall (recommend
     `faceHeight = the wall's eave/min clip height`, i.e. the guaranteed-rectangular lower zone). Document
     the choice. (Compute the gable area exactly: trapezoid/pentagon = ∫ roofUnderZ over the wall width.)
   - **`massingTriangles()`**: build the wall occluders as the **clipped** prisms (matching the render).
     This feeds `sampleSolarGrid` (analysis self-shadow) **and** `web/radiation.js`.
2. **`python/gable_core.py`**: port the `build_frames` changes (clipped area / centroid / faceHeight) line
   for line. (Run `npm run parity` to check.)
3. **`python/radiation.py`**: port the `massing_triangles` changes line for line. (It currently has its own
   `massing_triangles` + `ray_hits_any`; keep them matching `core.js`.) Run `node test/rad_ref.mjs &&
   python3 test/parity_rad.py`.
4. **`web/viewport.js`**
   - Pen render (`buildBuilding`) already draws the gable (`clippedWallSlab`) — refactor to derive from the
     canonical core geometry so render == occluders == metrics (or at minimum keep it identical to
     `massingTriangles`).
   - **Analysis cells** (`analysisCells`, built via `gridCellsInto(face, …)` from `model.walls`) — this is
     the visible half of the bug. Regenerate them over the **clipped** wall surface so analysis mode colors
     the whole gable (including the triangular infill), not just the tube.
5. **Regenerate parity fixtures + run the full suite:**
   ```bash
   cd "$GS" && node test/parity.mjs && python3 test/parity_check.py \
     && node test/sensitivity.mjs && node test/occlusion.mjs \
     && node test/rad_ref.mjs && python3 test/parity_rad.py
   ```
   All must pass. (`test/_parity.json` and `test/_rad_parity.json` are JS-generated references; they will
   legitimately change because the geometry changed.)
6. **Re-check the two example rulesets** `web/rulesets/passive-solar-shed.json` and
   `earth-coupled-retreat.json` — their thresholds are tuned to the *old* metric values and will shift with
   the new wall areas. They're meant to "start partly red." Sanity-check they're still pedagogically
   reasonable; adjust if needed.
7. **Keep the existing warning** (don't remove): `web/v2/app2.js` → `wallsOverRoof()` + `updateWarning()`.
   It enforces the walls-⊆-roof precondition that makes the clip clean.
8. **V2 imperial display** (`web/v2/units.js`) already converts lengths→feet-inches, areas→ft²; verify the
   new metric magnitudes still display sensibly.

## Key file/function map (current state)

- `web/core.js`: `buildFrames` (~L83, the wall faces + `roofGeom`), `plinthFaces`, `buildApertures`,
  `computeMetrics` (~L197, uses `faces[].area`/`.n` for solar/wind/envelope), `massingTriangles` (~L362),
  `rayHitsAny`, `sampleSolarGrid`.
- `python/gable_core.py`: `build_frames`, `compute_metrics` (line-for-line mirror). `python/radiation.py`:
  `massing_triangles`, `ray_hits_any`, `incident_by_model` (mirror of `web/radiation.js`).
- `web/viewport.js`: `buildBuilding()` → `roofUnderZ` + `clippedWallSlab` (current gable render),
  `gridCellsInto` (analysis cells), `applyDisplay` (pen vs analysis), `sampleSolarGrid`.
- `web/v2/app2.js`: `wallsOverRoof()`, `updateWarning()` (the warning — keep).
- Tests: `test/parity.mjs`+`test/parity_check.py`, `test/rad_ref.mjs`+`test/parity_rad.py`,
  `test/sensitivity.mjs`, `test/occlusion.mjs`.

## Verification (do all)

1. `npm test` — green (metrics parity, sensitivity, occlusion, radiation parity).
2. **Render in BOTH modes.** Headless software-WebGL works in Chrome:
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-sandbox \
     --use-gl=egl --enable-unsafe-swiftshader --window-size=1400,950 --virtual-time-budget=9000 \
     --screenshot=/tmp/v2.png "http://localhost:8000/web/v2/index.html"
   ```
   Screenshot V2 in **pen** mode and **analysis** mode → the building is **enclosed (gable) in both**, and
   analysis-mode solar coloring covers the gable walls **including the triangular infill**.
3. The overflow **warning** still fires when the room footprint exceeds the roof (e.g. set `walls.W` large).
4. **V1 still renders** (shared `viewport.js`).
5. Sanity-check the metrics moved the right way (e.g. `envelopeArea` and gable-end wall solar **increase**
   vs the old tube, because the gable triangles are now real wall area).

## Acceptance criteria

- The building is enclosed (gable) in **both pen and analysis** modes; analysis solar covers the gable infill.
- `computeMetrics` (solar/wind/envelope/glazing/views) is computed on the **clipped gable** geometry, and the
  JS↔Python metric parity is **green**.
- `massingTriangles` (occluders) is the **clipped gable**, the self-shadow analysis grid + the kWh/m²
  radiation reflect it, and the **radiation parity is green**.
- Apertures stay valid on the gable walls (no opening floats above the roofline).
- The "walls past the roof" warning still works; V1 still renders; `npm test` fully green.
- The geometry is defined **once** (single source of truth) so render / analysis / metrics / occluders can't
  drift apart again.

## Notes

- The current viewport-only gable code is the right *shape* — reuse `roofUnderZ` + the clip approach; the job
  is to promote it into `core.js` (+ ports) and the analysis-cell path, not to redo the math.
- Float determinism: the tube `massingTriangles` already parity-passes at ~1e-14; the clipped version uses
  the same `sin/cos/sqrt/rotZ` ops, so it should too — but **regenerate and run `parity_rad.py`**; place any
  discrete/boundary cases away from grazing angles.
- Work on a branch (e.g. `feat/eco-architect-gable-geometry-canonical`); open a PR; don't merge to `main`
  without the user's OK.
