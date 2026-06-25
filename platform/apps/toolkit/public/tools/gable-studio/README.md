# Gable Studio

**A full-loop design tool: shape a massing → watch the performance _data_ move →
encode your intent as testable _rules_ → export those same rules as Rhino 8 +
Grasshopper python → model in Rhino → re-import and re-test.**

The pedagogical bet (same as the studio's): tighten the connection between **data
literacy** and **design experimentation** at the very start of a project. A
student watches numbers respond to form, decides which numbers _matter_, writes
those down as constraints, and carries the exact same constraints into Rhino. The
browser and Rhino agree **by construction** (one shared maths core, proven by a
parity test), so the data is something to reason with, not a black box to trust.

> **Status:** ✅ prototype, verified end-to-end (browser core ↔ python core parity
> over 116 metric values; export bundle runs standalone; baked `.3dm` re-imports
> with correct dimensions). Metrics are **simplified, transparent proxies — not
> validated simulation.** Teach them that way; that honesty _is_ the lesson.

---

## The form (v2): three independent rectangles

Three plan rectangles, each with its own centre `(cx,cy)`, width, length and
rotation — so **each can overhang the others**:

1. **Plinth** — a floating floor **slab** (thickness `t`). The only floor.
2. **Walls** — a rectangular **tube** (height `h`, wall thickness `wt`). No floor, no ceiling.
3. **Roof** — the **overhanging** plane: one ridge with **two independent pitch
   angles** (`pitchL`, `pitchR`) so it can be a gable, a shed, or a **butterfly**;
   plus ridge rise, ridge shift, and thickness.

Plus **4 aperture cuts** (3 wall + 1 roof). The ground is a **ravine-edge
topography** (the plinth can perch above it or bed into it). Coordinates: **+X
East, +Y North, +Z Up**, metres, degrees; floor (plinth top) is the datum `z = 0`.

### Parameters
| Group | Params |
|---|---|
| Plinth | centre `cx,cy`, width `W`, length `L`, rotation `R`, thickness `t` |
| Walls | centre `cx,cy`, `W`, `L`, rotation `R`, height `h`, wall thickness `wt` |
| Roof | centre `cx,cy`, `W`, `L`, rotation `R`, ridge rise, **pitch L**, **pitch R**, ridge shift, thickness |
| Each aperture | host (N/S/E/W wall or roof slope L/R), `u,v` position, `w,h` size |
| Site | latitude, north angle, wind (from-az + speed), ΔT, view azimuth, eye height |
| Terrain | ground level, ravine depth, ravine edge, ravine slope width, ravine direction, undulation |
| Display | **Pen / Analysis** mode, **shadow intensity**, **sun hour** |

---

## Run it locally (zero build, offline-friendly)

`three.js` is **vendored** in `web/vendor/` so the viewport works without any
network. `rhino3dm` (only for optional `.3dm` import) lazy-loads from a CDN; if
that's blocked, everything else still works. You just need a static server because
ES modules don't load over `file://`.

```bash
cd TOOLS/gable-studio
python3 -m http.server 8000      # or:  npm run serve
# open  http://localhost:8000/web/
```

No `npm install`. (`package.json` exists only so Node treats `core.js` as ESM for
the parity test.)

## Two looks
- **Pen mode** (default) — a white-paper **hidden-line** drawing (white faces
  occlude the black edges behind them) with **crisp cast shadows** on the ravine
  terrain (with contour lines). Drag **shadow intensity** and **sun hour**.
- **Analysis mode** — **Ladybug-style** colouring with a numeric legend (min–max)
  and a live overlay selector:
  - **Solar — sun now / yearly** paint a **fine analysis grid** over the walls,
    roof and plinth, **with self-shadowing** (ray-cast against the massing) — so
    extending the **roof overhang** visibly darkens the band it shades on the wall
    below, and the grid updates as you drag **sun hour** or move latitude (it
    matches the cast shadow). Day-arc sun paths show the track.
  - **Wind — windward** colours faces hot (windward) → cold (leeward) with
    **wind-direction arrows** that scale with speed and swing with the azimuth.
  Toggle the mode with the **◫ / ☀** button.

## Toolbar extras
- **📍 Location** — click an OpenStreetMap basemap to set **latitude & longitude**
  (the solar proxy uses latitude; the map tiles need internet, the rest doesn't).
- **ⓘ Sources & math** — every metric's formula, assumptions, and citations, so
  students can see exactly where each number comes from (and that they're proxies).

---

## The 5-minute classroom walkthrough
1. **Move a slider.** Drag a roof **pitch** to negative on both sides → a
   butterfly roof; nudge the **plinth** centre so the slab overhangs the walls.
   Every number on the right updates live.
2. **See the data.** Hit **☀ Analysis mode** — the envelope colours by yearly sun;
   the south wall glows. Back in **Pen mode**, raise **shadow intensity** to read
   the massing as a crisp line drawing.
3. **Load an intent.** Pick **Example rules → Earth-coupled retreat**. It starts
   mostly red — hard rules (`buriedFraction ≥ 0.5`, `windExposure ≤ 45`) fail.
4. **Design toward it.** Thicken the **plinth** (or raise **ground level**) to bed
   it into the terrain; rotate the **walls** to turn the short face into the wind.
   Watch dots flip green and the score climb.
5. **Write your own rule.** `+ add rule` → e.g. `glazingRatio ≥ 0.04`, mark it hard.
6. **Export & cross-check.** **⤓ Export** → unzip → `python3 run_rhino3dm.py`:
   it prints the metrics, a **parity self-test** vs the browser, your rule table,
   and writes `gable.3dm`. Paste `run_rhinocommon.py` into the **Rhino 8
   ScriptEditor** to build it on tidy layers.
7. **Close the loop.** **⤒ Import .3dm** the baked file → the tool recovers the
   footprints + heights and re-tests.

---

## The performance proxies (what each number means — and doesn't)
Pure, deterministic functions of params + site, identical in JS and python.

| Metric | Proxy model | Can't tell you |
|---|---|---|
| `solarWinterUseful` / `solarSummerUseful` / `solarUseful` | aperture area × incidence over 15 sampled sun positions (3 seasons × 5 hours) | clouds, diffuse light, interior distribution |
| `solarSouth` / `overheatRatio` | south-facing useful gain / summer÷winter | actual loads |
| `solarEnvelope` | same over the whole envelope | self-shading (no ray cast yet) |
| `windExposure` / `windPressure` | windward projected area / ½ρV²·area | turbulence, real Cp |
| `channelIndex` | plan throat ratio between walls & plinth across the wind | true CFD venturi |
| `stackIndex` / `stackHeight` | `Cd·A*·√(2gΔz·ΔT/T)`, inlets low / outlets high | wind-driven cross-vent |
| `viewQuality` / `viewAmount` / `skyView` | aperture solid angle from an eye point, weighted to a target azimuth | obstructions, the actual view |
| `soilContactArea` / `thermalMassRatio` / `buriedFraction` | plinth area below the **terrain** + slab mass ÷ enclosed volume | soil type, transient heat flow |
| plus | `enclosedVolume`, `envelopeArea`, `glazingRatio`, `surfaceToVolume`, `pitchDeg`, `ridgeHeight`, `footprint` | — |

A rule is one line: `{ lhs, op (< <= > >= == between outside), rhs, weight, hard }`.
Hard rules must all pass; the score is the weighted fraction that pass.

---

## Rhino 8 / Grasshopper export

**⤓ Export** downloads `gable-studio-export.zip`: `params.json` (params + site +
the **browser-computed metrics** for the self-test), `ruleset.json`, and:

| File | Use |
|---|---|
| `gable.3dm` | the massing as **native Rhino geometry**, baked in the browser (`rhino3dm` WASM) on `Plinth/Walls/Roof/Apertures` layers — open it straight in Rhino. Present unless `rhino3dm` is blocked, in which case `run_rhino3dm.py` regenerates it. |
| `gable_core.py` | shared geometry + metric maths (no Rhino needed) |
| `run_rhino3dm.py` | plain `python3` — recompute, **parity self-test**, rule table, (re)writes `gable.3dm` |
| `run_rhinocommon.py` | paste into **Rhino 8 ScriptEditor** — builds + bakes on tidy layers |
| `gh_component.py` | paste into a **Grasshopper Script (python 3)** component — geometry + metrics + pass/fail |

**Layer convention** (so the web app can re-import): `Plinth`, `Walls`, `Roof`,
`Apertures`, `Report`. `run_rhino3dm.py`'s bake needs `pip install rhino3dm`; the
analysis + rules + parity test run with the standard library alone.

## `.3dm` import (closing the loop)
**⤒ Import .3dm** reads the file in-browser (`rhino3dm` WASM). Convention mode
finds `Plinth` / `Walls` / `Roof` layers, measures bounding boxes, recovers the
footprints + heights, and re-tests (rotations/pitches assumed 0 by the bbox
method). Generic mode reports a measured read.

---

## Architecture — one source of truth
`web/core.js` is the **only** place geometry, the metric formulas, the terrain,
and rule evaluation live. The viewport renders from it, the dashboard and rules
constrain on it, and `python/gable_core.py` is a line-for-line port. The parity
test proves they agree:

```bash
npm run parity     # 116 metric values across rotated / butterfly / buried / asymmetric cases; worst Δ ~1e-8
```

If you change a formula in `core.js`, change it in `gable_core.py` too.

```
web/   core.js (shared maths) · viewport.js (pen + analysis) · ui.js · exporter.js ·
       zip.js · rhinoImport.js · app.js · index.html · styles.css · vendor/ (three.js) · rulesets/
python/ gable_core.py (port) · run_rhino3dm.py · run_rhinocommon.py · gh_component.py · *.example.json
test/  parity.mjs · parity_check.py
```

---

## Limitations & honest edges
- Proxies, not simulation. A green score means "it satisfies the rule I wrote," not "it performs."
- Apertures render as inset panels (no CSG boolean); metrics use aperture area/orientation analytically.
- Gable ends are left open (clerestory look) since walls and roof are independent rectangles.
- The **analysis overlay** self-shadows (ray-cast), but the **headline metric numbers** (`solarUseful` etc.) are still whole-face proxies that ignore self-shading — so the colours can show an overhang's shadow before the single number does.
- `.3dm` import recovers footprints/heights, not rotations or roof pitches (bbox method).
- The solar proxy uses **latitude** only (local solar time assumed); longitude is recorded but doesn't change the numbers. Map tiles need internet (clicking still works offline).
- Checked by tests: every metric responds to parameter changes (`test/sensitivity.mjs`, 29/29), JS↔python parity (`test/parity_check.py`), and the overhang actually shades the walls (`test/occlusion.mjs`). Run all with `npm test`.

## Stretch (next)
Self-shading ray casts · a real `.gh` definition / cluster · a parameter-sweep
explorer with a CSV of the design space + a Pareto view · animated sun path.

---

## Appendix — the build prompt
The brief this tool was built from lives in [`PROMPT.md`](PROMPT.md).
