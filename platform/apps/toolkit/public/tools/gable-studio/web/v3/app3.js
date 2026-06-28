// app3.js (v3) — the optimizer studio. Reuses the v2 engine/renderer/data modules
// unchanged (core.js, viewport.js, v2/forces.js, v2/series.js, v2/units.js) and adds
// the NSGA-II optimizer + extensible forces on top. The loop it enacts:
//   READ forces → COMMIT a charter → choose GENES (free vars) + OBJECTIVES →
//   EVOLVE a Pareto front (live) → INSPECT a phenotype → SPAWN it into the series.
import { DEFAULTS, run, VARIABLE_DEFS, WALL_HOSTS, ROOF_HOSTS, HOST_LABELS } from "../core.js";
import { createViewport } from "../viewport.js";
import { FORCES, TENSIONS as TENSIONS_BUILTIN, draftClause } from "../v2/forces.js";
import { Series, makeVariation, diffSeeds } from "../v2/series.js";
import { fmtMetricImp, impConv, sliderUnit } from "../v2/units.js";
import { EXTRA_FORCES, EXTRA_TENSIONS } from "./forces_extra.js";
import { GENE_CATALOG, DEFAULT_GENES, buildGenes, bounds as geneBounds, encode, decode, getPath, setPath } from "./genome.js";
import { deriveObjectives, makeEvaluator, METRIC_CHOICES } from "./objectives.js";
import { nsga2Stepper } from "./nsga2.js";
import { buildPhenotypeVariation } from "./spawn.js";
import { buildCustomForce, buildTension, AUTHORABLE_METRICS, mergeForces, mergeTensions } from "./authoring.js";
import * as charts from "./charts.js";

// ---- helpers ---------------------------------------------------------------
const $ = (s) => document.querySelector(s);
const clone = (o) => JSON.parse(JSON.stringify(o));
const round2 = (x) => Math.round(x * 100) / 100;
const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const clampInt = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Math.round(num(v, d))));
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v); }
  for (const kid of kids.flat()) { if (kid == null || kid === false) continue; e.append(kid.nodeType ? kid : document.createTextNode(kid)); }
  return e;
}
const VDEF = Object.fromEntries(VARIABLE_DEFS.map((d) => [d.key, d]));
const labelOf = (k) => (VDEF[k] ? VDEF[k].label : k);
const unitOf = (k) => (VDEF[k] ? VDEF[k].unit : "");
const fmtObj = (o, v) => fmtMetricImp(o.unit || unitOf(o.metricKey), v);
const setStatus = (t) => { $("#v3-status").textContent = t; };
const showModal = (id) => { $("#" + id).style.display = "flex"; };
const hideModal = (id) => { $("#" + id).style.display = "none"; };
function showTab(name) { for (const b of document.querySelectorAll(".ctab")) b.classList.toggle("on", b.dataset.tab === name); const mk = $("#tab-make"), fr = $("#tab-front"); if (mk) mk.hidden = name !== "make"; if (fr) fr.hidden = name !== "front"; }

// ---- state -----------------------------------------------------------------
const state = {
  seed: { params: clone(DEFAULTS.params), site: clone(DEFAULTS.site), ruleset: { name: "Charter", rules: [], notes: [] } },
  governing: new Set(),
  display: { mode: "analysis", shadowIntensity: 0.6, sunHour: 15, analysisField: "solarYear" },
  currentId: null, last: null,
  customForces: [], customTensions: [],
  genes: DEFAULT_GENES.slice(), geneOverrides: {}, manualObjectives: [],
  // run
  stepper: null, raf: null, running: false, result: null, problem: null, activeGenes: null,
  runParams: { seed: 1, popSize: 80, generations: 60, pCross: 0.9, etaC: 20, etaM: 20, pMut: 0.1 },
  selected: null,
};

const allForces = () => mergeForces(FORCES, EXTRA_FORCES, state.customForces);
const allTensions = () => mergeTensions(TENSIONS_BUILTIN, EXTRA_TENSIONS, state.customTensions);
const forceById = (id) => allForces().find((f) => f.id === id);
function activeTensionsV3(clauses) { const have = new Set(clauses.map((c) => `${c.force}:${c.move}`)); return allTensions().filter((t) => have.has(t.a) && have.has(t.b)); }

// ---- viewport (reused) -----------------------------------------------------
let viewport = null;
try { viewport = createViewport($("#view")); }
catch (e) { $("#stage").append(el("div", { class: "viewerr" }, "3D viewport could not start (needs WebGL). Forces, charter, optimizer and series still work. " + e.message)); }

