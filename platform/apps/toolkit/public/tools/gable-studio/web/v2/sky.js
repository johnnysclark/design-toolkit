// sky.js (v2 · Benchmark Track, Phase 2.5 — STAGE A) ----------------------------
//
// Builds a cumulative sky matrix R[145] from an EPW's hourly DNI/DHI + sun
// positions. This is the JS-canonical Stage A — it runs once on load and is NOT
// on the JS↔Python parity surface. The patch geometry and the surface-incident
// integral live in the SHARED, parity-bound web/radiation.js (so the matrix is
// built and consumed against one source of truth); only R[145] crosses into the
// model. A surface's annual incident then comes out in real kWh/m².
//
// HONESTY (vs Ladybug): the diffuse sky here is ISOTROPIC (uniform radiance),
// whereas Ladybug's gendaymtx uses the Perez all-weather model. So this
// reproduces the cumulative-radiation METHOD and the right ballpark, but
// per-patch radiances differ — Perez is a later refinement.
import { sunDirection } from "../core.js";
import { PATCHES, incidentOnSurface } from "../radiation.js";

const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // non-leap day-of-year offset
export const dayOfYear = (month, day) => CUM_DAYS[month - 1] + day;

// Build the cumulative sky matrix R[145] (kWh/m²) from hourly weather.
//   hourly: { lat, lon, tz, doy:[], hour:[], dni:[], dhi:[] }
// Folding convention (matches radiation.incidentOnSurface): diffuse folds Ω into
// R; beam is a point at the sun's nearest patch. surface = Σ R[p]·max(0,n·d_p).
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
