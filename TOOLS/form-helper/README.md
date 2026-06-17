# Form Helper

**A force-driven sketch instrument: you bring the parti, the site pushes back, and you
read *why*.** Not a generator that hands you a building — the back-half of a thought
you already started. The student commits to a base geometry (a parti move), turns on
real site forces (sun, wind, orientation, views, slope, flood), and watches each force
perform one *legible operation* on the mass. The payload isn't the variant; it's the
**causal chain** — "the south face carved back because the December sun hits it at 24°."

> **"You set the parti; the site critiques it; you decide which critique to take."**

**Status:** 🟡 planned / scoping. Maps to `TOOL CATALOG IDEAS.md` §5 (Concept & Form) + §7 (Performance); cousins: Solar-Envelope Carver, Section-First Generator.

---

## The loop (this tool *is* the design-feedback loop)
1. **DECLARE** — pick/draw a base geometry; name the parti in one line. *This line is authorship; it gets logged.*
2. **LOAD FORCES** — import from Site Analyzer (sun/wind/slope/flood, already sourced & tagged) or enter manually with a "where did this come from?" field.
3. **APPLY & READ** — toggle forces; each move is drawn as a **ghost-arrow + before/after diff + one-line caption** ("carved 1.4 m off SW corner → reduce 3 PM summer gain"). A force ledger lists every move and its driver.
4. **JUDGE & REVISE** — keep / override / pin variants. **Override is first-class and logged** ("kept the sharp SW corner — river view > 3 PM gain"). Then loop.

## The force→move mapping (the teaching core)
Every force reduces to a **named, reversible, quantified operation** with a stated *why*:

| Force | Operation | The "why" it surfaces | Source |
|---|---|---|---|
| Sun (summer) | carve / chamfer high-gain faces; pull overhangs | "SW gets the 3 PM load" | sun path / SunCalc |
| Sun (winter) | open / step back south faces | "don't block your own December sun" | sun vectors by date |
| Solar envelope | clip under the shadow-fence that won't shadow neighbors | "your right to light vs theirs" | sun + neighbor heights |
| Wind | streamline windward edge; notch a lee courtyard | "where's the cold NW wind / the calm pocket?" | wind rose |
| Views | rotate / splay apertures / cantilever toward the view | "the form leans toward what's worth seeing" | view bearings |
| Slope | terrace / step to grade | "sit on the land, don't bulldoze it" | terrain grid |
| Flood | lift / pilotis / first floor above BFE | "get the program above the flood line" | FEMA BFE |

**Rule that keeps it legible:** every op is (a) one verb, (b) one force, (c) quantified, (d) shown as a before→after diff with the slider value that produced it. Conflicting forces **fork the variant grid** rather than silently averaging — the conflict *is* the lesson.

