# Design Toolkit

AI tools for an architecture design studio — by **John Clark** (UIUC School of Architecture),
under the **All Means Works** umbrella ([`allmeans.works`](https://allmeans.works)).

**Live:** the Toolkit is deployed at **https://toolkit.allmeans.works** (Next.js + Supabase on
Vercel). A public site (minimal landing + Work portfolio) is built and targets the apex
`allmeans.works`.

> **New here?** Read **[`CLAUDE.md`](CLAUDE.md)** (how to work in this repo) and
> **[`platform/STATUS.md`](platform/STATUS.md)** (current state + roadmap) first. Running
> several agents at once? See **[`RUNNING-MULTIPLE-AGENTS.md`](RUNNING-MULTIPLE-AGENTS.md)**.

## What this is

The studio's bet: **design thinking is already AI-ready** — designers iterate, critique, and
tolerate ambiguity, the same habits that working well with AI rewards. So the tools bring the
design *feedback loop* to AI rather than treating it as an oracle. The throughlines:
**"grade the trace, not the output,"** calibrated skepticism, provenance/logging, and keeping
the student (not the model) as the cognitive agent.

## Repo map

```
design-toolkit/
  CLAUDE.md                  — how to work in this repo (read first)
  RUNNING-MULTIPLE-AGENTS.md — running concurrent agents safely (git worktrees)
  WEBSITE-PLAN.md            — original architecture vision (reference)
  platform/                  — the product (Vercel + Supabase monorepo)
    apps/toolkit/            — the Design Toolkit (Next.js 15) — LIVE
    apps/landing/            — public site: minimal landing + Work portfolio (static)
    apps/portfolio/          — Astro (deferred)
    supabase/migrations/     — Postgres schema + RLS + storage
    STATUS.md                — current state + tool-porting roadmap
    DEPLOY.md                — deploy-from-scratch walkthrough
    CLAUDE-CODE.md           — wire Claude Code to Supabase/Vercel/GitHub
  TOOLS/                     — original standalone tools (sources being ported in)
  studio-hub/                — (separate) Canvas course-hub app
```

## Quickstart (local)

```bash
cd platform
npm install
npm run dev:toolkit     # → http://localhost:3000
```

The public site is static — open `platform/apps/landing/index.html` directly.

## Deploy

The Toolkit auto-deploys from `main` via Vercel (project `toolkit`, root
`platform/apps/toolkit`). Full first-time walkthrough — Supabase, domain, DNS, env vars — is in
[`platform/DEPLOY.md`](platform/DEPLOY.md).

## The tools

The Toolkit ships tools incrementally. Live so far: the **Librarian** (precedent dossier
builder — tags every claim ✓/?/⚠, runs a devil's-advocate pass, logs the run) and the
**Site Design** tool (Gable Studio). `TOOLS/` holds the original standalone versions being
ported into the app one at a time — the porting roadmap lives in
[`platform/STATUS.md`](platform/STATUS.md).

---
*Public brand: **All Means Works**. Repo: `design-toolkit`.*
