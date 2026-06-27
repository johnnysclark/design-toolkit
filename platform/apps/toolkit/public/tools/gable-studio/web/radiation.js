// radiation.js — SHARED parity surface for incident solar radiation (Stage B).
//
// Tregenza-145 sky-patch geometry + OCCLUDED per-surface incident radiation
// (kWh/m²) from a cumulative sky matrix R[145]. This is the "consume the sky
// matrix" half of the Benchmark Track and it is PARITY-BOUND: python/radiation.py
// is a line-for-line port and test/parity_rad proves they agree. The sky-matrix
// BUILD (8760 EPW hours → R[145]) stays JS-canonical in v2/sky.js and is NOT on
// the parity surface — only the fixed-size R[145] crosses into the model.
//
// Reuses core.js's Möller–Trumbore raycast + massing triangles so self-shadowing
// (an overhang shading the wall below) is included in the headline kWh/m².
// Coordinates match core.js: +X East, +Y North, +Z Up; azimuth clockwise from N.
import { rayHitsAny, massingTriangles } from "./core.js";

const D2R = Math.PI / 180;

// Tregenza dome: 7 altitude bands (12° each) + a zenith cap = 145 patches.
// [count, altLow, altHigh] per band (Tregenza 1987). Ω = Δaz·(sin a1 − sin a0).
const BANDS = [[30, 0, 12], [30, 12, 24], [24, 24, 36], [24, 36, 48], [18, 48, 60], [12, 60, 72], [6, 72, 84]];

export function tregenzaPatches() {
  const patches = [];
  for (const band of BANDS) {
    const count = band[0], a0 = band[1], a1 = band[2];
    const altC = (a0 + a1) / 2, dAz = 2 * Math.PI / count;
    const omega = dAz * (Math.sin(a1 * D2R) - Math.sin(a0 * D2R));
    const ca = Math.cos(altC * D2R), sa = Math.sin(altC * D2R);
    for (let k = 0; k < count; k++) {
      const az = (k + 0.5) * dAz; // from North, clockwise
      patches.push({ dir: [Math.sin(az) * ca, Math.cos(az) * ca, sa], omega: omega, alt: altC });
    }
  }
  patches.push({ dir: [0, 0, 1], omega: 2 * Math.PI * (1 - Math.sin(84 * D2R)), alt: 90 });
  return patches; // 145
}
export const PATCHES = tregenzaPatches();

// Unoccluded incident on a surface with unit normal (kWh/m²): Σ R[p]·max(0,n·d_p).
export function incidentOnSurface(R, normal, patches) {
  patches = patches || PATCHES;
  let s = 0;
  for (let p = 0; p < patches.length; p++) {
    const d = patches[p].dir, dot = normal[0] * d[0] + normal[1] * d[1] + normal[2] * d[2];
    if (dot > 0) s += R[p] * dot;
  }
  return s;
}

// Occluded incident at a point just off a surface (kWh/m²): skip any patch whose
// ray is blocked by the massing. Sample point is lifted off the face by 0.03 m
// along the normal (mirrors core.js sampleSolarGrid) so the face never self-hits.
export function occludedIncidentAt(R, point, normal, tris, patches) {
  patches = patches || PATCHES;
  const o = [point[0] + normal[0] * 0.03, point[1] + normal[1] * 0.03, point[2] + normal[2] * 0.03];
  let s = 0;
  for (let p = 0; p < patches.length; p++) {
    const d = patches[p].dir, dot = normal[0] * d[0] + normal[1] * d[1] + normal[2] * d[2];
    if (dot <= 0) continue;
    if (rayHitsAny(o, d, tris, 1e9)) continue;
    s += R[p] * dot;
  }
  return s;
}

// Per-face + per-aperture occluded incident for a model and sky matrix R[145].
// Returns arrays aligned with model.faces / model.apertures (plinth side faces
// share a name, so arrays — not name-keyed dicts — are the parity-safe shape),
// plus area-weighted envelope/glazing means.
export function incidentByModel(model, R, patches) {
  patches = patches || PATCHES;
  const tris = massingTriangles(model);
  const faceVals = model.faces.map((f) => ({ name: f.name, area: f.area, kwh: occludedIncidentAt(R, f.c, f.n, tris, patches) }));
  const apVals = model.apertures.map((a) => ({ id: a.id, area: a.area, kwh: occludedIncidentAt(R, a.c, a.n, tris, patches) }));
  let fa = 0, fw = 0; for (const f of faceVals) { fa += f.area * f.kwh; fw += f.area; }
  let ga = 0, gw = 0; for (const a of apVals) { ga += a.area * a.kwh; gw += a.area; }
  return { faceVals, apVals, envelopeMean: fw > 0 ? fa / fw : 0, glazingMean: gw > 0 ? ga / gw : 0 };
}
