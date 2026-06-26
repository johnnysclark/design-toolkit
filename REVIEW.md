# All Means Works — code & design review

A full review of the Design Toolkit platform (`platform/apps/toolkit`), the static public
site (`platform/apps/landing`), the Gable Studio embed (`public/tools/gable-studio`), and the
Supabase schema — covering **code, security, accessibility, layout, phrasing, and the
potential of each tool**.

Method: a fan-out of ~15 subsystem reviewers (one per tool + cross-cutting security), then an
independent re-read of the highest-stakes findings against the actual code. Every finding below
is grounded in a real file + location.

> **Branch:** `claude/website-design-review-ulvll2`. This PR ships the review **plus a batch of
> safe, high-confidence fixes** (marked **✅ FIXED** below). Items marked **▶ RECOMMENDED** are
> left for you; items marked **❖ DECISION** are deliberate calls I did *not* make for you.

---

## TL;DR — overall health

The platform is in **good shape and well-architected**. The things that matter most are right:

- **Security & cost protection are solid.** Every money-spending API route (`librarian`,
  `skills-coach`, `rap/agent`, and the four `site-analysis` AI routes) checks
  `supabase.auth.getUser()` and returns **401 for anonymous callers before any Anthropic call**.
  The two public `site-analysis` routes (`search`, `analyze`) are intentionally open because they
  spend no key. No `service_role` key anywhere client-side; `getUser()` (not the spoofable
  `getSession()`) is used for trust; trace logging never breaks a response. Reliability work
  around the Vercel 60s cap (soft-timeouts in `structured.ts`) is genuinely careful.
- **RLS is on for every table** with sensible read-all / write-own policies.
- The **RAP engine** is the cleanest subsystem: `deriveGeometry()` is a real single source of
  truth that all renderers (2D/3D/PIAF/STL) read, so renderer parity is real, not aspirational.

The recurring weaknesses are **not** architectural — they're **consistency debt**:

1. **Grey secondary text** violating the project's "all text is black" rule, in ~9 files (the two
   `site-analysis` files `resources.tsx`/`sources.tsx` were already migrated, proving the pattern
   — the rest hadn't caught up). **Swept in this PR.**
2. **Accessibility gaps** in interactive widgets (no focus trap in the skills modal, no `aria-live`
   on streaming answers, icon-only buttons without names, no skip link, weak focus rings). The
   irony: RAP is built screen-reader-first, but the surrounding shell wasn't held to the same bar.
   **Most fixed in this PR.**
3. A few **real functional bugs** (a silent RLS write failure in the Librarian; the Surveyor map
   never drawing terrain dots; RAP forms firing a command per keystroke). **Fixed in this PR.**
4. **Naming drift** — the nav uses evocative names (Surveyor, Eco-Architect, Coach, Cartographer,
   Archivist, Critic), but the dashboard's "Runs as —" lines describe the *original standalone*
   architecture, and the Gable bundle ships two names. **Flagged for your call.**

Top priorities if you only do a few things: **(1)** apply the new RLS migration (Librarian data
loss), **(2)** add a per-user rate limit / spend cap before the cohort logs in (shared key risk),
**(3)** fill or hide the placeholder copy on the public Works page.

---

## What this PR changes (the safe fixes)

| Area | Fix | Severity |
|---|---|---|
| **Supabase** | New migration `0005_library_searches_update.sql` — adds the missing `UPDATE` policy so Librarian enrichment/refine writes stop silently failing | **High** |
| **Auth** | Open-redirect guard on `/auth/callback` (`safeNext`, same-origin only) + `try/catch` around `exchangeCodeForSession` | **High** |
| **Auth** | Password sign-in now returns you to where you were headed (`?next=…`), not always `/skills-coach`; magic-link guards against an empty origin | High |
| **Librarian** | IDOR guard (only sign storage paths in your own folder) + SSRF redirect re-validation (`redirect:"manual"`, re-check each hop) | High |
| **Coach** | Fixed discipline not persisting when switched on an existing thread; added a prompt-injection guard for uploaded files | High |
| **Surveyor** | Map now redraws terrain elevation dots on the Macro→Micro flip (they never appeared before) | High |
| **RAP** | Number fields commit on blur/Enter, not every keystroke (was flooding the announcer + firing partial values); announcer now re-fires on repeated/identical confirmations | High |
| **Archivist** | Built the promised Remove control; client-side size/type validation; orphan-blob cleanup on failed insert; trace logging | High/Med |
| **A11y (global)** | Skip-to-content link, `:focus-visible` brand ring, modal focus trap + focus restore, `aria-live` on Coach streaming, `aria-label`s on icon buttons, `aria-pressed` level toggle | High/Med |
| **Design rule** | Swept ~75 grey-text instances → `neutral-900` across Surveyor, Archivist, Coach, the Gable embed header, the login/auth screens, the bio + works pages | High/Med |
| **Phrasing** | ComingSoon copy is now student-facing (not dev/"mount slot" language); removed dashboard's dangling "Live now links up top"; normalized 19 broken apostrophes in `practice.ts` | Med |
| **Landing** | Bio page now loads Archivo Black; added a favicon to all three pages; Works page got an `<h1>`, a disambiguated `<title>`, and black (not `#888`) captions/footer | Med |

