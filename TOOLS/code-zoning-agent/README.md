# Code & Zoning Agent

**Interpret building code and zoning for a project — with its work checkable.**
Answer the code/zoning questions that shape a scheme (use, height, FAR, setbacks,
egress, occupancy, accessibility) and translate dense ordinance language into plain
terms — while always linking back to the source clause so the student verifies
rather than trusts.

**Status:** 🟡 planned / scoping. Maps to `TOOL CATALOG IDEAS.md` §3 — zoning/code
interpreter, zoning-envelope generator, accessibility-code checker, code-objection
tennis.

## Core capabilities (candidate set)
- **Zoning read** — for a parcel/zone: allowed uses, height, FAR, setbacks, lot coverage, parking.
- **Zoning-envelope** — derive the max legal build volume as a massing to design within (hand-off to **form-helper**).
- **Code Q&A** — egress, occupancy load, fire separation, accessibility (ADA / ANSI A117.1) — plain-language, clause-cited.
- **Objection mode** — role-play a code official raising objections you must answer.

## Non-negotiable design stance
- **Never an authority.** Every assertion carries a citation to the actual code/ordinance text; unverifiable claims are flagged. Code is high-stakes and a prime "against-the-grain" zone for LLMs.
- Jurisdiction is explicit (codes are local + versioned; the grain moves).

## Likely build notes (candidates)
- RAG over the specific jurisdiction's zoning ordinance + adopted code (IBC/IECC/ANSI) editions.
- Rule encodings for the deterministic parts (FAR/height/setback math, fixture counts).
- Clause-level citation + a "verify this" worksheet.

## Ideas / backlog
- Code-diff across jurisdictions or code cycles.
- Pull the parcel/zone automatically from **Site Analyzer**.
- Accessibility deep-dive shared with **rap-tactile-cad** / RAP research.
