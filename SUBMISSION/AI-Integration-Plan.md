# AI Integration Plan — Second-Year Design Studio on the Tar Creek Superfund Site

*Summer AI Studio · culminating submission (Part 1) · prepared for cohort share-out*

**Studio:** second-year undergraduate architecture design studio (~16–20 students), fall term.
**Site:** the Tar Creek Superfund site, Picher, Oklahoma — a lead-and-zinc mining district left with chat piles, undermined ground, contaminated water, and a federally bought-out town on Quapaw Nation land.
**One-line thesis:** *Stop grading the artifact. Grade the trace.*

> **Status note (in the spirit of "this is not a finished product"):** of the eight studio tools below, **two are built and student-testable today** (Site Analyzer, Precedent Librarian); the rest are **specified and in active development**, and one (the studio crit board) is **in design**. What follows is an honest account of where the integration plan has landed and what I still have to figure out — not a finished system.

---

## 1. The course and the problem I'm solving

I teach a second-year architecture design studio. This fall I'm siting it on **Tar Creek** — a real, data-rich, genuinely poisoned place — because the problem there (what do you responsibly build on ground that is still remediating?) forces students to reason from evidence instead of from images.

The problem I'm actually redesigning around is narrower and more uncomfortable: **my second-years have already adopted AI, and second-years are exactly the students AI hurts most.** They reach for chatbots and image generators for precedents, site "facts," code numbers, and renderings — and AI returns *polished, confident, frequently wrong* answers. A hallucinated precedent reads exactly like a real one. A plausible setback number reads exactly like the code-checked one. Expert designers can see when the output is wrong because they already have the eye; **a novice cannot.** The tool is most dangerous precisely for the learner.

This collides with how studio has always been graded: **we grade the artifact** — the final board, the model, the render. That worked when producing a finished-looking artifact *required* the thinking. It no longer does. When AI can generate a finished-looking artifact in seconds, grading the artifact (a) rewards polish over judgment and (b) can't tell owned work from offloaded work. So the real risk isn't that students "cheat." It's that my novices quietly learn the wrong lesson at the worst possible moment — that **polish is architecture, and AI is an oracle** — and I have no way to see it happening.

My redesign: **move the assessment from the artifact to the *process trace*** — make the whole design process, including every AI interaction, visible, logged, and assessable. If thinking is what I want them to build, then thinking — not the artifact — is what I have to be able to see and grade.

## 2. My AI integration plan — where AI enters, and who does what

AI doesn't enter as a single chatbot bolted onto the studio. It enters as a **suite of custom studio tools, one per phase of the design process**, all built on the same principle (the house pattern for this repo): *hard data is sourced and downloadable; every **model** claim is tagged `✓ verified` / `? unverified` / `⚠ likely-hallucination` and cited; the tool runs an adversarial pass on its own output; and a **verification worksheet + a four-line provenance log** fall out automatically.* The crucial move: **the process record is a byproduct of doing the work, not a reflection essay bolted on afterward.**

Mapped to the studio arc:

