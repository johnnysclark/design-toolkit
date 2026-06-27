// app2.js (v2) — the site-forces METHOD, wired over the reused core.js engine and
// viewport.js renderer (both unchanged from v1, so zero parity cost).
//
// The loop the UI enacts: READ the site (force deck) → NAME the forces (govern
// toggle) → COMMIT a move (drafts a rule into the charter) → MAKE the move
// (geometry sliders) → WATCH the standing → SPAWN the next fork (series).
import { DEFAULTS, run, VARIABLE_DEFS } from "../core.js";
import { createViewport } from "../viewport.js";
import { FORCES, draftClause, activeTensions } from "./forces.js";
import { Series, makeVariation, diffSeeds } from "./series.js";
import { parseEPW, describeClimate } from "./weather.js";

// ---- tiny DOM + math helpers ----------------------------------------------
const $ = (s) => document.querySelector(s);
const clone = (o) => JSON.parse(JSON.stringify(o));
const round2 = (x) => Math.round(x * 100) / 100;
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "style") e.setAttribute("style", v);
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) { if (kid == null || kid === false) continue; e.append(kid.nodeType ? kid : document.createTextNode(kid)); }
  return e;
}
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }

const VDEF = Object.fromEntries(VARIABLE_DEFS.map((d) => [d.key, d]));
const labelOf = (k) => (VDEF[k] ? VDEF[k].label : k);
const unitOf = (k) => (VDEF[k] ? VDEF[k].unit : "");
function fmtMetric(k, v) {
  if (v == null || Number.isNaN(v)) return "—";
  const u = unitOf(k);
  const val = Math.abs(v) >= 100 ? Math.round(v) : round2(v);
  return `${val}${u && u !== "0–1" ? " " + u : ""}`;
}

// ---- state ----------------------------------------------------------------
const state = {
  seed: {
    params: clone(DEFAULTS.params),
    site: clone(DEFAULTS.site),
    ruleset: { name: "Charter", rules: [], notes: [] },
  },
  governing: new Set(),
  display: { mode: "analysis", shadowIntensity: 0.6, sunHour: 15, analysisField: "solarYear" },
  currentId: null,    // loaded series variation, or null = unsaved working design
  last: null,         // {model, metrics, evaluation, vars}
  climate: null,      // parsed EPW summary (Benchmark Track, Stage A), or null = latitude-only
};

// ---- viewport (reused) ----------------------------------------------------
let viewport = null;
try { viewport = createViewport($("#view")); }
catch (e) { $("#stage").append(el("div", { class: "viewerr" }, "3D viewport could not start (needs WebGL). The forces, charter and series still work. " + e.message)); }

// ---- the MAKE controls (geometry moves) -----------------------------------
const MAKE_SPEC = [
  { path: "walls.h", label: "Wall height", min: 2.2, max: 4.6, step: 0.1, unit: "m" },
  { path: "walls.W", label: "Room width", min: 4, max: 12, step: 0.5, unit: "m" },
  { path: "walls.L", label: "Room length", min: 4, max: 14, step: 0.5, unit: "m" },
  { path: "walls.R", label: "Room rotation", min: -45, max: 45, step: 1, unit: "°" },
  { path: "roof.pitchL", label: "Roof pitch L", min: -20, max: 55, step: 1, unit: "°" },
  { path: "roof.pitchR", label: "Roof pitch R", min: -20, max: 55, step: 1, unit: "°" },
  { path: "roof.ridgeRise", label: "Ridge rise", min: 0, max: 4, step: 0.1, unit: "m" },
  { path: "roof.ridgePos", label: "Ridge shift", min: -0.8, max: 0.8, step: 0.05, unit: "" },
  { path: "roof.W", label: "Roof width (overhang)", min: 6, max: 14, step: 0.5, unit: "m" },
  { path: "roof.L", label: "Roof length (overhang)", min: 6, max: 16, step: 0.5, unit: "m" },
  { path: "plinth.t", label: "Plinth thickness", min: 0.2, max: 2, step: 0.1, unit: "m" },
  { path: "plinth.cy", label: "Plinth shift Y", min: -3, max: 3, step: 0.1, unit: "m" },
  { path: "plinth.W", label: "Plinth width", min: 6, max: 16, step: 0.5, unit: "m" },
  { path: "plinth.L", label: "Plinth length", min: 6, max: 18, step: 0.5, unit: "m" },
  { path: "apertures.0.w", label: "South window width", min: 0.4, max: 6, step: 0.1, unit: "m" },
  { path: "apertures.0.h", label: "South window height", min: 0.4, max: 2.6, step: 0.1, unit: "m" },
];

