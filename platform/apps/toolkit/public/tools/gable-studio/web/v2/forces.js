// forces.js (v2) — the FORCE → MOVE → RULE catalog.
//
// This is the content behind the method: each SITE FORCE a student can READ and
// NAME, the canonical MOVES that answer it, and the testable RULE each move
// drafts. Rules run on the EXISTING core.js metrics (zero parity cost) — the
// drafted clause keeps the plain {lhs, op, rhs, weight, hard} predicate the core
// evaluator + the Rhino export consume; the extra fields (force, move, provenance,
// caveat) are inert metadata.
//
// Two forces (humidity, stability/flood) are deliberately UNMODELLED: honest
// "we can't measure this yet" cards whose move records a hand-judgment note
// instead of a fake metric. Humidity becomes testable in the Benchmark Track
// (Phase 2, the es(T) primitive); flood needs an engineer, not a proxy.

// Site inputs that live ON a force card (the site is a given you READ, not a move).
// path is into state.seed.site (dotted for terrain).
const SITE = {
  latitude:    { path: "latitude",          label: "Latitude",        unit: "°",   min: -55, max: 66, step: 1 },
  northAngle:  { path: "northAngle",         label: "North rotation",  unit: "°",   min: 0,   max: 359, step: 1 },
  windFromAz:  { path: "windFromAz",         label: "Wind from",       unit: "°az", min: 0,   max: 359, step: 1 },
  windSpeed:   { path: "windSpeed",          label: "Wind speed",      unit: "m/s", min: 0,   max: 25,  step: 0.5 },
  deltaT:      { path: "deltaT",             label: "Inside−outside ΔT", unit: "K", min: 0,   max: 20,  step: 0.5 },
  viewTargetAz:{ path: "viewTargetAz",       label: "View target",     unit: "°az", min: 0,   max: 359, step: 1 },
  groundLevel: { path: "terrain.plateauZ",   label: "Ground level",    unit: "m",   min: -4,  max: 2,   step: 0.1 },
};

// The forces, in READ order down the left dock.
export const FORCES = [
  {
    id: "sun", label: "Sun", glyph: "☀", overlay: "solarYear", modeled: true,
    blurb: "Where the sun is, and how the form admits winter gain while rejecting summer heat.",
    inputs: [SITE.latitude, SITE.northAngle],
    reads: ["solarWinterUseful", "solarSummerUseful", "overheatRatio", "solarSouth"],
    moves: [
      { id: "admit-winter", label: "Admit winter sun", desc: "Open the equator-facing wall to low winter sun.",
        rule: { lhs: "solarWinterUseful", op: ">=", rel: 1.25, weight: 2, hard: true, provenance: "baseline ×1.25",
                caveat: "Direct-beam proxy over 15 sun samples; ignores clouds, diffuse light and self-shading." } },
      { id: "reject-summer", label: "Reject summer heat", desc: "Shade the glass so summer gain stays below winter.",
        rule: { lhs: "overheatRatio", op: "<=", rel: 0.9, weight: 2, hard: true, provenance: "baseline ×0.9",
                caveat: "Summer ÷ winter gain ratio — a balance cue, not a cooling load." } },
      { id: "face-equator", label: "Face the equator", desc: "Bias the openings to the sunny face.",
        rule: { lhs: "solarSouth", op: ">=", rel: 1.2, weight: 1, hard: false, provenance: "baseline ×1.2",
                caveat: "Gain through openings whose normal points within ±45° of the equator." } },
    ],
  },
  {
    id: "wind", label: "Wind & air", glyph: "↯", overlay: "wind", modeled: true,
    blurb: "Turn away from the prevailing wind for shelter — or open up to drive buoyant ventilation.",
    inputs: [SITE.windFromAz, SITE.windSpeed, SITE.deltaT],
    reads: ["windExposure", "windPressure", "channelIndex", "stackIndex"],
    moves: [
      { id: "shelter", label: "Turn the short face to the wind", desc: "Reduce the windward area you present.",
        rule: { lhs: "windExposure", op: "<=", rel: 0.8, weight: 2, hard: false, provenance: "baseline ×0.8",
                caveat: "Windward projected area (m²); not a CFD pressure field or true Cp." } },
      { id: "calm-channel", label: "Avoid wind funnelling", desc: "Don't pinch a venturi between walls and plinth.",
        rule: { lhs: "channelIndex", op: "<=", rel: 0.8, weight: 1, hard: false, provenance: "baseline ×0.8",
                caveat: "Plan throat ratio — a massing cue, not a velocity calc." } },
      { id: "stack-vent", label: "Drive stack ventilation (air)", desc: "Low inlets, high/roof outlets for buoyant flow.",
        rule: { lhs: "stackIndex", op: ">=", rel: 1.25, weight: 1, hard: false, provenance: "baseline ×1.25",
                caveat: "Ideal single-zone buoyancy Q; ignores wind-driven cross-ventilation and partitions." } },
    ],
  },
  {
    id: "ground", label: "Ground", glyph: "⏚", overlay: null, modeled: true,
    blurb: "Bed the plinth into the slope for thermal mass and shelter — or perch it clear of the ravine.",
    inputs: [SITE.groundLevel],
    reads: ["buriedFraction", "soilContactArea", "thermalMassRatio"],
    moves: [
      { id: "bed-in", label: "Bed into the ground", desc: "Sink the plinth so soil tempers it.",
        rule: { lhs: "buriedFraction", op: ">=", rhs: 0.5, weight: 2, hard: true, provenance: "earth-coupled ≥ 0.5",
                caveat: "Slab fraction below grade; steady geometry, not transient ground heat flow." } },
      { id: "thermal-mass", label: "Add thermal mass", desc: "More slab mass per volume to steady the swing.",
        rule: { lhs: "thermalMassRatio", op: ">=", rel: 1.2, weight: 1, hard: false, provenance: "baseline ×1.2",
                caveat: "Slab capacity ÷ enclosed volume; ignores which mass is actually coupled to the air." } },
      { id: "perch", label: "Perch above the ravine", desc: "Keep the floor clear of the ground.",
        rule: { lhs: "buriedFraction", op: "<=", rhs: 0.1, weight: 1, hard: false, provenance: "perched ≤ 0.1",
                caveat: "The opposite move — surfaced so the trade-off is explicit." } },
    ],
  },
  {
    id: "views", label: "Views", glyph: "◉", overlay: null, modeled: true,
    blurb: "Open the right wall toward the view you want — knowing glass toward the view may fight sun and wind.",
    inputs: [SITE.viewTargetAz],
    reads: ["viewQuality", "viewAmount", "skyView"],
    moves: [
      { id: "open-view", label: "Open to the view", desc: "Aim and enlarge an opening toward the target.",
        rule: { lhs: "viewQuality", op: ">=", rel: 1.3, weight: 1, hard: false, provenance: "baseline ×1.3",
                caveat: "Aperture solid angle weighted toward the target azimuth; not a real viewshed (no obstructions)." } },
      { id: "frame-sky", label: "Frame the sky", desc: "Use the roof aperture for daylight from above.",
        rule: { lhs: "skyView", op: ">=", rel: 1.2, weight: 1, hard: false, provenance: "baseline ×1.2",
                caveat: "Upward solid angle of the roof aperture; not a daylight-factor calc." } },
    ],
  },
  {
    id: "humidity", label: "Humidity", glyph: "≈", overlay: null, modeled: false,
    blurb: "Humid heat asks for airflow and a raised, drier floor; dry heat asks for mass.",
    absence: "Not modelled yet. The Benchmark Track (Phase 2) adds a psychrometric primitive es(T) so comfort — and the plinth's flip from asset to liability — become testable against real weather. For now, name the force and record your reasoning.",
    moves: [
      { id: "note", label: "Record a humidity response", desc: "Write the move you'd make and why — a hand-judgment, not a score.",
        note: true },
    ],
  },
  {
    id: "stability", label: "Flood / stability", glyph: "⚠", overlay: null, modeled: false,
    blurb: "On a ravine edge, water and slope stability may be the dominant forces.",
    absence: "We can't model this honestly — flood, erosion and slope stability need a survey and an engineer, not a closed-form proxy. Naming it is the responsible move.",
    moves: [
      { id: "note", label: "Record a hand-judgment note", desc: "State the risk and how the design answers it.",
        note: true },
    ],
  },
];

