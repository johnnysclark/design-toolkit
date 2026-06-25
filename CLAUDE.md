# CLAUDE.md

Guidance for Claude Code working in this repository (`design-toolkit`).

## What this is
**All Means Works** (allmeans.works) — an umbrella design + research practice and platform by
**John Clark** (architecture educator, UIUC School of Architecture). The **26 Summer AI
Workshop** is one initiative under it. The active build is the **platform**: a Vercel +
Supabase web app with two public properties — the **Toolkit** (AI tools for an architecture
studio) and the **public site / portfolio**.

> Repo/folder is named `design-toolkit`. The public brand is still **All Means Works** (the
> repo name and the brand are intentionally different).

## Repo map
- `platform/` — the app monorepo (npm workspaces). **Most work happens here.**
  - `apps/toolkit/` — Next.js 15 (App Router, TS, Tailwind). The Design Toolkit. **Live at
    https://toolkit.allmeans.works.**
    - `public/tools/gable-studio/` — the **Site Design tool** (Gable Studio): `web/` + `python/`
      + `test/`. Embedded by `src/app/(app)/site-design/page.tsx` via an iframe (`STUDIO_URL`).
  - `apps/landing/` — static HTML public site: a minimal landing (**Toolkit · Work · Bio**) and
    a `work/` portfolio page. **Targets the apex https://allmeans.works** (apex DNS not wired
    yet). No build step — open `index.html` directly.
  - `apps/portfolio/` — Astro. Scaffolded, deferred (the static `landing/` is the interim
    public face).
  - `supabase/migrations/` — Postgres schema + RLS + storage. Apply in the Supabase SQL editor.
- `TOOLS/` — original standalone tools being ported in.
- Operating docs: `RUNNING-MULTIPLE-AGENTS.md` (concurrent-agent workflow) · `platform/STATUS.md`
  (who's working on what). Reference: `WEBSITE-PLAN.md` · `platform/DEPLOY.md` (deploy from
  scratch) · `platform/CLAUDE-CODE.md` · `HOSTING.md`.

## Commands (run from `platform/`)
- Install: `npm install`
- Dev (toolkit): `npm run dev:toolkit` → http://localhost:3000  (2nd agent: `-- -p 3001`)
- Build (toolkit): `npm run build:toolkit` · Build all: `npm run build`

## Deployment (live)
- **Vercel project `toolkit`** (team "All Means Works", Hobby plan). Root Directory
  `platform/apps/toolkit`. **Auto-deploys `main`.** Custom domain `toolkit.allmeans.works`
  (prod fallback `toolkit-omega-five.vercel.app`).
- **Supabase project "Toolkit"**, ref `rjlxcdwvpqckblnmgorr`, region East US (Ohio).
- **Domain** `allmeans.works` at **Porkbun** (DNS managed there); `toolkit` subdomain → Vercel
  via a CNAME. Apex left free for the public site.
- Env vars (Vercel + `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`.

### Gotchas that will bite you
- **Use the LEGACY Supabase anon key** (`eyJ…`, from the "Legacy anon, service_role API keys"
  tab) for `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **not** the new `sb_publishable_…` key. The pinned
  client libs (`@supabase/supabase-js` 2.48.1, `@supabase/ssr` 0.5.2) predate the new format.
- **Magic-link login:** Supabase silently falls back to the dashboard **Site URL** if the
  requested redirect isn't in the allowlist. Auth → URL Configuration must have Site URL =
  `https://toolkit.allmeans.works` and Redirect URLs including `…/auth/callback`. A link sent
  before those are set lands on `localhost` → "can't connect to server."
- **SQL-editor migrations don't show in the dashboard's "Last migration"** field (that only
  tracks CLI/repo migrations). The tables still got created.
- **Gable Studio parity:** `gable-studio/web/core.js` and `gable-studio/python/gable_core.py`
  are **line-for-line ports** — edit one, edit both, then `npm test` from the gable-studio
  folder. The studio folder must stay under `platform/apps/toolkit/public/` (so Vercel serves
  it); if it moves, update `STUDIO_URL` in `(app)/site-design/page.tsx` to match, or the iframe
  404s.

## Architecture conventions
- **Content in files, data in the database.** Essays/pages → MDX; pinups, users, tool runs →
  Postgres.
- **Secrets are server-side only.** `ANTHROPIC_API_KEY` is used only under
  `apps/toolkit/src/app/api/**`. Never expose it (or the Supabase `service_role` key) to the
  client or via `NEXT_PUBLIC_*`.
- **Auth model — public shell, gated cost tools.** The Toolkit shell, dashboard, and non-cost
  tool pages are **public** so the cohort can browse freely. **Only tools that spend money or
  need a user session require sign-in.** Gate such a tool in its page **and** enforce auth in
  its API route (return 401 if no user) so the Anthropic key can't be hit anonymously. *Do not
  reinstate the old blanket `(app)/layout.tsx` redirect-to-/login gate.* (Refactor in progress
  — see `platform/STATUS.md`.)
- **RLS is on for every table** — keep it on; write policies, never disable it.
- LLM tools port from `TOOLS/<tool>/web` into Next route handlers, logging each run to the
  `tool_runs` table ("the trace").

## Working with multiple agents (READ THIS)
Several Claude sessions run on this repo concurrently. A git checkout is **per working
folder**, so two interactive sessions in one folder fight over the branch — this has bitten us
(the toolkit dir vanished when a session switched the shared folder's branch).
- **One agent = one folder = one git worktree = one branch.** Never two interactive sessions in
  one checkout. Full recipe: `RUNNING-MULTIPLE-AGENTS.md`.
- **Lanes by folder** to avoid conflicts: `apps/landing/`, `apps/toolkit/.../(app)/<tool>/`,
  `supabase/`.
- **Hot/shared files** (coordinate before editing): `apps/toolkit/src/lib/toolkit-nav.ts`,
  `globals.css`, `(app)/layout.tsx`, `package.json`, `supabase/migrations/*`.
- **`main` is the deploy branch** — Vercel ships it. Keep it releasable; merge small + often;
  pull `main` into your worktree daily.
- **DB migrations are numbered + append-only** (`0002_…`) — never two agents rewriting one.
- **Keep `platform/STATUS.md` current** — your stream, branch, folder, files in flight.

## Env vars
Values live in `.env.local` locally / Vercel in prod — **never commit.** Template:
`apps/toolkit/.env.example`.

## Connected services
MCP servers for **Supabase** and **Vercel** are defined in `.mcp.json` (tokens via env vars,
not committed). Setup + example asks: `platform/CLAUDE-CODE.md`. For **GitHub**, prefer `gh`.

## Guardrails
- **Never commit real keys/tokens.** Use `.env.local` and `${VAR}` expansion in `.mcp.json`.
- Keep the Supabase MCP **read-only** by default; enable writes/migrations only deliberately.
- For irreversible actions (deleting data, dropping tables, changing DNS, editing production
  env vars, **switching branches in a folder another session may be using**), **show the plan
  and confirm with the user first.**
- **Push only to your own branch/worktree.** Don't switch branches in a shared folder.

## Pre-workshop TODO (before inviting students)
- **Resend SMTP** — built-in Supabase email only delivers to the project owner (2/hr); set up
  Resend so others receive magic links (DNS records go at Porkbun).
- **`@illinois.edu` 6-digit code** — campus mail scanners pre-click single-use magic links and
  burn them; offer a typed code for those users.
