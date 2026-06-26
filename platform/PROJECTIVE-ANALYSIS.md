# Projective Analysis: From Architecture Studio to a General-Purpose Toolkit for Student Designers

*Prepared for John Clark — All Means Works / Design Toolkit · build plan + reframe*

---

## 1. Reframe — it's a studio pedagogy engine, not an architecture toolkit

The toolkit reads as architecture-specific, but the code tells a different story: roughly 70% of it is discipline-neutral *studio pedagogy* wearing an architecture skin. Coach, Cartographer, Librarian, Archivist, the Critic stub, and RAP's accessibility thesis are field-agnostic by construction; the genuinely architecture-bound surface is concentrated in exactly **two** tools — Surveyor's US-geographic data pipeline (`datasources.ts`: EPA/USGS/FEMA/Open-Meteo) and Eco-Architect's Rhino round-trip (Gable's `core.js` building-physics solver). Those two become the *depth of an architecture pack*, not the assumed center. The codebase has already pierced its own skin once: `pathways.ts` defines `type Section = Discipline | "design-theory" | "architectural-media" | …` and its author note calls it "a superset of the software Discipline plus broader lanes." Coach's prompt is already a fragment-assembler (`BASE_ETHOS + DISCIPLINE_MODULES[d] + LEVEL_MODULES[lvl]`). The seam to widen exists.

**What must NOT change (structure).** The pedagogical spine is the whole value proposition — it is what makes each tool more than "ChatGPT with a skin." Every tool carries a *named structural refusal*: cite-or-abstain (Surveyor), abstain-don't-guess vision (Librarian), the human-only CONVERGE the model is blocked from performing (the Crit Engine spec), export-locked-until-edited prose (portfolio spec). Keep claim-tags, the trace/provenance, report-back gates, the student-stays-the-cognitive-agent stance, the D0 equity floor, and screen-reader-first accessibility *as invariant structure*.

**What is allowed to vary (content) — the spine has a discipline axis, and that's fine.** The single deepest question in this whole reframe (§7) is whether "parti is never generated / convergence is human-only" survives in graphic, game, and fashion, where AI image-generation is *normalized*. The provisional answer that keeps the rest of this document's "parameterize, don't rebuild" method intact: **keep the refusal STRUCTURE invariant, make the refusal CONTENT a per-pack string.** Add a `pedagogicalStance` field to each pack config, alongside `conceptRows` and `docRoots`:
- Architecture: *"the parti is never generated; convergence is human-only."*
- Graphic / comms: *"the generated image is a reference to argue with, never the deliverable; the student's edit is the deliverable."*
- UX: *"the AI may map the flow; the decision about what the user actually needs is the student's."*

This converts the scary "the spine itself has a discipline axis" into a small, typed, additive seam — the same shape as everything else in §4. It is the *one* place generalization is not literally free, but it is one string per pack, not a rebuild.

**Ring-fence the architecture depth.** The Rhino round-trip and the cited hard-data pipeline are the credibility anchor; a graphic student should never see Rhino language, but an architecture faculty member must still find the toolkit trustworthy. Generalization is mostly a *typed refactor plus parallelizable, vetted content authoring* — but the shared primitives must be consolidated **before** disciplines multiply, because the spine is *already forking* (see §5).

---

## 2. Resorting the toolkit

### Organizing metaphor: the studio as a building

A shared **Foundation** (honesty + cost + provenance substrate every tool stands on), addressed by **Discipline Packs** (the program that fits out each floor), organized along the studio's own **work arc** — Research → Ideate → Critique → Make/Represent → Present/Defend — threaded by **Studio Ops** connective tissue, and *cross-cut by an Access lane* (§5) that any discipline inherits.

**Primary axis: the studio work arc**, crossed by a *discipline-pack selector* and a *D0/D1/D2 tier*. A graphic, UX, product, landscape, or architecture student walks the same arc in their own vocabulary, with their own equity floor.

### Category scheme (every existing tool mapped)

| Category | What it does | Existing tools mapped in |
|---|---|---|
| **Foundation** (substrate) | Shared primitives so the pedagogy doesn't fork: one honesty kit, one cost+trace route spine, one tier switch, a pack registry, a project thread, an accessibility contract, the RAP renderer core, an exporter interface | *(none yet — extract from Surveyor/Coach/Librarian/RAP)* |
| **Research** — read the ground | Gather + verify context and precedent before making | **Surveyor**, **Librarian** |
| **Ideate** — push a move, watch it respond | Constraint-driven divergence; encode intent as testable rules | **Eco-Architect** |
| **Critique** — make the lens explicit | Adoptable, labeled critique personas + the human-only converge | **Critic** (stub) |
| **Make / Represent** — the per-discipline gap | Discipline-specific representation tooling | **2D Tooling** (stub), **3D Tooling** (stub) |
| **Present / Defend** | Rehearsal + portfolio narrative; the student's edits are the artifact | *(gap — Critic stub half-promises it)* |
| **Studio Ops + Metacognition** | Thread the project, grade the trace, the wall | **Archivist**, the trace (`tool_runs`) |
| **Access (cross-cut)** | Non-visual/tactile rendering + alt-text + WCAG as a shared, inheritable lane | **RAP** (+ Describer, Inspector once built) |