// ---- manual geometry (MAKE) — reuses v2's imperial slider model -------------
const MAKE_SPEC = GENE_CATALOG.filter((g) => g.target === "params" && !g.path.startsWith("apertures"));
let metricReadEls = [];
function makeSlider(rootObj, spec, onChange) {
  const U = sliderUnit(spec);
  const valEl = el("span", { class: "slval" }, U.label(getPath(rootObj, spec.path)));
  const input = el("input", { type: "range", min: U.dmin, max: U.dmax, step: U.dstep, value: U.toDisp(getPath(rootObj, spec.path)),
    oninput: (e) => { const v = U.fromDisp(parseFloat(e.target.value)); setPath(rootObj, spec.path, v); valEl.textContent = U.label(v); onChange(); } });
  return el("div", { class: "sl" }, el("label", null, spec.label), valEl, input);
}
function buildMake() { const host = $("#make"); if (!host) return; host.replaceChildren(); for (const sp of MAKE_SPEC) host.append(makeSlider(state.seed.params, sp, onGeo)); }
function buildApertures() {
  const host = $("#apertures"); if (!host) return; host.replaceChildren();
  const aps = state.seed.params.apertures || [];
  if (!aps.length) host.append(el("div", { class: "ap-empty" }, "No openings."));
  aps.forEach((ap, i) => host.append(apertureRow(ap, i)));
  host.append(el("button", { class: "btn small wide", onclick: addAperture }, "＋ add opening"));
}
function apertureRow(ap, i) {
  const hostSel = el("select", { class: "ap-host", onchange: (e) => { ap.host = e.target.value; onGeo(); } },
    ...[...WALL_HOSTS, ...ROOF_HOSTS].map((h) => el("option", { value: h, selected: h === ap.host ? true : null }, HOST_LABELS[h])));
  return el("div", { class: "aprow" },
    el("div", { class: "aphd" }, el("b", null, ap.id || ("A" + (i + 1))), hostSel,
      el("button", { class: "clause-x", title: "Remove", onclick: () => { state.seed.params.apertures.splice(i, 1); state.selected = null; rebuildBase(); } }, "✕")),
    makeSlider(ap, { path: "w", label: "width", min: 0.2, max: 6, step: 0.1, unit: "m" }, onGeo),
    makeSlider(ap, { path: "h", label: "height", min: 0.2, max: 3, step: 0.1, unit: "m" }, onGeo),
    makeSlider(ap, { path: "u", label: "across", min: 0, max: 1, step: 0.05, unit: "" }, onGeo),
    makeSlider(ap, { path: "v", label: "up", min: 0, max: 1, step: 0.05, unit: "" }, onGeo));
}
function addAperture() { const aps = state.seed.params.apertures; aps.push({ id: "A" + (aps.length + 1), host: "wall_ny", u: 0.5, v: 0.5, w: 1.2, h: 1.2 }); state.selected = null; rebuildBase(); }
const onGeo = () => { state.selected = null; liveUpdate(); };

// ---- recompute -------------------------------------------------------------
// light (slider drags): recompute metrics, refresh viewport + reads + charter,
// WITHOUT rebuilding the deck/make/aperture DOM so a drag isn't interrupted.
function liveUpdate() {
  const r = run(state.seed.params, state.seed.site, state.seed.ruleset);
  state.last = { model: r.model, metrics: r.metrics, evaluation: r.evaluation, vars: r.vars };
  if (viewport && !state.selected) viewport.setModel(r.model, state.display);
  for (const mr of metricReadEls) mr.el.textContent = fmtMetricImp(unitOf(mr.key), r.metrics[mr.key]);
  renderCharter(); renderObjectives();
}
// structural: rebuild the deck + geometry sliders + charter + objectives.
function rebuildBase() {
  const r = run(state.seed.params, state.seed.site, state.seed.ruleset);
  state.last = { model: r.model, metrics: r.metrics, evaluation: r.evaluation, vars: r.vars };
  if (viewport && !state.selected) viewport.setModel(r.model, state.display);
  buildForceDeck(); buildMake(); buildApertures(); renderCharter(); renderObjectives();
}

// ---- LEFT: force deck ------------------------------------------------------
function clauseExists(forceId, moveId) {
  return state.seed.ruleset.rules.some((c) => c.force === forceId && c.move === moveId) ||
    state.seed.ruleset.notes.some((c) => c.force === forceId && c.move === moveId);
}
function movePreview(m) {
  const r = m.rule; if (!r) return "";
  const u = impConv(unitOf(r.lhs)); const uu = u.u && u.u !== "0–1" ? " " + u.u : "";
  if (r.rhs != null) return `test: ${labelOf(r.lhs)} ${r.op} ${round2(r.rhs * u.f)}${uu}`;
  return `test: ${labelOf(r.lhs)} ${r.op} ${r.provenance}`;
}
function buildForceDeck() {
  const host = $("#forcedeck"); host.replaceChildren(); metricReadEls = [];
  for (const f of allForces()) {
    const governs = state.governing.has(f.id);
    const head = el("div", { class: "fc-head" },
      el("span", { class: "fc-glyph" }, f.glyph), el("span", { class: "fc-title" }, f.label),
      f.custom ? el("button", { class: "fc-custom-x", title: "Delete this custom force", onclick: (e) => { e.stopPropagation(); deleteCustomForce(f.id); } }, "✕") : null,
      el("button", { class: "fc-gov", onclick: (e) => { e.stopPropagation(); toggleGovern(f.id); } }, governs ? "governs ✓" : "govern"));
    const reads = el("div", { class: "fc-reads" });
    if (f.modeled) for (const k of (f.reads || [])) { const b = el("b", null, state.last ? fmtMetricImp(unitOf(k), state.last.metrics[k]) : "—"); metricReadEls.push({ key: k, el: b }); reads.append(el("span", { class: "fc-read", title: labelOf(k) }, labelOf(k) + ": ", b)); }
    const inputs = el("div", { class: "fc-inputs" });
    if (f.inputs) for (const sp of f.inputs) inputs.append(makeSlider(state.seed.site, sp, onGeo));
    const moves = el("div");
    moves.append(el("div", { class: "fc-moves-h" }, f.modeled ? "Moves — commit one as a rule" : "Response"));
    for (const m of f.moves) {
      const added = clauseExists(f.id, m.id);
      moves.append(el("button", { class: "move" + (added ? " added" : ""), onclick: () => commitMove(f, m) },
        el("div", { class: "move-label" }, (added ? "✓ " : "+ ") + m.label),
        el("div", { class: "move-desc" }, m.desc),
        m.rule ? el("div", { class: "move-test" }, movePreview(m)) : null));
    }
    host.append(el("div", { class: "forcecard" + (governs ? " governs" : "") }, head,
      el("p", { class: "fc-blurb" }, f.blurb),
      f.modeled ? reads : el("div", { class: "fc-absence" }, f.absence || ""), inputs, moves));
  }
}

