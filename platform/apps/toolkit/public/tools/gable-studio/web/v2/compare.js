// compare.js (v2 · Benchmark Track) — the Ladybug side-by-side.
//
// The honest comparison: 5 UNOBSTRUCTED unit surfaces (horizontal + the four
// cardinal walls). An instructor reproduces these in Ladybug with the SAME EPW
// and the SAME Tregenza-145 sky, then pastes the results here. Because the
// surfaces are unobstructed and unit-area, the residual isolates the SKY MODEL
// difference (our isotropic diffuse vs Ladybug's Perez all-weather) — which is
// the lesson, not a defect. Agreement here is METHOD REPRODUCTION, not accuracy;
// both omit multi-bounce, spectral, and (in ours) ground-reflected light.
//
// This whole module is pure + client-side + parity-free; test_compare.mjs covers it.

export const ORIENT = [
  { key: "horizontal", label: "Horizontal (roof)" },
  { key: "south", label: "South wall" },
  { key: "east", label: "East wall" },
  { key: "west", label: "West wall" },
  { key: "north", label: "North wall" },
];

// our (unshaded, sky-only) reference incidence in kWh/m²·yr, from the sky matrix
export function oursReference(climate) {
  const r = climate && climate.sun && climate.sun.reference;
  return ORIENT.map((o) => ({ key: o.key, label: o.label, ours: r ? r[o.key] : null }));
}

// Parse a Ladybug-dumped "key,value" CSV (header optional; comma or tab). Keys
// are normalised so N/S/E/W/H, "south", "South Wall", etc. all map through.
const KEYMAP = {
  h: "horizontal", horiz: "horizontal", horizontal: "horizontal", roof: "horizontal",
  s: "south", south: "south", "south wall": "south",
  n: "north", north: "north", "north wall": "north",
  e: "east", east: "east", "east wall": "east",
  w: "west", west: "west", "west wall": "west",
};
export function parseLadybugCSV(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim(); if (!t) continue;
    const parts = t.split(/[,\t]/).map((s) => s.trim());
    if (parts.length < 2) continue;
    const k = KEYMAP[parts[0].toLowerCase()];
    const v = parseFloat(parts[1]);
    if (k && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

// Build comparison rows: ours vs Ladybug, signed delta, % difference, a status
// band, and a per-row reason. Status: ok ≤5%, near ≤15%, else bad; na if missing.
export function compareRows(ours, lb) {
  return ours.map((o) => {
    const l = lb[o.key];
    if (o.ours == null || !Number.isFinite(l)) {
      return Object.assign({}, o, { lb: Number.isFinite(l) ? l : null, delta: null, pct: null, status: "na" });
    }
    const delta = o.ours - l;
    const pct = l !== 0 ? (100 * delta) / l : null;
    const ap = Math.abs(pct == null ? 999 : pct);
    const status = ap <= 5 ? "ok" : ap <= 15 ? "near" : "bad";
    return Object.assign({}, o, { lb: l, delta: round1(delta), pct: pct == null ? null : round1(pct), status });
  });
}

const round1 = (x) => Math.round(x * 10) / 10;

export const WHY_GENERAL = [
  "Our diffuse sky is ISOTROPIC; Ladybug uses the Perez all-weather model (circumsolar + horizon brightening) — the main source of divergence, largest on clear, sunny orientations.",
  "We add NO ground-reflected component; Ladybug's Incident Radiation includes a ground hemisphere (≈ albedo × GHI), so our vertical walls read a little low.",
  "Beam is binned to the nearest of 145 Tregenza patches (no circumsolar disc), so a wall near 45° tilt can read high or low by a patch.",
  "This is method-reproduction on unobstructed unit surfaces — agreement is NOT accuracy; both omit multi-bounce, spectral and cloud-microphysics effects.",
];

// The downloadable comparison pack: pinned config + our numbers, so a Ladybug run
// is provably apples-to-apples. (No 8760-row data; just the fixed summary.)
export function comparisonPack(state, stamp) {
  const c = state.climate;
  return {
    kind: "eco-architect.ladybug-comparison",
    version: 1,
    generated: stamp || null,
    manifest: {
      patchModel: "tregenza145", patchCount: 145,
      skyModel: "isotropic-diffuse + nearest-patch beam",
      groundReflectance: 0, northAngle: state.seed.site.northAngle,
      epwCity: c ? c.location.city : null, epwLat: c ? c.location.lat : null,
      epwLon: c ? c.location.lon : null, annualGHIkWh: c ? c.annual.ghiTotalKWh : null,
      units: "kWh/m2.yr",
    },
    oursReference: oursReference(c),
    instructions: "Reproduce in Ladybug per LADYBUG_RECIPE.md: same EPW, Tregenza-145 Cumulative Sky Matrix, five 1 m² surfaces at horizontal/S/E/W/N (unobstructed). Dump 'key,value' rows and paste into the Compare tab.",
  };
}
