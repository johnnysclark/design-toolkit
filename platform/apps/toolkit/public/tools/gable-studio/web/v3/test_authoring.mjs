// test_authoring.mjs — live force authoring: validation rejects bad input, the built
// object is shape-compatible with a built-in, and authoring→clause→evaluateRule→
// optimizer-objective round-trips. Run: node web/v3/test_authoring.mjs
import { buildCustomForce, validateForce, buildTension, AUTHORABLE_METRICS, SCALAR_OPS } from "./authoring.js";
import { draftClause } from "../v2/forces.js";
import { run, DEFAULTS, evaluateRule } from "../core.js";
import { deriveObjectives } from "./objectives.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };

const base = run(DEFAULTS.params, DEFAULTS.site, null);

// ---- authorable metric list excludes raw Params -----------------------------
check("authorable metrics exclude Params group", AUTHORABLE_METRICS.every((d) => d.group !== "Params"), null);
check("authorable metrics non-empty", AUTHORABLE_METRICS.length > 10, AUTHORABLE_METRICS.length);

// ---- validation: a good form passes ----------------------------------------
const good = { label: "Keep it compact", glyph: "✦", blurb: "less skin", metricKey: "surfaceToVolume", op: "<=", rel: 0.9, weight: 2, hard: false };
check("valid form passes", validateForce(good, base.metrics).ok, validateForce(good, base.metrics).errors);

// ---- validation: rejects -----------------------------------------------------
const rejects = [
  ["missing name", { ...good, label: "" }],
  ["unknown metric", { ...good, metricKey: "notAMetric" }],
  ["non-scalar op", { ...good, op: "between" }],
  ["both rel and rhs", { ...good, rhs: 1 }],
  ["neither rel nor rhs", { ...good, rel: undefined, rhs: undefined }],
  ["non-finite rhs", { ...good, rel: undefined, rhs: "abc" }],
  ["negative rel", { ...good, rel: -1 }],
  ["bad weight", { ...good, weight: 0 }],
];
for (const [name, form] of rejects) check(`rejects: ${name}`, !validateForce(form, base.metrics).ok, form);

// degenerate baseline guard: glazingRatio ~0.027 is fine; pick a ~0 metric.
// (skyView baseline ~0.1 isn't ~0; construct a synthetic metricsNow to test the guard.)
check("rejects rel on ~0-baseline metric", !validateForce({ ...good, metricKey: "surfaceToVolume", rel: 1.2 }, { surfaceToVolume: 0.0001 }).ok, null);
check("allows absolute on ~0-baseline metric", validateForce({ ...good, metricKey: "surfaceToVolume", rel: undefined, rhs: 0.5 }, { surfaceToVolume: 0.0001 }).ok, null);

// ---- buildCustomForce: shape compatible with a built-in ---------------------
{
  const f = buildCustomForce(good, new Set(), base.metrics);
  check("custom force has built-in shape", ["id", "label", "glyph", "overlay", "modeled", "blurb", "inputs", "reads", "moves"].every((k) => k in f), Object.keys(f));
  check("custom force id namespaced u_", f.id.startsWith("u_"), f.id);
  check("custom force modeled + custom flag", f.modeled === true && f.custom === true, null);
  check("reads = [metric]", f.reads.length === 1 && f.reads[0] === "surfaceToVolume", f.reads);
  const m = f.moves[0];
  check("move has id/label/desc/rule", !!(m.id && m.label && m.desc && m.rule), m);
  check("rule has lhs/op/weight/hard/provenance/caveat", ["lhs", "op", "weight", "hard", "provenance", "caveat"].every((k) => k in m.rule), Object.keys(m.rule));
  check("rule carries the chosen rel", m.rule.rel === 0.9 && m.rule.rhs == null, m.rule);
}

// ---- id uniqueness ---------------------------------------------------------
{
  const ids = new Set(["u_keep-it-compact"]);
  const f = buildCustomForce(good, ids, base.metrics);
  check("id collision avoided", f.id !== "u_keep-it-compact" && f.id.startsWith("u_keep-it-compact-"), f.id);
}

// ---- ROUND-TRIP: authoring → draftClause → evaluateRule → optimizer objective
{
  const f = buildCustomForce({ label: "Open the view wide", metricKey: "viewAmount", op: ">=", rel: 1.3, weight: 1, hard: false }, new Set(), base.metrics);
  const clause = draftClause(f, f.moves[0], base.metrics);
  check("custom clause: finite rhs from rel×baseline", Number.isFinite(clause.rhs) && clause.rhs > 0, clause.rhs);
  const evr = evaluateRule(clause, base.vars);
  check("custom clause: evaluateRule has a value", evr.value != null && typeof evr.ok === "boolean", evr);
  // feeds the optimizer with no special-casing
  const prob = deriveObjectives([clause]);
  check("custom clause → 1 objective", prob.objectives.length === 1 && prob.objectives[0].metricKey === "viewAmount", prob.objectives);
  check("custom clause → max direction (op >=)", prob.objectives[0].dir === "max", prob.objectives[0].dir);
}

// ---- hard custom force → constraint -----------------------------------------
{
  const f = buildCustomForce({ label: "Cap glazing hard", metricKey: "glazingRatio", op: "<=", rhs: 0.1, weight: 2, hard: true }, new Set(), base.metrics);
  const clause = draftClause(f, f.moves[0], base.metrics);
  const prob = deriveObjectives([clause]);
  check("hard custom clause → constraint (feasibility mode)", prob.constraints.length === 1 && prob.mode === "feasibility", prob.mode);
}

// ---- custom tension --------------------------------------------------------
{
  const t = buildTension({ force: "glazing", move: "budget-cap" }, { force: "views", move: "open-view" }, "budget vs view");
  check("tension keyed force:move", t.a === "glazing:budget-cap" && t.b === "views:open-view", t);
  let threw = false; try { buildTension({ force: "a", move: "x" }, { force: "a", move: "x" }, ""); } catch (e) { threw = true; }
  check("tension rejects identical clauses", threw, null);
}

console.log(`\nauthoring: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
