# Hosting Recipe — putting the workshop tools online

A plain-language guide to getting these tools onto the web, written for someone who
is *not* a full-time developer. It gives you **three University of Illinois (UIUC)
options** and **three private-service options**, with enough detail to actually
choose and act.

> **Your situation (what this recipe is tuned for):** host **both** the simple
> static demos **and** the full AI apps; make them reachable on a **public URL but
> gated by per-user logins** (each user is handed a key / login), so the open
> internet can't run up your AI bill.

---

## 0. The one idea that removes the confusion

These "tools" are really **two different kinds of thing**, and they have **two very
different hosting needs**. Almost all the confusion comes from treating them as one.

| Class | Which tools | What it is | What it needs to be hosted |
|---|---|---|---|
| **A — Static** (no server) | `TOOLS/precedent-librarian/lite/index.html`, `TOOLS/site-analyzer/standalone/index.html` | A single HTML file. It runs entirely in the visitor's browser. The standalone even pulls live data straight from public APIs — **no secret key involved**. | **Any file host.** Literally just somewhere to put files. Free almost everywhere. |
| **B — Full app** (Node server) | `TOOLS/site-analyzer/web/`, `TOOLS/precedent-librarian/web/` | A small **Node.js server** (`server.js`) that serves a web page *and* calls the Anthropic API on the server side. | A host that **runs Node 18+ continuously**, **stores a secret** (`ANTHROPIC_API_KEY`), and can **reach the internet**. Costs money to run + pay-per-use AI. |
| *(not a website)* | `TOOLS/site-analyzer/cli/` | A command-line tool. | N/A — you run it locally; nothing to host. |

**Why this matters:** a "static host" (GitHub Pages, the free campus cPanel space,
Cloudflare Pages…) can host **Class A** in five minutes for free, but it **cannot
run Class B at all** — there's no server there to execute `node server.js` or to
hold your API key. Class B needs a real, always-on server. Every option below is
rated for *both* classes so you can see at a glance what each one can do.

**Key facts about the Class B apps** (from the code, so you can match a host to them):

- Run with `npm install` then `npm start` (which runs `node server.js`). Node **18+**.
- They read the port from `process.env.PORT` (defaults to 3000) — so they drop into
  any modern host without changes.
- The **only required secret** is `ANTHROPIC_API_KEY`. Optional knobs: `GRID_N`,
  `CLIMATE_YEAR`, `PORT`.
- They make **outbound HTTPS calls** (Anthropic + public data APIs: EPA, Open-Meteo,
  USGS elevation, flood). A host that blocks outbound traffic will break the AI and
  data features.
- `site-analyzer` also installs `rhino3dm` (a WebAssembly module for the Rhino
  exports) — give that app ~**512 MB–1 GB RAM** to be safe.
- There are **two** apps, so you either run **two services** or **one server running
  both** behind a reverse proxy. Neither has a database.

---

## 1. Two decisions that apply to *every* option

Decide these once; they're the same no matter who hosts.

### 1a. The login gate (your "users are given a key" requirement)

**Important:** the Class B apps have **no login built in today** — out of the box,
anyone with the URL can use them (and spend your AI budget). So the gate is something
**you add on top**. Three good ways, easiest first:

1. **Cloudflare Access (recommended — no code).** A free "Zero Trust" gate you put in
   front of any site. You paste in the list of allowed **email addresses**; each
   person logs in by receiving a **one-time PIN** by email (no password for you to
   manage, no identity provider to set up). **Free for up to 50 users.** Works in
   front of *both* the static demos and the Node apps. This is the cleanest match for
   "public URL, but only people I've given access to can get in."
2. **Built-in platform password.** Some hosts (Netlify, Vercel) offer a one-click
   "password-protect this site." Simplest possible, but it's **one shared password**
   for everyone, not a per-user login.
3. **Per-user access keys inside the app.** Add ~30 lines to `server.js` so each user
   must present a key you issued (see the snippet in the Appendix). This is the only
   option that is *truly per-user and per-app* without an external service — but it's
   a code change you maintain.

