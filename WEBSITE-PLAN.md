# Website Build Plan — the two-property platform

How to build the **Design Toolkit** and the **Research / Work / Teaching portfolio** as
real, database-backed websites with per-user logins and embedded LLM tools — and where
to host them (UIUC vs. private), with a recommendation.

> This is the "build the platform" plan. For just putting today's standalone
> demos online quickly, see [`HOSTING.md`](HOSTING.md).

> **Decisions this plan is built on (yours):** build it as a *real app* · split into
> **two properties / likely two domains** (one for the Toolkit, one for the
> Research+Work+Teaching portfolio) · **public URL gated by per-user logins** · show
> **both UIUC and private** hosting and recommend.

---

## 1. The shape: two properties, one foundation

You were right to split it. The two halves are genuinely different software:

| | **Toolkit** (e.g. `toolkit.yourdomain`) | **Portfolio** (e.g. `yourdomain` / `studio.yourdomain`) |
|---|---|---|
| **Nature** | An **application** — interactive, stateful, logged-in | A **showcase site** — content, images, story |
| **Holds** | The Design Toolkit tools + the pinup wall | Research, Work, Teaching |
| **Needs** | Database, auth, file uploads, **server-side LLM calls** | Fast pages, image galleries, great typography/SEO |
| **Changes** | You ship features | You publish content |
| **Best tool** | **Next.js** (React) | **Astro** (or Next.js, to keep one stack) |

**The unifying principle that keeps this sane:**