// generic slider bound to an object path
function makeSlider(rootObj, spec, onChange) {
  const val = getPath(rootObj, spec.path);
  const valEl = el("span", { class: "slval" }, fmtNum(val, spec.unit));
  const input = el("input", {
    type: "range", min: spec.min, max: spec.max, step: spec.step, value: val,
    oninput: (e) => { const v = parseFloat(e.target.value); setPath(rootObj, spec.path, v); valEl.textContent = fmtNum(v, spec.unit); onChange(); },
  });
  return el("div", { class: "sl" }, el("label", null, spec.label), valEl, input);
}
const fmtNum = (v, u) => `${round2(v)}${u ? " " + u : ""}`;

// ---- references kept across live updates ----------------------------------
let metricReadEls = [];                  // [{key, el}]
const clauseRefs = new Map();            // clauseId -> {statusEl, barEl, valEl}

// ---- BUILD (structural) ---------------------------------------------------
function buildForceDeck() {
  const host = $("#forcedeck"); host.replaceChildren(); metricReadEls = [];
  for (const f of FORCES) {
    const governs = state.governing.has(f.id);
    const govBtn = el("button", {
      class: "fc-gov", title: "Name this force as governing this variation",
      onclick: (e) => { e.stopPropagation(); toggleGovern(f.id); },
    }, governs ? "governs ✓" : "govern");

    const reads = el("div", { class: "fc-reads" });
    if (f.modeled) for (const k of f.reads) {
      const v = el("b", null, state.last ? fmtMetric(k, state.last.metrics[k]) : "—");
      metricReadEls.push({ key: k, el: v });
      reads.append(el("span", { class: "fc-read", title: labelOf(k) }, labelOf(k) + ": ", v));
    }

    const inputs = el("div");
    if (f.inputs) for (const sp of f.inputs) inputs.append(makeSlider(state.seed.site, sp, liveUpdate));

    const moves = el("div");
    moves.append(el("div", { class: "fc-moves-h" }, f.modeled ? "Moves — commit one as a rule" : "Response"));
    for (const m of f.moves) {
      const added = clauseExists(f.id, m.id);
      moves.append(el("button", {
        class: "move" + (added ? " added" : ""),
        onclick: () => commitMove(f, m),
      },
        el("div", { class: "move-label" }, (added ? "✓ " : "+ ") + m.label),
        el("div", { class: "move-desc" }, m.desc),
        m.rule ? el("div", { class: "move-test" }, movePreview(m)) : null,
      ));
    }

    const body = el("div", { class: "fc-body" },
      el("p", { class: "fc-blurb" }, f.blurb),
      f.modeled ? reads : el("div", { class: "fc-absence" }, f.absence),
      climateBlock(f.id),
      inputs, moves,
    );
    const head = el("div", { class: "fc-head", onclick: () => toggleGovern(f.id) },
      el("span", { class: "fc-glyph" }, f.glyph), el("span", { class: "fc-name" }, f.label), govBtn);
    host.append(el("div", { class: "forcecard" + (governs ? " governs" : "") }, head, body));
  }
}
const movePreview = (m) => `${labelOf(m.rule.lhs)} ${m.rule.op} ${m.rule.rhs != null ? m.rule.rhs : "baseline ×" + m.rule.rel}`;

function buildMake() {
  const host = $("#make"); host.replaceChildren();
  for (const sp of MAKE_SPEC) host.append(makeSlider(state.seed.params, sp, liveUpdate));
}

