# Deploy Guide & Walkthrough — from zero to a live, domain-backed Toolkit

A complete, teach-you-as-we-go walkthrough for putting the **Toolkit** app online with
a **fresh domain**, **Supabase**, and **Vercel**. Written for someone doing this for the
first time — every step says *what* to do and *why*.

- **Time:** ~2–3 focused hours the first time (most of it waiting on DNS + reading).
- **Cost:** a domain (~$10–13/year) + $0 to start (free tiers) + Anthropic usage (pennies
  per Librarian run). Upgrades are optional and called out at the end.
- **You'll touch five services:** GitHub (have it), Supabase, a domain registrar, Vercel,
  Anthropic. We'll set them up in the order that avoids backtracking.

> **Golden rule:** whenever a dashboard shows you an exact value (a DNS record, a key, a
> redirect URL), use *that* value — not one copied from a guide. The guide tells you
> *which field*; the dashboard tells you *what to paste*.

---

## Part 0 — The mental model (read this first)

You're assembling four boxes. Understanding the boxes makes every later step obvious.

```
        ┌─────────────────────────────────────────────────────────┐
        │  YOUR DOMAIN  (e.g. toolkit.coolname.com)                 │
        │  Bought at a registrar. Its DNS records point the name →  │
        │  to Vercel's servers.                                      │
        └───────────────┬───────────────────────────────────────────┘
                        │  (DNS: a signpost, not a server)
                        ▼
        ┌─────────────────────────────────────────────────────────┐
        │  VERCEL  — hosts & runs the Next.js Toolkit app           │
        │  • serves the pages                                        │
        │  • runs server code (the /api/librarian route) with your   │
        │    secret keys, and gives it HTTPS automatically          │
        └───────┬─────────────────────────────────┬─────────────────┘
                │                                   │
                ▼                                   ▼
   ┌────────────────────────┐         ┌──────────────────────────────┐
   │ SUPABASE               │         │ ANTHROPIC                     │
   │ • Postgres database    │         │ • the LLM the Librarian calls │
   │ • user logins (Auth)   │         │   (server-side only)          │
   │ • file storage (pinups)│         └──────────────────────────────┘
   └────────────────────────┘
                ▲
                │
        ┌───────┴────────┐
        │ GITHUB         │  ← your code. Vercel watches it; every push redeploys.
        └────────────────┘
```

**Two flows to keep straight:**

1. **A visitor loads your site.** Their browser asks DNS "where is `toolkit.coolname.com`?"
   → DNS answers "Vercel" → Vercel serves the app → the app talks to Supabase (data,
   login) and, when a tool runs, to Anthropic. All over HTTPS, which Vercel sets up for you.

2. **You ship a change.** You `git push` → Vercel notices → it builds the app → if the
   build passes, it goes live at your domain. No FTP, no servers to log into.

Why these four and not something simpler? A plain static host can't keep your Anthropic
key secret or run logins/uploads. Vercel runs the Next.js server code; Supabase is the
database + auth + storage that code needs. That's the whole reason for the architecture in
`WEBSITE-PLAN.md`.

---

## Part 1 — Accounts & a shopping list

