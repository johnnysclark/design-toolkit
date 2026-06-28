// spawn.js (v3) — turn a chosen Pareto phenotype into a Series variation.
//
// This closes the pedagogy loop: the optimizer POPULATES the front; the student
// SELECTS a phenotype and SPAWNS it as a normal variation carrying full, repro-
// ducible optimizer provenance. Reuses makeVariation (series.js) verbatim — the
// free-form `decision` field carries the optimizer bundle, so series.js is untouched.

import { decode } from "./genome.js";
import { run } from "../core.js";
import { makeVariation, coreVersion } from "../v2/series.js";

const clone = (o) => JSON.parse(JSON.stringify(o));

// Build the decision.optimizer provenance bundle (everything needed to regenerate
// the run and the chosen point: seed, gene set, derived problem, charter snapshot).
export function optimizerProvenance({ chosen, problem, genes, runParams, charterRules, metrics, frontSize }) {
  return {
    method: "NSGA-II", citation: "Deb et al. 2002",
    seed: runParams.seed, popSize: runParams.popSize, generations: runParams.generations,
    pCross: runParams.pCross, etaC: runParams.etaC, pMut: runParams.pMut, etaM: runParams.etaM,
    geneSet: genes.map((g) => ({ path: g.path, target: g.target, min: g.min, max: g.max, step: g.step })),
    objectives: problem.objectives.map((o) => ({ key: o.metricKey, dir: o.dir, kind: o.kind, fromRule: o.fromRule, label: o.label, unit: o.unit })),
    constraints: problem.constraints.map((c) => ({ key: c.key, op: c.op, rhs: c.rhs, fromRule: c.fromRule })),
    charterSnapshot: clone(charterRules || []),
    chosen: { x: chosen.x.slice(), objectives: chosen.objectives.slice(), constraintViolation: chosen.constraintViolation, rank: chosen.rank, crowding: chosen.crowding },
    frontSize: frontSize ?? null,
    coreVersion: coreVersion(metrics),
  };
}

// Build a complete Series variation from a chosen phenotype.
// args: { chosen, genes, baseSeed, problem, runParams, parent, extra:{intent,winner,force,note,frontSize} }
export function buildPhenotypeVariation(args) {
  const { chosen, genes, baseSeed, problem, runParams, parent } = args, extra = args.extra || {};
  const decoded = decode(chosen.x, genes, baseSeed); // snapped → slider-reproducible
  const seed = { params: decoded.params, site: decoded.site, ruleset: clone(baseSeed.ruleset || { rules: [], notes: [] }) };
  const fresh = run(seed.params, seed.site, seed.ruleset); // self-consistency: re-derive from the seed
  const decision = {
    force: extra.force || "(optimizer)",
    move: "Optimizer-selected phenotype (NSGA-II)",
    intent: extra.intent || "", winner: extra.winner || "", note: extra.note || "",
    optimizer: optimizerProvenance({ chosen, problem, genes, runParams, charterRules: seed.ruleset.rules, metrics: fresh.metrics, frontSize: extra.frontSize }),
  };
  const cache = { metrics: fresh.metrics, evaluation: fresh.evaluation };
  return makeVariation(seed, parent || null, decision, cache);
}