function buildCharter() {
  const host = $("#charter-clauses"); host.replaceChildren(); clauseRefs.clear();
  const rules = state.seed.ruleset.rules, notes = state.seed.ruleset.notes;
  if (!rules.length && !notes.length) {
    host.append(el("div", { class: "charter-empty" }, "No clauses yet. Commit a move from a force on the left, or press ✶ Propose a charter to seed one from this site."));
    return;
  }
  for (const c of rules) {
    const statusEl = el("span", { class: "cl-status" }, "—");
    const valEl = el("span", null, "—");
    const barEl = el("i");
    clauseRefs.set(c.id, { statusEl, barEl, valEl });
    host.append(el("div", { class: "clause" },
      el("div", { class: "cl-head" },
        el("span", { class: "cl-force" }, c.forceLabel),
        el("span", { class: "cl-move" }, c.moveLabel),
        el("button", { class: "cl-hard" + (c.hard ? " on" : ""), title: "Hard rules must all pass", onclick: () => { c.hard = !c.hard; buildCharter(); liveUpdate(); } }, "hard"),
        el("button", { class: "cl-x", title: "Remove", onclick: () => removeClause(c.id) }, "✕"),
      ),
      el("div", { class: "cl-test" },
        statusEl,
        el("span", null, labelOf(c.lhs), " ", c.op, " ",
          el("input", { class: "cl-edit", type: "number", step: "0.01", value: c.rhs,
            onchange: (e) => { c.rhs = parseFloat(e.target.value); liveUpdate(); } }),
          " ", unitOf(c.lhs) === "0–1" ? "" : unitOf(c.lhs)),
        el("span", { style: "margin-left:auto" }, "now ", valEl),
      ),
      el("div", { class: "cl-bar" }, barEl),
      el("div", { class: "cl-prov" }, "source: ", c.provenance || "—"),
      el("div", { class: "cl-caveat" }, c.caveat || ""),
    ));
  }
  for (const n of notes) {
    host.append(el("div", { class: "clause note" },
      el("div", { class: "cl-head" },
        el("span", { class: "cl-force" }, n.forceLabel),
        el("span", { class: "cl-move" }, n.moveLabel),
        el("button", { class: "cl-x", title: "Remove", onclick: () => removeClause(n.id) }, "✕"),
      ),
      el("div", { class: "cl-caveat" }, n.caveat || ""),
      el("textarea", { class: "cl-notefield", placeholder: "Your hand-judgment: the move you'd make, and why.",
        oninput: (e) => { n.note = e.target.value; } }, n.note || ""),
    ));
  }
}

// ---- LIVE update (no DOM rebuild — safe during slider drags) --------------
function liveUpdate() {
  const { model, metrics, evaluation, vars } = run(state.seed.params, state.seed.site, rulesetForRun());
  state.last = { model, metrics, evaluation, vars };
  if (viewport) viewport.setModel(model, state.display);
  for (const r of metricReadEls) r.el.textContent = fmtMetric(r.key, metrics[r.key]);
  updateCharter(evaluation);
  syncOverlayLabel();
}
// run() only sees real rules; notes are inert hand-judgments.
const rulesetForRun = () => ({ name: state.seed.ruleset.name, rules: state.seed.ruleset.rules });

function statusOf(res) {
  if (res.ok) return "ok";
  const scale = Math.max(Math.abs(res.rule.rhs ?? 1), 1);
  return Math.abs(res.margin ?? 99) <= 0.2 * scale ? "near" : "bad";
}
function updateCharter(evaluation) {
  let met = 0, near = 0, bad = 0;
  if (evaluation) for (const res of evaluation.results) {
    const st = statusOf(res); if (st === "ok") met++; else if (st === "near") near++; else bad++;
    const ref = clauseRefs.get(res.rule.id); if (!ref) continue;
    ref.statusEl.className = "cl-status " + st;
    ref.statusEl.textContent = st === "ok" ? "met" : st === "near" ? "near" : "fighting";
    ref.valEl.textContent = fmtMetric(res.rule.lhs, res.value);
    const scale = Math.max(Math.abs(res.rule.rhs ?? 1), 1) * 0.5;
    const w = Math.min(50, (Math.abs(res.margin ?? 0) / scale) * 50);
    ref.barEl.parentElement.classList.toggle("met", res.ok);
    if (res.ok) { ref.barEl.style.left = "50%"; ref.barEl.style.width = w + "%"; }
    else { ref.barEl.style.left = (50 - w) + "%"; ref.barEl.style.width = w + "%"; }
  }
  const standing = $("#charter-standing");
  const hardPass = !evaluation || evaluation.hardPass;
  standing.className = "standing" + (hardPass ? "" : " hard-fail");
  standing.replaceChildren(
    el("div", { class: "standing-line" }, `${met} met · ${near} within reach · ${bad} fighting`),
    el("div", { class: "standing-sub" }, !evaluation || evaluation.total === 0 ? "Add clauses to give this variation something to answer to."
      : hardPass ? "All hard rules pass — a valid response to your brief." : "A hard rule is unmet — not yet a valid response."),
  );
  // tensions
  const tEl = $("#charter-tensions"); tEl.replaceChildren();
  for (const t of activeTensions(state.seed.ruleset.rules)) {
    tEl.append(el("div", { class: "tension" }, el("b", null, "these fight — "), t.why, " Declare a winner when you fork."));
  }
}
function syncOverlayLabel() {
  const k = state.display.analysisField;
  $("#v2-overlay").textContent = state.display.mode !== "analysis" ? "pen — hidden-line" : k === "wind" ? "wind · windward" : k === "solarNow" ? "sun · now" : "sun · year";
}

