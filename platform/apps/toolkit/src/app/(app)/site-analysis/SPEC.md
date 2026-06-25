# Site Analysis — Build Plan & Feature Spec

> **Status: DRAFT for John to edit.** This is the outline + feature list we agree on
> *before* I write the detailed implementation plan. Edit anything — strike features,
> move them between phases, answer the **decision points** marked 🟦. Once you've
> marked it up, I'll turn it into a concrete build plan and we start.

---

## 1. What this tool is

**Feed it a site → a verifiable, design-ready read of the real ground.** The hard
physical facts (climate, terrain, water/flood, boundary) come straight from public
agencies and **download into Rhino**; every *interpretive* claim the model adds
(contamination, design implications) arrives **pre-tagged for trust** —
`✓ verified` / `? plausible-unverified` / `⚠ likely-hallucination` — for the student to
check.

Less *"tell me about my site,"* more *"give me the measured ground and a flagged set of
hypotheses to verify before I design."* That distinction **is** the pedagogy: hard data
is sourced and honest; model judgment is labeled and attackable.

There is real, working source for this in [`TOOLS/site-analyzer/web/`](../../../../../../TOOLS/site-analyzer/web) —
a standalone Node server. This build **ports its engine and rebuilds its UI** inside the
Toolkit (Next.js + Supabase), following the **Librarian** as the template.

---

## 2. The principle that shapes every decision

> **Hard public data is free + open (no sign-in). Model judgment costs money + signs in.**

This single line maps the tool's pedagogy *onto the Toolkit's auth model* (see
`CLAUDE.md` → "public shell, gated cost tools"):

| Tier | What | Cost | Auth |
|---|---|---|---|
| **D0 — hard data** | site boundary, climate, terrain, flood, **all Rhino exports** | free (public APIs) | **public, no sign-in** |
| **D2 — model judgment** | contamination brief + design synthesis | spends Anthropic key | **sign-in required; API route returns 401 for anon** |

So a student with no account still gets the measured ground and every download (the
**equity floor**). Only the two AI passes gate. This is cleaner than the Librarian
(which gates wholesale) and is the most important design decision in the tool.

🟦 **Decision 1 — confirm this split.** Public hard-data + gated AI passes? Or gate the
whole tool like the Librarian for now (simpler, but kills the equity-floor story)?

---

## 3. What already exists to build from

The source is ~1,960 lines across clean modules. Most are **pure functions** (no server,
no framework) → they port into `src/lib/` almost verbatim. The frontend is the real
rebuild.

| Source file | What it does | Port plan |
|---|---|---|
| `datasources.js` (296) | EPA search/site, Open-Meteo climate, USGS terrain grid, FEMA flood | **Port → `lib/site-analysis/datasources.ts`** (typed, +cache) |
| `geo.js` (178) | wind rose, sun paths, monthly stats | **Port → `lib/site-analysis/geo.ts`** (pure math, verbatim) |
| `exporters.js` (259) | OBJ / DXF / GeoJSON / EPW writers | **Port → `lib/site-analysis/exporters.ts`** (verbatim) |
| `rhino3dm-export.js` (271) | builds the `.3dm` (terrain + sun path + wind rose + flood + labels) | **Port**, but ⚠️ WASM on Vercel — see Decision 4 |
| `prompts.js` (143) | 2 model passes: contamination (grounded) + synthesis | **Port → `lib/anthropic/site-analysis-prompts.ts`** (mirror Librarian) |
| `server.js` (373) | the 3 endpoints + analysis pipeline | **Rebuild as Next route handlers** (logic ports, plumbing changes) |
| `public/app.js` + `index.html` + `styles.css` (441+) | vanilla-JS UI: search, map (Leaflet), SVG charts, export buttons | **Rebuild in React** — the real frontend work |

**Endpoints to recreate** (from `server.js`):
- `GET /api/site-analysis/search?q=` → site candidates *(public)*
- `POST /api/site-analysis/analyze` → full dossier + map data *(AI passes gated)*
- `GET /api/site-analysis/export/:fmt?…` → Rhino-ready file *(public)*

---

## 4. Feature set

Tags: **[MVP]** = first shippable version · **[v1]** = close-the-loop · **[later]** =
stretch. Move things between tiers freely.

### A. Site input
- **[MVP]** Search EPA Superfund sites by name → pick one. *(This is what the source does
  today — fastest path to a working tool.)*
- **[later]** **Generalize beyond Superfund** — type any address/parcel. The
  climate/terrain/flood/export spine is already site-agnostic; only boundary +
  contamination are Superfund-locked. Needs geocoding (Census/Nominatim) + a parcel
  source. *Highest-leverage feature, but the biggest add.* → 🟦 Decision 2.

