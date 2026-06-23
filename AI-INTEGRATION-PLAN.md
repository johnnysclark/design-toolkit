# AI Integration Plan & Cohort Presentation
## Architecture 273 — Fundamentals of Design
**John Clark · Teaching Assistant Professor**

*Summer AI Studio — culminating submission for the in-person phase. An honest, specific
account of where my AI integration plan stands at the end of the first two weeks: what
I'm building, how I'll know if it works, and what I still have to figure out.*

---

## 1. The course and the problem

I teach **Architecture 273 — Fundamentals of Design**: the course where students first
learn to carry a building from a real site through concept, form, and representation —
and then to stand up and *defend* it. Studio is where architects are made, not by
producing a board but by developing judgment, synthesizing messy inputs, and learning to
argue for a decision under questioning.

The problem I actually have is not that my students misuse AI. It's that **they can't yet
justify their designs.** Asked *why* the building sits where it sits, *why* the massing
turns toward the south, *why this precedent and not that one*, a fundamentals student
reaches for taste or habit, not evidence. The three places a design argument is usually
won — **site-specific environmental forces, historical precedent analysis, and creative
form generation** — are exactly the three places a beginner is weakest. My whole job is to
level up their **reasoning, synthesis, and analysis** of both the *real-world site* and the
*invented building* they set on it.

This is the year that changes. **Agentically-coded AI tools can hand a beginner the
logics, the language, and the data to make a more sophisticated judgment** — and let them
run computational analysis (solar gain, wind exposure, thermal mass, sightlines) that was
simply out of reach for a fundamentals studio until now. So the redesign question is not
"allow AI or ban it." It is: *how do I put this new reach in students' hands so it raises
the level of their judgment — without letting the tool do the judging for them?*

## 2. My AI integration plan

**The bet: design thinking is already AI-ready.** The studio loop — scheme → pin-up → crit
→ revision — *is* the agent loop — propose → act → observe → revise. Designers already
iterate, critique, prototype, and tolerate ambiguity, which are exactly the habits that
working well with AI rewards. Teaching a student to work *with* AI turns out to follow the
same tenets as teaching a student to become a **resilient designer**: move, test, find
where it breaks, revise. So I bring the design *feedback loop* to AI rather than treating
it as an oracle.

I want students to **move quickly and embrace these tools, iterate often, and hold a
"trust but verify" stance** — fluid but skeptical, actively hunting the edge cases and
failure modes rather than waiting to be burned by them. I expect tools like these to
become **as ubiquitous as the private software our students already live in** (Rhino,
Adobe, the Grasshopper ecosystem); learning to wield them — and to distrust them well — is
now part of the craft.

**Two ways AI enters the room.** I'll *demo* how I vibe-code tools of real sophistication
and hand those to students to use, and **we'll vibe-code simpler tools together, in
class**, so they watch the machine get built and learn to build their own. Using a tool
and authoring a tool are the same literacy a year apart.

The suite is organized around the design arc — and around the three places students most
need to level up:

| Tool | What it does / where AI enters | Status |
|---|---|---|
| **Skills / Design Production Tutor** | A chatbot with built-in expertise that **tests a student's first answer, then probes them into dialogue** instead of handing back a solution — teaching design production (Rhino, drawing, workflow) by Socratic pressure. | 🟡 in design |
| **Site Analysis / Form Generator** | Place a building on a real site and watch how changing the **form** changes real physical characteristics — **solar gain, wind exposure, thermal mass, views**. The computational analysis a beginner couldn't run before. | ✅ site analysis built · 🟡 form gen in design |
| **Precedent / Research Machine (Librarian)** | Point it at a reference image you found and get grounded information back; doubles as the **class library** of image + text references. Tags every claim and returns a verification worksheet. | ✅ built |
| **Portfolio / Storyteller Helper** | A chatbot tuned for **presentations and portfolios** — drafts, provokes, and sharpens the argument while keeping the student's voice. Never ghostwrites. | 🟡 in design |
| **RAP Toolkit** | Continued development of the **Radical Accessibility Project**: tools for blind / low-vision architectural production — CLI Rhino driver, tactile-media generator, alt-text generator. | 🟡 in progress |
| **Drawing Cleanup Tool** | Photoshop-analog widgets for routine studio production — clean a scan, flatten a diagram, prep a drawing for pin-up. | 🟡 in design |
| **Miro Board Alternative / Studio Culture Generator** | A studio board to replace Miro that **encourages and tracks peer-to-peer engagement** with the weekly process drawings — making studio culture visible and creditable. | 🟡 in design |

Together they cover the arc of a project — site, precedent, form, production, presentation,
and the studio culture around it — one kit, not seven gadgets.

**The division of roles is the whole design.** The **student is the cognitive agent** —
they set the parti, price their trust, override the model, verify the claims, and defend
the result in the crit. **AI is a capable partner to interrogate** — analyst, critic,
drafting partner, translator, research lead — never the author. The rule that goes on the
wall:

