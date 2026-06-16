# Precedent Researcher — Lite preview

The lightest possible way to see the tool: **a single HTML file, no API key, no
server, no install.**

## Run it

Double-click `index.html` (or drag it into a browser). That's it.

It renders **canned sample dossiers**, not live model output — so you can show the
interface, the claim tags, the devil's-advocate critique, the verification
worksheet, and the provenance log without any setup. The Markdown/JSON download
buttons work.

## What to try

- **"Naturally ventilated libraries"** sample — shows a realistic dossier with mixed
  `✓ / ? / ⚠` claim tags, including a fabricated "33% energy reduction" statistic the
  tool flags as `⚠ likely-hallucination`, and an off-topic foil it recommends
  dropping.
- **"Deliberately thin topic"** sample — shows the tool *refusing to invent*: a
  prompt with no real precedents returns flags instead of confident fiction. This is
  the core teaching moment.
- **Grounding toggle** — flips between the model-only sample (nothing `verified`) and
  the grounded sample (some claims flip to `✓ verified` with citation URLs).

## How it differs from the full version

| | Lite (this) | Full (`TOOLS/precedent-researcher`) |
|---|---|---|
| Output | Canned samples | Live `claude-opus-4-8` |
| Setup | Open the file | `npm install` + API key + `npm start` |
| Use | Demo the UI/idea, design the assignment | Real student/instructor research |

The sample data is hand-written to mirror exactly what the live pipeline returns, so
the preview is faithful — but it is not generating anything.