// ---- charter ---------------------------------------------------------------
function statusOf(res) { if (res.ok) return "met"; if (res.margin != null && res.rhs && Math.abs(res.margin) <= Math.abs(res.rhs) * 0.15) return "near"; return "bad"; }
function renderCharter() {
  const ev = state.last && state.last.evaluation;
  // standing
  let met = 0, near = 0, bad = 0;
  if (ev) for (const res of ev.results) { const st = res.ok ? "met" : (res.margin != null && res.rule.rhs && Math.abs(res.margin) <= Math.abs(res.rule.rhs) * 0.15) ? "near" : "bad"; if (st === "met") met++; else if (st === "near") near++; else bad++; }
  const hardPass = !ev || ev.hardPass;
  const standing = $("#charter-standing"); standing.className = "standing" + (hardPass ? "" : " hard-fail");
  standing.replaceChildren(
    el("div", { class: "standing-line" }, `${met} met · ${near} within reach · ${bad} fighting`),
    el("div", { class: "standing-sub" }, !ev || ev.total === 0 ? "Commit moves to give this variation something to answer to." : hardPass ? "All hard rules pass — a valid response." : "A hard rule is unmet — not yet valid."));
  // tensions
  const tEl = $("#charter-tensions"); tEl.replaceChildren();
  for (const t of activeTensionsV3(state.seed.ruleset.rules)) tEl.append(el("div", { class: "tension" }, el("b", null, "these fight — "), t.why));
  // clauses
  const host = $("#charter-clauses"); host.replaceChildren();
  const evById = {}; if (ev) for (const r of ev.results) evById[r.rule.id] = r;
  for (const c of state.seed.ruleset.rules) {
    const r = evById[c.id]; const st = r ? (r.ok ? "met" : (r.margin != null && c.rhs && Math.abs(r.margin) <= Math.abs(c.rhs) * 0.15) ? "near" : "bad") : "";
    const u = impConv(unitOf(c.lhs)); const uu = u.u && u.u !== "0–1" ? " " + u.u : "";
    host.append(el("div", { class: "clause" },
      el("div", { class: "clause-head" }, el("span", null, el("b", null, c.forceLabel || ""), " — ", c.moveLabel || ""),
        el("button", { class: "clause-x", onclick: () => removeClause(c.id) }, "✕")),
      el("div", { class: "clause-test" }, `${labelOf(c.lhs)} ${c.op} ${round2((c.rhs || 0) * u.f)}${uu} `, c.hard ? el("span", { class: "st bad" }, "· hard") : null,
        r ? el("span", { class: "st " + st }, ` · ${r.value == null ? "—" : round2(r.value * u.f) + uu} ${st === "met" ? "✓" : st === "near" ? "≈" : "✗"}`) : null),
      el("div", { class: "clause-prov" }, c.provenance || "")));
  }
  for (const c of state.seed.ruleset.notes) host.append(el("div", { class: "clause note" },
    el("div", { class: "clause-head" }, el("span", null, el("b", null, c.forceLabel || ""), " — note"), el("button", { class: "clause-x", onclick: () => removeClause(c.id) }, "✕")),
    el("div", { class: "clause-prov" }, c.caveat || "")));
}
function commitMove(force, move) {
  const rules = state.seed.ruleset.rules, notes = state.seed.ruleset.notes;
  const iR = rules.findIndex((c) => c.force === force.id && c.move === move.id);
  const iN = notes.findIndex((c) => c.force === force.id && c.move === move.id);
  if (iR >= 0) rules.splice(iR, 1); else if (iN >= 0) notes.splice(iN, 1);
  else { const cl = draftClause(force, move, state.last ? state.last.metrics : {}); if (cl.kind === "note") notes.push(cl); else rules.push(cl); state.governing.add(force.id); }
  rebuildBase();
}
function removeClause(id) {
  state.seed.ruleset.rules = state.seed.ruleset.rules.filter((c) => c.id !== id);
  state.seed.ruleset.notes = state.seed.ruleset.notes.filter((c) => c.id !== id);
  rebuildBase();
}
function toggleGovern(id) { if (state.governing.has(id)) state.governing.delete(id); else state.governing.add(id); buildForceDeck(); }
function proposeCharter() {
  const m = state.last ? state.last.metrics : {};
  state.seed.ruleset.rules = [];
  for (const [fid, mid] of [["sun", "admit-winter"], ["sun", "reject-summer"], ["wind", "shelter"], ["views", "open-view"]]) {
    const f = forceById(fid); if (!f) continue; const mv = f.moves.find((x) => x.id === mid); if (!mv) continue;
    state.seed.ruleset.rules.push(draftClause(f, mv, m)); state.governing.add(fid);
  }
  rebuildBase(); setStatus("Proposed a 4-clause charter — note the sun admit-vs-reject tension. Every threshold is editable.");
}
function resetDesign() { state.seed.params = clone(DEFAULTS.params); state.seed.site = clone(DEFAULTS.site); state.currentId = null; state.selected = null; rebuildBase(); setStatus("Design reset (charter kept)."); }

