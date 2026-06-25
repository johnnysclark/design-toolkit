# BUILD BACKLOG — what to build next

The actionable build list for the Design Toolkit. **Pick one item → take a git worktree
([`../RUNNING-MULTIPLE-AGENTS.md`](../RUNNING-MULTIPLE-AGENTS.md)) → build it → flip its nav
status → open a PR.** Reference specs live in `../TOOLS/<tool>/README.md` — treat them as
**design input for a fresh build, not code to port** (the repo has moved past the old
standalone architecture). Current state + history: [`STATUS.md`](STATUS.md). Rules:
[`../CLAUDE.md`](../CLAUDE.md).

## The build pattern (LLM tools)

The **Librarian** (`apps/toolkit/src/app/(app)/librarian/` + `app/api/librarian/route.ts`) is
the worked template. Each LLM tool =

1. **API route** `src/app/api/<tool>/route.ts` — server-side; keeps `ANTHROPIC_API_KEY` secret;
   **require auth, return 401 if no user** (cost protection).
2. **Prompts** `src/lib/anthropic/<tool>-prompts.ts`.
3. **UI page** `src/app/(app)/<tool>/page.tsx` — replace the `ComingSoon` stub.
4. **Flip `status` → `"live"`** in `src/lib/toolkit-nav.ts`.
5. **Log each run** to `tool_runs` ("the trace").

Client-only tools (no API cost — e.g. Site Design / Gable Studio) skip 1–2 and mount a static
build under `apps/toolkit/public/tools/<tool>/`, embedded via iframe.

---

## 🔧 Infra / product — do these first (they make the site shareable + safe)

### I1 · Make the Toolkit public + disable the Librarian — ✅ **DONE (2026-06-24)**
*Shipped: public shell (no blanket redirect), `AuthGate` on Librarian + Pinup, `api/librarian`
returns 401 for anon, sidebar adapts. Verified live: `GET /`→200, anon `POST /api/librarian`→401.*
Drop the sign-in wall so the cohort can browse, but keep the Anthropic key un-reachable.
- Remove the blanket redirect in `(app)/layout.tsx`; sidebar shows "Sign in" (not email/sign-out) when anonymous.
- **Librarian:** hide its nav item (or show a "sign-in required" state) **and** make `api/librarian/route.ts` return **401 for anon** — so even a direct POST can't spend credits.
- **Pinup Wall:** needs a logged-in user (RLS) → gate it as "sign-in required" for now.
- Leave a clear TODO to re-enable auth before sharing widely.

### I2 · Deploy the public site to the apex — ✅ **DONE (2026-06-24)**
*Live: `allmeans.works` → 308 → `www.allmeans.works` (Vercel project `allmeans-web`, root
`platform/apps/landing`). Porkbun: A `@`→`216.198.79.1`, CNAME `www`→`c105…vercel-dns-017.com`.
Verified: apex + www + `/work` all 200, valid cert. (`www` is canonical — flippable in Vercel.)*

### I3 · Email so others can log in (when auth returns) — **small**
Resend SMTP in Supabase (built-in email only reaches the owner, 2/hr) + an `@illinois.edu`
**6-digit OTP** option (campus scanners pre-click & burn magic links).

---

## 🧰 Tools to build (toolkit stubs, status `"soon"`)

### T1 · Site Analysis — **large** · ref: `TOOLS/site-analyzer/`
Feed a site → a structured design read: climate, orientation, terrain, water, constraints,
history, links — plus the ground **exported for Rhino**. Pulls live public data (EPA,
Open-Meteo, USGS, flood) and builds `rhino3dm` exports. The heavy one: external APIs + WASM +
a longer function timeout. **Interim:** embed the client-side standalone variant first.

### T2 · Skills Coach — ✅ **DONE (2026-06-25)**
*Shipped: a streaming chat tutor across **Rhino · Grasshopper · AutoCAD · Revit · Adobe** —
Beginner/Intermediate/Advanced levels, image/PDF upload (Claude vision), a curated concept KB
driving trustworthy doc links + a contextual side panel, a "report-back" loop, and per-student
persistence (`coach_conversations` / `coach_messages` + the `coach-uploads` bucket via
`supabase/migrations/0002_skills_coach.sql`, applied in the SQL editor). Gated to signed-in members;
`api/skills-coach` 401s for anon. Slice: `(app)/skills-coach/*`, `api/skills-coach/route.ts`,
`lib/anthropic/skills-coach-prompts.ts`, `lib/skills-coach/concepts.ts`. **Phase 2:** `.ghx` (Grasshopper)
+ `.3dm` (Rhino) file parsing so students can upload real definitions/models, not just screenshots.*

### T3 · Design Critic — **medium** · spec: draft fresh
Adoptable critique **personas** that give feedback on uploaded work, framed "use with caution —
consult humans too." Build: a persona picker → upload/paste the work → LLM critique in that
persona's voice, every claim tagged and logged. Pair with the design-loop ethos in
`TOOLS/design-thinking-showcase/`. **Write a short spec before building.**

### T4 · 2D Media Tools — **large** (several sub-tools) · spec: draft fresh
**Drawing cleanup · live video · fabrication.** Mixed: image/vision passes, WebRTC, export.
This is really 3+ tools — scope each one separately and ship incrementally. **Spec each first.**

### T5 · 3D Tools — **large** (several sub-tools) · spec: draft fresh
**Python · tutorials · Three.js · 3D-print settings.** Mixed content + interactive (some
client-only Three.js, some content). Scope each sub-tool; ship incrementally. **Spec each first.**

### T6 · RAP (Radical Accessibility Project) — **large / research** · ref: `TOOLS/rap-tactile-cad/`
Non-visual / tactile CAD workflow — the accessibility research tool (also the publishable
research showcase, ACADIA/JAE). Deepest; treat as its own track, screen-reader-first.

---

## 📦 Reference specs in `TOOLS/` not yet wired into the nav
Pull any of these into `toolkit-nav.ts` when you decide to build it:
`code-zoning-agent` · `crit-board` (studio pinup/crit board — overlaps the Pinup Wall) ·
`form-helper` (feeds Site Design) · `precedent-archive` · `design-thinking-showcase` ("Crit
Engine" thesis showcase).

---

*Keep this current: when a tool ships, flip its status in `toolkit-nav.ts` and note it in
`STATUS.md`. When you start a fresh spec (T3–T5), drop it next to the stub as
`(app)/<tool>/SPEC.md` or expand its entry here.*