> **Content lives in files. Data lives in a database.**
>
> - **Content** (research essays, project pages, teaching pages, tutorials, the 3D-print
>   settings reference) → **Markdown/MDX files** in the repo. Versioned, durable, no DB
>   needed, easy to write. Add a visual CMS later only if non-coders must edit.
> - **Data** (pinup-wall uploads + metadata, user accounts, saved tool runs / "the
>   trace", Librarian dossiers you choose to keep) → **Postgres + object storage**.

That single rule decides where almost everything goes, and it's why the portfolio stays
cheap and simple while the toolkit gets a real backend.

**Two domains, not double the work.** Put both apps in **one repository (a "monorepo")**
that shares a `ui` design-system package and a `db`/`auth` package. Two deploys, two
domains, one design language, shared login. (If a monorepo feels like too much at the
start, two separate projects is fine — you can merge them later.)

---

## 2. Recommended stack (the "build a real app" path)

A single, modern, **AI-assistable** stack — chosen because it has the deepest tutorial +
LLM-training corpus, so vibe-coding it is realistic:

| Layer | Pick | Why |
|---|---|---|
| **Framework (Toolkit)** | **Next.js** (App Router, TypeScript) | The default for interactive apps; server code keeps LLM keys secret; huge AI-assist corpus |
| **Framework (Portfolio)** | **Astro** (or Next.js) | Best-in-class for content/image-heavy sites; ships almost no JS; can still embed interactive "islands". Use Next for both if you'd rather learn one tool |
| **Database** | **Postgres** | The boring, correct choice; everything below speaks it |
| **DB + Auth + Storage** | **Supabase** | Bundles the three things you need — Postgres, **per-user logins**, and **file storage for the pinup wall** — behind one service, with a generous free tier. Open-source, so it can later be **self-hosted on a UIUC VM** if data must stay on campus |
| **LLM calls** | **Anthropic SDK**, server-side only | In Next.js "route handlers"/"server actions"; reuse your existing prompt logic |
| **File storage** | Supabase Storage (or Cloudflare **R2** — 10 GB free, no egress fees) | For pinup-wall images, drawings, exports |
| **Hosting** | Vercel **or** a UIUC VM (see §6) | The code is portable between them |

**Reuse what you've built.** Your existing `site-analyzer/web` and `precedent-librarian/web`
Node servers already do the hard part (data fetching, prompts, schemas, streaming). You
**port that logic into Next route handlers** rather than rewriting it — same code, new
home. Until you do, you can **embed** the current apps as-is on a subdomain and migrate
tool-by-tool.

---

## 3. Where each section lives

Your spec, mapped to the architecture. **T** = interactive tool · **C** = content ·
**D** = needs the database · **🔑** = needs per-user login · **🤖** = LLM · **⬆️** = uploads.

### Design Toolkit → the **Toolkit** app

| Section | Type | Needs | Notes / reuse |
|---|---|---|---|
| Site Analysis (history + analysis) | T | 🤖 + external data + D | **Port `site-analyzer`**; save each run as "the trace" |
| Site Design (form-finding per site forces) | T | 3D (Three.js) + maybe 🤖 | New; browser-side geometry (`form-helper` spec) |
| Skills Coach (Rhino · Revit · Adobe · Vibe-Coding · Portfolio/Storytelling) | T + C | 🤖 + content | **Port `rhino-wizard` + `portfolio-storyteller`**; tutorials as MDX |
| Librarian | T | 🤖 + D | **Port `precedent-librarian`**; optionally save dossiers |
| **Digital / Pinup Wall** (studio memory + metadata) | D | 🔑 + ⬆️ + D (+ optional 🤖 auto-tagging) | **The flagship database feature.** Postgres + Storage + per-user access |
| Design Critic (personas; "use w/ caution") | T | 🤖 | Persona system; store critiques in the trace |
| 2D Media — Drawing Cleanup / Live Video / Fabrication | T | image/vision · WebRTC · export | Browser-heavy; some may call a model/service |
| 3D Tools — Python / Tutorials / Three.js / 3D-Print Settings | T + C + D | Pyodide-in-browser · MDX · Three.js · reference data | Mixed: tutorials = content, settings = data |
| RAP | T | (specialized) | Accessibility tool; **also appears in Research** — cross-link |

### Research / Work / Teaching → the **Portfolio** site

| Section | Type | Notes |
|---|---|---|
| RAP | C | Research write-up + a link into the RAP tool |
| Resonance | C | Essay/project content (MDX) |
| Game as Pedagogy | C | MDX |
| Creativity as Pedagogy | C | MDX |
| Drawings | C | Image gallery (content + optimized images) |
| *(later)* Work | C | Project pages, image-heavy |
| *(later)* Teaching | C | Courses, syllabi |

The portfolio is **almost entirely content** — which is exactly why it can be a fast,
cheap Astro/Next site with MDX, no database required until you want dynamic features.

---

## 4. The database (why it's central, and what's in it)

A database earns its place here for four reasons — the last one is pure studio ethos:

1. **Pinup wall** — image files (object storage) + rows of metadata (who, when, project,
   tags, crit notes).
2. **User accounts** — for the per-user logins you want.
3. **Saved tool outputs** — keep a Librarian dossier or a site analysis to revisit/share.
4. **"The trace"** — your repo's whole thesis is *grade the trace, not the output*: log
   each tool run with its prompts, the `✓/?/⚠` claim tags, citations, and the
   verification worksheet. A database turns that principle into a feature (a browsable
   provenance log), and later, research data.

**Per-user safety:** Supabase uses Postgres **Row-Level Security** — you write short
rules like "a user can only read/write their own pinups" so the public site can't leak or
overwrite others' data.

---

## 5. Logins & LLM keys (carry-overs from before, now first-class)

- **Per-user logins → Supabase Auth.** Email magic-link or one-time code (no passwords to
  manage), optional Google, and — if you want — **UIUC NetID via SSO**. This is the real
  "every user gets their own login" system, replacing the simple gate from `HOSTING.md`.
  *(You can still put **Cloudflare Access** in front during the private/early phase for a
  zero-code lock.)*
- **LLM keys stay server-side.** All Anthropic calls run in Next route handlers with the
  key in an environment variable — never in the browser. Use a **separate key per app**,
  set **monthly spend limits + alerts** in the Anthropic Console, and (for public tools)
  a **per-user rate limit** so a login can't run away with your budget.

---

## 6. Hosting — UIUC vs. private (now that there's a database)

A database changes the math: plain static hosts and shared cPanel are out for the app.
You now need **(1)** a Node-capable host, **(2)** Postgres, **(3)** object storage. Prices
are mid-2026 — **confirm current rates**, free tiers move.

### Private services

| # | Stack | What runs where | Cost (build → production) | Best for |
|---|---|---|---|---|
| **P1 ⭐** | **Vercel + Supabase** | Both apps on Vercel (two projects, two domains); Postgres+Auth+Storage on Supabase | **$0** (Vercel Hobby + Supabase Free) → **~$45/mo** (Vercel Pro $20 + Supabase Pro $25) + LLM usage | **The canonical Next.js stack.** Fastest to build, best AI-assist, two-domain native — **recommended to start** |
| **P2** | **Render (all-in-one)** | Apps as Web Services + **Render Postgres**; images on R2/Supabase | ~$7/mo per app + $7/mo Postgres + LLM | One dashboard for everything; simplest mental model |
| **P3** | **Fly.io + Neon** | Apps as containers (Docker) + **Neon** serverless Postgres (scales to zero) + R2 | ~$5–20/mo + LLM | Container portability, regions, lowest idle cost |

*Watch-outs:* Vercel **Hobby is non-commercial** (a non-revenue university site is usually
fine, but Pro is the safe answer) and **Supabase Free pauses after 7 days idle** (Pro
removes that). Render's **free Postgres expires after 30 days** — don't rely on it for
real data.

### UIUC services

| # | Stack | What runs where | Cost | Best for |
|---|---|---|---|---|
| **U1 ⭐** | **Technology Services VM + self-hosted Supabase** | One Linux VM runs both apps + **self-hosted Supabase (Docker)** behind Caddy | ~$15–25/mo (≈4–8 GB RAM box) + LLM | **Everything on campus**, incl. student uploads — the **data-residency** answer |
| **U2** | **NCSA Radiant / Illinois Computes** | Research-cloud VM(s), same layout as U1 | Radiant ≈ ⅓ of AWS; **Illinois Computes can be _free_** for research | When this is framed as research (RAP fits) or grant-funded |
| **U3** | **Campus AWS via `cloud.illinois.edu`** | App on App Runner/EC2 + **RDS Postgres** + **S3** | Variable; student research credits up to **$5,000** | Managed cloud, scale, grant billing |

> The free campus **`publish.illinois.edu` (WordPress)** can host the **portfolio content**
> for $0 if you ever want a no-code route for Research/Work/Teaching — but it can't run the
> database-backed Toolkit app. Listed only as a fallback for the content half.

### Recommendation

**Build on Vercel + Supabase now (P1).** It's free to start, it's the most
vibe-coding-friendly path, and it natively handles two domains + DB + auth + uploads.

**Plan the campus exit early.** Because Supabase is open-source, the *same code* can later
redeploy to a **Technology Services VM running self-hosted Supabase (U1)** if UIUC
data-governance requires student work to stay on campus. **That portability is the reason
to pick this stack.** So the one thing to settle up front (§8) is **where student
pinup-wall uploads are allowed to live** — that single answer decides P1 vs. U1, and the
code doesn't change either way.

---

## 7. Cost at a glance

| Item | Build / low-traffic | Production | All-campus (U1) |
|---|---|---|---|
| App hosting | $0 (Vercel Hobby) | ~$20/mo (Vercel Pro) | included in VM |
| Database + Auth + Storage | $0 (Supabase Free) | ~$25/mo (Supabase Pro) | ~$15–25/mo (VM) |
| LLM (Anthropic) | pay-per-use | pay-per-use | pay-per-use |
| Domains (×2) | ~$24–30 / year | same | same |
| Image storage | Supabase / R2 10 GB free | grows w/ use | on the VM |
| **Rough total** | **≈ $0 + LLM** | **≈ $45/mo + LLM** | **≈ $15–25/mo + LLM** (maybe **$0** via Illinois Computes) |

---

## 8. Build order (each phase ships something usable)

0. **Foundation (a weekend).** Create the monorepo; Toolkit (Next) + Portfolio (Astro)
   skeletons; one Supabase project (DB + Auth + Storage); deploy both to Vercel on
   temporary URLs; turn on login.
1. **Port the three working tools** into the Toolkit as routes — **Site Analysis,
   Librarian, Skills Coach** — LLM server-side, and start writing each run to the DB
   ("the trace").
2. **Pinup wall** — uploads + metadata + per-user access. Your first net-new database
   feature (Storage + Postgres + Row-Level Security).
3. **Portfolio v1** — the **Research** section (RAP, Resonance, Game/Creativity as
   Pedagogy, Drawings) as MDX content; wire up the second domain.
4. **Remaining tools**, iteratively — Design Critic (personas), Site Design (Three.js),
   2D/3D media tools.
5. **Work + Teaching** portfolio sections; polish; custom domains; UIUC SSO if wanted.

---

## 9. Settle these first

1. **Where can student pinup uploads live?** Ask UIUC (FERPA/data-governance). The answer
   picks **P1 (Supabase cloud)** vs **U1 (self-hosted on a campus VM)** — *same code either
   way*.
2. **Buy the two domains.** (~$12–15/yr each.)
3. **One framework or two?** Next.js for both (one thing to learn) vs. Next + Astro (best
   tool per job). Either is fine; start with what you'll enjoy maintaining.
4. **Start Phase 0 on free tiers** — costs nothing until you're ready to go always-on.

---

## Sources

Stack & pricing (mid-2026 — confirm current):
- [Vercel pricing](https://vercel.com/pricing) · [Hobby plan limits](https://vercel.com/docs/plans/hobby)
- [Supabase pricing](https://supabase.com/pricing) · [Supabase self-hosting (open source)](https://supabase.com/docs/guides/self-hosting/docker)
- [Render pricing](https://render.com/pricing) · [Neon pricing](https://neon.com/pricing)
- [Cloudflare R2](https://developers.cloudflare.com/r2/) · [Next.js](https://nextjs.org/) · [Astro](https://astro.build/) · [Anthropic Console](https://console.anthropic.com/)

UIUC (from [`HOSTING.md`](HOSTING.md) research):
- [Technology Services — Virtual Server Hosting](https://help.uillinois.edu/TDClient/42/UIUC/Requests/Service/185/Virtual-Server-Hosting)
- [NCSA Radiant](https://www.ncsa.illinois.edu/resources-and-services/compute-resources/radiant/) · [Illinois Computes](https://computes.illinois.edu/whats_available/)
- [Technology Services — Cloud Services (AWS/Azure)](https://cloud.illinois.edu/) · [Publish at Illinois (WordPress)](https://publish.illinois.edu/)