### Proposed sidebar / nav

```
OVERVIEW
─ FOUNDATION
    Studio        (project hub + the Trace, later)
─ RESEARCH
    Surveyor      · Librarian      · Assessor*
─ IDEATE
    Eco-Architect (Composer modes)
─ CRITIQUE
    Critic        · Loopmaster*
─ MAKE / REPRESENT
    Stylist*  · Drafter*  · Modelmaker (3D viewer)*  · Describer*
─ PRESENT / DEFEND
    Advocate*
─ STUDIO OPS
    Archivist     · Chronicler*  · Quartermaster*
─ ACCESS  (cross-cut, inherited by every pack)
    Inspector*  · Describer*  · RAP
   ────────────
   [ Pack: Architecture ▾ ]   [ Tier: D0 floor ▾ ]   (global selectors)
```
*(\* = proposed; see §3.)*

### Renames / reframes
- **Surveyor** keeps its name and its key (`site-analysis`) and **stays the architecture/spatial flagship.** It does *not* itself widen (see §4 for why); its discipline-neutral *chassis* is lifted into a separate scaffold.
- **Eco-Architect** keeps its name for the architecture pack; the generalized solver surfaces as **Composer** modes for non-spatial media.
- **2D Tooling → Drafter**; **3D Tooling →** split into a neutral **Modelmaker** (Three.js viewer) plus Drafter/Stylist widgets — retire the arch-coded "Tooling" framing.
- "The trace" (debug log) → **the Studio thread** (project-keyed, provenance-shaped), surfaced by **Chronicler**.

### Awkward-fits resolution
- **RAP** is not a discipline tool — it's the **accessibility backend and the practice's signature.** Keep RAP-studio as the research showcase, but extract only its *genuinely portable tail* (`braille.ts`, the read-back text formatter) into a tiny shared a11y lib. The geometry/renderer core is a building-floor-plan engine and must **not** be sold as "any tool inherits tactile rendering for free" — that claim is false at the data-model level (no other tool emits `rhino_controller_v4.0` state). What *does* generalize is the stance (see the Access lane, §5).
- **The Tooling buckets** are where most net-new make-layer budget goes, but as *single client-side widgets*, not multi-widget benches (see §3 / §6).

### Structural gaps (the load-bearing ones, verified in code)
1. **Claim-tags have already forked into two dialects:** `{verified | plausible-unverified | likely-hallucination}` (site-analysis, Librarian) vs `{stable | version | check}` (Coach `MessageBubble.tsx`), with **duplicated chip renderers**. Unify before a third pack invents a fourth.
2. **No project thread.** Library has `project_id` (migration 0003), Pinup has a free-text `project`, Coach keys `conversationId`, Surveyor/RAP have none. Cross-tool handoff is *unexpressible in the data*.
3. **`tool_runs` is a debug log, not provenance.** It is `{id, owner, tool, input, output, created_at}` — no `project_id`, no kept/changed/rejected/verified field. "Grade the trace" is unsupported by the schema.
4. **D0 is asserted in docs but is not a code tier.** Every LLM tool is binary: signed-in spends the campus key, or 401. At 8+ disciplines on one shared key, this is the cost *and* equity break-point.
5. **The architecture `Discipline` enum is the literal lock-in.** Note: it is **software** (rhino/grasshopper/autocad/revit/adobe/general), *not* design field — a graphic and a UX student both pick "adobe." Generalizing needs a **new Field axis**, not a renamed enum.
6. **Accessibility is real in RAP, leaky elsewhere** (STATUS.md admits site-analysis still ships neutral greys + ARIA-less charts). Needs an enforced contract before color-heavy disciplines regress it.
7. **The make-layer is the consistent per-discipline gap** — research/critique/coach/present are covered; discipline-specific *represent* tooling is thin.

---

## 3. New tools to build

**Sequencing convention** (honest about a solo maintainer): every entry below is scoped to its *smallest credible version*. Where a candidate claimed reuse of something that doesn't exist yet (a "DisciplinePack registry," "Inspector rule packs," "Adobe MCP wired into routes," an "Exporter interface"), I've folded the verdict in and cut the scope accordingly.

**Effort yardstick (anchors the S/M/L letters):** **S** = single PR, no migration, no new auth surface. **M** = a new route *or* a new table (one of the two). **L** = multi-tool integration *or* a new auth/visibility surface. This is why Critic is **M** (new route, no migration) while Composer is **M** (new static tool, no migration but a real solver) and the studio hub is **L** (multi-tool + a FERPA visibility surface).

### At-a-glance roster