> **"Use AI to extend your reach, never to skip your reps."**
> *The assignment was never the product. You are the product. Capability is rented;
> judgment is owned.*

## 3. The student learning outcome

The main outcome is the one studio has always chased: **students get measurably better at
explaining their work — both the final design and the process that produced it.** AI is the
new lever on that old goal, and learning to work with it builds the same muscles a
resilient designer needs.

The AI-specific skill underneath it I'll call **calibrated skepticism**: the ability to
*price* trust in a tool's output against external evidence — embracing it to move fast,
then interrogating, verifying, and overriding it — while staying the author of every design
decision. Not credulous (accept everything), not paralyzed (refuse everything): trust
priced continuously against evidence. It is "trust but verify" made into a habit — the
crit, architecture's native skill, pointed at the machine.

## 4. My measurement approach

**Grade the trace, not just the output.** Studio already grades process; AI just gives me a
richer trace to grade — and I build the tools so that *using them produces the assessment
artifact for free*. What I collect, continuously as students work and at each pin-up:

- **The four-line provenance log** — *tool / what I asked / what I kept–changed–rejected /
  how I verified* — attached to every AI-assisted move.
- **The verification worksheet** — every flagged claim becomes checkable homework; I track
  whether the student's verdict *agreed* with the tool's tag (a calibration signal, not
  just a fact-check).
- **The override ledger** — every time a student rejected or modified a suggestion, and
  why. An *empty* override log is a red flag: it means the student stopped being the agent.
- **The edge-case log** — did the student find where the tool *breaks*? Surfacing a failure
  mode is worth more than a clean run, because finding the tear is the skill.
- **"% in your words"** — edit-distance between the AI draft and the final text in the
  portfolio tool, to catch ghostwriting.
- **Trace richness over completion speed** in the tutor — success is "can re-derive the
  move next week," not "got geometry fast."

**How I'll know it's working:** over the semester students should justify designs with site
data and precedent they'd previously have hand-waved, catch *more* fabrications (a rising
catch-rate), override *more deliberately* with better-reasoned justifications, and defend
decisions in the crit that a first-draft AI answer would have gotten wrong.

## 5. My key challenge / design tension

**The students who most need the reach are the least equipped to verify it.** "Trust but
verify" assumes you can tell *when* to distrust — but expertise is exactly what lets you
see the model's error, and my fundamentals students don't have it yet. I'm asking beginners
to move fast and embrace tools whose failure modes they can't reliably spot. Push too hard
on *embrace* and they offload the judgment studio exists to build; push too hard on
*verify* and I've just slowed them down with a tool that was supposed to extend them. The
line between *extending reach* and *skipping reps* is per-use, not per-tool — and it runs
right through every student.

And my assessment leans on a trace I can't yet *prove* is honest. A clever, exhausted
student can **perform** a convincing trace without doing the thinking it's meant to
evidence — manufacture overrides, tidy the provenance, narrate a reflection they never
actually had. Get that wrong and I've recreated my original problem one level up: **polish
standing in for evidence**, now in the documentation of the thinking instead of in the
design. (Two stakes ride alongside it: **equity** — the graded path has to run on free /
approved tools or the equity claim is theater — and **the novice**, who is most exposed to
invisible error.)

---

## My question for the cohort

> I'm asking genuine beginners to *embrace* powerful tools fast **and** *verify* them well —
> but verification is the very expertise they don't have yet, and my whole assessment rests
> on a process trace (provenance log, override ledger, verification worksheet) that a tired,
> clever student can simply *perform*: manufacture the overrides, tidy the reflection,
> narrate a trust-calibration that never happened. **How do you teach novices to verify what
> they can't yet fully judge — and how do you build a process rubric that rewards real
> trust-calibration without teaching students to fake the documentation of it? What, in a
> trace, distinguishes genuine judgment from performed compliance?**

---

## Part 2 — Presentation

**Slide deck (5–7 min, same arc as above):**
👉 **https://raw.githack.com/johnnysclark/26-Summer-AI-Workshop/claude/gallant-dijkstra-zrnaom/presentation/index.html**

Built as a self-contained HTML deck (`presentation/index.html` in this repo). It opens in
any browser — arrow keys / space to advance, `F` for full-screen — and links straight to
the two working tools (**Site Analysis**, **Precedent / Research**) for the live demo.

*Permanent link after this branch is merged to `main`:*
`https://raw.githack.com/johnnysclark/26-Summer-AI-Workshop/main/presentation/index.html`
*(or enable GitHub Pages →* `https://johnnysclark.github.io/26-Summer-AI-Workshop/presentation/`*).*

---

*Supporting material in this repo: [`BRAINSTORM/SYNTHESIS.md`](BRAINSTORM/SYNTHESIS.md)
(the full pedagogy) · [`TOOL IDEAS ANALYSIS.md`](TOOL%20IDEAS%20ANALYSIS.md) (how the tools
embody it) · [`TOOLS/`](TOOLS) (the tool specs and the two working tools).*
