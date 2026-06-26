# Accessibility Audit — Findings

**Site:** allmeans.works (landing) + toolkit.allmeans.works (Design Toolkit)
**Standard:** WCAG 2.2 Level AA
**Date:** 2026-06-26
**Method:** automated (axe-core 4.x via headless Chromium) on the static landing pages +
source-level audit of every Toolkit tool component + verified contrast math.
**Companion doc:** [`ACCESSIBILITY-AUDIT-PLAN.md`](ACCESSIBILITY-AUDIT-PLAN.md) (scope & method)

> **Scope note / honesty:** the toolkit (Next.js) wasn't built & served in a browser for this
> pass (it needs Supabase/Anthropic env), so its findings are **source-level** (real, with
> file:line evidence, but not axe-confirmed in a live DOM). The **landing pages were scanned
> live with axe-core.** A follow-up that runs axe against a running toolkit build + a manual
> screen-reader pass is still worth doing — see the plan's Phase 2.

---

## Summary

| Severity | Count | Theme |
|---|---|---|
| Critical | 0 | — |
| Serious | 4 | Missing form `<label>`s (app-wide); low-contrast chart text; placeholder-swatch contrast |
| Moderate | 8 | `#ff3b21` accent contrast; chart data tables; tab ARIA; landing headings/landmarks; login errors |
| Minor | 2 | Decorative chars not hidden from AT |
| ✅ Confirmed good | — | Skip-link, focus ring, RAP Studio, iframe titles, modal focus trap, pinup labels/alt |

