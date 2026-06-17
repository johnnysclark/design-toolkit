# Summer AI Studio — Tool & Workflow Catalog

*A wide, deep, un-pruned list of potential tools/workflows to build or run this summer.*
*Sorted by architectural workflow domain — the way you'd reach for them in practice.*
*Compiled 2026-06-16. Companion to `SYNTHESIS.md` (which distills); this one stays broad on purpose.*

---

### How to read this list

- Plain entries came from your brainstorm docs. **✦ marks new potentials added in the expansion pass.**
- Type tags (many tools are more than one — sort however you like):
  - **`[B]`** = something you *build* (vibe-code an app/widget/tool)
  - **`[W]`** = a *workflow* you run with an existing AI model (prompt patterns, agents)
  - **`[D]`** = a *demo / diagnostic* (the point is to observe, break, or interrogate the model)
- `RAP` = touches accessibility / non-visual / multimodal — your research lane.
- **Build note** = a one-line sketch of how you'd actually make it (data, API, library, technique).
- Nothing here is filtered for feasibility or quality. That's the *next* pass, not this one.

> **Scale:** ~280 distinct tool ideas (some bundled onto shared `·`-separated lines) across 24 domains. Don't try to read it linearly — jump to the domains you care about. The four cross-cutting "flagship" bets are collected at the very bottom.
>
> *Reviewed & corrected 2026-06-16 by two audit agents (coverage + technical sense-check): build-note errors fixed, tags normalized, missing practice domains §19–§24 added, duplicate clusters cross-referenced (see "De-duplication notes" near the end).*

---

## 1. Site & Context Analysis

**From the brainstorm:**
- `[W]` **Site Analyzer** — feed a site, get a structured read (climate, orientation, access, constraints).
- `[W]` **Building-on-Site Analyzer** — extend to siting/massing a building on it.
- `[W]` **Site-history excavator** — prior uses, contamination, parcel history.
- `[W]` **Climate/site-data summarizer** — normals, sun, wind, precipitation into a brief.
- `[B]` **Climate-normals fetcher** — pull and chart NOAA/EPA normals for a location.
- `[B]` **Contamination-overlay map** (Superfund) — map plumes/soil data over a site.
- `[W]` **Institutional-controls extractor** — legal/use restrictions on a remediated site.
- `[B]` **Isochrone / walkability map** · `[B]` **Figure-ground generator** · `[W]` **Supply-chain tracer**.
- `[B]` **Site dossier compiler** · `[W]` **Microclimate sanity-checker** · `[B]` **GIS/parcel shapefile reader**.

