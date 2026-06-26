# Accessibility Audit Plan — All Means Works

**Site:** allmeans.works (public landing) + toolkit.allmeans.works (Design Toolkit app)
**Standard:** WCAG 2.2 Level AA
**Prepared for:** Daniel · John Clark
**Date:** 2026-06-26
**Status:** Plan only — no fixes made yet. This is the scope/method we'd run before opening fix PRs.

---

## Why this matters here

Accessibility isn't a side concern for this project — it's the thesis. The **Radical
Accessibility Project (RAP)** is the studio's research showcase, built around a non-visual /
tactile CAD workflow. A site that hosts a radical-accessibility initiative has to clear the bar
itself. This plan audits the *whole* public surface against WCAG 2.2 AA, flags what's broken,
and ranks fixes by severity.

Two house rules already in `CLAUDE.md` push us most of the way there and should be treated as
audit criteria, not aspirations:
- **All visible text is black (`#111`/`neutral-900`), never grey.** Good for contrast — but we
  verify it actually holds (STATUS.md notes grey `neutral-400/500/600` still lingers in the
  Surveyor tool).
- **Every image gets descriptive alt text.** We verify coverage, not just presence.

---

## Scope — what gets audited

### Property A — Static landing site (`apps/landing/`)
Plain HTML/CSS, no build step. Three pages:
- `index.html` — landing (TOOLS · WORKS · ALL MEANS BIO)
- `works/index.html` — portfolio index
- `bio/index.html` — bio page

### Property B — Design Toolkit app (`apps/toolkit/`, Next.js)
The app shell (sidebar nav, dashboard, login) plus every tool page. Tools and their routes:

| Surface | Route | Notes for audit |
|---|---|---|
| App shell + dashboard | `/` | Sidebar nav, skip-link, landmarks, focus order |
| Login | `/login` | Form labels, error announcement, magic-link + password |
| Surveyor (Site Analysis) | `/site-analysis` | **Leaflet map**, **charts**, data cards, streaming chat — highest-risk page |
| Eco-Architect (Site Design) | `/site-design` | **iframe** to Gable Studio (`public/tools/gable-studio/`) |
| Coach | `/skills-coach` | Streaming chat, image/PDF upload, level toggle |
| Cartographer (Skills Pathways) | `/skills-pathways` | Trail map, embedded tutorial video |
| Librarian | `/librarian` | Image drop/paste/upload, conversation, galleries |
| Archivist (Pinup) | `/pinup` | Image upload + grid |
| Critic (Design Critic) | `/design-critic` | Persona pickers, two-pane editor, claim chips |
| 2D Tooling | `/media-2d` | Drawing/scan cleanup (canvas) |
| 3D Tooling | `/tools-3d` | Obliquify |
| RAP | `/rap` + `/rap/studio` | Already has the most a11y work — verify, don't assume |

