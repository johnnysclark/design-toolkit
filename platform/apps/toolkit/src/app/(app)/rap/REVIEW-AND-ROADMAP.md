# RAP — Review & Roadmap

> **Handoff document for the next agent.** Date: **2026-06-26.** This is an honest, evidence-based review of the **Radical Accessibility Project (RAP)** tool inside `design-toolkit` (brand: All Means Works), plus a staged execution plan another Claude Code agent can pick up and run. It feeds an internal build plan, not marketing — claims are tied to `file:line`, and where the showcase page overstates what ships, this document says so. RAP's thesis (a sense-agnostic state that reads back identically in every channel, screen-reader-first) is treated as sacred: every recommendation here must remain authorable and readable non-visually, or it betrays the project.

---

## Executive summary

RAP Studio today is a **small, clean, genuinely accessible bay-centric layout tool with an exemplary architecture and a narrow vocabulary.** Its core is one canonical `State`, one `deriveGeometry()`, and renderers (3D, tactile plan SVG, PIAF raster, STL, read-back text, Braille, JSON tree) that read *only* that output — so "renderer parity" is structurally real, not aspirational (`engine/geometry.ts:1-13`). The AI assistant is a clean, auditable natural-language → command **compiler** (`api/rap/agent/route.ts`). But the entire state model is structural-grid only — bays of columns, perimeter walls, corridors, three aperture types, one void per bay, levels as z-labels — with **no room, program, area, section, site boundary, material, or curve** (`engine/types.ts:51-82`). That is why it is a *layout jig*, not a design instrument a third-year studio could carry a project through.

**Core finding:** the limitation is **vocabulary, not architecture.** The expensive, accessibility-critical part (one state → all channels) is already built and works. Every noun added to the state lights up every renderer and the AI grammar for free.

**Headline recommendation:** **broaden the in-house authoring vocabulary first** — query/audit verbs, then rooms/program, then section/vertical circulation — under a hard, build-failing parity gate; **stage Rhino as optional downstream depth**, never a runtime dependency. A Vercel page structurally cannot reach a student's desktop Rhino, so "talks to Rhino" should mean **a real `.3dm` the browser writes** (the repo already builds `.3dm` in-browser via WASM), not a live connection. Before any of that, ship a short list of **honesty + correctness hotfixes** — including one assistant bug that actively misinforms the blind primary user.

---

## Current state — what is actually built

### The shipped studio
- **Orchestrator:** `(app)/rap/studio/RapStudio.tsx` — single `runCommand` path (`:88-104`); console, forms, and AI all funnel through it, so a new verb lights up every channel at once. Exports wired at `:136-142`.
- **Engine (the canonical core):** `engine/{types,interpreter,seed,geometry,braille}.ts`. One `State`, one `applyCommand` dispatcher over ~11 verbs (`interpreter.ts:339-381`), one `deriveGeometry()` (`geometry.ts:115-272`). Pure/immutable reducers returning `OK:/ERROR:` strings that double as screen-reader confirmations (`interpreter.ts:37-39`).
- **Renderers:** `render/{Scene3D,PlanSvg,planModel,piaf,stl}.ts(x)`. Plan + PIAF consume the **exact same** `DrawPrim[]` (`planModel.ts`, `piaf.ts`); STL and 3D consume the same `SceneGeometry`. Plan drawing is architecturally literate (filled walls gapped at openings, door-swing arcs sampled to polylines, dashed corridor bands, window vs portal marks — `planModel.ts:77-119`).
- **AI API:** `api/rap/agent/route.ts` + `lib/anthropic/rap-agent-prompts.ts`. NL → `{reply, commands[]}` on `claude-sonnet-4-6`, each command re-validated against the same interpreter (`route.ts:24-41`), 503/401 cost gates (`:44-55`), best-effort `tool_runs` log (`:92-101`). **`maxDuration = 30`** (`route.ts:9`).
- **Showcase page:** `(app)/rap/page.tsx` — a polished research showcase of the full Accessibility Harness vision.

### BUILT vs. CLAIMED vs. ASPIRATIONAL

