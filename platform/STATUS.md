# STATUS — who's working on what

The multi-agent **lane board** for `design-toolkit`. Keep it current: one row per active
stream (branch · folder · owner · state). Workflow: `../RUNNING-MULTIPLE-AGENTS.md`. Project
rules: `../CLAUDE.md`.

## Live / built
- **Toolkit app** — `platform/apps/toolkit/` — **LIVE** at https://toolkit.allmeans.works
  (Vercel project `toolkit`, deploys `main`).
- **Public site** — `platform/apps/landing/` — **built, not deployed.** Landing (Toolkit · Work
  · Bio) + `work/` portfolio. Apex `allmeans.works` still needs its own Vercel project + an A
  record at Porkbun.

## Active streams
| Lane / folder | Branch | Owner | State |
|---|---|---|---|
| **Site Design tool** (Gable Studio) — `apps/toolkit/public/tools/gable-studio/` + `(app)/site-design/page.tsx` | `main` | porting agent | Ported in (single canonical copy, history preserved); iframe embed via `STUDIO_URL`; nav badge → live soon. ⚠️ Rendered UI **not yet clicked through in a browser**. |
| **Public site / portfolio** — `apps/landing/` | `claude/web` (planned worktree) | web agent | Landing + Work (MOS-style portfolio index) + Bio popup built. Apex deploy pending. |
| **Toolkit auth refactor** — `apps/toolkit/.../(app)/*`, `api/*` | TBD | — | PLANNED, not started: public shell + sign-in only for API-cost tools; restyle login to match the white aesthetic. |

## Open items
- **Apex deploy:** `allmeans.works` → public site (new Vercel project, root `platform/apps/landing`, framework Other; + Porkbun A record / `www` CNAME).
- **Auth refactor:** public shell; gate cost tools (Librarian) in the page **and** enforce 401 in their API route so the Anthropic key can't be hit anonymously.
- **Gable Studio:** click through the rendered UI in a real browser (never verified). Local look, no login: `cd platform && npm run dev:toolkit` → http://localhost:3000/tools/gable-studio/web/index.html
- **Pre-workshop:** Resend SMTP (built-in email only reaches the project owner); `@illinois.edu` 6-digit-code login option.

## Reminders
- **One agent = one folder = one git worktree = one branch.**
- **Hot files** (coordinate before editing): `lib/toolkit-nav.ts`, `globals.css`, `(app)/layout.tsx`, `package.json`, `supabase/migrations/*`.
- **Gable Studio parity:** `web/core.js` ↔ `python/gable_core.py` are line-for-line; edit both, run `npm test` from the gable-studio folder.
- **`main` auto-deploys** via Vercel — keep it releasable; merge small + often.