### B. Hard-data layers (D0, public)
- **[MVP]** **Site identity / boundary** — EPA NPL (name, status, location, polygon).
- **[MVP]** **Climate** — Open-Meteo ERA5: sun paths, wind rose, temp/RH by month.
- **[MVP]** **Terrain** — USGS 3DEP elevation grid + stats (range, slope).
- **[MVP]** **Water / flood** — FEMA NFHL finding at the site.
- **[MVP]** **Map** — Leaflet basemap with boundary + sample point.
- **[MVP]** **Charts** — wind rose + sun path + monthly temp/RH (SVG).
- **[v1]** **Coverage honesty** — every layer that fails shows a visible ✕, never faked.
  *(The pipeline already returns a `coverage` object; surface it.)*
- **[v1]** **Flag fabricated terrain** — null cells are currently filled with the grid
  mean and baked into exports invisibly. Mark them visually + in exports.

### C. Model passes (D2, sign-in)
- **[MVP]** **Contamination brief** — grounded (web search), every claim tagged + cited:
  contaminants, media, plume/extent, institutional controls, remediation status.
- **[MVP]** **Design synthesis** — reasons *only* over the hard data we gathered:
  climate read, topography read, flood read, contamination implications, design
  opportunities (tagged), **key tensions**, **what this analysis cannot tell you**, field
  checklist.
- **[v1]** **Blind-vs-grounded toggle** — run a pass with/without web search and show the
  **diff** side by side. *The single best hallucination lesson in the tool.*
- **[later]** **Adversarial re-pass** — red-team the synthesis ("which opportunities rest
  on the coarsest data? where would a site visit overturn this?").
- **[later]** **Brief history + relevant links** reads (genres most prone to invented
  dates/names → good teaching).

### D. Exports (D0, public — the Rhino payload)
- **[MVP]** `.3dm` — the headline: terrain + sun path + wind rose + flood plane + labels,
  native Rhino geometry on a shared metric origin. *(⚠️ WASM — Decision 4.)*
- **[MVP]** `.obj` (terrain mesh), `.dxf` (contours + boundary), `.geojson` (boundary),
  `.epw` (climate, for Ladybug). *(All already written in `exporters.js`.)*
- **[later]** **Live web⇄Rhino link** + a validated Ladybug pass next to ours on the
  shared origin (architecture in [`TOOLS/site-analyzer/LIVE-LINK.md`](../../../../../../TOOLS/site-analyzer/LIVE-LINK.md)).

### E. The trace + provenance (the studio's whole point)
- **[MVP]** Log every analyze run to `tool_runs` (input + output), like the Librarian.
- **[v1]** **Four-line provenance log** (tool / asked / kept-changed-rejected / verified)
  + a **"log my decision"** control on each claim, exported with the dossier.
- **[v1]** **Verification worksheet** auto-built from the field checklist + every `?`/`⚠`
  claim, downloadable (MD/CSV) — the graded-trace artifact.
- **[MVP]** Export the dossier as JSON + Markdown.

### F. Accessibility
- **[v1]** Charts get a **table/text alternative + ARIA** (currently SVG-only). Ties to
  the RAP throughline; do it early so it isn't a retrofit.

---

## 5. The screen (rough layout)

```
┌───────────────────────────────────────────────────────────────┐
│  Site Analysis            [ search a Superfund site…    🔍 ]   │
├───────────────────────────────────────────────────────────────┤
│  ┌─ MAP (Leaflet) ─────────────┐  ┌─ SITE FACTS ────────────┐ │
│  │  boundary + sample point     │  │ name · status · location │ │
│  │                              │  │ area · EPA region        │ │
│  └──────────────────────────────┘  │ coverage: ✓climate ✓terr │ │
│                                     └──────────────────────────┘ │
│  ┌─ CLIMATE ───────┐ ┌─ TERRAIN ──┐ ┌─ FLOOD ──┐                │
│  │ wind rose · sun  │ │ range/slope │ │ zone     │   (D0, open)  │
│  │ temp/RH charts   │ │ stats       │ │          │                │
│  └──────────────────┘ └─────────────┘ └──────────┘                │
│  ┌─ CONTAMINATION (sign-in) ───────────────────────────────────┐ │
│  │ summary · contaminants[tagged] · controls · remediation     │ │
│  ├─ DESIGN SYNTHESIS (sign-in) ────────────────────────────────┤ │
│  │ reads · opportunities[tagged] · KEY TENSIONS · cannot-tell · │ │
│  │ field checklist                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  EXPORTS:  [.3dm] [.obj] [.dxf] [.geojson] [.epw]   (D0, open)   │
└───────────────────────────────────────────────────────────────┘
```

When signed out, the two AI panels show a "Sign in to run the AI analysis" state; the
map, data, charts, and **all exports still work**.

🟦 **Decision 3 — claim tags.** Reuse the Librarian's exact tag UI (✓/?/⚠ chips with
reason + source) for consistency? (Recommended.)

---

## 6. How it slots into the Toolkit

Mirrors the Librarian (`BUILD-BACKLOG.md` → "the build pattern"):

