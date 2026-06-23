# AI Integration Plan & Cohort Presentation
## Fall Architecture Design Studio

*Summer AI Studio — culminating submission for the in-person phase. An honest, specific
account of where my AI integration plan stands at the end of the first two weeks: what
I'm building, how I'll know if it works, and what I still have to figure out.*

---

## 1. The course and the problem

I'm redesigning my fall architecture **design studio** — the core, time-intensive course
where students carry a building from site through concept, form, and representation to a
final review. Studio is where architects are actually made: not by producing a board, but
by developing judgment, defending decisions under questioning, and learning to see what is
wrong with their own work.

AI is already in the studio whether I plan for it or not — my students use it now. The
problem isn't that AI is *bad* at architecture. It's that AI is **fluently good enough to
look finished while being subtly or catastrophically wrong**, and *polish is not evidence*.
A confident paragraph about a building that doesn't exist reads exactly like a confident
paragraph about one that does. The default way to use AI — accept the first confident
answer — attacks the exact capacities studio exists to build: spatial judgment, the
critical reading of precedent, the ability to defend a design argument.

And the danger lands hardest on the people studio is *for*. Expertise is what makes the
model's errors visible, so **the tool is most dangerous for the learner**, who can't yet
see the tear. The redesign question, then, is not "allow AI or ban it." It is: *how do I
integrate AI so it extends a student's reach without letting them skip the reps that turn
them into an architect?* Get it wrong and I graduate students who can generate a beautiful
board they cannot defend.

## 2. My AI integration plan

**The bet: design thinking is already AI-ready.** The studio loop — scheme → pin-up → crit
→ revision — *is* the agent loop — propose → act → observe → revise. Designers already
iterate, critique, prototype, and tolerate ambiguity, which are exactly the habits that
working well with AI rewards. So I'm bringing the design *feedback loop* to AI rather than
treating it as an oracle.

AI enters the studio through a **suite of purpose-built tools**, each making AI's "grain"
(where it glides on well-trodden data vs. where it tears on the rare or hyper-local)
visible at one stage of the design arc. Every tool is built so it **cannot behave like an
oracle even if it wanted to**:

| Tool | Where AI enters | Status |
|---|---|---|
| **Site Analyzer** | Real public site data (climate, terrain, flood, boundary) downloads straight into Rhino; every *interpretive* claim arrives pre-tagged ✓ verified / ? unverified / ⚠ likely-hallucination. | ✅ built |
| **Precedent Librarian** | A research dossier that **cross-examines itself** — atomizes each claim, tags it, runs a hostile devil's-advocate pass, returns a worksheet of what still needs human verification. | ✅ built |
| **Form Helper** | The student sets the parti; site forces (sun, wind, slope, flood) each perform one legible, reversible move on the mass. The student keeps the pen; the site gets a vote. | 🟡 in design |
| **Rhino Wizard** | A skill-leveled Rhino/Grasshopper tutor that teaches the *workflow* and **refuses to hand over a complete solution** at the beginner level — a correct screenshot the student can't reproduce is a failure state. | 🟡 in design |
| **Code-Zoning Agent · Portfolio Storyteller** | Clause-cited code interpretation; a review/portfolio aid that drafts and provokes but **never ghostwrites**. | 🟡 in design |
| **RAP Tactile-CAD · the "Crit Engine"** | Accessibility/fidelity tooling, and a live demo that solves one brief twice (accept-the-answer vs. run-the-loop) and grades the *tape*. | 🟡 showcase |

The seams between these tools are themselves teachable: together they form an honest
pipeline, not seven gadgets.

**The division of roles is the whole design.** The **student is the cognitive agent** —
they set the parti, price the trust, override the model, verify the claims, and defend the
result in the crit. **AI is a material to interrogate** — critic, drafting partner,
translator, research *suspect* — never the author. The rule that goes on the wall:

> **"Use AI to extend your reach, never to skip your reps."**
> *The assignment was never the product. You are the product. Capability is rented;
> judgment is owned.*

## 3. The student learning outcome

> **Students will develop *calibrated skepticism*: the ability to price their trust in AI
> output against external evidence — interrogating it, verifying it, and overriding it —
> while remaining the author of their design decisions.**