| Capability | Status | Evidence |
|---|---|---|
| One `State` → `deriveGeometry()` → all renderers (parity by construction) | **BUILT** | `geometry.ts:1-13`; `planModel.ts:50`, `stl.ts:53` both call `deriveGeometry` |
| Bay grid, walls, corridors, door/window/portal apertures, 1 void/bay, levels | **BUILT** | `types.ts:51-76`; `interpreter.ts:339-381` |
| 3D view, tactile plan SVG, PIAF 1-bit raster, STL, read-back text, Braille | **BUILT** | `render/*`; `interpreter.ts:306-335`; `braille.ts` |
| Exports: `state.json`, command log, PIAF PNG, STL | **BUILT** | `RapStudio.tsx:136-142` |
| AI = NL→command **compiler** ("coder") | **BUILT** | `rap-agent-prompts.ts:15`; `route.ts:88-89` |
| STL **z-stacks levels** | **BUILT** (renderer-partial) | `stl.ts:60` reads `scene.levels[bay.level]?.z` — but PlanSvg/Scene3D ignore z |
| In-browser real `.3dm` builder (WASM) — *precedent, in Site Analysis* | **BUILT (elsewhere)** | `lib/site-analysis/rhino3dm-client.ts:102-138` — **meshes**, not solids |
| Assistant = **querier + coder + tutor** (3 roles) | **CLAIMED** | page `:52-62, 406-422`; only coder exists (`rap-agent-prompts.ts:15`) |
| `audit` / `render` / `tactile3d export` commands | **CLAIMED (false)** | page `:512-518`; no such verbs in `interpreter.ts:344-381` |
| "Drives Rhino 8" (live) | **CLAIMED (overstated)** | page `:363`; Vercel cannot reach desktop Rhino |
| `state.json` round-trip to desktop controller | **CLAIMED (unbacked)** | page `:607`, `studio/page.tsx:32`; **no import path**, `extra` never populated |
| PIAF "25–40% black-density band" | **CLAIMED (no code)** | page `:116-118`; `piaf.ts:68-77` only thresholds luminance |
| "BANA-compliant braille" | **OVERSTATED** | `braille.ts:1-7` = Grade-1 Unicode cell content only; no dot-pitch geometry |
| Image Describer, TACT MCP (7 fns), The Desk, Watcher | **ASPIRATIONAL / desktop research** | page `:80-133, 479-499`; no code under `api/rap/` except `agent/` |
| Querier/tutor, vision intake, materials, section, rooms, site polygon, curves | **ASPIRATIONAL** | none present in engine/API |

---

## Why it is a layout jig

The ceiling is the **state model** (`engine/types.ts`). It can describe a *column grid with a perimeter*, and almost nothing a studio is actually graded on:

- **No room / program / area.** `Bay` has grid/walls/corridor/apertures/voids — no named space, use, or square footage (`types.ts:51-70`). A studio cannot author "a lobby, three studios, a 1200 sf gallery." This is the single most important missing noun.
- **No section / vertical model in the drawing channels.** Levels exist and **STL already z-stacks** (`stl.ts:60`), but PlanSvg/Scene3D ignore z, there is no section cut, no floor-to-floor design, no slab/stair/ramp. The plan is effectively single-storey to a sighted reader. Section is half of architectural representation.
- **No site context.** `Site` is `origin/width/height` only — no boundary polygon, north, setbacks, contours (`types.ts:78-82`). 3rd-year design *starts* at the site; RAP cannot situate one.
- **No materials/assemblies.** Walls carry only thickness (`types.ts:46-49`); no material identity, layer, or glazing.
- **Geometry is orthogonal grids only.** `Vec2` corners, uniform `i*sx, j*sy` rectangles, columns at every intersection (`geometry.ts:130-146`). `grid_type:'radial'` is declared (`types.ts:52`) but never branched. No polyline, spline, or arbitrary footprint.
- **The grammar is write-only.** The dispatcher has mutators + a canned `describe/list/help` and **no measure/query/area/adjacency/clearance verb** (`interpreter.ts:339-382`). A non-visual designer cannot "glance" — and has no read-only way to interrogate the model.
- **The AI is capped by that grammar.** Every prompt improvement is bounded by the ~25 bay-centric verbs it compiles to. Making the assistant a "swiss-army knife" is blocked on the engine, not the prompt.
- **Inert/declared-but-unread fields** (`grid_type`, `z_order`, `corridor.loading`, `style.*`, `tactile3d.scale_factor`, `meta`, `extra`) look like desktop-controller parity but are dead in the web engine, so the two implementations can silently diverge.
- **The round-trip is asserted, not coded.** Exports exist; there is **no `loadState`/import** path, `extra` (`types.ts:117`) is never populated, and nothing reads a Rhino/Watcher-written file (`RapStudio.tsx:60-142`).

**And the thesis is violated in current code:** the plan/PIAF draw spatial detail the text read-back **never states** — most clearly **door-swing hand and direction** (hinge + leaf + arc, `planModel.ts:88-91`) and the **corridor's dashed-band / single-vs-double loading** reading (`planModel.ts:66-75`; `corridor.loading` is an inert field), neither of which appears in `describe()` (`interpreter.ts:306-335`). A sighted reader gets a richer model than a non-visual one. Closing this gap is the first job, not a nicety.

---

## The vision — RAP as a swiss-army knife for 3rd-year design

RAP's defensible identity is **the one place a third-year (sighted or blind) can author, interrogate, audit, and hand off a whole studio project entirely non-visually** — because every capability exists in all channels at once. The strategy is **in-house first**: grow the canonical state to cover the studio arc, make the assistant answer and teach, and make Rhino an *optional downstream consumer of a file the browser wrote*.

The studio project arc is: **site → program/parti → plan → section / vertical circulation → structure → circulation & life-safety → envelope/materials → representation/crit → fabrication.** RAP today serves ~1.5 stations (structural grid + a thin slice of corridor). The pillars below grow it across the arc.

