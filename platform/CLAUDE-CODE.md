# Connect Claude Code to everything (your control panel)

The goal: instead of clicking through five dashboards, you tell Claude Code what you want —
*"apply this migration," "add this env var to Vercel and redeploy," "why did the last deploy
fail?"* — and it does it through connected tools. This sets that up.

> **Reality check:** MCP (the plug-in system Claude Code uses for these connections) is young
> and the exact endpoints/flags change. The commands below are current as of mid-2026;
> if one doesn't work, check the official doc linked at the bottom — the *approach* is stable
> even when a URL shifts.

---

## First: where to run Claude Code

| | **Local** Claude Code (CLI / desktop app / IDE) | Claude Code on the **web** |
|---|---|---|
| Best for | hands-on infra: Supabase, Vercel, DNS, running dev, deploys | code changes + GitHub / PRs |
| OAuth logins (Vercel) | ✅ opens your browser to authorize | ⚠️ headless — browser OAuth can't complete |
| Token-based MCP (Supabase) | ✅ | ✅ if the token is set as a secret |

**Recommendation:** do the connect-and-manage work in **local Claude Code** — install the
desktop app, or `npm i -g @anthropic-ai/claude-code` then run `claude` in this repo — because
Vercel's connection uses a browser OAuth step. Keep using the web for quick edits + PRs.

---

## What each connection unlocks

| Service | Connect via | Claude Code can then… |
|---|---|---|
| **GitHub** | `gh` CLI (simplest) or GitHub MCP | open PRs, triage issues, check CI, review diffs |
| **Supabase** | Supabase MCP (token) | inspect tables, run read queries, apply migrations, check RLS, read logs |
| **Vercel** | Vercel MCP (OAuth) | inspect deployments, read build logs, manage env vars + domains |
| **Anthropic** | env var (no MCP) | the app uses the key; you set spend caps in the Console |
| **DNS** | registrar / Cloudflare MCP (optional) | read + propose DNS records |

---

## Setup

### 1. Put your tokens in your shell (never in the repo)
Add to `~/.zshrc` or `~/.bashrc`, then restart your terminal:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."     # supabase.com/dashboard/account/tokens
export SUPABASE_PROJECT_REF="abc123xyz"    # the id in your project's dashboard URL
```
The committed [`.mcp.json`](../.mcp.json) reads these via `${VAR}` expansion — so the token
lives in your shell, not in any file you commit.

### 2. The MCP config already ships with the repo
[`/.mcp.json`](../.mcp.json) (repo root) pre-defines **Supabase** (read-only) and **Vercel**.
Open this repo in local Claude Code and it will detect the file and ask you to approve
enabling them. Check status anytime with the **`/mcp`** command inside Claude Code.

- **Supabase** runs locally via `npx @supabase/mcp-server-supabase`, scoped to your project
  and **read-only by default** (it can look, not change). To let Claude apply migrations /
  write, see *Read-only vs read-write* below.
- **Vercel** is the hosted server `https://mcp.vercel.com`; first use opens your browser to
  authorize (OAuth). If it isn't auto-detected, add it explicitly:
  ```bash
  claude mcp add --transport http vercel https://mcp.vercel.com
  ```

### 3. GitHub — just use the `gh` CLI
Install the GitHub CLI, run `gh auth login` once, and Claude Code uses it directly — no tokens
to manage, works both locally and on the web. (Prefer this unless you want multi-step PR
tooling; to add the MCP instead:
`claude mcp add --transport http github https://api.githubcopilot.com/mcp/`.)

### 4. (Optional) DNS via Cloudflare
If you registered or host DNS at Cloudflare, connect Cloudflare's MCP so Claude can read and
propose DNS records. See the Cloudflare MCP docs (linked below) for the current endpoint and
`claude mcp add` command.

---

## Read-only vs read-write Supabase
The shipped config is **read-only on purpose** — Claude can inspect your database and logs but
not change anything. When you want it to *apply a migration or edit data*, remove
`--read-only` from the `supabase` entry in `.mcp.json` for that work (or keep a separate local
override). Treat write mode like handing over the keys: turn it on for the task, then back off.

---

## Things to ask Claude Code once connected (the payoff)
- "Apply `supabase/migrations/0002_*.sql` to my project." *(write mode)*
- "What columns does the `pinups` table have, and is RLS enabled on it?"
- "Add `ANTHROPIC_API_KEY` to my Vercel **production** env, then trigger a redeploy."
- "The last Vercel deploy failed — pull the build log and tell me why, then fix it."
- "Add `toolkit.coolname.com` to the Vercel project and give me the exact DNS record to create."
- "Open a draft PR for this branch summarizing the changes."

---

## Security model (keep these true)
- **Never commit secrets.** Tokens live in your shell env; `.mcp.json` only references them.
  `.gitignore` excludes `.env*` and local MCP overrides.
- **Least privilege:** scope the Supabase token to one project; keep the MCP **read-only**
  until you need writes.
- **Spend cap:** set a monthly limit + usage alert on the Anthropic API key.
- **Confirm before irreversible actions** (dropping tables, deleting deployments, DNS
  changes) — have Claude show the plan first.

---

## Verify the latest (endpoints evolve)
- Claude Code MCP — https://code.claude.com/docs/en/mcp
- Supabase MCP — https://supabase.com/docs/guides/getting-started/mcp
- Vercel MCP — https://vercel.com/docs/agent-resources/vercel-mcp
- GitHub MCP — https://github.com/github/github-mcp-server
- Cloudflare MCP — https://developers.cloudflare.com/agents/model-context-protocol/
