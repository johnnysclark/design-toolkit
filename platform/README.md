# Studio Platform

A monorepo for the two-property platform from [`../WEBSITE-PLAN.md`](../WEBSITE-PLAN.md):

```
platform/
  apps/
    toolkit/      → the Design Toolkit app   (Next.js + Supabase)   ← built first
    portfolio/    → Research/Work/Teaching    (Astro)                ← scaffolded, deferred
  supabase/
    migrations/   → database schema (profiles, pinups, tool_runs) + RLS + storage
```

> **Status:** the **Toolkit** is the focus. It has working email login, the full
> Design Toolkit navigation, one live tool (**Librarian**), and the **Pinup Wall**
> (database + file uploads). The other tools are stubs wired into the shell. The
> Portfolio is a placeholder for now.

---

## What's live in the Toolkit

- **Email magic-link login** (Supabase Auth) — public URL, but only invited emails get in.
- **App shell** with the whole Design Toolkit in the sidebar.
- **Librarian** — the precedent dossier tool, ported from `TOOLS/precedent-librarian`.
  Tags every claim ✓/?/⚠, runs a devil's-advocate pass, builds a verification
  worksheet, and (when signed in) logs the run to `tool_runs` — "the trace".
- **Pinup Wall** — upload images with metadata; stored in Supabase Storage (private
  bucket + signed URLs) with per-user Row-Level Security.

---

## 1. Prerequisites

- Node 20+ (`.nvmrc` pins 20)
- A free [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com/) (for the Librarian)

## 2. Set up Supabase

1. Create a project. From **Project Settings → API**, copy the **Project URL** and
   the **anon public** key.
2. **Run the migration.** Open **SQL Editor**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run
   it. (Or, with the Supabase CLI: `supabase link` then `supabase db push`.)
3. **Auth → URL Configuration:** set **Site URL** to `http://localhost:3000` and add
   `http://localhost:3000/auth/callback` to **Redirect URLs**. (Add your production
   URLs here too when you deploy.)
4. **Invite users:** under **Authentication → Users**, add the emails allowed to sign
   in (or leave signups open during development).

## 3. Configure + run the Toolkit

```bash
cd platform
npm install

cp apps/toolkit/.env.example apps/toolkit/.env.local
# then edit apps/toolkit/.env.local:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   ANTHROPIC_API_KEY=...
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000

npm run dev:toolkit          # → http://localhost:3000
```

Sign in with an invited email, click the magic link, and you're in. Try the
**Librarian**, then the **Pinup Wall**.

> The map/data tools are stubs for now; the Librarian needs `ANTHROPIC_API_KEY`.

## 4. Deploy to Vercel

> **Doing this from scratch (incl. registering a domain)?** Follow the full,
> step-by-step walkthrough in [`DEPLOY.md`](DEPLOY.md) — it covers Supabase, the
> domain, Vercel, DNS, email/SMTP, and the post-deploy wiring. The summary below is
> the quick reference.

Two Vercel projects from the **same repo**, one per app:

| | Toolkit | Portfolio (later) |
|---|---|---|
| **Root Directory** | `platform/apps/toolkit` | `platform/apps/portfolio` |
| **Framework preset** | Next.js | Astro |
| **Env vars** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL` (= the deployed URL) | `PUBLIC_TOOLKIT_URL` |

After the first deploy, add the production URL + `/auth/callback` to Supabase **Auth →
Redirect URLs**, and set `NEXT_PUBLIC_SITE_URL` to the production domain so magic links
point to the right place.

---

## Security / cost notes

- `ANTHROPIC_API_KEY` is **server-only** (used in `/api/librarian`). It's never sent to
  the browser. Set a **monthly spend limit** in the Anthropic Console.
- The login gate is what protects your budget — only invited emails can run tools.
- Supabase **Row-Level Security** is on for every table: users only read the shared
  pinup wall and only write their own rows.
- If UIUC requires student uploads to stay on campus, the same code runs against a
  **self-hosted Supabase** on a campus VM — see [`../WEBSITE-PLAN.md`](../WEBSITE-PLAN.md) §6.