Create these as you reach each part (don't pre-create them all blindly). Free unless noted.

| Service | What it's for | Cost |
|---|---|---|
| **GitHub** | Stores the code; Vercel deploys from it | Free (you have it) |
| **Supabase** | Database + logins + file storage | Free tier; Pro $25/mo later |
| **Anthropic** | The model the Librarian calls | Pay-per-use (set a cap) |
| **Domain registrar** | Buy + manage your domain name | ~$10–13/year |
| **Vercel** | Hosts & runs the app | Free Hobby; Pro $20/mo later |
| **(later) Email/SMTP** | So login emails actually send | Free tier (e.g. Resend) |

> Sign up for Supabase, Vercel, and Anthropic **with your GitHub account** where offered —
> fewer passwords, and Vercel↔GitHub integration "just works."

---

## Part 2 — (Recommended) run it locally once

Deploying something you've never seen run is how small mistakes hide until they're live.
Five minutes locally saves an hour of remote debugging. Full steps are in
[`README.md`](README.md); the short version:

```bash
cd platform
npm install
cp apps/toolkit/.env.example apps/toolkit/.env.local   # fill in after Part 3
npm run dev:toolkit            # → http://localhost:3000
```

You can't finish this until Supabase exists (Part 3 gives you the keys), so: **do Part 3,
come back, run it locally, *then* deploy.** Local working = deploy will work.

---

## Part 3 — Supabase (database, logins, storage)

### 3.1 Create the project
1. [supabase.com](https://supabase.com) → **New project**.
2. Name it (e.g. `studio-toolkit`). Set a **database password** — save it in a password
   manager; you rarely need it but can't easily recover it.
3. **Region:** pick the one closest to your users (e.g. *East US*). This is where the data
   physically lives — relevant if UIUC asks about data residency.
4. Wait ~2 minutes for it to provision.

### 3.2 Get your keys
**Project Settings → API.** You need two values:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> The **anon key is safe to expose** in the browser — that's its job. RLS (below) is what
> actually protects data. The **service_role** key on that page is the opposite — a master
> key. **Never** put it in `NEXT_PUBLIC_*` or client code. (Our app doesn't need it yet.)

### 3.3 Create the database (run the migration)
1. Left sidebar → **SQL Editor** → **New query**.
2. Open [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), copy its
   entire contents, paste, and click **Run**.
3. You should see "Success." This created the `profiles`, `pinups`, and `tool_runs`
   tables, turned on **Row-Level Security** (RLS) for each, added the new-user trigger,
   and made the private `pinups` storage bucket.

> **What RLS means in plain terms:** Postgres refuses every read/write unless a policy
> explicitly allows it. Our policies say "any signed-in user can *see* the pinup wall, but
> can only *change their own* pins," and "each user only sees their own tool-run history."
> So even though the anon key is public, nobody can read or wreck anyone else's data.

### 3.4 Configure Auth (this is what makes login work)
**Authentication → URL Configuration:**
- **Site URL:** `http://localhost:3000` for now (we'll switch to your domain in Part 7).
- **Redirect URLs — add these:**
  - `http://localhost:3000/auth/callback`
  - `https://*.vercel.app/auth/callback`  ← lets the first Vercel deploy work before DNS
  - (Part 7 adds your real domain here.)

These are an **allow-list**: the magic-link can only bounce users back to URLs you've
listed. Forget this and login silently fails.

### 3.5 Email: the gotcha that blocks real users
Supabase's **built-in email sends only 2 messages/hour, and only to your own team**. Great
for testing with *your* email; useless for a class. **Before inviting anyone else, set up
custom SMTP:**

1. Make a free [Resend](https://resend.com) account (or SendGrid/Postmark/Mailgun/AWS SES).
2. **Authentication → Emails → SMTP Settings** in Supabase → enter the SMTP host, port,
   user, and password your email provider gives you. Set the "from" address.
3. At your **registrar/DNS** (Part 6), add the **SPF, DKIM, DMARC** records the email
   provider asks for — these prove you're allowed to send, so messages land in inboxes
   instead of spam.

> **Enterprise email scanners** (some `@illinois.edu` setups) pre-click links in email to
> scan them. Because magic links are single-use, a scanner can "spend" the link before the
> user clicks → "link expired." If attendees hit this, switch that login to the **6-digit
> OTP code** option instead of a clickable link (a small code change later).

**Now go back to Part 2, fill `.env.local`, and confirm it runs locally.** Then continue.

---

## Part 4 — Register your domain

### 4.1 Choosing a name
- Keep it short, memorable, easy to spell aloud. Avoid hyphens/numbers.
- `.com` is safest; `.studio`, `.design`, `.xyz`, `.dev` are fine and often cheaper/available.
- **Two-property plan:** you'll eventually want the **portfolio** at the bare domain
  (`coolname.com`) and the **Toolkit** on a **subdomain** (`toolkit.coolname.com` or
  `app.coolname.com`). So: **register one domain now**, and we'll put the Toolkit on a
  subdomain — the apex stays free for the portfolio later. (You *can* put the Toolkit at the
  apex now and move it later; Part 6 covers both.)

### 4.2 Where to buy (pick one)
- **Porkbun** — *easiest recommendation.* Transparent low prices, free WHOIS privacy, you
  can either delegate DNS to Vercel or add records yourself. Great default.
- **Cloudflare Registrar** — *cheapest (at-cost, ~$10.44/yr for .com) + best DNS.* Catch:
  you **must** use Cloudflare's nameservers, so you'll add Vercel's records *in Cloudflare*
  (Part 6). Choose this if you also want Cloudflare's free login-gate (Access) or email
  routing later.
- **Namecheap** — fine, beginner-friendly, similar to Porkbun.

Search your name, add to cart, **turn on free WHOIS privacy** (hides your home address from
public records), pay. You now own it for a year (turn on auto-renew so you don't lose it).

> **DNS in one sentence:** DNS is the phone book that turns your name into "go to Vercel."
> You'll edit it either at the registrar or, if you delegate, inside Vercel. That's all of
> Part 6.

---

## Part 5 — Deploy to Vercel

### 5.1 Import the repo
1. [vercel.com](https://vercel.com) → sign up with **GitHub** → **Add New… → Project**.
2. Find `26-Summer-AI-Workshop` and **Import**. (Authorize Vercel to read the repo if asked.)

### 5.2 The one setting people get wrong: Root Directory
This repo is a **monorepo** — the app isn't at the top, it's at `platform/apps/toolkit`.
- Find **Root Directory** → **Edit** → choose **`platform/apps/toolkit`**.
- Vercel auto-detects **Next.js** and fills Build/Output settings. It also detects the npm
  **workspace** and installs from `platform/`'s lockfile — leave the install/build commands
  on their defaults.

> If a build ever fails with "no package.json found" or "next not found," the Root Directory
> is wrong — it must be `platform/apps/toolkit`.

### 5.3 Environment variables
Before the first deploy, expand **Environment Variables** and add these four (from Part 3
and Anthropic). Add them for **Production** *and* **Preview** so test deploys work too:

| Name | Value | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | public |
| `ANTHROPIC_API_KEY` | from [console.anthropic.com](https://console.anthropic.com) → **API Keys** | **secret** |
| `NEXT_PUBLIC_SITE_URL` | `https://` + your **Vercel URL** for now (e.g. `https://studio-toolkit.vercel.app`) — you'll change it to your domain in Part 7 | public |

> **Get the Anthropic key now:** Anthropic Console → **API Keys → Create Key**. Then →
> **Limits / Billing → set a monthly spend cap + usage alert.** The login gate plus this cap
> are your two seatbelts against a surprise bill.

### 5.4 Deploy
Click **Deploy**. Watch the build log (~1–2 min). On success you get a live URL like
`https://studio-toolkit.vercel.app`. Open it → you should see the **login** screen. 🎉

> It won't fully log you in yet because `NEXT_PUBLIC_SITE_URL` and Supabase redirect URLs
> still need to agree — that's Part 7. First, the domain.

---

## Part 6 — Point your domain at Vercel

### 6.1 Add the domain in Vercel
Project → **Settings → Domains** → type the name you want it served at:
- **Recommended:** `toolkit.coolname.com` (a subdomain — keeps the apex for the portfolio).
- Or the apex `coolname.com` (Vercel will offer to also set up `www` + a redirect).

Vercel then shows you the **exact DNS record(s) to create.** Two scenarios:

### 6.2a If you delegate DNS to Vercel (simplest — Porkbun/Namecheap)
Vercel shows two **nameservers** (e.g. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
- At your registrar, find **Nameservers**, switch from "registrar default" to **Custom**,
  and paste Vercel's two. Save.
- Now Vercel manages *all* DNS for the domain; subdomains "just work." Done — skip to 6.3.

> Trade-off: if you also need DNS records for email (SPF/DKIM from Part 3.5) or other tools,
> you'll add those inside Vercel's DNS instead of the registrar. Fine, just know where they live.

### 6.2b If you keep DNS at the registrar / Cloudflare (more control)
Add the record Vercel shows you, at your DNS host:
- **Subdomain** (`toolkit.`): a **CNAME** record — Name `toolkit`, Value `cname.vercel-dns.com`
  (use the exact value Vercel displays).
- **Apex** (`coolname.com`): an **A** record — Name `@`, Value = **the IP Vercel shows in
  your project's Domain Settings.** Don't copy an IP from a blog — Vercel picks one tailored
  to your project. Add the `www` CNAME too if Vercel asks.

> **Cloudflare users:** set these records to **"DNS only" (grey cloud)**, not proxied
> (orange). Let Vercel handle the SSL certificate; double-proxying causes redirect/cert
> errors. You can revisit proxying later if you know you want it.

### 6.3 Wait for DNS + SSL
Vercel shows "Valid Configuration" once DNS propagates — usually minutes, up to a few hours
(nameserver changes are slower). Vercel then **auto-issues a free HTTPS certificate**. When
the domain shows a padlock and loads the login page, DNS is done.

---

## Part 7 — Final wiring (the step everyone forgets)

Right now three things must agree on your real domain, or magic-link login breaks:

1. **Vercel env:** Settings → Environment Variables → edit **`NEXT_PUBLIC_SITE_URL`** to
   your real URL, e.g. `https://toolkit.coolname.com`.
2. **Supabase Auth → URL Configuration:**
   - **Site URL** → `https://toolkit.coolname.com`
   - **Redirect URLs** → add `https://toolkit.coolname.com/auth/callback`
3. **Redeploy** so the new `NEXT_PUBLIC_SITE_URL` is baked in: Vercel → **Deployments** →
   latest → **⋯ → Redeploy** (or just `git push` anything).

Why: the app builds the magic-link's "return here" address from `NEXT_PUBLIC_SITE_URL`, and
Supabase only allows return addresses on its list. Make all three say the same domain and
login works.

---

## Part 8 — Smoke test (prove it end-to-end)

Walk the whole path once, on the real domain:
1. Visit `https://toolkit.coolname.com` → see the **login** screen (padlock present).
2. Enter your email → "check your inbox" → the email arrives (thanks to SMTP from 3.5).
3. Click the link → you land in the **dashboard**. ✅ auth + DNS + redirect all correct.
4. Open **Librarian**, run a small query (count 2, grounded off) → a dossier renders. ✅
   Anthropic key + server route work. (If it spins then errors at ~60s, see Troubleshooting.)
5. Open **Pinup Wall**, upload an image with a title → it appears in the grid. ✅ database +
   storage + RLS work.

If all five pass, you're live. Invite a colleague's email in Supabase and have them try.

---

## Part 9 — Environment variable reference

| Variable | Where it's set | Where it's used | Public? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | browser + server Supabase clients | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | browser + server Supabase clients | yes (safe by design) |
| `ANTHROPIC_API_KEY` | Vercel + `.env.local` | `/api/librarian` (server only) | **NO — secret** |
| `NEXT_PUBLIC_SITE_URL` | Vercel + `.env.local` | builds the magic-link redirect | yes |

`.env.local` is for your machine and is **gitignored** — never commit real keys. Vercel
holds the production copies. Changing a var in Vercel requires a **redeploy** to take effect.

---

## Part 10 — Your ongoing workflow

- **Ship a change:** `git push` to your branch → Vercel builds a **Preview** deploy with its
  own URL (safe to test). Merge to the main branch → it deploys to **Production** (your domain).
- **Roll back:** Vercel → Deployments → pick a previous good one → **Promote to Production**.
  Instant undo.
- **New database change:** add a `supabase/migrations/0002_*.sql` file and run it in the
  Supabase SQL editor (or `supabase db push`). Migrations are ordered and re-runnable.
- **Add/changed env var:** set it in Vercel → redeploy.
- **Add a user:** Supabase → Authentication → Users → invite their email.

---

## Part 11 — Costs & when to upgrade

| | Free tier is fine until… | Then |
|---|---|---|
| **Domain** | — | ~$10–13/yr, always |
| **Vercel Hobby** | it's non-commercial & low traffic | **Pro $20/mo** — needed for commercial use, longer function timeouts (grounded Librarian), more bandwidth |
| **Supabase Free** | a class-sized project, used regularly | **Pro $25/mo** — removes the **7-day-idle pause**, more DB/storage. (A rarely-used free project pauses; just visit the dashboard to wake it.) |
| **Anthropic** | always pay-per-use | set a monthly cap; a Librarian run is typically a few cents |
| **Email (Resend etc.)** | free tier covers a workshop | paid only at high volume |

Starting cost is basically **the domain + Anthropic pennies.** Upgrade only when a limit
actually bites.

---

## Part 12 — Security checklist

- [ ] `ANTHROPIC_API_KEY` and Supabase **service_role** are **never** in `NEXT_PUBLIC_*` or
      client code. (Our app keeps the Anthropic key in the server route only.)
- [ ] Anthropic **monthly spend cap + alert** set.
- [ ] Supabase **RLS on** for every table (the migration does this — don't disable it).
- [ ] Login is **invite-only** (you add emails) so the public can't spend your AI budget.
- [ ] Custom **SMTP + SPF/DKIM/DMARC** configured (so emails send *and* land in inboxes).
- [ ] Domain **auto-renew** on; **WHOIS privacy** on.

---

## Part 13 — Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| Magic link goes to `localhost` | `NEXT_PUBLIC_SITE_URL` still localhost, or you didn't redeploy → set it to your domain (Part 7) and redeploy |
| "redirect_uri … not allowed" after clicking link | URL missing from Supabase **Redirect URLs** → add `https://yourdomain/auth/callback` |
| Login email never arrives | Built-in 2/hr-to-team limit → set up **custom SMTP** (3.5); also check spam + SPF/DKIM |
| "Couldn't load the wall…" on Pinup | Migration not run → run `0001_init.sql` in the SQL editor (3.3) |
| Librarian returns 503 | `ANTHROPIC_API_KEY` not set in Vercel → add it + redeploy |
| Librarian spins then fails ~60s | Hobby function timeout. Use fewer precedents / grounded off, or go **Vercel Pro** and raise `maxDuration` in `src/app/api/librarian/route.ts` |
| Build fails: "no package.json / next not found" | Root Directory wrong → set **`platform/apps/toolkit`** (5.2) |
| Domain stuck "Invalid Configuration" | DNS not propagated yet, or wrong record → re-check against the exact values in Vercel; allow time; (Cloudflare) set records to **DNS-only** |
| Site loads but no HTTPS padlock | Cert still issuing (wait), or a proxied/incorrect DNS record blocking validation |

---

## What's next (after it's live)

- **The portfolio (second domain/apex):** add a second Vercel project, Root Directory
  `platform/apps/portfolio`, point `coolname.com` (+ `www`) at it; the Toolkit stays on its
  subdomain. Same flow, no database needed.
- **A stronger gate:** layer **Cloudflare Access** in front for org-wide, no-code per-email
  login (see `HOSTING.md` §1a) in addition to Supabase Auth.
- **Port more tools:** Site Analysis, Design Critic, etc., per `WEBSITE-PLAN.md`.

---

## Sources

- Vercel: [Working with domains](https://vercel.com/docs/domains/working-with-domains) · [A records & apex](https://vercel.com/kb/guide/a-record-and-caa-with-vercel) · [Managing DNS](https://vercel.com/docs/domains/managing-dns-records)
- Supabase: [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) · [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) · [Going to prod checklist](https://supabase.com/docs/guides/deployment/going-into-prod) · [Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- Registrars: [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) · [Porkbun](https://porkbun.com/) · [Namecheap](https://www.namecheap.com/)
- [Anthropic Console](https://console.anthropic.com/) · [Resend (SMTP)](https://resend.com/)