// ---- genes -----------------------------------------------------------------
function renderGenes() {
  const host = $("#v3-genes"); host.replaceChildren();
  const row = (g) => {
    const on = state.genes.includes(g.path), conv = impConv(g.unit);
    const ov = state.geneOverrides[g.path] || {}, minSI = ov.min != null ? ov.min : g.min, maxSI = ov.max != null ? ov.max : g.max;
    const cb = el("input", { type: "checkbox", class: "gene-toggle", checked: on ? true : null,
      onchange: (e) => { if (e.target.checked) { if (!state.genes.includes(g.path)) state.genes.push(g.path); } else state.genes = state.genes.filter((p) => p !== g.path); renderGenes(); } });
    const mk = (which, val) => el("input", { type: "number", value: round2(val * conv.f), step: (g.step * conv.f) || "any", disabled: on ? null : true,
      onchange: (e) => { const si = num(e.target.value, val * conv.f) / conv.f; state.geneOverrides[g.path] = Object.assign({ min: minSI, max: maxSI }, state.geneOverrides[g.path] || {}); state.geneOverrides[g.path][which] = si; } });
    return el("div", { class: "generow" + (on ? "" : " off") }, cb, el("span", { class: "gn" }, g.label), mk("min", minSI), el("span", { class: "tiny" }, "–"), mk("max", maxSI), el("span", { class: "tiny" }, conv.u));
  };
  host.append(el("div", { class: "tiny" }, "Geometry — free to evolve:"));
  GENE_CATALOG.filter((g) => g.target === "params").forEach((g) => host.append(row(g)));
  host.append(el("div", { class: "tiny" }, "Site — what-if (off by default):"));
  GENE_CATALOG.filter((g) => g.target === "site").forEach((g) => host.append(row(g)));
}

// ---- objectives ------------------------------------------------------------
function renderObjectives() {
  const host = $("#v3-objectives"); host.replaceChildren();
  const problem = deriveObjectives(state.seed.ruleset.rules, state.manualObjectives);
  const chips = el("div", { class: "objchips" });
  for (const o of problem.objectives) {
    const manual = !o.fromRule && o.metricKey;
    chips.append(el("span", { class: "objchip" }, `${o.label} ${o.dir === "max" ? "↑" : "↓"}`,
      manual ? el("span", { class: "ox", onclick: () => { state.manualObjectives = state.manualObjectives.filter((m) => !(m.key === o.metricKey && m.dir === o.dir)); renderObjectives(); } }, "✕") : null));
  }
  for (const c of problem.constraints) { const u = impConv(unitOf(c.key)); chips.append(el("span", { class: "objchip constraint" }, `${c.label} ${c.op} ${round2((c.rhs || 0) * u.f)} (hard)`)); }
  if (!problem.objectives.length && !problem.constraints.length) chips.append(el("span", { class: "tiny" }, "No objectives yet — commit soft rules or add one below."));
  host.append(chips);
  const sel = el("select", null, ...METRIC_CHOICES.map((d) => el("option", { value: d.key }, `${d.label}${d.unit && d.unit !== "0–1" ? " (" + d.unit + ")" : ""}`)));
  const dirSel = el("select", null, el("option", { value: "max" }, "maximize"), el("option", { value: "min" }, "minimize"));
  host.append(el("div", { class: "objadd" }, "Add objective:", sel, dirSel,
    el("button", { class: "btn small", onclick: () => { state.manualObjectives.push({ key: sel.value, dir: dirSel.value }); renderObjectives(); } }, "+ add")));
  const modeTxt = { scatter: "2 objectives → objective-space scatter", parallel: problem.objectives.length + " objectives → parallel coordinates", single: "1 objective → single-objective (Galapagos-style)", feasibility: "only hard rules → feasibility search", empty: "nothing to optimize yet" }[problem.mode];
  host.append(el("div", { class: "objmode" }, "Mode: ", el("b", null, modeTxt)));
}

