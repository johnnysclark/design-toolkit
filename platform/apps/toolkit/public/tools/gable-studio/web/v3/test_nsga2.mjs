// test_nsga2.mjs — validates the pure NSGA-II engine against textbook problems
// with KNOWN Pareto fronts. Run: node web/v3/test_nsga2.mjs (from gable-studio).
import { nsga2, nsga2Stepper, mulberry32 } from "./nsga2.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };
const finite = (xs) => xs.every((v) => Number.isFinite(v));
const allFinite = (res) => res.population.every((p) => finite(p.objectives) && finite(p.constraints) && Number.isFinite(p.constraintViolation));

// ---- mulberry32 determinism ------------------------------------------------
{
  const a = mulberry32(42), b = mulberry32(42);
  const seqA = [a(), a(), a(), a()], seqB = [b(), b(), b(), b()];
  check("PRNG deterministic for a seed", JSON.stringify(seqA) === JSON.stringify(seqB), { seqA, seqB });
  check("PRNG in [0,1)", seqA.every((v) => v >= 0 && v < 1), seqA);
  const c = mulberry32(43); const seqC = [c(), c(), c(), c()];
  check("PRNG differs across seeds", JSON.stringify(seqA) !== JSON.stringify(seqC), { seqA, seqC });
}

// ---- Schaffer N.1 : 1 var, f1=x², f2=(x-2)² ; front is x∈[0,2] --------------
{
  const res = nsga2({
    bounds: [{ min: -5, max: 5 }], nObjectives: 2, directions: ["min", "min"],
    evaluate: (x) => ({ objectives: [x[0] * x[0], (x[0] - 2) * (x[0] - 2)], constraints: [] }),
    popSize: 60, generations: 50, seed: 1,
  });
  check("Schaffer: no NaN", allFinite(res), null);
  check("Schaffer: front non-empty", res.front.length > 0, res.front.length);
  const xs = res.front.map((p) => p.x[0]);
  const within = xs.every((x) => x > -0.15 && x < 2.15);
  check("Schaffer: front genes land in [0,2]", within, { min: Math.min(...xs), max: Math.max(...xs) });
  // the front should SPAN the trade-off: some near x=0 (min f1), some near x=2 (min f2)
  check("Schaffer: front spans the trade-off", Math.min(...xs) < 0.4 && Math.max(...xs) > 1.6, { min: Math.min(...xs), max: Math.max(...xs) });
}

// ---- ZDT1 : 30 vars, convex front f2 = 1 − √f1 at g=1 ----------------------
{
  const n = 30;
  const zdt1 = (x) => {
    const f1 = x[0];
    let s = 0; for (let i = 1; i < n; i++) s += x[i];
    const g = 1 + 9 * s / (n - 1);
    const f2 = g * (1 - Math.sqrt(f1 / g));
    return { objectives: [f1, f2], constraints: [] };
  };
  const res = nsga2({
    bounds: Array.from({ length: n }, () => ({ min: 0, max: 1 })),
    nObjectives: 2, directions: ["min", "min"], evaluate: zdt1,
    popSize: 100, generations: 400, seed: 7, // 30 vars → needs ~400 gens to reach the true front
  });
  check("ZDT1: no NaN", allFinite(res), null);
  check("ZDT1: front non-empty", res.front.length > 5, res.front.length);
  // on the true front g→1, so f2 ≈ 1 − √f1. Check mean deviation is small.
  let dev = 0; for (const p of res.front) dev += Math.abs(p.objectives[1] - (1 - Math.sqrt(p.objectives[0])));
  dev /= res.front.length;
  check("ZDT1: front ≈ 1−√f1 (converged)", dev < 0.05, { meanDeviation: dev });
  // f1 spread across most of [0,1]
  const f1s = res.front.map((p) => p.objectives[0]);
  check("ZDT1: front well spread on f1", Math.min(...f1s) < 0.15 && Math.max(...f1s) > 0.8, { min: Math.min(...f1s), max: Math.max(...f1s) });
}

// ---- Binh–Korn (CONSTRAINED) ----------------------------------------------
// min f1=4x²+4y², f2=(x−5)²+(y−5)²  s.t.  (x−5)²+y²≤25 , (x−8)²+(y+3)²≥7.7
{
  const bk = (v) => {
    const [x, y] = v;
    const f1 = 4 * x * x + 4 * y * y;
    const f2 = (x - 5) * (x - 5) + (y - 5) * (y - 5);
    const c1 = (x - 5) * (x - 5) + y * y - 25;        // ≤ 0
    const c2 = 7.7 - ((x - 8) * (x - 8) + (y + 3) * (y + 3)); // ≤ 0
    return { objectives: [f1, f2], constraints: [c1, c2] };
  };
  const res = nsga2({
    bounds: [{ min: 0, max: 5 }, { min: 0, max: 3 }],
    nObjectives: 2, nConstraints: 2, directions: ["min", "min"], evaluate: bk,
    popSize: 100, generations: 80, seed: 3,
  });
  check("Binh–Korn: no NaN", allFinite(res), null);
  check("Binh–Korn: front non-empty", res.front.length > 5, res.front.length);
  const feasible = res.front.every((p) => p.constraintViolation <= 1e-9);
  check("Binh–Korn: every front point is feasible", feasible, res.front.map((p) => p.constraintViolation).filter((v) => v > 1e-9));
  // known objective extents: f1∈[0,~136], f2∈[0,~50]
  const f1s = res.front.map((p) => p.objectives[0]);
  check("Binh–Korn: front spans f1", Math.min(...f1s) < 5 && Math.max(...f1s) > 80, { min: Math.min(...f1s), max: Math.max(...f1s) });
}

// ---- "max" direction handling ---------------------------------------------
// maximize x (so the front collapses to x=max=10) — sanity that flip works.
{
  const res = nsga2({
    bounds: [{ min: 0, max: 10 }], nObjectives: 1, directions: ["max"],
    evaluate: (x) => ({ objectives: [x[0]], constraints: [] }),
    popSize: 40, generations: 40, seed: 9,
  });
  const best = Math.max(...res.population.map((p) => p.objectives[0]));
  check("max-direction: maximizes toward the upper bound", best > 9.5, best);
}

// ---- determinism : same seed ⇒ identical population -------------------------
{
  const cfg = () => ({
    bounds: [{ min: 0, max: 1 }, { min: 0, max: 1 }], nObjectives: 2, directions: ["min", "min"],
    evaluate: (x) => ({ objectives: [x[0], x[1]], constraints: [] }),
    popSize: 50, generations: 30, seed: 1234,
  });
  const r1 = nsga2(cfg()), r2 = nsga2(cfg());
  const key = (r) => JSON.stringify(r.population.map((p) => [p.x, p.objectives, p.rank]));
  check("determinism: identical runs for one seed", key(r1) === key(r2), null);
}

// ---- stepper matches the sync runner generation-for-generation -------------
{
  const cfg = {
    bounds: [{ min: 0, max: 1 }], nObjectives: 2, directions: ["min", "min"],
    evaluate: (x) => ({ objectives: [x[0], (1 - x[0]) * (1 - x[0])], constraints: [] }),
    popSize: 30, generations: 20, seed: 55,
  };
  const sync = nsga2(cfg);
  const st = nsga2Stepper(cfg);
  while (!st.done) st.step();
  const k = (r) => JSON.stringify(r.population.map((p) => [p.x, p.objectives]));
  check("stepper == sync for the same seed", k(sync) === k(st.state), null);
  check("history has one row per generation (+baseline)", st.state.history.length === cfg.generations + 1, st.state.history.length);
}

console.log(`\nNSGA-II engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
