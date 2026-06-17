# Code & Zoning Agent

**A code & zoning interpreter that refuses to be an authority — it answers the
regulatory questions that shape a scheme, but every answer arrives chained to the
clause it came from, so the student leaves having *read the law*, not having trusted
the bot.** The deliverable is not "the answer to your zoning question" — it's **a
checkable answer plus the shortest path to verifying it yourself**. Success is not "was
it right" but "did the student catch it when it was wrong."

> *"It reads the code so you can argue with it — not so you can skip it. Every number
> points at a clause. No clause, no number."*

Code/zoning is the highest-stakes, most against-the-grain domain in the studio (local,
versioned, amended, exception-riddled — exactly where a fluent LLM invents a plausible
setback and ruins a permit set). So this tool is the studio's **flagship demonstration
of calibrated skepticism** — the "citation audit" classroom move turned into software.

**Status:** 🟡 planned / scoping. Maps to `TOOL CATALOG IDEAS.md` §3.
**Framing:** *teaching tool, not legal advice; not for permitting.*

---

## Architecture stance: a calculator that cites the law, not a chatbot about it
The trust comes from a hard wall between two layers:
- **Deterministic rule engine (D0 — no model, no hallucination).** Every numeric/categorical answer (FAR, height, setback, lot coverage, occupant load, fixture counts) is **computed by code** from a versioned, machine-readable **rule pack** (rules-as-data JSON, one record per requirement, each carrying its own citation + source URL + `verified_by`). The LLM **never produces a number.**
- **LLM layer (D1/D2 — additive, never authoritative).** Plain-language translation of a retrieved clause; clause-finding for open Q&A; objection-mode role-play. **Constrained to cite or abstain** — every assertion must attach the clause it was given; no retrieval → "no clause found, verify manually," never improvise.

This converts the highest-risk surface into a D0 calculation, and makes the model structurally incapable of inventing a setback (it only ever explains engine output).

## The modes
- **Zoning read** — *"what does this district let me do?"* → a table of envelope-defining parameters, **each cell a claim card** with the clause. Arithmetic (FAR × lot area) is labeled **[computed]**; interpretation (which use group, does an overlay apply) is the model's, tagged ✓/?/⚠.
- **Zoning-envelope generator** — *"draw me the biggest legal box."* Parsed parameters + parcel footprint → **max legal 3D massing**, showing **which rule carved which face** (this setback from §X, this stepback from the sky-plane in §Y). Exports to **form-helper** as the hard constraint geometry; watermarked "NOT A LEGAL DETERMINATION."
- **Code Q&A** — egress, occupant load, fire separation, occupancy classification, **accessibility (ADA / ICC A117.1)**. Shows the table row it pulled from; assumptions (sprinklered? occupancy group?) are **editable chips** so the answer visibly changes — teaching that code answers are conditional.
- **Objection tennis** — role-plays a code official serving objections at the scheme ("your second exit is < half the diagonal apart — show me"); the student volleys; it concedes on correct citations, escalates on bluffs; ends with a scorecard → verification worksheet. The most demo-friendly mode and the clearest "grade the trace."

