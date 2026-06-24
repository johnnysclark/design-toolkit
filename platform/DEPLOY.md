<!--
  This is the beginner deploy guide, written to be read top-to-bottom.
  It is formatted for mobile: short sections, few tables, vertical lists.
-->

# Get Your Toolkit Live — A Complete Beginner's Guide

This guide takes you from **nothing** to **a working website at your own address**, and it
assumes you have **never** done any of this before. Every new word is explained the first
time it appears, and there's a plain‑English **glossary at the very end**.

**You can do the whole main path in a web browser** — no coding, no "terminal," no prior
skills. Two optional sections at the end go deeper (running it on your own computer, and
letting Claude Code manage everything), but you don't need them to go live.

### How to read this
- Go **top to bottom**. You can stop after any Part and continue later.
- Budget **~2–3 hours** the first time — most of it is reading and waiting, not typing.
- On a phone, use the Part headings to jump around.

### The little symbols I use
- 💡 **Plain English** — what a word or idea actually means.
- 👉 **Do this** — an action to take right now.
- ⚠️ **Heads‑up** — a common mistake, avoided.
- ✅ **Check** — how to know the step worked.

### The 8 Parts (the main path)
1. The big picture — what we're building
2. The accounts you'll create
3. Supabase — your database + logins
4. Your domain — buying your web address
5. Vercel — putting the site online
6. Connecting your domain to the site
7. The final wiring (so login works)
8. Test everything end to end

Then: **money**, **safety**, **troubleshooting**, two **optional** deeper sections, and the
**glossary**.

---

## Part 1 — The big picture

You already have the **app** (the Toolkit's code — we built it together). "Going live" means
putting that code onto computers that are always on, and pointing a web address at them.

Five players make that happen. Here's each one in plain English:

- 💡 **GitHub** — a website that stores your code online. Think "Google Drive, but for code."
  Your code already lives there.
- 💡 **Vercel** — a company that takes your code from GitHub, runs it on their always‑on
  computers, and serves it to visitors. This is your **host**.
- 💡 **Supabase** — your **database** (where information is saved), your **login system**, and
  your **file storage** (for uploaded images). One service, three jobs.
- 💡 **Anthropic** — the company that makes **Claude**, the AI your Librarian tool talks to.
- 💡 **A domain** — your website's **address**, like `coolname.com`. You rent it from a
  **registrar** (a company that sells web addresses).

### How they fit together

```
   Your web address  ──▶  Vercel (runs the app)  ──▶  Supabase (data, logins, files)
   (the domain)                    │
                                   └────────────▶  Anthropic (the AI, for the Librarian)

   GitHub holds the code. Vercel watches it and re-publishes whenever the code changes.
```

### Two things that happen, explained

**When a visitor opens your site:** their phone looks up your address, gets pointed to
Vercel, Vercel shows them the site, and the site quietly talks to Supabase (to log them in,
load the pinup wall) and to Anthropic (when they run the Librarian). All of this is
encrypted — that's the little padlock 🔒 in the browser, and Vercel sets it up for you.

**When you change something:** you (or Claude Code) save the change to GitHub, Vercel notices,
rebuilds the site, and — if nothing's broken — the new version goes live automatically. No
uploading files by hand.

> 💡 **Why so many pieces?** A "simple" host can only show fixed pages. Your Toolkit needs to
> keep secrets (the AI key), log people in, and save uploads — that needs a real host
> (Vercel) plus a database (Supabase). This is the normal, modern way to build this kind of
> site.

---

## Part 2 — The accounts you'll create

You'll make an account at each service as you reach it (don't rush to make them all now).
Everything starts **free**; the only thing you pay for today is the **domain** (about
**$10–13 for the year**), so have a card ready for Part 4.

What you'll sign up for, and why:

- **GitHub** — you already have it (your code is there).
- **Supabase** — database + logins + file storage. Free to start.
- **A domain registrar** — to buy your address. ~$10–13/year.
- **Vercel** — to host the site. Free to start.
- **Anthropic** — for the Librarian's AI. You pay only for what you use (usually pennies per
  run); we'll set a hard monthly cap.
