# RAP — Tactile CAD Workflow  🌟 *primary showcase candidate*

**A non-visual CAD workflow where blind/low-vision users *author and read* architecture
through touch, sound, and structured language — and which proves its own translations
are accurate, not merely plausible, against real blind/low-vision readers.**

The sharpening move: stop pitching this as "translation to another sense" (a commodity
framing) and pitch it as a **fidelity instrument**. *Any* tool can turn a plan into beeps
or bumps; almost none can tell you whether a reader can reconstruct the actual room from
them. RAP measures reconstruction error. That is the defensible, publishable, uncopyable
core — *"polish is not evidence"* instantiated in geometry, with a blind reader and a
number in the jury.

**Status:** 🟡 in progress — **substantial prior work exists locally to port** (see below).
Maps to `TOOL CATALOG IDEAS.md` §11 (Accessibility/Multimodal) + §26 (frontier).

> **Port, don't rebuild.** A production-grade tactile pipeline already exists:
> - `Repo 260404/Radical-Accessibility-Toolkit/` — the **TACT** tactile pipeline (~5–6k lines), a stdlib **Braille converter**, pure-Python **STL relief** export, an **ADA auditor**, screen-reader-first CLI conventions, and `patterns/ARCHITECTURAL_TACTILE_GUIDELINES.md`.
> - `maquette-test/maquette/` — a clean modular **non-visual authoring** engine (journaling/undo).
> - Remote: `github.com/johnnysclark/Radical-Accessibility-Toolkit`.
> The job here is to port the proven pieces, add a **zero-setup single-file showcase**, and build the one thing nobody has: **proof of fidelity.**

---

## Why this is the strongest primary-showcase pick
- It's the lab's **core research, runnable** — demoing it *is* presenting the thesis, and its artifacts (error reports, participant data, the benchmark) are submittable to ACADIA/JAE as-is.
- It's **uncopyable** — sonifiers and alt-text generators are everywhere; a *validated* non-visual representation benchmark with ground-truth geometry and a real-participant rig is a genuine research artifact (method + data, not a prompt).
- It **maximally embodies the ethos** — the fidelity scorer is "verification must be external; the model can't acquit itself" compiled to code.
- It carries the **moral center** — "equity is infrastructure, not intent" stops being a slogan when a blind student authors a plan and a blind reader verifies it.

## Two personas, one shared artifact (the plain-text/`state.json` model is source of truth, never the viewport)
- **Blind / low-vision user — AUTHORS and READS (hero path):** author by command/voice ("place bay A, 4m×6m; door on south wall") → read back in three channels (verbal / sonified / tactile) → self-check fidelity ("from the tactile sheet, where is the entry, how many bays deep?") → mismatch = a measured, logged gap.
- **Sighted student — DESIGNS INCLUSIVELY:** design normally → run a non-visual translation → **read it back with the screen off** (the most pedagogically violent moment in the studio) → get a **Multimodal Redundancy Audit** (every critical fact in ≥2 channels?) → optionally run a real-participant session and read the reconstruction-error report.

## The capability set — and the heart
| Capability | Prior work | Role |
|---|---|---|
| Tactile graphics (simplify, texture-code, Braille key, BANA checks) | **Mature** (TACT, braille converter) | strong supporting limb |
| Structured verbal description (Macro/Meso/Micro) | **Mature** (describer pattern) | supporting limb |
| Non-visual authoring (command/voice → model) | **Substantial** (maquette engine) | the *enabling* limb |
| Sonification (geometry/section → pitch/timbre/pan) | stub — build new, shared engine | supporting limb |
| **Fidelity testing (reconstruction-error scoring; real-participant rig; benchmark)** | **net-new — THE GAP** | **THE HEART** |

Frame the tool around **authoring + proven fidelity** as the twin core; tactile/sonic/verbal are three *measured* channels.

---

## Gameplan (port vs. build)

### MVP (single-file HTML, equity floor, D0/D1)
`plan SVG/DXF → simplified, texture-coded tactile SVG + UEB Braille key → BANA legibility check → export tactile SVG + 1-bit PNG (swell paper) + BRF` — **plus a self-test quiz** that asks the reader to reconstruct N spatial facts and reports a **reconstruction-error score**. Screen-reader-first UI + provenance log + redundancy audit shipped in the MVP (accessibility and provenance are not v2 features). *This alone is a complete, demoable thesis.* Prove it on 2–3 real studio plans.

### v1 (web app, D1/D2)
Port **TACT** for real STL/PIAF export; add **structured verbal description** (vision-LLM + fixed coordinate schema + self-attack tagging); the **adversarial mis-read generator**; richer command/voice authoring; the **Participant Feedback Capture Rig** (screen-reader-first, voice-annotation, WCAG-AAA); pull geometry from Site Analyzer / form-helper; Braille Schedule Generator (reuses liblouis).

### Stretch
The **Non-Visual Representation Benchmark** (held-out spaces + ground truth + scorer for *any* method — the field-defining, citation-magnet asset); **sonification** (shared `sonify-engine.js` with form-helper); **Sound-to-Form authoring**; **Multisensory Section Bench**; multilingual Braille/audio; DeafSpace + cognitive-load extensions.