// ---- ACTIONS --------------------------------------------------------------
const clauseExists = (forceId, moveId) =>
  state.seed.ruleset.rules.some((c) => c.force === forceId && c.move === moveId) ||
  state.seed.ruleset.notes.some((c) => c.force === forceId && c.move === moveId);

function commitMove(force, move) {
  // toggle: clicking an added move removes it
  const rules = state.seed.ruleset.rules, notes = state.seed.ruleset.notes;
  const inR = rules.findIndex((c) => c.force === force.id && c.move === move.id);
  const inN = notes.findIndex((c) => c.force === force.id && c.move === move.id);
  if (inR >= 0) { rules.splice(inR, 1); }
  else if (inN >= 0) { notes.splice(inN, 1); }
  else {
    const clause = draftClause(force, move, state.last ? state.last.metrics : {});
    if (clause.kind === "note") notes.push(clause); else rules.push(clause);
    state.governing.add(force.id);
  }
  syncOverlay(); rebuild();
  setStatus(`Charter: ${rules.length} rule${rules.length === 1 ? "" : "s"}, ${notes.length} note${notes.length === 1 ? "" : "s"}.`);
}
function removeClause(id) {
  state.seed.ruleset.rules = state.seed.ruleset.rules.filter((c) => c.id !== id);
  state.seed.ruleset.notes = state.seed.ruleset.notes.filter((c) => c.id !== id);
  rebuild();
}
function toggleGovern(id) {
  if (state.governing.has(id)) state.governing.delete(id); else state.governing.add(id);
  syncOverlay(); rebuild();
}
function syncOverlay() {
  state.display.analysisField = state.governing.has("wind") ? "wind" : "solarYear";
  if (viewport) viewport.setDisplay(state.display);
}

function proposeCharter() {
  // seed a starter brief from this site: capture winter sun, control summer,
  // shelter from wind, keep a view — a charter that already shows a conflict.
  const m = state.last ? state.last.metrics : {};
  const starters = [
    ["sun", "admit-winter"], ["sun", "reject-summer"], ["wind", "shelter"], ["views", "open-view"],
  ];
  state.seed.ruleset.rules = [];
  for (const [fid, mid] of starters) {
    const f = FORCES.find((x) => x.id === fid); const mv = f.moves.find((x) => x.id === mid);
    state.seed.ruleset.rules.push(draftClause(f, mv, m));
    state.governing.add(fid);
  }
  syncOverlay(); rebuild();
  setStatus("Proposed a 4-clause charter from this site — note the sun admit-vs-reject tension. Every threshold is editable.");
}

function resetDesign() {
  state.seed.params = clone(DEFAULTS.params);
  state.seed.site = clone(DEFAULTS.site);
  state.currentId = null;
  rebuild();
  setStatus("Design reset to the default massing (your charter is kept).");
}