```
src/app/(app)/site-analysis/page.tsx        ← replace the ComingSoon stub (the UI)
src/app/api/site-analysis/
  search/route.ts                           ← GET  (public)
  analyze/route.ts                          ← POST (AI passes → 401 if anon)
  export/[fmt]/route.ts                     ← GET  (public, streams a file)
src/lib/site-analysis/
  datasources.ts  geo.ts  exporters.ts  rhino3dm-export.ts   ← ported engine
src/lib/anthropic/site-analysis-prompts.ts  ← ported prompts + schemas
src/lib/toolkit-nav.ts                      ← flip status "soon" → "live"  (HOT FILE)
```

Conventions honored: secrets server-side only · `tool_runs` logging · RLS untouched ·
`toolkit-nav.ts` is a coordinated hot file. Built on its **own git worktree/branch**,
shipped as one PR (per `RUNNING-MULTIPLE-AGENTS.md`).

---

## 7. Key technical decisions & risks (need your call)

🟦 **Decision 4 — `rhino3dm` (WASM) on Vercel.** The `.3dm` export is the headline
feature but depends on a WASM module that must bundle in a serverless function. Options:
- **(a)** Get it working server-side in the export route *(best UX, some bundling risk —
  I'd spike this first).*
- **(b)** Build the `.3dm` **client-side** in the browser (rhino3dm runs in-browser; the
  source's standalone variant does exactly this) — no server WASM, and it keeps the
  export at D0. *Recommended.*
- **(c)** Ship MVP with `.obj/.dxf/.geojson/.epw` only (plain text, zero risk); add
  `.3dm` in v1.

🟦 **Decision 5 — the 60-second wall.** Vercel **Hobby caps functions at 60s.** The
`analyze` pipeline does external API fan-out **+ two model passes** (grounded web search
is slow). The source's terrain grid alone fires **256+ HTTP calls** (USGS point grid) —
that can blow 60s by itself. Mitigations (likely several):
- Replace the point-grid with a **single 3DEP raster fetch** (the README's top "quick
  win"). Big speedup, recommended regardless.
- **Split** the work: hard-data layers return fast (one request); the AI passes stream in
  a **separate** request so neither alone nears 60s.
- Smaller default terrain grid for the live read; finer grid only at export time.
- Or upgrade the Vercel project to **Pro** (300s). → is that on the table?

🟦 **Decision 6 — scope of MVP v1.** My recommended **MVP cut** (fastest real, useful
tool): Superfund search · all hard-data layers + map + charts · both AI passes (gated) ·
`.obj/.dxf/.geojson/.epw` exports + client-side `.3dm` · trace logging + JSON/MD export.
**Deferred to v1:** blind-vs-grounded diff, verification worksheet, four-line log,
accessible-chart fallback, coverage ✕ polish. **Deferred to later:** generalize beyond
Superfund, adversarial pass, history/links reads, live Rhino link. → edit this cut.

🟦 **Decision 7 — interim standalone?** `STATUS.md` floats embedding the existing
client-side `standalone/index.html` via iframe as a fast interim (like Site Design /
Gable Studio) before the full React port. Want that as a stepping stone, or go straight
to the native build? *(I lean straight-to-native — the engine ports cleanly and an iframe
won't get the auth-gated AI passes or the trace.)*

---

## 8. Proposed phasing

| Phase | Ships | Roughly |
|---|---|---|
| **0 · Spike** | Port `datasources/geo/exporters` to `lib/`; confirm EPA/Open-Meteo/USGS/FEMA still respond; settle Decisions 4 & 5 with a quick test | small |
| **1 · MVP** | Search → analyze → render (map + facts + climate/terrain/flood) → gated AI passes → text exports + client `.3dm` → trace + JSON/MD; flip nav to **live**; one PR | the bulk |
| **2 · v1** | Blind-vs-grounded diff · verification worksheet · four-line log · accessible charts · coverage ✕ + fabricated-terrain flags | follow-up PR |
| **3 · later** | Generalize beyond Superfund (geocode + parcel) · adversarial pass · history/links · live Rhino link | own tracks |

---

## 9. Open questions for you (edit inline)

1. **Decision 1** — public hard-data + gated AI passes, or gate the whole tool? →
2. **Decision 2** — Superfund-only for MVP, or invest in "any address" now? →
3. **Decision 3** — reuse the Librarian's claim-tag chips? →
4. **Decision 4** — `.3dm`: server WASM / client-side / defer? →
5. **Decision 5** — 60s wall: which mitigations / is Vercel Pro on the table? →
6. **Decision 6** — agree with the MVP cut, or move features in/out? →
7. **Decision 7** — interim standalone iframe, or straight to native? →
8. Anything missing from the **feature set** in §4? →

---

*When you've marked this up, I'll convert it into a step-by-step implementation plan
(file-by-file, with the spike first) and we build Phase 0 → 1.*