| Persona | Category | One-liner | Runs-as | Reuses (real) | Effort (v1) | When |
|---|---|---|---|---|---|---|
| **Studio Kit** | Foundation | One canonical ClaimTag + ClaimChip (kill the live fork) | shared lib, no hosting | site-analysis types, Coach chip, Librarian chip | **S** | now |
| **Route Spine** | Foundation | `withCostGuard` + `logTrace` collapse 7 copy-pasted 401 blocks | serverless wrapper | the 7 duplicated auth blocks, `structured.ts` | **S** | now |
| **Critic** | Critique | Finish the stub: adoptable, labeled critique personas | LLM serverless + D0 replay | Librarian upload/vision route, claim-tag chip | **M** | now |
| **Inspector — WCAG bench** | Access / Make | Deterministic contrast/target-size checker, cite-the-clause | static, no key | claim-card UI pattern | **S** | now |
| **Field axis (Coach)** | Foundation | Add a *design-field* fragment to Coach, separate from software enum | shared content lib | Coach fragment-assembler | **S** | now |
| **Assessor** | Research (arch pack) | Deterministic zoning rules-as-data + cite-or-abstain gloss + Objection Tennis | static D0 engine + LLM gloss | **code-zoning-agent spec**; Surveyor parcel/zoning import; exports to form-helper | **M→L** | next |
| **Advocate** | Present | Rehearsal + portfolio; the student's edits are the deliverable | static D0 + LLM | portfolio-storyteller spec, voice-diff (net-new) | **M→L** | next |
| **Chronicler** | Studio Ops | Reads a student's own trace back to them | web + Supabase (D0 readout) | `tool_runs` (select-own), provenance log convention | **M** | next |
| **Loopmaster** | Critique | Solve one brief twice (vibe vs crit); grade the tape | static D0 single-file HTML | ClaimChip glyph; canned transcripts | **M** | next |
| **Composer (Graphic)** | Ideate | Push a move, watch *real* metrics flip (WCAG, balance) | zero-build static | Gable's ~65 portable vector/rule lines | **M** | next |
| **Describer** | Access / Make | Alt-text + long-desc writer that abstains when unsure | LLM serverless (vision) | precedent-archive `alt.js`, Librarian route wrapper | **S** | next |
| **Modelmaker** | Make | Drop a .glb into a shareable viewer | client-only static | RAP's three/r3f deps | **S** | next |
| **Drafter** | Make | Threshold + 1-bit export for scans (tactile/print) | client-only static | RAP `piaf.ts` canvas approach (as model) | **M** | later |
| **Conductor** | Make | Storyboard + manual timing (D0 only) | client-only static | — | **S→L** | later |
| **Curator** | Research | Local non-destructive precedent lens (Obsidian-compatible) | local app over filesystem | **already built** in `TOOLS/precedent-archive/` | **S** (distribute) | later |
| **Quartermaster** | Studio Ops | Static brief + crit calendar (content-in-code) | static, no DB | pathways content-in-code pattern | **S** | later |

**Specs considered and parked (so the reader knows they weren't missed):** `form-helper` (the constraint-to-massing target Assessor and a future zoning-envelope mode export *into* — build only once Assessor produces constraints worth consuming); `rhino-wizard` (folds into the existing 3D Tooling/Modelmaker lane as the Rhino/GH code-gen mode, architecture-only, deferred behind the make-layer); `precedent-librarian` (the *online, vision-backed* cousin of Librarian — distinct from the *local-filesystem* precedent-archive that becomes Curator; its capabilities are already substantially covered by the live Librarian, so it stays parked rather than ported); `rap-tactile-cad` (the RAP source spec — already live as the research flagship; the only extraction is the a11y tail, §5).

### The standout seven (short prose)

Each carries a **done-when** acceptance bar — for a solo maintainer directing Claude Code, the acceptance bar *is* the spec.

**Critic (now) — finish the stub as the first pack-aware tool, as a Librarian clone.** Critique is the single most discipline-portable workflow in design education, and the `design-critic` nav stub already exists (`status: "soon"`). Ship v1 as a near-clone of the Librarian template: a flat discipline dropdown (start with **architecture + graphic + ux-ui** — three you can write *real rubrics* for, not seven), a persona picker scoped to that discipline, one LLM critique pass in the persona's voice with every claim tagged `✓/?/⚠`, framed "use with caution, consult humans too," logged to `tool_runs`, 401-for-anon. Hardcode personas+rubrics+`pedagogicalStance` in one `design-critic-prompts.ts` (data-in-code, the `concepts.ts` pattern) — **do not** build a cross-tool registry under it. No multi-persona panel, no web grounding in v1 (that's D2; defer until the single pass is proven under the 60s cap). **Done when:** 3 disciplines × ≥2 personas each produce critiques where every claim chip renders through the unified ClaimChip, the per-pack pedagogical-stance string is shown, 401-for-anon is verified, and one `tool_runs` row is written per run.

