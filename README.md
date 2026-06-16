# 26 · Summer AI Workshop

Workshop tooling and course materials for integrating AI into a fall architecture
design studio — developed during a summer AI studio, with an accessibility (RAP)
research throughline.

This repo holds two things: the **planning/brainstorm docs** that frame *why* and
*how* AI enters the studio, and the **working tools** (a set of AI demos plus one
primary showcase tool) that make the ideas concrete.

> **Status:** active / in development. This README is a living index — it gets
> updated as tools are built and the workshop takes shape.

---

## The idea in one paragraph

AI is treated as a **material with a grain** — fluent where its training data is
dense, quietly wrong where it's thin, and the grain is invisible because the prose
reads the same either way. The studio's job is to learn that material the way
architects learn any material: through resistance, testing, and interrogation. So
the throughlines are **"grade the trace, not the output,"** calibrated skepticism,
provenance/logging, and keeping the student (not the model) as the cognitive agent.
Full reasoning is in [`SYNTHESIS.md`](SYNTHESIS.md).

---

## Repo map

| Path | What it is |
|---|---|
| [`SYNTHESIS.md`](SYNTHESIS.md) | The distilled argument — pedagogy, principles, and the three lenses for choosing assignments |
| [`TOOL-CATALOG.md`](TOOL-CATALOG.md) | The wide, un-pruned catalog (~280 tool/workflow ideas across 24 domains) we draw from |
| [`AI-Integration-Brainstorm.md`](AI-Integration-Brainstorm.md) | Early framing notes |
| `BRAINSTORM DOCS 6-16-26/` | Source brainstorm documents (Grain of the Machine editions, idea menus, reflection exemplars) |
| `TOOLS/` | The working tools (see below) |

---

## Tools

The plan: **a number of small AI demos** that each make one idea legible, and **one
primary showcase tool** that goes deep. Built tools follow the studio ethos — hard
data is sourced and downloadable; every *model* claim is tagged
(`✓ verified` / `? unverified` / `⚠ likely-hallucination`) and cited; AI is a
material to interrogate, not an authority.

### 🌟 Primary showcase tool
*To be chosen.* This is the one we go deep on. Candidate flagships from the catalog:
a **vibe-coded design instrument** for the studio's site, a **fully integrated
"AI for Architects" pipeline** (site → code → budget → iterative design), or a
**representational-translation engine** (text ↔ diagram ↔ model ↔ tactile ↔ audio)
tied to the RAP research. — *decision pending.*

### Demo tools

| Tool | What it demonstrates | Form | Status |
|---|---|---|---|
| [`TOOLS/precedent-researcher`](TOOLS/precedent-researcher) | Precedent research that **attacks its own work** — tags every claim, plays devil's advocate, hands you a verification worksheet + provenance log | Local web app (needs API key) | ✅ working |
| [`TOOLS/precedent-researcher-lite`](TOOLS/precedent-researcher-lite) | Same interface, **zero setup** — one HTML file, canned sample dossiers, no key | Single HTML file | ✅ working |
| [`TOOLS/site-analyzer`](TOOLS/site-analyzer) | Read a **Superfund site** through climate/terrain/water/contamination and **export the ground for Rhino**; hard data sourced, model claims tagged | Local web app (key only for model passes) | ✅ working |
| [`TOOLS/site-analyzer-standalone`](TOOLS/site-analyzer-standalone) | The whole Site Analyzer in **one double-click HTML file**, live public-API data | Single HTML file | ✅ working |
| [`TOOLS/site-analyzer-cli`](TOOLS/site-analyzer-cli) | No-setup CLI version for quick testing / Rhino export | Node CLI | ✅ working |

*More demos to come — this table grows as we build. Each new tool should name the
`TOOL-CATALOG.md` item(s) it realizes.*

---

## Running the tools

Most tools have a **zero-setup** variant (a single HTML file or a CLI) and a fuller
web-app variant. Quick paths:

```bash
# Precedent Researcher — no install, no key (canned samples):
open "TOOLS/precedent-researcher-lite/index.html"

# Site Analyzer — no install, no key, live data:
open "TOOLS/site-analyzer-standalone/index.html"

# Site Analyzer CLI (Node 18+):
cd TOOLS/site-analyzer-cli && node analyze.js "Gowanus Canal"
```

The full web apps need `npm install` and (for the model passes) an
`ANTHROPIC_API_KEY`. See each tool's own `README.md`. **No real API key is committed
to this repo** — only empty `.env.example` templates; `node_modules/` and `.env` are
gitignored.

---

## How this repo evolves

1. **Outline & gameplan** the demo tools (which catalog item each makes legible).
2. **Pick the primary showcase tool** and scope it.
3. **Build incrementally** — each tool small, documented, with its own README.
4. **Keep the trace** — tools are designed so the *process* is the artifact, mirroring
   the studio's "grade the trace" stance.
5. **Update this README** as the tool table and showcase choice firm up.

---

*Companion planning docs: [`SYNTHESIS.md`](SYNTHESIS.md) · [`TOOL-CATALOG.md`](TOOL-CATALOG.md)*
