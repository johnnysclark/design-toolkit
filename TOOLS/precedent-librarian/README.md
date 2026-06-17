# Precedent Librarian

**A dossier builder for architectural references — design *and* technical.**
Give it a research prompt (*"naturally ventilated libraries in hot-humid climates,"*
*"mass-timber moment connections"*) and it assembles a precedent dossier built to do
the **opposite** of a confident research assistant — it makes the *grain of the
machine* visible.

- **Every factual claim is tagged** — `✓ verified` (real source) / `? plausible-unverified` / `⚠ likely-hallucination`. Polish is not evidence.
- **It attacks its own work** — a devil's-advocate pass makes the strongest case each precedent is wrong, irrelevant, or over-claimed.
- **It hands you homework** — a verification worksheet of every claim it couldn't source, to check externally.
- **It logs itself** — a four-line provenance log (tool / asked / kept-changed-rejected / verified).

Folds several `TOOL CATALOG IDEAS.md` §2 items into one: precedent researcher,
hallucinated-precedent hunt, citation/lineage tracer, devil's-advocate killer.

**Status:** ✅ working (built). Maps to `TOOL CATALOG IDEAS.md` §2 — Precedent & Research.

## Variants
| Folder | Form | Setup |
|---|---|---|
| [`web/`](web) | Full local web app, live model output | `npm install` + `ANTHROPIC_API_KEY` |
| [`lite/`](lite) | One HTML file, canned sample dossiers, no key | none |

```bash
open "TOOLS/precedent-librarian/lite/index.html"   # zero setup, sample dossiers
```

## Ideas / backlog
- Split/【toggle】**design** vs **technical** dossier modes (different source priorities, claim types).
- Ground in a vetted corpus (RAG) so verification rate climbs.
- Export to the studio's citation/bibliography format.
- Cross-link precedents into **form-helper** and **portfolio-storyteller**.
