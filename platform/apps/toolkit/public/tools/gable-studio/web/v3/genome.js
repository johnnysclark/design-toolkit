// genome.js (v3) — the GENE catalog and genome↔seed mapping for the optimizer.
//
// A "gene" is a free design variable the NSGA-II engine evolves. The catalog
// mirrors v2's studio-legal ranges: the geometry sliders (web/v2/app2.js MAKE_SPEC)
// + the apertures (which left MAKE_SPEC for a dedicated editor in #53, ranges kept
// here) + the site inputs (web/v2/forces.js SITE, OFF by default — the site is a
// given you READ, not a move). We can't import those (app2.js runs DOM code on
// import; MAKE_SPEC/SITE aren't exported), so the ranges are duplicated here and
// asserted against the live engine in test_genome.mjs.
//
// The engine works in the seed's native SI units (metres/degrees) so it stays
// parity-safe; the UI converts to imperial only at the display boundary (units.js).

// dotted-path get/set — same semantics as app2.js:34-35 (array-index aware:
// "apertures.0.w", "terrain.plateauZ").
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }
const clone = (o) => JSON.parse(JSON.stringify(o));

export const GENE_CATALOG = [
  // ---- geometry (target: params) — mirrors web/v2/app2.js MAKE_SPEC ----------
  { path: "walls.h", label: "Wall height", min: 2.2, max: 4.6, step: 0.1, unit: "m", target: "params" },
  { path: "walls.W", label: "Room width", min: 4, max: 12, step: 0.5, unit: "m", target: "params" },
  { path: "walls.L", label: "Room length", min: 4, max: 14, step: 0.5, unit: "m", target: "params" },
  { path: "walls.R", label: "Room rotation", min: -45, max: 45, step: 1, unit: "°", target: "params" },
  { path: "roof.pitchL", label: "Roof pitch L", min: -20, max: 55, step: 1, unit: "°", target: "params" },
  { path: "roof.pitchR", label: "Roof pitch R", min: -20, max: 55, step: 1, unit: "°", target: "params" },
  { path: "roof.ridgeRise", label: "Ridge rise", min: 0, max: 4, step: 0.1, unit: "m", target: "params" },
  { path: "roof.ridgePos", label: "Ridge shift", min: -0.8, max: 0.8, step: 0.05, unit: "", target: "params" },
  { path: "roof.W", label: "Roof width (overhang)", min: 6, max: 14, step: 0.5, unit: "m", target: "params" },
  { path: "roof.L", label: "Roof length (overhang)", min: 6, max: 16, step: 0.5, unit: "m", target: "params" },
  { path: "plinth.t", label: "Plinth thickness", min: 0.2, max: 2, step: 0.1, unit: "m", target: "params" },
  { path: "plinth.cy", label: "Plinth shift Y", min: -3, max: 3, step: 0.1, unit: "m", target: "params" },
  { path: "plinth.W", label: "Plinth width", min: 6, max: 16, step: 0.5, unit: "m", target: "params" },
  { path: "plinth.L", label: "Plinth length", min: 6, max: 18, step: 0.5, unit: "m", target: "params" },
  // ---- apertures (south window — the main one) -------------------------------
  { path: "apertures.0.w", label: "South window width", min: 0.4, max: 6, step: 0.1, unit: "m", target: "params" },
  { path: "apertures.0.h", label: "South window height", min: 0.4, max: 2.6, step: 0.1, unit: "m", target: "params" },
  // ---- site (target: site) — mirrors web/v2/forces.js SITE; OFF by default ----
  { path: "latitude", label: "Latitude", min: -55, max: 66, step: 1, unit: "°", target: "site", site: true },
  { path: "northAngle", label: "North rotation", min: 0, max: 359, step: 1, unit: "°", target: "site", site: true },
  { path: "windFromAz", label: "Wind from", min: 0, max: 359, step: 1, unit: "°", target: "site", site: true },
  { path: "windSpeed", label: "Wind speed", min: 0, max: 25, step: 0.5, unit: "m/s", target: "site", site: true },
  { path: "deltaT", label: "Inside−outside ΔT", min: 0, max: 20, step: 0.5, unit: "K", target: "site", site: true },
  { path: "viewTargetAz", label: "View target", min: 0, max: 359, step: 1, unit: "°", target: "site", site: true },
  { path: "terrain.plateauZ", label: "Ground level", min: -4, max: 2, step: 0.1, unit: "m", target: "site", site: true },
];

export const CATALOG_BY_PATH = Object.fromEntries(GENE_CATALOG.map((g) => [g.path, g]));

// The default gene set: small enough to converge in ~1–2 s, rich enough to expose
// the named TENSIONS (orientation drives every solar/wind/view metric; pitch+rise
// drive sun/shade/stack; south window is gain-vs-view; plinth Y/thickness is
// bed-in-vs-perch / mass).
export const DEFAULT_GENES = [
  "walls.R", "roof.pitchL", "roof.pitchR", "roof.ridgeRise",
  "apertures.0.w", "apertures.0.h", "plinth.cy", "plinth.t",
];

// snap a continuous value to its gene step grid (so an evaluated/spawned design is
// slider-reproducible). Rounds away float fuzz.
export function snap(v, step) { if (!step) return v; const q = Math.round(v / step) * step; return Math.round(q * 1e6) / 1e6; }

// Build a concrete gene list from selected paths, with optional {min,max} overrides
// (clamped to the catalog extremes so a student can't request geometry the kit
// can't build).
export function buildGenes(paths, overrides = {}) {
  return paths.map((p) => {
    const c = CATALOG_BY_PATH[p];
    if (!c) throw new Error("unknown gene: " + p);
    const o = overrides[p] || {};
    const min = Math.max(c.min, o.min != null ? o.min : c.min);
    const max = Math.min(c.max, o.max != null ? o.max : c.max);
    return { path: p, target: c.target, unit: c.unit, label: c.label, min, max, step: c.step };
  });
}

export const bounds = (genes) => genes.map((g) => ({ min: g.min, max: g.max, step: g.step }));

// read the current genome (SI) out of a seed (warm-start)
export const encode = (seed, genes) => genes.map((g) => getPath(g.target === "site" ? seed.site : seed.params, g.path));

// write a genome back into a fresh clone of the seed, snapping to step grid.
export function decode(x, genes, seed) {
  const s = clone(seed);
  genes.forEach((g, i) => setPath(g.target === "site" ? s.site : s.params, g.path, snap(x[i], g.step)));
  return s;
}

export { getPath, setPath };
