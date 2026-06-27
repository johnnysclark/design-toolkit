# Vantage — interactive camera, lens & perspective demo

**Status:** planned · **Type:** client-only (no API key, no auth, no `tool_runs`) ·
**Home:** a card in the **2D Tooling** hub (`/media-2d`) — it's about *image-making*.

A teaching instrument that shows how a camera turns the 3D world into a 2D image: how
**lens / focal length** sets the field of view and apparent perspective, and how **aperture**
sets depth of field. Built as a real **three.js** scene (decision: photoreal preview over a
stylized 2D one), with a physically-correct numbers panel and an architecture-flavoured
extension (tilt-shift "keep verticals straight" + a hand-drawn perspective-construction overlay:
horizon line + vanishing points).

> Decisions taken (2026-06-26): **Three.js real 3D** render · lives **in the 2D Tooling hub**
> (image-making) · scope **core three + architecture extras** · name **Vantage**.

---

## 1. Where it fits (architecture)

Follows the **client-only / Gable Studio pattern** (CLAUDE.md rule 5 / BUILD-BACKLOG "Client-only
tools"): a self-contained static app under `apps/toolkit/public/tools/vantage/`, embedded by a
thin route page via the existing `EmbeddedTool` component. **No** API route, **no** prompts, **no**
auth gate, **no** `tool_runs` logging — it spends nothing and is fully public/shareable.

Touched files (small, low-conflict surface):
- **New:** `apps/toolkit/public/tools/vantage/**` (the whole tool)
- **New:** `apps/toolkit/src/app/(app)/media-2d/vantage/page.tsx` (route → `EmbeddedTool`)
- **Edit:** `apps/toolkit/src/app/(app)/media-2d/page.tsx` — add a `HubCard` (semi-hot hub file;
  one array entry)
- **Edit (optional):** `src/lib/toolkit-nav.ts` — only to mention Vantage in the `/media-2d`
  blurb (the hub is already in nav; **no new top-level entry**). Coordinate — it's a hot/shared file.
- **Edit:** `platform/STATUS.md` (note the stream) · `platform/BUILD-BACKLOG.md` (add the item)

Mirror the wiring from the worked examples: `EmbeddedTool` usage →
`(app)/tools-3d/obliquify/page.tsx`; hub card shape → `(app)/media-2d/page.tsx`; static
three.js app + importmap + vendored `three` → `public/tools/gable-studio/web/`.

---

## 2. What it teaches (the lessons)

1. **The picture plane & projection** — the camera is a viewpoint (station point); the world
   projects through a cone of vision onto the 2D image plane. Eye level → the horizon.
2. **Lens / focal length = field of view.** Wide (16–24mm) ↔ normal (50mm) ↔ tele (200mm).
   The signature interaction: **dolly zoom** — a "lock subject size" toggle that moves the
   camera *and* changes focal length so the subject stays the same size while the background
   compresses/expands. This is the clearest possible proof that "perspective" comes from
   **camera distance**, not the lens.
3. **Depth of field = aperture (+ focal length + focus distance).** f/1.4 → f/22; move the focus
   plane; watch the in-focus band and background bokeh change.
4. **Architecture extras:**
   - **Perspective control / tilt-shift** — tilt the camera up at a façade → verticals converge
     (3-point). Apply *lens shift* instead → camera stays level, verticals stay parallel
     (2-point). The architectural-photography move.
   - **Draftsman overlay** — draw the **horizon line** and **vanishing points** over the live
     image, tying camera optics back to hand-drawn perspective construction (station point,
     horizon = eye level, parallel lines meeting at VPs).

---

## 3. UX layout

- **Main view** — the live three.js perspective render of an architectural scene.
- **Plan schematic (corner / toggle)** — a top-down diagram showing camera, FOV cone, picture
  plane, focus plane, and the DoF near/far band shaded. Keeps the geometry explicit (the 3D view
  alone hides the "why"). Implement as an **SVG driven by `optics.js`** (crisp labels) — or a
  second orthographic three.js viewport if auto-sync is easier.
- **Controls panel** — focal length, aperture (f-stop), focus distance, camera/subject distance,
  sensor size; toggles: *lock subject size (dolly zoom)*, *perspective control (shift)*,
  *draftsman overlay*, *show plan schematic*; camera tilt; **reset view**.
- **Numbers panel** — physically-correct readouts (FOV°, DoF near/far/total, hyperfocal,
  aperture diameter, crop factor / equivalent focal length).
- **Guided lessons** — a small stepper that sets the controls and captions each step (see §7).
- **Live "what you're seeing" text** — a sentence that updates with the controls (carries the
  lesson for non-visual users; see Accessibility).

### The scene
A short **colonnade / row of columns receding in depth** (dolly-zoom compression is dramatic and
DoF falloff is legible), a **human figure** for scale, a **façade plane with windows** (for the
tilt-shift verticals lesson), a ground plane, and **depth markers at known distances** (1 m, 3 m,
10 m, far backdrop). Architecturally legible and exercises every lesson.

---

## 4. The optics (keep it honest)

A pure, renderer-independent `optics.js` is the source of truth for every number and for the
schematic. The 3D view is *calibrated to track these numbers*, not the other way around. Honesty
labels in-tool match the repo's "teaching proxies, not validated simulation" convention
(cf. Eco-Architect): *thin-lens model; bokeh shape is stylized; DoF uses the selected sensor's
circle of confusion; real lenses add aberrations / focus breathing.*

- **FOV** — `fov = 2·atan(sensorDim / (2·f))`. three's `PerspectiveCamera` is physical: set
  `camera.filmGauge = sensorWidthMm` and `camera.setFocalLength(fMm)`; it derives the vertical
  fov. Report H/V/diagonal.
- **Hyperfocal** — `H = f²/(N·c) + f` (`N` = f-number, `c` = circle of confusion).
- **DoF** — `near = H·s / (H + (s − f))`, `far = H·s / (H − (s − f))` (far = ∞ when `s ≥ H`),
  `s` = focus distance.
- **Blur diameter at distance d** — `b(d) = |A·f·(d − s)| / (d·(s − f))`, `A = f/N`. Drives both
  the schematic falloff and the calibration of the bokeh strength.
- **Circle of confusion by sensor** — full-frame 36×24 (`c≈0.029`), APS-C 23.6 (`c≈0.019`),
  MFT 17.3 (`c≈0.015`). Sensor size changes FOV **and** DoF (crop factor).

**Tests** — `test/optics.test.mjs` (+ `package.json` `"test"` script, like
`gable-studio/test/`) asserting known cases: 50 mm FF → ~39.6° horizontal FOV; 50 mm f/8 focused
at 3 m FF → near ≈ 2.5 m / far ≈ 3.8 m; hyperfocal sanity. Fail = the physics drifted.

---

## 5. Three.js specifics

- **Vendor** `three` **r160** to match Gable Studio (`public/tools/gable-studio/web/vendor/`).
  Gable only vendors `OrbitControls`; Vantage additionally needs, from the **same r160 release**:
  `EffectComposer`, `RenderPass`, `BokehPass` (or `UnrealBloom`-style DoF), `OutputPass`, plus
  `OrbitControls`. Zero-build importmap, exactly like gable's `index.html`:
  ```
  "three": "./vendor/three.module.js",
  "three/addons/": "./vendor/addons/"
  ```
- **Focal length** → `camera.setFocalLength()` (physical, ties straight to the lessons).
- **Depth of field** → `BokehPass` with `focus` from the real focus distance and `aperture` /
  `maxblur` scaled from `optics.js` `b(d)` so the visible blur tracks the displayed DoF numbers.
  (Upgrade path: the `postprocessing` lib's `DepthOfFieldEffect` for nicer bokeh — extra dep,
  defer.)
- **Tilt-shift / perspective control** → after `updateProjectionMatrix`, apply a *principal-point
  offset* (shear the projection matrix / `setViewOffset`) so verticals stay parallel while the
  camera stays level — vs. plain camera tilt for the converging case.
- **Draftsman overlay** → a 2D canvas/SVG layer over the WebGL canvas. Horizon = project camera
  eye level; vanishing point of a world direction = the screen projection of that direction's
  point at infinity (homogeneous projection of the direction vector).
- **Performance** → render-on-demand (only on param change / orbit), cap `devicePixelRatio`,
  pause when the tab/iframe is hidden, WebGL-absent fallback message.

---

## 6. Files

```
apps/toolkit/public/tools/vantage/
  web/
    index.html        # importmap → three + addons; mounts app.js
    app.js            # scene, render loop, postprocessing, wiring
    optics.js         # pure formulas + units (imported by tests too)
    scene.js          # colonnade + figure + façade + depth markers
    diagram.js        # SVG plan schematic, driven by optics.js
    overlay.js        # draftsman overlay (horizon + vanishing points)
    ui.js             # controls, presets, guided lessons, numbers, live text
    styles.css        # all text BLACK, bold/graphic; Archivo Black headings
    vendor/three.module.js
    vendor/addons/...  # OrbitControls, EffectComposer, RenderPass, BokehPass, OutputPass (r160)
  test/
    optics.test.mjs
  package.json         # "test": node-based parity check
```
Route: `apps/toolkit/src/app/(app)/media-2d/vantage/page.tsx` → `<EmbeddedTool
title="Vantage" subtitle="Camera, Lens & Perspective" src="/tools/vantage/web/index.html"
backHref="/media-2d" backLabel="2D Tooling" note="…thin-lens teaching model…" />`.
Hub card (in `media-2d/page.tsx` `CARDS`): `{ title: "Vantage", status: "live", source: "New —
interactive camera & perspective demo", href: "/media-2d/vantage", blurb: "…" }`.

---

## 7. Guided lessons (the stepper)

1. **What a lens does** — fix the camera, sweep 16 → 200 mm, watch the FOV close in.
2. **Perspective is distance, not lens** — dolly zoom: lock subject size, vary focal length,
   watch the background compress/expand.
3. **Depth of field** — open/close the aperture and slide the focus plane.
4. **Keeping buildings straight** — tilt vs. shift on the façade, with the draftsman overlay on.

---

## 8. Accessibility (this project's bar is high)

- All sliders keyboard-operable, labelled, with ARIA + live numeric readouts.
- The **live "what you're seeing" sentence** carries the lesson without sight
  (e.g. *"85 mm at f/2.8, focused 3 m: a narrow 28° view, shallow 0.2 m depth of field —
  background strongly blurred."*). Guided-lesson captions are text too.
- **All visible text BLACK** (CLAUDE.md rule 4), bold/graphic; **Archivo Black** headings on the
  wrapper page. **Alt text** on any static imagery (rule 7).
- Respect `prefers-reduced-motion` for the dolly-zoom animation; WebGL-absent fallback text.

---

## 9. Phasing

- **P0 · Plumbing** — vendor three r160 + addons; importmap; blank scene renders in the iframe via
  the `media-2d/vantage` subroute. Prove the embed.
- **P1 · Lens lesson** — `optics.js` + numbers panel + `setFocalLength` + sensor sizes + presets +
  SVG plan schematic + **dolly zoom**.
- **P2 · DoF lesson** — `BokehPass`, focus distance, click-to-focus, blur calibrated to
  `optics.js`, DoF band in the schematic.
- **P3 · Architecture extras** — tilt-shift / perspective control + draftsman overlay
  (horizon + VPs).
- **P4 · Polish** — guided lessons, accessibility, honesty labels, responsive/mobile, `test/`.
- **P5 · Ship** — add the hub card, flip status `live`, update `STATUS.md` + `BUILD-BACKLOG.md`,
  open a PR (never straight to `main`).

The core three lessons (P1–P2) are shippable on their own — the architecture extras (P3) layer on
top, so they can slip without blocking a release.

---

## 10. Risks & mitigations

- **`BokehPass` units aren't physical** → compute real DoF analytically for the numbers +
  schematic, calibrate the visible blur to track them, and label bokeh as stylized.
- **Addon/version mismatch** → vendor `EffectComposer`/passes from the **same r160** release as the
  vendored `three.module.js`.
- **Perf / heat** → render-on-demand, DPR cap, pause when hidden.
- **Mobile in an iframe** → responsive panel, touch orbit, WebGL fallback.
- **Scope creep** (tilt-shift matrix work, VP math) → it's P3, after the shippable core.
- **Branch discipline** → own worktree/branch (CLAUDE.md rule 2); `media-2d/page.tsx` is a
  semi-hot hub file and `toolkit-nav.ts` is hot — coordinate before editing; never push `main`
  without the user's OK.