// ---- the SERIES (fork / load / render) ------------------------------------
function renderSeries() {
  const host = $("#series"); host.replaceChildren();
  if (!Series.list.length) {
    host.append(el("div", { class: "series-empty" }, "No variations yet. Shape a response to the forces, then ⑂ Fork this variation to start the series."));
    return;
  }
  for (const v of orderedSeries()) {
    const ev = run(v.seed.params, v.seed.site, { rules: v.seed.ruleset.rules }).evaluation;
    const parent = v.parentId ? Series.get(v.parentId) : null;
    const changes = parent ? diffSeeds(parent.seed, v.seed) : [];
    const card = el("div", {
      class: "svar" + (v.id === state.currentId ? " current" : ""),
      style: v.depth ? `margin-left:${Math.min(v.depth, 4) * 14}px` : null,
      onclick: () => loadVariation(v.id),
    },
      el("button", { class: "svar-x", title: "Delete", onclick: (e) => { e.stopPropagation(); removeVariation(v.id); } }, "✕"),
      el("div", { class: "svar-t" }, v.title || ("Variation " + v.id.replace("var-", ""))),
      el("div", { class: "svar-meta" }, parent ? "from " + (parent.title || parent.id.replace("var-", "#")) : "root"),
      el("div", { class: "svar-score" }, Math.round((ev.score || 0) * 100) + "%",
        " ", el("span", { class: "sc-hard " + (ev.hardPass ? "pass" : "fail") }, ev.hardPass ? "hard ✓" : "hard ✗")),
      el("div", { class: "svar-decision" },
        v.decision && v.decision.move ? el("span", null, el("b", null, v.decision.force || ""), " — ", v.decision.move) : "—",
        v.decision && v.decision.intent ? el("div", { class: "svar-diff" }, v.decision.intent) : null,
        v.decision && v.decision.winner ? el("div", { class: "svar-diff" }, "won: " + v.decision.winner) : null,
      ),
      changes.length ? el("div", { class: "svar-diff" }, changes.slice(0, 3).join(" · ") + (changes.length > 3 ? " …" : "")) : null,
    );
    host.append(card);
  }
}
function orderedSeries() {
  // depth-first by lineage, annotate depth for indentation
  const out = [], byParent = {};
  for (const v of Series.list) (byParent[v.parentId] = byParent[v.parentId] || []).push(v);
  const walk = (pid, depth) => { for (const v of (byParent[pid] || [])) { v.depth = depth; out.push(v); walk(v.id, depth + 1); } };
  walk(null, 0);
  // include any orphans (parent removed) at root
  for (const v of Series.list) if (!out.includes(v)) { v.depth = 0; out.push(v); }
  return out;
}

function loadVariation(id) {
  const v = Series.get(id); if (!v) return;
  state.seed = clone(v.seed);
  if (!state.seed.ruleset.notes) state.seed.ruleset.notes = [];
  state.governing = new Set(state.seed.ruleset.rules.map((c) => c.force).filter(Boolean));
  state.currentId = id;
  syncOverlay(); rebuild();
  setStatus(`Loaded ${v.title || "variation " + id.replace("var-", "")} — edit it and fork to branch.`);
}
function removeVariation(id) {
  Series.remove(id);
  if (state.currentId === id) state.currentId = null;
  renderSeries();
  setStatus("Removed a variation from the series.");
}

// ---- fork dialog ----------------------------------------------------------
function openFork() {
  const parent = state.currentId ? Series.get(state.currentId) : null;
  const changes = parent ? diffSeeds(parent.seed, state.seed) : [];
  const tensions = activeTensions(state.seed.ruleset.rules);
  const govNames = [...state.governing].map((id) => (FORCES.find((f) => f.id === id) || {}).label).filter(Boolean);

  const titleI = el("input", { type: "text", placeholder: "e.g. Bermed south room" });
  const forceI = el("input", { type: "text", value: govNames.join(", "), placeholder: "force(s) this fork answers" });
  const intentI = el("textarea", { placeholder: "Why this move? What force did it answer, what did you trade?" });
  const winnerI = tensions.length ? el("input", { type: "text", placeholder: "Which clause wins the conflict — and why" }) : null;

  const form = $("#fork-form"); form.replaceChildren(
    el("div", { class: "ff-row" }, el("label", null, "Title"), titleI),
    el("div", { class: "ff-row" }, el("label", null, "Force(s) answered"), forceI),
    el("div", { class: "ff-row" }, el("label", null, "Why (the decision)"), intentI),
    tensions.length ? el("div", { class: "ff-row" }, el("label", null, "Declare the winner"),
      el("div", { class: "ff-changes" }, ...tensions.map((t) => el("div", null, el("b", null, "conflict: "), t.why))), winnerI) : null,
    el("div", { class: "ff-row" }, el("label", null, parent ? "Changes from " + (parent.title || "parent") : "A new root variation"),
      el("div", { class: "ff-changes" }, changes.length ? changes.map((c) => el("div", null, c)) : el("div", null, "no parameter changes"))),
    el("div", { class: "ff-actions" },
      el("button", { class: "btn", onclick: () => hideModal("forkModal") }, "Cancel"),
      el("button", { class: "btn primary", onclick: () => saveFork({ title: titleI.value, force: forceI.value, intent: intentI.value, winner: winnerI ? winnerI.value : "" }) }, "Save to series")),
  );
  showModal("forkModal");
}
function saveFork(decision) {
  const parent = state.currentId ? Series.get(state.currentId) : null;
  const cache = state.last ? { metrics: state.last.metrics, evaluation: state.last.evaluation } : null;
  const v = makeVariation(state.seed, parent, decision, cache);
  v.title = decision.title || "";
  Series.add(v);
  state.currentId = v.id;
  hideModal("forkModal");
  renderSeries();
  setStatus(`Forked “${v.title || "variation " + v.id.replace("var-", "")}” into the series (${Series.list.length} total).`);
}