// ---- run loop --------------------------------------------------------------
function updateButtons() {
  $("#v3-run").disabled = state.running;
  $("#v3-pause").disabled = !state.running;
  $("#v3-step").disabled = state.running;
  $("#v3-stop").disabled = !state.stepper;
  $("#v3-spawn").disabled = !state.selected;
}
function initRun() {
  const problem = deriveObjectives(state.seed.ruleset.rules, state.manualObjectives);
  if (problem.mode === "empty") { setStatus("Add a soft rule or pick at least one objective to optimize."); return false; }
  if (!state.genes.length) { setStatus("Mark at least one gene free to evolve (step 4)."); return false; }
  const genes = buildGenes(state.genes, state.geneOverrides);
  const seedN = clampInt($("#v3-seed").value, 0, 1e9, 1) >>> 0;
  const pop = clampInt($("#v3-pop").value, 20, 200, 80), gens = clampInt($("#v3-gens").value, 10, 300, 60);
  const ev = makeEvaluator(problem, (x) => { const sd = decode(x, genes, state.seed); return run(sd.params, sd.site, null).vars; });
  const cfg = { bounds: geneBounds(genes), nObjectives: ev.nObjectives, nConstraints: ev.nConstraints, directions: ev.directions, evaluate: ev.evaluate,
    popSize: pop, generations: gens, pCross: 0.9, etaC: 20, etaM: 20, pMut: 1 / genes.length, seed: seedN, seedPop: [encode(state.seed, genes)] };
  state.problem = problem; state.activeGenes = genes; state.runParams = { seed: seedN, popSize: pop, generations: gens, pCross: 0.9, etaC: 20, etaM: 20, pMut: 1 / genes.length };
  state.stepper = nsga2Stepper(cfg); state.result = state.stepper.state; state.selected = null;
  return true;
}
function loop() {
  if (!state.running || !state.stepper) return;
  const t0 = performance.now();
  do { state.result = state.stepper.step(); } while (state.result && !state.stepper.done && performance.now() - t0 < 12);
  drawCharts(); updateProgress();
  if (state.stepper.done) { finishRun(); return; }
  state.raf = requestAnimationFrame(loop);
}
function startRun() { if (state.running) return; if (!initRun()) return; showTab("front"); state.running = true; updateButtons(); setStatus(`Evolving — ${state.problem.objectives.length} objective(s), ${state.problem.constraints.length} constraint(s), ${state.activeGenes.length} genes, seed ${state.runParams.seed}.`); state.raf = requestAnimationFrame(loop); }
function pauseRun() { state.running = false; if (state.raf) cancelAnimationFrame(state.raf); updateButtons(); setStatus("Paused — Resume with Run, or Step one generation."); }
function stepRun() { if (state.running) return; if (!state.stepper || state.stepper.done) { if (!initRun()) return; } showTab("front"); if (!state.stepper.done) { state.result = state.stepper.step(); drawCharts(); updateProgress(); } if (state.stepper.done) finishRun(); else updateButtons(); }
function stopRun() { state.running = false; if (state.raf) cancelAnimationFrame(state.raf); if (state.result && state.result.front.length) selectKnee(); state.stepper = null; updateButtons(); setStatus("Stopped — partial front kept. Pick a phenotype to spawn."); }
function finishRun() { state.running = false; if (state.result && state.result.front.length) selectKnee(); updateButtons(); setStatus(`Done — ${state.result.front.length} designs on the front. The ringed point is a suggested compromise.`); }
function selectKnee() { const k = charts.kneePoint(state.result.front, state.problem.directions); if (k) selectPhenotype(k); }
function updateProgress() {
  if (!state.result) return; const h = state.result.history[state.result.history.length - 1] || {};
  $("#v3-progress").textContent = `gen ${state.result.generation}/${state.runParams.generations} · front ${state.result.front.length} · feasible ${Math.round((h.feasibleFraction || 0) * 100)}%`;
}

// ---- charts + phenotype ----------------------------------------------------
function tensionLabel(problem) {
  if (problem.objectives.length !== 2) return null;
  const fr = problem.objectives.map((o) => o.fromRule).filter(Boolean); if (fr.length !== 2) return null;
  const byId = {}; for (const c of state.seed.ruleset.rules) byId[c.id] = c;
  const keys = fr.map((id) => byId[id] ? `${byId[id].force}:${byId[id].move}` : null);
  const t = allTensions().find((t) => (t.a === keys[0] && t.b === keys[1]) || (t.a === keys[1] && t.b === keys[0]));
  return t ? t.why : null;
}
function drawCharts() {
  if (!state.result || !state.problem) { $("#v3-charts").replaceChildren(); return; }
  const objMeta = state.problem.objectives.map((o) => ({ label: o.label, unit: o.unit, dir: o.dir }));
  objMeta.tension = tensionLabel(state.problem);
  $("#v3-chart-mode").textContent = `— ${state.problem.mode}, gen ${state.result.generation}/${state.runParams.generations}`;
  charts.renderFront($("#v3-charts"), state.result, objMeta, { onHover: previewPhenotype, onSelect: selectPhenotype, selected: state.selected });
  charts.renderConvergence($("#v3-convergence"), state.result.history);
}
function previewPhenotype(p) {
  const ph = $("#v3-phenotype");
  if (!p) { if (state.selected) return showPhenotypeReadout(state.selected, "selected"); ph.textContent = "Hover a point on the front to preview a design here."; if (viewport && state.last) viewport.setModel(state.last.model, state.display); return; }
  const sd = decode(p.x, state.activeGenes, state.seed); const r = run(sd.params, sd.site, null);
  if (viewport) viewport.setModel(r.model, state.display);
  showPhenotypeReadout(p, p === state.selected ? "selected" : "hover");
}
function showPhenotypeReadout(p, tag) {
  const kids = [el("span", { class: "tiny" }, tag === "selected" ? "selected · " : "preview · "),
    ...state.problem.objectives.map((o, k) => el("span", null, o.label + " ", el("b", null, fmtObj(o, p.objectives[k])), "  "))];
  if (p.constraintViolation > 1e-9) kids.push(el("span", { class: "st bad" }, "· violates a hard rule"));
  $("#v3-phenotype").replaceChildren(...kids);
}
function selectPhenotype(p) { state.selected = p; if (viewport) { const sd = decode(p.x, state.activeGenes, state.seed); viewport.setModel(run(sd.params, sd.site, null).model, state.display); } showPhenotypeReadout(p, "selected"); updateButtons(); drawCharts(); }