**Top 5 to fix first**
1. **Add real `<label>`s to every form input** (login, Coach composer, Critic intake, Librarian) — *Serious, app-wide, cheap.*
2. **Darken chart text** `fill-neutral-400` → `neutral-700`+ in Surveyor `charts.tsx` — *Serious, fails 4.5:1.*
3. **Fix the `#ff3b21` accent for small text** (it's 3.56:1 — passes for big text/UI, fails for body-size links/text).
4. **Give Surveyor charts a real data-table equivalent**, not just an `aria-label` summary.
5. **Landing pages:** add an `<h1>` to `index.html`/`bio` and pull the stray links inside a landmark.

---

## Automated results — landing pages (axe-core, live scan)

| Page | Violations | Detail |
|---|---|---|
| `index.html` | 1 moderate | `page-has-heading-one` — no `<h1>` (the TOOLS/WORKS/BIO items are `<a class="choice">`, not headings) |
| `works/index.html` | 2 (1 serious, 1 moderate) + 1 review | `color-contrast` on `.ph` placeholder swatches; `region` — `<h1 class="visually-hidden">` sits outside any landmark |
| `bio/index.html` | 2 moderate | `page-has-heading-one` (no `<h1>`); `region` — the `.back` link (line 60) is outside `<main>` |

---

## Verified contrast (computed, sRGB, on white `#fff`)

| Color | Use | Ratio | Normal text (4.5:1) | Large/UI (3:1) |
|---|---|---|---|---|
| `#ff3b21` accent | CTAs, links, focus ring | **3.56:1** | ❌ FAIL | ✅ pass |
| `neutral-300 #d4d4d4` | ⓘ icon, `\|` divider | **1.48:1** | ❌ | ❌ |
| `neutral-400 #a3a3a3` | chart value labels (9px) | **2.52:1** | ❌ | ❌ |
| `neutral-500 #737373` | chart axis labels (11px) | **4.74:1** | ✅ pass | ✅ |
| `neutral-600 #525252` | — | 7.81:1 | ✅ | ✅ |
| `.ph` swatches (works) | white-85% on tan/blue/green | **2.4–3.4:1** | ❌ | ❌ |

> **Correction to an in-pass note:** `neutral-500` is fine (4.74:1). Only `neutral-400`/`300`
> fail. So the chart fix is targeted: `fill-neutral-400` must change; `fill-neutral-500` is OK
> (though bumping it gives margin). The all-black-text house rule means body copy is already
> `neutral-900` (17.9:1) — the failures are confined to **chart internals, icons, and the red accent.**

---

## Serious findings

### S1 · Form inputs use placeholders instead of `<label>`s (app-wide)
**WCAG 1.3.1, 3.3.2, 4.1.2 · Serious**
A placeholder is not an accessible name — it vanishes on input and isn't reliably announced.
Affected:
- **Login** — `app/login/page.tsx` ~L34–49 & L72–79: `email` + `password` inputs, placeholder only.
- **Coach** — `app/(app)/skills-coach/skills-coach-chat.tsx` ~L526–535: the message `<textarea>` has only a *dynamic* placeholder; ~L378–391 the Tool `<select>` is wrapped in a `<label>` without `htmlFor`.
- **Critic** — `app/(app)/design-critic/work-intake.tsx` ~L80–101: `title`, `thesis`, `brief` — placeholder only.
- **Librarian** — `app/(app)/librarian/librarian-tool.tsx`: project name, context note, source link, URL, query, and chat inputs — placeholder only.

**Fix:** a `<label htmlFor>` per input (use `class="sr-only"` where a visible label would crowd the design). For the Coach composer: `<label htmlFor="composer" class="sr-only">Message</label>`.

### S2 · Low-contrast chart text
**WCAG 1.4.3 · Serious**
`app/(app)/site-analysis/charts.tsx` ~L75/186/296/332 — value labels use `fill-neutral-400`
(2.52:1) at 9px. **Fix:** `fill-neutral-700` or darker. (`fill-neutral-500` at 4.74:1 passes but is borderline at small sizes — bump for margin.)

### S3 · Placeholder-swatch contrast on the Works page
**WCAG 1.4.3 · Serious (but scaffolding)**
`works/index.html` `.ph` swatches render white-85% text on mid-tone fills (2.4–3.4:1). These are
*placeholder boxes for not-yet-added images* ("image 1 — 3:2"), so this self-resolves once real
images land — but if any swatch ships to prod, darken the fills or use solid white text.

### S4 · `#ff3b21` accent fails contrast for body-size text
**WCAG 1.4.3 · Serious where used as small text/links**
At 3.56:1 the brand red passes for **large text (≥24px / 19px bold), UI borders, and the focus
ring (3:1)** but **fails for normal-size link/body text (4.5:1)**. **Fix:** only use `#ff3b21`
on white for large text; for body-size links either darken the red (~`#d92e17` ≈ 4.5:1) or pair
it with underline + a darker text color. (White text *on* a `#ff3b21` button is the inverse and
is fine — verify per button.)

---

## Moderate findings

- **M1 · Surveyor charts have no data-table equivalent.** `charts.tsx` L49/161/274 give an SVG
  `aria-label` summary + per-wedge `<title>`, but no DOM table/prose of the underlying numbers.
  STATUS.md already lists this as open. **Fix:** a visually-hidden `<table>` or a "view data"
  disclosure per chart (wind rose, sun path, monthly climate). *WCAG 1.1.1.*
- **M2 · Critic mode tabs are incomplete ARIA tabs.** `design-critic/critic-tool.tsx` L34–48 use
  `role="tab"`/`aria-selected` but no `aria-controls`, no `id` on panels, no arrow-key nav.
  **Fix:** wire `aria-controls`/`id` and arrow-key roving focus (or drop to plain buttons). *2.1.1, 4.1.2.*
- **M3 · ⓘ info icon is an `aria-label` on a non-interactive `<span>`** at `neutral-300` (1.48:1).
  `site-analysis/ui.tsx` L64. Not keyboard-reachable; AT support for `aria-label` on a bare span
  is inconsistent. **Fix:** make it a `<button>` with the hint as accessible name, or `role="img"`
  + darker color. *1.4.3, 4.1.2.*
- **M4 · Login errors aren't programmatically tied to fields or announced.**
  `login/page.tsx` L57/L87 render error `<p>`s with no `role="alert"`/`aria-live` and no
  `aria-describedby` link. **Fix:** `role="alert"` on the error + `aria-describedby` on the input. *3.3.1, 4.1.3.*
- **M5 · Landing `index.html` has no `<h1>`** (axe). The page's primary choices are links.
  **Fix:** add a visually-hidden `<h1>All Means Works</h1>`. *2.4.6 / best practice.*
- **M6 · `bio/index.html` has no `<h1>`** (axe). **Fix:** add one (the page title). *Same as M5.*
- **M7 · Stray content outside landmarks** (axe `region`): `bio` `.back` link (L60) sits before
  `<main>`; `works` `<h1>` (L297) sits before `<header>`. **Fix:** move them inside a landmark
  (e.g. the header/nav). *1.3.1.*
- **M8 · Coach claim chips signal partly by color.** `skills-coach/MessageBubble.tsx` L15–19 — the
  ✓/?/⚠ chips carry the label only in a `title` (hover-only, not reliably announced); the glyph is
  `aria-hidden`. **Fix:** add an `sr-only` text label like Critic's `claim-tag.tsx` already does
  (that one is correct). *1.4.1, 4.1.2.*

---

## Minor findings

- **m1 · Decorative `\|` divider not hidden.** `site-analysis-tool.tsx` L825 — add `aria-hidden="true"`.
- **m2 · Grey leftovers vs. the black-text rule.** Scattered `neutral-400/500` in
  `site-analysis-tool.tsx`/`ui.tsx`/`charts.tsx` (STATUS.md notes the sweep is unfinished). The
  *contrast* failures are only the `neutral-400`/`300` ones above; the rest is house-style, not WCAG.

---

## ✅ Confirmed good (don't regress these)

- **Skip-link + visible focus ring** — `globals.css` (skip-link to `#main`; `#ff3b21` 2px focus
  outline; 3.56:1 passes the 3:1 bar for a non-text UI indicator).
- **RAP Studio is exemplary** — `aria-live="polite"` announces every state change; honest
  `aria-pressed` toggles in a `role="group"`; `sr-only` labels on the command console & agent
  inputs; the 3D canvas is intentionally `aria-hidden` (the plan/read-back/Braille are the real
  model). This is the reference pattern for the rest of the app.
- **iframe titles present** — Site Design (`title="Eco-Architect"`) and the Cartographer video
  embed both set `title`. *(The Gable Studio app inside the iframe is a separate audit.)*
- **Modal done right** — `skills-pathways/NodeModal.tsx`: `role="dialog"`, `aria-modal`,
  focus trap, Esc-to-close, focus restore.
- **Pinup/Archivist** — form fields labelled; remove-button `aria-label`; images have descriptive
  `alt` with a meaningful fallback.
- **Critic claim tags** — `claim-tag.tsx` includes an `sr-only` status label (the right pattern).
- **Dashboard SVG mocks** — each has `role="img"` + descriptive `aria-label`.

---

## Recommended next steps

1. Land the **Top 5** (above) as small PRs — most are 1–2 line changes.
2. **Wire regression tooling** (not present today): `eslint-plugin-jsx-a11y` in the toolkit, and
   an `@axe-core/playwright` smoke test over key routes in CI.
3. **Manual screen-reader pass** on a running build — ideally with an AT user from the RAP
   network — for the streaming chats (Coach/Surveyor/Critic) and the Leaflet map, which source
   review can't fully confirm.