**Expanded:**
- ✦ `[W]` `RAP` **Flood-Future Forecaster** — narrate how flood risk shifts across 2050/2100, as map + spoken audio briefing.
  - *Build note:* FEMA NFHL API for the **current** effective flood zone baseline; the **future** 2050/2100 shift comes from the NOAA Sea-Level-Rise viewer scenarios (NFHL itself doesn't model future risk); pipe summary to TTS.
- ✦ `[B]` `RAP` **Soundscape Predictor** — estimate a site's acoustic environment (traffic, rail, air) and render an ambient audio mock-up of standing there.
  - *Build note:* OSM Overpass roads + DOT traffic counts → dB curves → layered Web Audio loops.
- ✦ `[B]` **Solar-Envelope Carver** — max buildable volume that won't shadow neighbors past a chosen date/time.
  - *Build note:* sun vectors (SunCalc/pysolar) + setbacks; CSG/voxel sweep → OBJ.
- ✦ `[W]` **Viewshed & Privacy Mapper** — what each window sees, and who can see in.
  - *Build note:* USGS 3DEP DEM + GRASS `r.viewshed`; model writes per-facade view/privacy narrative.
- ✦ `[W]` **Urban Heat-Island Diagnostician** — overlay Landsat LST + canopy to flag hottest zones and where shade matters.
  - *Build note:* Landsat 8/9 thermal band (LST) + NLCD **Tree Canopy Cover (TCC)** product (not the standard land-cover raster); zonal stats summarized by model.
- ✦ `[B]` **Stormwater & Watershed Tracer** — where rain flows, runoff volume, downstream water body.
  - *Build note:* DEM-derived flow direction/accumulation (WhiteboxTools or GRASS `r.watershed`); NHDPlus for the downstream receiving water; **SCS curve-number method** for runoff *volume* (the rational method gives peak flow, not volume) using NLCD impervious %.
- ✦ `[W]` **Demographic-Drift Reader** — census tract trends (age, income, tenure, language, displacement) into an equity briefing.
  - *Build note:* Census ACS 5-yr + decennial API by tract; model summarizes longitudinal deltas.
- ✦ `[W]` `RAP` **Sanborn Time-Machine** — reconstruct decade-by-decade site history from Sanborn maps + aerials, illustrated and narrated.
  - *Build note:* LOC Sanborn + NETR historic aerials; vision model reads scans, TTS narrates.
- ✦ `[D]` **Wind-Tunnel Pre-Visualizer** — model predicts pedestrian wind comfort, then check against real CFD to expose where LLM physics fails.
  - *Build note:* NOAA wind-rose for the prompt; OpenFOAM/Eddy3D as ground truth.
- ✦ `[B]` `RAP` **Curb-to-Door Accessibility Auditor** — evaluate the real arrival sequence (curb cuts, slope, tactile paving, transit distance) for a wheelchair/low-vision user.
  - *Build note:* OSM sidewalk/kerb/tactile tags + DEM slope + GTFS stops; model assembles the journey, flags barriers.
- ✦ `[W]` `RAP` **Site Smell & Air-Quality Profiler** — what the site breathes and smells like across seasons.
  - *Build note:* EPA AirNow + TRI emitters + prevailing wind; model writes seasonal sensory profile.

## 2. Precedent & Research

**From the brainstorm:**
- `[W]` **Precedent Researcher / dossier builder** · `[W]` **General Building Construction Researcher**.
- `[D]` **Hallucinated-precedent hunt** · `[W]` **Citation/lineage tracer** · `[W]` **Devil's-advocate precedent killer**.
- `[B]` **Precedent-RAG bot** · `[B]` **Precedent comparison matrix** · `[B]` **Precedent constellation map**.
- ✦ `[B]` **Annotated-bibliography builder** · ✦ `[W]` **Whose-precedent? audit** · ✦ `[B]` **Precedent-to-rule-set extractor**.

**Expanded:**
- ✦ `[B]` **Precedent Section-Cutter** — comparative analytic sections at normalized scale, so students compare spatial logic not presentation style.
  - *Build note:* vision model extracts section geometry; redraw to fixed-scale SVG grid.
- ✦ `[W]` **Failure-Case Archivist** — dossiers on buildings that *failed* (Ronan Point, Hyatt, Pruitt-Igoe, FIU) and the decision chains behind them.
  - *Build note:* RAG over NIST/NTSB + forensic-engineering literature; model extracts causal chains.
- ✦ `[W]` **Material-Aging Forecaster** — how a precedent's materials weather over 10/25/50 years; counters render-fresh-forever bias.
  - *Build note:* RAG over building-pathology/durability literature; per-material aging timelines.
- ✦ `[B]` **Detail-Library Excavator** — extract constructible details from monographs into a searchable, tagged library.
  - *Build note:* vision model finds detail drawings in PDFs, OCRs callouts, indexes to a tagged vector DB.
- ✦ `[B]` `RAP` **Haptic Precedent Models** — turn a precedent's plan/section into a 3D-printable tactile model with raised legends.
  - *Build note:* vectorize plans, extrude relief + Braille labels (OpenSCAD/Grasshopper) → STL.
- ✦ `[D]` **Critic-Voice Simulator** — interrogate a precedent through critical lenses (Banham, feminist-space, disability-justice, climate); stress-test for invented quotes.
  - *Build note:* persona prompts grounded in each critic's cited texts; hallucinated-quote check against source corpus.
- ✦ `[W]` **Precedent Cost & Carbon Decoder** — estimate embodied carbon + rough cost of a canonical building from its structure/envelope.
  - *Build note:* map assemblies to ICE/EC3 carbon + RSMeans cost ranges, with uncertainty bands.
- ✦ `[W]` **Vernacular-Climate Matcher** — retrieve traditional strategies from climates analogous to the studio site.
  - *Build note:* RAG over vernacular corpus tagged by Köppen zone; match on site normals.
- ✦ `[W]` `RAP` **Audio Precedent Walk-Throughs** — first-person spoken walk-through of a building's spatial sequence as an audio essay.
  - *Build note:* model writes phenomenological sequence from plans/sections; expressive TTS + spatial cues.

## 3. Code, Zoning & Compliance

**From the brainstorm:**
- `[W]` **Zoning/code interpreter** · `[B]` **Zoning/setback calculator** · `[B]` **Code-compliance quick-check**.
- `[B]` **Egress-path measurer** · `[B]` **Drawing-set linter / preflight checker** · `[W]` **Code-objection tennis**.
- ✦ `[B]` `RAP` **Accessibility-code checker** · ✦ `[W]` **Spec-vs-drawing contradiction finder**.

**Expanded:**
- ✦ `[B]` **Zoning-Envelope Generator** — parse FAR/height/setback/sky-plane and auto-build the max legal envelope as a 3D massing to design within.
  - *Build note:* parse ordinance → parameters; build envelope from parcel + rules → mesh.
- ✦ `[W]` **Code-Diff Across Jurisdictions** — how the same problem (egress, ADU, mass timber height) differs between two cities or code cycles.
  - *Build note:* RAG over two IBC versions/amendments; structured diff table with citations.
- ✦ `[B]` `RAP` **Inclusive-Restroom Code Navigator** — untangle plumbing-count + ADA clearance + all-gender rules into a compliant fixture schedule + clearance diagram.
  - *Build note:* encode IPC fixture tables + ANSI A117.1 clearances as rules; solver outputs counts + layout.
- ✦ `[B]` `RAP` **Wayfinding & Signage Compliance Checker** — check tactile/Braille placement, mounting height, contrast, audible cues; output a signage schedule.
  - *Build note:* encode ADA 703 rules; place signs at egress/room nodes from the plan graph.
- ✦ `[W]` **Energy-Code Pre-Checker** — run massing/envelope against ASHRAE 90.1 / IECC prescriptive paths; flag early budget busts.
  - *Build note:* encode prescriptive tables; compute WWR + envelope ratios; compare to climate-zone limits.
- ✦ `[D]` `RAP` **Fire-Egress Crowd Simulator** — estimate egress times including wheelchair users + refuge areas, then check against an agent-based sim.
  - *Build note:* IBC occupant-load rules for the prompt; validate against Pathfinder/JuPedSim.
- ✦ `[W]` **Historic-Overlay & Landmark Constraint Reader** — detect historic district / landmark proximity and extract the design-review constraints.
  - *Build note:* NRHP + local landmark GIS; RAG over district design guidelines.
- ✦ `[W]` **Permit-Path Storyteller** — map the realistic approval gauntlet (variances, hearings, CEQA/NEPA/SEQRA) as a sequenced timeline.
  - *Build note:* model assembles jurisdiction-specific permit sequence as a dependency graph.

## 4. Program & Brief

**From the brainstorm:**
- `[W]` **Program-driven plan seeds** · `[B]` **Program-adjacency shuffler** · `[B]` **Program-to-area roundtrip** · `[B]` **Program-area reconciler**.
- `[W]` **Studio brief co-author / stress-tester** · `[W]` **Anti-brief generator** · `[W]` **Constraint-conflict explorer**.
- ✦ `[B]` **Constraint-card lottery** · ✦ `[W]` **Mid-semester program scramble**.

**Expanded:**
- ✦ `[W]` `RAP` **Day-in-the-Life Program Validator** — hour-by-hour narratives of distinct users (night-shift nurse, wheelchair user, toddler, custodian) to stress-test the brief.
  - *Build note:* persona narratives mapped onto room list + adjacencies; flag unserved needs / time conflicts.
- ✦ `[W]` **Program-to-Energy-Load Translator** — convert occupancy/equipment/lighting schedules into a first-pass energy + HVAC load.
  - *Build note:* map space types to ASHRAE/DOE plug-load + occupancy schedules; simplified bin/EnergyPlus-lite model.
- ✦ `[W]` `RAP` **Spoken-Brief Dialogue Builder** — conduct the program interview by voice so a non-visual user can co-author the brief.
  - *Build note:* STT + LLM + TTS loop; model maintains a structured program updated each turn.
- ✦ `[W]` `RAP` **Equity & Access Brief Auditor** — audit a draft brief for who it excludes (mobility, sensory, language, caregiving) and rewrite to widen access.
  - *Build note:* checklist grounded in universal-design standards; model annotates + rewrites brief lines.
- ✦ `[D]` **Shrinking-Budget Negotiator** — a client who keeps cutting budget; exposes which spaces are treated as essential vs. expendable.
  - *Build note:* adversarial client persona over program line-items + cost-per-sf.
- ✦ `[B]` **Program Heat-Map from Real Behavior** — infer realistic utilization/dwell patterns for a building type, replacing guessed bubble diagrams.
  - *Build note:* POI dwell-time data or published utilization studies → occupancy curves + adjacency weights.
- ✦ `[W]` **Future-Proofing Scenario Generator** — how the program should flex under remote work, climate migration, aging occupants, pandemics.
  - *Build note:* scenario prompts seeded with demographic + climate projections → required adaptations.
- ✦ `[B]` **Adjacency-Graph Optimizer** — weighted adjacency graph → optimal stacking/zoning bubble diagrams to argue with.
  - *Build note:* force-directed or ILP layout over adjacency matrix → bubble/stacking diagrams.
- ✦ `[W]` **Brief Contradiction Detector** — scan a brief for internal contradictions (areas that don't sum, security vs. openness, sustainability vs. energy intensity).
  - *Build note:* extract requirement assertions to a constraint set; run consistency/sum checks with citations.

## 5. Concept & Form Generation

**From the brainstorm:**
- `[W]` **Massing variant generator** · `[W]` **Form-from-narrative** · `[W]` **"What would X do" pastiche** · `[W]` **Counter-parti match**.
- `[B]` **Facade-pattern generator** · `[B]` **Magical-realism mood engine** · `[B]` **Chicago-grid rewilding toggle**.
- ✦ `[W]` **Divergence-keeper** · ✦ `[W]` **Field-conditions variant engine**.

**Expanded:**
- ✦ `[D]` **Constraint-Liar Detector** — feed a brief with hidden contradictions; surface which constraint the AI silently dropped to produce a "resolved" form.
  - *Build note:* wrap an LLM form-describer with an auditor pass that re-scores output against each stated constraint.
- ✦ `[W]` **Section-First Generator** — force generation to start from a poché section (structure, ceiling void, daylight throw), then extrude plan.
  - *Build note:* prompt-chain an image model to annotated sections → image-to-curve → loft in Rhino.
- ✦ `[B]` **Typological Morph Slider** — interpolate between two building types (courtyard ↔ slab) and watch where type "breaks."
  - *Build note:* latent/prompt interpolation on a labeled plan-diagram corpus; render in p5.js.
- ✦ `[B]` `RAP` **Negative-Space Parti Engine** — design the *void*; output a tactile relief + visual model so figure is the empty volume.
  - *Build note:* boolean-difference (Rhino.Inside/OpenCASCADE) → STL relief; for the optional audio walkthrough, sonify the void volumes via the shared Web Audio/Tone.js sonification engine (see §11).
- ✦ `[D]` **Program-Adjacency Hallucination Check** — diff the AI's bubble diagram against the brief's required relationships to count invented/dropped connections.
  - *Build note:* LLM emits adjacency graph (JSON); compare to ground-truth graph with NetworkX.
- ✦ `[D]` `RAP` **Sonified Parti** — translate a parti to sound (axis=pitch glide, hierarchy=volume, symmetry=mirrored rhythm) for non-visual review.
  - *Build note:* parse SVG diagram geometry → Tone.js synth parameters.
- ✦ `[B]` **Mood-to-Material Decoupler** — separate a reference image into "mood" vs. "style," regenerate the mood with deliberately wrong styles.
  - *Build note:* CLIP attribute extraction + prompted re-synthesis holding mood tokens fixed.
- ✦ `[B]` **Counterfactual Site Engine** — regenerate the same concept under altered site truths to reveal which moves were site-responsive vs. arbitrary.
  - *Build note:* parametric site-rule object in Grasshopper; vary parameters, re-run the recipe.
- ✦ `[B]` **Sketch-Ambiguity Amplifier** — feed a loose sketch, return several *divergent* confident interpretations instead of one (preserves productive ambiguity).
  - *Build note:* ControlNet scribble with high guidance variance / multiple seeds → contact sheet.

## 6. Parametric, Computation & Geometry

**From the brainstorm:**
- `[B]` **Python-for-Rhino Tutor** · `[B]` **Python Script Builder** · `[W]` **Grasshopper error-doctor** · `[B]` **GH floor-lowering tool**.
- `[W]` **Geometry-from-spec validator** · `[B]` **GHX-snippet synthesizer** · `[B]` **MIDI→GH parameter mapper**.
- `[B]` **Scan-to-model assistant** · `[B]` **Photo-to-measured-drawing** · ✦ **GH-to-plain-English explainer** · ✦ **Reusable site-analysis GH template**.

**Expanded:**
- ✦ `[B]` **NL-to-Grasshopper Graph Compiler** — type "attractor-driven louver field on this surface," get an actual generated `.ghx` (components + wires).
  - *Build note:* LLM emits GhPython/GH_IO XML; validate by round-tripping through Rhino.Inside.
- ✦ `[D]` **Definition Diff & Refactor Tool** — compare two GH definitions, explain what changed in *logic*, flag dead/redundant clusters.
  - *Build note:* parse GHX XML to a graph, diff with NetworkX, summarize with an LLM.
- ✦ `[D]` **Tolerance-Stress Tester** — re-run a parametric model across tolerances/unit scales to reveal where geometry silently fails.
  - *Build note:* RhinoCompute batch varying ModelAbsoluteTolerance; log failures.
- ✦ `[B]` **Constraint Solver Sandbox** — declare relations (adjacent, aligned, min-area), watch a solver satisfy or report infeasibility.
  - *Build note:* CP-SAT (OR-Tools) or spring relaxation in p5.js.
- ✦ `[B]` **Reverse-Parametric Inference** — give a finished form, ask the AI to infer a plausible parametric recipe that could produce it.
  - *Build note:* LLM proposes parameter schema; verify by generating candidates, score with Chamfer/Hausdorff distance.
- ✦ `[D]` **Topology-Optimization Demystifier** — animate the material-removal iterations so students see *why* the organic result emerges.
  - *Build note:* SIMP solver in NumPy; animate density field (matplotlib/three.js).
- ✦ `[B]` `RAP` **Haptic Curvature Reader** — feel a NURBS surface's Gaussian curvature as vibration/pitch (convex hums high, saddles beat).
  - *Build note:* RhinoCommon curvature evaluation streamed to a haptic controller or Web Audio.
- ✦ `[D]` **Mesh-Health Triage Bot** — ranked report of non-manifold edges, naked edges, flipped normals + the minimal fix sequence.
  - *Build note:* trimesh/PyMeshLab diagnostics + LLM fix recipe.
- ✦ `[B]` **Recursion & L-System Lab** — author growth rules; tool flags when recursion explodes before Rhino hangs.
  - *Build note:* Python L-system interpreter with a node-count budget guard; preview in three.js.
- ✦ `[D]` **Units & Datum Sanity Auditor** — catch mm-as-m, model 4 km from origin, mixed CRS on site data, before it poisons downstream work.
  - *Build note:* inspect Rhino/ifcopenshell/GIS metadata; rule-based warnings.
- ✦ `[W]` **Parametric Intent-Drift Tracker** — periodically ask "is this still doing what you said?" as a student edits a definition; log divergence.
  - *Build note:* snapshot GHX states + stated-intent note; LLM compares behavior across snapshots.
- ✦ `[B]` `RAP` **Spatial-Audio Model Navigator** — walk a 3D model with no screen; surfaces/openings emit positional sound cues.
  - *Build note:* Resonance/Web Audio PannerNode over a glTF export; raycast for occlusion.
- ✦ `[D]` **Code-vs-Click Equivalence Drill** — reproduce a result by hand-modeling and by script, diff the two to calibrate "should I automate this?"
  - *Build note:* RhinoCompute runs the script branch; geometric diff against the manual file.

## 7. Performance & Simulation

**From the brainstorm:**
- `[B]` **Sun-path / shadow widget** · `[B]` **Daylight-factor estimator** · `[W]` **Daylight/solar sanity-checker** · `[W]` **Structural plausibility check**.
- `[B]` **Truss-deflection toy / graphic-statics sketch** · `[B]` **Tensile form-finder** · `[W]` **Acoustic/thermal first-pass** · `[B]` **Thermal-bridge/R-value toy**.
- `[B]` **Flood/tidal slider** · `[B]` **Hydrology flow toy** · ✦ **Wind-rose/ventilation sketch** · ✦ `[D]` **Simulation grain test**.

**Expanded:**
- ✦ `[D]` **AI-Physics Lie Detector** — pose qualitative physics questions, then run the real Ladybug/Karamba sim and score how often the AI's confident verbal intuition is wrong. *(Headline "don't trust AI on physics" demo.)*
  - *Build note:* curated question bank; ground truth from Honeybee (EnergyPlus/Radiance) + Karamba3D.
- ✦ `[D]` `RAP` **Sonified Daylight Walk** — convert a Radiance illuminance grid into a soundscape you traverse (brightness=pitch/loudness, glare=harshness).
  - *Build note:* Honeybee/Radiance grid → spatialized Web Audio along a walk path.
- ✦ `[D]` `RAP` **Load-Path Sonification** — play the flow of force through a structure as audio (louder/lower where stress concentrates).
  - *Build note:* Karamba3D or Python FEM (anastruct/PyNite) stress → Tone.js.
- ✦ `[D]` **Surrogate-Model Speed-vs-Truth Demo** — train a fast neural surrogate on real sims, race it against the solver, expose seductive speed + silent error.
  - *Build note:* training set from Honeybee; MLP in scikit-learn/PyTorch; report error *distribution*, not mean.
- ✦ `[W]` **Comfort-Map Storyteller** — run a UTCI/PMV comfort sim, narrate a day in the space tied to actual grid values.
  - *Build note:* Ladybug UTCI/PMV grids + LLM narration grounded in the data table.
- ✦ `[B]` `RAP` **Acoustic Ray-Bounce Toy** — click a source in a section, see/hear early reflections + an audible impulse response (flutter echo, focusing).
  - *Build note:* 2D image-source/ray method in p5.js + convolution reverb from computed IR.
- ✦ `[W]` **Embodied-Carbon First-Pass** — order-of-magnitude embodied carbon from a massing's structure/envelope, dominant contributors flagged.
  - *Build note:* map quantities to EC3/ICE factors; LLM classifies assemblies, numbers from the database.
- ✦ `[D]` **Condensation-Risk Section Probe** — drag a temp/humidity condition across a wall section, watch the dew-point plane move (interstitial condensation).
  - *Build note:* Glaser-method 1D vapor diffusion in Python; animate dew-point vs. temperature gradient.
- ✦ `[D]` **Stochastic Failure Explorer** — Monte Carlo over uncertain loads/properties; show the *distribution* and probability of exceeding limits, not one false-confident number.
  - *Build note:* wrap a PyNite/anastruct FEM in a NumPy Monte Carlo loop; plot exceedance histogram.
- ✦ `[B]` **Thermal-Mass Time-Lag Toy** — slider showing how heavy vs. light walls delay/dampen the daily temperature swing.
  - *Build note:* explicit finite-difference 1D heat equation in NumPy/JS.
- ✦ `[D]` **Multi-Objective Trade-Off Theater** — run daylight vs. energy vs. structure across a range, plot the Pareto front, pick a point and see the form.
  - *Build note:* Honeybee + Karamba objectives into Wallacei/pymoo (NSGA-II); interactive front.
- ✦ `[W]` **Sensor-to-Sim Calibration Loop** — compare a sim prediction against real logged room/site data; propose which assumptions to correct.
  - *Build note:* ingest IoT/CSV logs, diff against Honeybee output, LLM suggests parameter adjustments.

## 8. Representation & Drawing

**From the brainstorm:**
- `[W]` **Diagram-from-text** · `[W]` **Plan/section auto-annotation** · `[W]` **Axon-as-build-sequence explainer** · `[B]` **Axon generator**.
- `[B]` **Line-weight/poché styler** · `[B]` **Board style unifier** · `[B]` **Scroll-driven section reveal**.
- `[W]` **Representation-as-communication trainer** · `[W]` **Representation-politics critique** · ✦ **Drawing-to-specification** · ✦ **Diagram consistency checker**.

**Expanded:**
- ✦ `[B]` `RAP` **Notation Decoder Ring** — surface the *conventions* a drawing relies on (hidden-line meaning, hatch legend, scale abstraction); flag where it breaks its own rules. Emits a spoken/Braille legend too.
  - *Build note:* vision LLM + a rules table of drafting conventions; SVG callout overlay.
- ✦ `[D]` **Section-Cut Negotiator** — generate ten candidate cut lines, argue what each reveals vs. conceals; attacks the "cut through the middle" reflex.
  - *Build note:* slice a mesh at N planes (trimesh), render each, LLM critiques the rhetorical payload.
- ✦ `[B]` **Scale-Abstraction Ladder** — re-render one drawing at 1:500/1:200/1:50/1:5 *correctly*, dropping/adding detail per scale.
  - *Build note:* parametric SVG line-weight + detail-culling rules keyed to scale; Douglas-Peucker simplification.
- ✦ `[D]` **Poché Politics Mapper** — fill wall poché under competing logics (structural / thermal / served-servant / Nolli) and ask which argument the black wall makes.
  - *Build note:* region fill on closed wall polygons (Shapely); swappable styles; LLM caption per logic.
- ✦ `[D]` **Drawing Genealogist** — name the historical lineage a board's graphic language quotes (Mies axon, OMA diagram, SANAA thinness).
  - *Build note:* CLIP-style retrieval against a curated corpus of canonical drawing styles + LLM commentary.
- ✦ `[D]` **Figure-Ground Inverter** — flip a plan between solid-as-building and solid-as-void (Nolli); reveals figure-ground as an argument about publicness.
  - *Build note:* boolean invert on poché vector; p5.js toggle.
- ✦ `[B]` `RAP` **Tactile Plan Translator** — vector plan → swell-paper tactile graphic: simplified line hierarchy, texture-coded materials, Braille key, validated against tactile-legibility minimums.
  - *Build note:* SVG simplification + texture substitution + Braille key; export embosser/swell-paper format.
- ✦ `[B]` `RAP` **Sonified Section** — drag a listening cursor across a section; height/void/material map to pitch, timbre, texture.
  - *Build note:* parse section raster column-by-column → Web Audio/Tone.js; p5.js scrub interface.
- ✦ `[W]` `RAP` **Drawing-to-Walkthrough Narrator** — structured spoken spatial description of a plan/section using a consistent vocabulary (sequence, threshold, light, proportion).
  - *Build note:* vision LLM with a fixed spatial-description schema; TTS output.
- ✦ `[B]` **Hatch-as-Data Linter** — check that every hatch/line-type maps to exactly one meaning across all sheets; flag collisions.
  - *Build note:* vector layer/pattern extraction (DXF/SVG) + consistency table.
- ✦ `[D]` **Diagram Honesty Auditor** — take a slick parti diagram and ask "does the building actually do this?" against the plan geometry.
  - *Build note:* vision LLM compares diagram arrows/zones to measured plan regions; flag unsupported claims.
- ✦ `[B]` **Axon Explosion Choreographer** — exploded axon with controllable vector/grouping, exposing the *ordering* decision (by assembly? trade? concept?).
  - *Build note:* 3D model layer offset (three.js/Blender Python) + SVG leader-line overlay.
- ✦ `[D]` **One-Line Plan Reducer** — strip a plan to the fewest lines that still communicate; defend each surviving line.
  - *Build note:* progressive vector simplification with an LLM "is the parti still legible?" check per step.

## 9. Image Generation & Visualization *(Anti-Pinterest lane)*

**From the brainstorm:**
- `[D]` **"Read the corpus"** · `[D]` **Generic-drift autopsy** · `[W]` **Atmospheric render recipe** · `[B]` **Sketch-conditioned image gen** (ControlNet).
- `[W]` **Render-finishing pass** · `[D]` **Style-transfer failure** · `[D]` **Image-gen reduction critique**.
- ✦ `[B]` **ComfyUI node-pipeline demo** · ✦ `[B]` **Train-your-own-grain (LoRA)** · ✦ `[W]` **"Ugly-months" renderer**.

**Expanded:**
- ✦ `[D]` **Default Census** — run a neutral prompt at 100 seeds, chart the recurring tropes (gable, glass corner, dusk, no people) as the model's worldview.
  - *Build note:* batch SD/Flux + auto-tagging (CLIP/vision LLM) + matplotlib frequency chart.
- ✦ `[D]` `RAP` **Who's-Missing Audit** — inventory what *never* appears (ramps, transit, rain, density, aging, repair, non-Western context).
  - *Build note:* negative-presence tagging across a seed batch; LLM compiles the "absent set."
- ✦ `[D]` **Prompt-Wording Sensitivity Lab** — hold scene fixed, vary one charged word ("affordable" vs "luxury"); view the visual deltas.
  - *Build note:* controlled prompt grid, fixed seed; optional pixel-delta heatmap.
- ✦ `[B]` **Disposable-by-Design Sketchpad** — a render UI where every output is auto-stamped "STUDY — not a proposal," ephemeral unless you "rescue" it.
  - *Build note:* img2img wrapper + auto-expiry storage + watermark; "rescue" promotes to a saved folder.
- ✦ `[W]` **Massing-Locked Variator** — lock your geometry via depth/edge ControlNet; vary only material/light/season. Keeps authorship with the student.
  - *Build note:* Depth + Canny ControlNet from your model render; vary prompt only on surface/atmosphere.
- ✦ `[D]` **Material Hallucination Detector** — flag physically impossible render conditions (floating cantilevers, frameless glass, seamless infinite spans).
  - *Build note:* vision LLM with a constructability-tells checklist; annotate suspect regions.
- ✦ `[D]` **Render-to-Section Back-Translator** — force the student to draw the wall section that would make a seductive render real; critique the gap.
  - *Build note:* vision LLM estimates implied assemblies + what a section must resolve; compare to student's section.
- ✦ `[D]` **Seed-Spread Honesty Card** — every saved image carries prompt, seed, model, sibling-discard count, and what was cherry-picked.
  - *Build note:* embed generation metadata + discard count into caption/EXIF.
- ✦ `[W]` `RAP` **Populated-Reality Injector** — force real use into the render: wheelchair users, strollers, maintenance, crowding, wear.
  - *Build note:* inpaint/regional prompting to add diverse occupancy; checklist-driven coverage.
- ✦ `[B]` `RAP` **Describe-Before-You-Generate Gate** — student writes a spatial description first; after rendering, tool generates an independent description and diffs intent vs. result.
  - *Build note:* two-stage LLM (capture intent → vision-describe render → diff drift).
- ✦ `[D]` **Statistical-Mean Visualizer** — average 200 generations of one prompt into a single blurred "mean image"; makes central tendency viscerally ugly.
  - *Build note:* pixel-average a large aligned batch; show the mush next to individuals.
- ✦ `[D]` **Negative-Prompt Archaeology** — surface what common negative prompts banish ("no people, no cars") and what worldview that hygiene encodes.
  - *Build note:* generate with/without standard negative-prompt stacks; tag the differences.
- ✦ `[D]` `RAP` **Caption-Drift Telephone** — render → describe → re-render from the description → repeat; watch the building mutate toward the mean.
  - *Build note:* loop img→caption→img with logged intermediate states; assemble a drift strip.

## 10. Fabrication & Material Output

**From the brainstorm:**
- `[B]` **Cut-list / material-takeoff generator** · `[B]` **Laser-cut prep / nesting optimizer** · `[B]` **Unroll/unfold tool** · `[B]` **Waffle/contour structure generator**.
- `[B]` **Assembly-sequence generator** · `[W]` **3D-print slicing advisor** · ✦ **CLT/panel-layout comparator** · ✦ **Takeoff→embodied-carbon bridge**.

**Expanded:**
- ✦ `[B]` **Kerf & Tolerance Tutor** — measure every slot/tab against actual material thickness + kerf and rewrite geometry so press-fits actually fit.
  - *Build note:* parse DXF joints, offset by measured kerf, regenerate tabs/slots → corrected DXF.
- ✦ `[D]` **Grain & Anisotropy Advisor** — flag thin features running cross-grain (ply, MDF, acrylic) that will snap; suggest rotation in the nest.
  - *Build note:* detect part aspect ratio/orientation vs. grain axis; recommend rotation.
- ✦ `[D]` **Slice-Direction Critic** — compare horizontal vs. vertical vs. radial slicing for legibility, strength, material use; slicing as a design decision.
  - *Build note:* multi-axis slicing (trimesh) + scored comparison on overhang/part-count/readability.
- ✦ `[D]` **Toolpath Honesty Preview** — simulate what the CNC/laser actually produces (corner radii from bit dia, scorch, overcut) vs. the idealized vector.
  - *Build note:* offset toolpath by tool radius; render dogbones/fillets/scorch as overlay.
- ✦ `[B]` `RAP` **Tactile Model Generator** — design → haptic study model spec: exaggerated texture-coded materials, raised circulation, Braille-labeled rooms, sized for hand-reading.
  - *Build note:* mesh + texture-region assignment → 3D-print/CNC toolpaths with raised glyphs; auto-place Braille.
- ✦ `[D]` **Print-Failure Forecaster** — pre-flag overhangs, thin walls, islands, bridging that will fail before slicing, with printer/material-specific fixes.
  - *Build note:* mesh analysis (wall thickness, overhang angle, island detection) + annotated report.
- ✦ `[B]` **Joint Library Synthesizer** — describe a connection in words, get parametric fabrication-ready joint options with trade-offs.
  - *Build note:* parametric joint templates (finger/mortise/cross-lap/dado) → DXF/STEP; LLM matches intent→type.
- ✦ `[B]` **Offcut Optimizer** — nest to minimize waste *and* report the embodied footprint + dollar cost of the leftover.
  - *Build note:* bin-packing (rectpack/SVGnest) + waste-area → cost/carbon lookup.
- ✦ `[B]` `RAP` **Material-Sound Sampler** — pair each fabrication material with its tap/scratch/handling sound + weight for non-visual material review.
  - *Build note:* curated audio sample library keyed to material; browser player tied to the takeoff list.
- ✦ `[B]` **Fold-and-Score Unroller** — unfold curved/faceted surfaces into flat cut sheets with mountain/valley marks + glue tabs; check it re-folds without collision.
  - *Build note:* mesh unfolding (Blender Paper Model / LSCM) + score/tab annotation + re-fold collision check.
- ✦ `[D]` **Machine-Time & Energy Estimator** — estimate cut/print time + energy per scheme against shared-shop reality and carbon.
  - *Build note:* toolpath length / layer count → time model + machine wattage → energy/carbon.
- ✦ `[B]` **Stacked-Contour Registration Helper** — auto-generate alignment jigs, registration holes, numbered layers so a 40-layer topo stack assembles.
  - *Build note:* add registration geometry across the slice stack (trimesh); auto-number + emit assembly map.
- ✦ `[D]` **Two-Machine Translator** — show how one part changes if made on laser vs. CNC vs. 3D print vs. hand (tolerances, joints, grain, finish).
  - *Build note:* rule-based transformation of joint/tolerance/feature set per machine → comparison sheet.

## 11. Accessibility / RAP / Multimodal *(your research lane — go deep here)*

> **Every entry in this section is `RAP`** — the tag is dropped on the lines below only to reduce clutter; treat the whole section as the accessibility lane.

**From the brainstorm:**
- `[B]` **RAP non-visual CAD** · `[B]` **Sonic Navigator** · `[B]` **Spatial-audio room walkthrough** · `[B]` **Geometry-to-sound sketch** · `[B]` **Section-to-soundwalk**.
- `[B]` **Three.js mobile spatial viewer** · `[B]` **Tactile output pipeline** · `[B]` **Tactile-legend maker / tactile-drawing converter** · `[B]` **Text-described plan generator**.
- `[D]` **Screen-reader discipline test** · `[W]` **Screen-reader design audit** · `[B]` **Auto-caption/transcript tool** · `[B]` **Plain-language brief rewriter**.
- `[B]` **Reduced-motion/high-contrast variant** · `[D]` **Keyboard-only navigation test** · `[B]` **Multisensory site doc** · `[W]` **Translation-loss experiment** · ✦ **Alt-text accuracy checker** · ✦ **Contamination-to-soundscape**.

**Expanded (RAP frontier):**
- ✦ `[B]` `RAP` **Echo-Plan** — synthetic acoustic walkthroughs so blind users can "hear" room size, materials, reverberation before construction.
  - *Build note:* room geometry + materials → acoustic ray-tracing impulse response (**Steam Audio** or **pyroomacoustics** — *not* Resonance, which only spatializes, it doesn't compute room IRs); convolve footstep/clap samples; deliver over headphones (Resonance fine for the final spatial playback stage).
- ✦ `[B]` `RAP` **Material-to-Texture Sonifier** — map materials (brick, glass, felt, water) to distinct timbres so panning across a section "sounds" its materiality.
  - *Build note:* per-material Tone.js presets (granular=rough, sine=glass) driven by material IDs from the CAD layer.
- ✦ `[D]` `RAP` **Tactile-Print QA Scanner** — photograph an embossed/swell-paper drawing, check line-separation + dot spacing against BANA standards.
  - *Build note:* camera + classical CV (edge/contour distance) + LLM-vision scoring against codified BANA rules.
- ✦ `[B]` `RAP` **Haptic Floor-Plan Glove** — drag a finger across a touchscreen plan; actuators pulse at walls, buzz at doors, change frequency by room.
  - *Build note:* web touch events → plan vector geometry → ERM/LRA actuators (or phone Vibration API).
- ✦ `[B]` `RAP` **Depth-Camera Soundscape** — convert a live depth feed of a real site into continuous stereo audio for on-site non-visual documentation.
  - *Build note:* pick one coherent stack — **native iOS** (ARKit LiDAR + AVAudioEngine) *or* **WebXR depth-sensing** (Android/Chrome) + Web Audio. (ARKit raw depth can't reach a browser's Web Audio, so don't mix them.) depth-to-audio via vOICe-style sweep.
- ✦ `[W]` `RAP` **Verbal Massing Narrator** — describe a 3D massing in embodied spatial language ("a low wing steps down to the south").
  - *Build note:* render ortho/ISO views → vision LLM with a structured spatial-description template, oriented to a stated viewer position.
- ✦ `[D]` `RAP` **Translation-Fidelity Scorer** — have someone/something reconstruct a space from a description, then measure geometric error vs. the original. *(Core RAP rigor: accurate, not just plausible.)*
  - *Build note:* round-trip model→representation→reconstruction→IoU/Hausdorff error, logged per representation type.
- ✦ `[D]` `RAP` **Ambiguity Flagger** — flag spatial statements in alt-text/descriptions that admit multiple readings ("near the entrance," "a large room").
  - *Build note:* LLM classifier on a spatial-ambiguity taxonomy; optionally cross-check against model coordinates.
- ✦ `[B]` `RAP` **Soundmark Wayfinding Composer** — give each landmark/zone a recurring audio motif so a route is learned as a sequence of sounds.
  - *Build note:* procedural motif generator (Tone.js) keyed to space IDs; triggered along a path graph.
- ✦ `[B]` `RAP` **Braille Schedule Generator** — convert door/window/finish schedules + room data sheets into Braille-ready files (the building's *data*, not just drawings).
  - *Build note:* parse BIM schedule tables → liblouis → BRF for embossers; preserve tabular structure.
- ✦ `[D]` `RAP` **Multisensory Section Bench** — present one section three ways (spoken, sonified, tactile), quiz a user on height/level/openings to compare what each channel conveys.
  - *Build note:* web app serving synchronized audio/text/tactile artifacts + a per-channel comprehension quiz.
- ✦ `[W]` `RAP` **Spatial-Audio Door Pass** — doors/thresholds emit directional 3D-audio cues so users orient by ear at decision points.
  - *Build note:* WebAudio PannerNode (HRTF) on door nodes in a three.js scene; gain tied to listener position.
- ✦ `[B]` `RAP` **Tactile Symbol Librarian** — maintain + auto-apply a consistent learnable tactile-symbol legend across a whole set.
  - *Build note:* symbol→texture lookup DB; SVG/STL pattern fills at export; LLM checks new drawings for symbol collisions.
- ✦ `[B]` `RAP` **Smell-and-Sound Site Log** — field-capture app prompting non-visual site qualities (traffic noise, echo, wind, smell, surface underfoot) as geotagged annotations.
  - *Build note:* mobile PWA: audio recording + structured sensory tags + GPS; LLM synthesizes a multisensory report.
- ✦ `[D]` `RAP` **Vision-Model Drawing Critic** — feed a plan to a vision LLM told to *act blind* (describe only what tactile/audio would convey); surfaces info living only in fine visual detail.
  - *Build note:* constrained low-bandwidth prompt; diff against a full-detail description to quantify loss.
- ✦ `[B]` `RAP` **Reverb-Coded Volume Cue** — reverb time scales with room volume as a user moves, so "bigger sound" = bigger room, no verbal label.
  - *Build note:* map room volume → convolution reverb decay in Web Audio, updated by listener position.
- ✦ `[W]` `RAP` **Non-Visual Design Origin Story** — design first in sound/word/touch, draw later; tests whether non-visual representation can be *generative*, not just translational.
  - *Build note:* constrained-tooling brief; capture sonic/verbal sketches (Tone.js + voice memos), reconstruct to CAD, compare to intent.
- ✦ `[B]` `RAP` **Live Caption Spatializer** — place captions spatially in a recorded crit/site video, tagging who/where sound comes from (deaf/HoH multi-speaker review).
  - *Build note:* diarization + sound-source localization → positioned caption tracks.
- ✦ `[D]` `RAP` **Tactile-Scale Calibrator** — check that a tactile model/print's smallest meaningful feature survives at scale + print resolution (won't fuse under a fingertip).
  - *Build note:* compute min feature size vs. ~1–2mm fingertip threshold; flag sub-threshold features.
- ✦ `[B]` `RAP` **Sun-Path Sonification** — turn daylight analysis into a daily audio arc (timbre tracks sun angle/intensity per room).
  - *Build note:* feed Ladybug solar time-series into a timbre/amplitude envelope in Tone.js.
- ✦ `[W]` `RAP` **Wayfinding Verbal-Route Generator** — turn-by-turn embodied directions keyed to non-visual landmarks (textures underfoot, sound zones, thresholds).
  - *Build note:* path graph from the plan + LLM rendering steps against the tagged non-visual landmark legend.
- ✦ `[D]` `RAP` **Multimodal Redundancy Auditor** — check that every critical fact is available in ≥2 sensory channels (no vision-only information). Operationalizes "equivalent experience."
  - *Build note:* inventory info items, tag channels, flag single-channel facts; LLM coverage matrix.
- ✦ `[B]` `RAP` **Crowd-Acoustics Predictor** — simulate how a space sounds *when occupied* (murmur, masking) so you know if a blind user can still navigate by ear.
  - *Build note:* acoustic sim + occupancy noise; compute speech-transmission index + audibility of cues under load.
- ✦ `[D]` `RAP` **Tactile-Diff Viewer** — between two iterations, generate a tactile/audio summary of *what changed* so a blind reviewer needn't re-read the whole set.
  - *Build note:* geometric diff of two models → changed-element list → tactile overlay or spoken change-log.
- ✦ `[W]` `RAP` **Onomatopoeic Material Describer** — rich sensory-word descriptions of materials (how they sound tapped, feel, hold temperature) for verbal material palettes.
  - *Build note:* LLM from material spec + acoustic/thermal properties → structured multisensory descriptors.

## 12. Budget, Cost & Logistics

**From the brainstorm:**
- `[B]` **Remediation-cost estimator** · `[B]` **Embodied-carbon estimator** · `[B]` **Inference-cost ledger**.
- ✦ `[B]` **Project budget builder** · ✦ `[W]` **Budget-shock scenario** · ✦ `[B]` **Fee/proposal drafter**.

**Expanded:**
- ✦ `[B]` `RAP` **Tactile-Output Cost Estimator** — cost/time of producing accessible deliverables (embossing, swell paper, tactile 3D prints, audio production). *(Usually a forgotten budget line.)*
  - *Build note:* parametric model keyed to sheet count, print method, model volume, narration minutes.
- ✦ `[W]` **Procurement Lead-Time Oracle** — flag long-lead materials/equipment in a spec; estimate schedule impact + substitutions.
  - *Build note:* LLM extracts spec items → join to a lead-time reference table → critical-path items.
- ✦ `[D]` **Value-Engineering Negotiator** — roleplay a budget cut, propose trades, defend design intent. *(Rehearses the hardest real meeting.)*
  - *Build note:* LLM with program + cost data, prompted as a hostile-but-fair VE consultant.
- ✦ `[W]` `RAP` **Grant & Accessibility-Funding Finder** — find grants/incentives that fund accessibility/universal-design features; draft eligibility notes.
  - *Build note:* web search + retrieval over grant DBs; match project features to program criteria.
- ✦ `[W]` **Logistics Site-Sequencing Planner** — phased staging plan (deliveries, crane reach, access), flag conflicts.
  - *Build note:* LLM over site constraints + a simple geometric reach/access check.
- ✦ `[B]` **Lifecycle Cost-vs-Carbon Tradeoff** — plot first cost against operating cost + embodied carbon for design options.
  - *Build note:* multi-objective table → Pareto-front visualization.

## 13. Critique, Judgment & Interrogation *(AI as opponent / referee)*

**From the brainstorm:**
- `[W]` **Critique adversary** · `[D]` **Sycophancy probe/trap** · `[W]` **Argue-against-itself crit** · `[W]` **Blind-spot finder** · `[W]` **Jury-prep/panel simulator**.
- `[W]` **Comparative-judgment trainer** · `[B]` **Multi-agent crit panel** · `[D]` **Cross-examination relay** · `[W]` **Rubric-grounded feedback**.
- `[W]` **Dimension audit (with false-positive hunt)** · `[W]` **Citation referee** · `[D]` **Confidence-calibration trainer** · ✦ **Value-engineering villain** · ✦ **Material thesis sparring**.

**Expanded:**
- ✦ `[B]` **Crit Weather Report** — forecast the 5 most likely critic questions + rate each "fair / loaded / out-of-scope" so students triage critique.
  - *Build note:* rubric JSON of question archetypes + RAG over past crit transcripts; ranked forecast with confidence.
- ✦ `[W]` `RAP` **Disagreement Quorum** — run a scheme past three personas (preservationist, developer, disabled end-user); surface only where they *disagree*.
  - *Build note:* multi-agent with fixed persona prompts; diff transcripts, report intersection-of-disagreement.
- ✦ `[D]` **Referee vs. Player Split** — same model defends the scheme, then referees that defense against the rubric; watch the voices contradict.
  - *Build note:* two-pass prompt with role separation; render side-by-side, highlight self-contradictions.
- ✦ `[W]` `RAP` **Stakes Escalator** — re-run a critique at three stakes ("desk crit" → "client board" → "public ADA complaint hearing"); same flaw, changing weight.
  - *Build note:* parameterized severity prompt; tag each line with the level at which it disqualifies.
- ✦ `[B]` `RAP` **Silence Auditor** — flag what critics *never* asked about (egress, acoustics, maintenance, non-visual wayfinding). Absence as data.
  - *Build note:* checklist coverage diff over transcript; report uncovered rubric dimensions.
- ✦ `[D]` **Counterfactual Brief Swap** — feed a design into a critique engine but secretly swap the program; if the critique still "works," the design is generic.
  - *Build note:* brief-variable templating; compare critique deltas across swapped briefs.
- ✦ `[B]` **Objection Tier-List** — sort objections into "kills the project / reshapes it / cosmetic" for calibrated prioritization.
  - *Build note:* severity-classification prompt with rubric anchors → ranked triage card.

## 14. Documentation, Process & Reflection *(AI as scribe; "grade the trace")*

**From the brainstorm:**
- `[B]` **AI-use disclosure tool** · `[B]` **Design version-control / AI-seam logger** · `[W]` **Process-journal interrogator** · `[W]` **Self-interrogation log**.
- `[B]` **Crit-notes synthesizer / desk-crit action items** · `[B]` **Decision-log compiler** · `[B]` **Review-transcript revision brief** · `[B]` **Studio FAQ accumulator / living shop manual** · `[B]` **Presentation self-transcript**.
- `[D]` **"Looked right, was wrong" log** · `[D]` **Before/after refactor diff** · `[D]` **Prompt-evolution journal** · `[B]` **Failure museum** · `[B]` **Grain field-guide** · ✦ **Four-line log template**.

**Expanded:**
- ✦ `[B]` **Trace Grader Rubric Engine** — *(assessment centerpiece)* ingest a student's full session log + git history, score the *process* (skepticism, overrides, provenance), not the artifact.
  - *Build note:* rubric JSON + transcript/git parser; per-dimension scores with cited line numbers as evidence.
- ✦ `[B]` **Override Ledger** — auto-extract every moment the student rejected/modified an AI suggestion and why. The record that they stayed the cognitive agent.
  - *Build note:* parse logs for accept/reject/edit events; tabulate override-rate + reasons over time.
- ✦ `[D]` **Offload Heatmap** — visualize which cognitive tasks (ideation, drawing, calc, writing) were offloaded vs. done by hand, across a project.
  - *Build note:* tag transcript turns by task type → static heatmap + reflection prompt.
- ✦ `[B]` **Provenance Watermark Sidecar** — every exported drawing/image gets a sidecar logging model, prompt, seed, date, human edits. Provenance travels with the asset.
  - *Build note:* write JSON/XMP sidecar on export; embed a content-credentials-style manifest hash.
- ✦ `[W]` **Seam Diff Narrator** — given before/after versions, narrate *where the human hand entered* the AI output so students can defend authorship.
  - *Build note:* image/text diff + "describe human intervention" prompt → annotated seam list.
- ✦ `[D]` **Reflection Anti-Sycophancy Pass** — student writes a reflection; a model is told to *disbelieve* it and find contradicting evidence in the log. Guards against tidy retroactive stories.
  - *Build note:* adversarial prompt grounded in the actual transcript; report claim-vs-evidence mismatches.
- ✦ `[B]` **Dead-End Archive** — capture abandoned branches (failed prompts, dropped schemes) with a one-line autopsy each; values discarded labor.
  - *Build note:* git branch/tag harvesting; auto-draft autopsy stubs the student completes.
- ✦ `[B]` **Decision Provenance Graph** — directed graph linking each final decision back to the turn, reading, or precedent that caused it.
  - *Build note:* entity-link decisions to log events; render with D3/Mermaid.
- ✦ `[D]` **Time-on-Trace Estimator** — use log timestamps to estimate think-time vs. generate-time; flag bursts of un-reflected acceptance.
  - *Build note:* inter-turn timestamp analysis.
- ✦ `[W]` `RAP` **Audio Process Journal** — narrate decisions aloud; transcribed, summarized, interrogated by AI. Lowers the documentation burden; supports non-writing + low-vision students.
  - *Build note:* speech-to-text → summarizer → interrogation prompt; transcript is the canonical log.

## 15. Portfolio, Web & Communication

**From the brainstorm:**
- `[B]` **Website Portfolio Design** · `[B]` **Adobe HTML Replacement Widgets** · `[B]` **Portfolio site in a session** · `[B]` **Single-file practice site** · `[B]` **Practice-website builder**.
- `[B]` **Portfolio narrative drafter** · `[B]` **Studio zine generator** · `[B]` **Cohort gallery / awards portal** · ✦ **Public-comment drafter** · ✦ **QR pin-up generator**.

**Expanded:**
- ✦ `[B]` **Provenance-Aware Portfolio** — each project optionally exposes its AI-use disclosure + trace summary as a toggleable layer. Honesty as a feature.
  - *Build note:* static site gen with a per-project "provenance drawer" from the disclosure tool's JSON.
- ✦ `[B]` `RAP` **Screen-Reader-First Portfolio** — build the semantic/audio version *first* (alt text, reading order, described drawings), visual layout second. Dogfoods RAP's mission.
  - *Build note:* semantic HTML + ARIA scaffolding before CSS; AI-drafted alt text, student-reviewed.
- ✦ `[W]` **Audience Re-Voicer** — re-pitch one project description for three readers (hiring partner, planning board, twelve-year-old).
  - *Build note:* parameterized rewrite prompt → tabbed variants.
- ✦ `[B]` `RAP` **Drawing-to-Caption Pipeline** — batch first-draft captions + long-form alt text for every drawing, which students must correct. Teaches AI alt text is a starting grain, not truth.
  - *Build note:* vision model over image folder → caption JSON → student edit pass logged as overrides.
- ✦ `[W]` **Talk-Track Generator** — timed spoken script synced to slides, then cut to fit a 4-minute pin-up. Communication under time pressure.
  - *Build note:* slide-notes → script → length-constrained re-edit with per-slide timing cues.
- ✦ `[B]` **Cohort Provenance Index** — class-wide site aggregating each student's disclosure + offload profile into a transparent, comparable index.
  - *Build note:* static site aggregating per-student JSON manifests; sortable table.

## 16. Studio Operations & Pedagogy Infrastructure

**From the brainstorm:**
- `[B]` **Reading-to-flashcards tool** · `[W]` **Reading-discussion seeder** · `[B]` **Office-hours / studio FAQ bot** · `[W]` **Differentiated scaffolding**.
- `[B]` **Studio scheduler / crit-order randomizer** · `[B]` **Peer-review allocator/matchmaker** · `[B]` **CLAUDE.md authoring exercise** · `[B]` **Studio-brief MCP micro-server**.
- ✦ `[W]` **"Steal your own assignment" diagnostic** · ✦ `[B]` **Cognitive-load leveler / multilingual support**.

**Expanded:**
- ✦ `[W]` **Rubric Co-Authoring Workshop** — students draft the trace-grading rubric *with* the AI in week one, then are graded by it. Gives ownership of assessment.
  - *Build note:* collaborative rubric-JSON editing session; freeze the artifact as the term's grading contract.
- ✦ `[B]` `RAP` **Studio Knowledge MCP** — an MCP server exposing the brief, readings, precedent library, and accessibility standards as live tools every student's Claude can query.
  - *Build note:* MCP server wrapping a RAG index of course docs + standards.
- ✦ `[B]` **Crit-Load Balancer** — schedule desk crits + pin-up order to equalize fatigue (no student always last), randomize pairings.
  - *Build note:* constraint solver over availability + fairness rules → calendar export.
- ✦ `[B]` **Prompt Pattern Library** — a curated, versioned repo of studio-sanctioned prompt patterns with failure-mode notes. Institutional memory across cohorts.
  - *Build note:* git repo + static index; each entry tagged with model, date, observed failure mode.
- ✦ `[B]` `RAP` **Standards Drift Sentinel** — a persistent scheduled agent that re-checks whether referenced accessibility codes/standards have updated; flags drift before students cite stale rules.
  - *Build note:* scheduled WebSearch/WebFetch diff against known standard URLs.
- ✦ `[B]` `RAP` **Differentiated Brief Lens** — re-render the single brief at multiple support levels + languages without changing requirements. Equity of access to the assignment itself.
  - *Build note:* templated rewrite with reading-level + translation params; instructor approves each variant.
- ✦ `[W]` **Office-Hours Triage Digest** — aggregate the week's AI-conversation logs to surface the top 3 confusions so you teach to actual gaps.
  - *Build note:* cluster anonymized log excerpts → recurring stuck-points → teaching agenda.

## 17. Stakeholder & Synthetic-World Simulation

**From the brainstorm:**
- `[W]` **Difficult-client roleplay** · `[W]` **Community-meeting simulation** · `[W]` **Code-official roleplay** · `[W]` **Accessibility-consultant persona** (RAP).
- `[W]` **Use-case walkthrough panel** · `[W]` **Construction-sequence narrator** · `[W]` **2076 inspection / "ugly-months" stress test** · ✦ **Adversarial-student simulator**.

**Expanded:**
- ✦ `[D]` `RAP` **Blind-Occupant Walkthrough Persona** — AI roleplays a blind/low-vision occupant narrating where they get lost and where cues fail. Puts the lab's core user in every review.
  - *Build note:* LLM persona with realistic non-visual navigation strategies, driven over the verbal/sonic representation (not the visual one).
- ✦ `[D]` `RAP` **Disability-Diverse Review Panel** — a panel (wheelchair, deaf, low-vision, cognitive, deafblind) each critiquing from lived constraints; surfaces conflicts between access needs.
  - *Build note:* multi-agent panel, each with a constraint profile + needs checklist; a moderator agent surfaces conflicts.
- ✦ `[D]` `RAP` **Service-Animal & Mobility-Aid Simulator** — how a guide dog, white cane, or wheelchair interacts with actual geometry (turning radii, cane-detectable edges, overhead hazards).
  - *Build note:* geometric checks (swept turning circles, cane-sweep zones, head-height obstructions) narrated by an LLM.
- ✦ `[D]` `RAP` **Emergency-Egress-for-All Drill** — evacuation for occupants who can't see exit signs or hear alarms; tests whether multisensory cues actually guide them out.
  - *Build note:* agent-based egress sim with per-agent sensory limits; check redundancy of visual/audible/tactile cues.
- ✦ `[W]` **Synthetic Occupancy-Over-Time Simulator** — roleplay the building across years/seasons (move-in, peak use, neglect, retrofit) to stress-test durability/adaptability.
  - *Build note:* LLM scenario generator producing dated occupancy vignettes; flag assumptions that break.
- ✦ `[D]` **Maintenance-Staff Persona** — the custodian/facilities tech who must clean, repair, and reach everything; flags unmaintainable details.
  - *Build note:* LLM persona seeded with maintenance-access standards, walked through details + MEP.
- ✦ `[D]` `RAP` **Sensory-Overload Condition Simulator** — how the space reads for neurodivergent/sensory-sensitive users under glare, echo, crowding, flicker.
  - *Build note:* combine daylight-glare + acoustic + crowding analyses; LLM interprets against sensitivity profiles.
- ✦ `[D]` `RAP` **Adversarial Accessibility-Auditor** — a hostile officer hunting for cheapest *technically-compliant-but-actually-inaccessible* solutions, so students exceed the letter of code.
  - *Build note:* LLM seeded with ADA + a catalog of "compliant but unusable" failures, prompted to attack.
- ✦ `[W]` **Translator-in-the-Loop Client** — a client/community speaking a different language or jargon level, forcing communication across a comprehension gap.
  - *Build note:* LLM client with constrained vocabulary/language; success = mutual-understanding checks.

## 18. Ethics, Provenance & Meta / AI-Literacy

**From the brainstorm:**
- `[D]` **Red-team the model / "break the AI"** · `[D]` **Known-answer probe** · `[D]` **Specificity ladder** · `[D]` **Context-decay demo** · `[D]` **Prompt-injection sandbox** · `[D]` **Assumption audit**.
- `[D]` **Five-tool / two-model bake-off** · `[B]` **Build a tiny eval** · `[D]` **Whose-aesthetic / representation audit** · `[D]` **Training-data provenance probe** · `[W]` **Bias/representation auditor** · `[W]` **Licensing/attribution helper**.
- `[W]` **Steelman drill** · `[D]` **Desirable-difficulty / skill-transfer self-test** · ✦ **Cognitive-offload demonstration** · ✦ **Approved-vs-frontier equity brief**.

**Expanded:**
- ✦ `[D]` **Hallucinated Precedent Trap** — ask for real precedents/citations, then verify each; the planted fabrications become a graded skepticism lesson.
  - *Build note:* prompt likely to yield plausible-but-fake refs + a verification worksheet scoring catch-rate.
- ✦ `[D]` **Same-Prompt Drift Log** — run the identical prompt on day 1 and day 60 (or across model versions) and diff; makes non-determinism + silent updates tangible.
  - *Build note:* stored prompt + dated outputs; automated diff with change-highlighting.
- ✦ `[B]` **Consent & Sourcing Card** — for any image/site/person fed into a tool, generate a card recording consent, license, and whether real people/places are depicted. Provenance at *input*.
  - *Build note:* short form → structured card JSON attached to the asset's sidecar.
- ✦ `[D]` **Aesthetic Monoculture Meter** — generate 20 schemes from neutral prompts and measure their visual sameness; then prompt *against* the mean.
  - *Build note:* image-embedding clustering of a batch; report variance + a "centroid" image to deviate from.
- ✦ `[D]` `RAP` **Access-Equivalence Audit** — test whether an AI-generated representation conveys the same information non-visually as visually (does the alt text carry the spatial argument?).
  - *Build note:* generate visual + textual versions, quiz a fresh model on each, compare answer fidelity.
- ✦ `[D]` **Offload Skill-Decay Self-Test** — a short un-aided exercise (sketch a stair section, size a beam) repeated across the term to measure whether reliance is eroding a core skill.
  - *Build note:* pre/post timed manual tasks, self-scored against a key; chart trajectory. *(Pairs with Offload Heatmap.)*
- ✦ `[D]` **Frontier-vs-Approved Parity Probe** — run the same task on the school model and a frontier model; document the capability gap to reason about equity.
  - *Build note:* paired runs + side-by-side rubric scoring + a written reflection on the gap.
- ✦ `[D]` **Refusal & Bias Boundary Map** — probe where the model refuses, hedges, or skews on charged topics (informal settlements, surveillance, redlining); map the boundary.
  - *Build note:* a structured probe set across sensitive prompts; tabulate refusal/hedge/bias patterns.
- ✦ `[W]` **Content-Credentials Verifier** — inspect C2PA/content-credential metadata on incoming + outgoing assets; learn to read and produce verifiable provenance.
  - *Build note:* parse embedded C2PA manifests; flag missing/broken provenance on export.

---

# Added in the coverage-audit pass (§19–§25)

*Whole domains of practice and modes of AI use that the first 18 sections missed. Same tags and conventions.*

## 19. BIM, Data & Interoperability
*(The data-plumbing layer that dominates real practice — and the substrate for many RAP tools that assume "parse the BIM model.")*
- ✦ `[B]` `RAP` **IFC Query Console** — natural-language questions over an IFC model ("list all doors under 32in clear") → schedule + flags.
  - *Build note:* ifcopenshell + LLM-to-query translation.
- ✦ `[D]` **Round-Trip Loss Auditor** — export Rhino→IFC→Revit→back and diff what geometry/metadata was silently lost.
  - *Build note:* ifcopenshell diff + element-count reconciliation.
- ✦ `[B]` `RAP` **Schedule-from-Model Generator** — auto-extract door/window/room/finish schedules into clean tables (and Braille-ready; feeds §11).
  - *Build note:* IFC property-set extraction → tabular export.
- ✦ `[W]` **CSV/Spreadsheet Reasoner** — AI over messy consultant data: clean, join, chart, sanity-check an area schedule or takeoff.
  - *Build note:* pandas + LLM for column inference + chart generation; flag implausible values.

## 20. Construction Administration & Field
*(The build phase — the catalog otherwise stops at model-making.)*
- ✦ `[B]` **RFI Drafter & Tracker** — turn a field photo + question into a formatted RFI; track open/closed.
  - *Build note:* vision LLM + RFI template + a simple status DB.
- ✦ `[D]` **Submittal-vs-Spec Checker** — compare a product submittal PDF against the spec section; flag deviations.
  - *Build note:* dual-document RAG + clause-level diff.
- ✦ `[B]` `RAP` **Punch-List Field Capture** — hands-free voice/photo walk-through dictating punch items, geotagged to plan.
  - *Build note:* mobile PWA: STT + photo + plan-pin; LLM structures items.
- ✦ `[W]` **As-Built Reconciler** — diff field-marked changes against contract drawings to draft an as-built change narrative.
  - *Build note:* image diff + LLM change-log narration.
- ✦ `[B]` **MEP-Routing Sanity Sketch** — rough duct/pipe/chase routing through a plan; flag undersized plenum/shaft.
  - *Build note:* graph routing over plan + simplified sizing rules.
- ✦ `[D]` **Clash-Detection Lite** — overlay structure + MEP + envelope layers; report geometric collisions before the engineer does.
  - *Build note:* mesh/AABB intersection (trimesh) across discipline layers.

## 21. Feasibility & Development Economics
*(The money logic that drives form — students rarely see it.)*
- ✦ `[B]` **Pro-Forma Sketch Engine** — quick development pro-forma (cost, rent, IRR, residual land value) tied to the massing's GSF.
  - *Build note:* spreadsheet model wired to area takeoff; sensitivity sliders.
- ✦ `[D]` **Zoning-as-Money Translator** — show how an FAR/height change moves the pro-forma; makes the politics of zoning legible.
  - *Build note:* couple the §3 envelope generator to the pro-forma; plot value vs. allowance.
- ✦ `[W]` **Highest-and-Best-Use Advisor** — given a parcel + market data, argue alternative programs by return *and* public value.
  - *Build note:* LLM over comps + a value/impact matrix.

## 22. Urban & Territorial Scale
*(§1 is parcel-scale; this operates at block/district/city scale.)*
- ✦ `[B]` **Block-Massing Study Engine** — generate compliant massing across a whole block of parcels to study district form.
  - *Build note:* batch the §3 Zoning-Envelope Generator over a parcel set.
- ✦ `[B]` **Space-Syntax Integration Map** — compute street-network integration/choice to predict movement and frontage value.
  - *Build note:* OSMnx graph + axial/segment analysis (NetworkX).
- ✦ `[W]` `RAP` **15-Minute-City Access Audit** — who can reach daily needs without a car, by foot/wheelchair/transit; flag deserts.
  - *Build note:* OSMnx isochrones × POI categories × mobility profiles.

## 23. Landscape, Ecology & Interiors
*(Climate-conscious and human-scale gaps.)*
- ✦ `[W]` **Native-Planting Palette Generator** — site climate/soil → ecologically appropriate, low-water, pollinator-supporting planting list.
  - *Build note:* USDA hardiness + soil survey + native-plant DB retrieval.
- ✦ `[D]` **Biodiversity Net-Gain Estimator** — score a scheme's habitat units before/after; flag net loss.
  - *Build note:* land-cover classification + habitat-unit lookup.
- ✦ `[B]` `RAP` **FF&E Clearance Checker** — place furniture and verify wheelchair turning circles, reach ranges, clear floor space.
  - *Build note:* swept-circle + reach-zone geometry over the layout.

## 24. Research & Scholarly Production *(the RAP lab — highest professor-specific leverage)*
*(Entirely absent before; arguably the most valuable addition for you specifically — ACADIA/JAE output, user studies, the research pipeline.)*
- ✦ `[W]` **Related-Work Synthesizer** — cluster a citation corpus into themes, draft a structured related-work section with gaps named.
  - *Build note:* embed + cluster abstracts; LLM writes per-cluster synthesis with citations.
- ✦ `[B]` **ACADIA/JAE Figure Forge** — generate publication-grade diagrams/charts from study data to a venue's style spec.
  - *Build note:* matplotlib/SVG templates keyed to venue style; data-to-figure pipeline.
- ✦ `[W]` **Reviewer-Response Drafter** — turn reviewer comments into a point-by-point rebuttal scaffold (you fill the substance).
  - *Build note:* parse review → map to manuscript sections → draft response stubs.
- ✦ `[W]` `RAP` **IRB / Human-Subjects Protocol Assistant** — draft consent + protocol sections for non-visual user studies with blind/low-vision participants, flagging the accessibility *of the study itself*.
  - *Build note:* IRB template RAG + an accessibility-of-research checklist.
- ✦ `[B]` `RAP` **User-Study Data Coder** — assist qualitative coding of think-aloud transcripts from RAP navigation studies; surface themes, keep human as final coder.
  - *Build note:* LLM-suggested codes + inter-rater agreement tracking; human overrides logged.
- ✦ `[D]` **Claim-vs-Data Integrity Pass** — adversarially check that a paper's claims are actually supported by its own figures/tables.
  - *Build note:* extract claims, map to evidence artifacts, flag unsupported assertions.

## 25. Agents, Orchestration, Local Models & Modes
*(Modes of AI use missing regardless of domain — the catalog skewed toward single-shot workflows and small widgets.)*
- ✦ `[W]` `RAP` **Voice-First Studio Companion** — fully conversational design assistant, no screen required (field + non-visual first-class).
  - *Build note:* STT↔LLM↔TTS loop with structured project state.
- ✦ `[B]` **Live Crit Co-Pilot** — listens to a desk crit, surfaces the precedent/code fact being argued *in real time*, logs action items as spoken.
  - *Build note:* streaming STT + RAG + a live note panel.
- ✦ `[B]` **Shared Studio State** — a multiplayer board where the cohort's AI queries + outputs are visible and remixable.
  - *Build note:* CRDT/Yjs shared doc + per-user provenance.
- ✦ `[W]` **Site-to-Scheme Agent Chain** — an observable multi-tool agent running site→code→program→massing that *shows its tool calls* so students audit the chain.
  - *Build note:* tool-use agent with a visible trace; each step human-gateable.
- ✦ `[B]` **Studio-Corpus Fine-Tune Lab** — fine-tune/embed a small local model on the cohort's own drawings + readings; compare to frontier.
  - *Build note:* local LoRA/embedding on a private corpus + an eval harness.
- ✦ `[D]` **Studio Eval Harness** — a reusable, tool-agnostic rig to score any tool's output against a held-out answer key (accuracy + calibration).
  - *Build note:* dataset + scorer + dashboard.
- ✦ `[D]` **Cohort Learning-Trajectory Dashboard** — track override-rate, skill-decay tests, and offload heatmaps across the whole term per student.
  - *Build note:* time-series over the §14 logs.

## 26. RAP frontier gaps *(edges §11 hadn't reached)*
*(The lab's research frontier — cognitive/Deaf access, real participants, generative non-visual design, and field-defining benchmarks.)*
- ✦ `[W]` `RAP` **Cognitive-Wayfinding Simplifier** — rewrite a circulation scheme for legibility under cognitive load (fewer decision points, landmark redundancy).
  - *Build note:* plan-graph decision-point analysis + simplification suggestions.
- ✦ `[W]` `RAP` **Multilingual Tactile/Audio Legend** — spoken + Braille legend in multiple languages and scripts.
  - *Build note:* translation + liblouis per-language tables.
- ✦ `[D]` `RAP` **DeafSpace Sightline Auditor** — check sightlines, lighting for signing, and visual-alert coverage against DeafSpace guidelines.
  - *Build note:* sightline raycasting + lighting-uniformity check + alarm-coverage map.
- ✦ `[B]` `RAP` **Participant Feedback Capture Rig** — accessible (screen-reader-first, voice-driven) instrument for blind testers to rate/annotate a representation. *(Real users, not AI personas — the lab's actual rigor.)*
  - *Build note:* WCAG-AAA form + audio annotation; feeds the §24 User-Study Data Coder.
- ✦ `[B]` `RAP` **Sound-to-Form Sketch Tool** — *author* massing by humming/tapping: pitch and rhythm map to proportion and bay rhythm.
  - *Build note:* pitch/onset detection → parametric bay generator → CAD + audio playback.
- ✦ `[D]` `RAP` **Non-Visual Representation Benchmark** — a held-out set of spaces with ground-truth geometry to score *any* description/sonification/tactile method's reconstruction error. **A publishable lab asset** (doubles as §24 output + §25 eval harness).
  - *Build note:* curated space corpus + reconstruction-error scorer.
- ✦ `[W]` `RAP` **Thermal-Comfort Verbal Map** — narrate the felt warm/cool/draughty zones of a space as an embodied walkthrough (thermal as a non-visual channel).
  - *Build note:* Ladybug UTCI grid → spatial narration tied to a walk path.

---

## Cross-cutting "flagship" candidates
These kept surfacing as the biggest bets across many docs — flagged so you don't lose them in the long list. **Not** a recommendation to pick them yet.
- **Vibe-coded design instrument** — the capstone build, targeting your own studio's site.
- **Fully integrated "AI for Architects" pipeline** — site research → code → budget → iterative design.
- **Representational translation engine** — text ↔ diagram ↔ model ↔ code ↔ tactile ↔ audio (sits at the center of §8, §11, and your RAP research).
- **Trace Grader Rubric Engine + four-line log + grain field-guide** — the assessment/provenance backbone that makes "grade the trace" real.

---

## Patterns to notice as you sort (not yet decisions)
- **The richest RAP vein is sonification + tactile + fidelity-testing** (§11, plus RAP-tagged items scattered through §1, §5–10, §13–18). The recurring rigor move: *don't just translate — measure whether the translation is accurate* (Translation-Fidelity Scorer, Access-Equivalence Audit, Tactile-Print QA Scanner).
- **A whole class of `[D]` ideas exists to expose where AI tears against the grain on physics/geometry/citations** (AI-Physics Lie Detector, Wind-Tunnel Reality Gap, Surrogate Speed-vs-Truth, Tolerance-Stress Tester, Hallucinated Precedent Trap). These are cheap to run and pedagogically loud.
- **The `[B]` "toy/widget" cluster** (sun-path, dew-point, thermal-mass, truss, acoustic ray-bounce) is a natural vibe-coding curriculum: small, visual, buildable in an afternoon, each teaching one building-science concept.
- **The assessment tools in §14 are a connected system, not separate apps** — disclosure log → override ledger → offload heatmap → trace grader. Building one nudges toward the rest.

---

## De-duplication notes
*The audit found genuine overlaps. Kept as distinct entries (you're still going wide), but flagged here so you treat each cluster as **one tool family** when you narrow:*
- **Budget-cut roleplay** — *Shrinking-Budget Negotiator* (§4), *Value-Engineering Negotiator* (§12), and *Value-engineering villain* (§13) are the same tool. *Stakes Escalator* (§13) is a different axis (stakes, not budget) — keep separate.
- **Embodied carbon** — *Embodied-Carbon First-Pass* (§7) and *Embodied-carbon estimator* (§12) are the same first-pass tool. *Precedent Cost & Carbon Decoder* (§2), *Takeoff→carbon bridge* (§10), and *Lifecycle Cost-vs-Carbon* (§12) are genuinely different applications.
- **Sonified section** — *Sonified Section* (§8) and *Section-to-soundwalk* (§11) are the same idea; pick one.
- **Provenance metadata on images** — *Seed-Spread Honesty Card* (§9) and *Provenance Watermark Sidecar* (§14) overlap heavily; merge when building.
- **"Ugly months"** — *"Ugly-months" renderer* (§9, image-gen) and *Material-Aging Forecaster* (§2, literature-grounded) are different *methods* — keep both; fold the §17 "ugly-months" mention into the occupancy-over-time simulator.
- **One reusable engine, many inputs** — the whole **sonification family** (§5 parti, §7 daylight/load-path, §8 section, §11 sun-path/texture/reverb) is one Web Audio/Tone.js engine pointed at different data; likewise the **tactile-model family** (§2 precedent, §8 plan, §10 design model) shares one extrude-relief-+-Braille → STL pipeline. Build the engine once.

---

*When you're ready to narrow, `SYNTHESIS.md` §4 has the three lenses (two-parter / eight-roles / explore→implement→build) for vetting any item above.*
