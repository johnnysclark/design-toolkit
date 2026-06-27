// test_sky.mjs — validates the cumulative-sky-matrix radiation engine.
// Run: node web/v2/test_sky.mjs  (from the gable-studio folder).
import { PATCHES, buildSkyMatrix, incidentOnSurface } from "./sky.js";
import { sunDirection } from "../core.js";

let pass = 0, fail = 0;
const approx = (a, b, eps) => Number.isFinite(a) && Math.abs(a - b) <= eps;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };
const D2R = Math.PI / 180;

// N identical daytime hours at one location (equinox noon-ish, lat 42).
const hours = (n, { dni = 0, dhi = 0, lat = 42, lon = -71, tz = -5, doy = 80, hour = 12.5 } = {}) =>
  ({ lat, lon, tz, doy: Array(n).fill(doy), hour: Array(n).fill(hour), dni: Array(n).fill(dni), dhi: Array(n).fill(dhi) });

// ---- patch geometry --------------------------------------------------------
check("145 patches", PATCHES.length === 145, PATCHES.length);
const sumOmega = PATCHES.reduce((s, p) => s + p.omega, 0);
check("ΣΩ ≈ 2π (hemisphere)", approx(sumOmega, 2 * Math.PI, 0.03 * 2 * Math.PI), sumOmega);
const K = PATCHES.reduce((s, p) => s + p.omega * Math.sin(p.alt * D2R), 0);
check("ΣΩ·sin(alt) ≈ π (diffuse normalisation)", approx(K, Math.PI, 0.04 * Math.PI), K);

// ---- diffuse: isotropic horizontal should integrate to ΣDHI ----------------
const Rd = buildSkyMatrix(hours(100, { dhi: 100 }));
const horizD = incidentOnSurface(Rd, [0, 0, 1]);
const expD = (100 * 100 / 1000) * (K / Math.PI); // ΣDHI(kWh) × discretisation factor
check("diffuse horizontal matches the fold", approx(horizD, expD, 0.02 * expD), { horizD, expD });
check("diffuse horizontal ≈ ΣDHI (10 kWh)", approx(horizD, 10, 0.06 * 10), horizD);

// ---- beam: horizontal ≈ ΣDNI·sin(alt) --------------------------------------
const lonCorr = (-71 - (-5 * 15)) / 15;
const decl = 23.45 * Math.sin(2 * Math.PI * (284 + 80) / 365);
const s = sunDirection(42, 12.5 - 0.5 + lonCorr, decl);
const expB = (100 * 800 * Math.max(0, s[2])) / 1000;
const Rb = buildSkyMatrix(hours(100, { dni: 800 }));
const horizB = incidentOnSurface(Rb, [0, 0, 1]);
check("beam horizontal ≈ ΣDNI·sin(alt)", approx(horizB, expB, 0.12 * expB), { horizB, expB });

// ---- orientation sanity ----------------------------------------------------
// Robust invariants (independent of beam quantisation):
//  · isotropic diffuse — a horizontal surface sees the whole hemisphere, a
//    vertical wall sees half, so horizontal ≈ 2× a vertical wall.
const southD = incidentOnSurface(Rd, [0, -1, 0]);
check("diffuse: horizontal > vertical wall", horizD > southD + 1e-6, { horizD, southD });
check("diffuse: vertical ≈ ½ horizontal", approx(southD, horizD / 2, 0.1 * (horizD / 2)), { southD, half: horizD / 2 });
//  · beam at noon (sun in the southern sky) — a south wall beats a north wall.
const south = incidentOnSurface(Rb, [0, -1, 0]);
const north = incidentOnSurface(Rb, [0, 1, 0]);
check("beam: south wall beats north wall", south > north + 1e-6, { south, north });

console.log(`sun altitude used ≈ ${(Math.asin(s[2]) / D2R).toFixed(1)}°`);
console.log(`\nsky radiation engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
