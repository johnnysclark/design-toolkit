# Review / Portfolio Storyteller Aid

**A rehearsal room and a drafting room — never a ghostwriter.** It helps a student turn
a project into an *argument they can defend* (for the review/crit) and a *story they can
publish* (for the portfolio), by doing the two things AI is genuinely good at here:
**forecasting how others will hear the work** and **producing disposable first drafts
the student demolishes and rewrites**. It is built against the failure mode of the
category — a polished project statement in nobody's voice — by treating the student's
*edits to the draft* as the deliverable, not the draft.

> *"It provokes and drafts; the student decides and speaks."* The crit and the portfolio
> are the same skill (turn a design into a defensible narrative) for two audiences.

**Status:** 🟡 planned / scoping. Maps to `TOOL CATALOG IDEAS.md` §13 (Critique) + §15 (Communication).

---

## Shared spine (both modes, one project record)
1. **Intake (student types, doesn't upload-and-forget):** the project, the *one claim* it makes, the move they're proudest of, the thing they're nervous about. Optional sourced facts pulled from sibling tools. **It never invents project facts.**
2. **Mode pick** → Review aid or Portfolio aid.
3. **Provoke / draft.**
4. **Student rewrites in a visible two-pane editor** — AI text read-only on the left, the student's pane starts empty; edits are tracked.
5. **The tool attacks the result** (devil's-advocate on the student's *own* words).
6. **Export** with a four-line provenance log baked in.

## Mode A — Review aid
- **Crit Weather Report** — forecasts the 5–8 likely critic questions, each tagged **fair / loaded / out-of-scope** (so the student triages instead of panicking equally), with *why* each is likely.
- **Blind-spot finder** — surfaces the gap the student isn't seeing (unaddressed program, contradicting precedent, skipped accessibility move); a `⚠` blind-spot is a guess to confirm.
- **Devil's-advocate jury** — distinct personas (technical / theory / client-pragmatist / accessibility advocate), each making the strongest case the project fails. A machine *engineered to disagree*, meeting the student.
- **Timed talk-track** — a spoken script cut to fit the slot (90 s / 4 min / 8 min), with a visible cut log ("dropped the material story to protect the core claim").
- **Rebuttal rehearsal** — student answers a forecasted question; the tool plays the follow-up a real critic would ask.

## Mode B — Portfolio aid
- **Narrative drafts the student rewrites** — 2–3 *deliberately different* drafts (terse / poetic / technical) as raw material, never one "best."
- **Audience re-voicer** — re-pitches the *student's own finished* statement for hiring partner / planning board / grad-admissions / lay reader (register, not facts) — reveals which claims survive translation.
- **Sequencing advisor** — proposes 2–3 narrative orderings and argues the trade-offs; the student orders, the tool critiques the order chosen.
- **Caption + alt-text drafter** (alt text is a first-class, separate field — see RAP below).
- **Provenance drawer** — toggleable AI-use + trace summary per project (honesty as a publishable feature).

## Keeping the student's voice (structural, not exhortation)
Two-pane "draft / your voice" UI (you cannot export the left pane) · **question-first** (it can't draft until the student supplies voice-bearing input) · **edit-distance trace = the grade** (a near-zero-edit statement is flagged in the log and to the instructor) · opt-in **voice-sample calibration** (flags drift into generic portfolio-ese — points at homogenization, doesn't perfect it) · it **attacks the student's final words** (loop ends defending your own voice) · every factual sentence tagged ✓/?/⚠ (you must resolve each before export) · **no one-click "final."**

---

## Gameplan

### MVP (single-file HTML, equity floor)
Four intake fields → Review mode: crit weather report (fair/loaded/out-of-scope) + a 4-min talk-track with a visible cut log. Portfolio mode: 2–3 differing drafts + per-image caption/alt-text starters. Two-pane editor with edit tracking; verification worksheet + four-line log on export; canned sample project so it demos with **no key** (mirrors `precedent-librarian/lite`).

### v1 (web app)
Devil's-advocate multi-persona jury; audience re-voicer; sequencing advisor; rebuttal rehearsal with follow-ups; voice-drift flag; rehearsal timer/teleprompter. Import sourced facts from **Site Analyzer** + **Precedent Librarian**. Export an **accessible static portfolio page** (semantic HTML, reading order, alt text).

### Stretch
Ingest a **desk-crit transcript** to seed the question forecast from real signal (consent card on input); provenance drawer rendered into the published portfolio; cohort provenance index; screen-reader-first portfolio template as the *default* export, not a toggle.

---

## Potential directions
1. **Ingest the desk-crit transcript** (paste/`.vtt`/`.srt`) → forecast from what *this* faculty actually pressed on.
2. **Provenance/disclosure drawer per project** that travels into the published portfolio.
3. **Pull facts from Site Analyzer + Precedent Librarian** so the narrative spine is pre-tagged ✓ (the tool never fabricates project facts).
4. **Screen-reader-first portfolio output** (RAP crossover; visual layout secondary).
5. **Sycophancy-probe built in** — present the statement as "mine" vs "a rival's," diff the two critiques, show the gap.
6. **Claim graph** — link each portfolio claim to its supporting site fact / precedent / decision; unsupported claims dangle visibly.
7. **Cohort provenance index** — comparable disclosure/offload profiles across the studio.

---

## Technical notes
- **Two variants, no build step / no framework** (a11y liability): `lite/index.html` (canned + the portfolio renderer, fully offline) + `web/` (live model passes). `claude-opus-4-8`, adaptive thinking, structured outputs; **multi-pass pipelines** (forecast → jury → talk-track), each schema-bound and re-runnable.
- **Portfolio "SSG" = a template-string `renderPortfolio(data)→htmlString`** in plain JS (~200 lines), shared `render.js` so output is identical across tiers — not Eleventy/Hugo (setup the floor forbids).
- **Voice preservation is a data model, not etiquette:** every prose field `{ai_draft, student_text, status, edited_at}`; export-locked while `untouched`; word-level LCS diff stored; "% in your words" meter (the gradeable artifact); paste-back-detection re-flags untouched; the four-line log auto-assembles from per-field status (can't be gamed).

## Delivery & equity (D0–D2)
**D0:** `lite/` — canned forecast/jury + the **fully working accessible portfolio renderer** + the voice diff/trace, all client-side. **D1:** free-model tier (single combined-persona pass, smaller tokens). **D2:** Opus multi-persona jury, web-search-grounded fact pulls, transcript ingestion. The portfolio output is itself a third artifact — a portable dependency-free `.html`.

## Integration / hand-offs
**From Site Analyzer + Precedent Librarian:** a shared `projectFacts` JSON `{site, precedents[], claims[]}`; imported claims keep their origin tag + tool source for the provenance log. **rap-tactile-cad crossover:** the portfolio renderer is the natural producer of the "screen-reader-first portfolio" — co-own the semantic-HTML + alt-text/long-desc schema; route portfolio images through rap-tactile-cad's description pipeline.

## Accessibility (RAP) — a real crossover
Alt text is a **first-class output, separate from the visible caption**, describing the drawing's *spatial content*, flagged `⚠` when the tool isn't confident (only the student knows what the drawing shows — the anti-ghostwriting stance applied to accessibility, where wrong-but-confident description is *actively harmful*). Reading order is explicit (DOM order = source order by construction). Accessible export: semantic headings, landmarks, contrast, keyboard nav. The talk-track doubles as audio description.

## How to test it
- **Voice preservation (core test):** simulate untouched/light-edit/rewrite profiles; assert untouched fields export-locked, "% your words" tracks the diff, paste-back re-flags. Human read-aloud: can a peer tell which sentences are the student's? If the AI draft is indistinguishable from polished student prose, it's *too good* — tune it rougher.
- **Portfolio accessibility:** `axe-core`/pa11y in CI (one `<h1>`, nested headings, non-empty alt, skip-link, `lang`); strip CSS and confirm sensible reading order; real VoiceOver/NVDA pass.
- **Pipeline:** schema-conformance on every pass; transcript-parser unit tests; offline `lite` smoke test; anti-bloodless check (the self-attack pass flags the tool's *own* clichés).

## The signature risk: ghostwriting / voice homogenization
This category's default product is a confident, generic, voiceless statement — the exact anti-pattern, and the skill traded away (articulating your own design argument) is *core*, not peripheral. Mitigations are the structural ones above. The honest teaching line: **"This tool will gladly write your portfolio for you. If you let it, you've learned nothing and a reviewer will hear the machine. Use it to find the questions you can't answer yet — then answer them in your own voice."**