// ---- series ----------------------------------------------------------------
function orderedSeries() {
  const out = [], byParent = {}; for (const v of Series.list) (byParent[v.parentId] = byParent[v.parentId] || []).push(v);
  const walk = (pid, d) => { for (const v of (byParent[pid] || [])) { v.depth = d; out.push(v); walk(v.id, d + 1); } };
  walk(null, 0); for (const v of Series.list) if (!out.includes(v)) { v.depth = 0; out.push(v); } return out;
}
function renderSeries() {
  const host = $("#series"); host.replaceChildren();
  if (!Series.list.length) { host.append(el("div", { class: "series-empty" }, "No variations yet. Evolve a front and spawn a phenotype, or fork the current design.")); return; }
  for (const v of orderedSeries()) {
    const ev = run(v.seed.params, v.seed.site, { rules: (v.seed.ruleset && v.seed.ruleset.rules) || [] }).evaluation;
    const parent = v.parentId ? Series.get(v.parentId) : null;
    const changes = parent ? diffSeeds(parent.seed, v.seed) : [];
    host.append(el("div", { class: "svar" + (v.id === state.currentId ? " current" : ""), style: v.depth ? `margin-left:${Math.min(v.depth, 4) * 14}px` : null, onclick: () => loadVariation(v.id) },
      el("button", { class: "svar-x", title: "Delete", onclick: (e) => { e.stopPropagation(); Series.remove(v.id); if (state.currentId === v.id) state.currentId = null; renderSeries(); } }, "✕"),
      el("div", { class: "svar-t" }, v.title || ("Variation " + v.id.replace("var-", ""))),
      el("div", { class: "svar-meta" }, parent ? "from " + (parent.title || parent.id.replace("var-", "#")) : "root", v.decision && v.decision.optimizer ? el("span", { class: "svar-opt" }, " NSGA-II") : null),
      el("div", { class: "svar-score" }, Math.round((ev.score || 0) * 100) + "%", " ", el("span", { class: "sc-hard " + (ev.hardPass ? "pass" : "fail") }, ev.hardPass ? "hard ✓" : "hard ✗")),
      el("div", { class: "svar-decision" }, v.decision && v.decision.move ? el("span", null, el("b", null, v.decision.force || ""), " — ", v.decision.move) : "—",
        v.decision && v.decision.intent ? el("div", { class: "svar-diff" }, v.decision.intent) : null,
        v.decision && v.decision.winner ? el("div", { class: "svar-diff" }, "won: " + v.decision.winner) : null),
      changes.length ? el("div", { class: "svar-diff" }, changes.slice(0, 3).join(" · ") + (changes.length > 3 ? " …" : "")) : null));
  }
}
function loadVariation(id) {
  const v = Series.get(id); if (!v) return; state.seed = clone(v.seed);
  if (!state.seed.ruleset.notes) state.seed.ruleset.notes = [];
  state.governing = new Set(state.seed.ruleset.rules.map((c) => c.force).filter(Boolean));
  state.currentId = id; state.selected = null; rebuildBase(); renderSeries(); setStatus(`Loaded ${v.title || "variation " + id.replace("var-", "")}.`);
}