## UX spine
**Jurisdiction + edition first — blocking.** No code answer without a jurisdiction + adopted edition selected; an unset jurisdiction is a hard error, not a default. Claim cards are **collapsed to the clause by default** — the student expands to see the plain-language gloss, never the reverse (the law is the primary object; the AI's translation is the annotation).

---

## Gameplan

### MVP (single-file HTML, equity floor)
- **One jurisdiction**, hand-curated rule pack (+ the free **ADA Standards**), with the jurisdiction/edition selector visible from day one.
- **Code Q&A + Zoning read** only; claim cards with tags + clause field + verification worksheet + four-line log; canned samples in the no-key lite build.
- **Deterministic FAR/height/setback/occupant-load/fixture math** rule-encoded (trustworthy numbers) before any RAG. *This MVP alone is a complete pedagogy demo in the highest-stakes domain.*

### v1 (web app)
- **RAG over one real jurisdiction's ordinance + adopted code** so `✓ verified` becomes truthful (clause text retrieved, not recalled); chunk by clause/section; hybrid keyword+embedding; every claim quotes the clause + a deep "verify this" link.
- **Objection tennis**; **zoning-envelope generator** (mesh → form-helper, parcel ← Site Analyzer); assumption chips that re-run the answer.

### Stretch
- Multi-jurisdiction + **code-diff across cities/cycles** (trivial once rule packs are normalized — diff on shared metric keys).
- Accessibility deep-dive module (restroom/fixture solver, ADA 703 wayfinding/signage) shared with **rap-tactile-cad**.
- Permit-path storyteller; energy-code pre-check; zoning-as-money pro-forma coupling.
- Calibration harness (known-answer benchmark scoring the tool's tag accuracy).

---

## Potential directions
1. **Envelope → form-helper pipeline** (code as the first site force — cleanest cross-tool story).
2. **Code-diff across jurisdictions / cycles** (viscerally teaches "the grain is local and moves").
3. **Accessibility / ADA deep-dive shared with RAP** (ADA content *is* accessibility expertise; clearance diagrams are exactly what RAP renders tactile).
4. **Parcel/zone auto-pull from Site Analyzer.**
5. **Objection tennis as a review-rehearsal product** (transcript export = a gradeable trace).
6. **"Grade the trace" instructor view** (worksheet + log + objection scorecard as the gradeable artifact).
7. **Calibration leaderboard** (the class watches where the tool confidently misfires — live evidence that polish ≠ evidence).

---

## Technical notes
- **Rules-as-data, not rules-as-code** — each requirement a JSON record `{id, jurisdiction, code, edition, zone, metric, value, formula, citation, source_url, source_excerpt, verified_by, confidence}`. The engine is a small interpreter over these. Tags track **provenance**, not model confidence: `✓` only if the record is human-verified against source text; `⚠` if the engine assumed a default or hit ambiguity.
- **Sourcing reality (be honest in-tool):** ICC codes (IBC/IECC/IPC) + ANSI A117.1 are **copyrighted/paywalled** — ship *numbers + short fair-use excerpts + deep links*, not full text (numeric thresholds are facts, thin-copyright). **Lead accessibility on the free public-domain ADA Standards.** Municipal **zoning** is more open (Municode / American Legal / eCode360, deep-linkable; one jurisdiction hand-curated for MVP).
- **Envelope generator:** setback inset (JSTS `buffer(-d)` / straight skeleton) → coverage clip → extrude to height → FAR cap (report the *governing* constraint) → sky-plane clip (mesh plane-clip). Output `.obj`/`.3dm` via the shared rhino3dm stack on Site Analyzer's projection/origin.

## Delivery & equity (D0–D2)
**Most of the tool is D0** — *all* calculators, the envelope generator, the zoning-read table, rule-pack lookup with citations, worksheet, log. With the model off you still get every numeric/compliance answer + the verbatim clause; you just lose the friendly paraphrase. **D1:** plain-language translation, open Q&A, objection role-play. **D2:** nothing compliance-critical should require it.

## Integration / hand-offs
- **IN ← Site Analyzer:** `{parcel_polygon (WGS84 + local-metre), centroid, zone_code if GIS provides}` on the shared projection.
- **OUT → form-helper:** the legal envelope mesh as base geometry + a constraints sidecar (each face tagged with its governing `rule_id` + citation).
- **Cross-cutting:** ADA clearances shared with `rap-tactile-cad`; reuse the shared claim-tag/worksheet/log kit.

## How to test it
- **Golden-answer suite** per jurisdiction (~30–50 known-correct Q/A with verified clause) — assert exact value **and** correct citation. CI-runnable, no model.
- **Envelope geometry tests** (synthetic parcels with hand-computed footprint area / max floors / governing constraint; include corner-lot + FAR-binding cases).
- **Citation-integrity** — every quoted span exists verbatim in the cited chunk; every `source_url` resolves.
- **Hallucination eval (loud pedagogy test):** adversarial/out-of-corpus questions → must `⚠`/"no clause found," **never** a fabricated number. A fabricated number is a hard failure.
- **Pass bar for MVP:** 100% on deterministic golden + geometry + citation-integrity; **zero fabricated numbers** on the adversarial set.

## Risks
Confidently-wrong code answer treated as authority → nothing without a clause, uncited claims auto-`⚠`, "NOT A LEGAL DETERMINATION — verify with the AHJ" on every screen, worksheet makes verification the deliverable. Edition/jurisdiction drift → stamped on every output, blocking selector, optional drift sentinel. No-RAG `✓` over-trust → **no `✓` allowed without retrieval** (mirror precedent-librarian). The danger *is* the pedagogy: a tool that can confidently misquote a setback, wrapped in machinery that forces the student to catch it, is a more honest lesson than one that's merely reliable.
