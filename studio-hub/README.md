# studio-hub — the course's Canvas front door (UniQuick app)

A single-page **UniQuick** app that serves as the front door for the Summer AI
Studio: it summarizes the course, indexes the tools and docs, and embeds two
on-thesis interactive pieces — an **Interrogation Bench** (UniQuick built-in AI)
and a **four-line provenance log**. Deploy it to UniQuick, then link the
resulting URL into Canvas.

- **App:** [`site/index.html`](site/index.html) — self-contained, no build step, no dependencies.
- **Platform:** [UniQuick](https://quick.disruptionlab.illinois.edu) (UIUC Gies Disruption Lab).
- Visitors sign in **silently** with their `@illinois.edu` account; the app
  greets them by name. Built-in AI runs on Azure OpenAI inside the U of I tenant
  — **no API key**, and none should ever be put in the app.

---

## Deploy it

You need a deploy token (`qk_…`) from <https://quick.disruptionlab.illinois.edu/token>.
**Never paste the token into a file or commit it** — pass it only via the
`UNIQUICK_TOKEN` environment variable, and revoke/reissue from `/token` if it
leaks.

```bash
export UNIQUICK_TOKEN=qk_...                                   # your token; do not commit
npx -y uniquick token-check                                    # verify auth + reachability
npx -y uniquick create studio-hub --title "Summer AI Studio · Course Hub"
npx -y uniquick deploy ./studio-hub/site --site studio-hub     # deploys ONLY the site/ folder
npx -y uniquick list
```

Site names are auto-prefixed with your netid, so the app lands at:

```
https://quick.disruptionlab.illinois.edu/s/<netid>-studio-hub/
```

Manage or delete it any time at <https://quick.disruptionlab.illinois.edu/my>.

### ⚠️ Deploying from Claude Code **on the web** needs one setting

This repo's web session runs in a sandbox whose **network egress policy blocks
`quick.disruptionlab.illinois.edu`**. `token-check` returns exactly:

```
403: Host not in allowlist: quick.disruptionlab.illinois.edu.
Add this host to your network egress settings to allow access.
```

To deploy from a web session, add that host to the environment's network egress
allowlist (see the [Claude Code web docs](https://code.claude.com/docs/en/claude-code-on-the-web)),
and set `UNIQUICK_TOKEN` as an environment **secret** so it isn't pasted into
chat. **Deploying from your own computer needs none of this** — the host isn't
blocked there.

---

## Link it into Canvas

Once deployed, copy the `/s/<netid>-studio-hub/` URL and add it in Canvas as
either:

- **Modules → + → External URL** (check "Load in a new tab"), or
- a **Redirect Tool** app pointed at the URL, or
- a link/button on the course homepage.

Students click it and are signed in silently with their Illinois account.

---

## What the app uses today (and what's next)

Built against the documented UniQuick SDK, defensively — every platform call is
feature-detected, so the page also renders as a static preview off-platform.

| UniQuick capability | Used now? | Where |
|---|---|---|
| Silent `@illinois.edu` SSO (`quick.user`) | ✅ | greeting bar |
| Built-in AI (`quick.ai.chat`) | ✅ | §5 Interrogation Bench |
| Shared persistent data (`quick.data`) | ⏳ planned | a shared "studio wall" of provenance logs |
| File uploads (`quick.files`) | ⏳ planned | drawing / PDF crit drop |
| Realtime presence (`quick.ws`) | ⏳ planned | live "who's pinned up" |

The shared-data / realtime version needs the full SDK reference
(<https://quick.disruptionlab.illinois.edu/llms.txt>) to confirm the exact
`quick.data` enumeration semantics before shipping multi-writer logic.

## Ground rules (from the platform)

- Visible to anyone at Illinois with the link; only the owner can change/delete.
- **Static pages only.** Uploads capped 5 MB/file, 40 MB/deploy (this app is ~25 KB).
- **Not an approved store for FERPA-protected or sensitive data.**
