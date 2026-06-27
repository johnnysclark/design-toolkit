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

### I4 · Cheaper Librarian engine (Qwen3-VL via OpenRouter) — A/B vs Claude · **small/medium**
Cut Librarian vision cost ~16× by adding an opt-in OpenRouter engine (Qwen3-VL-235B,
$0.20/$0.88 per 1M) behind an env flag; Claude stays default. Librarian-only, additive,
reversible — **does not touch the shared `models.ts` or `package.json`.** Full step-by-step
gameplan (files, env setup, A/B method, risks, rollback): [`plans/librarian-openrouter-engine.md`](plans/librarian-openrouter-engine.md).
First, cheapest test of the broader open-model cost strategy (memory note `open-model-cost-strategy`).

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

### T3 · Design Critic — ✅ **DONE (2026-06-26, branch `claude/design-critic-agent-plan-07tb1o`)**
*Shipped the full three-mode critic at `/design-critic` (Librarian pattern). One multi-mode route
`api/design-critic/route.ts` (Sonnet 4.6, **401 for anon**, logs to `tool_runs`): **Jury** (6
adoptable critic personas making "the strongest case it fails" over uploaded work + a thesis),
**Review Prep** (crit weather report tagging questions fair/loaded/out-of-scope + rebuttal
rehearsal), and **Portfolio** (voice-preserving two-pane editor with a "% in your words" meter +
export-lock, then the critic attacks the **student's own words**; + a defensible-thesis builder).
Every claim is tagged ✓/?/⚠. Dedicated tables + owner-only RLS + a private `critic` bucket in
`supabase/migrations/0005_design_critic.sql` (apply in the SQL editor). Slice:
`(app)/design-critic/*`, `lib/anthropic/critic-prompts.ts`. Nav status `live` (`requiresAuth`).
**v2:** trace/Markdown export, desk-crit transcript ingestion, screen-reader-first portfolio
export, the design-loop "Crit Engine" from `TOOLS/design-thinking-showcase/`.*

### T4 · 2D Media Tools — **large** (several sub-tools) · spec: draft fresh
**Drawing cleanup · live video · fabrication.** Mixed: image/vision passes, WebRTC, export.
This is really 3+ tools — scope each one separately and ship incrementally. **Spec each first.**

### T5 · 3D Tools — **large** (several sub-tools) · spec: draft fresh
**Python · tutorials · Three.js · 3D-print settings.** Mixed content + interactive (some
client-only Three.js, some content). Scope each sub-tool; ship incrementally. **Spec each first.**

### T6 · RAP (Radical Accessibility Project) — **large / research** · ref: `TOOLS/rap-tactile-cad/`
Non-visual / tactile CAD workflow — the accessibility research tool (also the publishable
research showcase, ACADIA/JAE). Deepest; treat as its own track, screen-reader-first.

### T7 · Skills Pathways — ✅ **DONE (2026-06-25, branch `tool/skills-pathways`)**
*Shipped: a **public** (no API key, no sign-in) trail map of 2D & 3D digital skills,
beginner→advanced, where each step holds tutorial videos + the shared Skills Coach concept
links. Track/software filters, a 3-column per-discipline board, a click-to-open step modal with
a lazy YouTube/Vimeo/upload player. Curated in code (`lib/skills-pathways/pathways.ts`); videos
both as embeds and uploads to a public `skills-videos` bucket (`supabase/migrations/0004_…`,
apply in SQL editor). Slice: `(app)/skills-pathways/*`, `lib/skills-pathways/pathways.ts`. Nav
status `live`. Spec + maintainer guide: `(app)/skills-pathways/SPEC.md`. **v2 ideas:** node-graph
view; teacher self-submission (`pathway_videos` table + RLS); `?discipline=` deep-link to Coach.*

**Content pass — DONE (2026-06-25):** every step now carries a written `guide` (a few
paragraphs of student-facing basics) so the page is useful before any video exists; expanded to
≥3 steps per level per software (Rhino · Grasshopper · AutoCAD · Revit · Adobe + Foundations,
~55 nodes), framed for undergrad/grad **studio** work (modeling, representation, portfolio) —
**not** professional CD production. All content in `lib/skills-pathways/pathways.ts`.

### T7-followup · Skills Pathways — deepen the content (good overnight-bot task)
A self-contained, parallelizable content job — ideal for a workflow/overnight agents. **Do not
touch the schema or UI; only edit the two content files** — `lib/skills-pathways/pathways.ts`
(the `guide[]` prose) and `lib/skills-pathways/practice.ts` (per-node `keyMoves` cheat-sheet +
`tryThis` exercise + `watchOut` pitfall, keyed by node id). Each unit of work = one node.
- **Content pass 2 — DONE (2026-06-25):** added `practice.ts` — every node now has a command/tool
  cheat-sheet, a concrete studio exercise, and a common-mistake callout, rendered under "The
  basics" in the step modal.
- **Deepen further:** sharpen thin guides; add more `keyMoves`/exercises; make `watchOut` notes
  more specific. Keep the studio (not CD-production) framing; keep them accurate (trust-but-verify
  — these teach students).
- **Widen coverage:** add steps for gaps (e.g. Rhino `Make2D` cleanup, GH Kangaroo basics,
  Photoshop sky/entourage, InDesign data-merge for plates), still ≥3 per level per software.
  Consider new lanes only via the existing `Discipline` set in `lib/skills-coach/concepts.ts`.
- **Link to concepts:** fill empty `conceptSlugs` where a matching KB concept exists; if a needed
  concept is missing, note it (the KB lives in `concepts.ts`, shared with the Skills Coach).
- **Curate videos:** as tutorials get recorded (John + teachers), paste `youtube`/`vimeo`/`file`
  refs into the relevant nodes (format in `SPEC.md`).
- **Verify:** `npm run build:toolkit` (types) must stay green; every `prereqs` id must exist.

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