> UIUC also has **NetID single sign-on (Shibboleth)**. Great *if every user has a
> UIUC NetID* — but workshop guests often don't, which is why Cloudflare Access's
> email PIN is usually the better fit.

### 1b. Protecting the API key and the bill

The Class B apps share **one** server-side Anthropic key, billed **per use**. So:

- The key lives **only on the server**, in an environment variable — **never** in the
  HTML/JS the browser downloads. (The repo already does this right: `.env` and
  `node_modules/` are gitignored, and only an empty `.env.example` is committed. The
  *static* standalone tool uses **no** key — it only calls public data APIs.)
- **Gate access** (§1a) so strangers can't trigger paid calls.
- In the **Anthropic Console**, use a **separate key per app**, set a **monthly spend
  limit**, and turn on **usage alerts**. If a key ever leaks, rotate it there.
- Consider a simple **per-user daily cap / rate limit** for a public workshop.

---

## 2. Three UIUC (university) options

> Architecture sits in the **College of Fine & Applied Arts**, but these are
> **campus-wide** services from **Technology Services** and **NCSA** — you're
> eligible. Pricing/links were accurate as of mid-2026; **confirm current rates**
> with the listed contact, because campus rates change yearly.

### U1 — `web.illinois.edu` (free campus web hosting: cPanel + Webhost)

- **What it is:** the central campus web-hosting service. Two relevant flavors:
  - **cPanel** — point-and-click hosting for students/faculty/staff. Perfect for
    **Class A** (drag your HTML files in, done).
  - **Webhost** — shared hosting for groups/departments that explicitly lists
    **Node.js** support (alongside PHP, Python, Ruby, Perl), managed over SSH/SFTP.
    This is the campus path that can *potentially* run **Class B**.
- **Hosts:** Class A ✅ (easily) · Class B ⚠️ (Webhost, *with caveats* — verify below).
- **Cost:** **Free.**
- **Effort:** Low for static; Medium for the Node apps (shared hosting is fussier than
  a real server).
- **Login fit:** Put **Cloudflare Access** in front (§1a), or use UIUC NetID SSO.
- **Steps (static):** request space → upload the two `index.html` files via the
  cPanel File Manager or SFTP → share the URLs.
- **Steps (Node app):** request a **Webhost** account → upload the app folder →
  set the Node app's entry point to `server.js` and add the `ANTHROPIC_API_KEY`
  environment variable in the control panel → start it.
- **Watch out for:** shared hosting often limits **long-running processes**,
  **outbound internet**, and how you set **secrets** — all of which these apps need.
  **Before committing, email `cpanel-support@illinois.edu` and ask three yes/no
  questions:** *(1) Can I run a persistent Node 18+ app? (2) Can it make outbound
  HTTPS calls to external APIs? (3) Can I set private environment variables?* If any
  answer is "no," use **U2** instead for Class B.
- **Also worth knowing:** **Publish at Illinois** (`publish.illinois.edu`) is a free
  campus **WordPress** — ideal for the *workshop's written materials/landing page*,
  not for the apps.
- **Best when:** you want **zero cost** and the **static demos** online today, with
  the Node apps as a "maybe, if Webhost cooperates."

### U2 — Technology Services **Virtual Server Hosting** (your own Linux VM)

- **What it is:** a real **Linux virtual machine** from the central VMware service.
  You pick the CPU/RAM/disk; it's billed monthly. This is a *full server you control*
  — it runs the Node apps exactly the way they run on your laptop, with none of the
  shared-hosting limitations.
- **Hosts:** Class A ✅ · Class B ✅ (this is the **best campus fit for the full apps**).
- **Cost:** usage-based and cheap. Published rates: **~$2.85 / vCPU / month**,
  **~$1.06 / GB RAM / month**, plus a few cents/GB for storage. A comfortable box
  (**1 vCPU, 2 GB RAM, ~20 GB disk**) lands around **~$6–10 / month**. *Confirm
  current rates.*
