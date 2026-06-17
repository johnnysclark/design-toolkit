# Precedent Librarian

**A dossier builder that treats AI research output as a suspect to cross-examine, not
an authority to cite.** Give it a research prompt (*"naturally ventilated libraries in
hot-humid climates," "mass-timber moment connections"*) and it assembles a precedent
dossier — design *and* technical — that atomizes every factual claim, tags each with a
confidence flag and a tell, attacks its own list, and hands you a worksheet of exactly
what still needs human verification. The point isn't the dossier; it's making the
*grain of the machine* visible so the student stays the researcher.

**Status:** ✅ **built and working** (web + lite). Maps to `TOOL CATALOG IDEAS.md` §2.
*This README is now a build-out.*

---

## How it embodies the studio ethos (all built)
- **Every claim tagged + cited** — schema-enforced `status` ∈ {✓ verified, ? plausible-unverified, ⚠ likely-hallucination} + `reason` ("name the tell") + `source`.
- **Ungrounded mode is hard-wired to never mark anything `verified`** — the cleanest possible demo that *polish ≠ truth*.
- **Attacks its own output** — an always-ungrounded **devil's-advocate pass** ("hostile design critic; do not be polite") with keep / keep-with-caveats / drop verdicts.
- **Verification worksheet** — every non-verified claim becomes checkbox homework.
- **Four-line provenance log** — tool / asked / kept-changed-rejected / verified (the student fills the last lines).
- **Degrades to free** — `lite/` single-file HTML with canned samples (incl. a non-existent topic the tool *refuses to fabricate*, and a planted "33% energy reduction" stat that survives as ⚠ even when grounded).

## The one load-bearing toggle (built) + the one that's missing
- **Built:** `grounded` (web search on/off). Pedagogically sharp — run the *same prompt* both ways and watch ungrounded return confident prose with **zero** ✓ claims.
- **Missing (headline gap): design-vs-technical mode.** One schema/prompt serves both today. They should diverge:

| | **Design dossier** | **Technical dossier** |
|---|---|---|
| Sources | monographs, ArchDaily, critical essays, archives | codes/standards, manufacturer data, peer-reviewed papers |
| Claim types | spatial / formal / typological / conceptual | quantitative: spans, R-values, fire ratings, costs, clauses |
| Hallucination tell | over-claimed "influence," invented quotes | **suspiciously precise numbers** (already named in the schema) |

## Variants
| Folder | Form | Setup |
|---|---|---|
| [`web/`](web) | Full local app, live model output | `npm install` + `ANTHROPIC_API_KEY` |
| [`lite/`](lite) | One HTML file, canned dossiers, no key | none |

```bash
open "TOOLS/precedent-librarian/lite/index.html"   # zero setup, sample dossiers
```

---

## Gameplan

### MVP — built. Gaps to note
- ✅ two-pass pipeline, grounded/ungrounded split, tagging, adversarial pass, worksheet, provenance, MD/JSON export, lite + web.
- ⚠ **No design-vs-technical mode** (headline backlog item).
- ⚠ **Citations are model-asserted, never checked** — a grounded URL is trusted as real; nothing confirms it resolves or supports the claim. (Even `verified` URLs are unvalidated.)
- ⚠ Adversarial pass is **fact-blind** — it receives only name/architect/why, not the claims, so it can't attack a specific fabricated statistic.
- ⚠ Provenance + worksheet completed only after download (not editable in-app).
- ⚠ `lite/` duplicates render logic from `web/` by hand (drift risk); only 2 sample topics.

### v1 — make `verified` mean something
- **Design/technical mode** with divergent prompts + schemas (add `units`/`quantity` for technical claims).
- **Citation liveness + relevance check** — server-side fetch each `source`; downgrade `verified`→`plausible-unverified` on 404/unreachable; optional cheap (Haiku) "does this page support this claim?" pass.
- **Crossref / OpenAlex reconciliation** for technical/bibliographic claims (free, keyless) — `verified` only if a real record matches title/author/year above threshold. The cleanest "real vs fabricated citation" signal available for free.
- **Wikidata existence cross-check** for buildings (architect/year/location) → flips `existence_confidence` on mismatch.
- **Pass the claims to the adversarial pass** so it can attack specific fabrications.
- **Editable worksheet + provenance in-app** (check boxes, type the source you found, then export the completed artifact) — closes the loop inside the tool.

### Stretch
- **RAG over a vetted corpus** — ground in sources the studio trusts (an instructor precedent library; ADA/accessibility standards; openly-licensed technical refs). *Note: Avery Index is subscription-only — treat it as a worksheet pointer ("look this up via your library"), not an automated source.* The open layer is the corpus; Avery is the human verification destination.
- **Precedent constellation / comparison** (lineage edges, cluster by strategy).
- **Precedent-to-rule-set** — distill a precedent into checkable design rules (great RAP vehicle: precedent → accessibility rule the student checks their scheme against).
- **Citation export** (BibTeX / CSL-JSON / Zotero) → hand-off to portfolio-storyteller.
- **Hallucinated-precedent hunt as a graded mode** + a **calibration scoreboard** (did the student's verification agree with the tool's tag? are they over-trusting ✓?).

---

## Potential directions
1. **RAG against a vetted corpus** (highest-leverage; makes `verified` truthful).
2. **Precedent constellation / comparison** (folds in the lineage-tracer idea).
3. **Citation-format export** (Zotero/BibTeX/CSL-JSON).
4. **Precedent-to-rule-set** (research → design bridge; RAP-friendly).
5. **Cross-link into form-helper & portfolio-storyteller** with tags *intact* (provenance travels, never re-laundered into confident claims).
6. **Hallucinated-precedent hunt** scored on *catches*, not clean output.
7. **Claim-level calibration scoreboard** — teaches trust calibration, not just facts.

---

## Technical notes (grounded in the code)
- **Stack:** Node `node:http`, one dep (`@anthropic-ai/sdk`), vanilla-JS frontend, single-file lite. `claude-opus-4-8`, adaptive thinking, `max_tokens: 20000`. Two sequential passes (dossier → adversarial). Structured output forced when ungrounded; JSON-in-fence + brace-fallback parse when grounded (web_search vs forced-schema conflict).
- **The core build is the verification layer:** make the model's job *retrieve + extract*, not *recall + self-grant `verified`*. Resolvers (Crossref/OpenAlex/Wikidata/URL-liveness) are free + keyless → model-tier-independent, so real citation checking is available even at D1.

## Delivery & equity (D0–D2)
- **D0:** `lite/` (canned, no key) — already pedagogically designed (zero ✓ in ungrounded sets; refuses to fabricate the obscure topic).
- **D1:** add a free-model tier for the structured ungrounded path; **the resolver/verification layer runs here too** — a strong equity story (the free path still distinguishes real from fabricated citations).
- **D2:** grounded Opus + web search + relevance-judging calls (highest verification quality).

## Integration / hand-offs
- **→ form-helper:** export *verified technical* claims as strategy/force operators ("this precedent shades via X").
- **→ portfolio-storyteller:** verified claims + provenance feed the portfolio's citation drawer (pass *tagged* claims so honesty isn't laundered into confident prose).
- **Shared kit:** this tool has the **complete** claim-tag/worksheet/log/MD-export kit — make it the reference implementation to extract for site-analyzer and the rest (see `TOOL IDEAS ANALYSIS.md`).

## How to test it
- **Labeled fixture corpus** (seed from the lite samples, which already encode ground truth): known-good buildings; non-existent buildings; real buildings with injected false specifics; fabricated DOIs/URLs.
- **Metrics:** fabrication catch-rate (recall), false-verification rate (→ ~0 once resolvers gate `verified`), citation-validity precision (auto-checkable via resolvers), existence accuracy, tag calibration.
- **Harness:** POST each fixture, score returned tags vs labels; run ungrounded vs grounded vs (future) RAG to show the verification rate climbing — that delta *is* the proof.
