# Design Thinking Showcase 🌟 *(working title: "The Crit Engine")*

**Solve one studio brief twice — once by accepting AI's first confident answer, once by
running it through the design loop — and grade the *tape*, not the building, so a room
of non-designers watches the moment design thinking out-thinks raw AI.**

This is the repo's **thesis showcase**: the single most compelling live demonstration
that *design thinking is already AI-ready* — that the studio's native habits (iterate,
critique, prototype, diverge/converge, the reflective conversation with the material)
are exactly what make someone good at directing AI. The other seven tools each prove it
at one *stage* of the design arc; this one puts the **feedback loop itself** on stage as
the object of study.

**Status:** 🟡 new — concept locked, ready to build (MVP is canned single-file HTML).
Maps to `TOOL CATALOG IDEAS.md` §13 (Critique) + the "fully integrated pipeline" flagship.

---

## The core idea
A split screen solves the same brief on the same model on the same clock, two ways:
- **VIBE track** — accept-the-first-answer, single-shot prompting (how a non-designer uses AI).
- **CRIT track** — the same model driven by a designer's loop: **PROPOSE → CRITIQUE → DIVERGE → CONVERGE → OVERRIDE → VERIFY**, every move logged.

The spine of the screen is a live **Loop Tape**: a horizontal timeline of moves ticking
across as the design evolves. The cleverness is the **talk-back made audible and
adversarial** — after each iteration the tool turns its own last output into a critic
("make the strongest case this is wrong") and the design visibly *flinches and corrects*.
Schön's "reflective conversation with the material" stops being a phrase and becomes a
thing you watch breathe. **You don't grade either design. You grade the tape.**