**Assessor (next) — architecture-pack DEPTH, the ready-made reuse story.** This is the `code-zoning-agent` spec, and it is the cleanest depth-reuse the repo offers: a hard wall between a **deterministic rules-as-data engine** (D0 — the LLM never produces a number; FAR, height, setback, coverage computed from a versioned JSON rule pack, each record carrying its own clause + source URL + `verified_by`) and an **additive LLM gloss** (D1/D2 — plain-language translation of a *retrieved* clause, cite-or-abstain, "no clause found → verify manually," never improvise). It **shares Surveyor's parcel/zoning import** (don't reinvent geocoding) and **exports its envelope constraints to form-helper** as the hard-constraint geometry, watermarked "NOT A LEGAL DETERMINATION." Its **Objection Tennis** mode (a code official serves objections; the student volleys; it concedes on correct citations, escalates on bluffs, ends with a scorecard → verification worksheet) is the clearest "grade the trace" set-piece in the whole toolkit. This is explicitly the *architecture-pack* sibling of the discipline-neutral Inspector/WCAG bench — same "calculator that cites the law" pattern, but jurisdiction-bound and arch-only. **Done when:** jurisdiction+edition selection is blocking (unset = hard error, never a default), every numeric cell is `[computed]` by the engine and carries a clause card, the gloss abstains with "no clause found" when retrieval is empty, and Objection Tennis emits a byte-stable scorecard from a canned rule pack. Scoped **M→L** because the rule pack is real authoring work; ship ONE jurisdiction first.

**Chronicler (next) — the metacognition front-end the toolkit is missing.** `tool_runs` logs every run but no tool surfaces a student's own process back to them. v1 is deliberately tiny: a single-student, single-tool, read-only page that queries the caller's *own* `tool_runs` (RLS already allows select-own), rendered as a plain reverse-chronological ledger grouped by tool, each row a deterministic one-line summary from the existing `output` jsonb. No cross-tool timeline yet (there's no join key — see §5), no authorship %, no instructor view (no role in the schema), no model call. This proves the metacognition surface with **zero new infra and zero hallucination surface**. The cross-tool Loop Tape and "grade-the-trace" instructor view come *only after* a `project_id` correlation column exists and Critic ships the gold-override primitive Chronicler wants to consume. **Done when:** a signed-in student sees their own runs (and no one else's — RLS verified), each row is a deterministic non-LLM summary, and the page makes zero model calls.

**Loopmaster (next) — the toolkit's thesis as a set-piece.** Build the design-thinking-showcase spec as **D0 only, one PR**: a single self-contained HTML page (a static route that doubles as your lecture demo) running the loop FSM PROPOSE→CRITIQUE→DIVERGE→**CONVERGE (human-only, the FSM structurally blocks the model)**→OVERRIDE (student types a justified contradiction → lights gold)→VERIFY, over 2–3 pre-baked transcripts, one deliberately non-architecture (a poster or UX flow) to prove portability at zero extra cost. The live Loop Tape *is* the four-line trace rendered as the hero UI. **Done when** two unit tests pass: (1) CONVERGE can never be set by a model-sourced path; (2) canned transcripts export byte-stable golden traces. **Fence the orchestrator out entirely** — "loop moves call Surveyor/Critic as engines" is an XL multi-tool integration that stacks latency under the Hobby 60s cap; never bundle it into this estimate. (Consider a role-shaped name; "Loopmaster" names a mechanism, not a studio role.)

**Composer (next) — the ideation sandbox, scoped honestly.** The instinct is right (the toolkit lacks a divergence sandbox detached from building massing) but Gable's `core.js` does **not** generalize — its solar/wind/stack-ventilation math is irreducibly building-physics; only ~65 of 486 lines (vector helpers + `evaluateRuleset`) are portable. So ship **Composer (Graphic pack)** as a standalone D0 zero-build tool: a poster/screen canvas where the student drags boxes+text, and a fixed rule set over metrics that are **real and free** — WCAG contrast (actual luminance math), element count, alignment residual, whitespace fraction, largest-element dominance. "Push a move, watch the rule table flip pass/fail, encode intent as a rule." SVG download only; no AI, no key. Leave architecture's site-forces tool untouched as the deep anchor. **Done when:** dragging an element re-evaluates every metric live, each rule shows pass/fail with the computed number, and SVG export round-trips — all with no network call.

**Describer (next) — the one net-new tool whose engine already exists.** `TOOLS/precedent-archive/web/lib/alt.js` is a working single-pass vision alt-text writer with exactly the abstain discipline this needs ("describe only what's visible; never an image of"), `stop_reason==='refusal'` handling, key server-side. The live Librarian route is the production wrapper to clone verbatim (`maxDuration=60`, `getUser()→401`, SSRF guard, size caps). v1: one uploaded image → a visible-caption-vs-accessible-alt pair + a longer description, every unverifiable claim **⚠-flagged**, framed "a draft only the maker can finish," with a one-line discipline selector swapping vocabulary. The ⚠-flagging is load-bearing and must be in v1 — without it, it silently becomes a confident ghostwriter, the exact failure state. **Done when:** an image yields a caption/alt/long-desc triple, every non-visible inference is ⚠-tagged through the unified ClaimChip, anon callers get 401, and one `tool_runs` row is written per run.

