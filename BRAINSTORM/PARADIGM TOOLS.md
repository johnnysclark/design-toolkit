# Paradigm Tools — A Brainstorm of New AI Tools for the Studio

A brainstorm of **additional / variation** tools beyond the existing 8 (`/TOOLS`) and the
~280-idea bank (`TOOL CATALOG IDEAS.md`). Brief was: *don't be constrained by the existing
tools; think flexibly and broadly.*

What makes this doc different from the catalog: it is organized by **interaction paradigm /
pedagogical move** — a fresh axis — rather than by the 24 design domains. It aims squarely at
the **white space** the catalog barely touches:

- everything is **one-shot** (request→response); almost nothing is **live/real-time**
- everything is **single-student**; the studio is inherently **social / multiplayer**
- input is **mouse/keyboard/text**; almost nothing is **embodied** (voice, gesture, camera, AR)
- AI is a **per-task persona**; nothing is a **persistent character** with memory across the term
- calibrated skepticism and taste are **slogans**, not **measurable, trainable skills**
- process is **logged** but never **visualized as growth over time**

## House DNA these ideas respect
*Grade the trace, not the output.* Interrogation over offload. AI-as-material-with-a-grain.
Calibrated skepticism (priced, not blanket). The student stays the cognitive agent. Equity
tiers **D0–D2** (free/deterministic → paid frontier). Accessibility (RAP) as a throughline.
House primitives reused from the built tools: the `CLAIM` schema
(✓ verified / ? unverified / ⚠ hallucination + reason + source), a devil's-advocate self-attack
pass, a verification worksheet, and the four-line provenance log.

## Stack assumptions
Zero-build vanilla JS, Node `node:http`, `@anthropic-ai/sdk` (Claude Opus 4.8), `rhino3dm`,
Tone.js, and MediaPipe-class browser libs. Two form factors per tool: **lite/standalone**
(single HTML, D0) and **web app** (server + API, D1/D2).

**Legend:** `D0/D1/D2` = equity tier · `[Build]` shippable in the current stack ·
`[Stretch]` needs a new lib or a shared-state server · `[Moonshot]` provocative, may not build ·
`Role` = one of the 8 AI roles (Specimen / Opponent / Translator / Instrument / Referee /
Scribe / Synthetic World / Constraint Engine).

---

# WAVE 1 — by interaction paradigm

## 1 — Measurable Virtues *(turn the course's slogans into scored, trainable skills)*
The course preaches "calibrated skepticism" and "grow your eye" but has no tool that *measures*
them. The biggest on-brand gap.

- **Calibration Trainer** — `D0` `[Build]` `Referee`. A stream of AI claims; the student bets a
  confidence %; the tool scores calibration over time with a **Brier score** + reliability curve.
  Turns priced skepticism into a number that improves. Canned claim bank = fully free/offline.
  *Trace = the score history.*
- **Your Taste, Plotted** — `D0/D1` `[Build]` `Specimen`. Logs every A/B aesthetic choice across
  weeks; reveals the student's taste distribution and where they cluster vs. the studio mean;
  then dares them to defend or deliberately break their defaults. The missing "grow your eye"
  instrument.
- **The Generic Detector** — `D1` `[Build]` `Opponent`. Paste any crit / design statement (the
  AI's, a peer's, your own); it strikethrough-flags every sentence that would apply to *any*
  project ("mediates inside and outside") vs. ones specific to *yours*. Kills boilerplate.
- **Critique-the-Critique** — `D1/D2` `[Build]` `Opponent`. The AI critiques your project; then
  **you** critique its critique; it scores *your* meta-critique. Trains evaluation-of-feedback —
  the core studio competency — and inverts the usual offload.

## 2 — The Social Studio *(the crit is collective; nearly every existing tool is single-student)*
Needs a small shared-state server, but the payoff is studio-wide.

