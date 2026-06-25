# Gable Studio — handoff / session summary

A self-contained orientation for a fresh Claude (or human) picking up this work,
e.g. a terminal session pointed at this repo. Read this file first, then
[`README.md`](README.md) for the user-facing detail and [`PROMPT.md`](PROMPT.md)
for the original build brief.

---

## 0. Git state (where the code is)

- **Repo:** `johnnysclark/26-Summer-AI-Workshop`
- **Branch:** `claude/festive-goodall-tyyosz`  ← all work is here, **pushed**
- **Tool path:** `TOOLS/gable-studio/`
- **Latest commit at time of writing:** `869f694` (detailed self-shadowing solar grid)
- **Open PR:** draft #5 ("Gable Studio — gable-massing analyzer + constraint generator")

To get it locally:
```bash
git fetch origin && git checkout claude/festive-goodall-tyyosz
cd TOOLS/gable-studio
npm test            # parity + sensitivity + occlusion (node + python3, no install)
python3 -m http.server 8000     # then open http://localhost:8000/web/
```
No `npm install` for the app — `three.js` and `leaflet` are vendored in `web/vendor/`.
`package.json` exists only so Node treats `core.js` as ESM for the tests.

---

## 1. What this is (one paragraph)

A **full-loop architecture teaching tool**: a student shapes a simple massing,
watches live performance **data** (solar, wind, ventilation, views, earth-coupling),
encodes design intent as testable **rules** (constraints), exports those *same*
rules + geometry as **Rhino 8 / Grasshopper python and a native `.3dm`**, models in
Rhino, and re-imports the `.3dm` to re-test. The pedagogical bet: connect **data
literacy** to **design experimentation** at the start of a project. The browser and
Rhino agree **by construction** — one shared maths core, proven by a parity test.

The massing (v2): three **independent** plan rectangles — **Plinth** (floor slab),
**Walls** (tube, no floor/ceiling), **Roof** (overhanging plane, single ridge with
**two independent pitch angles** → gable/shed/butterfly) — each with its own
centre/size/rotation, plus **4 apertures** (3 wall + 1 roof), on a **ravine-edge
topography**. Coords: +X East, +Y North, +Z Up, metres, degrees, floor (plinth top)
at z=0.

---

## 2. Architecture — the ONE rule that matters

**`web/core.js` is the single source of truth.** All geometry construction, the
metric formulas, the terrain, and rule evaluation live there (pure, no DOM/three).
**`python/gable_core.py` is a line-for-line port.** The viewport renders from the
core, the dashboard/rules constrain on it, the exporters bake from it.

> If you change any formula in `core.js`, change it in `gable_core.py` too.
> `npm test` (test/parity_check.py) fails until they agree. **Never let them drift.**

---

## 3. File map

```
TOOLS/gable-studio/
  README.md          user-facing: form, metrics+sources, layer convention, walkthrough
  PROMPT.md          the original build brief (hand to a fresh session to regen/extend)
  HANDOFF.md         this file
  package.json       type:module + npm scripts (serve / parity / sensitivity / test)

  web/                       ZERO-BUILD static app (serve the folder, open /web/)
    core.js          ★ SINGLE SOURCE OF TRUTH: params, geometry, metrics, terrain,
                       sun, rules, and viewport-only helpers (massingTriangles,
                       rayHitsAny, sampleSolarGrid, windField, solarField…)
    app.js           state owner; wires panels↔core; modals; export; import; map
    viewport.js      three.js: PEN mode (hidden-line + shadows) and ANALYSIS mode
                       (self-shadowing solar grid / wind overlay + arrows / sun paths)
    ui.js            control panel, dashboard, rule builder (DOM)
    exporter.js      builds the export .zip (params/ruleset/python + native .3dm)
    rhinoExport.js   bakes a real .3dm IN-BROWSER via rhino3dm (mirrors python bake)
    rhinoImport.js   reads an uploaded .3dm (rhino3dm) → recover params (convention)
    zip.js           tiny hand-rolled STORE zip writer (no JSZip)
    index.html       layout, importmap, leaflet, the two modals (map + sources)
    styles.css
    rulesets/        passive-solar-shed.json, earth-coupled-retreat.json (examples)
    vendor/          three.module.js + addons (offline), leaflet/ (offline lib)

  python/
    gable_core.py    ★ line-for-line port of core.js (stdlib only)
    run_rhino3dm.py  plain python3: recompute, PARITY SELF-TEST vs browser, rule
                       table, (re)writes gable.3dm  (bake needs: pip install rhino3dm)
    run_rhinocommon.py  paste into Rhino 8 ScriptEditor: builds + bakes on layers
    gh_component.py     paste into a Grasshopper Script (python 3) component
    *.example.json   fallback params/ruleset so the scripts run standalone

  test/
    parity.mjs + parity_check.py   JS↔python parity (116 metric values)
    sensitivity.mjs                every metric responds to param changes (29/29)
    occlusion.mjs                  roof overhang actually shades the walls
```

Rhino **layer convention** (so import round-trips): `Plinth`, `Walls`, `Roof`,
`Apertures`, `Report`.

---

## 4. The metrics (all simplified, transparent PROXIES — not validated simulation)

Pure functions of params+site, identical JS/python. Full formulas + citations are in
the in-app **ⓘ Sources & math** panel (and `index.html`). Keys:
- Solar: `solarUseful / solarWinterUseful / solarSummerUseful / solarSouth /
  overheatRatio / solarEnvelope` (sampled sun: 3 seasons × 5 hours; Lambert cosine).
- Wind: `windExposure` (windward area), `windPressure` (½ρV²·area), `channelIndex`
  (plan throat venturi heuristic).
