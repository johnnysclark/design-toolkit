# Build prompt — "Gable Studio"

Hand this to a fresh coding session to (re)build or extend the tool. It reflects
the decisions already made: **4 apertures (3 wall + 1 roof)**, **Rhino 8 + Grasshopper
(python 3)** targets, **local-first / zero-build** (three.js vendored, a hand-rolled
zip, `rhino3dm` lazy-loaded), metres/degrees, metrics as transparent proxies.

---

## Role & goal
Build a runnable local prototype for an architecture class. Purpose: tighten the
connection between **data literacy** and **design experimentation** at the start of
a project. Students manipulate a simple massing, SEE live performance data, encode
their intent as testable RULES, EXPORT those exact rules + geometry as Rhino 8 /
Grasshopper python, model in Rhino, and re-IMPORT to re-test. A full loop:
design → analyze → constrain → export → Rhino → re-import → re-test. MVP first,
then iterate; make sensible defaults rather than stopping to ask.

## Fixed prototypical form (v2)
Three INDEPENDENT plan rectangles (each its own centre/size/rotation, each can
overhang the others) + aperture cuts, `+X East / +Y North / +Z Up`, metres,
degrees, azimuth cw from North, floor (plinth top) at `z=0`:
1. **Plinth** — a floating floor SLAB (thickness `t`). The only floor.
2. **Walls** — a rectangular TUBE (height `h`, wall thickness `wt`). No floor/ceiling.
3. **Roof** — the OVERHANGING plane: one ridge with TWO independent pitch angles
   (`pitchL`, `pitchR`) → gable / shed / **butterfly**; plus ridge rise, ridge
   shift, thickness.
4. **Apertures** — **4 cutting volumes: 3 walls + 1 roof.**
The ground is a **ravine-edge topography** (plinth can perch above or bed into it).

## Parameters
- Plinth: `cx, cy, W, L, R, t`.
- Walls: `cx, cy, W, L, R, h, wt`.
- Roof: `cx, cy, W, L, R, ridgeRise, pitchL, pitchR, ridgePos, t`.
- Each aperture: host (N/S/E/W wall or roof slope L/R), `u,v` (0..1 on face), `w,h`.
- Site: latitude, north angle, prevailing wind (from-azimuth + speed), ΔT, view azimuth, eye height.
- Terrain: ground level, ravine depth/edge/slope-width/direction, undulation.
- Display: Pen / Analysis mode, shadow intensity, sun hour.

## Analyzer — metrics (pure, deterministic, identical in JS and python)
Simplified PEDAGOGICAL PROXIES, not validated simulation (label them so). Each a
pure function of params+site; expose per-face/per-aperture breakdowns.
- **Solar**: aperture/face area × incidence over sampled sun positions (3 seasons ×
  5 hours) at latitude; report winter/summer/yearly useful gain, south gain,
  whole-envelope gain, overheating ratio (summer÷winter).
- **Wind**: windward projected area (exposure); ½ρV²·exposure (load proxy); a plan
  "channelling" throat ratio between room and plinth across the wind.
- **Stack ventilation**: inlets low / outlets high (roof = outlet); effective area
  `A* = 1/√(1/Ain²+1/Aout²)`; `Cd·A*·√(2g·Δz·ΔT/T)`; report index + stack height.
- **Views**: aperture solid angle from an interior eye point, weighted toward a
  target azimuth; plus sky view via the roof aperture.
- **Earth coupling / thermal mass**: below-grade soil-contact area, plinth mass
  volume, thermal-mass ÷ room-volume ratio, buried fraction.
- **Derived**: enclosed volume, envelope area, glazing ratio, surface:volume, pitch,
  ridge height, footprint.

## Constraint / rule builder (the heart)
Rule over any param OR metric: `{ id, label, lhs, op, rhs, weight, hard }`,
`op ∈ < <= > >= == between outside`. Evaluation = per-rule pass/fail + margin, an
overall pass (all `hard` satisfied), and a weighted score. Save/load rulesets as
JSON; ship 2 examples ("Passive solar shed", "Earth-coupled retreat") tuned to
start partly red so they're actionable.

## Web interface (forward-facing, local)
- Center: live 3D viewport (three.js). Two looks: PEN (white-paper hidden-line
  drawing — white faces occlude rear black edges — with crisp cast shadows on a
  ravine-edge terrain with contour lines; sliders for shadow intensity + sun hour)
  and ANALYSIS (Ladybug-style spectral colouring of the envelope by yearly solar,
  with a legend + day-arc sun paths).
- Left: grouped parameter sliders + aperture controls.
- Right: live metrics dashboard (numbers + bars) and the rule builder with
  green/red dots + overall score.
- Top: site inputs, save/load design, save/load rules, example rules, export, import .3dm.
- Everything updates in real time; "proxies" labelled honestly.

## Rhino 8 / Grasshopper export
Download a zip with `params.json` (params+site+**browser metrics** for a parity
self-test), `ruleset.json`, and **shipped-as-is** python (no string codegen):
`gable_core.py` (shared maths), `run_rhino3dm.py` (plain python: recompute,
self-test, rule table, write `.3dm`), `run_rhinocommon.py` (Rhino 8 ScriptEditor:
build + bake on layers), `gh_component.py` (GHPython/Script component). The python
metric/geometry maths must be a faithful port of the JS; each script self-tests its
numbers against `params.json` within tolerance. Bake on layers
`Plinth/Room/Roof/Apertures/Ridge/Report`.

## .3dm import (close the loop)
Read uploaded `.3dm` in-browser (`rhino3dm` WASM). Convention mode: read
Plinth/Room/Roof layers, measure bounding boxes, recover params, re-test. Generic
mode: report a measured read.

## Architecture (do this or parity breaks)
ALL geometry + metric formulas live once in a pure, dependency-free `core.js`
(no DOM/three): `(params, site) → { model, metrics }`. The viewport renders from
it, the evaluator constrains on it, `python/gable_core.py` is a line-for-line port,
and a `test/` parity check proves JS and python agree across rotated/buried/offset
cases. Change one, change both.

## Tech / setup
Zero-build static app served by any static server (`python3 -m http.server`,
open `/web/`). VENDOR three.js locally (offline-friendly); hand-roll a tiny
STORE-only zip writer (no JSZip); lazy-load `rhino3dm` from CDN so a blocked CDN
never breaks the app. No `npm install` required for the app.

## Acceptance
- Runs from the documented steps; defaults look like a believable little building.
- Any slider updates geometry + metrics + rule pass/fail live.
- A rule on a metric flips red↔green while dragging a slider.
- Export → `python3 run_rhino3dm.py` prints metrics matching the browser (self-test)
  + the rule table, and writes a `.3dm`.
- That `.3dm` re-imports and reproduces the dimensions/metrics.

## Stretch
Self-shading ray casts · real `.gh` definition/cluster · parameter-sweep explorer
with CSV + Pareto view · animated sun path · mobile layout.
