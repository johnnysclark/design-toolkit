<!-- ───────────────────────────── CURRENT STATE (top) ───────────────────────────── -->
> **RAP Studio — BUILT (2026-06-25, branch `feat/rap-studio`, worktree `design-toolkit-rap`,
> not yet merged).** A runnable, interactive slice of the Radical Accessibility Project at
> **`/rap/studio`** (linked from the `/rap` page; no new nav entry). One canonical in-browser
> `state.json` (real `rhino_controller_v4.0` subset) + many renderers — the project's
> "sense-agnostic state + renderer parity" made literal. Engine: typed state + a Controller-grammar
> command interpreter + Grade-1 Braille + `deriveGeometry()` (the single geometry source all
> renderers read), under `(app)/rap/studio/engine/`. Channels (all compile to the same commands):
> a **command console**, **accessible forms**, and a **natural-language assistant**
> (`/api/rap/agent`, Sonnet 4.6, **401 for anon**, logs to `tool_runs`). Renderers: **3D**
> (react-three-fiber, dynamic-imported), **2D tactile plan SVG**, **Whole-to-Part read-back text**,
> **Braille key**, and a **navigable state.json tree** with changed-path highlighting. Exports:
> `state.json`, **PIAF 1-bit PNG**, **STL** (port of `tactile_print.py` extrude+clip), command log.
> Accessibility: `aria-live` announcements + optional Web Speech TTS; the 3D view is an aid, not the
> source of truth. Public page; only the assistant gates to sign-in. New deps: `three`,
> `@react-three/fiber`, `@react-three/drei`. Next step = drive real Rhino (B1 `state.json` → Watcher;
> then a local companion bridge for live). Build (types) green; **not browser-screenshot-tested.**
>
> **CURRENT STATE — 2026-06-24 (primary-agent sync).** GOAL 1 is **DONE**: the Toolkit is
> **LIVE** at https://toolkit.allmeans.works — Supabase migration applied, Vercel project
> `toolkit` deploying `main`, Porkbun DNS + HTTPS green, magic-link login verified. The repo +
> local folder were renamed to **`design-toolkit`** (public brand stays *All Means Works*).
> **Gable Studio** (Rhino gable analyzer) is ported in as the **Site Design** tool at
> `platform/apps/toolkit/public/tools/gable-studio/`, embedded by `(app)/site-design/page.tsx`
> (⚠️ rendered UI not browser-tested yet). A static **public site** lives in
> `platform/apps/landing/` (minimal landing → Toolkit · Work · Bio; `work/` = portfolio index) —
> targets the apex `allmeans.works`, **not deployed yet**.
>
> **In progress:** make the Toolkit fully **public (remove sign-ins)** and **disable/hide the
> Librarian** so the Anthropic key is never reachable publicly — re-add auth before sharing
> widely. Repo is being **trimmed to build-essential docs**.
>
> **Site Analysis / "Surveyor" — BUILT + MERGED + LIVE (branch `site-analysis`, worktree
> `design-toolkit-site-analysis`; the in-app title is now _Surveyor_ but the route/folder/nav
> key all stay `site-analysis`).** The ported engine
> (`lib/site-analysis/*`) now has a full React UI at `(app)/site-analysis/`. Two new things vs.
> the original spec: (1) it's **general-purpose** — a **Place mode** geocodes *any* address
> (OSM Nominatim, keyless) plus a **Superfund mode** tuned for the class (EPA NPL search +
> boundary + the web-cited contamination brief); (2) a **Macro ⇄ Micro** toggle at the top
> reframes both the Leaflet map (street/zoomed-out vs. aerial/zoomed-in, `flyTo`) and the data
> cards (climate + region vs. site + terrain + flood). The two AI passes stay auth-gated (401
> for anon); hard data, map, charts and all exports are public. Added dep: `leaflet`. Nav
> status flipped to **live**. Verified locally: build (types) green; page 200; both search
> modes + both analyze modes return live data (Love Canal boundary, Chicago climate/terrain/
> flood). **Not browser-screenshot-tested** — open `/site-analysis` to eyeball the map/charts.
>
> **Site Analysis — follow-ups shipped (2026-06-25):** (1) terrain now a **single 3DEP
> `getSamples`** call + size-capped study box (was a 144-call fan-out that timed out big sites
> like Tar Creek). (2) AI passes moved to **Sonnet 4.6** (`MODEL` in `site-analysis-prompts.ts`)
> for speed. (3) Added a **grounded follow-up chat** (`api/site-analysis/chat`, streamed, Sonnet
> + `web_search_20260209`) with a **sources rail** that accumulates every web link it cites —
> mirrors the Skills Coach streaming pattern; auth-gated. (4) **Hover tooltips (ⓘ) + a Source
> line on every data card** (Open-Meteo / USGS 3DEP / FEMA / EPA / OSM). (5) Macro/Micro buttons
> relabeled **Macro · Region / Micro · Site** (kept the orientation from John's original spec).
>
> **Surveyor — reliability + auto-sources + further-resources (2026-06-26 · PR #26, MERGED to
> `main` → DEPLOYED → verified live).** John reported the AI reading "stalls out most of the
> time" and the chat "times out / doesn't complete." **Root cause:** the AI passes were blowing
> Vercel Hobby's **60s function cap**, and a hard-kill returns a non-JSON error _page_ → the
> client's `res.json()` throws "Unexpected token 'A'…". Two culprits: synthesis ran with
> `thinking:{type:"adaptive"}` + 16k `max_tokens` (slow), and the grounded contamination pass
> had an **uncapped** `web_search`. **Fixes (all shipped):**
> - **`lib/anthropic/structured.ts`** (shared by synthesis + contamination): adaptive thinking
>   **OFF by default** (`thinking` opt-in param), `web_search` **capped** (`maxUses`, default 5),
>   `max_tokens` 16k→6k, and a **server-side soft-timeout** via `AbortSignal` (`timeoutMs`,
>   default 54s) that ends the stream early and throws a **clean** error instead of a hard-kill.
>   This is the core reliability primitive — keep new passes under the cap or raise the budget.
> - **`api/site-analysis/chat/route.ts`**: `max_uses` 6→4, sources collected **incrementally**
>   from stream events (so a soft-timeout still ships them), and a **53s** abort that always
>   emits a terminal `done` frame (with the partial answer + a "stopped early" note).
> - **`(app)/site-analysis/chat.tsx`**: client now **finalizes on stream-end even with no
>   terminal frame** (commits the partial answer) — fixes the "frozen half-answer" hang.
> - **Auto first pass — NEW, no button:** `api/site-analysis/sources/route.ts` (streamed,
>   grounded, `max_uses:4`, 50s soft-timeout, auth-gated, logs `tool_runs` as
>   `site-analysis:sources`) + `(app)/site-analysis/sources.tsx` (`SiteSources`, auto-fires on
>   mount keyed per place, streams a short orientation + authoritative links into a "Sources &
>   documents" card above the chat). ⚠️ **Cost note:** this fires automatically for **signed-in**
>   users on **every** analyze — intentional per John's ask; kept cheap (Sonnet, 4 searches,
>   1600 tokens). If cost becomes a concern, gate it behind a toggle or a first-view-only guard.
> - **Further resources — NEW:** `(app)/site-analysis/resources.tsx` (`FurtherResources`) — a
>   static, curated, grouped link list (Maps/GIS · Terrain/LiDAR · Climate/Sun/Energy ·
>   Water/Soils/Hazards · Parcels/Zoning/Demographics · History) of the tools arch/landscape/
>   planning students actually use. **Always visible** at the bottom (renders with or without an
>   active analysis). No AI, no account. Curated links are real but unowned — sanity-check them
>   periodically (EPA EJScreen was dropped in favor of EnviroAtlas for stability).
> - **All-black-text rule** (now hard in `CLAUDE.md` §4): the two NEW files use only
>   `neutral-900` body text. ⚠️ **The rest of `site-analysis-tool.tsx`/`ui.tsx`/`charts.tsx`
>   still uses `neutral-400/500/600` greys** — a sitewide black-text sweep of this tool is an
>   open follow-up (not done this session to avoid scope-creep on a production hotfix).
> - **Verified on prod:** page 200; `analyze` (public) 200 in ~9.7s w/ correct climate (GHI
>   1604, HDD 2513) + terrain true; `sources`/`chat`/`synthesis`/`contamination` all **401 for
>   anon** (cost protection holds). ⚠️ **NOT exercised:** the **signed-in** AI streaming paths —
>   headless can't hold John's session. **The real test is John running a signed-in analysis on
>   Tar Creek** (the site that always failed). If it still stalls there: lower the budgets
>   further, or **split contamination + synthesis into two shorter sequential requests** (each
>   then has its own 60s), or stream synthesis to the UI like the chat. Budget knobs live in
>   `structured.ts` (`timeoutMs`/`maxTokens`/`maxUses`) and the two streamed routes (their
>   `setTimeout(...abort)` values + `max_uses`).
> - **Open backlog (from SPEC §4 + this session):** blind-vs-grounded teaching toggle ·
>   accessible chart data-tables (ARIA) · global terrain (USGS 3DEP is **US-only** — non-US
>   sites get terrain:null) · the black-text sweep above.
>
> **Librarian — REBUILT into a VISUAL REFERENCE LIBRARY · LIVE (2026-06-25 · branch
> `tool/librarian`, worktree `design-toolkit-librarian` · deployed to `main`).**
> Was the text-only precedent-dossier tool; now: a student drops one *or more* found images
> (upload / clipboard-paste / web-URL), optionally with a context note + source link → Claude
> **vision** reads them (IDs framed as *leads to verify*, never facts; **abstains** rather than
> guessing) → the student can **converse** ("the architect is Ando…") and it re-catalogs from
> those authoritative facts → finds get catalogued, metadata-tagged, into **per-project
> libraries** (create / edit / delete, with descriptions), shared studio-wide (read-all /
> write-own RLS). Auth-gated (`/api/librarian` 401s anon — cost protection).
>
> **Key design decision (after the first cut):** we do **NOT** auto-show archive images —
> free image-matching was unreliable ("all wrong"). The **"Where to find related material"**
> panel is **curated LINKS** (confirmed Wikipedia / Wikimedia Commons category / Wikidata pages
> + pre-built Google-Images and ArchDaily / Dezeen / LoC-HABS queries). The only images ever
> shown are the student's own (dropped, or saved into a project). Save a link as a `reference`
> item; save dropped images as image items; a destination picker lets you add to any project or
> make a new one on the spot.
>
> **Model = `claude-sonnet-4-6`** (toolkit-wide policy). Verified against the Claude API ref:
> structured output `output_config: {format: {type:"json_schema", schema}}`, the **effort**
> control `output_config.effort` (low/medium/high — the "Effort" slider: Quick/Balanced/Deep),
> and multiple image blocks per message are all correct/supported. The analyze route is **two
> phase** for a quick answer first: phase 1 `mode:"analyze"` (vision read, returns immediately)
> → phase 2 `mode:"enrich"` (the slower free archive lookups; a "gathering context" animation
> shows until links fill in). `mode:"search"` = keyword archive lookup (no model cost).
>
> **Files:** migration `supabase/0003_library.sql` (`library_projects`/`library_searches`/
> `library_items` + private `library` bucket — APPLIED to live Supabase); `src/lib/library/*`
> (keyless enrichment: wikidata/wikipedia/getty + `enrich.ts` link-builder); `src/lib/anthropic/
> library-prompts.ts` (vision prompt + JSON schema); `src/app/api/librarian/route.ts`;
> `src/app/(app)/librarian/{page,librarian-tool,project-gallery,Thinking,types,image}.tsx`.
>
> **⏭ NEXT / PENDING (for whoever picks this up):**
> 1. **Run `supabase/seed-sample-projects.sql`** in the Supabase SQL editor — seeds 3 starter
>    projects (Modern Houses / Light & Concrete / Civic Monuments, 10 openly-licensed Commons
>    images). **NOT run yet.** (Idempotent; owner = `jsclark2@gmail.com` — edit the email if
>    seeding for someone else.)
> 2. **Signed-in end-to-end test** of the vision flow (couldn't run from the build env — gated):
>    drop an image, confirm it reads + the links + save all work in prod.
> 3. **Resend SMTP / OTP (backlog I3)** is the precondition before a student cohort can log in.
> 4. **v2 upgrade** = true reverse-image ("other angles of *this* building") via **SerpAPI Lens**
>    + Google Images via **Serper** — slots in behind 2 paid env vars (`SERPAPI_KEY`,
>    `SERPER_API_KEY`) without reworking the pipeline. Currently free-data only.
> Caveats: vision is weak on obscure/interior/model/sketch IDs (hence the verify framing +
> conversation); images downscaled client-side to ≤~4 MB; Vercel Hobby 60s function cap.
>
> **Coach (was "Skills Coach") — BUILT + LIVE + polished (through 2026-06-25 · merged to
> `main`, deployed).** A Claude tutor for **Rhino / Grasshopper / AutoCAD / Revit / Adobe**
> (+ a `general` fallback). Streaming chat (SSE), a **3-level toggle** (beginner / intermediate /
> advanced — only re-pitches the *next* answer, never rewrites history), **image + PDF upload**
> via Claude vision, a **report-back loop**, and trustworthy doc links. *Teaching stance:* always
> give the real solution, metered by level + gated on a report-back at beginner (never refusal).
> - **Live at** `https://toolkit.allmeans.works/skills-coach` (route/folder is still
>   `skills-coach`; only the visible label was renamed to **"Coach"** in a parallel session —
>   the `<h1>` in `skills-coach-chat.tsx` and `<AuthGate tool="Coach"/>` in `page.tsx`).
> - **Auth / cost (DO NOT REMOVE):** the page gates anon → `<AuthGate>`, and
>   `api/skills-coach/route.ts` returns **401 for anon** so the Anthropic key can't be hit
>   anonymously. A **password login** (`signInPassword` in `login/actions.ts`) was added next to
>   the magic link because built-in email only delivers to the owner until Resend SMTP is set up.
> - **Files:** UI `(app)/skills-coach/{page.tsx, skills-coach-chat.tsx, MessageBubble.tsx,
>   CoachSidebar.tsx}` · route `api/skills-coach/route.ts` (runtime nodejs, maxDuration 60,
>   persists `coach_messages` + one `tool_runs` row) · prompts
>   `lib/anthropic/skills-coach-prompts.ts` (`MODEL=claude-opus-4-8`, `buildSystem(level,
>   discipline)`, `⟦META⟧` sentinel + `splitMeta`) · curated KB `lib/skills-coach/concepts.ts`
>   (verified official doc roots only) · code helpers `lib/skills-coach/code.ts`
>   (`latestScript`) · migration **`0002_skills_coach.sql`** (`coach_conversations`,
>   `coach_messages`, private `coach-uploads` bucket — **already applied to live Supabase**).
> - **How the trust model works:** the model emits concept **slugs** `[[concept:slug]]` (never
>   raw URLs); the client resolves them to vetted docs via `concepts.ts`. Each turn ends with a
>   trailing `⟦META⟧` + JSON tail carrying `{concept, claims, report_back, further_ideas}`, parsed
>   server-side and sent as an SSE `meta` event.
> - **Right sidebar = three collapsible panels** (`CoachSidebar.tsx`): **In context** (active
>   concept), **Script** (latest Python the tutor wrote, with a big copy-into-Rhino button), and
>   **Further ideas** (alternate commands/workflows/resources, from the `further_ideas` meta).
> - **Last two changes (2026-06-25, PR #27 → squash `cd44aba`):** (1) the empty-state **example
>   prompts now rotate** — a 26-prompt pool, a random 4 drawn on each mount + on "New chat"
>   (`EXAMPLE_POOL`/`sampleExamples` in `skills-coach-chat.tsx`; SSR renders first 4
>   deterministically, client reshuffles after mount → no hydration mismatch). (2) **All Coach UI
>   text swept to black** (`text-neutral-900`) per the all-text-black rule — kept the functional
>   accents (`#ff3b21` CTAs/links, the ✓/?/⚠ claim chips, error red). *The black rule is
>   site-wide; only the Coach surface has been swept so far — other pages may still have grey.*
> - **Deferred (not built):** Phase-2 `.ghx`/`.3dm` parsing (today non-image/PDF uploads get an
>   honest "drop a screenshot" fallback; **HEIC is rejected** client-side); Resend SMTP + a
>   6-digit OTP for `@illinois.edu` (campus scanners burn magic links).
>
> **⚠️ Multi-worktree hazard the next agent WILL hit (learned twice now):** several Claude
> sessions share this repo via separate worktrees, so **a folder's local `main` can be many
> commits behind `origin/main`** and the working tree can pick up another session's edits. Before
> branching: `git fetch origin` and **base your branch on `origin/main`, not local HEAD** (last
> time local `main` was 15 commits behind and a parallel session had renamed Skills Coach→Coach;
> a naive branch would have reverted it). Also: **a *merge* commit does NOT trigger a Vercel
> build — always `gh pr merge --squash`**, and direct `git push origin main` is blocked. Verify
> every merge with `git show <sha> --stat` to confirm it touched only your files.
>
> **Multi-agent rule:** one agent = one folder = one git worktree = one branch (see
> `../RUNNING-MULTIPLE-AGENTS.md`). The **GOAL-1 walkthrough below is now historical**; the
> **GOAL-2 tool-porting roadmap is still current.** Actionable build list: [`BUILD-BACKLOG.md`](BUILD-BACKLOG.md).
<!-- ─────────────────────────── end current state ─────────────────────────── -->

# STATUS — read this first (build handoff)

This is the working state of the project and the plan forward. A new Claude Code session
should read this top to bottom before doing anything. The user (jsclark2@gmail.com) is
continuing the build from a local terminal.

---

## The mission, in two sentences

Build a **Design Toolkit** web app (Next.js + Supabase, hosted on Vercel) for an
architecture design studio, and a separate **portfolio** site later. **Right now the goal is
to get the Toolkit live at `toolkit.allmeans.works`.** After it's live, **port the remaining
studio tools** from `TOOLS/` into the app, one at a time.

---

## ⚠️ Heads-up: `main` has parallel work from other sessions

Besides the toolkit app, `main` now contains standalone tools other sessions added under
`TOOLS/` (not yet integrated into the platform app). Reconcile before porting so you don't
duplicate effort:

- **`TOOLS/crit-board/`** — a self-hosted studio pinup/crit board (students × weeks grid,
  multi-image cells, threaded feedback; Express + SQLite + auth + image upload, plus a
  zero-setup `lite/` demo). **Overlaps heavily with the toolkit's Pinup Wall / Design
  Critic** — decide whether to port crit-board into the toolkit or fold its ideas in.
- **`TOOLS/site-analyzer/LIVE-LINK.md`** — a design doc for a web-3D ⇄ Rhino live link;
  relevant background for the Site Analysis / Site Design ports.

---

## How to start this session

1. The platform code has been **merged to `main`** (PR #4). Just clone/pull `main` — Vercel
   deploys `main` to production. (The old feature branch was `claude/determined-davinci-6pvu5h`.)
2. `cd platform && npm install` (Node 20+).
3. Optional but recommended — connect Claude Code to the services (see "Connections" below)
   so it can apply the migration, set Vercel env vars, and manage DNS for you.

---

## What already exists (built and verified)

A npm-workspaces monorepo under **`platform/`**. `next build` and `astro build` both pass.

### `platform/apps/toolkit` — the Next.js app (the focus)
- **Auth:** Supabase email magic-link via `@supabase/ssr`.
  - `src/lib/supabase/{client,server,middleware}.ts`
  - `src/app/login/{page.tsx,actions.ts}`, `src/app/auth/{callback,signout}/route.ts`
  - `src/middleware.ts` refreshes the session; `src/app/(app)/layout.tsx` redirects anon → `/login`.
- **Shell + dashboard:** `src/app/(app)/layout.tsx` (sidebar) + `src/app/(app)/page.tsx`.
  Nav is data-driven from `src/lib/toolkit-nav.ts` (each item has a `status: "live" | "soon"`).
- **LIVE tool — Librarian** (the worked example for all future ports):
  - UI: `src/app/(app)/librarian/page.tsx` (claim tags ✓/?/⚠, devil's-advocate, verification
    worksheet, provenance log, JSON/MD export).
  - API: `src/app/api/librarian/route.ts` (two-pass pipeline; logs each run to `tool_runs`).
  - Prompts: `src/lib/anthropic/prompts.ts` (ported from `TOOLS/precedent-librarian/web/prompts.js`).
- **LIVE feature — Pinup Wall:** `src/app/(app)/pinup/{page.tsx,upload-form.tsx}` — image
  upload to a private Supabase Storage bucket + metadata, shown via signed URLs, per-user RLS.
- **Stubs** (status `soon`, render `src/components/ComingSoon.tsx`): `site-analysis`,
  `site-design`, `skills-coach`, `design-critic`, `media-2d`, `tools-3d`, `rap`.

### `platform/apps/portfolio` — Astro placeholder
Deferred (the user chose to focus on the Toolkit first). Just a coming-soon `index.astro`.

### `platform/supabase/migrations/0001_init.sql`
Creates `profiles` (+ auto-create trigger), `pinups`, `tool_runs`; turns on **RLS** for all;
creates a private `pinups` storage bucket with per-folder policies. Idempotent (safe to re-run).

### Docs (already written)
- `CLAUDE.md` (repo root) — project orientation, conventions, guardrails.
- `.mcp.json` (repo root) — pre-wired Supabase (read-only) + Vercel MCP servers (tokens via env).
- `platform/README.md` — setup + quick deploy reference.
- `platform/DEPLOY.md` — **beginner, step-by-step** deploy walkthrough (browser-only path).
- `platform/CLAUDE-CODE.md` — how to connect Claude Code to Supabase/Vercel/GitHub.
- `WEBSITE-PLAN.md` (architecture), `HOSTING.md` (hosting options).

---

## External state (what the user has set up)

- **Domain:** `allmeans.works`, registered at **Porkbun**. Plan: Toolkit on the subdomain
  **`toolkit.allmeans.works`**; leave the apex for the portfolio later.
- **Supabase:** a project exists. ⚠️ The migration has **NOT** been run yet, Auth redirect
  URLs are **not** configured, and custom SMTP is **not** set up.
- **Vercel:** the user is logged in. The repo is **not** imported/deployed yet.
- **Anthropic:** API key **not** created yet.

---

## GOAL 1 — Get the Toolkit live (do this first)

Full beginner detail is in `platform/DEPLOY.md`. Condensed, with this project's real values:

1. **Code is on `main`** already (PR #4 merged) — Vercel will deploy from `main`.
2. **Supabase:**
   - Project Settings → API: copy **Project URL** + **anon** key.
   - SQL Editor: run `platform/supabase/migrations/0001_init.sql`.
   - Authentication → URL Configuration:
     - Site URL = `https://toolkit.allmeans.works`
     - Redirect URLs += `https://toolkit.allmeans.works/auth/callback` and
       `https://*.vercel.app/auth/callback`
3. **Anthropic:** create an API key at console.anthropic.com; set a monthly spend cap.
4. **Vercel:** Add New → Project → import `26-Summer-AI-Workshop`.
   - **Root Directory = `platform/apps/toolkit`** (critical — monorepo).
   - Env vars (Production + Preview):
     - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
     - `ANTHROPIC_API_KEY` = Anthropic key (secret)
     - `NEXT_PUBLIC_SITE_URL` = `https://toolkit.allmeans.works`
   - Deploy.
5. **Domain (Porkbun):** Vercel → Settings → Domains → add `toolkit.allmeans.works`. It shows
   a CNAME target (e.g. `cname.vercel-dns.com`). In Porkbun DNS, add:
   **Type `CNAME` · Host `toolkit` · Answer `cname.vercel-dns.com`** (use the exact value Vercel shows).
6. **Wait** for "Valid Configuration" + auto SSL.
7. **Test:** open `https://toolkit.allmeans.works` → log in with the **Supabase owner email**
   (built-in email only sends to you until SMTP is added) → run the Librarian → upload a pinup.

> **If Claude Code is connected (below), it can do most of this:** apply the migration via the
> Supabase MCP, set the Vercel env vars + add the domain via the Vercel MCP, and merge the PR
> via `gh`. Confirm with the user before writes to their live project.

---

## Connections (so Claude Code can drive the services)

`.mcp.json` is already in the repo. To activate:

- **Supabase MCP** (stdio, read-only by default): in your shell, export
  `SUPABASE_ACCESS_TOKEN` (supabase.com/dashboard/account/tokens) and `SUPABASE_PROJECT_REF`
  (the id in the project URL). To **apply the migration**, temporarily remove `--read-only`
  from the supabase entry in `.mcp.json` (write access), then put it back.
- **Vercel MCP** (http, OAuth): `claude mcp add --transport http vercel https://mcp.vercel.com`,
  authorize in browser. Can set env vars, add the domain, read deploy logs.
- **GitHub:** use the `gh` CLI (`gh auth login`) — simplest. Used to merge PR #4, open PRs, etc.

Details + example asks: `platform/CLAUDE-CODE.md`. Run `/mcp` inside Claude Code to verify
servers are live.

---

## GOAL 2 — Port the remaining tools (after the site is live)

**The pattern (use the Librarian as the template):** each tool becomes
1. an API route `src/app/api/<tool>/route.ts` (server-side; keeps `ANTHROPIC_API_KEY` secret;
   port the logic from the tool's `server.js`),
2. prompts in `src/lib/anthropic/<tool>-prompts.ts` (port from `prompts.js`),
3. a UI page `src/app/(app)/<tool>/page.tsx` (port `public/app.js` rendering into React,
   replacing the `ComingSoon` stub),
4. flip its `status` to `"live"` in `src/lib/toolkit-nav.ts`,
5. log each run to `tool_runs` ("the trace").

### What's portable vs. what's a fresh build

| Toolkit section | Source in `TOOLS/` | Status of source | Action |
|---|---|---|---|
| Librarian | `precedent-librarian/web` | working | ✅ DONE (the template) |
| Site Analysis | `site-analyzer/web` | **working** (server.js, datasources.js, geo.js, exporters.js, rhino3dm-export.js, public/app.js) | **Port** — the big one: external data APIs (EPA, Open-Meteo, USGS, flood), `rhino3dm` WASM, multiple export endpoints, streaming. May need its own deps + longer function timeout. |
| Site Design | `form-helper` | spec/README only | Build from spec (browser 3D / Three.js + maybe LLM) |
| Skills Coach | `rhino-wizard` + `portfolio-storyteller` | spec/README only | Build from spec (LLM tutor; tutorials as content) |
| Design Critic | — (new from user spec) | — | Build (LLM personas; log to trace) |
| 2D Media (Drawing Cleanup / Live Video / Fabrication) | — | — | Build (image/vision, WebRTC, export) |
| 3D Tools (Python / Tutorials / Three.js / 3D-Print Settings) | — | — | Build (mixed: content + interactive) |
| RAP | `rap-tactile-cad` | in progress / spec | Build (accessibility tool; also a research showcase) |
| Digital / Pinup Wall | — | — | ✅ DONE (DB feature) |

**Suggested order:** Site Analysis (real code to port) → Skills Coach → Design Critic →
the rest. Each port is a self-contained PR.

### Notes for the Site Analysis port specifically
- Source server exposes `GET /api/search`, `POST /api/analyze`, `GET /api/export/:fmt`.
  Recreate as route handlers under `src/app/api/site-analysis/...`.
- It pulls live public data and builds Rhino exports (`rhino3dm`). Add `rhino3dm` to the
  toolkit's deps; confirm it bundles on Vercel (WASM). Give the function more memory/time.
- The map/standalone variant (`site-analyzer/standalone/index.html`) runs fully client-side
  off public APIs and could be embedded as an interim step.

---

## Conventions & guardrails (from CLAUDE.md)

- **Content lives in files, data lives in the database.** (MDX for essays/pages; Postgres for
  pinups, users, tool runs.)
- **Secrets server-side only.** `ANTHROPIC_API_KEY` only under `apps/toolkit/src/app/api/**`.
  Never in `NEXT_PUBLIC_*` or client code. The Supabase **service_role** key is never used
  client-side.
- **RLS stays on** for every table; write policies, don't disable it.
- **Never commit secrets.** `.env.local` (gitignored) locally, Vercel env in prod; `.mcp.json`
  uses `${VAR}` expansion only.
- **Confirm before irreversible infra actions** (dropping tables, deleting deployments, DNS
  changes, editing production env). Keep the Supabase MCP read-only unless deliberately writing.
- **Push only to the branch the user is working on.** Open PRs as drafts.

---

## Commands (from `platform/`)
- `npm install`
- `npm run dev:toolkit` → http://localhost:3000
- `npm run build:toolkit`
- `npm run build` (both apps)

## Env vars (toolkit)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`,
`NEXT_PUBLIC_SITE_URL`. Template: `apps/toolkit/.env.example`.

## Known gotchas
- **Supabase built-in email** sends only 2/hr to the project owner → set up **custom SMTP**
  (Resend) before inviting others. (`DEPLOY.md` §3.5)
- **UIUC email scanners** can pre-click magic links and "expire" them → switch to a 6-digit
  **OTP code** login if attendees hit this (small code change, not yet done).
- **Vercel Root Directory** must be `platform/apps/toolkit`, or the build fails.
- **Magic-link login** needs three things to agree on the domain: `NEXT_PUBLIC_SITE_URL`
  (Vercel), Supabase **Site URL**, and Supabase **Redirect URLs** — then redeploy.
- **Free tiers:** Supabase pauses after 7 days idle; Vercel Hobby caps functions at 60s
  (the grounded Librarian can hit this) and is non-commercial.

---

*Next action when you start: confirm with the user whether to merge PR #4 to `main`, then walk
GOAL 1. Don't write to the live Supabase/Vercel projects without confirming.*
