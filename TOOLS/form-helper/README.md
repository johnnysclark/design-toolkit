# Form Helper

**A form-finding generator governed by site forces.**
Start from a chosen geometry and let real site forces — sun, wind, orientation,
(views, slope, noise, flood) — push, carve, and tune the form. Not "AI makes you a
building," but a force-driven sketch instrument where the student keeps authorship
of the parti and reads *why* the form responds.

**Status:** 🟡 planned / scoping. Maps to `TOOL CATALOG IDEAS.md` §5 (Concept & Form) and
§7 (Performance), with the **Solar-Envelope Carver** and **Section-First Generator**
as close cousins.

## Core idea
- Input: a base geometry (massing, surface, or volume) + a site force profile.
- Forces act as **operators** on the geometry: solar → carve for access/shading;
  wind → streamline/shelter; orientation/views → rotate/aperture; slope → terrace.
- Output: a *range* of force-responsive variants (keep divergence — don't collapse
  to one "answer"), each annotated with which force drove which move.

## Design questions to settle
- Pull the site forces straight from **Site Analyzer** (sun/wind/orientation)?
- Where does the geometry live — Grasshopper (Rhino.Inside / RhinoCompute), three.js, or both?
- How explicit is the force→move mapping (so it teaches, not just generates)?
- Guardrail: present options to *judge*, never a single auto-resolved form.

## Likely build notes (candidates)
- Solar: sun-vector carving / shadow-on-neighbors envelope (SunCalc/pysolar or Ladybug).
- Wind: prevailing-direction sheltering heuristics first; CFD later if needed.
- Geometry engine: Grasshopper definition driven by parameters, or a p5.js/three.js prototype for the demo.

## Ideas / backlog
- Force "sliders" so students feel each force's contribution.
- Log every move's driving force (feeds "grade the trace").
- Tactile/audio output of the force field (RAP crossover → **rap-tactile-cad**).
