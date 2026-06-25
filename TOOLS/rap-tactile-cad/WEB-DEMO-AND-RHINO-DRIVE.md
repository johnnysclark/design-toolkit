# RAP on the Web — Options for Demoing the Idea, and for Driving Rhino

**A menu of every realistic way to (A) show how the Radical Accessibility Project works
inside the toolkit website, and (B) make that website actually drive a Rhino model — so we
can weigh them and pick a few to prototype.**

**Status:** 🟡 exploration doc — no new running code yet. This is the "explore all
possibilities" pass. It lays out the options, the trade-offs, the one hard constraint that
shapes everything, and a staged test plan. Companion to the `/rap` page in the toolkit and to
[`../site-analyzer/LIVE-LINK.md`](../site-analyzer/LIVE-LINK.md), which already analyzed the
web-3D ⇄ Rhino transport question for Site Analyzer; much of Part B reuses that analysis.

> **Claim tags.** External-tool facts are tagged `✓ verified` (checked against a primary
> source) or `? unverified` (plausible, confirm before betting on it). Version-dependent
> claims about Speckle / Rhino.Compute should be re-checked at build time.

---

## Contents

- [1. The framing that makes this tractable](#1-the-framing-that-makes-this-tractable)
- [2. The one hard constraint](#2-the-one-hard-constraint)
- [3. The data contract — `state.json` is the pivot](#3-the-data-contract--statejson-is-the-pivot)
- [4. Part A — Demoing the idea on the website](#4-part-a--demoing-the-idea-on-the-website)
- [5. Part B — Getting the website to drive Rhino](#5-part-b--getting-the-website-to-drive-rhino)
- [6. Comparison matrices](#6-comparison-matrices)
- [7. Accessibility is not optional](#7-accessibility-is-not-optional)
- [8. Recommended things to test (in order)](#8-recommended-things-to-test-in-order)
- [9. Risks & gotchas](#9-risks--gotchas)

---

## 1. The framing that makes this tractable

The ACADIA paper's two load-bearing properties decide the whole architecture:

- **Sense-agnostic state** — the design lives in a canonical `state.json`, privileging no
  modality.
- **Renderer parity** — the viewport, the tactile media, the CLI, and the web interface are all
  *renderers* of that one state. None is the source of truth.

So a website is **not a new application** to build — it is **one more renderer / authoring
channel** hanging off the same `state.json`. That reframes both questions:

- **Part A (demo)** = build a *web renderer* that reads `state.json` and shows it (2D plan, 3D,
  tactile preview, audio, description) — and optionally a *web authoring channel* that writes
  `state.json`.
- **Part B (drive Rhino)** = move that `state.json` (or commands that mutate it) from the
  browser to where the Watcher can see it, so Rhino — itself just another renderer — rebuilds.

**Crucially, A does not require B.** A self-contained web demo that never touches Rhino is the
cheapest, most robust artifact and is worth building first regardless of what we decide about B.

---

## 2. The one hard constraint

**A page served from Vercel (`toolkit.allmeans.works`) cannot reach a student's desktop
Rhino.** A cloud server has no route to `localhost` on someone else's machine, and browsers
block an HTTPS page from calling `http://localhost` (mixed-content / Private Network Access).
Every "drive Rhino" option is really an answer to *"so where does Rhino run, and who runs the
bridge?"* Three cases:

| Case | Where Rhino runs | Can the browser reach it? | Implication |
|---|---|---|---|
| **(i) Same machine** | Student's own desktop, next to the browser | Only via a **local companion** the student runs (browser → `localhost`), with the mixed-content caveat (§9) | True live drive is possible, but needs a local piece |
| **(ii) Server you control** | A cloud **Windows** host (Rhino.Compute / Rhino headless) | Yes — cloud → cloud | Headless compute, no live *desktop* Rhino UI; you pay for and run the host |
| **(iii) Nowhere live** | Rhino opened later by hand | No live link — **files** move between them | Async hand-off; zero infra; uses what already exists |

The honest hierarchy: **(iii) is free and works today, (i) is the real "drive my Rhino"
experience but needs a local helper, (ii) is for server-side geometry compute, not desktop
sync.**

---

## 3. The data contract — `state.json` is the pivot

Everything below moves one of three payloads. Decide the contract once and every option
becomes interoperable:

1. **`state.json`** — the canonical parametric state (bays, walls, corridors, apertures, rooms,
   hatches, grids). This is the *real* RAP interchange; whoever holds it can render to anything,
   including Rhino via the Watcher. **Prefer this.**
2. **Commands** — the Controller's CLI verbs (`set bay A origin 20 10`, `wall A on`). A stream of
   these *is* an authoring channel; replaying them reconstructs `state.json`. Good for "live
   drive" and for an auditable log.
3. **Baked geometry** — a `.3dm` (or STL/SVG/mesh) produced from the state. One-way: good for
   "see it in Rhino," useless for "keep driving it parametrically."

> Design rule: the website should always be able to **emit `state.json`** (and ideally a command
> log). Baked `.3dm` is an export convenience, not the contract.

---

## 4. Part A — Demoing the idea on the website

Ordered roughly cheapest → richest. "Fidelity" = how close the demo is to the real system.
All are hostable on Vercel as-is unless noted.

### A1 · Narrated explainer (static)
**What:** Annotated diagrams + the pipeline figure + a scripted "command → state → render"
story, all static HTML/SVG. (The current `/rap` page is largely this.)
**Effort:** XS. **Fidelity:** low. **Backend:** none.
**Pros:** zero risk, fully accessible, already mostly done. **Cons:** tells, doesn't show.
**Verdict:** keep as the page's spine; it frames every richer demo.

### A2 · Scripted playback ("guided tour")
**What:** A canned, deterministic sequence: the UI "types" a command, the `state.json` panel
updates, a 2D plan and/or a small 3D view rebuilds — read-only, no user input. Like an
animated diagram of one design session.
**Effort:** S. **Fidelity:** medium. **Backend:** none.
**Pros:** controllable, never breaks, screen-reader-narratable (announce each step via an ARIA
live region). **Cons:** it's a movie, not a tool.
**Verdict:** strong, low-risk "show how it works" — and a fallback path inside A3.

### A3 · Interactive "RAP Studio Lite" — the hero demo
**What:** A real command console (and form controls / voice) in the browser that mutates an
**in-browser `state.json`** and renders it live as (a) a 2D tactile-style plan SVG and (b) a 3D
**Three.js / react-three-fiber** model (extruded bays, walls, corridors, doors, columns). The
`state.json` is shown as the visible source of truth. Exports `state.json`, a command log, a
tactile SVG/PNG, and `.3dm` (via `rhino3dm`).
**Effort:** M. **Fidelity:** high (it *is* the Controller pattern, in JS). **Backend:** none —
pure client-side, no API key.
**Pros:** simultaneously satisfies "a demo," "a Three.js tool," and "shows how it works";
produces the exact `state.json` that later drives Rhino (the on-ramp to all of Part B);
deployable anywhere; free. **Cons:** re-implements a subset of the Controller's command grammar
in JS (keep the grammar small and shared).
**Verdict:** **the recommended centerpiece.** Build the renderer first (read `state.json` → 2D +
3D), then the authoring channel (commands → `state.json`).

### A4 · The non-visual renderers, in the browser
**What:** Show the *other* channels, not just geometry:
- **Braille** — `liblouis-WASM` → UEB/Grade-2 from labels. `✓ verified` liblouis ships a WASM
  build.
- **Sonification** — `Tone.js` maps plan/section to pitch/pan/timbre (a shared `sonify-engine.js`).
- **Swell-paper preview** — render the plan to 1-bit B/W at the PIAF density band (25–40%) so a
  sighted viewer sees what gets embossed; offer the PNG/PDF download.
- **Tactile STL preview** — generate a relief mesh with `@jscad/openjscad` and show it in a
  `<model-viewer>` / Three.js; download STL.
**Effort:** M (per channel). **Fidelity:** high for the specific channel. **Backend:** none.
**Pros:** demonstrates *renderer parity* directly — the whole thesis. **Cons:** each channel is
its own mini-build; physical tactile legibility can't be fully judged on screen.
**Verdict:** add channels incrementally onto A3; even one (braille or swell-preview) is
compelling.

### A5 · Real-system video / screen capture
**What:** Embedded clips of Daniel using the actual CLI + Rhino + PIAF loop at The Desk.
**Effort:** S (capture + edit). **Fidelity:** maximal (it's the real thing). **Backend:** none.
**Pros:** authenticity nothing synthetic matches; carries the human center. **Cons:** passive;
captioning/audio-description needed for access.
**Verdict:** the best *complement* to A3 — pair "watch it real" with "try a slice yourself."

### A6 · Asciinema terminal playback
**What:** Record a real Controller session with `asciinema`; embed the player. Real commands,
real confirmations, selectable text.
**Effort:** XS. **Fidelity:** high (for the CLI). **Backend:** none.
**Pros:** tiny, authentic, text is copy-able and screen-reader-navigable. **Cons:** CLI only, no
geometry view.
**Verdict:** cheap authenticity; nice inside A1/A2.

### A7 · Host the actual accessible web client (Channels UI)
**What:** Deploy the paper's real accessible web client — the one that re-renders Claude Code
**Channels** turns as ARIA-landmarked HTML with a `state.json` tree pane — in a sandboxed/demo
mode.
**Effort:** L (it expects the live agent + MCP substrate). **Fidelity:** maximal (it's the
product). **Backend:** yes (agent + MCP, or a recorded transcript replay).
**Pros:** shows the genuine authoring surface. **Cons:** heaviest; needs the harness running or
a faithful replay; this blurs into Part B.
**Verdict:** aspirational; do A3 first, revisit once a hosted bridge exists.

---

## 5. Part B — Getting the website to drive Rhino

Ordered cheapest/most-certain → heaviest. Each notes: **live?**, **bi-directional?**, **where
Rhino runs**, **cost to stand up**.

### B1 · File hand-off via `state.json` → the existing Watcher  ★ MVP
**What:** The web tool (A3) emits `state.json`; the student saves it into their RAP working
folder; the **existing Watcher** (already in the repo, TCP 1998) sees the file change and
rebuilds the model in their local Rhino.
**Live?** No (manual save). **Bi-dir?** No. **Rhino:** student desktop. **Cost:** ~zero — uses
what exists.
**Pros:** works today; no new infra; perfectly matches "sense-agnostic state + Watcher";
fully deterministic and auditable. **Cons:** manual file step; one-way.
**Verdict:** **build this first.** It's the honest minimum viable "drive Rhino from the web."

### B2 · File hand-off via `.3dm` (rhino3dm in the browser)
**What:** The web tool writes a real `.3dm` **client-side** with `rhino3dm` (WASM) — the
site-analyzer already does exactly this (`web/rhino3dm-export.js`) — and the student opens it in
Rhino.
**Live?** No. **Bi-dir?** No. **Rhino:** anywhere. **Cost:** ~zero (dependency already in use).
**Pros:** no Watcher needed; opens in *any* Rhino; trivial to add to A3. **Cons:** baked
geometry, not the live parametric state — you can look but not keep driving it.
**Verdict:** ship alongside B1 as a convenience export ("open a snapshot in Rhino").

### B3 · Local companion bridge (browser → `localhost` → Watcher)  ★ the real live drive
**What:** A small local server the student runs — either the **existing Controller/MCP** or a
tiny localhost HTTP/WebSocket endpoint — that the web app POSTs commands or `state.json` to; it
writes `state.json`; the Watcher updates Rhino **live**. This is RAP's existing architecture
with a browser front-end instead of (or beside) the terminal.
**Live?** **Yes.** **Bi-dir?** Yes, if the companion also pushes model queries back. **Rhino:**
student desktop. **Cost:** medium — package the companion + solve the HTTPS→localhost mixed-
content issue (§9).
**Pros:** genuine "type in the browser, watch Rhino move"; reuses the Watcher + Controller;
keeps the auditable command log. **Cons:** the student must run a local piece; browser security
around `localhost` from an HTTPS page needs care (run the page from localhost in dev, or ship
the companion as a packaged local app/extension that serves the UI itself).
**Verdict:** **the target for the Desk experience.** Prototype after A3 + B1 prove the contract.

### B4 · MCP-mediated drive (the Digital Assistant in the browser)
**What:** The web app drives the **RAP MCP server** (the 71-function bridge) — locally via the
B3 companion, or through a hosted MCP bridge — so natural-language or structured calls mutate
the model. Most faithful to the paper's "DA as querier/coder/tutor."
**Live?** Yes. **Bi-dir?** Yes (query + edit). **Rhino:** desktop (local MCP) or server.
**Cost:** medium-high (MCP transport + the LLM behind the cost-proxy + auth).
**Pros:** the actual product surface; gives the web the querier/coder/tutor roles. **Cons:**
most moving parts; LLM spend → must sit behind the toolkit's server proxy with the API key
server-side (the repo's hard rule). **Verdict:** the rich end-state; layer it on B3 once the
plumbing is trusted.

### B5 · Speckle (off-the-shelf web ⇄ Rhino sync)
**What:** Open-source data platform with **Rhino + Grasshopper connectors**, a server, and a
plugin-free **Three.js web viewer**; a "send/receive" model syncs geometry between a web app and
a live Rhino session.
**Live?** Near-live (send-on-change + viewer auto-update; not socket-level). **Bi-dir?** Yes
(web ⇄ Rhino ⇄ GH). **Rhino:** desktop (with connector) or server. **Cost:** low-medium (install
connector, point at a server).
**Claim tags:** Speckle bundles the Rhino/GH connectors and a web viewer — `✓ verified`
([docs.speckle.systems](https://docs.speckle.systems/), Speckle Rhino integration). "Live" = send-on-change,
not a guaranteed real-time socket — `? unverified` (inferred from the commit/send-receive model;
confirm the feel before committing). Web viewer is Three.js-based — `? unverified` (widely
reported; verify if it drives the viewer choice).
**Pros:** purpose-built for exactly "switch easily between web app and Rhino"; **works
cross-machine** (cloud web ↔ desktop Rhino) without you building a plugin; bi-directional out of
the box. **Cons:** another platform/account; geometry-sync oriented (it moves meshes/breps, not
necessarily your parametric `state.json` semantics) — you'd still keep `state.json` as the
contract and treat Speckle as a transport.
**Verdict:** the best answer **if/when cross-machine or "no local install of our own bridge" is
the priority.** Reach for it before building a custom plugin (B7).

### B6 · Rhino.Compute / Hops (headless geometry on a server)
**What:** Headless Rhino + Grasshopper behind a stateless REST API; solves GH definitions
server-side and returns geometry.
**Live?** Request/response, not sync. **Bi-dir?** No (compute, not link). **Rhino:** a **Windows**
host you run. **Cost:** medium-high (Windows host + server ops).
**Claim tags:** Rhino.Compute is open-source, exposes RhinoCommon as a stateless REST API; Hops
passes a GH definition to a headless server which solves it — `✓ verified`
([developer.rhino3d.com/guides/compute](https://developer.rhino3d.com/guides/compute/)). Windows-first; verify
current macOS/Linux support before betting an architecture on it — `? unverified`.
**Pros:** lets the *cloud* website run real Rhino/Grasshopper geometry (e.g. heavy meshing for
the STL, or a Ladybug environmental pass) with no desktop. **Cons:** not a live desktop link;
Windows host; overkill for authoring `state.json`. **Verdict:** reserve for **geometry-dependent
compute** (tactile-mesh generation at scale, Ladybug analysis), not for "drive my Rhino."

### B7 · Custom WebSocket Rhino plugin
**What:** A RhinoCommon/Python plugin that opens a socket and pushes/pulls geometry in real
time. (RAP's Watcher on TCP 1998 is already a lightweight, file-triggered cousin of this.)
**Live?** Yes, true real-time. **Bi-dir?** Yes. **Rhino:** desktop. **Cost:** high (you build +
maintain a plugin).
**Pros:** maximum control and lowest latency. **Cons:** most rope; a plugin to maintain across
Rhino versions. **Verdict:** only if B3/B5 latency genuinely isn't enough. The Watcher likely
already covers the need.

### B8 · Community `rhino-mcp`
**What:** Jingcheng Chen's `rhino-mcp` exposes Rhino over MCP for any LLM harness. `✓ verified`
(repo exists; cited in the ACADIA paper).
**Note:** RAP deliberately ships a **proprietary** Rhino bridge (the Watcher on 1998) and does
**not** depend on third-party `rhino-mcp` — a stated project decision. List it for completeness,
but B3/B4 over RAP's own bridge are the on-brand path. **Verdict:** reference only.

---

## 6. Comparison matrices

### Part A — web demos
| Option | Effort | Fidelity | Backend | Interactive | Best at |
|---|---|---|---|---|---|
| A1 Narrated explainer | XS | low | none | no | framing the page |
| A2 Scripted playback | S | med | none | no | safe "show how it works" |
| **A3 RAP Studio Lite** | **M** | **high** | **none** | **yes** | **the hero — demo + 3D + on-ramp to Rhino** |
| A4 Non-visual renderers | M/ea | high | none | yes | proving renderer parity |
| A5 Real-system video | S | max | none | no | authenticity / the human center |
| A6 Asciinema | XS | high (CLI) | none | no | cheap authentic CLI |
| A7 Hosted Channels UI | L | max | yes | yes | the genuine authoring surface |

### Part B — drive Rhino
| Option | Live? | Bi-dir? | Rhino runs | Cost | When to pick |
|---|---|---|---|---|---|
| **B1 `state.json` → Watcher** | no | no | desktop | ~0 | **first proof; works today** |
| B2 `.3dm` via rhino3dm | no | no | anywhere | ~0 | "open a snapshot in Rhino" |
| **B3 Local companion** | **yes** | yes | desktop | med | **live drive at The Desk** |
| B4 MCP / DA in browser | yes | yes | desktop/server | med-high | the rich product surface |
| B5 Speckle | near | yes | desktop/server | low-med | cross-machine, no custom plugin |
| B6 Rhino.Compute/Hops | req/resp | no | **Windows** server | med-high | server-side geometry/Ladybug |
| B7 Custom WS plugin | yes | yes | desktop | high | only if B3/B5 latency fails |
| B8 community rhino-mcp | yes | yes | desktop | low | reference only (off-brand) |

---

## 7. Accessibility is not optional

The website is **another renderer**, so it must clear the same bar the rest of RAP sets — or it
contradicts the project:

- Screen-reader-first: semantic HTML, ARIA landmarks, the `state.json` exposed as a navigable
  tree (mirror the paper's web client), every state change announced via an ARIA live region.
- Keyboard-complete: no mouse-only paths; the command console is the primary surface, the 3D
  view is an *aid*, never the only way to read the model.
- The 3D Three.js view must have a **non-visual equivalent** beside it (the description/querier
  text + tactile preview) — parity, not a visual showpiece with an alt-text afterthought.
- Test with `axe-core`/Lighthouse (zero criticals), keyboard-only passes, and real
  NVDA/VoiceOver/JAWS runs — ideally with blind co-testers on the *tool itself*, not just its
  output.

---

## 8. Recommended things to test (in order)

A concrete path that front-loads certainty and reuses each result:

1. **Test 1 — A3 "RAP Studio Lite," read-only renderer first.** Hand-write a `state.json`, build
   the web renderer (2D tactile SVG + Three.js 3D). Pure client-side. *Proves: the state → web
   geometry pipeline, and the `state.json` contract.* (Cheapest, highest learning.)
2. **Test 2 — A3 authoring channel.** Add the command console so the browser *writes*
   `state.json`. *Proves: the browser as an authoring channel.* Add one A4 renderer (braille or
   swell-paper preview) to show parity.
3. **Test 3 — B1 + B2 hand-off.** "Download `state.json`" → drop into the RAP folder → existing
   Watcher rebuilds in local Rhino; plus a `.3dm` export. *Proves: the website can drive a real
   Rhino, today, with zero new infra.*
4. **Test 4 — B3 local companion (live).** Stand up a localhost bridge (extend Controller/MCP);
   POST commands from the browser; watch Rhino update live at The Desk. Solve the
   HTTPS→localhost detail (§9). *Proves: true live drive.*
5. **Optional — B5 Speckle** if cross-machine "switch between web and Rhino" becomes the goal;
   **B6 Rhino.Compute** only when server-side geometry/Ladybug compute is actually needed;
   **B4 MCP/DA** as the rich end-state once B3 is trusted.

> Net: **A3 → B1 → B3** is the spine. A3 is the demo *and* the on-ramp; B1 is the free first
> "drive Rhino"; B3 is the live experience. Everything else is a branch off that trunk.

---

## 9. Risks & gotchas

- **HTTPS → `localhost` (the B3 blocker).** An HTTPS Vercel page calling `http://localhost:1998`
  is blocked as mixed content / Private Network Access. Options: run the demo page from
  `localhost` during studio; have the companion serve the UI itself (packaged local app or
  browser extension); or give the companion a localhost TLS cert. Decide this before promising
  "live from the hosted site."
- **Re-implementing the command grammar (A3).** Keep the JS command set a small, shared,
  documented subset of the Controller's verbs so the web and CLI don't drift. Treat `state.json`
  as the spec.
- **`state.json` schema drift.** Version the schema; the web renderer and the Watcher must agree.
  Pin and test round-trips (web-authored `state.json` → Watcher → Rhino → query back).
- **Rhino.Compute is Windows-first** and a hosted cost; don't adopt B6 for anything B1/B3 can do.
- **LLM spend (B4).** Any model call must go through the toolkit's server proxy with the key
  server-side and a spend cap — never a key in browser code (the repo's hard rule).
- **Speckle semantics.** It syncs baked geometry, not our parametric `state.json` meaning; keep
  `state.json` as the contract and use Speckle as transport, or accept one-way fidelity loss.
- **Accessibility theater.** A flashy Three.js view that isn't matched by a non-visual equivalent
  would betray the project. Parity first, polish second.
- **Proprietary-bridge decision.** RAP intentionally avoids third-party `rhino-mcp`; keep the
  drive path on RAP's own Watcher/MCP unless we consciously revisit that.
