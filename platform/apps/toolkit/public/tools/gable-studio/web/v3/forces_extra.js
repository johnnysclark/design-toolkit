// forces_extra.js (v3) — additional SITE FORCES, shaped exactly like v2's FORCES.
//
// Every move's rule binds to a metric ALREADY computed by core.js computeMetrics
// (and present in VARIABLE_DEFS), so these add ZERO parity cost — no change to
// core.js / gable_core.py. v3 concatenates these onto v2's FORCES; v2 stays frozen.
// Each caveat names the proxy's honest limits, matching the v2 voice.

export const EXTRA_FORCES = [
  {
    id: "compactness", label: "Compactness", glyph: "▣", overlay: null, modeled: true,
    blurb: "A compact form loses less heat through its skin. Trim the envelope you wrap around each cubic metre — or articulate it on purpose for light and gain.",
    inputs: [], reads: ["surfaceToVolume", "envelopeArea", "enclosedVolume"],
    moves: [
      { id: "compact-envelope", label: "Compact the envelope", desc: "Less skin per unit volume to slow heat loss.",
        rule: { lhs: "surfaceToVolume", op: "<=", rel: 0.9, weight: 2, hard: false, provenance: "baseline ×0.9",
                caveat: "Surface-to-volume ratio (1/m) — a heat-loss proxy from geometry only; ignores U-value, air leakage and orientation." } },
      { id: "trim-skin", label: "Trim the skin area", desc: "Shrink the total exposed envelope.",
        rule: { lhs: "envelopeArea", op: "<=", rel: 0.9, weight: 1, hard: false, provenance: "baseline ×0.9",
                caveat: "Total envelope area (m²); it double-counts wall behind glazing — an honesty seam, not a clean U·A." } },
      { id: "articulate", label: "Articulate the form", desc: "Buy daylight and passive surface at a heat-loss cost.",
        rule: { lhs: "surfaceToVolume", op: ">=", rel: 1.15, weight: 1, hard: false, provenance: "baseline ×1.15",
                caveat: "The opposite move — more skin per volume. Surfaced so the trade-off is explicit." } },
    ],
  },
  {
    id: "glazing", label: "Glazing budget", glyph: "▦", overlay: null, modeled: true,
    blurb: "Glass is the budget you spend on light and view — and the debt you pay in winter heat loss and summer gain. Size it on purpose.",
    inputs: [], reads: ["glazingRatio", "viewAmount", "skyView"],
    moves: [
      { id: "budget-cap", label: "Set a glazing budget (cap)", desc: "Hold the window-to-envelope ratio under a cap.",
        rule: { lhs: "glazingRatio", op: "<=", rhs: 0.12, weight: 2, hard: false, provenance: "WWR ≤ 12% (conservative budget)",
                caveat: "Window-to-envelope ratio; envelopeArea double-counts wall-behind-glass so true WWR is a touch higher. Not a U-value/SHGC calc." } },
      { id: "daylight-floor", label: "Keep a daylight minimum", desc: "Don't starve the room of light.",
        rule: { lhs: "glazingRatio", op: ">=", rhs: 0.04, weight: 1, hard: false, provenance: "WWR ≥ 4% (daylight floor)",
                caveat: "Same proxy; a minimum-glazing cue, not a daylight-factor or illuminance calc." } },
      { id: "top-light", label: "Daylight from above", desc: "Open the roof aperture for top light.",
        rule: { lhs: "skyView", op: ">=", rel: 1.25, weight: 1, hard: false, provenance: "baseline ×1.25",
                caveat: "Upward solid angle of the roof aperture (sr); geometric openness, not a daylight factor." } },
    ],
  },
  {
    id: "form", label: "Form & proportion", glyph: "△", overlay: null, modeled: true,
    blurb: "Pitch and height are climate and culture at once — steep sheds rain and snow, low sits quiet on the land.",
    inputs: [], reads: ["pitchDeg", "ridgeHeight", "footprint"],
    moves: [
      { id: "pitch-shed", label: "Pitch to shed rain/snow", desc: "Steepen the roof to drain.",
        rule: { lhs: "pitchDeg", op: ">=", rhs: 22, weight: 1, hard: false, provenance: "pitch ≥ 22° (sheds rain/snow)",
                caveat: "Average of the two roof pitches (°); a buildability rule of thumb, not a drainage/structural calc — it can mask a butterfly valley (one negative pitch)." } },
      { id: "low-profile", label: "Keep a low profile", desc: "Hold the ridge down on the land.",
        rule: { lhs: "ridgeHeight", op: "<=", rhs: 5.5, weight: 1, hard: false, provenance: "ridge ≤ 5.5 m (low profile)",
                caveat: "Absolute ridge height above the floor datum (m); a context/massing cue, not a planning-code or view-impact assessment." } },
      { id: "compact-footprint", label: "Compact the footprint", desc: "Sit lighter on the site.",
        rule: { lhs: "footprint", op: "<=", rel: 0.9, weight: 1, hard: false, provenance: "baseline ×0.9",
                caveat: "Plinth footprint (m²); says nothing about internal-layout efficiency or site-coverage limits." } },
    ],
  },
  {
    id: "solar-skin", label: "Solar skin", glyph: "◐", overlay: null, modeled: true,
    blurb: "Beyond the windows: how much sun lands on the whole skin across the year — the raw resource your form presents, and how much the apertures actually catch.",
    inputs: [], reads: ["solarEnvelope", "solarUseful", "solarSouth"],
    moves: [
      { id: "present-skin", label: "Present the skin to the sun", desc: "Turn more surface toward the sun.",
        rule: { lhs: "solarEnvelope", op: ">=", rel: 1.15, weight: 1, hard: false, provenance: "baseline ×1.15",
                caveat: "Year-averaged direct-beam incidence over ALL faces (idx), 15 sun samples, no clouds/diffuse/self-shading. A resource cue, not a gain or PV yield." } },
      { id: "capture-gain", label: "Concentrate gain at the apertures", desc: "Catch more of the resource through glass.",
        rule: { lhs: "solarUseful", op: ">=", rel: 1.2, weight: 1, hard: false, provenance: "baseline ×1.2",
                caveat: "Year-averaged gain through apertures only (idx) — the captured fraction of the whole-skin resource. Not a heat balance." } },
      { id: "shrug-sun", label: "Shrug off the sun (hot climate)", desc: "Turn the skin away from the sun.",
        rule: { lhs: "solarEnvelope", op: "<=", rel: 0.9, weight: 1, hard: false, provenance: "baseline ×0.9",
                caveat: "Opposite move for cooling-led climates; same proxy limits." } },
    ],
  },
  {
    id: "buoyancy", label: "Buoyant ventilation", glyph: "⇧", overlay: null, modeled: true,
    blurb: "Stack ventilation needs vertical separation between inlet and outlet. Size the geometric drive, not just the flow direction.",
    inputs: [], reads: ["stackHeight", "stackIndex"],
    moves: [
      { id: "raise-outlet", label: "Raise the outlet", desc: "Lift the high opening above the low inlet.",
        rule: { lhs: "stackHeight", op: ">=", rel: 1.2, weight: 1, hard: false, provenance: "baseline ×1.2",
                caveat: "Mean outlet-opening height minus inlet height (m); pure geometry — the buoyancy drive, not the resulting flow." } },
      { id: "cap-stack", label: "Cap the stack (winter loss)", desc: "Don't build a chimney you can't close.",
        rule: { lhs: "stackHeight", op: "<=", rel: 0.85, weight: 1, hard: false, provenance: "baseline ×0.85",
                caveat: "Opposite move — a tall stack you can't close bleeds heat in winter. The trade-off, made explicit." } },
    ],
  },
];

