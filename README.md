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
Full reasoning is in [`BRAINSTORM/SYNTHESIS.md`](BRAINSTORM/SYNTHESIS.md).

---

## Repo map

### Top-level docs
| Doc | What it is |
|---|---|
| [`TOOL CATALOG IDEAS.md`](TOOL%20CATALOG%20IDEAS.md) | The wide, un-pruned catalog — high-level list of **all** brainstormed tool/workflow ideas (~280 across 24 domains) |
| [`TOOL IDEAS ANALYSIS.md`](TOOL%20IDEAS%20ANALYSIS.md) | Reflection on the tooling research — how the tools can be thought about, clustered, and delivered |
| [`AI PEDAGOGY NOTES.md`](AI%20PEDAGOGY%20NOTES.md) | Working lecture notes on AI pedagogy (for classmates, colleagues, students) — *in progress* |
| `README.md` | This file — the living index |

### Folders
| Path | What it is |
|---|---|
| [`BRAINSTORM/`](BRAINSTORM) | The brainstorm + synthesis material (see below) |
| [`TOOLS/`](TOOLS) | The working tools — one folder per high-level tool (see below) |

**`BRAINSTORM/`** contains:
- [`SYNTHESIS.md`](BRAINSTORM/SYNTHESIS.md) — the distilled argument: pedagogy, principles, the three lenses for choosing assignments
- [`AI-Integration-Brainstorm.md`](BRAINSTORM/AI-Integration-Brainstorm.md) — early framing notes
- `BRAINSTORM DOCS 6-16-26/` — source brainstorm documents (Grain of the Machine editions, idea menus, reflection exemplars)

---

## Tools

The plan: **a number of small AI demos** that each make one idea legible, and **one
primary showcase tool** that goes deep. Built tools follow the studio ethos — hard
data is sourced and downloadable; every *model* claim is tagged
(`✓ verified` / `? unverified` / `⚠ likely-hallucination`) and cited; AI is a
material to interrogate, not an authority.

### 🌟 Primary showcase tool
*To be chosen.* This is the one we go deep on. Leading candidate: **`rap-tactile-cad`**
(the accessibility research tool). Other flagship options in
[`TOOL IDEAS ANALYSIS.md`](TOOL%20IDEAS%20ANALYSIS.md). — *decision pending.*

### The tool set

One folder per high-level tool under [`TOOLS/`](TOOLS) — each with its own README
spec. Built tools have working variants (web / standalone / CLI / lite); planned
tools are spec stubs we'll flesh out.

| Tool | What it does | Catalog | Status |
|---|---|---|---|
| [`site-analyzer`](TOOLS/site-analyzer) | Feed a site → structured read for design: climate, orientation, terrain, water, constraints, history, links — and the ground exported for Rhino | §1 | ✅ working |
| [`precedent-librarian`](TOOLS/precedent-librarian) | Dossier builder for design **and** technical references; tags every claim, plays devil's advocate, hands you a verification worksheet | §2 | ✅ working |
| [`form-helper`](TOOLS/form-helper) | Form-finding governed by site forces (sun, wind, orientation…) acting on a chosen geometry | §5/§7 | 🟡 planned |
| [`rhino-wizard`](TOOLS/rhino-wizard) | Tutor for Rhino / Grasshopper / GH-Python; mode toggles + Beginner/Moderate/Advanced levels | §6 | 🟡 planned |
| [`code-zoning-agent`](TOOLS/code-zoning-agent) | Interpret code & zoning for a project, every claim clause-cited and checkable | §3 | 🟡 planned |
| [`portfolio-storyteller`](TOOLS/portfolio-storyteller) | Review prep + portfolio narrative aid; keeps the student's voice and judgment | §13/§15 | 🟡 planned |
| [`rap-tactile-cad`](TOOLS/rap-tactile-cad) | The RAP accessibility tool — non-visual / tactile CAD workflow (showcase candidate) | §11/§26 | 🟡 in progress |

*This table is the living index — it grows and statuses change as we build. Each tool's
README names the catalog item(s) it realizes. More tools likely (still mulling).*

---

## Running the tools

Most tools have a **zero-setup** variant (a single HTML file or a CLI) and a fuller
web-app variant. Quick paths:

```bash
# Precedent Librarian — no install, no key (canned samples):
open "TOOLS/precedent-librarian/lite/index.html"

# Site Analyzer — no install, no key, live data:
open "TOOLS/site-analyzer/standalone/index.html"

# Site Analyzer CLI (Node 18+):
node "TOOLS/site-analyzer/cli/analyze.js" "Gowanus Canal"
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

*Planning docs: [`TOOL CATALOG IDEAS.md`](TOOL%20CATALOG%20IDEAS.md) · [`TOOL IDEAS ANALYSIS.md`](TOOL%20IDEAS%20ANALYSIS.md) · [`AI PEDAGOGY NOTES.md`](AI%20PEDAGOGY%20NOTES.md) · [`BRAINSTORM/SYNTHESIS.md`](BRAINSTORM/SYNTHESIS.md)*
