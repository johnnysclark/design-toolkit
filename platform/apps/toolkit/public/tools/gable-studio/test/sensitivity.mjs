// sensitivity.mjs — verify every metric actually RESPONDS to parameter changes
// (no dead numbers, no NaN/Inf). Run from TOOLS/gable-studio/:  node test/sensitivity.mjs
import { DEFAULTS, analyze } from "../web/core.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
const base = analyze(DEFAULTS.params, DEFAULTS.site).metrics;

const tweaks = [];
const P = (path, d) => tweaks.push({ path, d });
for (const g of ["plinth", "walls", "roof"]) for (const k of Object.keys(DEFAULTS.params[g])) if (typeof DEFAULTS.params[g][k] === "number") { P(["params", g, k], +2); P(["params", g, k], -1.5); }
P(["params", "apertures", 0, "w"], 1.5); P(["params", "apertures", 0, "v"], 0.3); P(["params", "apertures", 0, "host"], "wall_px");
for (const k of ["latitude", "northAngle", "windFromAz", "windSpeed", "deltaT", "viewTargetAz", "eyeHeight"]) { P(["site", k], 15); P(["site", k], -10); }
for (const k of Object.keys(DEFAULTS.site.terrain)) { P(["site", "terrain", k], 1.5); P(["site", "terrain", k], -1); }

const setAt = (obj, path, valOrDelta) => {
  let o = obj; for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
  const key = path[path.length - 1];
  o[key] = typeof valOrDelta === "string" ? valOrDelta : o[key] + valOrDelta;
};

const moved = {}; const bad = [];
for (const m in base) moved[m] = 0;
for (const tw of tweaks) {
  const d = clone(DEFAULTS);
  setAt(d, tw.path, tw.d);
  const met = analyze(d.params, d.site).metrics;
  for (const m in met) {
    if (!Number.isFinite(met[m])) bad.push(`${m} not finite after ${tw.path.join(".")}=${tw.d}`);
    if (Math.abs(met[m] - base[m]) > 1e-6) moved[m]++;
  }
}

const dead = Object.entries(moved).filter(([, n]) => n === 0).map(([m]) => m);
console.log(`metrics: ${Object.keys(base).length}  ·  tweaks: ${tweaks.length}`);
console.log("responds to ≥1 tweak:", Object.entries(moved).filter(([, n]) => n > 0).length);
if (dead.length) console.log("DEAD (never moved):", dead.join(", ")); else console.log("DEAD: none ✓");
if (bad.length) { console.log("NON-FINITE:"); bad.slice(0, 12).forEach((b) => console.log("  " + b)); } else console.log("NON-FINITE: none ✓");

// Fail the build if a metric went dead or non-finite (match occlusion.mjs / parity_check.py).
if (dead.length || bad.length) process.exit(1);
