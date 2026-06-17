# Rhino Wizard

**A skill-leveled tutor for Rhino / Grasshopper / GhPython that teaches the *workflow*
behind a result, then makes you build it — so you leave understanding the definition,
not holding a black box you can't repair.** The win condition is *not* "student gets
working geometry." It's "student can re-derive the move next week, debug it when it
breaks, and explain *why* those components, in that order, with that data structure."
A correct screenshot the student can't reproduce is a **failure state.**

> *"It teaches you to fish, shows you where the fish are, and refuses to hand you the
> fish at Beginner."* — Rhino Wizard is deliberately the slowest path to working
> geometry and the fastest path to understanding it.

**Status:** 🟡 planned / scoping. Maps to `TOOL CATALOG IDEAS.md` §6 (Python-for-Rhino Tutor, GH error-doctor, GH-to-plain-English).

---

## The toggles, fully specified

**Mode** (changes vocabulary + unit of work):
| Mode | Unit | Talks about | Verify against |
|---|---|---|---|
| **Rhino** | commands / modeling moves | commands, snaps, units/tolerance, gumball, history | viewport / command line |
| **Grasshopper** | components / wires / data trees | component names, inputs/outputs, **data-tree shape** (graft/flatten/path-mapper), wire meaning | param panel / data viewer counts |
| **GhPython** | code in a GhPython component | `rhinoscriptsyntax` vs `Rhino.Geometry`, I/O typing (Item/List/Tree), `out` printing | the `out` console / bubble errors |

**Level** (changes length, density, and *how much it withholds*):
| Level | Length | Withholding rule | Ends with |
|---|---|---|---|
| **Beginner** | longest | **never a complete runnable solution**; skeleton + the one component left as a question | a "try it & report back" checkpoint with the expected symptom |
| **Moderate** | minimal | most of a snippet, with a deliberate "you fill this in" on the load-bearing line | a one-line self-check |
| **Advanced** | shortest | full snippet allowed (assumed understood) **+ alternatives with trade-offs** | "pitfalls / where this breaks" |

*Same question ("different window count per floor"), Grasshopper mode:* **Beginner** → "this is a data-tree problem; graft your floor curves so each floor is its own branch; feed a *list of counts*; the component that aligns mismatched paths starts with 'P'… try Graft, watch the param panel — you should see one branch per floor." **Advanced** → "match a grafted count list to grafted floor curves into Divide Curve's N; watch path alignment. Alts: Path Mapper (explicit, brittle) / GhPython loop (cleanest when counts are computed) / Entwine. ⚠ count list ≠ branch count → GH repeats the shortest, silently."

---

## How it solves the "withhold help" problem (the central design challenge)
Helpful-tuned models *fight* instructions to withhold — so withholding is enforced **structurally, not by pleading**:
- **The Beginner output schema has no `full_solution` field** — only `skeleton`, `next_single_step`, `why`, `check_yourself`. The model can't dump what the schema won't hold.
- **Report-back gate** — the next step is withheld behind a student-supplied observation ("tell me what happened when you tried X"). No report, no continuation. This also produces the **learning trace** for free.
- **Socratic nudges by default** at Beginner/Moderate ("Graft or Flatten? what do you want *per floor*?").
- **The tool attacks its own output** — every answer self-tags ✓ stable / ? version-dependent / ⚠ likely-wrong-check-this and names the one thing most likely to break (version drift, tree mismatch, tolerance).

---

## Gameplan

### MVP (single-file HTML, the equity floor)
- Mode × Level toggles (sticky, always visible).
- Strong per-cell system prompts (9 cells) enforcing length / withholding / tone + the claim-tagging + try-it-report-back output contract; Beginner hard-blocks full solutions via the output template.
- Manual four-line provenance log + collapsible verification worksheet baked into the answer.
- Works against any model (bring-your-own-key; paste-prompt-into-chat fallback for D0).

### v1 (web app)
- Conversational report-back loop **with state** (the gate actually gates); auto-captured, exportable learning trace.
- **Curated RAG knowledge base** — Rhino commands + GH components (name, nickname, tab, I/O, **plugin owner**, version, doc URL) + a common-error catalog → cuts hallucination, powers the error-doctor. Built as versioned JSON; BM25 keyword retrieval filtered by Mode (codes are keyword-dense).
- **Version-awareness** — version is a first-class field on every KB row + a global toggle (default Rhino 8); answers re-tag on version change.
- Level auto-suggest (student-overridable).

