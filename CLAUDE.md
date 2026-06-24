# CLAUDE.md

Guidance for Claude Code working in this repository.

> **Continuing the build? Read [`platform/STATUS.md`](platform/STATUS.md) first** — current
> state, how to get the site live, and the tool-porting roadmap.

## What this is
The **26 Summer AI Workshop**: planning docs + AI tools for an architecture design studio.
The active build is the **platform** — a Vercel + Supabase web app. The current focus is
the **Toolkit** app.

## Repo map
- `platform/` — the app monorepo (npm workspaces). **Most work happens here.**
  - `apps/toolkit/` — Next.js 15 (App Router, TypeScript, Tailwind). The Design Toolkit. ← focus
  - `apps/portfolio/` — Astro (Research / Work / Teaching). Scaffolded, deferred.
  - `supabase/migrations/` — Postgres schema + RLS + storage (apply in the Supabase SQL editor).
- `TOOLS/` — the original standalone tools (static demos + two Node apps) being ported in.
- Key docs: `WEBSITE-PLAN.md` (architecture) · `platform/DEPLOY.md` (deploy from scratch) ·
  `platform/CLAUDE-CODE.md` (connect Claude Code to Supabase/Vercel/etc.) · `HOSTING.md`.

## Commands (run from `platform/`)
- Install: `npm install`
- Dev (toolkit): `npm run dev:toolkit` → http://localhost:3000
- Build (toolkit): `npm run build:toolkit`
- Build everything: `npm run build`

## Architecture conventions
- **Content lives in files, data lives in the database.** Essays/pages → MDX; pinups,
  users, tool runs → Postgres.
- **Secrets are server-side only.** `ANTHROPIC_API_KEY` is used only under
  `apps/toolkit/src/app/api/**`. Never expose it (or the Supabase `service_role` key) to the
  client or via `NEXT_PUBLIC_*`.
- **Supabase Auth (magic link)** gates the app; `(app)/layout.tsx` redirects anonymous users
  to `/login`.
- **RLS is on for every table** — keep it on; write policies, never disable it.
- LLM tools port from `TOOLS/<tool>/web` into Next route handlers, logging each run to the
  `tool_runs` table ("the trace").

## Env vars (values live in `.env.local` locally / Vercel in prod — never commit)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`,
`NEXT_PUBLIC_SITE_URL`. Template: `apps/toolkit/.env.example`.

## Connected services (Claude Code as control panel)
MCP servers for **Supabase** and **Vercel** are defined in `.mcp.json` (tokens supplied via
env vars, not committed). Setup + example asks: `platform/CLAUDE-CODE.md`. For **GitHub**,
prefer the `gh` CLI.

## Guardrails
- **Never commit real keys/tokens.** Use `.env.local` and `${VAR}` expansion in `.mcp.json`.
- Keep the Supabase MCP **read-only** by default; enable writes/migrations only deliberately.
- For irreversible actions (deleting data, dropping tables, changing DNS, editing production
  env vars), **show the plan and confirm with the user first**.
- Push only to the branch the user is working on.