// ---- spawn / fork dialogs --------------------------------------------------
function openSpawn() {
  if (!state.selected || !state.problem) { setStatus("Pick a phenotype on the front first."); return; }
  const tensions = activeTensionsV3(state.seed.ruleset.rules);
  const govNames = [...state.governing].map((id) => (forceById(id) || {}).label).filter(Boolean);
  const titleI = el("input", { type: "text", placeholder: "e.g. evolved south room" });
  const intentI = el("textarea", { placeholder: "Why this point on the front? What did you trade, and why is it the right compromise?" });
  const winnerI = tensions.length ? el("input", { type: "text", placeholder: "Which side of the tension wins — and why" }) : null;
  const objLine = state.problem.objectives.map((o, k) => `${o.label} ${o.dir === "max" ? "↑" : "↓"} ${fmtObj(o, state.selected.objectives[k])}`).join(" · ");
  $("#fork-form").replaceChildren(
    el("div", { class: "ff-row" }, el("label", null, "This phenotype"), el("div", { class: "ff-changes" }, objLine)),
    el("div", { class: "ff-row" }, el("label", null, "Title"), titleI),
    el("div", { class: "ff-row" }, el("label", null, "Why (the decision)"), intentI),
    tensions.length ? el("div", { class: "ff-row" }, el("label", null, "Declare the winner"), el("div", { class: "ff-changes" }, ...tensions.map((t) => el("div", null, el("b", null, "conflict: "), t.why))), winnerI) : null,
    el("div", { class: "ff-actions" }, el("button", { class: "btn", onclick: () => hideModal("forkModal") }, "Cancel"),
      el("button", { class: "btn primary", onclick: () => saveSpawn({ title: titleI.value, intent: intentI.value, winner: winnerI ? winnerI.value : "", force: govNames.join(", ") }) }, "Save to series")));
  showModal("forkModal");
}
function saveSpawn(d) {
  const parent = state.currentId ? Series.get(state.currentId) : null;
  const v = buildPhenotypeVariation({ chosen: state.selected, genes: state.activeGenes, baseSeed: state.seed, problem: state.problem, runParams: state.runParams, parent, extra: { intent: d.intent, winner: d.winner, force: d.force, frontSize: state.result.front.length } });
  v.title = d.title || ""; Series.add(v); state.currentId = v.id; hideModal("forkModal"); renderSeries();
  setStatus(`Spawned “${v.title || "phenotype"}” into the series (${Series.list.length} total).`);
}
function openFork() {
  const parent = state.currentId ? Series.get(state.currentId) : null;
  const changes = parent ? diffSeeds(parent.seed, state.seed) : [];
  const titleI = el("input", { type: "text", placeholder: "e.g. baseline study" });
  const intentI = el("textarea", { placeholder: "Why this design?" });
  $("#fork-form").replaceChildren(
    el("div", { class: "ff-row" }, el("label", null, "Title"), titleI),
    el("div", { class: "ff-row" }, el("label", null, "Why (the decision)"), intentI),
    el("div", { class: "ff-row" }, el("label", null, parent ? "Changes from " + (parent.title || "parent") : "A new root variation"), el("div", { class: "ff-changes" }, changes.length ? changes.map((c) => el("div", null, c)) : el("div", null, "no parameter changes"))),
    el("div", { class: "ff-actions" }, el("button", { class: "btn", onclick: () => hideModal("forkModal") }, "Cancel"),
      el("button", { class: "btn primary", onclick: () => { const cache = state.last ? { metrics: state.last.metrics, evaluation: state.last.evaluation } : null; const v = makeVariation(state.seed, parent, { force: "", move: "manual fork", intent: intentI.value }, cache); v.title = titleI.value || ""; Series.add(v); state.currentId = v.id; hideModal("forkModal"); renderSeries(); setStatus(`Forked into the series (${Series.list.length}).`); } }, "Save to series")));
  showModal("forkModal");
}

// ---- authoring: define a force / mark a tension ----------------------------
function openDefine() {
  const labelI = el("input", { type: "text", placeholder: "e.g. Keep it compact" });
  const glyphI = el("input", { type: "text", maxlength: "2", value: "✦" });
  const blurbI = el("textarea", { placeholder: "What is this force, and why does it matter here?" });
  const metricSel = el("select", null, ...AUTHORABLE_METRICS.map((d) => el("option", { value: d.key }, `${d.label}${d.unit && d.unit !== "0–1" ? " (" + d.unit + ")" : ""}`)));
  const opSel = el("select", null, el("option", { value: ">=" }, "at least (≥)"), el("option", { value: "<=" }, "at most (≤)"), el("option", { value: ">" }, "greater than (>)"), el("option", { value: "<" }, "less than (<)"));
  const modeSel = el("select", null, el("option", { value: "rel" }, "× current baseline"), el("option", { value: "abs" }, "absolute value"));
  const relI = el("input", { type: "number", value: "1.2", step: "0.05" });
  const rhsI = el("input", { type: "number", placeholder: "value" });
  const weightI = el("input", { type: "number", value: "1", min: "1", max: "3", step: "1" });
  const hardI = el("input", { type: "checkbox" });
  const err = el("div", { class: "ff-err" });
  const syncMode = () => { relI.style.display = modeSel.value === "rel" ? "" : "none"; rhsI.style.display = modeSel.value === "abs" ? "" : "none"; };
  modeSel.addEventListener("change", syncMode); syncMode();
  $("#define-form").replaceChildren(
    el("div", { class: "ff-row" }, el("label", null, "Name"), labelI),
    el("div", { class: "ff-two" }, el("div", { class: "ff-row", style: "flex:0 0 70px" }, el("label", null, "Glyph"), glyphI), el("div", { class: "ff-row", style: "flex:3" }, el("label", null, "Metric"), metricSel)),
    el("div", { class: "ff-row" }, el("label", null, "Blurb"), blurbI),
    el("div", { class: "ff-two" }, el("div", { class: "ff-row" }, el("label", null, "Direction"), opSel), el("div", { class: "ff-row" }, el("label", null, "Threshold"), modeSel)),
    el("div", { class: "ff-row" }, el("label", null, "Value"), el("div", { class: "ff-two" }, relI, rhsI)),
    el("div", { class: "ff-two" }, el("div", { class: "ff-row" }, el("label", null, "Weight 1–3"), weightI), el("div", { class: "ff-row" }, el("label", null, "Hard rule?"), hardI)),
    err,
    el("div", { class: "ff-actions" }, el("button", { class: "btn", onclick: () => hideModal("defineModal") }, "Cancel"),
      el("button", { class: "btn primary", onclick: () => { try { saveDefine({ label: labelI.value, glyph: glyphI.value, blurb: blurbI.value, metricKey: metricSel.value, op: opSel.value, rel: modeSel.value === "rel" ? relI.value : undefined, rhs: modeSel.value === "abs" ? rhsI.value : undefined, weight: weightI.value, hard: hardI.checked }); } catch (e) { err.textContent = e.message; } } }, "Create force")));
  showModal("defineModal");
}
function saveDefine(form) {
  const ids = new Set(allForces().map((f) => f.id));
  const f = buildCustomForce(form, ids, state.last ? state.last.metrics : null);
  state.customForces.push(f); saveCustom(); hideModal("defineModal"); buildForceDeck(); renderObjectives();
  setStatus(`Defined a custom force “${f.label}”. Commit its move to add it to the charter.`);
}
function deleteCustomForce(id) {
  state.customForces = state.customForces.filter((f) => f.id !== id);
  saveCustom(); buildForceDeck(); setStatus("Removed a custom force (any committed clause still stands — it's self-contained).");
}
function openTension() {
  const clauses = state.seed.ruleset.rules.filter((c) => c.kind === "rule");
  if (clauses.length < 2) { setStatus("Commit at least two rules to mark a tension."); return; }
  const opt = (c) => el("option", { value: c.id }, `${c.forceLabel}: ${c.moveLabel}`);
  const aSel = el("select", null, ...clauses.map(opt)), bSel = el("select", null, ...clauses.map(opt)); bSel.selectedIndex = 1;
  const whyI = el("input", { type: "text", placeholder: "Why do these pull against each other?" }); const err = el("div", { class: "ff-err" });
  $("#tension-form").replaceChildren(
    el("div", { class: "ff-row" }, el("label", null, "Clause A"), aSel), el("div", { class: "ff-row" }, el("label", null, "Clause B"), bSel),
    el("div", { class: "ff-row" }, el("label", null, "Why"), whyI), err,
    el("div", { class: "ff-actions" }, el("button", { class: "btn", onclick: () => hideModal("tensionModal") }, "Cancel"),
      el("button", { class: "btn primary", onclick: () => { try { const ca = clauses.find((c) => c.id === aSel.value), cb = clauses.find((c) => c.id === bSel.value); state.customTensions.push(buildTension(ca, cb, whyI.value)); saveCustom(); hideModal("tensionModal"); renderCharter(); setStatus("Marked a tension."); } catch (e) { err.textContent = e.message; } } }, "Mark tension")));
  showModal("tensionModal");
}