| Studio phase | Tool | Status | What the student does / what AI does |
|---|---|---|---|
| Site research | **Site Analyzer** | ✅ built | Pulls Tar Creek climate, terrain, flood, contamination — every model claim tagged + cited; exports the ground to Rhino. *Student prices each claim's trust; AI is a tagged informant, not a source of truth.* |
| Precedent research | **Precedent Librarian** | ✅ built | Builds a tagged, cited, self-critiqued precedent dossier. *Student verifies; the tool even refuses to mark anything `✓` when it has no evidence — proving polish ≠ evidence.* |
| Massing / form | **Form Helper** | 🟡 planned | **Student sets the parti**; site forces (sun, wind, slope, flood) critique it; every move is logged with its reason; an override is logged as authorship. *AI never generates the form.* |
| Modeling skills | **Rhino Wizard** | 🟡 planned | Teaches Rhino/Grasshopper *workflow* and **refuses to hand finished geometry to a beginner**; a "report-back gate" makes the student observe and report before the next step unlocks. |
| Code / zoning | **Code-Zoning Agent** | 🟡 planned | Every number points at a clause; "no clause, no number." *Student argues with the code instead of trusting a number a chatbot asserted.* |
| Crit & portfolio | **Portfolio Storyteller** | 🟡 planned | Question-first (won't draft until the student speaks); attacks the **student's own words**; tracks "% in your words." *Guards against ghostwriting.* |
| Shared pin-up / crit | **Studio Crit Board** | 🟡 in design | The studio's public board (a self-hosted replacement for Miro) where work **and its traces** live and get critiqued in the open. |
| Accessibility | **RAP-Tactile-CAD** | 🟡 in progress | Non-visual CAD authoring + a fidelity test (read the drawing back with the screen off; measure what was lost). The equity throughline. |
| Framing demo | **Design-Thinking Showcase** | 🟡 new | Solves one brief twice — accept-AI's-first-answer vs. run-the-design-loop — and **grades the tape, not the building.** |

**The student's role** is the constant across all of it: the *cognitive agent and critic*. They set the parti, pose the questions, **price the trust** on every AI claim (`✓/?/⚠`), verify externally, decide what to keep / change / reject, and account for it in the log. **AI's role** is a *material with a grain to be interrogated* — by turns a specimen to study, an opponent to argue with, a translator to check, an instrument to wield, a referee to audit, a scribe to capture, a constraint engine to obey — but **never the author**. The tools are deliberately built so AI never hands over the deliverable: no finished parti, no finished geometry for beginners, no exportable AI-written portfolio prose.

**Equity is built in, not asserted:** every *graded* path runs on free/approved tools (the zero-setup "standalone/lite" variants work with no API key), so no graded outcome depends on a paid model.

## 3. The student learning outcome

I'm developing **process literacy — the capacity to make design thinking visible.** In one sentence:

> **By the end of the studio, a second-year student can produce and defend a legible trace of their design process — showing where AI entered, what they trusted and why, what they verified, and what they changed — so that their reasoning is visible and ownable, independent of how finished the artifact looks.**

This is deliberately *not* "use AI well" and *not* "make a good building." It's the underlying capacity that survives whatever the tools become: knowing what you did, why, what you trusted, and being able to stand behind it.

## 4. My measurement approach

Because the tools emit the process record automatically, I can collect evidence **without adding busywork**:

- **Four-line provenance logs** — *tool / what I asked / what I kept-changed-rejected / how I verified* — for each AI-touched move.
- **Verification worksheets** — which claims the student tagged `✓/?/⚠` and how they checked them.
- **Override events** — every time the student rejected or changed AI output, with the stated reason (logged as authorship).
- **Trust calibration** — the student's `✓/?/⚠` tags vs. what actually turned out true (hallucinations caught, false trust given).
- **"% in your words"** — edit-distance on crit/portfolio text, to catch ghostwriting.
- **Re-derivation checks** — short, *unaided* exercises ("rebuild this move without the tool"; Rhino Wizard's report-back gate) to confirm the logged process is genuinely theirs.

**When:** low-stakes checkpoints at each phase (site, precedent, massing, code, crit), a midterm trace review, and a final "grade-the-trace" assessment — then I compare **early-term vs. late-term** traces for growth.

**How I'll know it's working:** a **trace rubric** scoring (a) specificity and honesty of the log, (b) the number and quality of *justified* overrides, (c) calibration accuracy, and (d) re-derivability. The signal of success is that over the term, traces get **more specific, catch more AI errors, and contain more justified overrides** — and that students can defend their process in crit *without* leaning on how finished the artifact looks. The counter-signal I'm watching for is fluent-but-generic traces — which is exactly my unsolved problem below.

## 5. My key challenge / design tension

**The moment I grade the trace, I create an incentive to *perform* the trace.**

A clever second-year can learn to *fake* a clean provenance log and stage a theatrical "critique of the AI" — ticking the `✓/?/⚠` boxes, writing reasonable-sounding overrides — without doing any of the actual thinking. Novices are *especially* good at telling a teacher what the teacher wants to see. And the obvious fix makes it worse: if I police the documentation hard and demand ever more of it, the trace becomes a punitive, bureaucratic tax that kills the *genuine* reflective version right alongside the fake one.

**The stakes if I get this wrong:** the whole redesign inverts. "Grade the trace" silently becomes "grade the *performance* of a trace." My novices learn to **launder offloading through good-looking logs** — a more sophisticated, better-disguised version of the exact problem I started with. Process literacy collapses into theater, and I've made the problem more elegant instead of solving it. That is a real possibility, and I don't yet have a fix I trust. (Partial moves I'm weighing: unaided re-derivation checks, live oral defense in crit, designing the tools so the log is genuinely *useful* to the student — low incentive to fake what helps you — and calibration scoring that exposes faked trust tags when reality contradicts them. I don't know if they're enough, or if they just escalate an arms race.)

---

## My question for the cohort

> **I'm grading the design-process trace instead of the artifact — but that rewards students who can *perform* a process: fake a clean provenance log and stage a critique of the AI without real thinking, which my second-year novices are especially good at. How do you build accountability that distinguishes *genuine* reflection from *performed* reflection — without policing the documentation so hard that it becomes punitive and kills the honest version too?**

---

## Part 2 — Presentation

A self-contained 7-slide deck following the same arc (problem → integration → outcome → measurement → challenge → cohort question): **[`presentation/index.html`](presentation/index.html)** — open it in a browser to present (arrow keys / click; **F** fullscreen). For a Canvas-uploadable copy, the deck prints one slide per landscape page (**Print → Save as PDF**); see [`presentation/README.md`](presentation/README.md). It's also import-ready for **Adobe Express** if an editable share link is preferred.
