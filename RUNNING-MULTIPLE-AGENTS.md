# Running Multiple Claude Agents on All Means Works

A practical recipe for working on different parts of this website at the same time —
e.g. one agent building a Toolkit tool while another edits the public site — without the
two stepping on each other.

---

## The one rule

**One agent = one folder = one branch.**
Never run two interactive Claude sessions in the same folder.

## Why (the failure this prevents)

Git checks out **one branch per folder**. If two sessions share a folder and one switches
branches, the files change *under* the other session mid-task — code "disappears," edits
collide. (This is exactly what happened once: the `toolkit/` folder vanished when another
session switched the shared folder to a branch that didn't contain it.)

The fix is a **git worktree**: one repository, several working folders, each on its own
branch, all sharing the same history underneath. Each agent gets its own folder.

---

## Set this once (per terminal)

```bash
# Path to the main repo — adjust if yours differs:
export REPO="/Users/johnclark/Desktop/RESEARCH/ALL MEANS WORKS/26-Summer-AI-Workshop"
```

## Recipe — start a new agent on a new tool

Example: an agent to build the **Site Analysis** tool.

**1. Make sure main is current**
```bash
git -C "$REPO" fetch origin
```

**2. Create a worktree on a fresh branch off main**
```bash
# Pattern: git -C "$REPO" worktree add -b <branch> <new-folder> origin/main
git -C "$REPO" worktree add -b tool/site-analysis "${REPO}-site-analysis" origin/main
```
This makes a sibling folder `26-Summer-AI-Workshop-site-analysis/` holding the **whole
project** on branch `tool/site-analysis`.

**3. Open a NEW terminal tab and go into that folder**
```bash
cd "${REPO}-site-analysis"
```

**4. Install dependencies (first time in a fresh worktree)**
```bash
cd platform && npm install && cd ..
```

**5. Start Claude there**
```bash
claude
```

**6. Brief the agent — paste something like:**

> You're in a dedicated git worktree on branch `tool/site-analysis`. Your job: build the
> Site Analysis tool in `platform/apps/toolkit/src/app/(app)/site-analysis/`. Stay in that
> folder. Do NOT edit the shared files (`lib/toolkit-nav.ts`, `globals.css`,
> `(app)/layout.tsx`, `package.json`) without flagging me first. Preview with
> `npm run dev:toolkit` from `platform/`. Read `CLAUDE.md`, and update `platform/STATUS.md`
> with what you're working on.

---

## Preview while you work

From inside the worktree's `platform/`:
```bash
npm run dev:toolkit        # http://localhost:3000
```
⚠️ Only ONE dev server can hold port 3000. If a second agent needs a live preview at the
same time, run it on another port:
```bash
npm run dev:toolkit -- -p 3001
```

## Integrate when the tool is done

```bash
# from inside the worktree:
git add -A && git commit -m "Add Site Analysis tool"
git push -u origin tool/site-analysis

# then merge into main (this is what deploys) — open a PR on GitHub, or locally:
git -C "$REPO" checkout main
git -C "$REPO" merge tool/site-analysis
git -C "$REPO" push origin main
```
Merging to `main` triggers a Vercel redeploy.

## Clean up a finished worktree

```bash
git worktree remove "${REPO}-site-analysis"
git -C "$REPO" branch -d tool/site-analysis
```

---

## Rules of the road

- **One agent / one folder / one branch.**
- **Split work by folder** so agents rarely touch the same files. Natural lanes:
  `apps/landing/` (public site) · `apps/toolkit/src/app/(app)/<tool>/` (one tool) ·
  `supabase/` (database).
- **Avoid the shared "hot files"** — coordinate before editing:
  `apps/toolkit/src/lib/toolkit-nav.ts`, `globals.css`, `(app)/layout.tsx`, `package.json`,
  `supabase/migrations/*`. Let **one** agent own the shell/nav at a time.
- **Pull `main` daily** into each worktree (`git pull origin main`) so merges stay tiny.
- **`main` is the deploy branch** — Vercel ships it. Keep it releasable; merge small + often.
- **DB schema changes = a new numbered migration** (`0002_…`, `0003_…`). Never edit an
  existing migration; never have two agents writing the same one.
- **Keep `platform/STATUS.md` current** so every agent sees who owns what.

## Handy commands

```bash
git -C "$REPO" worktree list      # see all worktrees + their branches
git -C "$REPO" branch -a          # see all branches
```

## Troubleshooting

- **"My files vanished / the toolkit folder is gone."** Your folder got switched to a branch
  that doesn't contain them. Check `git -C <folder> branch --show-current`; switch back
  (`git checkout main`) — or, better, use a worktree so it can't happen.
- **"git won't switch branches: local changes would be overwritten."** Commit or
  `git stash` your changes first.
- **Two agents want a live preview.** Give the second one a different port (`-p 3001`).

---

*Companion doc to `CLAUDE.md`. Once things settle this should live inside the repo (e.g.
`platform/RUNNING-MULTIPLE-AGENTS.md`) so it's versioned with the project.*
