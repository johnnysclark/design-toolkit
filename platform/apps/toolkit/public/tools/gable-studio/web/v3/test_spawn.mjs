// test_spawn.mjs — spawning a chosen phenotype into the Series is self-consistent:
// re-run()ing the saved seed reproduces the chosen objective vector within 1e-6, and
// the provenance bundle is complete. Run: node web/v3/test_spawn.mjs
import { nsga2 } from "./nsga2.js";
import { buildGenes, bounds, decode, DEFAULT_GENES } from "./genome.js";
import { deriveObjectives, makeEvaluator } from "./objectives.js";
import { buildPhenotypeVariation } from "./spawn.js";
import { run, DEFAULTS } from "../core.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };
const clone = (o) => JSON.parse(JSON.stringify(o));

const baseSeed = { params: clone(DEFAULTS.params), site: clone(DEFAULTS.site), ruleset: { name: "Charter", rules: [], notes: [] } };
const genes = buildGenes(DEFAULT_GENES);
const toVars = (x) => { const s = decode(x, genes, baseSeed); return run(s.params, s.site, null).vars; };

// a real 2-objective problem (view openness vs glazing budget)
const problem = deriveObjectives([], [{ key: "viewAmount", dir: "max" }, { key: "glazingRatio", dir: "min" }]);
const ev = makeEvaluator(problem, toVars);
const runParams = { popSize: 60, generations: 40, seed: 5, pCross: 0.9, etaC: 20, pMut: 1 / genes.length, etaM: 20 };
const res = nsga2({ bounds: bounds(genes), nObjectives: ev.nObjectives, nConstraints: ev.nConstraints, directions: ev.directions, evaluate: ev.evaluate, ...runParams });

// pick a "knee-ish" phenotype: the front point closest to the ideal corner (normalized)
function pick(front, dirs) {
  const M = dirs.length, lo = new Array(M).fill(Infinity), hi = new Array(M).fill(-Infinity);
  for (const p of front) for (let k = 0; k < M; k++) { lo[k] = Math.min(lo[k], p.objectives[k]); hi[k] = Math.max(hi[k], p.objectives[k]); }
  let best = front[0], bd = Infinity;
  for (const p of front) {
    let d = 0;
    for (let k = 0; k < M; k++) { const r = (hi[k] - lo[k]) || 1; let t = (p.objectives[k] - lo[k]) / r; if (dirs[k] === "max") t = 1 - t; d += t * t; }
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
const chosen = pick(res.front, problem.directions);

const before = JSON.stringify(baseSeed);
const v = buildPhenotypeVariation({ chosen, genes, baseSeed, problem, runParams, parent: null, extra: { intent: "knee compromise", frontSize: res.front.length } });
check("buildPhenotypeVariation does not mutate baseSeed", JSON.stringify(baseSeed) === before, null);

// ---- self-consistency: re-run the saved seed, recompute objectives ---------
{
  const r = run(v.seed.params, v.seed.site, null);
  let worst = 0;
  problem.objectives.forEach((o, k) => { worst = Math.max(worst, Math.abs(o.value(r.vars) - chosen.objectives[k])); });
  check("re-run seed reproduces chosen objectives within 1e-6", worst < 1e-6, worst);
  check("cache.metrics matches a fresh run", Math.abs(v.cache.metrics.viewAmount - r.metrics.viewAmount) < 1e-9, null);
}

// ---- provenance bundle completeness ----------------------------------------
{
  const o = v.decision.optimizer;
  check("provenance: method + citation", o.method === "NSGA-II" && /Deb/.test(o.citation), o.method);
  check("provenance: seed + run params", o.seed === runParams.seed && o.popSize === 60 && o.generations === 40, o);
  check("provenance: geneSet matches gene count", o.geneSet.length === genes.length, o.geneSet.length);
  check("provenance: objectives recorded", o.objectives.length === 2 && o.objectives[0].key === "viewAmount", o.objectives);
  check("provenance: charterSnapshot present", Array.isArray(o.charterSnapshot), o.charterSnapshot);
  check("provenance: chosen vector recorded", o.chosen && o.chosen.x.length === genes.length && o.chosen.objectives.length === 2, o.chosen);
  check("provenance: coreVersion stamped", /^core\//.test(o.coreVersion), o.coreVersion);
  check("provenance: frontSize", o.frontSize === res.front.length, o.frontSize);
}

// ---- variation shape (makeVariation contract) ------------------------------
check("variation has id + seed + decision + cache", !!(v.id && v.seed && v.decision && v.cache), null);
check("decision carries the optimizer move label", /NSGA-II/.test(v.decision.move), v.decision.move);

console.log(`\nspawn: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