## Modes / toggles
Force on/off (start all-off = raw parti; isolate one at a time) · force-strength sliders · divergence count (2–9, default 4, **never 1**) · divergence source (force-dominance / strength-sampling / operation-choice) · date-time scrubber (solar) · geometry-lock (pin parts forces can't touch) · conflict-only view · provenance overlay (✓/?/⚠ on the model) · degrade tier (D0 canned / D1 manual / D2 live import).

---

## Gameplan

### MVP (single-file HTML, three.js, zero setup — equity floor)
- 4–5 base primitives + extrude-a-footprint.
- **3 forces fully wired**: sun (carve/overhang), slope (terrace), flood (lift) — all client-side from a canned/manual profile.
- Force on/off + strength sliders; before→after diff; one-line caption per move.
- Divergence grid of 4 (strength-sampling); auto four-line provenance log + override-with-reason; export log + carved mass as `.obj` on the shared metric origin.

### v1
- Add wind, views, orientation; conflict-fork visualization.
- **Live import from Site Analyzer** (its `forceProfile` JSON; shares `geo.js` + metric origin so a carved form lands on the exported terrain).
- Date/time solar scrubber + **solar-envelope mode**.
- `.3dm` export (massing + force diagrams on toggleable layers, mirroring `rhino3dm-export.js`).
- Built-in **devil's-advocate critique** + downloadable verification worksheet.

### Stretch
- "Explain the move" deep annotations (sentence + the equation/data behind it).
- Variant comparison board (per-force scorecards, **no aggregate winner**).
- **Section-First mode** (forces act on a poché section, then extrude).
- **Tactile/audio force-field for RAP** (sonify wind push / haptic sun load) → hand-off to `rap-tactile-cad` (shared `sonify-engine.js`).
- Grasshopper `.ghx` export whose sliders mirror the browser force sliders.

---

## Potential directions
1. **Forces-from-Site-Analyzer pipeline** (the spine; makes the repo feel like one instrument).
2. **"Explain the move" annotations** (the biggest lever turning *generate* into *teach*).
3. **Tactile / audio force-field** (RAP throughline; feeds the showcase).
4. **Conflict-as-curriculum mode** (dramatize force conflicts; log the tradeoff as the graded artifact).
5. **Solar-envelope / "right to light" mode** (ethics of massing, not just performance).
6. **Variant comparison board** (divergence kept honest; student writes the verdict).
7. **Inverse / "interrogate the move" mode** (tool proposes a move, student predicts the driving force — you can't offload a prediction).

---

## Technical notes
- **Recommendation: in-browser three.js for MVP/v1; Grasshopper is an *export target*, not the engine** (a GH/RhinoCompute engine needs a license + server, violating the equity floor). Hybrid: browser engine + two export rungs (baked `.3dm`/`.obj`, optional `.ghx`).
- **Reuse `site-analyzer/web/geo.js` verbatim** for `solarPosition` / `sunPaths` / `windRose` / `makeProjector` — the sun vectors that carve the mass are the same ones Site Analyzer draws, and the shared metric origin is non-negotiable for alignment.
- **Forces are pure functions** `(geometry, forceProfile, weight) → (geometry', moveLog[])` applied in a deterministic, ordered, replayable pipeline. The `moveLog` *is* the legibility and feeds "grade the trace."
- **Every core force is deterministic (D0)** — solar (sun-vector carving / Knowles solar envelope), slope (DEM), flood (Z-threshold), views (raycasting). Wind = an honest sheltering **heuristic tagged ⚠** (not CFD).
- **Where AI belongs: NOT geometry.** Geometry stays deterministic/reproducible. The LLM (optional, D1/D2) does *critique* of variants, *narration* of the moveLog, and the *self-attack* pass — it never places vertices.
- **Hard part:** robust in-browser booleans → use **manifold-3d** or **three-bvh-csg**, or a voxel/SDF representation; constrain the operator vocabulary to well-behaved ops.

## Delivery & equity (D0–D2)
**D0** (no model, zero setup): all forces, variant range, moveLog, OBJ/DXF/`.3dm` export, worksheet, log — a *complete* tool on a Chromebook. **D1:** + LLM critique/narration/self-attack. **D2:** higher-quality critique; CFD-grade wind; RhinoCompute parametric validation. Form factors: `standalone/` · `web/` · optional `grasshopper/`.

## Integration / hand-offs
- **IN ← Site Analyzer:** `forceProfile` JSON (centroid, prevailingWind, windRose, sun paths/altitudes, slope grid, flood BFE, projector). **IN ← code-zoning-agent:** the legal zoning **envelope** as the base volume (each face tagged with its governing clause).
- **OUT → Rhino:** `.obj` + `.3dm` (massing + force diagrams on layers, shared origin so it drops onto Site Analyzer's terrain). **OUT → rhino-wizard:** the moveLog as operations to script in GH. **OUT → rap-tactile-cad:** the force field to sonify/feel.

## How to test it
Determinism (same profile+weights → byte-identical geometry + moveLog) · physical-truth assertions (solar-weight=1 carved face clears winter-noon sun vector; no habitable face below BFE) · alignment regression (massing `.3dm` sits exactly on Site Analyzer terrain `.3dm`) · geometry robustness (fuzz operators, assert manifold output) · legibility (every move has a non-empty rationale + affected faces) · divergence (never collapses to one form) · offline degradation (D0 works with network off after load).

## The offload-trap (this tool's signature risk) — and the defenses
"AI made the form" is the danger. Defenses are structural: **the parti is never generated** (no "generate a building" button); every move is **reversible + captioned**; **override is first-class and logged** (an empty override log is a red flag); it outputs a **range, never one answer**; and **grade-the-trace** means a blind-accept produces a visibly worse artifact than a reasoned-override one. *Form Helper is a critic, not an author — the site gets a vote; the student keeps the pen.*
