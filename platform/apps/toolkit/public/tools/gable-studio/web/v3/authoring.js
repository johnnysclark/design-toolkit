// authoring.js (v3) — live "Define a force" + custom tensions: PURE builders +
// validation (the modal DOM lives in app3.js / its UI helpers). A custom force is
// shape-compatible with a built-in FORCES entry, so buildForceDeck / commitMove /
// draftClause / the optimizer's objective-derivation all consume it unchanged.
//
// Custom forces are restricted to EXISTING metrics (VARIABLE_DEFS, minus the raw
// "Params" inputs) — no new physics, so zero parity cost. A formula editor for
// brand-new metrics is an explicit non-goal (would need code-gen + JS↔Python parity).

import { VARIABLE_DEFS } from "../core.js";

const VDEF = Object.fromEntries(VARIABLE_DEFS.map((d) => [d.key, d]));
export const labelOf = (k) => (VDEF[k] ? VDEF[k].label : k);
export const unitOf = (k) => (VDEF[k] ? VDEF[k].unit : "");

// scalar, direction-bearing ops only (every custom objective gets a clean direction
// + a scalar rhs; between/outside/== are excluded from authoring).
export const SCALAR_OPS = [">=", "<=", ">", "<"];
// metrics a student may bind a custom force to (exclude raw Params inputs).
export const AUTHORABLE_METRICS = VARIABLE_DEFS.filter((d) => d.group !== "Params");

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "force";
const num = (x) => (x === "" || x == null ? null : +x);

// Validate a raw authoring form. metricsNow = current core metrics (for the
// degenerate-baseline guard). Returns { ok, errors[] }.
export function validateForce(form, metricsNow = null) {
  const e = [];
  if (!form || !String(form.label || "").trim()) e.push("name is required");
  if (!form || !form.metricKey || !VDEF[form.metricKey]) e.push("pick a valid metric");
  if (!form || !SCALAR_OPS.includes(form.op)) e.push("direction must be one of ≥ ≤ > <");
  const rel = num(form && form.rel), rhs = num(form && form.rhs);
  const hasRel = rel != null, hasRhs = rhs != null;
  if (hasRel === hasRhs) e.push("set exactly one of relative (×baseline) or absolute threshold");
  if (hasRel && !(Number.isFinite(rel) && rel > 0)) e.push("relative multiplier must be a positive number");
  if (hasRhs && !Number.isFinite(rhs)) e.push("absolute threshold must be a number");
  if (hasRel && metricsNow && form && Math.abs(metricsNow[form.metricKey] ?? 0) < 1e-3)
    e.push("this metric is ~0 on the current design — use an absolute threshold");
  const w = num(form && form.weight);
  if (w != null && !(Number.isFinite(w) && w > 0)) e.push("weight must be a positive number");
  return { ok: e.length === 0, errors: e };
}

// Build a FORCES-shaped custom force. existingIds = Set of taken force ids
// (built-ins + extras + other customs) so we never collide.
export function buildCustomForce(form, existingIds = new Set(), metricsNow = null) {
  const v = validateForce(form, metricsNow);
  if (!v.ok) throw new Error(v.errors.join("; "));
  let id = "u_" + slug(form.label), base = id, n = 0;
  while (existingIds.has(id)) id = base + "-" + (++n);

  const op = form.op, rel = num(form.rel), rhs = num(form.rhs);
  const mLabel = labelOf(form.metricKey), mUnit = unitOf(form.metricKey);
  const up = op === ">=" || op === ">";
  const dirWord = up ? "Increase" : "Reduce";
  const provenance = "student-defined · " + (rel != null ? `baseline ×${rel}` : `${op} ${rhs}${mUnit && mUnit !== "0–1" ? " " + mUnit : ""}`);
  const caveat = `Student-defined force. ${mLabel} is a pedagogical proxy — see its built-in caveat; this threshold is a hypothesis to test, not a validated target.`;

  const rule = { lhs: form.metricKey, op, weight: num(form.weight) != null ? num(form.weight) : 1, hard: !!form.hard, provenance, caveat };
  if (rel != null) rule.rel = rel; else rule.rhs = rhs;

  return {
    id, label: String(form.label).trim(), glyph: (form.glyph && String(form.glyph).trim()) || "✦",
    overlay: null, modeled: true, custom: true,
    blurb: String(form.blurb || "").trim() || `A student-defined force on ${mLabel}.`,
    inputs: [], reads: [form.metricKey],
    moves: [{ id: "m1", label: `${dirWord} ${mLabel}`, desc: String(form.blurb || "").trim() || `${dirWord} ${mLabel.toLowerCase()}.`, rule }],
  };
}

// A custom tension between two committed clauses (keyed "force:move" like TENSIONS).
export function buildTension(clauseA, clauseB, why) {
  if (!clauseA || !clauseB) throw new Error("pick two clauses");
  const a = `${clauseA.force}:${clauseA.move}`, b = `${clauseB.force}:${clauseB.move}`;
  if (a === b) throw new Error("pick two different clauses");
  return { a, b, why: String(why || "").trim() || "Student-declared trade-off.", custom: true };
}

// merge built-in + extra + custom forces (used by the v3 deck/charter/optimizer).
export const mergeForces = (FORCES, EXTRA, custom) => [...FORCES, ...EXTRA, ...(custom || [])];
export const mergeTensions = (TENSIONS, EXTRA, custom) => [...TENSIONS, ...EXTRA, ...(custom || [])];