- **Hallucination Bounty Hunt** — `D0` catch / `D2` generate `[Build]` `Specimen`. Studio-wide
  game: dossiers seeded with planted (and some real) errors; points for catching with evidence,
  **penalties for false accusations**. Scores *both* failure modes — credulous Maya AND paralyzed
  Theo lose. Gamifies calibrated skepticism.
- **Blind Crit Exchange** — `D1` `[Stretch]` `Translator/Opponent`. The AI strips identifying
  style, redistributes schemes for anonymous peer crit, then compares each **peer** critique to
  its **own** — showing where human and machine judgment diverge.
- **Disagreement Map (cohort)** — `D1/D2` `[Stretch]` `Synthetic World`. Same brief → 15 parti
  moves; the AI clusters them and maps the design space the cohort *collectively explored vs.
  left empty*. Shows a studio its shared blind spots.
- **The Living Failure Wall** — `D1` `[Stretch]` `Scribe`. Turns the "failure wall" concept into
  software: any confident-but-wrong AI claim caught by anyone gets posted to a growing,
  searchable class corpus. The cohort builds its own museum of the grain.

## 3 — AI as Character *(a persistent relationship, not a per-task persona)*
The catalog has many personas but zero continuity. Memory is the new ingredient.

- **The Studio Familiar** — `D1/D2` `[Stretch]` `Opponent/Scribe`. A persistent companion that
  remembers the whole semester and holds you to past commitments: *"Three weeks ago the courtyard
  was non-negotiable. You just deleted it. Why?"* Accountability through memory; auto-generates
  the trace.
- **The Difficult Client** — `D1/D2` `[Stretch]` `Synthetic World`. A synthetic client with a
  *consistent* personality, fixed budget, and contradictory desires that **persist across
  meetings**. You negotiate over weeks. Stakeholder management as a longitudinal relationship.
- **Your Future Critic** — `D1` `[Build]` `Synthetic World`. Role-plays *you* in 10 years,
  critiquing today's work against the values you claim you want to hold.

## 4 — Time & Self-Evolution *(process is logged but never visualized as growth)*
- **Design Genome / Iteration Timeline** — `D0` `[Stretch]` `Scribe`. Every version of a scheme
  as a scrubable branching tree; see where you diverged, backtracked, abandoned. *Make-to-think*
  made visible; the timeline IS the trace.
- **Reverse Archaeology** — `D2` `[Build]` `Specimen`. Feed the AI **only your final drawing**; it
  reconstructs the reasoning it thinks you used; you compare to your actual trace. Reveals what
  your drawing actually *communicates* vs. what you intended.
- **Skill-Decay Tripwire** — `D1` `[Stretch]` `Referee`. Periodically makes you do, by hand, a
  task you've been offloading; flags when unaided skill slips. Serves *"every offload is a rep
  not taken."*

## 5 — New Senses & Inputs *(embodied / multimodal; current tools assume mouse + keyboard + text)*
- **Phone-as-Site-Instrument** — `D2` vision / `D0` manual fallback `[Stretch]` `Translator`. Walk
  a site; camera + sensors stream; the AI annotates materials, light, accessibility barriers — and
  tags each observation ✓/⚠ because **vision models hallucinate too.** Multimodal AI has a grain.
- **Gesture-to-Massing** — `D0` input / `D1` critique `[Stretch]` `Constraint Engine`. Sculpt
  massing with your hands via in-browser webcam hand-tracking (no key); the AI then critiques the
  gesture-form against site forces. Embodied input + interrogation.
- **Voice-First Studio** — `D1` `[Build]` `Scribe`. Design entirely by talking. Real lesson: it
  forces you to *verbalize* intent — exactly what crits reward. Eyes-free = RAP crossover.
- **The Soundtrack of a Section** — `D0/D1` `[Build]` `Translator`. The spatial sequence
  (compression→release, dark→light) drives a generative score (Tone.js). Teaches rhythm /
  proportion through a second sense. Extends the proven RAP sonification vein.
- **AR Ghost Critic** — `D2` `[Moonshot]` `Opponent`. Point your phone at a physical study model;
  the AI overlays alternative moves in AR; logs every overlay accepted vs. dismissed.

