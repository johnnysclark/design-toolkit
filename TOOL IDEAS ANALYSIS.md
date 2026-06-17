# Tool Ideas — Analysis

*A reflection on the tooling research and brainstorm: how to think about these tools,
how they cluster, what makes a good one here, and how to deliver them.*
*Companion to `TOOL CATALOG IDEAS.md` (the raw list) and `BRAINSTORM/SYNTHESIS.md`
(the pedagogy). Living document — last worked 2026-06-16.*

---

## 0. What we're working from

- **~280 tool/workflow ideas** across 24 domains in `TOOL CATALOG IDEAS.md` — wide and deliberately un-pruned.
- **A pedagogy** (`BRAINSTORM/SYNTHESIS.md`): AI as a *material with a grain*; grade the trace, not the output; the student stays the cognitive agent; calibrated skepticism; provenance.
- **Two tools already built** (`site-analyzer`, `precedent-librarian`) that turn out to share a single design pattern — which tells us a lot about what "good" looks like here.
- **Seven high-level tools** now scoped as folders, of which five are specs.

The job of this doc is to turn a huge list into a way of *thinking* — so choosing,
scoping, and delivering tools is principled rather than ad hoc.

---

## 1. The pattern the built tools already discovered

Both `site-analyzer` and `precedent-librarian` independently landed on the same shape.
Name it, because it's the house style:

> **Hard data is sourced and downloadable. Every *model* claim is tagged
> (`✓ verified` / `? unverified` / `⚠ likely-hallucination`) and cited. The tool
> attacks its own output, hands the student a verification worksheet, and logs its
> own provenance.**

This is the *grain-made-visible* pattern. It's not a feature set — it's the pedagogy
compiled into software. Three consequences:

1. **The tool can't be an oracle even if it wanted to.** The interface makes
   trust-pricing unavoidable. That's the whole point.
2. **It's reusable.** Claim-tagging + devil's-advocate pass + verification worksheet +
   four-line log is a *template* every other tool can inherit. `code-zoning-agent` and
   `rhino-wizard` arguably *must* inherit it (high-stakes, against-the-grain domains).
3. **It produces the trace for free.** The log and worksheet are exactly the artifacts
   "grade the trace" needs. Build the tool right and the assessment artifact falls out.

**Implication:** before building any new tool, ask "where does this one put the seams,
the tags, the worksheet, the log?" If a tool has no natural place for them, it's
probably an offload tool, not a studio tool.

---

## 2. Five ways to slice the catalog (pick the lens that helps)

No single taxonomy is "right." Different cuts answer different questions.

### A. By what you do with the AI — `[B]` / `[W]` / `[D]`
- **`[B]` Build a tool** — vibe-code an app/widget. Teaches agency + how AI works. (Most of our seven.)
- **`[W]` Run a workflow** — prompt patterns/agents on an existing model. Teaches judgment + speed.
- **`[D]` Demo/diagnostic** — observe or break the model. Teaches the grain, cheaply and loudly.
- *Use:* a workshop wants some of each. The `[D]`s are the cheapest to make and the most pedagogically vivid; the `[B]`s are the durable assets.

### B. By the three SYNTHESIS lenses
- **Two-parter** (frontier demo + accessible build; the *delta* is the lesson; D0–D2 equity rating).
- **Eight roles** AI can play (specimen / opponent / translator / instrument / referee / scribe / synthetic-world / constraint-engine).
- **Explore → Implement → Build** (interrogate before building → run one real thing → make it reusable with a spec).
- *Use:* these are for shaping an *assignment* around a tool. Map any tool onto all three before committing.

### C. By position in the studio workflow
The 24 domains collapse into the design arc: **research → site → program → concept →
form → representation → documentation → review/portfolio**, with **two cross-cutting
spines**: *accessibility/RAP* and *process/provenance*. Our seven tools tile this arc:
- research/site: `site-analyzer`, `precedent-librarian`, `code-zoning-agent`
- concept/form: `form-helper`
- making/skill: `rhino-wizard`
- review/communication: `portfolio-storyteller`
- cross-cutting: `rap-tactile-cad` (and the provenance pattern from §1)
- *Use:* reveals coverage gaps and natural hand-offs (next section).

### D. By "instrument vs. offload" (the per-use boundary)
The catalog's sharpest pedagogical distinction: the *same* tool can extend reach or
skip reps depending on use. Image-gen is sketching (instrument) or design-bypass
(offload). The boundary is per-use, not per-tool — so tools should be built to *push
toward the instrument side* (interrogation, divergence-keeping, trace).

### E. By build cost vs. payoff
- **Afternoon widgets** (sun-path, dew-point, truss toy) — cheap, single-concept, great teaching demos.
- **Agents/research tools** — medium cost, need RAG/sourcing to be honest.
- **Flagship/pipeline** — expensive, deep, one of them (the showcase).
- *Use:* budget the summer. Many cheap `[D]`/widget builds + one deep showcase beats five half-built apps.

---

## 3. What makes a *good* tool here (selection criteria)

Drawn from the two-parter scoring rubric and the built-tool pattern. Score candidates on:

