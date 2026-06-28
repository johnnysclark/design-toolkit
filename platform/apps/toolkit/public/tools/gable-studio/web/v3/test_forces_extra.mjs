// test_forces_extra.mjs — every new force binds to a REAL existing metric, uses a
// scalar op, drafts a finite clause, and evaluates cleanly. Run: node web/v3/test_forces_extra.mjs
import { EXTRA_FORCES, EXTRA_TENSIONS } from "./forces_extra.js";
import { FORCE_BY_ID, draftClause } from "../v2/forces.js";
import { run, DEFAULTS, evaluateRule, VARIABLE_DEFS } from "../core.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };

const base = run(DEFAULTS.params, DEFAULTS.site, null);
const metricKeys = new Set(Object.keys(base.metrics));
const vdefKeys = new Set(VARIABLE_DEFS.map((d) => d.key));
const SCALAR = new Set([">=", "<=", ">", "<"]);

check("ships 5 extra forces", EXTRA_FORCES.length === 5, EXTRA_FORCES.length);

// no id collisions with built-ins; unique among extras
{
  const ids = EXTRA_FORCES.map((f) => f.id);
  check("extra force ids unique", new Set(ids).size === ids.length, ids);
  check("no collision with built-in forces", ids.every((id) => !FORCE_BY_ID[id]), ids.filter((id) => FORCE_BY_ID[id]));
}

for (const f of EXTRA_FORCES) {
  check(`${f.id}: has label/glyph/blurb/modeled`, !!(f.label && f.glyph && f.blurb && f.modeled === true), f.id);
  check(`${f.id}: reads are real metrics`, f.reads.every((k) => metricKeys.has(k)), f.reads.filter((k) => !metricKeys.has(k)));
  check(`${f.id}: reads are in VARIABLE_DEFS`, f.reads.every((k) => vdefKeys.has(k)), f.reads.filter((k) => !vdefKeys.has(k)));
  for (const m of f.moves) {
    const r = m.rule;
    check(`${f.id}/${m.id}: lhs is a real metric`, metricKeys.has(r.lhs), r.lhs);
    check(`${f.id}/${m.id}: scalar op`, SCALAR.has(r.op), r.op);
    check(`${f.id}/${m.id}: exactly one of rel|rhs`, (r.rel != null) !== (r.rhs != null), { rel: r.rel, rhs: r.rhs });
    check(`${f.id}/${m.id}: has provenance + caveat`, !!(r.provenance && r.caveat), m.id);
    // draftClause → finite, evaluable clause (the force→clause→evaluateRule round-trip)
    const clause = draftClause(f, m, base.metrics);
    check(`${f.id}/${m.id}: drafted rhs finite`, Number.isFinite(clause.rhs), clause.rhs);
    const ev = evaluateRule(clause, base.vars);
    check(`${f.id}/${m.id}: evaluateRule has a value (not "no value")`, ev.value != null && typeof ev.ok === "boolean", ev);
  }
}

// tensions reference real force:move pairs (in extras OR built-ins)
{
  const moveKey = new Set();
  for (const f of [...EXTRA_FORCES, ...Object.values(FORCE_BY_ID)]) for (const m of f.moves) moveKey.add(`${f.id}:${m.id}`);
  for (const t of EXTRA_TENSIONS) {
    check(`tension ${t.a}↔${t.b}: both ends exist`, moveKey.has(t.a) && moveKey.has(t.b), { a: moveKey.has(t.a), b: moveKey.has(t.b) });
    check(`tension ${t.a}↔${t.b}: has why`, !!t.why, t);
  }
}

console.log(`\nforces_extra: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
