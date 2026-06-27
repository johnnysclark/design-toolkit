// sky.js (v2 · Benchmark Track, Phase 2.5 — STAGE A) ----------------------------
//
// A cumulative-sky-matrix incident-radiation model, the same SHAPE Ladybug uses
// (a Tregenza-145 patch dome, surface = Σ patch_radiance · max(0, n·d)). This is
// the JS-canonical Stage A: it builds a fixed-size 145-value sky matrix from the
// EPW's hourly DNI/DHI + sun positions, so a surface's annual incident radiation
// comes out in real kWh/m².
//
// HONESTY (vs Ladybug): the diffuse sky here is ISOTROPIC (uniform radiance),
// whereas Ladybug's gendaymtx uses the Perez all-weather model (circumsolar +
// horizon brightening). So this reproduces the cumulative-radiation METHOD and
// gives the right ballpark, but per-patch radiances differ — the Perez refinement
// is a later increment. There is also NO self-shading yet (that's the parity-cost
// raycast buy). Numbers are "first-order incident radiation", not validated.
//
// Coordinates match core.js: +X East, +Y North, +Z Up; azimuth clockwise from N.
import { sunDirection } from "../core.js";

const D2R = Math.PI / 180;

// Tregenza dome: 7 altitude bands (12° each) + a zenith cap = 145 patches.
// Patch counts per band (Tregenza 1987). Each patch carries its centre direction
// and solid angle Ω (an annulus slice: Ω = Δaz · (sin a1 − sin a0)).
const BANDS = [
  { count: 30, a0: 0, a1: 12 }, { count: 30, a0: 12, a1: 24 }, { count: 24, a0: 24, a1: 36 },
  { count: 24, a0: 36, a1: 48 }, { count: 18, a0: 48, a1: 60 }, { count: 12, a0: 60, a1: 72 },
  { count: 6, a0: 72, a1: 84 },
];
export function tregenzaPatches() {
  const patches = [];
  for (const b of BANDS) {
    const altC = (b.a0 + b.a1) / 2, dAz = 2 * Math.PI / b.count;
    const omega = dAz * (Math.sin(b.a1 * D2R) - Math.sin(b.a0 * D2R));
    const ca = Math.cos(altC * D2R), sa = Math.sin(altC * D2R);
    for (let k = 0; k < b.count; k++) {
      const az = (k + 0.5) * dAz; // from North, clockwise
      patches.push({ dir: [Math.sin(az) * ca, Math.cos(az) * ca, sa], omega, alt: altC });
    }
  }
  // zenith cap (84°–90°), full azimuth
  patches.push({ dir: [0, 0, 1], omega: 2 * Math.PI * (1 - Math.sin(84 * D2R)), alt: 90 });
  return patches; // 145
}

// Module-level patch geometry (deterministic; safe to share).
export const PATCHES = tregenzaPatches();

const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // non-leap day-of-year offset
export const dayOfYear = (month, day) => CUM_DAYS[month - 1] + day;

// Build the cumulative sky matrix R[145] (kWh/m²) from hourly weather.
//   hourly: { lat, lon, tz, doy:[], hour:[], dni:[], dhi:[] }
// Folding convention: diffuse folds Ω into R; beam is a point at the sun's patch.
// A surface's annual incident = Σ R[p] · max(0, n·dir[p])  (see incidentOnSurface).
export function buildSkyMatrix(hourly, patches = PATCHES) {
  const R = new Array(patches.length).fill(0); // Wh/m², converted to kWh at the end
  const lonCorr = (hourly.lon - hourly.tz * 15) / 15; // longitude→standard-meridian, in hours (EoT ignored)
  const n = hourly.doy.length;
  for (let i = 0; i < n; i++) {
    const dni = hourly.dni[i], dhi = hourly.dhi[i];
    const hasDni = dni > 0, hasDhi = dhi > 0;
    if (!hasDni && !hasDhi) continue;
    const decl = 23.45 * Math.sin(2 * Math.PI * (284 + hourly.doy[i]) / 365);
    const solarHour = hourly.hour[i] - 0.5 + lonCorr; // EPW hour = hour-ending; use the midpoint
    const s = sunDirection(hourly.lat, solarHour, decl);
    if (!s) continue; // sun below horizon this hour
    if (hasDhi) { const c = dhi / Math.PI; for (let p = 0; p < patches.length; p++) R[p] += c * patches[p].omega; }
    if (hasDni) {
      let best = 0, bd = -2;
      for (let p = 0; p < patches.length; p++) { const d = patches[p].dir; const dot = d[0] * s[0] + d[1] * s[1] + d[2] * s[2]; if (dot > bd) { bd = dot; best = p; } }
      R[best] += dni;
    }
  }
  for (let p = 0; p < R.length; p++) R[p] = R[p] / 1000; // → kWh/m²
  return R;
}

// Annual incident radiation (kWh/m²) on a surface with unit normal `normal`,
// unshaded. Σ over patches the sky sees from that orientation.
export function incidentOnSurface(R, normal, patches = PATCHES) {
  let s = 0;
  for (let p = 0; p < patches.length; p++) {
    const d = patches[p].dir, dot = normal[0] * d[0] + normal[1] * d[1] + normal[2] * d[2];
    if (dot > 0) s += R[p] * dot;
  }
  return s;
}

// The five teaching orientations (kWh/m²·yr), for the "all data visible" readout.
export function referenceOrientations(R, patches = PATCHES) {
  const r2 = (x) => Math.round(x * 10) / 10;
  return {
    horizontal: r2(incidentOnSurface(R, [0, 0, 1], patches)),
    south: r2(incidentOnSurface(R, [0, -1, 0], patches)),
    north: r2(incidentOnSurface(R, [0, 1, 0], patches)),
    east: r2(incidentOnSurface(R, [1, 0, 0], patches)),
    west: r2(incidentOnSurface(R, [-1, 0, 0], patches)),
  };
}