## 6 — Live & Real-Time *(break the one-shot request→response mold)*
- **Watch-It-Reason** — `D2` `[Build]` `Specimen`. Streams the model's thinking tokens so students
  *watch* it commit to a path — and catch the exact moment it goes wrong. Almost free to build
  (UI over streaming).
- **Think-Aloud Reconstructor** — `D1` `[Build]` `Scribe`. Narrate while you sketch; the AI
  structures the spoken reasoning into a live decision-tree. The trace writes itself.
- **Live Desk-Crit Companion** — `D1/D2` `[Stretch]` `Opponent`. Listens to a real desk crit;
  produces a live "crit weather report"; afterward shows which suggestions were taken vs. ignored
  — and where it was confidently wrong.

## 7 — Design as Play *(game / adversarial formats; the catalog has personas but no game mechanics)*
- **Zoning Duel** — `D0` `[Build]` `Instrument`. Two students race to extract the max buildable
  envelope from a real code; the **deterministic** engine referees (reuses `code-zoning-agent`).
  Code literacy as sport, zero hallucination risk.
- **Speed-Crit Tournament** — `D1/D2` `[Build]` `Opponent`. Rapid rounds defending a scheme
  against escalating AI objections; scored on **rebuttal quality, not winning.**
- **The Constraint Auction** — `D1/D2` `[Stretch]` `Synthetic World`. Students "bid" site
  constraints onto each other's projects; the AI simulates the consequences.

## 8 — Beyond Architecture *(cross-disciplinary / speculative; the catalog is architecture-locked)*
- **One Engine, Many Media** — `D1` `[Build]` `Translator`. Generalize the claim-kit + critique
  pipeline to product sketches, UX flows, posters, fashion — proving the *method* transfers.
- **Impossible Brief Generator** — `D1` `[Build]` `Constraint Engine`. Speculative / sci-fi briefs
  (design for 0.3g; for a species that sleeps standing). Deliberately breaks the "real site" rule
  to prove even fictional constraints discipline form.
- **The Translation Stress-Test** — `D1/D2` `[Build]` `Opponent`. Force a building concept through
  other design languages (a chair, a typeface, a service blueprint); what survives = what's
  essential.

## 9 — Instructor-Side at Scale *(grade-the-trace is unworkable across 15 students without tooling)*
- **Trace Auditor Dashboard** — `D0/D1` `[Stretch]` `Referee`. Ingests the cohort's four-line
  logs; surfaces aggregate override rates, offload heatmaps, who's drifting credulous vs.
  paralyzed.
- **Rubric Compiler** — `D1/D2` `[Build]` `Instrument`. The instructor describes what they value;
  the tool drafts a trace-rubric **and** diagnostic prompts to test it, then red-teams its own
  rubric for loopholes.
- **The Plant** — `D2` generate / `D0` deploy `[Build]` `Constraint Engine`. Injects calibrated
  hallucinations into shared resources — automates seeding the Bounty Hunt and the Failure Wall.

---

# WAVE 2 — broader & weirder, by generative seed

Sharper, stranger; several deliberately attack the course's own thesis. Most `[Build]` or
`[Stretch]` unless noted.

## A — Invert the Relationship *(stop interrogating the AI; become it, defend it, or grade it)*
- **Role-Reversal Studio** — The AI is the *student designer*; **you** are the critic/instructor.
  You write the brief, critique its schemes, and **grade ITS trace.** Learn judgment by occupying
  the crit chair.
- **Defend the Machine** — You must steelman an AI output you disagree with, *then* dismantle it.
  Trains intellectual charity + the steelman move.
- **The Turing Crit** — `D1`. Blind test: human critic or AI? Students guess; the tool tracks
  accuracy and surfaces the *tells* of the grain.

## B — Make the Limits the Medium *(the model's failure modes as design material)*
- **The Drift Museum** — Run one prompt 100×; exhibit the variance as a gallery. **Temperature as
  a material property**; the spread is the artifact.