**Advocate (next) — rehearsal room, never ghostwriter.** Port portfolio-storyteller, but ship **D0 only** as v1 (no API route, no Supabase, no 60s-cap exposure): four intake fields → one canned Crit Weather Report (questions tagged fair/loaded/out-of-scope) + a 4-min talk-track with a visible cut log + 2–3 deliberately-different drafts as raw material + caption/alt starters. The load-bearing piece is the **two-pane voice editor**: AI draft read-only left, student's pane starts empty, export-locked while untouched, word-level diff + "% in your words" meter, paste-back re-flag, four-line provenance log auto-assembled from per-field status. Plus an offline `renderPortfolio()→accessible static HTML` with axe-core in CI. **Done when:** export stays locked until the student's pane diverges from the AI draft, the "% in your words" meter is non-zero, the four-line provenance log auto-assembles, and the exported HTML passes axe-core. Settle the Critic/Advocate seam first (Critic = feedback on the work; Advocate = the student's own final prose) so two tools don't re-litigate the boundary.

---

## 4. Reconfiguration & versioning

### The cross-cutting strategy: parameterize once, re-skin many

Almost every "new discipline tool" already exists inside the ten built tools. The work is to **factor the reusable engines and re-skin them via packs / tiers / levels / modes**, so you author a config file instead of a codebase. Two corrections to the naive version, both verified in code:

- **There is no "DisciplinePack registry" to build all at once.** The honest seam is small: add a **Field axis** (design discipline) to Coach *separately* from its existing software `Discipline` enum — a `FIELD_MODULES: Record<Field,string>` fragment appended in `buildSystem`, fully backward-compatible (architecture = no field = today's behavior). Lift exactly three things into `lib/packs/`: a `Field` type, a per-field `{label, conceptRows[], docRoots}`, and the `pedagogicalStance` string from §1. Defer `criticPersonas`, `forces/metrics`, `exportTargets` until a *built* tool needs a second discipline.
- **D0 is a policy + a `<TierBar>`, not a model-layer refactor.** `structured.ts` does *not* centralize the model (it imports a hardcoded `MODEL` const; Coach/Librarian/RAP each instantiate their own client). So a real `tier` param touches ~4 independent call sites. Don't do that yet. Ship instead: (1) a presentational `<TierBar>`; (2) a per-tool `cannedD0.ts` payload **visibly labeled "SAMPLE — not a fresh read"**; (3) the written **guardrail**: *no discipline pack ships D1/D2 until its D0 is registered.* De-emphasize D1 BYO-key — the brief flags it as regressive.

### Discipline adjacency map — the cheapest generalizations are the spatial siblings, not graphic

John's ask names ~10 target fields. They are *not* equidistant from the current spine. Ranking by reuse-distance makes the reuse thesis stronger, because the nearest fields are nearly free:

| Reuse distance | Disciplines | What they reuse | Net-new cost |
|---|---|---|---|
| **Nearest (almost free)** | **Landscape, Interior** | Surveyor's *actual* data pipeline (EPA/USGS/FEMA/Open-Meteo all apply to a site or a room's context) + Eco-Architect/Composer's spatial-forces loop (sun/wind/slope/views → daylight/circulation/acoustics) | Mostly vocabulary + curated links; the hard data is *already there* |
| **Near** | **Game / 3D, Product / Industrial** | Game reuses **Modelmaker + RAP's three/r3f renderer stack** (it's literally a 3D viewer pipeline); Product reuses **Composer** (balance/ergonomics rules) **+ Inspector** (standards/safety clauses) | A new metric set per field; no new infra |
| **Mid (the make-layer build-out already drafted)** | **Graphic, UX/UI, Communication/Visual** | Composer-Graphic, Critic, Librarian-graphic, Cartographer-UX, Inspector-WCAG, Describer — all in §3 | The make-layer tools, which are the budget anyway |
| **Genuinely net-new** | **Fashion/Textile, Service/Interaction** | Little spatial or vision overlap; service design wants journey-maps/blueprints the toolkit has no engine for; fashion wants pattern/material tooling outside scope | New engines — defer behind co-author demand |

The headline: **the spatial siblings (landscape, interior) are the cheapest wins and they're closer to the spine than graphic is** — they reuse Surveyor's hard datasets directly, where graphic has to invent its own. If breadth must be demonstrated fast and credibly, pilot **landscape or interior** on the existing data pipeline *and* ship the graphic make-layer; flag fashion and service-design as the honest net-new frontier.

### Per-tool variant matrix (highest-value variants)