### Stretch
- **Runnable artifacts** — emit GhPython (validate with `ast.parse` + undefined-name lint) → `.ghx` via a **template emitter** (model emits a high-level graph spec, deterministic JS serializes to GH_IO XML using real component GUIDs from the KB; never free-generate XML) → optional Rhino.Compute/Rhino.Inside execution (instructor-side, above the equity floor).
- Error-doctor structured triage; "explain this definition" (GH-to-plain-English; great for non-visual learners).

---

## Potential directions
1. **Error-Doctor paste-flow** — paste a GH bubble error; tool classifies (null data / type mismatch / tree-path / tolerance) and runs a *diagnostic dialogue*, not a fix.
2. **Runnable-artifact generator** (bold) — NL → validated GhPython/`.ghx`, gated behind Advanced + a read-back comprehension check.
3. **Version-drift mode** — declare your Rhino version; `?` claims resolve to it, changed-between-7-and-8 moves flagged.
4. **Learning-trace capture & instructor dashboard** ("23 students hit graft/flatten today").
5. **Auto-suggest level** (bold) from question sophistication; student confirms.
6. **"Explain this definition"** — paste a `.ghx`; narrate the logic, flag dead clusters (inverse-direction tutoring).
7. **Pitfall pre-mortem** — list the 2 most likely failure points *before* the student builds, so debugging becomes recognition.

---

## Technical notes
- **Architecture:** chat UI over an LLM with a **9-cell Mode×Level prompt matrix** assembled from composable fragments (`BASE_ETHOS + MODE + LEVEL + GROUNDING + OUTPUT_CONTRACT`), not 9 hand-written prompts. State (`mode, level, messages, lastError, retrievedRefs, traceLog`) lives outside the message array so toggling re-pitches the *next* answer. Structured JSON output (reuse site-analyzer's `CLAIM` shape) so tagging is structural. Clone the `site-analyzer/web` zero-build server + `standalone` shell.
- **Grounding (highest-leverage build item after the prompt matrix):** the curated KB is what stops the model inventing component names / mis-attributing plugins / citing nonexistent RhinoCommon methods. Source from McNeel docs, grasshopperdocs.com, and `componentguid`s embedded in any `.ghx`.

## Delivery & equity (D0–D2)
- **D0 (build first):** a **canned cookbook** — top ~30 GH tasks + common pitfalls as static KB JSON rendered in the single-file HTML, Mode×Level-pivoted, searchable, no LLM. *Authoring this forces you to build the KB, which everything else reuses.*
- **D1 (the realistic default):** `lite/` pure prompt-engineered chat, student-pasted key — full Mode×Level pedagogy, no grounding.
- **D2:** `web/` with grounded RAG + error-doctor + artifact generation/validation. The KB is the through-line across all three tiers.

## Integration / hand-offs
**form-helper → Rhino Wizard** is the natural pair: form-helper emits a force→move operator list; Rhino Wizard turns each operator into grounded GH/GhPython steps (shared handoff JSON `{operations:[{force, geometry_move, params}]}`). Also consumes Site Analyzer's `.3dm`/`.obj` as the geometry context being scripted against (shared rhino3dm + metric origin).

## How to test it
- **Correctness suite** (~20–30 tasks × 3 modes) graded by named-entity check (do cited commands/components/GUIDs exist in the KB?) + (for GhPython) `ast.parse` + Rhino.Compute execution on known inputs.
- **Withholding eval (equally important):** run each task at all 3 levels; assert Beginner contains **no** paste-ready full solution (schema + LLM-judge) and *does* contain a why + single next step. **Report the withhold-failure rate as a headline metric** — it's exactly where helpful-tuned models regress, so measure it every prompt change.
- **Honesty eval:** no `✓` without a KB-backed source; out-of-version question → flags the mismatch rather than answering confidently.

## The offload-trap
Rhino Wizard sits closest to the danger zone (a how-to tool). The tension is unresolvable, only managed: success is measured by **trace richness, not task-completion time**; Advanced still requires choosing among alternatives (judgment); artifact generation is gated behind read-back; report-back requires the *observation* (branch count, error text), not "ok done." The honest framing: this tool trades raw speed for retained capability *on purpose* — that trade is the pedagogy.