// ---- save / load the whole series -----------------------------------------
function downloadJSON(obj, name) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove();
}
function saveSeries() {
  if (!Series.list.length) return setStatus("Nothing to save yet — fork a variation first.");
  downloadJSON(Series.exportJSON(), "eco-architect-series.json");
  setStatus(`Saved ${Series.list.length} variations.`);
}
function loadSeries() {
  const input = el("input", { type: "file", accept: "application/json", style: "display:none" });
  document.body.append(input);
  input.addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { Series.importJSON(JSON.parse(await f.text())); renderSeries(); setStatus(`Loaded ${Series.list.length} variations.`); }
    catch (err) { setStatus("Load failed: " + err.message); }
    input.remove();
  });
  input.click();
}

// ---- display controls -----------------------------------------------------
function onDisplay() { if (viewport) viewport.setDisplay(state.display); syncOverlayLabel(); }
const modeBtn = $("#v2-mode");
function syncModeBtn() { const a = state.display.mode === "analysis"; modeBtn.textContent = a ? "☀ Analysis" : "◫ Pen"; modeBtn.classList.toggle("on", a); }
modeBtn.addEventListener("click", () => { state.display.mode = state.display.mode === "analysis" ? "pen" : "analysis"; syncModeBtn(); onDisplay(); });
$("#v2-sunhour").addEventListener("input", (e) => { state.display.sunHour = parseFloat(e.target.value); onDisplay(); });
$("#v2-shadow").addEventListener("input", (e) => { state.display.shadowIntensity = parseFloat(e.target.value); onDisplay(); });

// ---- modal plumbing -------------------------------------------------------
const showModal = (id) => { $("#" + id).style.display = "flex"; };
const hideModal = (id) => { $("#" + id).style.display = "none"; };
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => hideModal(b.getAttribute("data-close"))));
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) hideModal(m.id); }));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal").forEach((m) => (m.style.display = "none")); });

