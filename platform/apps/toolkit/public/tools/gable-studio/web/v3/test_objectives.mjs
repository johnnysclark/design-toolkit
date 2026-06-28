// test_objectives.mjs — Charter → objectives/constraints derivation. The op→direction
// table, the g = −margin constraint identity, mode routing, and a real-forces charter.
// Run: node web/v3/test_objectives.mjs
import { deriveObjectives, makeEvaluator } from "./objectives.js";
import { run, DEFAULTS, evaluateRule } from "../core.js";
import { FORCE_BY_ID, draftClause } from "../v2/forces.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };
const softRule = (id, op, extra = {}) => ({ id, kind: "rule", lhs: "viewQuality", op, hard: false, ...extra });

// ---- op → direction table --------------------------------------------------
{
  const cases = [[">=", "max", "metric"], [">", "max", "metric"], ["<=", "min", "metric"], ["<", "min", "metric"]];
  for (const [op, dir, kind] of cases) {
    const d = deriveObjectives([softRule("r", op)]);
    check(`op ${op} → ${dir}/${kind}`, d.objectives[0].dir === dir && d.objectives[0].kind === kind, d.objectives[0]);
  }
  const eq = deriveObjectives([softRule("r", "==", { rhs: 5 })]).objectives[0];
  check("op == → derived/min", eq.dir === "min" && eq.kind === "derived", eq);
  check("op == value = |x−t|", eq.value({ viewQuality: 8 }) === 3, eq.value({ viewQuality: 8 }));
  const bw = deriveObjectives([softRule("r", "between", { rhs: [2, 6] })]).objectives[0];
  check("op between → derived/min (distance to centre)", bw.dir === "min" && bw.value({ viewQuality: 4 }) === 0, bw.value({ viewQuality: 4 }));
  const out = deriveObjectives([softRule("r", "outside", { rhs: [2, 6] })]).objectives[0];
  check("op outside → derived/max", out.dir === "max", out);
}

// ---- hard → constraint, soft → objective; g = −margin identity --------------
{
  const hard = { id: "h1", kind: "rule", lhs: "solarWinterUseful", op: ">=", rhs: 5, hard: true };
  const soft = { id: "s1", kind: "rule", lhs: "viewQuality", op: ">=", rhs: 0.1, hard: false };
  const d = deriveObjectives([hard, soft]);
  check("1 hard → 1 constraint", d.constraints.length === 1 && d.constraints[0].fromRule === "h1", d.constraints.length);
  check("1 soft → 1 objective", d.objectives.length === 1 && d.objectives[0].fromRule === "s1", d.objectives.length);
  const vars = run(DEFAULTS.params, DEFAULTS.site, null).vars;
  const g = d.constraints[0].value(vars);
  const margin = evaluateRule(hard, vars).margin;
  check("constraint g === −margin", Math.abs(g - -margin) < 1e-12, { g, margin });
  check("g sign: violated ⇔ g>0 ⇔ margin<0", (g > 0) === (margin < 0), { g, margin });
}

// ---- notes are ignored -----------------------------------------------------
{
  const d = deriveObjectives([{ id: "n", kind: "note", force: "humidity", move: "note" }]);
  check("note clauses ignored", d.mode === "empty" && d.objectives.length === 0, d.mode);
}

// ---- mode routing ----------------------------------------------------------
{
  check("0 obj + hard → feasibility (1 synthetic obj)",
    (() => { const d = deriveObjectives([{ id: "h", kind: "rule", lhs: "buriedFraction", op: ">=", rhs: 0.5, hard: true }]); return d.mode === "feasibility" && d.objectives.length === 1 && d.constraints.length === 1; })(), null);
  check("1 soft → single", deriveObjectives([softRule("a", ">=")]).mode === "single", null);
  check("2 soft → scatter", deriveObjectives([softRule("a", ">="), { id: "b", kind: "rule", lhs: "overheatRatio", op: "<=", rhs: 1, hard: false }]).mode === "scatter", null);
  check("3 soft → parallel", deriveObjectives([softRule("a", ">="), { id: "b", kind: "rule", lhs: "overheatRatio", op: "<=", rhs: 1, hard: false }, { id: "c", kind: "rule", lhs: "stackIndex", op: ">=", rhs: 1, hard: false }]).mode === "parallel", null);
  check("empty → empty", deriveObjectives([]).mode === "empty", null);
}

// ---- feasibility objective = total violation -------------------------------
{
  const d = deriveObjectives([{ id: "h", kind: "rule", lhs: "buriedFraction", op: ">=", rhs: 0.5, hard: true }]);
  const v0 = d.objectives[0].value({ buriedFraction: 0 });   // far from satisfied
  const v1 = d.objectives[0].value({ buriedFraction: 0.5 }); // satisfied
  check("feasibility obj > 0 when violated", v0 > 0, v0);
  check("feasibility obj = 0 when satisfied", v1 === 0, v1);
}

// ---- manual objectives: add + dedupe ---------------------------------------
{
  const d = deriveObjectives([softRule("a", ">=")], [{ key: "solarSouth", dir: "max" }, { key: "viewQuality", dir: "max" }]);
  check("manual adds a new objective", d.objectives.some((o) => o.metricKey === "solarSouth"), d.objectives.map((o) => o.metricKey));
  check("manual duplicate of a soft rule is skipped", d.objectives.filter((o) => o.metricKey === "viewQuality").length === 1, d.objectives.filter((o) => o.metricKey === "viewQuality").length);
}

// ---- realistic charter from REAL forces (via draftClause) -------------------
{
  const baseline = run(DEFAULTS.params, DEFAULTS.site, null).metrics;
  const sun = FORCE_BY_ID["sun"], views = FORCE_BY_ID["views"];
  const m = (f, id) => f.moves.find((x) => x.id === id);
  const rules = [
    draftClause(sun, m(sun, "admit-winter"), baseline),   // hard, >=
    draftClause(sun, m(sun, "reject-summer"), baseline),  // hard, <=
    draftClause(sun, m(sun, "face-equator"), baseline),   // soft, >=
    draftClause(views, m(views, "open-view"), baseline),  // soft, >=
  ];
  const d = deriveObjectives(rules);
  check("real charter: 2 objectives (soft)", d.objectives.length === 2, d.objectives.map((o) => o.metricKey));
  check("real charter: 2 constraints (hard)", d.constraints.length === 2, d.constraints.length);
  check("real charter: mode scatter", d.mode === "scatter", d.mode);
  check("real charter: face-equator → max solarSouth", d.objectives.some((o) => o.metricKey === "solarSouth" && o.dir === "max"), null);

  // makeEvaluator wiring: toVars maps a genome (ignored here) → run() vars
  const ev = makeEvaluator(d, () => run(DEFAULTS.params, DEFAULTS.site, null).vars);
  const out = ev.evaluate([]);
  check("evaluator: nObjectives/nConstraints", ev.nObjectives === 2 && ev.nConstraints === 2, { o: ev.nObjectives, c: ev.nConstraints });
  check("evaluator: finite objective/constraint arrays", out.objectives.every(Number.isFinite) && out.constraints.every(Number.isFinite), out);
}

console.log(`\nobjectives: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
