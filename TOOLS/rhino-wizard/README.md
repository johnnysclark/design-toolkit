# Rhino Wizard

**A tutor for Rhino / Grasshopper / Grasshopper-Python.**
Ask how to do something; get guidance pitched to the mode and skill level you're in.
Built to *teach the workflow*, not hand over black-box answers — the student stays
the one who understands the definition.

**Status:** 🟡 planned / scoping. Maps to `TOOL CATALOG IDEAS.md` §6 — Python-for-Rhino
Tutor, Grasshopper error-doctor, GH-to-plain-English.

## Toggles

**Mode** (what you're working in):
- **Rhino** — modeling moves, commands, troubleshooting
- **Grasshopper** — components, wiring, data trees
- **Grasshopper Python** — GhPython / scripting inside GH

**Level** (how much explanation):
- **Beginner** — lots of explanation; the *why* behind each step, named components, common pitfalls
- **Moderate** — minimal explanation; the steps, lightly annotated
- **Advanced** — just the workflow, plus **alternatives** (other ways to get there + trade-offs)

## Design questions to settle
- Pure chat, or does it generate runnable artifacts (GhPython snippets, `.ghx`)?
- Verify suggestions against a real Rhino/GH version? (version drift is a known grain problem)
- How it shows it could be *wrong* — e.g. "try it and report back" loops, not just confident steps.

## Likely build notes (candidates)
- LLM with strong system prompts per Mode × Level; a curated knowledge base of GH components / common errors (RAG) to cut hallucination.
- Optional: emit GhPython / `GH_IO` XML; validate via RhinoCompute/Rhino.Inside.

## Ideas / backlog
- "Error-doctor" paste-your-GH-error flow.
- Level auto-suggest based on the question's sophistication (but student-overridable).
- Log the learning trace (what was asked, what was tried) for "grade the trace."
