// objectives.js (v3) — turn the Charter into an optimization problem.
//
// The Charter (state.seed.ruleset.rules) is ALREADY a structured problem statement:
// each clause is {lhs(metric), op, rhs, weight, hard}. This module derives, with no
// special-casing for built-in vs custom forces:
//   · SOFT rules  (hard:false) → OBJECTIVES   (op decides maximize/minimize)
//   · HARD rules  (hard:true)  → CONSTRAINTS  (g ≤ 0 satisfied; g = −evaluateRule.margin)
// A student can also add MANUAL objectives (any of the ~30 metrics + a direction).
//
// Reuses the parity-locked evaluator: a constraint's g is exactly the negated
// `margin` from core.js evaluateRule(), so we never re-derive sign logic.

import { evaluateRule, VARIABLE_DEFS } from "../core.js";

const VDEF = Object.fromEntries(VARIABLE_DEFS.map((d) => [d.key, d]));
export const labelOf = (k) => (VDEF[k] ? VDEF[k].label : k);
export const unitOf = (k) => (VDEF[k] ? VDEF[k].unit : "");
// metrics a student may pick as manual objectives (exclude the raw "Params" group —
// those are inputs/genes, not performance metrics).
export const METRIC_CHOICES = VARIABLE_DEFS.filter((d) => d.group !== "Params");

// op → objective direction + value function (raw metric, or a derived distance).
function objFromRule(rule) {
  const k = rule.lhs, base = { metricKey: k, label: labelOf(k), unit: unitOf(k), fromRule: rule.id };
  switch (rule.op) {
    case ">=": case ">": return { ...base, kind: "metric", dir: "max", value: (v) => v[k] };
    case "<=": case "<": return { ...base, kind: "metric", dir: "min", value: (v) => v[k] };
    case "==": { const t = rule.rhs; return { ...base, kind: "derived", dir: "min", label: `${labelOf(k)} → target`, value: (v) => Math.abs((v[k] ?? NaN) - t) }; }
    case "between": { const [a, b] = rule.rhs, c = (a + b) / 2; return { ...base, kind: "derived", dir: "min", label: `${labelOf(k)} → band`, value: (v) => Math.abs((v[k] ?? NaN) - c) }; }
    case "outside": { const [a, b] = rule.rhs; return { ...base, kind: "derived", dir: "max", label: `${labelOf(k)} ↔ band`, value: (v) => Math.max(a - (v[k] ?? NaN), (v[k] ?? NaN) - b) }; }
    default: return { ...base, kind: "metric", dir: "min", value: (v) => v[k] };
  }
}

// hard rule → constraint. g ≤ 0 satisfied; g = −margin (margin ≥ 0 ⇔ satisfied).
function consFromRule(rule) {
  return {
    key: rule.lhs, op: rule.op, rhs: rule.rhs, fromRule: rule.id, label: labelOf(rule.lhs),
    value: (vars) => { const r = evaluateRule(rule, vars); return r.margin == null ? 1e15 : -r.margin; },
  };
}

const isRule = (c) => c && (c.kind === "rule" || (c.lhs && c.op)); // ignore notes

// Derive the optimization problem from charter rules + manual objectives.
// manual: [{ key, dir }].  Returns { objectives, constraints, directions, mode }.
export function deriveObjectives(rules, manual = []) {
  const clauses = (rules || []).filter(isRule);
  const soft = clauses.filter((r) => !r.hard);
  const hard = clauses.filter((r) => r.hard);

  let objectives = soft.map(objFromRule);
  for (const m of manual) {
    if (!m || !m.key) continue;
    const dup = objectives.some((o) => o.metricKey === m.key && o.dir === m.dir && o.kind === "metric");
    if (!dup) objectives.push({ kind: "metric", metricKey: m.key, dir: m.dir, label: labelOf(m.key), unit: unitOf(m.key), fromRule: null, value: (v) => v[m.key] });
  }
  const constraints = hard.map(consFromRule);
  objectives.forEach((o, i) => { o.id = o.fromRule ? "obj_" + o.fromRule : "obj_m" + i; });

  let mode;
  if (objectives.length === 0) {
    if (constraints.length) {
      // feasibility search: minimize total hard-constraint violation to find ANY
      // design that satisfies the brief.
      mode = "feasibility";
      objectives = [{ id: "obj_feas", kind: "derived", metricKey: null, dir: "min", label: "Constraint violation", unit: "",
        fromRule: null, value: (v) => constraints.reduce((s, c) => s + Math.max(0, c.value(v)), 0) }];
    } else mode = "empty";
  } else if (objectives.length === 1) mode = "single";
  else if (objectives.length === 2) mode = "scatter";
  else mode = "parallel";

  return { objectives, constraints, directions: objectives.map((o) => o.dir), mode };
}

// Build the engine's evaluate(vars→metrics provider) once. `run` is core.js run().
// Returns { evaluate(x), nObjectives, nConstraints, directions } given a decoder
// x→seed and the derived problem. (Wiring of run() happens in the caller so this
// stays free of any geometry import.)
export function makeEvaluator(problem, toVars) {
  const { objectives, constraints, directions } = problem;
  return {
    nObjectives: objectives.length,
    nConstraints: constraints.length,
    directions,
    evaluate: (x) => {
      const vars = toVars(x); // caller maps genome → run() → flattened vars
      return {
        objectives: objectives.map((o) => o.value(vars)),
        constraints: constraints.map((c) => c.value(vars)),
      };
    },
  };
}