// ---- persistence -----------------------------------------------------------
const LS_F = "ecoArchitect.v3.customForces", LS_T = "ecoArchitect.v3.customTensions";
function saveCustom() { try { localStorage.setItem(LS_F, JSON.stringify(state.customForces)); localStorage.setItem(LS_T, JSON.stringify(state.customTensions)); } catch (e) {} }
function loadCustom() { try { const f = localStorage.getItem(LS_F); if (f) state.customForces = JSON.parse(f) || []; const t = localStorage.getItem(LS_T); if (t) state.customTensions = JSON.parse(t) || []; } catch (e) {} }
function download(name, text) { const a = el("a", { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name }); document.body.append(a); a.click(); a.remove(); }
function pickFile(accept, cb) { const i = el("input", { type: "file", accept, style: "display:none" }); document.body.append(i); i.addEventListener("change", async (e) => { const f = e.target.files[0]; if (f) cb(await f.text()); i.remove(); }); i.click(); }
function saveProject() { download("eco-architect-v3-project.json", JSON.stringify({ kind: "eco-architect.v3", version: 3, series: Series.exportJSON(), customForces: state.customForces, customTensions: state.customTensions }, null, 2)); setStatus("Project downloaded."); }
function loadProject() { pickFile(".json", (txt) => { try { const d = JSON.parse(txt); if (d.series) Series.importJSON(d.series); if (Array.isArray(d.customForces)) state.customForces = d.customForces; if (Array.isArray(d.customTensions)) state.customTensions = d.customTensions; saveCustom(); buildForceDeck(); renderCharter(); renderObjectives(); renderSeries(); setStatus("Project loaded."); } catch (e) { setStatus("Couldn't load project: " + e.message); } }); }

// ---- init ------------------------------------------------------------------
Series.load(); loadCustom();
$("#v3-propose").addEventListener("click", proposeCharter);
$("#v3-reset").addEventListener("click", resetDesign);
$("#v3-save").addEventListener("click", saveProject);
$("#v3-load").addEventListener("click", loadProject);
$("#v3-define").addEventListener("click", openDefine);
$("#v3-mark-tension").addEventListener("click", openTension);
$("#v3-run").addEventListener("click", startRun);
$("#v3-pause").addEventListener("click", pauseRun);
$("#v3-step").addEventListener("click", stepRun);
$("#v3-stop").addEventListener("click", stopRun);
$("#v3-spawn").addEventListener("click", openSpawn);
$("#v3-fork").addEventListener("click", openFork);
document.querySelectorAll(".ctab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => hideModal(b.getAttribute("data-close"))));
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) hideModal(m.id); }));

renderGenes(); rebuildBase(); renderSeries(); updateButtons();
setStatus("Ready. Propose a charter (or commit moves), choose genes & objectives, then ▶ Run.");
