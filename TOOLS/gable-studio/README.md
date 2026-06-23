# Gable Studio

**A full-loop design tool: shape a massing → watch the performance _data_ move →
encode your intent as testable _rules_ → export those same rules as Rhino 8 +
Grasshopper python → model in Rhino → re-import and re-test.**

The pedagogical bet (same as the studio's): tighten the connection between **data
literacy** and **design experimentation** at the very start of a project. A
student isn't handed a verdict — they watch numbers respond to form, decide which
numbers _matter_, write those down as constraints, and carry the exact same
constraints into Rhino. The browser and Rhino agree **by construction** (one
shared maths core, proven by a parity test), so the data is something to reason
with, not a black box to trust.

> **Status:** ✅ prototype, built and verified end-to-end (browser core ↔ python
> core parity, export bundle runs standalone, baked `.3dm` re-imports cleanly).
> Metrics are deliberately **simplified, transparent proxies — not validated
> simulation.** Teach them that way; that honesty _is_ the lesson.

---

## The prototypical form (everyone starts here)

Three nested rectangular masses + four aperture cuts:

1. **Plinth** — a rectangular platform/box; can be bedded into soil.
2. **Room** — a rectangular box on the plinth (the enclosed volume, four walls).
3. **Gable roof** — a single-ridge folded plane: two pitched planes meeting at one ridge.
4. **Apertures** — four cutting volumes: **3 in walls + 1 in the roof**.

Coordinates: **+X East, +Y North, +Z Up**, metres, degrees. Azimuth is measured
clockwise from North. Building base sits at `z = 0`; grade/soil rises to `z = e`.

### Parameters a student controls
| Group | Params |
|---|---|
| Plinth | width `Wp`, depth `Dp`, height `Hp`, Z-rotation `Rp`, soil/burial depth `e` |
| Room | width `Wr`, depth `Dr`, wall height `Hr`, Z-rotation `Rr`, plan offset `cx,cy` |
| Roof | width `Wroof`, depth `Droof`, ridge rise `Hg`, ridge Z-rotation `Rg` |
| Each aperture | host face (`N/S/E/W` wall or roof slope `A/B`), `u,v` position, `w,h` size |
| Site | latitude, north angle, prevailing wind (from-azimuth + speed), ΔT, view azimuth, eye height |

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

That's it — no `npm install`. (`package.json` exists only so Node treats
`core.js` as ESM for the parity test.)

---

## The 5-minute classroom walkthrough

1. **Move a slider.** Drag `Hg` (ridge rise) or the South aperture's `w`. Every
   number on the right updates live. Hit **☀ Solar heatmap** — warmer faces gain
   more sun across the year. *Point:* form ⇄ data, instantly.
2. **Load an intent.** Pick **Example rules → Earth-coupled retreat**. It starts
   ~25% with red dots — hard rules (`buriedFraction ≥ 0.5`, `windExposure ≤ 45`)
   fail. *Point:* a design brief written as testable constraints.
3. **Design toward it.** Raise `e` to bury the plinth, rotate `Rr` to turn the
   short face into the wind, shrink a window. Watch dots flip green and the score
   climb. *Point:* experimentation _is_ the analysis.
4. **Write your own rule.** `+ add rule` → e.g. `solarSouth ≥ 2.2`, mark it
   **hard**. *Point:* the student, not the tool, decides what's good.
5. **Export & cross-check.** **⤓ Export Rhino/GH scripts** → unzip → `python3
   run_rhino3dm.py`. It prints the metrics, a **parity self-test** vs the browser,
   and your rule table — then writes `gable.3dm`. Paste `run_rhinocommon.py` into
   the **Rhino 8 ScriptEditor** to build it on tidy layers. *Point:* the
   constraint travels with the geometry into CAD, unchanged.
6. **Close the loop.** **⤒ Import .3dm** the file Rhino baked → the tool recovers
   the dimensions and re-tests. *Point:* design ↔ data is a loop, not a handoff.

---

## The performance proxies (what each number means — and doesn't)

All are pure, deterministic functions of params + site, identical in JS and python.
They are **proxies for reasoning**, not engineering results.