- **Effort:** Medium-High (you're now a part-time sysadmin) — or low if FAA/Tech
  Services IT helps you set it up.
- **Login fit:** Cloudflare Access in front (§1a), or NetID SSO, or the in-app keys.
- **Steps:** request a VM (Ubuntu) from `virtualhosting@illinois.edu` → install Node
  18+ → copy each app, `npm install`, set `ANTHROPIC_API_KEY` → keep them running with
  **pm2** (a process manager) → put **Caddy or nginx** in front for HTTPS and to map
  both apps onto one domain (e.g. `/site-analyzer` and `/precedent-librarian`). A
  `Dockerfile` is in the Appendix if you'd rather containerize.
- **Watch out for:** it's a server you *own* — you handle updates and security
  patches. Confirm **outbound HTTPS** is open (usually is on these VMs).
- **Best when:** you want the full apps hosted **on campus, reliably, cheaply**, and
  are OK with (or have help for) basic server upkeep.

### U3 — Research cloud: **Illinois Computes / NCSA Radiant** (and campus AWS)

- **What it is:** the university's research-computing cloud. Three doors:
  - **Illinois Computes** — provides **baseline research computing at _no cost_** to
    faculty/researchers (grad students may request). If your hosting reads as
    *research infrastructure*, this can be **free**.
  - **NCSA Radiant** — an on-campus private cloud (OpenStack VMs), billed monthly at
    **~⅓ the cost of AWS**; minimum 1 vCPU / 4 GiB RAM + 40 GB SSD.
  - **Campus AWS/Azure via `cloud.illinois.edu`** — the university's enterprise cloud
    accounts (AWS Enterprise Support included; student research credits up to $5,000;
    free AWS Educate). Use this if you want managed cloud services or to bill a grant.
- **Hosts:** Class A ✅ · Class B ✅.
- **Cost:** **Free** (Illinois Computes allocation) → low (Radiant) → variable (AWS).
- **Effort:** Medium-High — cloud/VM skills, similar to U2.
- **Login fit:** Cloudflare Access (§1a) or in-app keys; on AWS you can also use
  Cognito.
- **Steps:** request an allocation via the **NCSA XRAS portal** ("Start a New Illinois
  Computes Program Submission") or email `illinois-computes@illinois.edu`; for AWS,
  request an account at `cloud.illinois.edu`. Then deploy the apps as in **U2**.
- **Watch out for:** aimed at *research* workloads and approvals — heavier process
  than U1/U2 for what is a small app. AWS can surprise you on cost if left running;
  set budgets.
- **Best when:** this is tied to **publishable research** (the RAP tool fits), you
  want it **grant-billable or free**, or you expect to **scale** well beyond a
  workshop.

---

## 3. Three private-service options

> Ballpark prices as of mid-2026 — **confirm current pricing**, free tiers change.
> All three deploy straight from your GitHub repo and redeploy on every `git push`.

### P1 — Render (easiest all-in-one) — **recommended default**

- **What it is:** a "platform as a service" that turns a GitHub repo into a running
  web app with almost no setup. The closest thing to "it just works" for Node.
- **Hosts:** Class A ✅ (free Static Sites) · Class B ✅ (Web Services).
- **Cost:** static sites **free**; a Node web service has a **free tier that sleeps
  when idle** (first visit after idle is slow) or **~$7/month** to stay always-on.
  *One service per app, so two apps ≈ two services.*
- **Effort:** **Low.**
- **Login fit:** Cloudflare Access in front (§1a), or the in-app keys.
- **Steps:** New → **Web Service** → connect the repo → set **Root Directory** to
  `TOOLS/site-analyzer/web` → Build `npm install` → Start `npm start` → add env var
  `ANTHROPIC_API_KEY` → Deploy. Repeat with root `TOOLS/precedent-librarian/web`. Put
  the static demos on a free **Static Site** (or let each app serve its own).
- **Watch out for:** the free tier's cold-start delay; give `site-analyzer` the
  512 MB+ instance for `rhino3dm`.
- **Best when:** you want the full apps **live this afternoon** with the least fuss.
  *(Railway is a near-identical alternative with usage-based pricing.)*

### P2 — Fly.io (containers, more control & scale)

- **What it is:** runs your app as a small **container** (Docker) on servers near your
  users; can **scale to zero** when idle and back up on demand.
- **Hosts:** Class A ✅ · Class B ✅.
- **Cost:** **pay-as-you-go**; a small always-on instance is roughly **~$3–5/month**,
  less if it scales to zero. *Confirm current pricing.*
- **Effort:** Medium (you use the `Dockerfile` in the Appendix + a CLI).
- **Login fit:** Cloudflare Access (§1a) or in-app keys.
- **Steps:** install the `fly` CLI → in each app folder run `fly launch` (it detects
  the `Dockerfile`) → `fly secrets set ANTHROPIC_API_KEY=…` → `fly deploy`.
- **Watch out for:** more concepts than Render (regions, volumes, the CLI). Scale-to-
  zero adds a cold start.
- **Best when:** you want **container portability and finer control/scale** without
  running a whole VM yourself.

### P3 — Cloudflare: Pages + Access (best for static + the login gate) — **free**

- **What it is:** **Pages** is top-tier **static** hosting (free, fast, custom
  domain). **Access** is the **login gate** from §1a (free ≤ 50 users, email
  one-time-PIN). Together they directly deliver your requirement: *public URL,
  per-user login.* With **Cloudflare Tunnel**, Access can also sit in front of a Node
  app you host elsewhere (Render, a campus VM, even a machine in the studio).
- **Hosts:** Class A ✅ (natively) · Class B ✅ **only as the login gate / front door**
  — Cloudflare doesn't run a long-lived Node server for you here, so the app itself
  still lives on P1/P2 or a UIUC VM, with Cloudflare in front.
- **Cost:** **Free** for this workshop's scale.
- **Effort:** Low (static + gate); the Tunnel adds a small step.
- **Login fit:** **this _is_ the login fit** — use it in front of every option above.
- **Steps:** push the static files → connect the repo to **Pages** → in **Zero Trust
  → Access**, add an application for your domain and a policy listing allowed emails →
  (optional) run **Tunnel** on your VM/host to bring the Node apps behind the same
  gate.
- **Watch out for:** it's a CDN/security layer, **not** a Node runtime — pair it with
  P1/P2/U2 for the full apps.
- **Best when:** you want the **static demos free and instantly gated**, and a single,
  clean **login layer** in front of everything else.

---

## 4. Side-by-side

| Option | Static (A) | Full app (B) | Cost | Effort | Built-in login? | Best for |
|---|:--:|:--:|---|---|---|---|
| **U1** web.illinois.edu (cPanel/Webhost) | ✅ | ⚠️ verify | Free | Low–Med | No → add CF Access / NetID | Free + on campus, static today |
| **U2** TS Virtual Server (Linux VM) | ✅ | ✅ | ~$6–10/mo | Med–High | No → add CF Access / NetID | Full apps on campus, cheap, full control |
| **U3** Illinois Computes / Radiant / AWS | ✅ | ✅ | Free→Var | Med–High | No → add CF Access / Cognito | Research-tied, grant-billable, scale |
| **P1** Render | ✅ | ✅ | Free–$7/mo | **Low** | No → add CF Access | **Fastest path to live full apps** |
| **P2** Fly.io | ✅ | ✅ | ~$3–5/mo | Med | No → add CF Access | Container control & scale |
| **P3** Cloudflare Pages + Access | ✅ | front-door | **Free** | Low | **Yes (≤50 users)** | Static + the login gate |

---

## 5. The recipe I'd actually follow

A concrete, low-cost combo that satisfies *both static + full apps* and *public-with-
logins*, and that you can stand up yourself:

1. **Static demos → Cloudflare Pages (free).** Publish `precedent-librarian/lite` and
   `site-analyzer/standalone`.
2. **Full apps → Render** (free tier to start, flip to ~$7/mo each when you want them
   always-on). Two Web Services, root dirs `TOOLS/site-analyzer/web` and
   `TOOLS/precedent-librarian/web`, each with its own `ANTHROPIC_API_KEY`.
3. **One login gate → Cloudflare Access** in front of all of it: add each attendee's
   email; they log in with a one-time PIN. Free up to 50 users — that's the "every
   user gets their own key" experience with nothing to manage.
4. **Protect the bill →** separate Anthropic keys per app + a **monthly spend limit**
   and **usage alerts** in the Anthropic Console.

**All-campus variant:** swap step 2 for a **U2 Technology Services VM** (run both apps
with **pm2** behind **Caddy**), keep Cloudflare Access as the gate. Slightly more
setup, lives entirely on UIUC infrastructure, ~$6–10/month.

**Free-research variant:** if this is framed as research, pursue an **Illinois
Computes** allocation (U3) for the server, again behind Cloudflare Access.

---

## 6. Appendix

### 6a. A minimal per-user login you can add to the Node apps

If you'd rather gate inside the app than use Cloudflare Access, add this near the top
of each `server.js` request handler. Each user gets one of the keys you list in the
`ACCESS_KEYS` env var (comma-separated); they enter it once and a cookie remembers it.

```js
// --- simple shared-secret gate (set ACCESS_KEYS="alice-7f3,bob-9q2,carol-k4m") ---
const KEYS = new Set((process.env.ACCESS_KEYS || "").split(",").map(s => s.trim()).filter(Boolean));
function authed(req) {
  if (KEYS.size === 0) return true;                       // no keys set → open
  const cookie = (req.headers.cookie || "").match(/access=([^;]+)/);
  if (cookie && KEYS.has(decodeURIComponent(cookie[1]))) return true;
  const url = new URL(req.url, "http://x");
  return KEYS.has(url.searchParams.get("key") || "");      // ?key=… on first visit
}
// then, as the first lines inside createServer((req,res)=>{ ... }):
//   if (!authed(req)) { res.writeHead(401, {"Content-Type":"text/plain"}); return res.end("Enter ?key=YOUR-KEY"); }
//   // (optionally Set-Cookie: access=<key> so they don't re-enter it)
```

This is intentionally tiny. **Cloudflare Access (§1a) is more robust** (real per-email
login, no shared strings to leak) — prefer it unless you specifically want the gate to
live in the code.

### 6b. Dockerfile (for Fly.io, a campus VM, or any container host)

Drop this in each app folder (`TOOLS/site-analyzer/web/`, `TOOLS/precedent-librarian/web/`):

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
```

Then provide `ANTHROPIC_API_KEY` as a secret at deploy time (e.g. `fly secrets set …`).

### 6c. Why not "serverless" (Lambda / Cloudflare Workers / Vercel functions)?

The apps keep an **in-memory cache**, **stream** longer AI responses, and load a
**WebAssembly** module (`rhino3dm`). Those fit a **persistent** server (Render, Fly, a
VM) much better than short-lived serverless functions, which would need a rewrite and
could hit execution-time limits. Static demos, by contrast, are perfect for any
static/edge host.

---

## Sources

UIUC / campus:
- [cPanel Web Hosting — web.illinois.edu](https://web.illinois.edu/)
- [Campus web hosting comparison (KB)](https://answers.uillinois.edu/illinois/web-hosting)
- [Free campus web hosting at web.illinois.edu (KB)](https://answers.uillinois.edu/illinois/82587)
- [Technology Services — Virtual Server Hosting](https://help.uillinois.edu/TDClient/42/UIUC/Requests/Service/185/Virtual-Server-Hosting)
- [NCSA Radiant](https://www.ncsa.illinois.edu/resources-and-services/compute-resources/radiant/) · [Radiant rates](https://docs.ncsa.illinois.edu/systems/radiant/en/latest/user-guide/rates.html)
- [Illinois Computes — What's available](https://computes.illinois.edu/whats_available/) · [Submit a request](https://computes.illinois.edu/submitrequest/)
- [Technology Services — Cloud Services](https://cloud.illinois.edu/) · [AWS free resources for students/instructors (KB)](https://answers.uillinois.edu/illinois/119420)

Private services:
- [Render](https://render.com/) · [Railway](https://railway.com/) · [Fly.io](https://fly.io/)
- [Cloudflare Pages](https://pages.cloudflare.com/) · [Cloudflare Zero Trust pricing (free ≤50 users)](https://www.cloudflare.com/plans/zero-trust-services/) · [Access one-time-PIN login](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
- [Anthropic Console (keys, spend limits)](https://console.anthropic.com/)
