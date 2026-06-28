// test_optimize_integration.mjs — the full pipeline headless: genome + objectives
// + nsga2 + core.js run(), exactly as the UI wires it. Proves win-win discovery,
// a genuine trade-off front, a constraint that bites, determinism, and no NaN.
// Run: node web/v3/test_optimize_integration.mjs
import { nsga2 } from "./nsga2.js";
import { buildGenes, bounds, decode, DEFAULT_GENES } from "./genome.js";
import { deriveObjectives, makeEvaluator } from "./objectives.js";
import { run, DEFAULTS } from "../core.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };
const clone = (o) => JSON.parse(JSON.stringify(o));

const seed = { params: clone(DEFAULTS.params), site: clone(DEFAULTS.site), ruleset: { rules: [] } };
const base = run(seed.params, seed.site, null).metrics;
const genes = buildGenes(DEFAULT_GENES);
const toVars = (x) => { const s = decode(x, genes, seed); return run(s.params, s.site, null).vars; };

function optimize(rules, manual, seedN, gens = 50) {
  const problem = deriveObjectives(rules, manual);
  const ev = makeEvaluator(problem, toVars);
  const res = nsga2({ bounds: bounds(genes), nObjectives: ev.nObjectives, nConstraints: ev.nConstraints,
    directions: ev.directions, evaluate: ev.evaluate, popSize: 60, generations: gens, seed: seedN });
  return { problem, res };
}
const allFinite = (res) => res.population.every((p) => p.objectives.every(Number.isFinite) && Number.isFinite(p.constraintViolation));
const minBy = (arr, f) => arr.reduce((m, p) => (f(p) < f(m) ? p : m));
const maxBy = (arr, f) => arr.reduce((m, p) => (f(p) > f(m) ? p : m));

// ---- A: win-win discovery — admit-winter (max winter gain) + reject-summer
//        (min overheat). With full geometric freedom these are NOT in hard
//        conflict: the optimizer beats the baseline on BOTH. -----------------
{
  const rules = [
    { id: "aw", kind: "rule", lhs: "solarWinterUseful", op: ">=", rhs: 0, hard: false },
    { id: "rs", kind: "rule", lhs: "overheatRatio", op: "<=", rhs: 99, hard: false },
  ];
  const { res } = optimize(rules, [], 5);
  check("A: no NaN", allFinite(res), null);
  check("A: front non-empty", res.front.length > 0, res.front.length);
  const maxWinter = Math.max(...res.front.map((p) => p.objectives[0]));
  const minOver = Math.min(...res.front.map((p) => p.objectives[1]));
  check("A: beats baseline on winter gain", maxWinter > base.solarWinterUseful, { maxWinter, base: base.solarWinterUseful });
  check("A: beats baseline on overheating", minOver < base.overheatRatio, { minOver, base: base.overheatRatio });
  // a design exists that improves BOTH at once (the win-win the naive "add glass" move misses)
  const winwin = res.front.some((p) => p.objectives[0] > base.solarWinterUseful && p.objectives[1] < base.overheatRatio);
  check("A: a single design improves both objectives", winwin, null);
}

// ---- B: a GENUINE trade-off — maximize view openness vs minimize glazing
//        budget. Both ride aperture size, so they truly conflict. ------------
{
  const { res } = optimize([], [{ key: "viewAmount", dir: "max" }, { key: "glazingRatio", dir: "min" }], 5);
  check("B: no NaN", allFinite(res), null);
  check("B: front non-empty", res.front.length > 3, res.front.length);
  const views = res.front.map((p) => p.objectives[0]), glaz = res.front.map((p) => p.objectives[1]);
  check("B: view objective spans a real range", Math.max(...views) > 2 * Math.min(...views), { lo: Math.min(...views), hi: Math.max(...views) });
  const pView = maxBy(res.front, (p) => p.objectives[0]);   // most view
  const pGlaz = minBy(res.front, (p) => p.objectives[1]);   // least glazing
  check("B: more view costs more glazing (genuine conflict)", pView.objectives[1] > pGlaz.objectives[1] + 1e-4 && pView.objectives[0] > pGlaz.objectives[0] + 1e-4, { pView: pView.objectives, pGlaz: pGlaz.objectives });
}

// ---- C: a hard constraint that BITES — winter gain ≥ baseline×1.5. The
//        baseline violates it; every front point must satisfy it. -----------
{
  const rhs = base.solarWinterUseful * 1.5;
  const rules = [
    { id: "h", kind: "rule", lhs: "solarWinterUseful", op: ">=", rhs, hard: true },
    { id: "s", kind: "rule", lhs: "viewQuality", op: ">=", rhs: 0, hard: false },
  ];
  const { res } = optimize(rules, [], 3);
  check("C: baseline is infeasible (constraint bites)", base.solarWinterUseful < rhs, { base: base.solarWinterUseful, rhs });
  check("C: every front point satisfies the hard constraint", res.front.every((p) => p.constraintViolation <= 1e-9), res.front.map((p) => p.constraintViolation).filter((v) => v > 1e-9));
  check("C: front non-empty & feasible", res.front.length > 0, res.front.length);
}

// ---- D: determinism — same seed ⇒ identical front -------------------------
{
  const m = [{ key: "viewAmount", dir: "max" }, { key: "surfaceToVolume", dir: "min" }];
  const a = optimize([], m, 99).res, b = optimize([], m, 99).res;
  const key = (r) => JSON.stringify(r.front.map((p) => [p.x, p.objectives]));
  check("D: identical front for one seed", key(a) === key(b), null);
}

console.log(`\noptimize integration: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