---

## 1. Security & cost protection

**The foundation is strong** (see TL;DR). These are the gaps.

### ✅ FIXED — Open redirect in the magic-link callback
`auth/callback/route.ts` redirected to `` `${origin}${next}` `` with `next` read straight from
the query string. `…/auth/callback?code=<valid>&next=//evil.example` would bounce a freshly
authenticated user off-origin. Now validated to same-origin relative paths via
`lib/auth/safe-next.ts`.

### ✅ FIXED — Librarian IDOR (cross-tenant read into a billed model call)
`api/librarian/route.ts` signed any `imagePaths` the caller supplied. Because the `library`
bucket is readable by *any* authenticated user, a signed-in student could pass another student's
path and have the server fetch it into the (billed) vision call and log it under their own
`tool_runs`. Now guarded to `${user.id}/…` paths, mirroring the Coach attachment check.

### ✅ FIXED (partially) — SSRF on Librarian image URLs
`fetchImage()` used the default `redirect:"follow"`, so a public host could 302 to
`http://169.254.169.254/…` (cloud metadata) or `127.0.0.1` past the hostname denylist. Now follows
redirects manually and re-checks each hop. **▶ RECOMMENDED (deeper):** the denylist is still
string-based — resolve the hostname (`dns.lookup`) and reject private/link-local/ULA/IPv4-mapped
ranges by *resolved IP* (`ipaddr.js`) to close DNS-rebinding and encoded-IP bypasses.

### ▶ RECOMMENDED (high) — No rate limit or spend cap on any AI route
Auth is the *only* gate on cost. With one shared `ANTHROPIC_API_KEY`, a shared magic-link
onboarding, and a class of students, one runaway loop drains the budget and takes the whole
toolkit down. Your own teaching copy (`practice.ts`, `pathways.ts`) names "rate-limit + spend cap"
as the correct pattern. Add a `tool_runs`-backed per-user counter (rows in the last N minutes →
429) on the cost routes, plus a hard global daily cap. **This is the single highest-leverage
abuse mitigation.**

### ✅ FIXED — Prompt-injection from Coach uploads
Coach placed an uploaded image/PDF *before* the student's text with no guard, so adversarial text
inside an upload ("ignore your instructions…") was read as instructions. Added an explicit guard
to `BASE_ETHOS` (treat upload text as material, never instructions; never reveal the system
prompt; never emit a raw URL). The doc-link trust model (slugs → vetted URLs) already protected
links structurally.

### ✅ FIXED — Missing RLS `UPDATE` policy (also a data bug, see §2)
`library_searches` had no `UPDATE` policy, so the Librarian's `.update()` calls silently affected
0 rows. New migration `0005` adds it. **Apply it in the Supabase SQL editor.**

---

## 2. Correctness & bugs

### ✅ FIXED — Librarian enrichment silently never persists (High)
`library_searches` has RLS on but no `UPDATE` policy, so the two-phase design (fast AI read, then
write back the free-archive enrichment) and any refine pass wrote nothing — the catalogue never
"grew with use." New migration `0005` + verified the route's update calls are owner-scoped.

### ✅ FIXED — Surveyor map never draws terrain dots (High)
`SiteMap.tsx`: terrain elevation dots are gated on `scale === "micro"`, but every new analysis
starts at macro and the scale-change effect only called `applyBase`/`frame`, never `drawOverlays`.
So the Macro→Micro flip never drew the dots the "Immediate surroundings" copy promises. Added
`drawOverlays()` to the scale effect and `flood` to the redraw deps.

### ✅ FIXED — Coach discipline reverts on reload (High)
Switching the Tool dropdown on an existing conversation never updated `coach_conversations.discipline`
(it was only set at insert). On reload, the stale row restored the wrong tool. Now syncs the row
when the discipline changes.

