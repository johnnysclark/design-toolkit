# Precedent Researcher / Dossier Builder

A small local web app for an architecture studio. Give it a research prompt
(*"naturally ventilated libraries in hot-humid climates"*) and it assembles a
dossier of precedents — but it is built to do the **opposite** of a confident
research assistant.

It makes the *grain of the machine* visible:

- **Every factual claim is tagged** — `✓ verified` (with a real source),
  `? plausible-unverified`, or `⚠ likely-hallucination`. Polish is not evidence.
- **It attacks its own work** — a second pass plays devil's advocate and makes the
  strongest case that each precedent is wrong, irrelevant, or over-claimed.
- **It hands you homework** — a verification worksheet lists every claim it could
  *not* back with a source, for you to check externally.
- **It logs itself** — a four-line provenance log (tool / asked /
  kept-changed-rejected / verified) you complete and submit.

This folds three `TOOL-CATALOG.md` items into one: precedent researcher,
hallucinated-precedent hunt, citation/lineage tracer, and devil's-advocate killer.

## Run it

Requires Node 18+ and an Anthropic API key.

```bash
cd TOOLS/precedent-researcher
npm install
ANTHROPIC_API_KEY=sk-ant-… npm start
# open http://localhost:3000
```

## Two modes (the toggle)

- **Model-only (default):** no web access. The model *cannot* mark anything
  `verified`; it can only flag claims as plausible or likely-fabricated. This is the
  purest version of *"verification must be external"* — the whole dossier becomes
  the student's worksheet.
- **Grounded:** uses Claude's built-in web search to confirm buildings exist and
  attach real citation URLs. Some claims flip to `✓ verified` with a source.

Running the same prompt **both ways and comparing** is itself the lesson: watch
which confident claims survive contact with a real source.

## Using it in studio

- **Demo:** run model-only first and let students see the `⚠` flags. Then probe a
  deliberately obscure topic and watch the tool decline to invent — *"a confident
  paragraph about a building that doesn't exist reads exactly like one about a
  building that does."*
- **Assignment ("AI precedent dossier"):** students run the tool, then must
  fact-check and annotate **every** claim on the worksheet, and submit the completed
  provenance log. Grade the verification trace, not the dossier.

## How it works

`server.js` runs a two-call pipeline against `claude-opus-4-8`:

1. **Dossier pass** — structured-output JSON: precedents broken into atomic claims,
   each self-tagged with a confidence/status and reason. In grounded mode the
   `web_search` server tool is attached and the model returns JSON in a code block.
2. **Adversarial pass** — the devil's-advocate critique over the dossier.

The browser (`public/app.js`) renders the cards, comparison matrix, critique,
worksheet, and provenance log, and exports Markdown + JSON.

Files: `server.js` (HTTP + pipeline), `prompts.js` (prompts + JSON schemas),
`public/` (UI). No build step.

## Honest limits

- The model grades its own confidence — it will miss some of its own hallucinations.
  That's the point: the worksheet exists because the tool is not the court that
  acquits itself.
- Grounded citations are only as good as what search surfaced; a URL is not proof
  the claim is right. Still verify.