export const FORCE_BY_ID = Object.fromEntries(FORCES.map((f) => [f.id, f]));

// Known tensions: pairs of moves that pull against each other. When both are in
// the charter, the student must declare a winner (logged in the fork's decision).
// ids are "forceId:moveId".
export const TENSIONS = [
  { a: "sun:admit-winter", b: "sun:reject-summer", why: "More equator-facing glass admits winter sun but also more summer heat." },
  { a: "sun:reject-summer", b: "views:open-view", why: "Glass for the view also lets in summer gain you're trying to reject." },
  { a: "ground:bed-in", b: "ground:perch", why: "Bedding in and perching clear are opposite responses to the same slope." },
  { a: "wind:shelter", b: "wind:stack-vent", why: "Closing against the wind fights opening up to drive ventilation." },
  { a: "wind:shelter", b: "views:open-view", why: "The best view may be straight into the prevailing wind." },
];

const round2 = (x) => Math.round(x * 100) / 100;
let _seq = 0;
const nextId = () => "c" + (++_seq).toString(36);

// Draft a charter clause from a move. `metrics` is the current core metrics object,
// used to resolve a relative threshold (rel = ×baseline) into a concrete rhs.
export function draftClause(force, move, metrics) {
  if (move.note) {
    return { id: nextId(), kind: "note", force: force.id, forceLabel: force.label,
             move: move.id, moveLabel: move.label, note: "", caveat: force.absence || "" };
  }
  const r = move.rule;
  let rhs = r.rhs;
  let provenance = r.provenance;
  if (rhs == null && r.rel != null) {
    const base = Number(metrics?.[r.lhs] ?? 0);
    rhs = round2(base * r.rel);
    provenance = `${r.provenance} (= ${round2(base)} now)`;
  }
  return {
    id: nextId(), kind: "rule", force: force.id, forceLabel: force.label,
    move: move.id, moveLabel: move.label,
    lhs: r.lhs, op: r.op, rhs, weight: r.weight, hard: r.hard,
    provenance, caveat: r.caveat,
  };
}

// Which tensions are active given the clauses currently in the charter.
export function activeTensions(clauses) {
  const have = new Set(clauses.map((c) => `${c.force}:${c.move}`));
  return TENSIONS.filter((t) => have.has(t.a) && have.has(t.b));
}