1. **Interrogation over offload** — does it make the student price trust, or does it just hand answers?
2. **Delta legibility** — is the gap between what the model does and what judgment must do *visible*?
3. **Degradation / equity (D0–D2)** — does the graded path run on free/approved tools? (D0 deterministic / D1 free model / D2 needs paid — D2 is weak.)
4. **Ownership** — is it authentically the studio's (targets *our* site/brief), so it can't be generic?
5. **Scope realism** — buildable in the time we have?
6. **Generalizability** — serves a studio of students, not a niche of one?
7. **Trace-production** — does using it *generate* the assessment artifact (log/worksheet/seams)?
8. **Accessibility as rigor** — does it pass "looks done ≠ is done" (screen-reader, non-visual)? This is both ethics and the lab's research edge.

A tool that scores low on 1, 2, and 7 is an offload tool — interesting, maybe useful,
but not the studio's pedagogy. Build it knowingly or not at all.

---

## 4. The tools as an ecosystem, not a pile

The strongest move is to make the tools **hand off to each other**, mirroring a real
design process — so the workshop demonstrates a *pipeline*, not seven gadgets:

```
            site-analyzer ──(sun/wind/orientation)──▶ form-helper ──┐
                  │                                                  │
            (parcel/zone)                                           ▼
                  ▼                                          (massing/geometry)
            code-zoning-agent ──(legal envelope)──▶ form-helper        │
                                                                       ▼
        precedent-librarian ──(design + technical refs)──▶ (design dev) │
                                                                       ▼
            rhino-wizard ──(how to build the model)───────────────────┤
                                                                       ▼
                                                        portfolio-storyteller
                                                       (review + narrative)

   rap-tactile-cad  ── cross-cuts every stage: any geometry/drawing → tactile/audio/verbal,
                       with fidelity tested (not just translated). Also the provenance/
                       trace pattern from §1 runs through all of them.
```

This is also the catalog's "fully integrated AI-for-Architects pipeline" flagship —
except assembled from honest, individually-legible parts rather than one black box.
That's the better version: the seams between tools are themselves teachable.

---

## 5. Delivery — how these reach students

How a tool is *packaged* is a pedagogical choice, not an afterthought.

### Form factors (we already have a good ladder)
- **Single-file HTML, double-click, no key** (`*-standalone`, `*-lite`) — the equity floor. Anyone runs it, no install, no account, no cost. Best default for a workshop demo.
- **CLI** — fast to build, scriptable, good for testing + batch (e.g. Rhino export).
- **Full web app** (`web/`) — richest, but needs `npm install` + API key; the D2 case. Use for depth, not for the graded floor.
- **Canned/sample mode** — show the *interface and pedagogy* (claim tags, worksheet, log) with zero setup or cost. Underrated for lectures.

### Delivery principles
- **Opacity is pedagogy.** Prefer tools/stacks that *show* their code and reasoning (Claude Code, Artifacts) over ones that hide it (Bolt/Lovable). The student should be able to read the seam.
- **Degrade to free.** The graded path must work on approved/free tools or the equity claim is theater. Single-file HTML hitting public APIs (like `site-analyzer/standalone`) is the gold standard.
- **The artifact is the trace.** Delivery should make the log/worksheet easy to export and submit.
- **Accessibility-first delivery.** Screen-reader-first, keyboard-navigable, captioned — both because it's right and because it's the lab's research. `rap-tactile-cad` is the deepest expression; every tool should at least pass the basics.
- **Workshop packaging.** For colleagues/classmates: a hosted index page linking each tool's zero-setup variant + a one-paragraph "what grain does this make visible?" Each tool ships with its README spec.

---

## 6. The showcase question

The workshop wants **one tool to go deep on**. Candidates and the case for each:

- **`rap-tactile-cad` (recommended).** It's the lab's actual research frontier, it's
  uncopyable (no one else can teach it), it has real publishable upside (ACADIA/JAE),
  and it forces the hardest, most original version of the pedagogy: *don't just
  translate — prove the translation is accurate* (fidelity testing, real participants).
  Risk: largest scope; needs the earlier tactile-CAD work ported in.
- **Integrated pipeline (§4).** Highest "wow," shows the whole arc. Risk: depends on
  the parts being solid first; easy to become a thin demo.
- **`form-helper`.** Most visually compelling for a design audience; sits at the
  concept/form heart of studio. Risk: easiest to drift toward offload ("AI made the
  form") unless the force→move mapping stays legible.

**Reading:** make `rap-tactile-cad` the showcase (depth + originality + research), and
use the **pipeline** as the *framing demo* that situates it — the showcase is the deep
node inside the ecosystem story. Keep `form-helper` as the crowd-pleasing secondary.

---

## 7. Open questions / decisions to make

- [ ] Confirm the showcase pick (lean: `rap-tactile-cad`).
- [ ] Locate + port the earlier tactile-CAD work (Radical-Accessibility-Toolkit?).
- [ ] Decide the **shared component**: factor the claim-tag / worksheet / log pattern into a reusable kit every tool imports?
- [ ] Which 3–4 cheap `[D]` demos to build alongside the showcase (best teaching-per-hour)?
- [ ] Hosting: a single workshop landing page? GitHub Pages off this repo?
- [ ] How explicitly to teach the **hand-off pipeline** vs. tools standalone.
- [ ] For each built tool: name the `TOOL CATALOG IDEAS.md` item(s) it realizes (most already do).

---

*Raw list: `TOOL CATALOG IDEAS.md` · Pedagogy: `BRAINSTORM/SYNTHESIS.md` · Lecture notes: `AI PEDAGOGY NOTES.md`*
