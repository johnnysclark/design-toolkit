// nsga2.js (v3) — a tiny, dependency-free NSGA-II multi-objective optimizer.
//
// Pure and headless: NO DOM, NO core.js import. It optimizes real-valued vectors
// and calls an injected `evaluate(x) -> {objectives[], constraints[]}`, so it is
// (a) unit-testable against textbook problems (ZDT, Binh–Korn) and (b) free of
// any JS↔Python parity entanglement — it only ever READS the parity-tested core
// through the callback. Being stochastic, it needs no Python twin; reproducibility
// instead comes from a SEEDED PRNG so a whole run can be regenerated from its seed
// (the tool's "seed-is-truth" contract, see web/v2/series.js).
//
// Algorithm: Deb, Pratap, Agarwal & Meyarivan, "A fast and elitist multiobjective
// genetic algorithm: NSGA-II", IEEE Trans. Evol. Comput. 6(2):182–197, 2002.
//   · fast non-dominated sort           (Pareto ranking)
//   · constrained domination            (Deb's feasibility rule)
//   · crowding distance                 (diversity, per-objective normalized)
//   · binary tournament by (rank, crowding)
//   · simulated binary crossover (SBX)  + polynomial mutation  (real genes)
//   · elitist (μ+λ) survivor selection
//
// Conventions: the engine MINIMIZES internally; `directions[k] === "max"` objectives
// are compared in flipped sense but reported RAW (so chart axes read real units).
// Constraints use g ≤ 0 = satisfied; the value is the signed amount (g > 0 = the
// violation). Total violation cv = Σ max(0, g_k); feasible ⇔ cv ≈ 0.

// ---------------------------------------------------------------------------
// mulberry32 — one uint32 of state, deterministic, good enough for a GA.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
const DEAD = 1e15; // finite sentinel so a broken evaluation can't poison the sort

// ---------------------------------------------------------------------------
// Evaluate one genome through the injected callback, sanitizing non-finite
// outputs into a "death penalty" (max constraint violation) rather than NaN.
function evaluateInd(x, config) {
  let objectives, constraints;
  try {
    const r = config.evaluate(x);
    objectives = r && r.objectives;
    constraints = (r && r.constraints) || [];
  } catch (e) { objectives = null; constraints = []; }

  let dead = false;
  const M = config.nObjectives;
  const obj = new Array(M);
  if (!objectives || objectives.length !== M) { dead = true; for (let k = 0; k < M; k++) obj[k] = 0; }
  else for (let k = 0; k < M; k++) { const v = objectives[k]; if (Number.isFinite(v)) obj[k] = v; else { obj[k] = 0; dead = true; } }

  let cv = 0;
  const cons = new Array(constraints.length);
  for (let k = 0; k < constraints.length; k++) {
    const g = constraints[k];
    cons[k] = Number.isFinite(g) ? g : DEAD;
    if (!Number.isFinite(g)) dead = true;
    else if (g > 0) cv += g;
  }
  if (dead) cv = DEAD;
  return { x: x.slice(), objectives: obj, constraints: cons, cv, rank: 0, crowding: 0, dead };
}

// minimization-sense value of objective k (flip the ones we want to maximize)
function mv(ind, k, dirs) { return dirs[k] === "max" ? -ind.objectives[k] : ind.objectives[k]; }

// Constrained domination (Deb): does a dominate b?
function dominates(a, b, dirs) {
  const af = a.cv <= 1e-12, bf = b.cv <= 1e-12;
  if (af !== bf) return af;              // feasible beats infeasible
  if (!af) return a.cv < b.cv;           // both infeasible → smaller violation wins
  let better = false;                    // both feasible → Pareto on objectives
  for (let k = 0; k < dirs.length; k++) {
    const av = mv(a, k, dirs), bv = mv(b, k, dirs);
    if (av > bv) return false;           // worse in some objective → cannot dominate
    if (av < bv) better = true;
  }
  return better;
}