### Non-negotiable parity gate (governs every pillar)
A new noun ships **only if** it is (1) authorable by command / form / NL, (2) present in `describe()` Macro/Meso/Micro, (3) Braille-labelled where it carries a name, and (4) visible in the tactile plan/section. The page already states this rule (`page.tsx:448-452`); this plan makes it a **build-failing test** keyed on a **registry of semantic feature ids** (e.g. `SITE_BOUNDARY`, `DOOR_SWING`, `CORRIDOR_BAND`, `ROOM`, `ADJACENCY`) — *not* on `DrawPrim.kind` (which is generic shapes and trivially gameable).

### Pillar 1 — The authored building (in-house core state model)
**Adds:** Room/Space over bays (program label, target + computed area, adjacency, brief-coverage audit); real Site object (boundary polygon, north, setbacks, inside-boundary/setback checks); vertical model (PlanSvg/Scene3D honor z; floor-to-floor; slabs/roof; stairs/ramps with slope + clear-width); materials/assembly tags on walls/apertures/slabs; constrained parametric massing (rect/L/U/courtyard). **Curves/freeform NURBS explicitly out of scope.**
**Channels/renderers:** command, form, NL, read-back, Braille, tactile plan, **section (new)**, 3D; PlanSvg, Scene3D, section renderer, PIAF, STL, `.3dm`.
**Non-visual:** each noun passes the four-point gate. Schema versioned `rhino_controller_v4.x`, unknown keys preserved into `extra`.
**Owns vs. links:** RAP **owns** the authored building. **Honor or quarantine** the inert fields so parity is real.

### Pillar 2 — Query + measure + audit (the non-visual user's substitute for scanning)
**Adds:** read-only verbs — `area`, `distance`, `bay-count-deep`, `clearance`, `adjacency`, `reachability`, and an **ADA/egress audit** (door clear widths, ramp slopes, travel distance) returning **spoken pass/fail**; PIAF density meter (the advertised 25–40% band); program-vs-brief coverage audit once rooms exist.
**Channels/renderers:** command, NL, read-back; PIAF (density meter).
**Non-visual:** these verbs **are** the non-visual channel — read-only, spoken-answer-only, never mutating. They give the page's currently-fake `audit` command a real home, and become callable context for the assistant's querier mode. **Zero schema change** — highest leverage per unit effort.