**Degradation ladder:** D0 = self-test, redundancy audit, BANA checks, deterministic SVG/text/audio + offline `vendor/` bundle. D1 = free model for description/authoring NLU. D2 = strongest model for adversarial critique + rich narration.

---

## Potential directions
1. **Translation-Fidelity Scorer** (anchor — the spine and the paper).
2. **Sound-to-Form authoring** (hum/tap → proportion/bay spacing; sound as *input*).
3. **Multisensory Section Bench** (one section three ways, side-by-side fidelity benchmarking).
4. **Real-Participant Feedback Rig** (the ethical/empirical engine; the JAE data source).
5. **Non-Visual Representation Benchmark** (held-out ground-truth spaces; cites magnet).
6. **Multimodal Redundancy Auditor** (accessibility-debt linter for sighted designers).
7. **Adversarial Mis-read Generator** (predict confusable symbols / fingertip collisions before a reader sees it).
8. **Cross-access extensions** (DeafSpace sightline auditor; cognitive-wayfinding simplifier).

---

## Technical notes
- **Client-side-first is feasible** — SVG parse/simplify (`simplify-js` RDP), texture `<pattern>` fills, **liblouis-WASM** (→ BRF, UEB default grade 1), STL relief via `@jscad/openjscad`, sonification via **Tone.js** (the shared engine). Server (`web/`) only for vision-LLM description + heavier fidelity scoring.
- **Verbal description anti-hallucination lever:** the LLM fills a **rigid coordinate schema** (viewer pose, datum, levels, elements with positions/sizes/confidence, openings, circulation), not free prose; where source geometry exists, **geometry adjudicates over the LLM**; mandatory self-attack passes (Ambiguity Flagger + "act blind" critic); every claim ✓/?/⚠ + view citation.
- **Fidelity scorer:** round-trip original → representation → reconstruction → **IoU / Hausdorff / centroid / count / ordering error**, normalized by building size. Reconstruction by (i) human participant (gold standard), (ii) LLM-from-description (automatable proxy — report the proxy-vs-human gap as a finding), (iii) sonification decode quiz.
- **BANA constraints to encode** (verify against the current edition; tag constants `?` until cited): min feature ≈1–2 mm, feature separation ≈2.5–3 mm, line separation ≥~3 mm, ≤2–3 line weights, ≤~5 textures, fixed Braille cell geometry (dot ≈1.5 mm, cell-to-cell ≈6 mm, line ≈10 mm — never scales), reserved Braille margins, ~11.5×11 in page. The **Tactile-Scale Calibrator** is this rule-set applied at the actual output scale + DPI → refuse-or-warn on export.

## Delivery & equity (D0–D2)
**D0:** the single-file HTML — full tactile pipeline + sonification + BANA check + self-test + exports, client-side, free, **plus an offline `vendor/` bundle** (liblouis-WASM, Tone.js, JSCAD) for restricted/assistive-tech labs. **D1:** free model for description/authoring. **D2:** strongest model for adversarial critique + narration. Form factors: browser single-file (primary, screen-reader-first) · Node CLI (batch + the fidelity harness) · and the **artifacts themselves** (swell paper, embossed BRF, 3D-printed STL, audio, screen-reader text).

## Hard parts & risks
Tactile legibility is **physical, not digital** (validate constants with a real embosser + blind testers; photo-based QA closes the loop on the printed artifact) · vision-LLM spatial **hallucination** (fixed schema + geometry-adjudicates + self-attack + fidelity quantifies it) · **embosser/swell hardware access** (the swell-paper + 1-bit PNG path needs only cheap capsule paper + a heat unit; BRF works on any embosser; document where to access hardware) · liblouis table correctness (pin versions, back-translate round-trip) · **DWG not browser-parseable** (require DXF/SVG/PDF) · **accessibility theater** (build the tool screen-reader-first from MVP; blind co-testers on the *tool*, not just its output).

## Integration / hand-offs
IN ← Site Analyzer / form-helper geometry. Shares `sonify-engine.js` with form-helper, the semantic-HTML + alt-text/long-desc schema with portfolio-storyteller, ADA clearances with code-zoning-agent.

## How to test it
- **Tool's own accessibility (non-negotiable):** `axe-core`/Lighthouse zero criticals; scripted keyboard-only pass; manual NVDA+Firefox / VoiceOver+Safari / JAWS+Chrome; **the real test — blind users operate it end-to-end unaided.**
- **The fidelity metric:** a 5–10 space ground-truth corpus (seed of the benchmark); automated IoU/Hausdorff/count/order with thresholds tracked over time; calibrate the LLM proxy against human reconstruction; physical loop (emboss → photograph → QA confirms BANA features survived the printer); self-attack regression (ambiguity flagger fires on known-bad descriptions).

**One-line proof of success:** *a blind student, using only a keyboard and screen reader, turns a studio plan into a swell-paper tactile graphic with a correct Braille key — and the fidelity scorecard shows another blind reader reconstructed the plan within the stated IoU/Hausdorff tolerance.* That sentence is both the demo and the research claim.