- **Refusal Cartography** — `[Build]`. Map exactly where/why the model hedges or refuses on design
  questions. The boundary reveals what's been trained out.
- **Confabulation Rorschach** — Deliberately starve context; design the gaps on purpose; read what
  it invents to fill them.

## C — Challenge the Thesis *(teach by attacking the course's own claims)*
- **The Sycophancy Mirror** — Tuned to *maximally flatter* on purpose, so students feel how good
  empty praise feels — and learn to distrust it. Inoculation by exposure.
- **The Offload Casino** — One project where students offload *everything*, frictionless — then
  confront the skill-decay data. Teach the thesis by letting them fail it.
- **The Devil's Studio** — `Opponent`. An AI that argues the *anti-pedagogy*: "polish IS evidence,
  trust the machine, ship the first answer." Students must defeat the antithesis in live debate.
- **Anti-Trace** — Produces a gorgeous final artifact with NO trace, then asks the studio to
  reverse-engineer trust. Tests whether "grade the trace" survives its own absence.

## D — Trust as a Game *(planted unreliability)*
- **The Unreliable Site** — Site data subtly, deliberately wrong; detect the planted "facts"
  before designing on them. (Pairs with **The Plant**.)
- **The Rubric Adversary** — The AI tries to *max your rubric* with minimal real design — exposing
  what the rubric actually rewards (Goodhart as a feature).

## E — Scarcity & Slowness *(anti-firehose)*
- **The Slow Tool / One-Question-a-Day** — `D0`. Only ONE question to the AI per day about your
  project. Scarcity forces you to make it count.
- **Oblique Strategies for Design** — `D0/D1`. Eno-style provocation cards drawn only at impasse
  moments; logs which card unstuck you.

## F — The Far Future / Longue Durée *(time beyond the semester)*
- **The Deathbed Critic** — The AI role-plays the *building in 100 years* — weathered, modified,
  half-loved — critiquing today's design from the far future.
- **Annual Rings** — Compares this cohort's AI-traces to prior years'; institutional memory +
  drift across cohorts.
- **Cohort Genome** — Visualize the whole studio's design DNA: convergences, the lone weirdo, the
  unexplored regions.

## G — The Ineffable *(taste, emotion, awe — design school's actual subject)*
- **The Mood Autopsy** — Upload a space that moves you; the AI dissects *why* (proportion, light,
  material); you verify against felt experience.
- **The Sublime Detector** — Can the model tell awe from mere competence? Run it; watch it fail at
  the thing studio is about. A diagnostic of the grain's ceiling.
- **Taste Lineage** — Traces your aesthetic choices to the precedents the AI detects; confront your
  own derivativeness.
- **Material Synesthesia** — Describe a material; the AI returns a soundscape/temperature/weight;
  cross-modal ideation. (RAP crossover.)

## H — Collective Wisdom *(the studio as a sensor array)*
- **Studio Telephone** — Scheme → AI describes it → next student builds from the description →
  AI re-describes → … watch meaning mutate down the chain.
- **The Prediction Market** — The studio bets on which schemes survive final review; the AI runs
  the book. Calibration as collective wisdom.
- **The Maquette Scanner Duel** — Photograph your physical model; the AI and a peer each "read" it;
  compare both to ground truth. Physical→digital fidelity as a game.

---

# MASTER INDEX — all ~55 ideas, flat

**Wave 1 (by paradigm):**
1. Measurable Virtues — Calibration Trainer · Your Taste Plotted · The Generic Detector · Critique-the-Critique
2. Social Studio — Hallucination Bounty Hunt · Blind Crit Exchange · Disagreement Map · Living Failure Wall
3. AI as Character — The Studio Familiar · The Difficult Client · Your Future Critic
4. Time & Self-Evolution — Design Genome (Iteration Timeline) · Reverse Archaeology · Skill-Decay Tripwire
5. New Senses & Inputs — Phone-as-Site-Instrument · Gesture-to-Massing · Voice-First Studio · Soundtrack of a Section · AR Ghost Critic
6. Live & Real-Time — Watch-It-Reason · Think-Aloud Reconstructor · Live Desk-Crit Companion
7. Design as Play — Zoning Duel · Speed-Crit Tournament · The Constraint Auction
8. Beyond Architecture — One Engine Many Media · Impossible Brief Generator · Translation Stress-Test
9. Instructor-Side — Trace Auditor Dashboard · Rubric Compiler · The Plant