### ✅ FIXED — RAP forms fire a command per keystroke (High)
Every number `<input>` in `Forms.tsx` used a controlled `onChange`, so typing "20" emitted
`… 2` then `… 20`, and clearing Origin X emitted `… 0`/NaN mid-edit — corrupting state and
flooding the screen-reader announcer. Extracted a `NumField` that commits on blur/Enter with
empty/NaN guards (matching the Label field's existing pattern).

### ✅ FIXED — Archivist promised edit/remove with no UI (High)
Copy and the migration's RLS policies promised remove, but no control existed. Built a `PinCard`
with an owner-only Remove (deletes row + storage object), softened the copy to "add and remove,"
and added upload validation + orphan cleanup.

### ▶ RECOMMENDED — Other real bugs worth a look
- **Coach mid-stream failure leaves a dangling user turn** (`skills-coach/route.ts`): the student
  turn is persisted before the model call; if the stream throws, no assistant row is written, so
  reload shows a question with no answer. Persist a minimal "(generation failed — ask again)" row
  in the catch.
- **Surveyor stale-response race** (`site-analysis-tool.tsx`): the analyze fetch has no
  AbortController, so picking a new candidate while one is in flight can let the older response
  win. Give `selectCandidate` its own abort + a per-request token.
- **RAP grid shrink orphans apertures** (`interpreter.ts`): `set bay … bays` doesn't prune
  apertures on the dropped edge, so a door symbol can render with no wall gap — a parity break.
- **RAP STL `cut_height` can exceed `wall_height`** (`stl.ts`): the print and the 3D view diverge
  in Z; clamp `cut_height ≤ wall_height`.
- **Gable unit mismatch** (`gable-studio/web/ui.js`): the dashboard shows feet, but rule
  thresholds are edited in SI metres with no on-screen cue. Convert the rule builder to imperial,
  or badge every threshold "(SI m)". Also: the browser `.3dm` export omits `ModelUnitSystem`
  while the Python baker sets Meters → re-import can come back the wrong scale.

### ▶ RECOMMENDED — Quality / maintainability
- `gable-studio/test/sensitivity.mjs` never `process.exit(1)` on failure, so a dead/NaN metric
  still passes `npm test`. (One line — make it match `occlusion.mjs`.)
- Dashboard (`(app)/page.tsx`) carries a dead `no:` field with a duplicate "03" (render uses the
  sorted index, so it's invisible) and unused `.jump` CSS.

---

## 3. Accessibility

The biggest theme. **Most are fixed in this PR; the larger ones are flagged.**

**✅ FIXED:** skip-to-content link + `:focus-visible` ring (shell had neither) · modal focus trap
+ focus restore in `NodeModal` (declared `aria-modal` but didn't trap) · `aria-live` on the Coach
streaming answer (the core output was silent to screen readers) · `aria-label` on the Coach attach
button + decorative emoji marked `aria-hidden` · `aria-pressed` + group on the Coach level toggle ·
RAP announcer re-fires on repeated confirmations · the whole grey-text sweep (low-contrast
`neutral-400` text also failed WCAG AA).

**▶ RECOMMENDED (larger):**
- **Surveyor charts have no text/table alternative** (`charts.tsx`) — the wind rose, sun path, and
  monthly climate expose only a one-sentence `aria-label`; the actual numbers aren't perceivable
  without sight. Render an `sr-only <table>` per chart (this is your own SPEC §4.F deliverable).
- **Surveyor candidate autocomplete** isn't a real combobox (no `role`, no arrow-key nav) — the
  primary entry point of the tool. Implement the WAI-ARIA combobox pattern.
- **Surveyor chat + sources** still need an `aria-live` region (I swept their colour but not this).
- **Surveyor metric hints** (`ui.tsx` `Stat`) are `title`-only on a non-focusable span — make the
  ⓘ a focusable `<button>` so keyboard users reach the pedagogical text.
- **RAP view tabs** declare `role="tablist"` but don't implement arrow-key roving focus or
  `aria-controls`/`tabpanel` — either complete the pattern or downgrade to a labelled button group.
- **Gable Studio** canvas/map have no accessible name and are mouse-only (the lat/lon sliders are
  the keyboard path — announce that).

---

## 4. Layout & design language

The bold + graphic Archivo-Black language is applied well in the shell and most tools. Gaps:

**✅ FIXED:** the Archivist, Coach-gate, ComingSoon, and Gable-embed headings used plain
`font-semibold` (not `.display-font`) — now display-font · the Gable embed panel overlapped the
sticky header (`inset-y-0` → `top-14 bottom-0`) · the bio page didn't load Archivo Black at all.

**❖ DECISION — body font is Archivo Black everywhere.** `globals.css` sets the document `body`
font to `var(--font-display)` (Archivo Black) "everywhere," but `CLAUDE.md` rule 4 says *"body
text stays a readable system sans."* These contradict. Archivo Black is a heavy display face —
fine for headings and the punchy landing, but hard to read at paragraph length (Coach answers,
Pathways guides, the dashboard statement scope their own sans to compensate). **I did not change
this — it reads as a deliberate aesthetic choice.** My recommendation: set `body` to the system
sans stack and reserve `var(--font-display)` for `.display-font`/`h1`/nav. Your call.

**▶ RECOMMENDED:** the Gable embed page pins `left-64` even when the sidebar is collapsed (the
page can't see the shell's `open` state) → a 16rem blank strip. Lift the sidebar state to
context/URL, or hide the collapse toggle on that page.

---

## 5. Phrasing & copy

**✅ FIXED:** ComingSoon's dev-facing "this page is the slot where the tool will mount / see
WEBSITE-PLAN.md" → student-facing "In development for the Summer workshop…" · removed the
dashboard's dangling reference to "Live now links up top" (no such control exists) · normalized 19
mismatched curly/straight apostrophes in `practice.ts` · softened Archivist's "add, edit, and
remove" to match what exists.

**❖ DECISION — naming coherence.** The nav rebrands tools as **Surveyor / Eco-Architect / Coach /
Cartographer / Librarian / Archivist / Critic / RAP**. Two frictions, for your call:
1. **Gable Studio vs Eco-Architect** — the user-facing UI says "Eco-Architect," but the README,
   `package.json`, the export ZIP name, `RUN.txt`, and every Python report banner say "Gable
   Studio." Both names ship to the student in the same export bundle. Pick one public name (the
   folder slug can stay `gable-studio`).
2. **Dashboard "Runs as —" lines describe the original standalone tools, not the deployed web
   versions.** E.g. the Librarian card says "Runs as — a local app (Claude Code), filesystem-based
   … Obsidian-compatible," but the link opens the Supabase-backed web tool. Same for RAP ("local +
   CLI"). It's a great portfolio statement; just reconcile the "runs as" lines with what a student
   actually clicks into, or label them as the broader vision.

**❖ DECISION — Works page placeholder copy.** The **public** Works page ships literal
`[Replace with your own project text.]` on every project, plus `Ethan [LAST NAME]`, `[others]`,
`Authors: [TBD]`, and an un-redacted `[status pending — Do not publish before notification]` on the
ACADIA entry. I fixed the mechanical issues (grey text, missing `<h1>`, `<title>`) but **left your
content for you** — either fill these before this is served at the apex, or gate the page. (Confirm
whether `allmeans.works/works` is actually live; CLAUDE.md and BUILD-BACKLOG disagree on apex DNS.)

**▶ RECOMMENDED:** `STATUS.md` says Coach runs `claude-opus-4-8`, but the code says
`claude-sonnet-4-6` (both valid ids; the doc is just stale). Reconcile so cost/quality reasoning
is correct.

---

## 6. Tool potential — what each could become

Framed for an architecture studio of undergrad/grad students, and for how the tools could
reinforce each other.

### Surveyor (site analysis) — the strongest tool
*What it is:* turns a real parcel into cited evidence (climate, terrain, water, hazards, history)
+ Rhino-ready ground. *Highest-leverage next step:* the **blind-vs-grounded teaching toggle** from
your SPEC — let a student get the AI's read *before* and *after* web grounding, so they *see* the
difference between assertion and citation. Ideas: (1) a one-click **"site report" PDF/board export**
(the data + map + charts + sources) students can drop straight into a pin-up; (2) **save sites to a
studio project** so a whole studio's sites live together (ties into Archivist); (3) **shadow/solar
study** for a typed date+time using the sun-path data you already compute; (4) non-US terrain (3DEP
is US-only — fall back to a global DEM).

### Coach — most "daily-driver" potential
*What it is:* a tutor that makes students attempt before it answers. *Highest-leverage:* finish
**Phase-2 `.ghx`/`.3dm` parsing** so students upload real definitions, not just screenshots — that's
the difference between "help with a picture" and "debug my actual file." Ideas: (1) **per-student
progress** ("you've covered lofting, data trees…") feeding Cartographer; (2) a **"explain this
error"** paste box wired to the discipline KB; (3) **code export → run in Rhino** round-trip with a
report-back; (4) shared **class FAQ** built from anonymized common questions.

### Librarian — high ceiling, currently free-data only
*What it is:* drop a found image → contextualized leads → catalogued into project libraries.
*Highest-leverage:* the **v2 reverse-image** path (SerpAPI Lens / Serper) you already designed
slots in behind two env vars — "other angles of *this* building" is the killer feature. Ideas:
(1) **auto-tag by drawing type** (plan/section/axon) to make libraries filterable; (2) **"precedent
board" export** of a project library; (3) feed saved precedents to **Critic** as a project's
reference set.

### RAP — the research crown jewel
*What it is:* sense-agnostic state + renderer parity, screen-reader-first. *Highest-leverage:* the
**live Rhino bridge** (the `state.json` → Watcher path) — turning the in-browser studio into a
driver for real Rhino is the publishable leap. Ideas: (1) **import** an existing `state.json`
(currently export-only); (2) a **guided "first plan" tutorial** in the console for new
non-visual users; (3) **shareable tactile-export presets** per printer/PIAF. Keep holding it to
the highest a11y bar — it's the project's differentiator and its ethics.

### Cartographer (skills pathways) — content is the moat
*What it is:* a public beginner→advanced trail map with a guide behind every node. *Highest-leverage:*
**videos** — the guides are strong, but a tutorial behind each node is the promise. Ideas:
(1) `?discipline=` deep-link **into Coach** from a node; (2) **teacher self-submission** of videos
(`pathway_videos` table + RLS); (3) a **node-graph view** of the prereq DAG; (4) **mark-as-done**
tied to Coach progress.

### Archivist (pinup wall) — built for real load, needs the social layer
*What it is:* a pin-up wall with metadata, meant to replace Miro. *Highest-leverage:* the
**TA-section / student-row / day-column grid** the dashboard mock promises (the current grid is
flat). Ideas: (1) **reactions + threaded comments** (the "who's engaging / who's gone quiet"
metadata is the real product); (2) **week/section filters**; (3) bulk **drag-drop upload**; (4)
an **"export the week"** board. (Edit metadata is still missing — Remove now exists.)

### Critic / 2D Tooling / 3D Tooling (stubs)
*Critic:* the most differentiated — adoptable critique **personas** (tectonic/social/formal) that
give *positions, not verdicts*, every claim tagged, framed "weigh against humans." Pair it with a
**review-prep** mode (pull a project to a defensible thesis, sequence the proving drawings,
interview for jury questions). *2D Tooling:* ship the three sub-tools incrementally — drawing
cleanup (threshold/vectorize) is the highest-value, most self-contained first. *3D Tooling:* the
**Three.js portfolio viewer** (drop a model into a shareable web view) is the most reusable
on-ramp and ties into the portfolio site.

### Cross-tool ideas
- A **studio project** object that threads through Surveyor (sites), Librarian (precedents),
  Archivist (work), and Critic (review) — one place per student per project.
- A **shared provenance log** ("the trace") surfaced as a simple per-student activity view from
  `tool_runs` — useful for you, and honest about AI use for the students.
- A consistent **"AI says X — verify it" chrome** across every LLM tool (Coach claim-tags,
  Surveyor's tagged judgments, Librarian's "leads to verify") so the trust-but-verify stance is a
  visible, learnable pattern, not per-tool styling.

---

## 7. Decisions left for you (not changed)

1. **Body font = Archivo Black everywhere** (readability vs. brand) — §4.
2. **Gable Studio vs Eco-Architect** naming, and the dashboard "runs as" lines vs deployed
   reality — §5.
3. **Works page placeholder copy** — your content to write or gate — §5.
4. **Rate limiting / spend cap** — design choice on limits, but strongly recommended before the
   cohort logs in — §1.

---

## Appendix — finding counts

179 grounded findings across 15 reviewers: **28 high · 48 medium · 79 low · 24 ideas**, spanning
accessibility (47), bugs (32), code quality (32), tool potential (22), security (18), phrasing
(17), layout (11). This PR applies the high-confidence subset; the rest are catalogued above by
theme. Low-severity polish items (minor copy, dead code, micro-spacing) are folded into the
recommendations rather than listed individually — ask if you want the full raw list.