// New tensions among the extra forces and against the built-ins. activeTensions()
// keys on "forceId:moveId", so these light up the instant both clauses are committed.
export const EXTRA_TENSIONS = [
  { a: "compactness:compact-envelope", b: "views:open-view", why: "A compact skin has less wall to open toward the view." },
  { a: "compactness:compact-envelope", b: "sun:admit-winter", why: "Compacting the skin shrinks the equator-facing wall that admits winter sun." },
  { a: "compactness:compact-envelope", b: "solar-skin:present-skin", why: "More skin to catch sun is more skin to lose heat through." },
  { a: "glazing:budget-cap", b: "sun:admit-winter", why: "A tight glazing budget fights enlarging south glass for winter gain." },
  { a: "glazing:budget-cap", b: "views:open-view", why: "The view wants glass the budget caps." },
  { a: "form:low-profile", b: "buoyancy:raise-outlet", why: "A low ridge lowers the outlet that drives stack ventilation." },
  // internal opposites
  { a: "compactness:compact-envelope", b: "compactness:articulate", why: "Compacting and articulating the skin are opposite responses." },
  { a: "solar-skin:present-skin", b: "solar-skin:shrug-sun", why: "Presenting the skin to the sun and shrugging it off are opposites." },
  { a: "buoyancy:raise-outlet", b: "buoyancy:cap-stack", why: "Raising the outlet and capping the stack pull against each other." },
];