| Metric | Proxy model | What it can't tell you |
|---|---|---|
| `solarWinterUseful` / `solarSummerUseful` / `solarUseful` | aperture area × incidence over 15 sampled sun positions (3 seasons × 5 hours) at your latitude | real sky/cloud, diffuse light, interior distribution |
| `solarSouth` | useful gain through apertures facing 135–225° | — |
| `overheatRatio` | summer ÷ winter useful gain (want low) | actual cooling loads |
| `solarEnvelope` | same, over the whole envelope | self-shading (no ray cast yet) |
| `windExposure` | windward projected area (Σ A·max(0, n·windFrom)) | turbulence, real Cp |
| `windPressure` | ½ρV²·exposure | gust/dynamic effects |
| `channelIndex` | plan throat ratio between room & plinth across the wind | true CFD venturi |
| `stackIndex` / `stackHeight` | `Cd·A*·√(2gΔz·ΔT/T)`, inlets low / outlets high (roof = outlet) | wind-driven cross ventilation |
| `viewQuality` / `viewAmount` / `skyView` | aperture solid angle from an eye point, weighted toward a target azimuth | obstructions, what's actually out there |
| `soilContactArea` / `thermalMassRatio` / `buriedFraction` | below-grade area + plinth mass ÷ room volume | soil type, real transient heat flow |
| plus | `enclosedVolume`, `envelopeArea`, `glazingRatio`, `surfaceToVolume`, `pitchDeg`, `ridgeHeight`, `footprint` | — |

A rule is one line: `{ lhs: <variable>, op: < <= > >= == between outside, rhs, weight, hard }`.
`hard` rules must all pass; the score is the weighted fraction that pass.

---

## Rhino 8 / Grasshopper export

**⤓ Export** downloads `gable-studio-export.zip`:

| File | Use |
|---|---|
| `params.json` | your params + site + the **browser-computed metrics** (for the self-test) |
| `ruleset.json` | your rules |
| `gable_core.py` | the shared geometry + metric maths (no Rhino needed) |
| `run_rhino3dm.py` | plain `python3` — recompute, **parity self-test**, rule table, writes `gable.3dm` |
| `run_rhinocommon.py` | paste into **Rhino 8 ScriptEditor** — builds + bakes on tidy layers, labels the score |
| `gh_component.py` | paste into a **Grasshopper Script (python 3)** component — outputs geometry + metrics + pass/fail |

**Layer convention** (so the web app can re-import): `Plinth`, `Room`, `Roof`,
`Apertures`, `Ridge`, `Report`. The exporters bake to exactly these names.

`run_rhino3dm.py`'s geometry bake needs `pip install rhino3dm`; the analysis +
rules + parity test run with the standard library alone.

## `.3dm` import (closing the loop)

**⤒ Import .3dm** reads the file in-browser (`rhino3dm` WASM):

- **Convention mode** — finds `Plinth` / `Room` / `Roof` layers (what the
  exporters bake), measures bounding boxes, recovers the dimensions, and re-tests.
  (Rotations/north are assumed 0 by the bbox method — the point is the round-trip.)
- **Generic mode** — otherwise reports a measured read of the objects/layers so
  the student still gets a response.

---

## Architecture — one source of truth

`web/core.js` is the **only** place geometry construction, the metric formulas,
and rule evaluation live. The viewport renders from it, the dashboard and rules
constrain on it, and `python/gable_core.py` is a line-for-line port of it. The
parity test proves they agree:

```bash
npm run parity          # node test/parity.mjs && python3 test/parity_check.py
# checks ~100 metric values across rotated / buried / offset cases; worst Δ ~1e-8
```

If you change a formula in `core.js`, change it in `gable_core.py` too — the
parity test will fail until you do.

```
web/   core.js (shared maths) · viewport.js · ui.js · exporter.js · zip.js ·
       rhinoImport.js · app.js · index.html · styles.css · vendor/ (three.js) ·
       rulesets/ (examples)
python/ gable_core.py (port) · run_rhino3dm.py · run_rhinocommon.py ·
       gh_component.py · *.example.json
test/  parity.mjs · parity_check.py
```

---

## Limitations & honest edges
- Proxies, not simulation (stated above and in the UI). Don't let a green score
  read as "it performs" — read it as "it satisfies the rule I wrote."
- Apertures render as inset panels (a visual proxy); no CSG boolean is performed —
  metrics use aperture area/orientation analytically.
- No self-shading ray cast yet (`solarEnvelope` ignores one mass shadowing another).
- `.3dm` import recovers dimensions, not rotations (bbox method).

## Stretch (next)
Self-shading ray casts · a real `.gh` definition / cluster · a parameter-sweep
explorer with a CSV of the design space + a small Pareto view · animated sun path.

---

## Appendix — the build prompt

The brief this tool was built from (hand it to a fresh session to regenerate or
extend it) lives in [`PROMPT.md`](PROMPT.md).