// ---- climate (Benchmark Track · Stage A) ----------------------------------
function climateBlock(forceId) {
  const c = state.climate; if (!c) return null;
  if (forceId === "sun") {
    const a = c.annual, mo = c.monthly, r = c.sun && c.sun.reference;
    return el("div", { class: "climate-read" },
      el("div", null, el("span", { class: "cl-badge" }, "measured"),
        ` GHI ${a.ghiTotalKWh} kWh/m²·yr · Dec ${mo[11].ghiTotalKWh} / Jun ${mo[5].ghiTotalKWh}`),
      r ? el("div", { style: "margin-top:3px" }, "incident: ",
        el("b", null, `horiz ${r.horizontal} · S ${r.south} · E ${r.east} · W ${r.west} · N ${r.north}`),
        " kWh/m²·yr", el("span", { class: "tiny" }, " — isotropic sky, no self-shading (not yet Perez/Ladybug)")) : null);
  }
  if (forceId === "wind") {
    const r = c.windRose;
    return el("div", { class: "climate-read" },
      el("div", null, el("span", { class: "cl-badge" }, "measured"),
        ` prevailing ${r.prevailingAz}° · mean ${r.meanSpeed} m/s · calm ${r.calmPct}%`),
      windRoseSVG(r));
  }
  if (forceId === "humidity") {
    const a = c.annual, rhs = c.monthly.map((m) => m.rhMean).filter(Number.isFinite);
    const lo = rhs.length ? round2(Math.min(...rhs)) : "—", hi = rhs.length ? round2(Math.max(...rhs)) : "—";
    return el("div", { class: "climate-read" }, el("span", { class: "cl-badge" }, "measured"),
      ` RH mean ${a.rhMean}% (monthly ${lo}–${hi}%) · air ${a.dbtMean}°C. The es(T) comfort metric is the next increment.`);
  }
  return null;
}
function windRoseSVG(r) {
  const totals = r.counts.map((b) => b.reduce((s, x) => s + x, 0));
  const max = Math.max(1, ...totals), cx = 42, cy = 42, R = 34;
  let spokes = "";
  for (let i = 0; i < 16; i++) {
    const ang = (i * 22.5 - 90) * Math.PI / 180, len = (totals[i] / max) * R;
    spokes += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(ang) * len).toFixed(1)}" y2="${(cy + Math.sin(ang) * len).toFixed(1)}" stroke="#b0451f" stroke-width="3" stroke-linecap="round"/>`;
  }
  return el("div", { class: "windrose", title: "Wind rose — spoke length ∝ how often the wind comes FROM that compass point",
    html: `<svg viewBox="0 0 84 84" width="84" height="84"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#111"/><circle cx="${cx}" cy="${cy}" r="1.5" fill="#111"/>${spokes}<text x="${cx}" y="9" text-anchor="middle" font-size="8">N</text></svg>` });
}
function renderClimateStrip() {
  const host = $("#climate-strip"); if (!host) return; host.replaceChildren();
  if (state.climate) {
    const c = state.climate;
    host.append(
      el("div", { class: "cs-row" }, el("span", { class: "cl-badge" }, "climate · measured"),
        ` ${c.location.city || "EPW"} — ${c.annual.dbtMean}°C, RH ${c.annual.rhMean}%, GHI ${c.annual.ghiTotalKWh} kWh/m²·yr, wind ${c.windRose.prevailingAz}°`),
      el("button", { class: "cs-clear", title: "Remove the weather file", onclick: clearClimate }, "latitude-only ✕"),
    );
  } else {
    host.append(el("div", { class: "cs-row muted" },
      "No weather file — solar & wind use latitude + your inputs (", el("b", null, "modeled"),
      "). Load a ", el("b", null, ".epw"), " (e.g. climate.onebuilding.org) for real climate."));
  }
}
function loadClimate() {
  const input = el("input", { type: "file", accept: ".epw,.txt", style: "display:none" });
  document.body.append(input);
  input.addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) { input.remove(); return; }
    try {
      const c = parseEPW(await f.text());
      state.climate = c;
      if (Number.isFinite(c.location.lat)) state.seed.site.latitude = Math.round(c.location.lat);
      if (Number.isFinite(c.location.lon)) state.seed.site.longitude = Math.round(c.location.lon * 100) / 100;
      if (Number.isFinite(c.windRose.prevailingAz)) state.seed.site.windFromAz = Math.round(c.windRose.prevailingAz);
      if (Number.isFinite(c.windRose.meanSpeed)) state.seed.site.windSpeed = Math.round(c.windRose.meanSpeed * 10) / 10;
      syncOverlay(); rebuild();
      setStatus(describeClimate(c));
    } catch (err) { setStatus("Couldn't read EPW: " + err.message); }
    input.remove();
  });
  input.click();
}
function clearClimate() { state.climate = null; rebuild(); setStatus("Removed the weather file — back to latitude-only (modeled)."); }

// ---- header wiring --------------------------------------------------------
$("#v2-climate").addEventListener("click", loadClimate);
$("#v2-propose").addEventListener("click", proposeCharter);
$("#v2-reset").addEventListener("click", resetDesign);
$("#v2-fork").addEventListener("click", openFork);
$("#v2-save-series").addEventListener("click", saveSeries);
$("#v2-load-series").addEventListener("click", loadSeries);
const setStatus = (msg) => { $("#v2-status").textContent = msg; };

// ---- rebuild = structural render + a live pass ----------------------------
function rebuild() { renderClimateStrip(); buildForceDeck(); buildMake(); buildCharter(); liveUpdate(); renderSeries(); }

// ---- boot -----------------------------------------------------------------
Series.load();
syncModeBtn();
rebuild();
setStatus("Read the site on the left, name the forces, commit a move — or press ✶ Propose a charter to begin.");