Not credulous (accept everything), not paralyzed (refuse everything): trust priced
continuously against evidence. It is the crit — architecture's native skill — pointed at
the machine.

## 4. My measurement approach

**Grade the trace, not the output.** I assess the reasoning and the AI interaction, not the
final artifact — and the tools are built so that *using them produces the assessment
artifact for free*. What I collect, continuously as students work and at each pin-up:

- **The four-line provenance log** — *tool / what I asked / what I kept–changed–rejected /
  how I verified* — attached to every AI-assisted move.
- **The verification worksheet** — every `?` / `⚠` claim becomes checkable homework; I
  track whether the student's verdict *agreed* with the tool's tag (a calibration signal,
  not just a fact-check).
- **The override ledger** — every time a student rejected or modified an AI suggestion, and
  why. This is the record that they stayed the cognitive agent; an *empty* override log is
  a red flag.
- **"% in your words"** — edit-distance between the AI draft and the final text in the
  review/portfolio tool, to catch ghostwriting.
- **Trace richness over completion speed** in the Rhino tutor — success is "can re-derive
  the move next week," not "got geometry fast."
- **Fidelity scores** in the RAP tool — reconstruction error: is the representation
  *accurate*, not merely plausible. ("Looks done ≠ is done.")

**How I'll know it's working:** over the semester, students should catch *more*
fabrications (a rising catch-rate), override *more deliberately* with better-reasoned
justifications, and defend decisions in the crit that the model would have gotten wrong.
The built-in **blind-vs-grounded** and **vibe-vs-loop** comparisons make that delta
visible rather than asserted.

## 5. My key challenge / design tension

**The offload trap — and the fact that "grade the trace" is still a slogan, not yet a
rubric.**

The same tool extends reach or skips reps depending on *how* it's used; the boundary is
per-use, not per-tool. My defenses are structural (withhold help by schema, report-back
gates, override-with-reason, grading trace richness instead of speed) — but I cannot yet
*prove* they survive a clever, exhausted student at 2 a.m. And my entire assessment model
rests on a trace-grading rubric I **haven't written well enough yet**.

**The stakes if I get it wrong:** a process rubric students learn to *perform* rather than
*live*. The trace becomes a new genre of polished artifact in nobody's thinking — overrides
manufactured after the fact, provenance logs tidied to look reflective — and I've recreated
the exact problem one level up: **polish standing in for evidence**, now in the
documentation of the thinking instead of in the design. (Two further stakes ride alongside
it: **equity** — the graded path has to run on free/approved tools or the equity claim is
theater — and **the novice**, who is the most exposed to invisible error.)

---

## My question for the cohort

> **My whole assessment model is "grade the trace, not the output" — the four-line log, the
> override ledger, the verification worksheet. But a clever, exhausted student can
> *perform* a convincing trace without doing the thinking it's meant to evidence:
> manufacture overrides, tidy the provenance, narrate a reflection they never actually had.
> How do you build a process rubric that rewards genuine judgment without teaching students
> to fake the documentation of it — and what would you look for in a trace that
> distinguishes real trust-calibration from performed compliance?**

---

## Part 2 — Presentation

**Slide deck (5–7 min, same arc as above):**
👉 **https://raw.githack.com/johnnysclark/26-Summer-AI-Workshop/claude/gallant-dijkstra-zrnaom/presentation/index.html**

Built as a self-contained HTML deck (`presentation/index.html` in this repo). It opens in
any browser — arrow keys / space to advance, `F` for full-screen — and links straight to
the two working tools (**Site Analyzer**, **Precedent Librarian**) for the live demo.

*Permanent link after this branch is merged to `main`:*
`https://raw.githack.com/johnnysclark/26-Summer-AI-Workshop/main/presentation/index.html`
*(or enable GitHub Pages →* `https://johnnysclark.github.io/26-Summer-AI-Workshop/presentation/`*).*

---

*Supporting material in this repo: [`BRAINSTORM/SYNTHESIS.md`](BRAINSTORM/SYNTHESIS.md)
(the full pedagogy) · [`TOOL IDEAS ANALYSIS.md`](TOOL%20IDEAS%20ANALYSIS.md) (how the tools
embody it) · [`TOOLS/`](TOOLS) (the tool specs and the two working tools).*
