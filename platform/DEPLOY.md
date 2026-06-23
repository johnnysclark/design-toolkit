# Deploying Rhino Wizard

Three ways to run the tutor, **fastest first**:

- **[Path 0 — Local demo](#path-0--local-demo-fastest)** — on your laptop in ~10 minutes (great for a quick class demo).
- **[Path 1 — Render](#path-1--render-managed-recommended-for-a-term)** — a managed website that stays up all term, auto-deploys on `git push`.
- **[Path 2 — UIUC web services](#path-2--uiuc-web-services)** — campus cPanel (free with `@illinois.edu`) or an Engineering IT Linux VM.

All three run the **same app**: a Node server (`server.js`) + a PostgreSQL database. You always need an **Anthropic API key** (for the AI answers). What changes between paths is *where* Node and Postgres live.

What you get: a student page at `/rhino/` and an instructor dashboard at `/rhino/instructor/`.

---

## Before you start: get an Anthropic API key

Needed for every path.

1. Go to <https://console.anthropic.com> → sign up / log in.
2. **Billing** → add a payment method and a little credit.
3. **Billing → Limits** → set a **monthly spend limit** (e.g. $20) so a busy class can't surprise-bill you.
4. **API Keys** → **Create Key** → copy the `sk-ant-…` value somewhere safe (you can't see it again).

> Cost lever: the tutor uses `claude-opus-4-8` by default (best quality). To cut cost, set `RHINO_MODEL=claude-sonnet-4-6` (a cheaper model) — the tutor's "don't hand over the answer" behavior is enforced by the response format, not the model, so it still works. See [knobs](#environment-variables-reference).

---

## Path 0 — Local demo (fastest)

Goal: running on your own computer in ~10 minutes. Perfect for showing it on a projector, or letting a room join from their phones.

### 0.1 Install Node.js (18+, ideally 20.6+)
- **Mac:** download the LTS installer from <https://nodejs.org>, or `brew install node`.
- **Windows:** download the LTS installer from <https://nodejs.org> and run it.

Check it: `node --version` (want `v20.6` or higher so the `--env-file` flag works; v18/v20 work too, see the note in 0.5).

### 0.2 Get the code
```bash
git clone https://github.com/johnnysclark/26-Summer-AI-Workshop.git
cd 26-Summer-AI-Workshop/platform
npm install
```
(If the changes are still on a branch and not yet on `main`, add `-b claude/rhino-grasshopper-tutor-plan-nt2a3d` to the `git clone`.)

### 0.3 Get a PostgreSQL database — pick the easiest one for you

**Option A — No install (recommended for a demo): a free cloud database.**
1. Go to <https://neon.tech> (or <https://supabase.com>) → create a free project.
2. Copy the **connection string** — it looks like
   `postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/dbname?sslmode=require`.
3. That's your `DATABASE_URL`. (Our app auto-enables SSL for remote databases.)

**Option B — Docker one-liner** (if you have Docker):
```bash
docker run --name rhino-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres
```
`DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres`

**Option C — Install Postgres natively:** Postgres.app (Mac) or the installer (Windows), then create a database. `DATABASE_URL=postgres://localhost:5432/yourdb`.

### 0.4 Create your settings file
In the `platform/` folder, copy `.env.example` to `.env` and fill it in:
```ini
ANTHROPIC_API_KEY=sk-ant-...            # from the step above
DATABASE_URL=postgres://...             # from 0.3
CLASS_CODE=DEMO1                        # what students type to join
CLASS_NAME=Demo Studio
INSTRUCTOR_PASSWORD=pick-something-long # your dashboard login
```
`.env` is gitignored — it never gets committed.

### 0.5 Set up the database and start the server
```bash
npm run migrate:dev     # creates the tables + your class. Expect: "✓ schema applied" / "✓ class seeded: DEMO1"
npm run dev             # starts the server. Expect: "Studio AI platform → http://localhost:3000"
```
> On **Node older than 20.6** the `--env-file` flag isn't available. Either upgrade Node, or set the variables in your shell and use `npm run migrate` / `npm start` instead. Mac/Linux: `export ANTHROPIC_API_KEY=… DATABASE_URL=… CLASS_CODE=… INSTRUCTOR_PASSWORD=…`. Windows PowerShell: `$env:ANTHROPIC_API_KEY="…"` (one per line).

### 0.6 Try it
- Student: open <http://localhost:3000/rhino/>, join with `DEMO1` + any name, ask a Grasshopper question.
- Instructor: open <http://localhost:3000/rhino/instructor/>, log in with the class code + your `INSTRUCTOR_PASSWORD`.
- Health: <http://localhost:3000/healthz> should say `ok`.

### 0.7 (Optional) Let others join from their phones
Your laptop's `localhost` isn't reachable by others. For a live demo, open a free temporary public link (no account):
```bash
npx cloudflared tunnel --url http://localhost:3000
```
It prints a `https://something.trycloudflare.com` URL — share that + the class code. (Or `ngrok http 3000`.) The link is only live while the command runs.

### Demo-day checklist
- [ ] `npm run dev` is running and `/healthz` says `ok`.
- [ ] You've asked one question already so you know it answers.
- [ ] Class code written on the board.
- [ ] If Wi-Fi is shaky, just demo on the laptop screen (skip the tunnel).

---

## Path 1 — Render (managed, recommended for a term)

A real website that stays up, with HTTPS, that redeploys whenever you `git push`. Cost: about **$14/month** (≈$7 web + ≈$7 database) on the paid tier this guide uses, plus Anthropic usage. The repo already contains the blueprint at [`render.yaml`](render.yaml).

### 1.1 Get the code onto your `main` branch
Render deploys from a branch (it defaults to `main`). Merge the pull request into `main` (the green **Merge** button on the PR), **or** note your branch name to pick in step 1.3.

### 1.2 Create a Render account
<https://render.com> → sign up with GitHub and authorize access to the repo.

### 1.3 Deploy the Blueprint
1. Render dashboard → **New** → **Blueprint**.
2. Pick the `26-Summer-AI-Workshop` repository (and your branch if not `main`).
3. Render reads `platform/render.yaml` and shows **one web service** (`rhino-wizard`) and **one PostgreSQL database** (`rhino-db`). Click **Apply**.

### 1.4 Set your secrets
On the `rhino-wizard` service → **Environment**, fill in the four values (the database URL is wired automatically — don't touch it):

| Variable | What to put |
|---|---|
| `ANTHROPIC_API_KEY` | your `sk-ant-…` key |
| `INSTRUCTOR_PASSWORD` | a long password you invent — your dashboard login |
| `CLASS_CODE` | what students type to join, e.g. `STUDIO-FALL26` |
| `CLASS_NAME` | a label, e.g. `Fall Studio 2026` |

### 1.5 Confirm the paid plans (no sleeping, no expiry)
- Web service plan should be **Starter** (stays awake).
- Database plan should be the **smallest paid** Postgres (not Free — the free database is deleted after 90 days). If the blueprint created a Free database, open the database → **Change Plan** → pick the smallest paid tier.

### 1.6 Deploy and watch the logs
Render builds and starts automatically. In the service **Logs**, a healthy start shows, in order:
```
✓ schema applied
✓ class seeded: STUDIO-FALL26
  Studio AI platform → http://localhost:10000
```

### 1.7 Test it
Your URL is shown at the top of the service (e.g. `https://rhino-wizard.onrender.com`).
- `…/rhino/` → join with your class code.
- `…/rhino/instructor/` → log in with the class code + `INSTRUCTOR_PASSWORD`.
- `…/healthz` → `ok`.

### 1.8 Give it to students
Share the URL + the class code. That's all they need — no accounts, no passwords.

### Running it day to day
- **Update the app:** `git push` to the deployed branch → Render redeploys automatically.
- **Add another section/class:** service → **Shell** → `node lib/seed.js SECTION-B "Tuesday section"`.
- **Change the password or switch model:** edit the env var → Render redeploys. (See [knobs](#environment-variables-reference).)
- **Watch cost:** Anthropic console → Usage. A per-student rate limit is already on.
- **Backups:** managed automatically on the paid database (point-and-click restore).

### Custom domain later (optional)
The free `*.onrender.com` URL is fine to start. When ready: service → **Settings → Custom Domains** → add e.g. `tutor.yourschool.edu` → create the CNAME it shows at your domain registrar → Render issues HTTPS automatically. No app change needed.

---

## Path 2 — UIUC web services

Two campus options. **2a (cPanel)** is the easiest and free; **2b (a VM)** gives the most control.

### 2a — cPanel at web.illinois.edu (easiest, free with @illinois.edu)
UIUC's cPanel hosting supports **Node.js apps and PostgreSQL**, which is exactly what this needs. Docs: <https://web.illinois.edu/> and the guide *How to Host a NodeJS Application* at <https://answers.illinois.edu/illinois/91468>.

1. **Create your account** at <https://web.illinois.edu/> (use your `@illinois.edu` login).
2. **Get the code in:** cPanel → **Git Version Control** → Create → paste the repo URL `https://github.com/johnnysclark/26-Summer-AI-Workshop.git`. This clones it into your account (e.g. `~/26-Summer-AI-Workshop`).
3. **Create the database:** cPanel → **PostgreSQL Databases** → create a database and a user, add the user to the database. Note the names. Your `DATABASE_URL` is:
   `postgres://DBUSER:DBPASSWORD@localhost:5432/DBNAME`
4. **Set up the Node app:** cPanel → **Setup Node.js App** → **Create Application**:
   - **Node.js version:** pick **18 or higher** (if the menu only offers older, use Path 2b instead).
   - **Application mode:** Production.
   - **Application root:** the `platform` subfolder, e.g. `26-Summer-AI-Workshop/platform`.
   - **Application startup file:** `server.js`.
5. **Add environment variables** in that same screen: `ANTHROPIC_API_KEY`, `DATABASE_URL` (from step 3), `INSTRUCTOR_PASSWORD`, `CLASS_CODE`, `CLASS_NAME`.
6. **Install dependencies:** click **Run NPM Install**.
7. **Create the tables:** in the Node.js App screen use **Run JS Script** → run the `migrate` script (it runs `lib/migrate.js`). You should see the class get seeded.
8. **Start/Restart** the app. Your URL is the Application URL shown (a `*.web.illinois.edu`-style address). Visit `…/rhino/` and `…/rhino/instructor/`.

> Notes: cPanel runs the app behind Passenger, which provides the `PORT` — `server.js` already uses it, so nothing to change. Because the schema is created on startup/migrate, you don't need cron.

### 2b — Engineering IT / Technology Services Linux VM (most control)
Request a VM, then install everything yourself. Eligibility includes faculty, units, RSOs, research groups, and staff.

- **Request it:** email `engrit-help@illinois.edu`, or open a *Virtual Server Hosting* ticket (<https://help.uillinois.edu/TDClient/42/UIUC/Requests/ServiceDet?ID=185>). Ask for Ubuntu Linux. Details: <https://engrit.illinois.edu/services/server-and-hpc-services/server-hosting>.
- **On the VM (Ubuntu):**
  ```bash
  # Node 20 + Postgres
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs postgresql
  sudo -u postgres createdb workshop
  sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'choose-a-password';"

  # App
  git clone https://github.com/johnnysclark/26-Summer-AI-Workshop.git
  cd 26-Summer-AI-Workshop/platform
  npm install
  # create .env (same keys as Path 0), with DATABASE_URL=postgres://postgres:choose-a-password@localhost:5432/workshop
  npm run migrate
  ```
- **Keep it running** with systemd — create `/etc/systemd/system/rhino.service`:
  ```ini
  [Unit]
  Description=Rhino Wizard
  After=network.target postgresql.service

  [Service]
  WorkingDirectory=/home/youruser/26-Summer-AI-Workshop/platform
  EnvironmentFile=/home/youruser/26-Summer-AI-Workshop/platform/.env
  ExecStart=/usr/bin/node server.js
  Restart=always
  User=youruser

  [Install]
  WantedBy=multi-user.target
  ```
  Then `sudo systemctl enable --now rhino`.
- **HTTPS** with Caddy (auto-certificates) — `/etc/caddy/Caddyfile`:
  ```
  your-vm-hostname.illinois.edu {
      reverse_proxy localhost:3000
  }
  ```
  `sudo systemctl reload caddy`. Done — visit `https://your-vm-hostname.illinois.edu/rhino/`.

> Campus **publish.illinois.edu / WordPress** hosting will **not** run this (no Node/Postgres). Use cPanel (2a) or a VM (2b).

---

## Environment variables reference

| Variable | Required | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Your Anthropic key (the AI answers). |
| `DATABASE_URL` | yes | PostgreSQL connection string. On Render it's wired automatically. |
| `INSTRUCTOR_PASSWORD` | yes (for the dashboard) | Login for `/rhino/instructor/`. Unset = dashboard locked. |
| `CLASS_CODE` | recommended | Seeds a class on startup so students can join immediately. |
| `CLASS_NAME` | optional | Display name for the class. |
| `PORT` | optional | Defaults to 3000; Render/cPanel set it for you. |
| `RHINO_MODEL` | optional | Override the model, e.g. `claude-sonnet-4-6` for lower cost. Default `claude-opus-4-8`. |
| `RHINO_MAX_TOKENS` | optional | Max answer length (default 4000). |

---

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| `/healthz` returns `db unavailable` (503) | Database not reachable. Check `DATABASE_URL`; on Render confirm the database is running and on a paid plan. |
| Instructor login fails with 401 | Wrong key, or wrong class code. |
| Instructor page returns 503 "not configured" | `INSTRUCTOR_PASSWORD` isn't set on the server. Add it and restart. |
| Asking a question errors | `ANTHROPIC_API_KEY` missing/typo, no billing/credit, or you hit your spend limit. Check the Anthropic console. |
| "Slow down a moment" (429) | The per-student rate limit — expected if you click fast. Wait a few seconds. |
| First visit is slow (~30s) then fine | A sleeping **free** Render service. Use the paid Starter plan to avoid it. |
| Render blueprint won't apply (bad plan name) | Render renamed a tier. Remove the `plan:` line in `render.yaml` and choose the plan in the dashboard. |
| cPanel won't let you pick Node 18+ | Your cPanel is on an older Node. Use Path 2b (a VM) instead. |
| cPanel app won't start / Passenger error | Make sure **Application root** points at the `platform` folder and **startup file** is `server.js`, then Run NPM Install and Restart. |