## The "wow" demo (≈3 min, beat by beat)
1. **The seduction (0:15–0:45)** — VIBE fills instantly: confident paragraph, clean massing, three cited precedents, a setback number. *Looks finished.* CRIT is still on move 1, sparse. The room roots for the wrong horse on purpose.
2. **The talk-back (0:45–1:45)** — CRIT turns its own proposal into a hostile critic (red text, read aloud): *"this faces the parking lot; your 'natural ventilation' fights the prevailing SW wind; 'accessible-first' but the only entry is up a grade."* The massing flinches; a DIVERGE fans 6 ghost-variants; the room votes 5 dead, 1 kept; the presenter types one **override** — *"keep the hard SW corner — river view beats 3 PM gain"* — which lights **gold** on the tape: authorship.
3. **The detonation (1:45–2:45)** — both tracks hit a **VERIFY** gate. VIBE lights red: the marquee precedent is `⚠ likely-hallucination` (doesn't exist), the setback `? unverified` (no clause), the "30% daylight gain" `⚠` (planted, unsourced) — the beautiful artifact gets strikethrough-stamped in real time. CRIT: fewer claims, but every survivor is `✓` with a source. **Speed bought polish, not truth. The loop bought truth.**
4. **Grade the tape (2:45–3:30)** — the Loop Tape zooms full-screen. VIBE: one tick. CRIT: the full loop with the gold override and the citations. *"I'm not grading either building. I'm grading this tape. One of these students thought. Watch which."* Export drops the trace.

The Vibe track is the **control group** — it isolates the variable, proving design *thinking* (not the AI) is the active ingredient. And because the loop generalizes (a writer/scientist/PM could run the same moves), it survives outside architecture — which is why a broad lecture audience gets it.

## Why it's about design thinking specifically
| Studio habit | On-screen move | Why it makes you good at directing AI |
|---|---|---|
| Reflective conversation (Schön) | talk-back: output becomes critic, design flinches | you think *through* a responsive material, not *at* a vending machine |
| The crit | "strongest case this is wrong" | architecture's native skill = the highest-value prompt; the model defaults to flattery |
| Diverge → converge | model fans N forks; **human-only** converge | AI widens infinitely and seduces toward premature closure; only the human closes the cone |
| Make-to-think | the artifact morphs each loop | the value isn't the artifact, it's having something to push against |
| Tolerating ambiguity | CRIT stays open longer; VIBE grabs the first finished-looking thing | the designer doesn't grab; the non-designer does |
| Override = authorship | the gold line | the human stays the cognitive agent — the decision is logged as *theirs* |

## How it embodies the house ethos
**Grade-the-trace** *is the closing beat* (the Loop Tape **is** the trace, rendered as the hero UI; the four-line log writes itself) · **claim-tags ✓/?/⚠** run at the VERIFY gate (the detonation) · **tool attacks its own output** is the talk-back, promoted from footnote to centerpiece · **verification worksheet** catches every `?`/`⚠` on the surviving track · **student stays the cognitive agent** — keep/kill/fork/override are the *only* irreversible actions and **convergence is a human-only verb the FSM blocks the model from doing** · **opacity is pedagogy** — every move shows its prompt + diff + the model's *thinking blocks* · it doesn't *describe* the loop, it *is* one, running, with a tape.

## Modes
- **Race mode** (demo default): Vibe | Crit, one click, built for the stage.
- **Solo Crit mode** (the assignment): just the Crit track, the student drives every move by hand — this is what gets graded.
- **The verbs:** PROPOSE (model) · CRITIQUE/TALK-BACK (model attacks its own last output) · DIVERGE (fan N variants) · CONVERGE (human-only: cluster, kill, defend) · OVERRIDE (human types a justified contradiction → gold) · VERIFY (claim-tag + worksheet).
- **Audience participation:** the room votes which forks survive and dictates the override — they *run the loop*.
- **Replay:** end-of-session time-lapse of the branching tree ("which moves were yours, which were the material talking back?").

---

## Gameplan

### MVP — single-file HTML, fully canned (the demo floor, and it's the safest demo)
- The loop **state machine** (FSM over an append-only **LoopNode tree**: divergence = a node with N children; convergence = the human selecting down), the **phase stepper**, the **divergence-tree SVG** (hand-drawn, no chart lib — reuse `site-analyzer/standalone`'s inline-SVG approach), the iteration-history panel, keep/reject/**override-with-required-rationale**, trace export (JSON + Markdown).
- Driven entirely by **2–3 pre-baked loop transcripts** for the studio's real site/brief (the `precedent-librarian/lite` canned-`SAMPLES` pattern). No key, no install — doubles as the lecture artifact. *Build this first and the demo is already safe.*

### v1 — live, degrades to free (D1)
- Wire PROPOSE/CRITIQUE/DIVERGE/VERIFY to a model behind the same UI (`site-analyzer/web` zero-build `node:http` server, `claude-opus-4-8`, adaptive thinking, four phase schemas reusing the `CLAIM` primitive + `ADVERSARIAL_SCHEMA` shape).
- **Stream thinking + text token-by-token** (SSE) so latency becomes content — *watch the model deliberate, then watch the human overrule it.*
- **Record-and-replay**: every live run serializes to the trace JSON; a "Replay" toggle plays a saved good run with realistic cadence (the live-demo safety net).
- Solo Crit mode; trace export with the four-line log.

### Stretch — the orchestrator
- Loop moves **call the other seven tools** as engines: PROPOSE → Site Analyzer / Form Helper · CRITIQUE → Code-Zoning objections + Portfolio "crit weather report" · DIVERGE → Form Helper variants · VERIFY → Precedent Librarian claim-tagging + **RAP fidelity score**. The §4 pipeline in `TOOL IDEAS ANALYSIS.md` becomes *a loop you can drive*, not a static arrow chart.
- "Two designers" mode (human-steered vs. model-auto-converged branch — the auto branch over-converges and keeps the over-claimed option: the lesson).
- Multi-model DIVERGE (three models disagreeing confidently — variability as a teaching object).

---

## Potential directions
1. **The orchestrator** (strongest) — the Showcase is the *shell* that runs the seven tools as loop-move engines.
2. **Adversarial co-op** — two students share one Crit track; one must PROPOSE, the other must CRITIQUE.
3. **Ambiguity meter** — a live gauge that penalizes premature convergence (the cone collapsing too early goes red).
4. **Time-as-material / slow mode** — forbids convergence for the first N loops (faster loops can kill the reflection that makes iteration valuable).
5. **The mirror trap** (bold) — a hidden third sycophancy track revealed at the end: *"this one told you you were brilliant the whole time — it's the one you'd have liked best."*
6. **Domain-portable toggle** — rerun the exact loop on a writing/science prompt to prove the thesis generalizes for non-designers.
7. **"What the model thinks you are" opener** — generate the *average* answer to the brief first; the Crit track's job is to beat the statistical mean (anti-Pinterest).

---

## Technical notes
- **Mirror the two built web tools exactly** — zero-build `node:http` + `@anthropic-ai/sdk`, single-file `standalone/` first. Model the loop as a **design-history graph** (`LoopNode {id, parentId, phase, content, decision, decisionRationale, source, meta}`), an explicit FSM with legal transitions rendered as a lit stepper (illegal transitions = disabled buttons). It's **form-helper's loop generalized** to a domain-agnostic level — read that README first.
- **Make the thinking visible** — don't discard the model's `thinking` blocks (the existing servers filter them out); render them in a drawer beside each candidate. Showing the model deliberate, then the human overrule it, *is* the demo.
- **The trace is the deliverable** — every keep/reject/override writes `decision` + a required `decisionRationale`; the worksheet + four-line log generate from the tree (reuse precedent-librarian's `renderWorksheet`/`renderProvenance`).
- **Extract the shared kit now** — claim-tag CSS, `TAG` glyphs, `renderClaim/Worksheet/Provenance`, `runStructured`/`parseJson` are duplicated verbatim across both built tools; the Showcase is the moment to factor them into `kit/` (answers the open decision in `TOOL IDEAS ANALYSIS.md §7`).

## Delivery, equity & live-demo reliability (D0–D2)
- **D0 (the demo floor):** pre-baked transcripts replayed step-by-step — the FSM advances, candidates/critiques appear, and **the user still makes real keep/reject/override decisions and produces a real trace.** Zero setup, zero cost, **cannot fail live.** A D0 showcase isn't a degraded demo — it's the safest one.
- **D1:** swap to a free/approved model (one env constant), live generation, honest about the quality delta (itself teachable).
- **D2:** Opus-4.8 live, streaming, multi-pass, pipeline imports — the frontier encore, never the graded floor.
- **Reliability guarantees:** default to canned/replay (live is the encore) · record-and-replay built into v1 (flip to a saved run if network/key dies — identical UI) · offline-first single-file (logic inline, no CDN) · per-phase `.catch` falls back to the canned counterpart so the loop continues · pre-warm generation before narrating.

## How to test it
- **FSM invariants (the anti-offload guarantee):** assert `converge`/`decision` can *never* be set by a model-sourced code path; only legal transitions fire; the tree stays acyclic and round-trips export→import.
- **Canned-mode determinism:** drive each transcript headlessly, snapshot the trace JSON + Markdown against golden files (the demo floor must be byte-stable).
- **Trace-as-artifact:** simulate keep/reject/override + rationales; assert the worksheet contains every unresolved claim and the four-line log is well-formed; flag near-empty rationales.
- **Replay fidelity:** record a live run, replay it, assert replayed trace == recorded trace.
- **Accessibility:** keyboard-drive the whole loop with no mouse; screen-reader-label the stepper + divergence tree; trace export is plain text/JSON. (See RAP below.)
- **The real acceptance test:** can a presenter, *offline with no key*, drive a full diverge→critique→revise→converge loop, make genuine judgment calls, and export a trace that reads as a defensible record of those calls?

## Accessibility (RAP) angle
The loop is **structured, sequential, and textual at its core** — potentially the *most* screen-reader-friendly tool in the set. The Loop Tape reads as an ordered list of labeled moves (ARIA-live: *"Move 4, Diverge, 6 variants"*); **sonify the loop** with distinct earcons per move type so a non-visual user *hears the rhythm* of good vs. bad iteration (Vibe = one lonely beep; Crit = a phrase of music) — shared `sonify-engine.js` with form-helper and rap-tactile-cad. When the artifact is geometry, the **VERIFY gate can mount the RAP fidelity score** ("is it right?" becomes "can a blind reader reconstruct it?"). *"The design feedback loop as an accessible, non-visual interface"* is itself an ACADIA/JAE-shaped claim.

## Why it's the best *thesis* showcase (and how it relates to rap-tactile-cad)
Two complementary showcase picks: **`rap-tactile-cad` is the best *research* showcase** (depth, uncopyable, publishable); **Design Thinking Showcase is the best *thesis* showcase** — it argues the central claim live, in 3 minutes, to a non-specialist room, and it's the cheapest to make compelling (canned single-file HTML) and loudest pedagogically (its *entire UI is the gradeable trace*). It doesn't repeat any tool — they operate on *content* at one arc stage; this operates on *process*, across all stages — and at full stretch it **orchestrates** them, making the seven feel like organs of one body. It's the framing demo that situates everything else, promoted to a tool in its own right.