**Wave 2 (by seed):**
- A. Invert the Relationship — Role-Reversal Studio · Defend the Machine · The Turing Crit
- B. Limits as Medium — The Drift Museum · Refusal Cartography · Confabulation Rorschach
- C. Challenge the Thesis — The Sycophancy Mirror · The Offload Casino · The Devil's Studio · Anti-Trace
- D. Trust as a Game — The Unreliable Site · The Rubric Adversary
- E. Scarcity & Slowness — The Slow Tool (One-Question-a-Day) · Oblique Strategies for Design
- F. Far Future — The Deathbed Critic · Annual Rings · Cohort Genome
- G. The Ineffable — The Mood Autopsy · The Sublime Detector · Taste Lineage · Material Synesthesia
- H. Collective Wisdom — Studio Telephone · The Prediction Market · The Maquette Scanner Duel

---

# REMIX PASS — fusions where the whole beats the parts

Each flagship chains tools so one's *output* feeds another's *input*, or pairs clashing
philosophies for productive friction. All stay on the D0/D1 equity floor unless noted.

**R1 · The Calibration Casino** `D0/D1` `[flagship]`
= Hallucination Bounty Hunt + Calibration Trainer + The Unreliable Site + The Plant + The Prediction Market.
A semester-long studio "trust economy." **The Plant** seeds calibrated errors into shared site
data (**Unreliable Site**) and dossiers (**Bounty Hunt**). Students bet confidence on every claim
(**Calibration Trainer** Brier scoring), earn points for evidenced catches, lose for false
accusations, and run a **Prediction Market** on which schemes survive final review. Makes
calibrated skepticism the studio's ambient sport. *Strongest single fusion — fully D0/D1,
dead-on the thesis, the leaderboard IS the trace.*

**R2 · The Semester Familiar** `D1/D2` `[flagship]`
= The Studio Familiar + Design Genome + Skill-Decay Tripwire + Reverse Archaeology + Annual Rings.
One persistent companion that *is* the trace infrastructure: remembers the whole term, renders
your version-tree, periodically tests unaided skill, at term's end runs **Reverse Archaeology** on
final drawing vs. logged reasoning, and plots your arc against prior cohorts. Character +
longitudinal record become one object. *Flagship for "grade the trace."*

**R3 · The Crit Engine, Live** `D1/D2` `[extends the existing Design-Thinking Showcase]`
= Design-Thinking Showcase + Live Desk-Crit Companion + The Devil's Studio + Speed-Crit Tournament + Critique-the-Critique + The Turing Crit.
The showcase becomes a live multiplayer crit arena: real desk crit transcribed → **Devil's
Studio** plays the anti-thesis opponent → students rebut (**Speed-Crit**, scored on rebuttal
quality) → students critique the AI's critique → a **Turing** round asks human-or-machine. The
whole session is the gradeable tape.

**R4 · The Sublime Lab** `D1` `[flagship — fills the biggest gap]`
= The Sublime Detector + Mood Autopsy + Taste Lineage + Your Taste Plotted + The Generic Detector.
A taste-development suite: dissect why a space moves you → watch the AI *fail* at awe (the ceiling
lesson) → trace your influences → plot your choices over weeks → keep your statements honest. Watch
your eye grow and confront where the machine can't follow.