// ---------------------------------------------------------------------------
// Fast non-dominated sort → array of fronts (arrays of individuals); sets .rank.
function nonDominatedSort(pop, dirs) {
  const n = pop.length;
  const S = new Array(n), nd = new Array(n).fill(0);
  const fronts = [[]];
  for (let p = 0; p < n; p++) {
    S[p] = [];
    for (let q = 0; q < n; q++) {
      if (p === q) continue;
      if (dominates(pop[p], pop[q], dirs)) S[p].push(q);
      else if (dominates(pop[q], pop[p], dirs)) nd[p]++;
    }
    if (nd[p] === 0) { pop[p].rank = 0; fronts[0].push(p); }
  }
  let i = 0;
  while (fronts[i].length) {
    const next = [];
    for (const p of fronts[i]) for (const q of S[p]) {
      if (--nd[q] === 0) { pop[q].rank = i + 1; next.push(q); }
    }
    i++; fronts.push(next);
  }
  fronts.pop(); // trailing empty
  return fronts.map((f) => f.map((idx) => pop[idx]));
}

// Crowding distance over one front (raw objective values, normalized per axis).
function crowding(front, dirs) {
  const l = front.length;
  for (const ind of front) ind.crowding = 0;
  if (l === 0) return;
  if (l <= 2) { for (const ind of front) ind.crowding = Infinity; return; }
  for (let k = 0; k < dirs.length; k++) {
    front.sort((a, b) => (a.objectives[k] - b.objectives[k]) || (a._i - b._i));
    const lo = front[0].objectives[k], hi = front[l - 1].objectives[k];
    const range = (hi - lo) || 1;
    front[0].crowding = Infinity; front[l - 1].crowding = Infinity;
    for (let i = 1; i < l - 1; i++) {
      if (front[i].crowding !== Infinity)
        front[i].crowding += (front[i + 1].objectives[k] - front[i - 1].objectives[k]) / range;
    }
  }
}

// crowded-comparison ≺_n : lower rank wins; tie → larger crowding wins.
function crowdedLess(a, b) {
  if (a.rank !== b.rank) return a.rank < b.rank;
  if (a.crowding !== b.crowding) return a.crowding > b.crowding;
  return a._i < b._i; // deterministic tiebreak
}

// ---------------------------------------------------------------------------
// Genetic operators (real-valued).
function makeOperators(config, rand) {
  const B = config.bounds, G = B.length;
  const etaC = config.etaC, etaM = config.etaM, pCross = config.pCross, pMut = config.pMut;

  function tournament(pop) {
    const a = pop[(rand() * pop.length) | 0], b = pop[(rand() * pop.length) | 0];
    return crowdedLess(a, b) ? a : b;
  }

  function sbx(p1, p2) {
    const c1 = p1.slice(), c2 = p2.slice();
    if (rand() <= pCross) {
      for (let k = 0; k < G; k++) {
        if (rand() <= 0.5 && Math.abs(p1[k] - p2[k]) > 1e-14) {
          const u = rand();
          const beta = u <= 0.5 ? Math.pow(2 * u, 1 / (etaC + 1))
                                : Math.pow(1 / (2 * (1 - u)), 1 / (etaC + 1));
          const lo = B[k].min, hi = B[k].max;
          c1[k] = clamp(0.5 * ((1 + beta) * p1[k] + (1 - beta) * p2[k]), lo, hi);
          c2[k] = clamp(0.5 * ((1 - beta) * p1[k] + (1 + beta) * p2[k]), lo, hi);
        }
      }
    }
    return [c1, c2];
  }

  function mutate(x) {
    for (let k = 0; k < G; k++) {
      if (rand() < pMut) {
        const u = rand();
        const delta = u < 0.5 ? Math.pow(2 * u, 1 / (etaM + 1)) - 1
                              : 1 - Math.pow(2 * (1 - u), 1 / (etaM + 1));
        x[k] = clamp(x[k] + delta * (B[k].max - B[k].min), B[k].min, B[k].max);
      }
    }
    return x;
  }

  return { tournament, sbx, mutate };
}

// ---------------------------------------------------------------------------
function reindex(pop) { for (let i = 0; i < pop.length; i++) pop[i]._i = i; }

function defaults(config) {
  const G = config.bounds.length;
  return Object.assign({
    popSize: 100, generations: 60, pCross: 0.9, etaC: 20, etaM: 20,
    pMut: 1 / Math.max(1, G), directions: config.bounds.map(() => "min"), seed: 0xC0FFEE,
    nConstraints: 0, onGeneration: null, seedPop: null,
  }, config);
}