**Special attention — embedded/non-standard content:**
- **Gable Studio iframe** (`/site-design`) — needs a `title`, and its own internal pages must be
  audited separately (it's a self-contained app under `public/tools/gable-studio/`).
- **Leaflet map** (Surveyor) — keyboard pan/zoom, non-map fallback for map-only data.
- **Charts** (Surveyor) — STATUS.md already lists *"accessible chart data-tables (ARIA)"* as an
  open item; confirm every chart has a text/table equivalent.
- **RAP Studio** 3D canvas, command console, braille/tactile renderers — the design intent is
  already non-visual; our job is to verify the announcements and parity actually work in a
  screen reader, not just in code review.

### Out of scope (this pass)
- `apps/portfolio/` (Astro) — scaffolded, deferred, not deployed.
- Email/magic-link delivery flows (infra, not a11y).
- Authoring guidance for future content (separate follow-up).

---

## Standard & conformance target

**WCAG 2.2 Level AA.** We test against the four POUR principles:
- **Perceivable** — text alternatives, contrast (4.5:1 text / 3:1 large & UI), reflow at 320px,
  text resize to 200%, no info-by-color-alone.
- **Operable** — full keyboard operability, visible focus, no traps, skip link, logical focus
  order, target size (2.2 AA: 24×24px min), no motion-only interactions.
- **Understandable** — labels & instructions, error identification + suggestion, consistent nav,
  language declared (`lang="en"` is present on landing — verify across app).
- **Robust** — valid name/role/value on custom widgets, correct ARIA, live-region announcements
  for streaming/async results.

---

## Method — how we run it

A **two-track** audit. Automated scanners catch ~30–40% of issues fast; the rest needs a human.

### Track 1 — Automated (broad, fast, repeatable)
| Tool | What it covers | How we'd run it |
|---|---|---|
| **axe-core** (via `@axe-core/playwright`) | DOM-level WCAG checks per page | Scripted pass over every route above; JSON output per page |
| **Lighthouse** (a11y category) | Per-page score + common issues | CI-friendly, gives a trend number to track |
| **pa11y** | CLI alternative / second opinion | Good for the static landing pages |
| **eslint-plugin-jsx-a11y** | Catches issues at author time in the Next.js app | Add to lint config (none present today) |

> The toolkit currently has **no a11y tooling installed** (no axe/pa11y/lighthouse/jsx-a11y in
> `package.json`). Step 0 of the fix phase is wiring at least axe-core + `jsx-a11y` so regressions
> get caught going forward.

### Track 2 — Manual (the issues scanners miss)
1. **Keyboard-only** — unplug the mouse. Tab through every page: reachable? logical order?
   visible focus? no traps? skip-link works? menus/dialogs operable and dismissable (Esc)?
2. **Screen reader** — NVDA + Firefox (Win) and VoiceOver + Safari (Mac). Walk each tool:
   are headings/landmarks coherent? are images announced meaningfully? **do streaming AI
   answers and async results announce** via `aria-live`? are the claim chips (✓/?/⚠) and the
   map/chart data reachable without sight?
3. **Zoom / reflow** — 200% text zoom and 320px-wide reflow; nothing clipped or overlapping.
4. **Contrast** — sample text and the functional accents (the `#ff3b21` CTA/link red, claim
   chips, error states) with a contrast checker. Confirm the black-text rule actually holds and
   that `#ff3b21` on white passes for its use (it's ~3.7:1 — **fails 4.5:1 for normal-size body
   text**, so any small red text is a likely finding).
5. **Forms & errors** — login, uploads, chat inputs: labels present, errors announced and
   described, not color-only.
6. **Media** — tutorial video (Cartographer): captions/controls; map and charts: text equivalents.

---

## Known suspects (going in)

Grounded in `STATUS.md` / `CLAUDE.md` — likely findings to confirm first:
- **Surveyor charts** have no accessible data tables yet (called out as open in STATUS).
- **Surveyor still uses grey text** (`neutral-400/500/600` in `site-analysis-tool.tsx`/`ui.tsx`/
  `charts.tsx`) — contrast + the house black-text rule.
- **`#ff3b21` red accent** — borderline contrast for small text/links.
- **Leaflet map** keyboard + non-visual fallback.
- **Gable Studio iframe** — `title` attribute + its own internal audit.
- **Streaming chats** (Coach, Surveyor, Critic) — verify `aria-live` actually announces tokens/
  completion without flooding.

---

## Deliverable & how findings get reported

One **findings report** (Markdown, shareable like this doc), structured so Daniel can scan it and
we can turn rows straight into fix PRs:

For each issue:
- **Location** — page/route + component/file
- **WCAG criterion** — e.g. 1.4.3 Contrast (Minimum)
- **Severity** — Critical (blocks a task) · Serious · Moderate · Minor
- **Evidence** — screenshot / screen-reader transcript / axe rule id
- **Recommended fix** — concrete, code-pointing

Plus a one-page **summary**: Lighthouse a11y score per route, issue counts by severity, and the
top 5 things to fix first.

---

## Proposed phases

| Phase | Work | Output |
|---|---|---|
| **0 · Setup** | Wire axe-core (Playwright) + `eslint-plugin-jsx-a11y`; list final route inventory | Repeatable scan script |
| **1 · Automated sweep** | Run axe + Lighthouse + pa11y over all routes (landing + every tool) | Raw per-page results |
| **2 · Manual audit** | Keyboard + screen-reader + zoom/contrast on each surface; deep dive on Surveyor, RAP Studio, Gable iframe | Annotated findings |
| **3 · Report** | Consolidate, severity-rank, summarize | The shareable findings report |
| **4 · Fixes (separate PRs)** | Work the list by severity; re-test to confirm | Green re-scan |

Phases 1–3 are the "accessibility check" itself and produce the document to share. Phase 4 (the
actual fixes) is held until you and Daniel sign off on scope — **no code changes happen under
this plan.**

---

## Open questions for John / Daniel

1. **Conformance bar** — AA is the assumed target. Want AAA on anything specific given the RAP
   thesis (e.g. the RAP Studio itself)?
2. **Screen-reader matrix** — is NVDA+Firefox and VoiceOver+Safari enough, or should we add
   JAWS / TalkBack (mobile)?
3. **Who runs the manual screen-reader pass** — me/the toolkit, Daniel, or a real AT user from
   the RAP network (highest signal)?
4. **Priority order** — audit everything, or front-load the public landing + Surveyor + RAP and
   defer the lower-traffic tools?
5. **Where the report lives** — this repo (Markdown/PR), or a doc you'd rather share elsewhere?