| Tool | Add D0 floor | Discipline packs | Levels / modes | Verdict from stress-test |
|---|---|---|---|---|
| **Surveyor** | curated context-link lists per discipline (no key) | Place(arch) / Landscape / Interior / UX-Context / Product-Market | macro⇄micro → context⇄artifact | **Don't rebrand the flagship.** Surveyor stays the architecture/spatial flagship; its EPA/USGS pipeline is ring-fenced as arch/landscape/interior-pack D2 (those three share the *real* datasets). For fields with *no* hard datasets (UX, graphic), the pipeline reduces to ungrounded web_search — the exact thing cite-or-abstain discredits. So lift only the discipline-neutral **chassis** (CLAIM primitive, chips, soft-timeout, sources rail, 401) into a separate thin **Context Survey** scaffold piloting ONE dataset-less discipline (UX). |
| **Eco-Architect** | already D0 (deterministic) | landscape/interior (share spatial forces) → **Composer** packs (Graphic/UX/Product) | beginner (3 forces) / advanced | Physics engine doesn't generalize; the rule-eval loop + the *spatial*-forces framing do. Landscape/interior reuse the forces directly; Composer-Graphic is a *separate small solver* (§3). |
| **Critic** | canned-persona rubric demo (no key) | architecture / graphic / ux-ui (3, with real rubrics) | Race(demo) / Solo-Crit(graded) | Build pack-aware via a hardcoded prompts file, not a registry. Defer multi-persona D2. |
| **Librarian** | vocabulary + curated links + manual tagging (no vision) | graphic first (Fonts In Use/Are.na/Behance) | discipline mode toggle | **Cheapest high-impact non-spatial generalization** — but `enrich.ts` is the hidden coupling (hardwired to Wikidata P84/P149 + Getty + ArchDaily). Gate that block behind `discipline==='architecture'`; freeze the JSON schema keys in v1 to avoid a rename migration. Ship ONE second discipline at D1. |
| **Coach + Cartographer** | inherited | UX/Figma first (no collision with existing "adobe") | beginner/intermediate/advanced retained | **Biggest "make it general" lever, lowest code risk** — but Cartographer's `Section` re-exports Coach's enum, so a new Coach discipline auto-spawns an empty board lane. Do the lane-gating refactor (gate on ≥3 nodes/level) FIRST; reconcile "graphic" vs existing "adobe"; ship ONE non-arch pack end-to-end before promising seven. The cost is *vetting* curated doc links, not authoring prose. |
| **Archivist** | existing async wall (live) | discipline = board template (copy change only) | Progress / Crit | Add ONE thing: a `pinup_comments` table (region-anchored, FERPA-safe RLS). **Drop** D2 public critic links + realtime — they expose student work to unauthenticated visitors and rewrite the auth model. |
| **Inspector** | all calculators model-off | rule-pack selector (WCAG first) | objection-tennis scorecard (the *general* one) | The **discipline-neutral** sibling of Assessor: same "calculator that cites the clause" pattern, but for portable standards (WCAG 2.2 first — public-domain, pure arithmetic, every discipline). Its Objection Tennis is WCAG-clause role-play; Assessor's is zoning-clause. Every later rule pack is additive JSON, gated on the first earning its keep. |
| **Assessor** | deterministic engine *is* the D0 | architecture only (jurisdiction-bound) | zoning-read / envelope-gen / code-Q&A / objection-tennis | Architecture-pack DEPTH (§3), not a generalization. Shares Surveyor's parcel import; exports to form-helper. Ship ONE jurisdiction. |
| **Foundations pack** | static content default | the cross-disciplinary front door | — | **Drop the "account default + registry" framing** (phantom deps). Ship as a static `/foundations` page curating Cartographer's *existing* "Design Concepts & Theory" + "Digital Foundations" lanes. Architecture stays visible; an additive on-ramp, not a default that hides Rhino. |

---

## 5. The connective spine

### The shared kit (build/consolidate FIRST — load-bearing)

These are pure reuse of patterns already in the repo; the point is to stop them forking as disciplines multiply.

