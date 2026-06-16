# RAP — Tactile CAD Workflow

**The accessibility (RAP) tool: a non-visual / tactile CAD workflow.**
Make architectural drawing and model-reading legible by touch (and sound/word) so
blind and low-vision users can *author* and *read* spatial work — not just receive a
translated version of it. This is the lab's research frontier and a strong candidate
for the workshop's **primary showcase tool**.

**Status:** 🟡 in progress — *workflow previously started; needs porting/connecting
into this repo.* Maps to `TOOL-CATALOG.md` §11 (Accessibility/RAP) and §26 (RAP
frontier gaps).

> **Action item:** locate the earlier tactile-CAD work (likely in the
> `Radical-Accessibility-Toolkit` repo / local RAP folders) and decide whether to
> port it here or reference it as a submodule.

## What it should do (candidate scope)
- Convert a plan/section/model into a **tactile graphic** — simplified line hierarchy, texture-coded materials/rooms, a Braille key — validated against tactile-legibility minimums (BANA: line spacing, symbol size, fingertip resolution).
- **Sonify** geometry/section (height/void/material → pitch/timbre) and **describe** it in structured spatial language for screen-reader use.
- **Test fidelity, not just plausibility** — can a user reconstruct the space from the tactile/audio/verbal version? (Translation-Fidelity Scorer.)
- Toward **non-visual authoring**, not only translation.

## Likely build notes (candidates)
- Tactile: SVG simplification + texture substitution + Braille key (liblouis → BRF / swell-paper export); STL relief for 3D-print models.
- Audio: Web Audio / Tone.js sonification engine (shared with **form-helper** force-field audio).
- QA: tactile-scale calibrator (min feature vs. ~1–2 mm fingertip), BANA rule checks.

## Ideas / backlog
- Pull geometry from **Site Analyzer** / **form-helper** outputs.
- Real-participant feedback rig (screen-reader-first) — the lab's actual rigor, not AI personas.
- A small **non-visual representation benchmark** (publishable lab asset; ties to ACADIA/JAE).
