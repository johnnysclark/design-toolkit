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

The bet is that **design thinking is already AI-ready** — designers iterate, critique,
prototype, and tolerate ambiguity, which are exactly the habits that working well with
AI rewards. So the studio brings the design *feedback loop* to AI rather than treating
it as an oracle: the throughlines are **"grade the trace, not the output,"** calibrated
skepticism, provenance/logging, and keeping the student (not the model) as the
cognitive agent. Full reasoning is in
[`BRAINSTORM/SYNTHESIS.md`](BRAINSTORM/SYNTHESIS.md); the central *metaphor* for all
this is still open — candidates in
[`BRAINSTORM/METAPHOR IDEAS.md`](BRAINSTORM/METAPHOR%20IDEAS.md).

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

### 🌟 Showcase tools — two complementary picks
- **[`design-thinking-showcase`](TOOLS/design-thinking-showcase)** — the **thesis showcase** ("The Crit Engine"): solve one brief twice (accept AI's first answer vs. run the design loop) and grade the *tape*, not the building. Argues the central claim — *design thinking is already AI-ready* — live, in 3 minutes, to any audience. Cheapest to make compelling, loudest pedagogically; at full stretch it **orchestrates the other tools**.
- **[`rap-tactile-cad`](TOOLS/rap-tactile-cad)** — the **research showcase**: the accessibility (RAP) tool, deepest and most publishable (ACADIA/JAE), uncopyable.

*The thesis showcase frames why any of it matters; the research showcase is the deep node inside that frame.*

### The tool set

One folder per high-level tool under [`TOOLS/`](TOOLS) — each with its own README
spec. Built tools have working variants (web / standalone / CLI / lite); planned
tools are spec stubs we'll flesh out.

| Tool | What it does | Catalog | Status |
|---|---|---|---|
| [`site-analyzer`](TOOLS/site-analyzer) | Feed a site → structured read for design: climate, orientation, terrain, water, constraints, history, links — and the ground exported for Rhino | §1 | ✅ working |
| [`precedent-librarian`](TOOLS/precedent-librarian) | Dossier builder for design **and** technical references; tags every claim, plays devil's advocate, hands you a verification worksheet | §2 | ✅ working |
| [`crit-board`](TOOLS/crit-board) | Self-hosted studio pinup/crit board (Miro replacement): a students × weeks grid of cells, each holding many uploaded images + threaded public feedback. Multi-user + persistent; zero-setup `lite/` demo too | §16/§13 | ✅ working |
| [`form-helper`](TOOLS/form-helper) | Form-finding governed by site forces (sun, wind, orientation…) acting on a chosen geometry | §5/§7 | 🟡 planned |
| [`rhino-wizard`](TOOLS/rhino-wizard) | Tutor for Rhino / Grasshopper / GH-Python; mode toggles + Beginner/Moderate/Advanced levels | §6 | 🟡 planned |
| [`code-zoning-agent`](TOOLS/code-zoning-agent) | Interpret code & zoning for a project, every claim clause-cited and checkable | §3 | 🟡 planned |
| [`portfolio-storyteller`](TOOLS/portfolio-storyteller) | Review prep + portfolio narrative aid; keeps the student's voice and judgment | §13/§15 | 🟡 planned |
| [`rap-tactile-cad`](TOOLS/rap-tactile-cad) | 🌟 RAP accessibility tool — non-visual / tactile CAD workflow (**research showcase**) | §11/§26 | 🟡 in progress |
| [`design-thinking-showcase`](TOOLS/design-thinking-showcase) | 🌟 "The Crit Engine" — solve a brief twice (vibe vs. loop), grade the tape (**thesis showcase**) | §13 | 🟡 new |

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

# Crit Board — no install, no server (single-browser demo of the studio board):
open "TOOLS/crit-board/lite/index.html"

# Site Analyzer CLI (Node 18+):
node "TOOLS/site-analyzer/cli/analyze.js" "Gowanus Canal"
```

The full web apps need `npm install` and (for the model passes) an
`ANTHROPIC_API_KEY`. See each tool's own `README.md`. **No real API key is committed
to this repo** — only empty `.env.example` templates; `node_modules/` and `.env` are
gitignored.

**Putting these online?** Two guides:
- [`HOSTING.md`](HOSTING.md) — quick recipe to host *today's* standalone demos and the
  two Node apps (three UIUC + three private options, plus a per-user login gate).
- [`WEBSITE-PLAN.md`](WEBSITE-PLAN.md) — the bigger build: the **Toolkit app** + the
  **Research/Work/Teaching portfolio** as two database-backed sites (stack, database,
  logins, LLM integration, UIUC vs. private hosting, and a phased build order).

The build has started under [`platform/`](platform) — a Vercel + Supabase monorepo. The
**Toolkit** app (Next.js) is up first with email login, the toolkit nav, a live Librarian
tool, and the database-backed Pinup Wall. See [`platform/README.md`](platform/README.md).
To deploy from scratch (incl. registering a domain) follow
[`platform/DEPLOY.md`](platform/DEPLOY.md); to drive Supabase/Vercel/GitHub from Claude Code
see [`platform/CLAUDE-CODE.md`](platform/CLAUDE-CODE.md) and [`CLAUDE.md`](CLAUDE.md).

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