- **An email‑sending service (Resend)** — so login emails actually arrive. Free to start.
  (Explained in Part 3.)

> 👉 **Tip:** when a service offers "Sign up with GitHub," use it. Fewer passwords, and
> Vercel connecting to GitHub later becomes one click.

---

## Part 3 — Supabase (your database + logins)

💡 **What Supabase is:** one online service that gives your app three things — a **database**
(organized storage for information), an **authentication** system (logging users in), and
**file storage** (for images people upload). You set it up entirely in your browser.

💡 **What a database is:** think of a set of smart spreadsheets called **tables**. One table
holds users, another holds "pinups" (uploaded images + notes), another holds a log of every
AI run. Each line in a table is a **row**.

### 3.1 — Create your Supabase project

👉 Do this:
1. Go to **supabase.com** and click **Start your project** / **Sign in** (use GitHub).
2. Click **New project**.
3. **Name:** type something like `studio-toolkit`.
4. **Database Password:** click **Generate a password**, then **copy it and save it** in a
   notes app or password manager.
   - 💡 This is the master password to the raw database. You'll rarely need it, but it's hard
     to recover, so don't lose it.
5. **Region:** choose the location closest to your users (e.g. **East US**).
   - 💡 This is where your data physically lives. It matters if your university ever asks
     "where is student data stored?" — you'll be able to answer.
6. Click **Create new project** and wait ~2 minutes while it sets up.

✅ Check: you land on the project's dashboard (a left sidebar with Table Editor, SQL Editor,
Authentication, Storage, etc.).

### 3.2 — Copy your two keys

💡 **What a "key" is:** a long string of characters that acts like a password your app uses to
talk to Supabase.