- **One ClaimTag + one `<ClaimChip>`.** The fork is *live in production*: site-analysis `ui.tsx` and Coach `MessageBubble.tsx` render the same primitive with different enums and separate renderers (Librarian likely a third). Define the union once with a `kind: 'fact' | 'procedure'` discriminator so verified/plausible/hallucination *and* stable/version/check both render through one chip **without flattening** the meaning. One PR, internal lib (`src/lib/studio-kit/` — there's no `packages/`), 3 call-sites. **Defer** shared prompt-stances and the AccessibleChart component to separate tickets.
- **One Route Spine.** `withCostGuard(handler)` does `getUser()→401` once (collapsing 7 duplicated blocks — the chokepoint guaranteeing the key is never anonymous). `logTrace({tool, owner, input, output})` writes the already-uniform `tool_runs` row, with provenance packed *inside* the input/output jsonb — **no migration in v1**. Two small PRs. Leave the SSE streaming routes' timeout out of v1.
- **The Tier policy + `<TierBar>`** (§4) — the equity floor as a convention, not a refactor.

### Accessibility as a cross-disciplinary PACK, not just a contract

The all-black-text + alt-text + screen-reader rules read as a tax. Reframe them as the toolkit's **signature feature** — the thing that makes this not a ChatGPT skin and ties the whole reframe back to John's north-star mission ("how tools shape *who can participate in design*"). **Inspector (WCAG) + Describer (alt-text) + the `lib/a11y/` read-back/braille tail** extracted from RAP compose into an **Access lane that *any* discipline inherits.** For non-visual disciplines this is a genuine market differentiator no general design toolkit offers. Concretely: every pack gets Inspector's contrast/target checks and Describer's alt-text writer for free, and the RAP-derived read-back formatter means any text output can be heard, not just read. The accessibility *contract* (a lint rule enforcing alt-text + all-black-text + the a11y primitives, landed *before* color-heavy disciplines do) is the floor; the Access *lane* is the feature. **Don't** extract RAP's geometry core — it's a floor-plan engine, not a universal renderer.

### Cross-tool hand-offs

Today, impossible: each tool privately invents "project." The *additive* fix: append-only migration adding nullable `project_id` + `asked` / `kept_changed_rejected` / `verified_by_student` columns to `tool_runs`, written by the routes that already log (librarian, skills-coach, rap/agent). That turns the trace into the brief's 4-line log immediately.

**A precise distinction the rest of this document depends on:** the *schema* change (adding nullable columns) is fully reversible and triggers no FERPA decision. **The act of *writing student reasoning* (kept/changed/rejected) into those columns is the FERPA-relevant step** — that data is durable student-process data the moment a route records it. So ship the columns, but keep everything written there **private-to-owner under the existing select-own RLS.** Turning *any* of it shared-studio-visible is the gated, irreversible decision (§7). **Defer** the `projects` table, FKs on pinups/library_items, the `/studio` dashboard, and any shared visibility — gated on your explicit FERPA call and on ≥2 *live* (not stub) tools that can fill one thread.

### Is a studio hub worth it?

Eventually yes — it's the keystone that makes ten tools a *toolkit*. But not as an early L build: it's the highest-touch, lowest-visible-payoff item, its marquee demo threads tools that write nothing to Supabase (Gable is a static iframe; Surveyor's public path logs nothing for anon; Critic is a stub), and it reopens an unsettled FERPA question. Build the **trace columns now**, the **dashboard last** — only after Critic and Chronicler are live.

---

## 6. A sequenced roadmap

Honest about the solo-maintainer envelope; each item is the *smallest credible first*.

### NOW (substrate + cheapest generalizations + finish a stub)
1. **Studio Kit — ClaimChip unify** (S). Kill the live fork before a 4th tool forks a 4th dialect.
2. **Route Spine — `withCostGuard` then `logTrace`** (S+S, two PRs). The chokepoint the Tier policy and trace both depend on.
3. **Librarian → graphic pack** (S/M). Cheapest high-impact non-spatial generalization; gate `enrich.ts`, freeze schema keys.
4. **Coach Field axis + Cartographer UX/Figma pack** (S + M). Biggest "make it general" lever; do lane-gating first, ship ONE pack end-to-end.
5. **Critic v1** (M). Finish the stub as a Librarian clone, 3 disciplines, single persona, hardcoded prompts.
6. **Inspector — WCAG bench** (S). Weekend D0 build, broadest student audience, safest demo, seeds the Access lane.
7. **Foundations static page** (S). The cross-disciplinary front door, content-only.
8. **Recruit one per-discipline co-author** (non-code dependency — see §7). Graphic/UX packs are NOW-tier and **must not ship to production until a named human signs their source list.** This is on the critical path, not a nicety.

### NEXT (the make-layer + metacognition + arch depth, once substrate is proven)
9. **Trace provenance columns** (S migration). Additive; private-to-owner; unlocks Chronicler.
10. **Describer** (S). Engine already exists; second Access-lane tool.
11. **Modelmaker** (S). Pull the one neutral slice out of the 3D stub: GLB-only viewer, view-only, no hosted share. (Also the on-ramp for the game/3D pack — §4 adjacency.)
12. **Chronicler v1** (M). Single-student, single-tool, read-only trace readout.
13. **Composer (Graphic)** (M). The honest ideation sandbox.
14. **Loopmaster D0** (M). The thesis set-piece + your lecture artifact.
15. **Advocate D0** (M). Voice editor + offline portfolio export.
16. **Assessor v1** (M→L). Architecture-pack depth: one jurisdiction's rule pack + cite-or-abstain gloss + Objection Tennis; shares Surveyor's parcel import.
17. **Surveyor → Context Survey (UX pilot)** (M). A thin separate scaffold, not a flagship rebrand. *(Cheaper sibling, if breadth-demo is urgent: a landscape/interior pack on Surveyor's existing data pipeline — see §4 adjacency.)*

### LATER (depth, breadth, ops — and the deferred-indefinitely)
18. **Drafter** (M, one client-side widget — not a bench).
19. **Archivist crit comments** (M, one FERPA-safe table).
20. **Curator** (S — *distribute the already-built local app*; do not port to Vercel).
21. **Quartermaster** (S — static brief/calendar; first to cut if scope tightens).
22. **Studio hub + dashboard** (L) — only after ≥2 live tools fill a thread, gated on a FERPA decision.

**Deferred indefinitely behind written specs** (the smallest-credible-first test says these overrun the envelope): the Loopmaster *orchestrator*; a universal *Exporter interface* + Adobe-MCP graphic adapters (the Adobe MCP is **not wired into the app** — it's a build-agent tool requiring a signed-in account, breaking the anonymous shell + 401 model); **RAP-core geometry extraction** (false "free renderers" premise, risks the credibility crown jewel, zero parity tests); **Conductor's** model-backed motion critique (ship D0 storyboard only, route critique into Critic); `rhino-wizard` and `precedent-librarian` (covered by Modelmaker's Rhino mode and the live Librarian respectively); a cross-tool **DisciplinePack god-object**; and a `tier` param on the model-call layer (abstract only after ≥2 packs demand it).

---

## 7. Risks & open questions

- **Authorship & vetting of non-architecture packs — the binding constraint, made concrete.** You're a solo *architecture* maintainer; a credible UX/fashion/landscape pack needs domain-correct vocabulary and *vetted* sources, and cite-or-abstain means every curated link must resolve to the right official page or it violates trust-but-verify. This is the project's actual critical path, so make the **pack-maturity gate an artifact, not a principle**: a checklist file committed per pack requiring (1) a **links-resolve test in CI** (every `docRoots` URL returns 200 to the canonical page), (2) **≥3 nodes per level** (pathways already enforces this), and (3) a **named human vetter recorded in the pack config**. **No non-arch pack ships to production until its named co-author signs the source list** — which is why "recruit one co-author" sits on the NOW list (step 8), since the graphic and UX packs are NOW-tier. The RAP blind-co-researcher relationship is the model.
- **Campus-key economics at 8+ disciplines.** A shared key fanning across far more students is the cost break-point. The D0-floor *mandate* is the answer, but only if enforced as policy (D0 registered before D1/D2). Open: does this stay one-department or need a college-wide / BYO-departmental-budget model, and who owns that decision?
- **Credibility dilution vs breadth.** A thin graphic trail next to a deep architecture trail reads as unserious; a "neutral default" fronting arch-only tools reads as a re-skin to outside faculty. Ship depth-or-don't, keep architecture's Rhino/data depth ring-fenced and visible — and note the adjacency map (§4) says the *credible* fast wins are the spatial siblings (landscape/interior) that reuse real data, not graphic.
- **Accessibility regression vs the Access lane.** As graphic/fashion (color-heavy) land, the all-black-text + alt-text + screen-reader rules must be a lint-enforced contract, or each new pack quietly reintroduces grey secondary text and unlabeled charts (a gap STATUS.md already admits in site-analysis). The defensive framing is the *contract*; the projective framing (§5) is the *Access lane* — same primitives, sold as the toolkit's signature rather than its tax.
- **FERPA scope creep.** Threading one project across tools and logging asked/kept/rejected makes student reasoning *durable, cross-tool, and potentially studio-shared*. Per §5, the columns ship private-to-owner; turning any of it shared-studio-visible is the irreversible data-visibility call the guardrails say to confirm first. Decide it **before** building the hub.
- **The offload-vs-build-the-skill meta-question, now with a provisional answer.** The toolkit's whole stance — "the student stays the cognitive agent; a screenshot they can't reproduce is a failure state" — assumes offloading is the thing to *resist*. The hard case is whether "parti is never generated / convergence is human-only" survives in graphic/game/fashion where AI image-generation is *normalized*. **Provisional position (from §1):** it survives as *structure* (claim-tags, report-back, human-only converge, the trace are invariant) but the refusal *content* becomes a per-pack `pedagogicalStance` string — architecture refuses generated parti; graphic refuses to let the generated image *be* the deliverable, making the student's edit the deliverable. So the spine *does* have a discipline axis, but it's one typed string per pack, not a rebuild — the only place generalization isn't free, and it's cheap.

---

## 8. How John knows the reframe worked

The document is a build plan; the practice is a *research* practice, and RAP already sets the precedent that a tool can be a "fidelity instrument" that *measures* something. Give the generalization goal the same treatment. Once the provenance columns land (step 9) and Chronicler can read them, the trace becomes the measurement instrument for the reframe itself:

> **Success = N non-architecture students each complete a full Research → … → Present/Defend arc in their own discipline's vocabulary, with a four-line provenance log per step** — measurable directly from `tool_runs` (group by owner, count distinct tools spanned, check each row carries a `kept_changed_rejected`/`verified_by_student` entry).

That single query turns "did we generalize?" from a vibe into a number, consistent with the practice's own measurement ethos — and it's free once the columns ship.

---

*Bottom line: you are not bolting discipline tools onto an architecture app. You are extracting a studio-pedagogy engine that already exists, consolidating its honesty primitives before they fork further, making architecture pack #1 of many (with Assessor as its depth and the spatial siblings — landscape, interior — as the cheapest next packs), and spending scarce net-new budget on the make-layer gap. The spine — claim-tags, the trace, report-back, the D0 floor, and the Access lane — is what keeps every variant from collapsing into "ChatGPT with a skin," and the trace is what lets you prove it worked.*