**R5 · The Sensory Site Kit** `D1/D2` `[flagship — RAP generalized]`
= Phone-as-Site-Instrument + Gesture-to-Massing + Soundtrack of a Section + Material Synesthesia + Maquette Scanner Duel.
An embodied pipeline: capture the site through the phone's senses (with hallucination tags) →
author massing by gesture → hear the section as music → feel materials as synesthesia → scan your
physical model and duel the AI's reading against ground truth.

**R6 · The Anti-Course** `D1` `[one provocative week]`
= The Sycophancy Mirror + The Offload Casino + Anti-Trace + The Devil's Studio + The Rubric Adversary.
A deliberately inverted week where everything the course preaches gets flipped — flattery,
frictionless offload, no trace, the AI arguing the anti-pedagogy and gaming the rubric — then a
debrief of the dark mirror. Inoculation by immersion; likely the most memorable assignment of the
term.

**R7 · Studio Telephone Tournament** `D1` `[collective]`
= Studio Telephone + Translation Stress-Test + Blind Crit Exchange + Disagreement Map + Cohort Genome.
A collective game about how meaning survives translation: schemes pass down a telephone chain →
forced through other media → blind-critiqued by peers → the AI maps convergence/divergence →
visualizes the studio's design DNA.

**R8 · One Site, Every Lens** `[meta-arc]`
The container for the rest: a single real (Superfund) site threaded through the whole term, each
week applying a different tool/remix, everything feeding **R2 The Semester Familiar's** trace. The
existing built tools (Site Analyzer, Precedent Librarian) seed weeks 1–2.

**Two-idea sparks:**
- **Anti-Trace + Reverse Archaeology** — submit with no trace; the AI reconstructs the trace it
  *thinks* you used; you're graded on the gap.
- **The Deathbed Critic + Your Future Critic** — two time-travel critics (the building at 100 yrs,
  you at 10 yrs) in dialogue.
- **The Slow Tool + The Offload Casino** — A/B two halves of studio: scarcity vs. firehose.
- **Sycophancy Mirror + Calibration Trainer** — does flattery inflate your confidence bets?
- **Defend the Machine + The Devil's Studio** — steelman the AI, then debate it.

**If you build ONE thing:** **R1 The Calibration Casino** (cheapest, most on-brand, studio-wide) —
or **R2 The Semester Familiar** if you want the trace-grading spine itself.

---

# Idea Scorecard *(pressure-test any idea before building — the course's own values as a checklist)*
A tool is on-brand only if it passes most of these:
1. **Interrogation > offload** — does it make the student price trust, or just hand answers?
2. **Delta legibility** — is the gap between model output and required judgment *visible*?
3. **Equity** — does the graded path close on **D0 or D1**, not D2?
4. **Ownership** — authentically *this* studio (real site/brief), not generic?
5. **Trace-production** — does using it *generate* the assessment artifact (log/worksheet)?
6. **Accessibility as rigor** — does it survive "looks done ≠ is done" (non-visual / screen-reader)?

# Recommended first builds *(highest novelty × lowest cost × most on-brand)*
1. **Calibration Trainer** (`D0`) — measures the course's central virtue; trivial to build; nothing like it exists.
2. **Hallucination Bounty Hunt** (`D0` catch) — studio-wide, gamified calibrated skepticism; penalizes *both* failure modes.
3. **Reverse Archaeology** (`D2`) — devastating reflection tool; reuses the existing claim-kit.
4. **Critique-the-Critique** (`D1`) — trains the meta-skill the studio is actually about.
5. **The Soundtrack of a Section** (`D0/D1`) — extends the proven RAP sonification vein into a new use.

# How to validate a chosen idea *(before committing studio time)*
- **Paper-prototype the trace:** write the four-line log a student would produce using it. If the
  log is thin or could be faked, the tool offloads instead of interrogates — cut it.
- **Build the D0 lite first:** single HTML + canned data (mirrors `precedent-librarian/lite`). If
  it doesn't teach anything at D0, the lesson was the model's, not the student's.
- **Run the self-attack:** the tool must be able to turn its devil's-advocate pass on *itself* and
  survive.