- Air: `stackIndex`, `stackHeight` (buoyancy `Cd·A*·√(2gΔz·ΔT/T)`).
- View: `viewAmount / viewQuality / skyView` (aperture solid angle from an eye point).
- Earth: `soilContactArea / massVolume / thermalMassRatio / buriedFraction` (vs terrain).
- Form: `enclosedVolume / envelopeArea / glazingRatio / surfaceToVolume / pitchDeg /
  ridgeHeight / footprint`.

Rules: `{ id, lhs, op (< <= > >= == between outside), rhs, weight, hard }`; hard rules
must all pass; score = weighted fraction passing. Variables = any param (`plinth_W`,
`walls_h`, `roof_pitchL`…) or metric.

---

## 5. Feature set as built (current state)

- **Two viewport looks:** PEN (white-paper hidden-line + crisp cast shadows on the
  ravine terrain w/ contour lines; shadow-intensity + sun-hour sliders) and ANALYSIS.
- **Analysis overlay selector** (Display → overlay):
  - **Solar — sun now / yearly**: a **fine analysis grid** over walls/roof/plinth with
    **self-shadowing** (ray-cast vs the massing) — the roof overhang's shadow band on
    the walls is visible and updates live with sun hour / latitude; day-arc sun paths.
  - **Wind — windward**: faces hot→cold + **wind arrows** (scale with speed, swing
    with azimuth).
- **Rule builder** + live pass/fail + weighted score; save/load rulesets; 2 examples.
- **Export .zip**: `params.json` (+ browser metrics for the self-test), `ruleset.json`,
  the 3 python scripts, and a **native `gable.3dm`** baked in-browser.
- **Import .3dm**: recover footprints/heights from Plinth/Walls/Roof layers, re-test.
- **📍 Location** map (Leaflet/OSM) → set latitude/longitude by clicking.
- **ⓘ Sources & math** panel: every formula + citation + "these are proxies" disclaimer.

---

## 6. Known limitations / honest edges (don't "fix" silently — they're intentional)

- Proxies, not simulation. A green score = "satisfies the rule I wrote," not "performs."
- The **analysis overlay** self-shadows, but the **headline metric numbers** (`solarUseful`
  etc.) are still whole-face proxies that ignore self-shading — colours can show an
  overhang's shadow before the single number moves.
- Apertures render as inset panels (no CSG boolean); metrics use aperture area/orientation.
- Gable ends are open (walls and roof are independent rectangles) — reads as clerestory.
- `.3dm` import recovers footprints/heights, not rotations or roof pitches (bbox method).
- Solar proxy uses **latitude** only (local solar time assumed); longitude is recorded.
- CDNs are not needed at runtime EXCEPT: `rhino3dm` (lazy, only for .3dm import/export)
  and OSM **map tiles**. three.js + leaflet libs are vendored (offline).

---

## 7. NOT YET visually verified

The build was authored in a remote container with **no browser**, so the core maths,
exports, parity, and round-trips are all test-verified, but the **rendered UI** (pen
shadows, the analysis grid density/contrast, wind-arrow feel, the two modals) has not
been clicked through in a real browser. **First local `http.server` run is the smoke
test.** Likely tuning spots: analysis grid resolution (`gridCellsInto` cell size 0.5 m,
caps 2..14 in `viewport.js`), shadow-intensity mapping (`applyDisplay`), wind-arrow
density, gable-end closure.

---

## 8. How the design evolved (summary of the chat that produced this)

1. **Started as a prompt request**, then built the tool. v1: plinth + room box + simple
   symmetric gable + 4 apertures; metrics; rule builder; Rhino/GH python export; .3dm
   import; parity test. Zero-build, three.js vendored, hand-rolled zip, lazy rhino3dm.
2. **Locked specs:** 4 apertures (3 wall + 1 roof); Rhino 8 for everyone.
3. **v2 geometry rewrite (big):** three INDEPENDENT rectangles (plinth SLAB w/ thickness,
   walls TUBE w/ wall thickness + no floor/ceiling, roof OVERHANG); roof gets **two
   independent pitch angles** (gable/shed/butterfly), ridge shift, thickness; ground
   became a **ravine-edge topography**; viewport became **pen hidden-line B&W + crisp
   shadows + shadow-intensity slider** and a **Ladybug-style analysis mode**.
4. **Then:** verified all metrics respond to params (sensitivity test); added a **native
   .3dm export** (browser bake, validated round-trip); a **clickable lat/long map**; an
   **ⓘ Sources & math** panel.
5. **Then:** made the analysis overlay **update with sun & wind** (overlay selector:
   solar-now / solar-year / wind) and added **wind visual overlays** (windward colour +
   arrows).
6. **Most recent:** made the colour overlay **more specific** — a **self-shadowing
   per-cell solar grid** so the **roof overhang's** effect on the walls is visible in
   detail; added `test/occlusion.mjs`; full re-verification.

Throughout, the studio ethos was honoured: **hard, transparent data; everything labelled
as a proxy; the student (not the model) decides what's good.** Matches the repo's
"grade the trace, not the output" framing.

---

## 9. Suggested next steps (open / unstarted)

- **Click-through + visual tuning** in a real browser (see §7).
- Make a headline solar metric optionally **self-shaded** (reuse `sampleSolarGrid`/
  `massingTriangles`) so the number agrees with the overlay — keep the cheap proxy too.
- Close gable ends (optional) when walls/roof footprints allow.
- Real `.gh` definition / cluster; a parameter-sweep explorer + CSV + Pareto view.
- `.3dm` import: recover rotations/pitches (not just bbox).
- Animated sun path; mobile layout.

**Before committing any change, run `npm test` and keep `core.js` ⇄ `gable_core.py` in lockstep.**