### Pillar 3 — The three-role assistant (answer, teach, compile honestly)
**Adds:** querier `{mode:'query'}` (answers grounded in `state` + `describe()`/measure verbs, no edits); tutor reusing the in-repo **Coach** machinery (`buildSystem` + streaming + conversation persistence) grounded in `describe(state)`; the **honest-reply fix**; optional vision intake (port Coach's `attachmentBlock`).
**Channels:** NL, read-back, command.
**Non-visual:** every assistant action still lands as an auditable plain-text Controller command a screen reader announces; the honest-reply fix guarantees the spoken confirmation never lies. **The assistant's reach equals the grammar's reach**, so every Pillar 1 verb is instantly an AI capability.
**Owns vs. links:** RAP **links** to Coach/Cartographer for software tutoring and skill trails; tutor mode *reuses* Coach infra rather than rebuilding it.

### Pillar 4 — Real exports + verified round-trip (Rhino optional, never required)
**Adds:** native **mesh-based `.3dm`** export reusing `rhino3dm-client.ts` (per-level layers + `TextDot` labels), sharing one box-emitter with a **hardened STL** (vertex-weld + closed-mesh self-check); `loadState()` import + schema-validate + `extra`-preservation + canonicalized round-trip test; later, DXF + a dimensioned/scaled SVG/PDF set.
**Channels/renderers:** export, read-back; `.3dm` (new), hardened STL, PIAF, DXF (later), SVG/PDF set (later).
**Non-visual:** all exports flow from the same `SceneGeometry`/`DrawPrim`, so swell sheet, `.3dm`, and screen agree by construction; import emits a spoken "import report"; the STL self-check reports a spoken closed-mesh pass/fail; dimensions appear as a metric read-back line.

### Own vs. link (so RAP never becomes a GIS+sim+LMS monolith)
| Phase of work | RAP **owns** | RAP **links to** |
|---|---|---|
| Site analysis (boundary, north, sun, contours) | ingest + setback checks | **Surveyor** (`toolkit-nav.ts:19`) |
| Environmental / form-finding | tagging only | **Eco-Architect / Gable Studio** (`:26`) |
| Authored building (program, plan, section, structure, circulation, materials, audits, exports) | **all of it** | — |
| Precedent / reference library | — | **Librarian** (`:44`) |
| Software tutoring / skill trails | tutor *grounded in state* | **Coach / Cartographer** (`:32, :39`) |
| Archiving / pin-up memory | — | **Archivist** (`:51`) |

---

## Talking to Rhino — the decision

**The honest constraint.** A Vercel-hosted page **cannot reach a student's desktop Rhino**: HTTPS→localhost is blocked by mixed-content / Private Network Access, and the cloud has no route to a desktop. This is confirmed and documented (`TOOLS/rap-tactile-cad/WEB-DEMO-AND-RHINO-DRIVE.md`). **"Drives Rhino 8" (page `:363`) is structurally false for the web tool** and must be reworded.

**The all-in-house alternative, and how far it goes.** The repo already proves the only hard part: `lib/site-analysis/rhino3dm-client.ts:102-138` builds a real, multi-layer `.3dm` **in the browser** via rhino3dm WASM loaded at click-time (`File3dm`/`Layer`/`Mesh`/`addMesh`/`addQuadFace`/`addPolyline`/`addTextDot`/`toByteArray`) with no server WASM and zero function cost. **Important correction to the optimistic framing:** that client emits **meshes and polylines, not solid Breps/Extrusions.** So native `.3dm` is *a mapping onto the existing mesh pattern*, not a trivial port to solids — and emitting watertight solids is the **same manifold problem** as STL. Ship a **mesh `.3dm`** that shares one box-emitter with the STL, so manifoldness is solved once. In-house then reaches: rooms/section/structure/program/ADA audits, real `.3dm` + DXF + dimensioned SVG/PDF, query + tutor — **a student with zero desktop install gets real Rhino-native geometry, and a student who wants Rhino opens the file with one click.**

**Where in-house honestly stops:** a live bidirectional session with an open Rhino (needs an off-site local companion); true freeform NURBS surfacing (RAP stays constrained-parametric for accessibility anyway); structural/energy simulation (link to siblings).

### Staged Rhino path
| Stage | What | Effort | Recommendation |
|---|---|---|---|
| **R0 — honesty** | Reword "Drives Rhino 8" → "Exports the same `.3dm` / `state.json` Rhino 8 rebuilds"; fix the fake command readout; label the desktop Watcher as off-site research. | **S** | **Do now**, ahead of everything. |
| **R1 — native `.3dm`** | Mesh `.3dm` export button beside STL/PIAF; one shared box-emitter with hardened STL; `TextDot` labels; per-level layers. Label "baked snapshot," not live drive. | **M** | **Go** (re-scoped to mesh). The in-house "talks to Rhino" proof. |
| **R2 — import + round-trip** | `loadState()` + schema-validate + `extra`-preservation + canonicalized round-trip test; conformance harness **gated on real desktop-written golden fixtures**. | **M** | **Go** on import/round-trip; harness only with committed fixtures. |
| **R3 — more formats** | Extend `.3dm` as nouns land; DXF + dimensioned SVG/PDF. | **M** | **Defer**, additive. |
| **R4 — local companion / live drive** | Packaged off-site companion serving the UI from localhost and relaying to the desktop Watcher (TCP 1998); Rhino.Compute/Hops only for server geometry. | **L** | **Defer / off-site only.** Never imply it ships in the browser. |

**Recommendation: lead all-in-house.** Make `.3dm` the proof that "talks to Rhino" is true, zero-install, and downstream-optional. Treat live drive (R4) as clearly-labelled desktop research, revived only if John confirms it is load-bearing for the ACADIA story.

---

## Roadmap

> Sequencing reflects the adversarial revised priorities: hotfixes first (one is an active misinformation bug), then a parity + schema-decision foundation, then **answer + hand off** (cheap, no schema change), then the schema-bumping breadth. Effort: **S/M/L/XL.**

### Phase 0 — Tell the truth (parity + honesty foundation)
**Theme:** make the showcase, the read-back, and the round-trip honest before adding anything, so later capability lands on drift-detected ground and the parity thesis is enforced, not asserted.

| Item | Effort | Deps |
|---|---|---|
| **Honest assistant reply** — when `validateCommands` keeps fewer than emitted, annotate `reply` (or announce actual applied/failed counts) so the screen-reader announcement matches reality (`route.ts:88-89`, `RapStudio.tsx:129`). **Ship as a standalone hotfix this week.** | S | — |
| **Fix the command-readout bug + Rhino copy** — page `:512-518` shows `audit`/`render`/`tactile3d export` (nonexistent) **and** invalid syntax for real verbs; reword "Drives Rhino 8" (`:363`); qualify "BANA-compliant" → "Grade-1 braille cell content." | S | — |
| **Page a11y compliance + status chips + PIAF density meter** — replace grey di-doc text (`#666/#555/#444/#777`, `page.tsx:188-281`) with `#111`/`neutral-900` (project rule #4); add per-capability **Live / Desktop research / Planned** chips; implement the density meter (`piaf.ts:68-77`). | M | — |
| **Read-back parity audit + build-failing test** — extend `describe()` (`interpreter.ts:306-335`) to cover site boundary, door-swing hand/direction, corridor-band meaning, voids, adjacency; add a **registry-of-semantic-feature-ids** test that fails if a registered feature lacks a `describe()` sentence + Braille label. | M | — |
| **Schema OWN-vs-FORK decision** — with John, *before any new noun*: either commit real desktop-written golden fixtures + a real conformance harness, **or** freeze the web schema at v4.0 and put all new web-only nouns under a documented `extra.*` namespace. | M (decision) | — |
| **`loadState` import + canonicalized round-trip** — validate `schema=='rhino_controller_v4.x'`, map known fields, write unknown keys to `extra` (`types.ts:117`, never populated); canonicalize (sort keys, round floats, drop volatile `meta`) and test against ≥1 genuinely desktop-authored fixture. | M | schema decision |

**Exit criteria:** the assistant never announces a change that did not apply; the showcase contains no command that errors in the live tool, no grey text, no overstated Rhino/BANA claim; a parity test guarantees every *registered semantic feature* has a read-back sentence + Braille label; a round-trip fixture proves import/export equality and populates `extra`; the schema ownership question is settled.

### Phase 1 — Answer + hand off (querier, audit verbs, native `.3dm`)
**Theme:** turn the write-only compiler into something that **answers**, and make "talks to Rhino" true in-house — both cheap because neither needs the big schema change.

| Item | Effort | Deps |
|---|---|---|
| **Read-only query/measure/audit verbs** — `area`, `distance`, `bay-count-deep`, `clearance`, `adjacency`, `reachability`, ADA/egress audit over `deriveGeometry` output; spoken pass/fail. Gives the page's `audit` a real home. **Cite ADA thresholds honestly.** | M | Phase 0 parity test |
| **Querier mode `{mode:'query'}`** — skip compilation, feed `state` + `describe()`/measure output, return spoken answers. **Keep single-shot. Bump `maxDuration` to 60** (`route.ts:9`). Remove the double `as any` on `messages.create` (`route.ts:71-77`). | M | query verbs |
| **Native mesh `.3dm` export** — button beside STL/PIAF (`RapStudio.tsx:152-155`) reusing `rhino3dm-client.ts`; bays/walls/columns/levels → per-level layered meshes + `TextDot` labels. Share box-emitter with STL. | M | Phase 0 round-trip |
| **Manifold STL** — vertex-weld + box-union coincident wall/floor/column faces (`stl.ts:59-74`) + a closed-mesh self-check reporting a spoken pass/fail. | M | (shared emitter with `.3dm`) |

**Exit criteria:** a non-visual user can ask "how many columns?", "is the door reachable?", "does it pass ADA?" and get a spoken answer; a student can download a `.3dm` that opens in Rhino and an STL that passes a closed-mesh check — all without touching the core schema.

### Phase 2 — Represent the brief (program/room layer)
**Theme:** add the single highest-leverage primitive — named spaces with use, target area, computed area, adjacency. **First real schema bump; do not start until Phase 0's OWN-vs-FORK decision lands.**

| Item | Effort | Deps |
|---|---|---|
| **Room/Space primitive + verbs** — `Room` (id, label, program, target_area, boundary, computed area, adjacency) layered over bays; `room add/set/list`; per-room `describe()` line; Braille label; tactile-plan room mark; room fill in `.3dm`/DXF/SVG. **Decide bay-relative-rect-set vs general polygon** (sizes the phase). | L | Phase 0 schema + round-trip |
| **Program-vs-brief coverage audit** — spoken pass/fail building on Phase 1 measure verbs. | S | Room primitive; Phase 1 audit |
| **Schema v4.1 (or `extra.*`)** — per the Phase 0 decision; every field exercised by the conformance harness; rooms auto-flow into forms + AI grammar via `runCommand`. | S | Room primitive |

**Exit criteria:** RAP can author "a lobby, three studios, a 1200 sf gallery," read each room back in every channel, and spoken-audit whether the plan houses the brief.

### Phase 3 — Section + vertical circulation
**Theme:** the strongest RAP-specific, accessibility-native differentiator. **Re-baselined M (not L): STL already z-stacks (`stl.ts:60`)** — the work is mostly renderer + authoring, not a from-scratch vertical model.

| Item | Effort | Deps |
|---|---|---|
| **Make all renderers honor z** — PlanSvg/Scene3D read `levels[].z` (STL already does); reconcile storey count/heights across channels in one change; read-back line stating storeys + floor-to-floor. | M | Phase 2 |
| **Section-cut renderer through the same `DrawPrim` pipeline** — cut at a chosen level; auto-gets SVG preview, PIAF, read-back, `.3dm`/DXF. | M | z in geometry |
| **Stairs/ramps with slope + clear-width audit** — drawn in plan + section, read back, feeding the Phase 1 ADA audit. | M | section renderer; Phase 1 audit |

**Exit criteria:** a student can design and read a section non-visually, stack real floors, place code-relevant vertical circulation; the multisensory-section thesis has an actual engine, all channels agreeing on storey count.

### Phase 4 — Tutor, vision intake, site + materials (deferred breadth)
**Theme:** complete the three roles and round out the arc, reusing Coach infra. **None is paper-critical if querier ships.**

| Item | Effort | Deps |
|---|---|---|
| **Tutor mode on Coach infra** — `skills-coach` `buildSystem` + streaming + persistence, grounded in `describe(state)`; multi-turn memory (`rap_agent_conversations/messages`); streaming, higher `max_tokens`. | M | Phase 1 querier |
| **Real Site object + Surveyor ingest** — replace bare rectangle (`types.ts:78-82`) with boundary polygon, north, setbacks; ingest Surveyor output; inside-boundary/setback checks read back. | M | Phase 2 schema pattern |
| **Materials/assembly tagging + dimensioned drawing set** — tags carried into `.3dm` layers + non-visual material read; titled, scaled, dimensioned SVG/PDF (plan+section+key) with metric in both channels. | M | Phase 3 section |
| **Vision intake (high-risk, last)** — port Coach's `attachmentBlock`; **force output through a "I read N bays at S ft; confirm?" read-back gate before applying** — never silently seed from an image. Needs `rap-uploads` bucket + RLS + image spend. | M | tutor mode |

**Exit criteria:** all three AI roles ship; a student can situate a model on a real site with setback checks, tag materials, and export a defensible dimensioned set.

### Phase 5 — Constrained parametric massing (deferred research arc)
**Theme:** let students test a parti before committing to a grid, **without breaking non-visual authorability.** Constrained primitives only; freeform NURBS stays an explicit export boundary.

| Item | Effort | Deps |
|---|---|---|
| **Constrained massing primitives** — rect/L/U/courtyard with spoken read-back + tactile mark. | L | Phase 3 |
| **Generalize `Vec2`-only geometry toward a boundary primitive** — vertex+segment with spoken-confirmation grammar (`geometry.ts:130-146`). **The one item that genuinely risks the screen-reader-first thesis.** | XL | massing primitives |
| **Page copy: name the in-house boundary** — freeform NURBS = export-and-import / future research, not an in-house claim. | S | — |

**Exit criteria:** parti exploration with full channel parity; freeform NURBS documented as a later research arc, reached only after program + section prove the parity workflow scales.

---

## Quick wins
Start these immediately; none needs a schema change, most are copy or small route edits.

- [ ] **Hotfix the lying assistant** — annotate `reply` when fewer commands applied than emitted (`route.ts:88-89`; `RapStudio.tsx:129`). The most acute accessibility defect: it tells a blind user "I widened the corridor" when nothing changed.
- [ ] **Fix the showcase command readout** — `page.tsx:512-518` shows nonexistent verbs (`audit`/`render`/`tactile3d export`) *and* invalid syntax for real ones; rewrite to copy-pasteable grammar (`interpreter.ts:386-411`).
- [ ] **Reword "Drives Rhino 8"** → "Exports the same `.3dm` / `state.json` Rhino 8 rebuilds" (`page.tsx:363`).
- [ ] **Qualify "BANA-compliant braille"** → "Grade-1 braille cell content (Unicode)" (`braille.ts:1-7`).
- [ ] **All-black-text compliance** — replace `#666/#555/#444/#777` in the di-doc STYLES block with `#111`/`neutral-900` (`page.tsx:188-281`).
- [ ] **Per-capability status chips** — Live in Studio / Desktop research / Planned across Tools 01–05, the modes grid, Image Describer, TACT MCP, The Desk.
- [ ] **PIAF density meter** — count black/total after thresholding, surface %, warn outside 25–40% (`piaf.ts:68-77`).
- [ ] **Extend `describe()`** to state door-swing hand/direction and corridor band / single-vs-double loading semantics the plan already draws but the read-back omits (`planModel.ts:66-91`) — closes the worst parity gap, mostly prose.
- [ ] **Remove the double `as any`** on `messages.create` so the SDK validates the structured-output shape (`route.ts:71-77`).
- [ ] **Querier `{mode:'query'}`** — return `describe(state)`/`listBays()` as a spoken answer, no compilation. Cheapest path to a promised role, zero engine change.

---

## Risks & guardrails

**Accessibility parity (the thesis).**
- The plan/PIAF already draw **more than read-back conveys** — a live thesis violation. Phase 0 read-back parity is a **hard prerequisite for every later phase**; no Phase 2+ primitive merges until its `describe()` sentence + Braille label exist *in the same PR*.
- **Do not gate parity on `DrawPrim.kind`** (line/fill/circle/text are generic and trivially game the test). Gate on a hand-maintained **registry of semantic feature ids**; the registry *is* the contract and is reviewed in PRs.
- **Section/3D z parity:** STL stacks levels but PlanSvg/Scene3D do not — already a channel disagreement. Reconcile z across all renderers in **one** Phase 3 change, with a read-back line stating storeys + floor-to-floor.
- **Massing/boundary (Phase 5)** is the one lift that can break non-visual authoring (`add vertex`/`fillet` grammars are hard to author/read non-visually). Keep it **deferred and constrained-parametric**; freeform NURBS stays out of scope.
- **BANA claim** is an overpromise to the exact population RAP serves: `braille.ts` controls cell content, not physical dot pitch/spacing. Copy fix in Phase 0.

**Schema / round-trip integrity (the scope bomb).**
- The `rhino_controller` schema is shared with a **desktop controller not in this repo and not CI-testable here.** Six potential schema bumps (room/site/material/slab/stair/massing) with **no in-repo second implementation to diff** is the gable-studio parity trap at scale.
- **Mitigation:** settle OWN-vs-FORK in Phase 0. Either commit *real desktop-written golden fixtures* (a circular harness that tests the web engine against its own output detects nothing), **or freeze the web schema at v4.0 and namespace all new nouns under `extra.*`** so round-trip stays lossless by construction.
- **Round-trip "semantic-equal"** needs an explicit canonicalizer (sort keys, round floats, drop volatile `meta`) and ≥1 genuinely desktop-authored fixture — not a web-exported one.

**Cost & Vercel limits.**
- **`maxDuration = 30`** (`route.ts:9`), *not* the 60 the optimistic plan assumed. Bump to 60 explicitly. Keep querier/coder **single-shot**. **Do not build a multi-step AI tool-use loop on Hobby** — sequential Sonnet round-trips under a 30–60s ceiling will intermittently time out and leave a screen-reader user with a dead spinner. Resolve compound references ("largest bay") by **injecting `describe()`/measure output into one prompt**.
- API routes already **401 for anon** and log to `tool_runs` — preserve this on every new mode/route.
- **Vision intake** adds a Supabase bucket + RLS + Sonnet image spend (net-new infra, not "copy-paste") and a flow that is **dangerous when wrong for the primary non-visual user** (a confidently-wrong seed is worse than none). Defer past the workshop; gate behind explicit read-back confirmation.

**Scope / overpromise.**
- The full pillar set is a near-complete re-architecture into a general CAD app (5 phases of L/XL). For the **ACADIA 2026 paper, the deadline-critical question is which 3–4 items make the paper honest**, not which 30 make RAP a swiss-army knife. **Page overclaiming is the biggest credibility risk and costs only copy** — fix it first.
- **`.3dm` is *not* "a mapping, not new infrastructure" as stated** — the precedent emits meshes, not solids. Ship a **mesh `.3dm`** sharing the STL box-emitter, labelled "baked snapshot," or you reproduce in code the exact overpromise the review condemns.
- **Export-format proliferation** (DXF, dimensioned SVG/PDF, GLB, sonification) is classic creep — each is its own build *and* a fresh parity obligation (metric in both channels). Defer; add additively only after rooms/section give them something worth dimensioning.

---

## First tasks for the next agent

Ordered; start at the top. Branch off `main` (never push to `main` without John's OK). Keep `platform/STATUS.md` current with your stream/branch/files.

1. [ ] **Hotfix — honest reply.** In `platform/apps/toolkit/src/app/api/rap/agent/route.ts:88-89`, compute applied vs. emitted; when fewer applied, annotate `reply` (or have `RapStudio.tsx:123-130` announce actual applied/failed counts). Add a test with a state where every emitted command fails validation.
2. [ ] **Hotfix — showcase copy.** In `platform/apps/toolkit/src/app/(app)/rap/page.tsx`: rewrite the readout (`:512-518`) to real grammar from `engine/interpreter.ts:386-411`; reword "Drives Rhino 8" (`:363`); qualify BANA (find the braille claim); replace grey STYLES (`:188-281`) with `#111`/`neutral-900`; add Live/Research/Planned chips.
3. [ ] **Confirm the schema decision with John** (open question below) **before touching `engine/types.ts`.** Record the outcome in `platform/STATUS.md`.
4. [ ] **Read-back parity registry + test.** Define a semantic-feature enum; extend `describe()` in `platform/apps/toolkit/src/app/(app)/rap/studio/engine/interpreter.ts:306-335` to cover site boundary, door-swing, corridor band, voids, adjacency; add the build-failing registry test.
5. [ ] **`loadState` import + canonicalized round-trip test.** Add to the engine; populate `extra` (`engine/types.ts:117`); add a fixture (desktop-authored if available) and a canonicalizer.
6. [ ] **PIAF density meter** in `platform/apps/toolkit/src/app/(app)/rap/studio/render/piaf.ts:68-77`; surface % in the export UI; warn outside 25–40%.
7. [ ] **Query/measure/audit verbs** in `engine/interpreter.ts` (extend the dispatcher at `:339-381`), computing over `deriveGeometry()` (`engine/geometry.ts:115-272`); spoken pass/fail. Then **querier `{mode:'query'}`** in `route.ts`; bump `maxDuration` to 60; remove the double `as any` (`:71-77`).
8. [ ] **Native mesh `.3dm` + hardened STL.** New exporter reusing `platform/apps/toolkit/src/lib/site-analysis/rhino3dm-client.ts`; share one box-emitter with `platform/apps/toolkit/src/app/(app)/rap/studio/render/stl.ts` (weld + closed-mesh self-check). Wire a "Download .3dm" button near `RapStudio.tsx:152-155`.

> Each new noun/verb after this must pass the four-point parity gate **in the same PR.** Flip the tool's `status` in `lib/toolkit-nav.ts` and note progress in `platform/STATUS.md`; open a PR, don't self-merge to `main`.

### Open questions for John (resolve before Phase 2)
1. **Schema ownership** — commit real desktop golden fixtures and keep the desktop `rhino_controller` in lockstep, or **fork the web schema** (new nouns under `extra.*`)? Gates every Phase 2+ field.
2. **Paper framing** — how much of querier/tutor/Image-Describer/TACT-MCP/The-Desk/"Drives Rhino 8" must be *built* vs. honestly *labelled* for ACADIA credibility? Sets whether querier (Phase 1) and tutor (Phase 4) are deadline-critical.
3. **Live drive** — is "type in the browser, watch Rhino move" load-bearing for the paper, or is export-and-import enough? (Live needs an off-site companion the platform can't ship.)
4. **Room shape** — bay-relative rect set (ships sooner, stays orthogonal) or general polygon from day one (more honest, pulls XL boundary work forward)? Sizes Phase 2.
5. **Surveyor → RAP site import** — wire now or defer to Phase 4?
6. **Vision intake** — acceptable cost/scope for the cohort, or defer past the workshop?

---

## Appendix — per-area review findings

### Engine + data model (`engine/*`)
Clean bay-centric reducer with **true renderer parity** (`geometry.ts:1-13`), pure/immutable reducers whose `OK:/ERROR:` strings double as screen-reader confirmations (`interpreter.ts:37-39`), and an auditable shared grammar (`interpreter.ts:386-411`). **Gaps:** no room/program/area, no section/vertical model in drawing channels, no site boundary, no materials, no curves; **write-only grammar** (no measure/query — `interpreter.ts:339-382`); inert declared fields; **no import path** — round-trip asserted, `extra` never populated. Key files: `engine/{types,interpreter,seed,geometry,braille}.ts`.

### Renderers + exports (`render/*`)
The strongest, most honest layer: single-source `DrawPrim`/`SceneGeometry` means screen == swell sheet by construction; PIAF is genuinely 1-bit (`piaf.ts:68-77`); STL implements the tactile "cut" and **already z-stacks levels** (`stl.ts:60`). **Gaps:** PIAF density band is **page copy with no code**; "BANA-compliant" overstated; **STL is triangle-soup, not provably manifold** (`stl.ts:59-74`); **no section/elevation/axon** despite the hero image; **renderers exceed the read-back** (parity violation). Key files: `render/{Scene3D,PlanSvg,planModel,piaf,stl}.ts(x)`, `lib/site-analysis/rhino3dm-client.ts`.

### AI assistant + API (`api/rap/agent`)
A clean, honest, auditable **NL→command compiler** on `claude-sonnet-4-6`, with strong `validateCommands` safety (drops hallucinated commands — `route.ts:24-41`), correct cost gates and logging. **Gaps:** **only "coder" of querier/coder/tutor** (`rap-agent-prompts.ts:15`); stateless/single-turn; no vision; **`reply` trusted verbatim while commands filtered separately** (`route.ts:88-89`) — can announce a change that did not apply; hard-capped by the bay-only grammar; `maxDuration = 30` (`route.ts:9`); double `as any` defeats SDK type-checking. Reuse precedent: `api/skills-coach/route.ts`, `lib/anthropic/skills-coach-prompts.ts`. Key files: `api/rap/agent/route.ts`, `lib/anthropic/rap-agent-prompts.ts`.

### Pedagogy + capability gap
RAP serves ~1.5 of the studio arc's stations (structural grid + a slice of circulation). **No program/rooms** (the thing graded first), **no section**, **coder-only assistant**, orthogonal-grids-only geometry, bare-rectangle site, no materials. Highest-leverage additions in order: **query/audit verbs → rooms → section/vertical circulation**; **link** (not rebuild) Surveyor/Eco-Architect/Librarian/Coach/Cartographer/Archivist (`lib/toolkit-nav.ts:16-81`). Make the four-point parity check a **hard PR gate**, not a convention (`page.tsx:448-452`). Key files: `engine/{types,interpreter,geometry,seed}.ts`, `page.tsx`, `lib/toolkit-nav.ts`.

### Showcase page accuracy (`page.tsx`)
Polished and well-framed (scopes "Now live" to the studio, hedges horizons), but with concrete overclaims: a **command readout showing nonexistent verbs + invalid syntax** (`:512-518`), **querier/tutor/Image-Describer/TACT-MCP/The-Desk presented as shipping** (`:52-62, 80-133, 406-422, 479-499`), **"Drives Rhino 8"** (`:363`), **asserted round-trip** (`:607`), unimplemented **PIAF density band** (`:116-118`), and a **whole-page grey-text violation** of project rule #4 (`:188-281`). Vision/build gap is acceptable for a research showcase; presenting unbuilt behavior as shipping is not. Key files: `page.tsx`, `studio/page.tsx`, `engine/interpreter.ts`.

---

## How this document was produced

A multi-agent review of the RAP tool, run on 2026-06-26. Seven reviewers each took one lens (engine/data model, renderers/exports, AI assistant/API, accessibility/parity, pedagogy/capability gap, Rhino integration, showcase-page accuracy); three further agents proposed the swiss-army-knife direction from distinct stances (in-house-first, Rhino-coupled, pedagogy-first); a synthesis pass merged them; an adversarial pass stress-tested feasibility, accessibility parity, scope, and cost. Every load-bearing `file:line` claim in this document was re-verified against the source before it was written down — including the corrections that override the more optimistic synthesis (STL already z-stacks levels at `stl.ts:60`; `route.ts:9` caps at `maxDuration = 30`; the in-browser `.3dm` precedent emits meshes, not solid Breps).
