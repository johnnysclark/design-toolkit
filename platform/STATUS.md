<!-- ───────────────────────────── CURRENT STATE (top) ───────────────────────────── -->
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
> **Site Analysis — BUILT (2026-06-25, branch `site-analysis`, worktree
> `design-toolkit-site-analysis`, not yet merged).** The ported engine
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