function initState(rawConfig) {
  const config = defaults(rawConfig);
  const rand = mulberry32(config.seed);
  const B = config.bounds, N = config.popSize, G = B.length;
  const ops = makeOperators(config, rand);

  // initial population — optional warm-start genomes first, then uniform-random.
  const pop = [];
  const seedPop = config.seedPop || [];
  for (let i = 0; i < N; i++) {
    let x;
    if (i < seedPop.length) x = seedPop[i].map((v, k) => clamp(v, B[k].min, B[k].max));
    else { x = new Array(G); for (let k = 0; k < G; k++) x[k] = B[k].min + rand() * (B[k].max - B[k].min); }
    pop.push(evaluateInd(x, config));
  }
  reindex(pop);
  const fronts = nonDominatedSort(pop, config.directions);
  for (const f of fronts) crowding(f, config.directions);

  return { config, rand, ops, pop, generation: 0, history: [] };
}

function snapshotHistory(S) {
  const { pop, config } = S, M = config.nObjectives, dirs = config.directions;
  const feasible = pop.filter((p) => p.cv <= 1e-12 && !p.dead);
  const base = feasible.length ? feasible : pop;
  const best = new Array(M), mean = new Array(M);
  for (let k = 0; k < M; k++) {
    let acc = 0, b = dirs[k] === "max" ? -Infinity : Infinity;
    for (const p of base) {
      acc += p.objectives[k];
      if (dirs[k] === "max") { if (p.objectives[k] > b) b = p.objectives[k]; }
      else if (p.objectives[k] < b) b = p.objectives[k];
    }
    best[k] = b; mean[k] = base.length ? acc / base.length : NaN;
  }
  const frontSize = pop.filter((p) => p.rank === 0).length;
  return { gen: S.generation, frontSize, best, mean, feasibleFraction: feasible.length / pop.length };
}

// advance one generation (μ+λ elitist).
function advance(S) {
  const { config, ops, pop } = S, N = config.popSize, dirs = config.directions;
  // make N offspring
  const offspring = [];
  while (offspring.length < N) {
    const p1 = ops.tournament(pop).x, p2 = ops.tournament(pop).x;
    const [c1, c2] = ops.sbx(p1, p2);
    offspring.push(evaluateInd(ops.mutate(c1), config));
    if (offspring.length < N) offspring.push(evaluateInd(ops.mutate(c2), config));
  }
  // combine, sort, fill next generation front-by-front
  const combined = pop.concat(offspring);
  reindex(combined);
  const fronts = nonDominatedSort(combined, dirs);
  const next = [];
  for (const f of fronts) {
    crowding(f, dirs);
    if (next.length + f.length <= N) { for (const ind of f) next.push(ind); }
    else {
      f.sort((a, b) => (b.crowding - a.crowding) || (a._i - b._i));
      for (let i = 0; next.length < N; i++) next.push(f[i]);
      break;
    }
  }
  S.pop = next;
  reindex(S.pop);
  S.generation++;
  S.history.push(snapshotHistory(S));
  if (config.onGeneration) config.onGeneration(S.generation, result(S));
}

// public result/snapshot object
function result(S) {
  const dirs = S.config.directions;
  const map = (p) => ({ x: p.x.slice(), objectives: p.objectives.slice(), constraints: p.constraints.slice(),
    constraintViolation: p.cv, rank: p.rank, crowding: p.crowding, feasible: p.cv <= 1e-12 && !p.dead });
  const population = S.pop.map(map);
  return {
    population,
    front: population.filter((p) => p.rank === 0 && p.feasible).length
      ? population.filter((p) => p.rank === 0 && p.feasible)
      : population.filter((p) => p.rank === 0),
    history: S.history.slice(),
    generation: S.generation, seed: S.config.seed, config: S.config, directions: dirs,
  };
}

// ---------------------------------------------------------------------------
// Public API.

// Generator-style runner: { step(), state, done } — one generation per step(),
// for chunking under requestAnimationFrame so the UI stays live.
export function nsga2Stepper(rawConfig) {
  const S = initState(rawConfig);
  S.history.push(snapshotHistory(S)); // gen 0 baseline
  return {
    get state() { return result(S); },
    get done() { return S.generation >= S.config.generations; },
    step() { if (S.generation >= S.config.generations) return null; advance(S); return result(S); },
  };
}

// Synchronous runner: evolve to completion and return the final Result.
export function nsga2(rawConfig) {
  const S = initState(rawConfig);
  S.history.push(snapshotHistory(S));
  while (S.generation < S.config.generations) advance(S);
  return result(S);
}