👉 Do this:
1. In the left sidebar, click the **gear icon (Project Settings)** → **API**.
2. Find and copy these two values into your notes (you'll paste them into Vercel later):
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a very long string.

> 💡 **Is it safe that the "anon" key is public?** Yes — it's *designed* to be visible in the
> browser. What actually protects your data is a rule system called **RLS** (next), not the
> key. On the same page you'll also see a **service_role** key — that one is a master key.
> **Never** put the service_role key into the website or share it. Our app doesn't use it.

### 3.3 — Build the database (run the "migration")

💡 **What a migration is:** a small text file of database instructions. Running it creates your
tables and security rules all at once. We already wrote yours — you just run it.

💡 **What SQL is:** the language databases speak. You don't need to learn it; you'll copy and
paste.

👉 Do this:
1. In the left sidebar, click **SQL Editor**, then **New query**.
2. In your code (on GitHub, in this repo), open the file
   `platform/supabase/migrations/0001_init.sql` and **copy its entire contents**.
3. Paste it into the big text box in the SQL Editor.
4. Click **Run** (bottom right).

✅ Check: you see a green **"Success. No rows returned."** message.

What that just did, in plain English:
- Created the **profiles** table (one entry per user).
- Created the **pinups** table (uploaded images + their notes/tags).
- Created the **tool_runs** table (a saved record of every AI run — "the trace").
- Turned on **RLS** on all of them.
- Created a private **storage area** ("bucket") for pinup images.

> 💡 **What RLS (Row‑Level Security) means:** the database refuses every read or write unless a
> rule specifically allows it. Your rules say: *any logged‑in person can view the shared pinup
> wall, but can only change their own pins,* and *each person only sees their own AI history.*
> So even though the "anon" key is public, nobody can snoop on or wreck anyone else's data.

### 3.4 — Turn on login (and tell it where to send people)

💡 **How login will work:** a visitor types their email, gets a **magic link** (a one‑time
sign‑in link) by email, clicks it, and they're in — no password to remember.

💡 **Why the next setting matters:** after someone clicks the link, Supabase needs to send them
*back to your site*. For safety, it will only send them back to web addresses you've
pre‑approved. This list is called **Redirect URLs**.

👉 Do this:
1. Sidebar → **Authentication** → **URL Configuration**.
2. **Site URL:** for now, set it to `http://localhost:3000`. (We change this to your real
   address in Part 7.)
3. **Redirect URLs** → **Add URL**, and add these three (one at a time):
   - `http://localhost:3000/auth/callback`
   - `https://*.vercel.app/auth/callback`  ← lets your first Vercel test work before the
     domain is ready (the `*` is a wildcard meaning "any Vercel preview address").
   - (You'll add your real domain here in Part 7.)
4. Save.

⚠️ Heads‑up: if you skip this, clicking the magic link will fail with a "redirect not allowed"
error later. It's the #1 first‑timer snag.

### 3.5 — Make login emails actually arrive (important!)

⚠️ This is the step people miss, and then "nobody can log in." Read it.

💡 **The problem:** Supabase's built‑in email is only for testing — it sends **2 emails per
hour**, and **only to you** (the project owner). Real users won't receive anything.

💡 **The fix — "custom SMTP":** SMTP is just the standard way computers send email. You connect
Supabase to a proper email‑sending service so your login emails go out reliably and land in
inboxes (not spam).

👉 Do this:
1. Make a free account at **resend.com** (a beginner‑friendly email‑sending service;
   alternatives: SendGrid, Postmark, Mailgun).
2. In Resend, create an **API key** / get **SMTP credentials** (a host, port, username,
   password). Resend will walk you through it.
3. In Supabase: **Authentication** → **Emails** → **SMTP Settings** → turn it on and paste
   those SMTP details. Set the "from" address (e.g. `studio@yourdomain`).
4. Resend (and the others) will ask you to add a few **DNS records** to prove you own the
   "from" address. You'll add those when you set up DNS in Part 6 — they're what stop your
   emails from going to spam.

> 💡 **Just testing with your own email first?** The built‑in 2/hour limit is fine for that —
> you can skip SMTP until you're ready to invite other people. But do it before the workshop.

> ⚠️ **A subtle university gotcha:** some `@illinois.edu`‑style mail systems automatically
> "click" links in emails to scan them for safety. Because magic links are single‑use, the
> scanner can use up the link before the person does, giving a "link expired" error. If that
> happens to attendees, the fix is a small change to use a **6‑digit code** instead of a
> clickable link. Tell me and I'll switch it.

**Now you have everything Supabase gives you.** Keep your Project URL and anon key handy.

---

## Part 4 — Your domain (your web address)

💡 **Domain:** your site's address, like `coolname.com`.
💡 **Registrar:** a company that rents you a domain (you renew yearly).
💡 **DNS:** the internet's address book. It translates your domain name into "this site lives
at Vercel." You'll set one or two DNS entries in Part 6; for now you just buy the name.

### 4.1 — Choose a name
- Short, easy to say out loud, easy to spell. Skip hyphens and numbers.
- `.com` is the safe default. `.studio`, `.design`, `.xyz`, `.dev` are fine too and often
  cheaper or more available.

### 4.2 — Plan for two sites (do this now, thank yourself later)
You'll eventually have **two** sites: the **Toolkit** (what we're launching) and a
**portfolio** (Research/Work/Teaching) later.

👉 Recommended plan: buy **one** domain now, and put the Toolkit on a **subdomain**.
- 💡 **Subdomain:** a prefix on your domain, like `toolkit.coolname.com` or `app.coolname.com`.
- That leaves the plain `coolname.com` (the **apex** or **root** domain) free for the
  portfolio later.

(You *can* put the Toolkit on the plain domain now and move it later — Part 6 shows both.)

### 4.3 — Buy it

💡 **Where to buy (pick one):**
- **Porkbun** — easiest all‑rounder. Clear low prices, free privacy. Great default.
- **Cloudflare Registrar** — cheapest (sold at cost, ~$10.44/yr for `.com`) and excellent DNS.
  Trade‑off: you must use Cloudflare to manage DNS (fine — just relevant in Part 6).
- **Namecheap** — also beginner‑friendly.

👉 Do this:
1. Go to the registrar, search your name, add it to the cart.
2. Turn on **free WHOIS privacy** (hides your home address from public domain records).
3. Pay, and turn on **auto‑renew** (so you don't accidentally lose the name next year).

✅ Check: the domain shows in your registrar's dashboard as one you own.

---

## Part 5 — Vercel (put the site online)

💡 **What Vercel is:** the host. It pulls your code from GitHub, **builds** it, and serves it.
💡 **What "build" means:** turning your source code into the optimized files a browser actually
runs. Vercel does this for you; you just watch it happen.

### 5.0 — One thing to know about branches first

💡 **Branch:** a version line of your code in GitHub. Your new platform code is currently on a
branch from a **Pull Request** (a proposed change), not yet on the **main** branch.

💡 **Vercel's rule:** it publishes your **main** branch to the public site, and makes private
"preview" versions for other branches.

👉 So either **merge the Pull Request into `main`** first (simplest), or in Vercel's settings
choose the branch to deploy. If unsure, merging to main is the normal choice. (Ask me and I'll
explain merging, or do it for you.)

### 5.1 — Connect Vercel to GitHub
👉 Do this:
1. Go to **vercel.com** → **Sign Up** → **Continue with GitHub** → authorize.
2. Click **Add New…** → **Project**.
3. Find `26-Summer-AI-Workshop` in the list and click **Import**. (Approve access to the repo
   if asked.)

### 5.2 — The one setting beginners get wrong: "Root Directory"

💡 **Why this exists:** our repo is a **monorepo** — it holds several things, and the Toolkit
app isn't at the top; it's in a subfolder. Vercel needs to be told which folder to build.

👉 Do this:
1. On the import screen, find **Root Directory** and click **Edit**.
2. Select the folder **`platform/apps/toolkit`**.
3. Vercel will auto‑detect it's a **Next.js** app (that's the framework the Toolkit is built
   with) and fill in the build settings. Leave those defaults.

⚠️ Heads‑up: if a build ever fails saying "no package.json found" or "next not found," this
setting is wrong. It must be exactly `platform/apps/toolkit`.

### 5.3 — Add your settings ("environment variables")

💡 **Environment variable (env var):** a setting you hand to the app from outside the code —
often a secret like a key. This is how the app gets your Supabase and Anthropic details
without writing them into the code (where they'd be exposed).

👉 First, get your AI key:
1. Go to **console.anthropic.com** → **API Keys** → **Create Key** → copy it.
2. Then go to **Billing / Limits** and **set a monthly spending limit** and a **usage alert**.
   - 💡 This is your safety net against a surprise bill. A single Librarian run is typically a
     few cents.

👉 Now, on the Vercel import screen, open **Environment Variables** and add these **four**
(name on the left, value on the right). Add each for both **Production** and **Preview**:

- **`NEXT_PUBLIC_SUPABASE_URL`** → your Supabase **Project URL** (from Part 3.2).
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** → your Supabase **anon** key (from Part 3.2).
- **`ANTHROPIC_API_KEY`** → the Anthropic key you just made. *(This is a secret.)*
- **`NEXT_PUBLIC_SITE_URL`** → for now, type `https://temp.vercel.app`. We'll fix this to your
  real address in Part 7. (It's used to build the magic‑link return address.)

> 💡 **Why some names start with `NEXT_PUBLIC_`:** that prefix tells the app "this value is OK
> to show in the browser." The Supabase URL and anon key are fine to be public. The Anthropic
> key has **no** such prefix because it must stay secret on the server.

### 5.4 — Deploy
👉 Click **Deploy** and watch the log scroll (about 1–2 minutes).

✅ Check: you get a success screen with a temporary address like
`https://studio-toolkit-xxxx.vercel.app`. Open it — you should see your **login page**. 🎉

> It won't fully log you in yet, because your site's real address and Supabase's approved list
> don't match up until Part 7. First, let's connect your domain.

---

## Part 6 — Connect your domain to the site

Right now your site has a temporary `.vercel.app` address. Let's point your real domain at it.

💡 **DNS records, in plain English:** small entries at your registrar that say where a name
points. The two you might use:
- 💡 **A record** — points a **plain/apex** domain (`coolname.com`) to a numeric address (an
  IP). Used for the root domain.
- 💡 **CNAME record** — points a **subdomain** (`toolkit.coolname.com`) to *another name*.
  Used for subdomains.
- 💡 **Nameservers** — the "who's in charge of this domain's DNS" setting. If you hand these to
  Vercel, Vercel manages all DNS for you automatically.

### 6.1 — Tell Vercel your domain
👉 Do this:
1. In Vercel, open your project → **Settings** → **Domains**.
2. Type the address you want the site served at:
   - Recommended: **`toolkit.coolname.com`** (a subdomain — keeps the plain domain for your
     portfolio later).
   - Or the plain **`coolname.com`** (Vercel will also offer to set up `www` and a redirect).
3. Vercel will now show you the **exact DNS record(s) to create.** Keep that screen open.

> ⚠️ Use the **exact values Vercel shows you** — they're tailored to your project. Don't copy
> an IP address from a blog (Vercel picks one specifically for you).

### 6.2 — Now go to your registrar and add what Vercel asked for

There are two ways. Pick **one**.

**Way A — Let Vercel run your DNS (simplest).** *(Works with Porkbun, Namecheap, etc.)*
1. Vercel shows two **nameservers** (like `ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
2. At your registrar, find **Nameservers**, switch from "default" to **Custom**, and paste
   Vercel's two. Save.
3. Done — Vercel now manages DNS, and subdomains just work.
   - 💡 Trade‑off: any other DNS records (like the email ones from Part 3.5) you'll add inside
     Vercel's DNS panel instead of the registrar. That's fine — just know where they live.

**Way B — Add records at your registrar (more control).** *(Required if you chose Cloudflare
Registrar.)*
1. At your DNS provider, add the record Vercel displays:
   - For a **subdomain** (`toolkit.`): add a **CNAME** — Host/Name `toolkit`, Value
     `cname.vercel-dns.com` (use the exact value Vercel shows).
   - For the **plain/apex** domain: add an **A** record — Host/Name `@`, Value = **the IP
     Vercel shows on that screen**. Add the `www` CNAME too if Vercel asks.
2. Save.
   - ⚠️ **Cloudflare users:** set these records to **"DNS only" (grey cloud icon)**, not
     "Proxied" (orange). Let Vercel handle the security certificate; the orange cloud causes
     errors here. You can revisit later.

### 6.3 — Wait for it to take effect
💡 **Propagation:** DNS changes take time to spread across the internet — usually minutes,
sometimes a few hours (nameserver changes are slower).

✅ Check: in Vercel's Domains screen, your domain flips to **"Valid Configuration."** Vercel
then automatically creates a free **HTTPS certificate** (the 🔒 padlock). When your domain
loads the login page with a padlock, DNS is done.

> 💡 **HTTPS / SSL certificate:** the thing that encrypts traffic and gives you the padlock and
> the `https://`. Vercel sets it up and renews it for free — you do nothing.

---

## Part 7 — The final wiring (so login works)

Three places must all name your **real** domain, or the magic link won't work. This takes two
minutes.

👉 Do this:
1. **Vercel** → your project → **Settings** → **Environment Variables** → edit
   **`NEXT_PUBLIC_SITE_URL`** to your real address, e.g. `https://toolkit.coolname.com`. Save.
2. **Supabase** → **Authentication** → **URL Configuration:**
   - Set **Site URL** to `https://toolkit.coolname.com`.
   - Under **Redirect URLs**, add `https://toolkit.coolname.com/auth/callback`.
3. **Re‑publish so the new setting takes effect:** Vercel → **Deployments** → click the
   latest one → the **⋯** menu → **Redeploy**.

> 💡 **Why this is necessary:** the app builds the magic link's "send them back here" address
> from `NEXT_PUBLIC_SITE_URL`, and Supabase only allows return addresses on its approved list.
> When all three agree on your real domain, login works.

---

## Part 8 — Test everything (prove it works)

Walk the whole path once, on your real domain:

1. Open `https://toolkit.coolname.com` → you see the **login** page with a 🔒 padlock. ✅
   address + hosting + certificate all work.
2. Type your email → "check your inbox" → the email arrives. ✅ email sending works.
3. Click the link → you land in the **dashboard**. ✅ login + the Part 7 wiring work.
4. Open **Librarian**, run a small query (2 precedents, "web‑grounded" off) → a result
   appears. ✅ the AI key and server work.
5. Open **Pinup Wall**, upload an image with a title → it shows up in the grid. ✅ database +
   file storage + security rules all work.

If all five pass, **you're live.** 🎉 Invite a colleague's email (Supabase → Authentication →
Users → Add user) and have them try it.

---

## Money — what's free, what costs, when to pay

- **Domain:** ~**$10–13/year**, always. The one thing you pay today.
- **Vercel:** **free** to start. You'd move to **Pro ($20/month)** if the site is "commercial,"
  needs longer AI time limits, or gets heavy traffic.
  - ⚠️ Vercel's free plan is meant for **non‑commercial** use and pauses a request after **60
    seconds** — long "web‑grounded" Librarian runs can hit that. Pro removes both limits.
- **Supabase:** **free** to start. Move to **Pro ($25/month)** to remove the "pauses after 7
  days of no use" limit and get more space.
  - 💡 On the free plan, if nobody uses the site for a week it goes to sleep; just open the
    Supabase dashboard to wake it.
- **Anthropic:** pay only for what you use — usually **pennies per run**. Your monthly cap
  (Part 5.3) keeps it safe.
- **Email (Resend):** free tier easily covers a workshop.

**Starting cost is basically just the domain.** Upgrade only when a limit actually gets in your
way.

---

## Keep it safe (a plain‑English checklist)

- ✅ Your **Anthropic key** and Supabase **service_role** key are only in Vercel's settings —
  never written into the website or shared.
- ✅ A **monthly spending cap + alert** is set on the Anthropic key.
- ✅ **RLS** is on for every table (the migration did this — don't turn it off).
- ✅ Login is **invite‑only** (you add people's emails), so strangers can't run up your AI bill.
- ✅ Email is set up with the **SPF/DKIM/DMARC** records your email service asked for (so mail
  isn't marked as spam).
- ✅ Domain **auto‑renew** and **privacy** are on.

---

## When something goes wrong (and the fix)

- **The magic link sends me to `localhost`.** → `NEXT_PUBLIC_SITE_URL` is still the temporary
  value, or you didn't re‑publish. Set it to your domain (Part 7) and **Redeploy**.
- **"redirect … not allowed" after clicking the link.** → That address isn't in Supabase's
  **Redirect URLs**. Add `https://yourdomain/auth/callback` (Part 3.4 / 7).
- **The login email never arrives.** → You're on the built‑in 2/hour, owner‑only email. Set up
  **custom SMTP** (Part 3.5). Also check your spam folder.
- **The Pinup Wall says "Couldn't load the wall."** → The database isn't set up. Run the
  migration (Part 3.3).
- **The Librarian shows an error about the key.** → `ANTHROPIC_API_KEY` isn't set in Vercel.
  Add it (Part 5.3) and Redeploy.
- **The Librarian spins, then fails after a minute.** → Vercel free plan's 60‑second limit.
  Use fewer precedents / turn off web‑grounded, or upgrade to Pro.
- **The build failed: "no package.json / next not found."** → Root Directory is wrong. Set it
  to **`platform/apps/toolkit`** (Part 5.2).
- **The domain is stuck on "Invalid Configuration."** → DNS hasn't spread yet, or the record is
  wrong. Re‑check it matches Vercel exactly; wait longer; (Cloudflare) set records to **DNS
  only**.
- **The site loads but there's no padlock.** → The certificate is still being created (wait),
  or a DNS record is blocking it.

---

## Optional A — Run the site on your own computer first

Not required, but it's the best way to see changes instantly before publishing. This part
*does* use the **terminal**.

💡 **Terminal (a.k.a. command line):** a text window where you type commands to your computer.
- **Mac:** open **Terminal** (Applications → Utilities, or search "Terminal").
- **Windows:** install/open **Windows Terminal** or **PowerShell**.

👉 Steps:
1. **Install Node.** 💡 **Node** is the engine that runs this kind of app on a computer. Get the
   "LTS" version from **nodejs.org** and install it.
2. **Get the code.** Easiest: on the GitHub repo page, click **Code → Download ZIP**, and
   unzip it. (Or, if you know git: `git clone <repo-url>`.)
3. In the terminal, go into the project's `platform` folder, then type:
   - `npm install`  — 💡 downloads the building blocks the app needs (takes a minute).
   - Copy `apps/toolkit/.env.example` to `apps/toolkit/.env.local` and fill in the same four
     values from Part 5.3.
   - `npm run dev:toolkit`  — starts the site locally.
4. Open **http://localhost:3000** in your browser.

💡 **`localhost:3000`** just means "the site running on *this computer*," visible only to you.

---

## Optional B — Let Claude Code manage all of this for you

You wanted Claude Code wired into everything so it can do these steps with you (apply database
changes, set Vercel variables, read deploy logs, propose DNS records) instead of you clicking
through dashboards.

That setup has its own short guide: **`platform/CLAUDE-CODE.md`**. The short version: install
Claude Code on your computer, set two access tokens in your terminal, and it picks up the
ready‑made `.mcp.json` in this repo. Then you can literally say *"add my Anthropic key to
Vercel and redeploy"* and it does it.

---

## Glossary (quick reference)

- **API** — a way for one program to talk to another over the internet.
- **API key** — a secret password that lets your app use another company's service (and lets
  them bill you).
- **Apex / root domain** — the plain domain with no prefix, e.g. `coolname.com`.
- **Authentication (auth)** — the system that logs users in.
- **Branch** — a version line of your code in GitHub. `main` is the live one.
- **Build** — turning source code into the optimized files a browser runs.
- **CNAME record** — a DNS entry that points a subdomain to another name.
- **A record** — a DNS entry that points a domain to a numeric (IP) address.
- **Database** — organized storage made of **tables** (smart spreadsheets) and **rows** (lines).
- **Deploy** — publish your code so it's live on the internet.
- **DNS** — the internet's address book; turns a domain name into where the site lives.
- **Domain** — your website's address (e.g. `coolname.com`).
- **Environment variable (env var)** — a setting/secret handed to the app from outside the code.
- **GitHub** — online storage for code; Vercel deploys from it.
- **Host / hosting** — the always‑on computers that run your site (Vercel).
- **HTTPS / SSL certificate** — encryption that gives you the 🔒 padlock and `https://`.
- **Magic link** — a one‑time sign‑in link sent by email (no password).
- **Migration** — a file of database setup instructions you run once.
- **Monorepo** — one code repository holding several projects in subfolders.
- **Nameservers** — the "who manages this domain's DNS" setting.
- **Next.js** — the web framework the Toolkit app is built with.
- **Postgres** — the specific database engine Supabase uses.
- **Propagation** — the delay while a DNS change spreads across the internet.
- **Registrar** — a company that sells/rents domains.
- **Repository (repo)** — a project's folder of code (yours lives on GitHub).
- **RLS (Row‑Level Security)** — database rules that decide who can read/write each row.
- **Root Directory** — which folder in the repo Vercel should build (`platform/apps/toolkit`).
- **SMTP** — the standard way to send email; you connect Supabase to an email service via it.
- **Subdomain** — a prefix on your domain, e.g. `toolkit.coolname.com`.
- **Supabase** — your database + logins + file storage service.
- **Terminal / command line** — a text window for typing commands to your computer.
- **Vercel** — the company that hosts and runs your site.

---

*This is the beginner walkthrough. For a shorter reference once you know the ropes, see the
deploy summary in `platform/README.md`. To have Claude Code do the steps with you, see
`platform/CLAUDE-CODE.md`.*
