// app2.js (v2) — the site-forces METHOD, wired over the reused core.js engine and
// viewport.js renderer (both unchanged from v1, so zero parity cost).
//
// The loop the UI enacts: READ the site (force deck) → NAME the forces (govern
// toggle) → COMMIT a move (drafts a rule into the charter) → MAKE the move
// (geometry sliders) → WATCH the standing → SPAWN the next fork (series).
import { DEFAULTS, run, VARIABLE_DEFS, HOST_LABELS, WALL_HOSTS, ROOF_HOSTS, rotZ } from "../core.js";
import { createViewport } from "../viewport.js";
import { FORCES, draftClause, activeTensions } from "./forces.js";
import { Series, makeVariation, diffSeeds } from "./series.js";
import { parseEPW, describeClimate } from "./weather.js";
import { incidentByModel } from "../radiation.js";
import { oursReference, parseLadybugCSV, compareRows, WHY_GENERAL, comparisonPack } from "./compare.js";
import { feetInches, imp, fmtMetricImp, sliderUnit, impConv, cToF, MPH } from "./units.js";

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
// metric readout in IMPERIAL (lengths → feet-inches, areas → ft², etc.)
const fmtMetric = (k, v) => fmtMetricImp(unitOf(k), v);

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
];

// generic slider bound to an object path. Operates in DISPLAY units (feet for
// lengths) and stores SI; the value label reads feet-and-inches.
function makeSlider(rootObj, spec, onChange) {
  const U = sliderUnit(spec);
  const si = getPath(rootObj, spec.path);
  const valEl = el("span", { class: "slval" }, U.label(si));
  const input = el("input", {
    type: "range", min: U.dmin, max: U.dmax, step: U.dstep, value: U.toDisp(si),
    oninput: (e) => { const v = U.fromDisp(parseFloat(e.target.value)); setPath(rootObj, spec.path, v); valEl.textContent = U.label(v); onChange(); },
  });
  return el("div", { class: "sl" }, el("label", null, spec.label), valEl, input);
}

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

// ---- aperture editor (openings) -------------------------------------------
function buildApertures() {
  const host = $("#apertures"); if (!host) return; host.replaceChildren();
  const aps = state.seed.params.apertures || [];
  if (!aps.length) host.append(el("div", { class: "ap-empty" }, "No openings. Add one below."));
  aps.forEach((ap, i) => host.append(apertureRow(ap, i)));
  host.append(el("button", { class: "ap-add", onclick: addAperture }, "+ add opening"));
}
function apertureRow(ap, i) {
  const hostSel = el("select", { class: "ap-host", title: "Which face this opening cuts into",
    onchange: (e) => { ap.host = e.target.value; rebuild(); } },
    [...WALL_HOSTS, ...ROOF_HOSTS].map((h) => el("option", { value: h, selected: h === ap.host ? true : null }, HOST_LABELS[h])));
  const mini = (key, label, spec) => makeSlider(ap, Object.assign({ path: key, label }, spec), liveUpdate);
  return el("div", { class: "ap-row" },
    el("div", { class: "ap-head" },
      el("b", null, ap.id || ("A" + (i + 1))), hostSel,
      el("button", { class: "ap-del", title: "Remove this opening", onclick: () => removeAperture(i) }, "✕")),
    el("div", { class: "ap-grid" },
      mini("w", "width", { unit: "m", min: 0.2, max: 6, step: 0.1 }),
      mini("h", "height", { unit: "m", min: 0.2, max: 3, step: 0.1 }),
      mini("u", "across (0–1)", { unit: "", min: 0, max: 1, step: 0.02 }),
      mini("v", "up (0–1)", { unit: "", min: 0, max: 1, step: 0.02 })));
}
function addAperture() {
  const aps = state.seed.params.apertures;
  let n = aps.length + 1, id = "A" + n;
  while (aps.some((a) => a.id === id)) { n++; id = "A" + n; }
  aps.push({ id, host: "wall_ny", u: 0.5, v: 0.5, w: 1.2, h: 1.2 });
  rebuild(); setStatus(`Added opening ${id}.`);
}
function removeAperture(i) {
  state.seed.params.apertures.splice(i, 1);
  rebuild(); setStatus("Removed an opening.");
}

// ---- enclosure warning (walls must sit within the roof footprint) ---------
function wallsOverRoof() {
  const P = state.seed.params, north = state.seed.site.northAngle || 0;
  const W = P.walls, Rf = P.roof;
  let over = 0;
  for (const [lx, ly] of [[W.W / 2, W.L / 2], [-W.W / 2, W.L / 2], [W.W / 2, -W.L / 2], [-W.W / 2, -W.L / 2]]) {
    const p = rotZ([lx, ly, 0], W.R);
    const world = rotZ([p[0] + W.cx, p[1] + W.cy, 0], north);   // wall corner → world
    const a = rotZ([world[0], world[1], 0], -north);
    const rl = rotZ([a[0] - Rf.cx, a[1] - Rf.cy, 0], -Rf.R);    // world → roof-local
    over = Math.max(over, Math.abs(rl[0]) - Rf.W / 2, Math.abs(rl[1]) - Rf.L / 2);
  }
  return over; // metres past the roof edge (>0 = the room pokes out)
}
function updateWarning() {
  const w = $("#geo-warning"); if (!w) return;
  const over = wallsOverRoof();
  if (over > 0.02) {
    w.style.display = "block";
    w.textContent = `⚠ The room extends ${feetInches(over)} past the roof edge — it won't be fully enclosed by the gable. Shrink the room (width/length) or enlarge the roof overhang.`;
  } else { w.style.display = "none"; }
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
          el("input", { class: "cl-edit", type: "number", step: "0.01", value: round2(c.rhs * impConv(unitOf(c.lhs)).f),
            onchange: (e) => { c.rhs = parseFloat(e.target.value) / impConv(unitOf(c.lhs)).f; liveUpdate(); } }),
          " ", impConv(unitOf(c.lhs)).u === "0–1" ? "" : impConv(unitOf(c.lhs)).u),
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
  updateWarning();
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
    const Cv = impConv(unitOf(res.rule.lhs));
    ref.valEl.textContent = (res.value == null || Number.isNaN(res.value)) ? "—" : `${round2(res.value * Cv.f)}${Cv.u && Cv.u !== "0–1" ? " " + Cv.u : ""}`;
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

// ---- Ladybug side-by-side (instructor demo) -------------------------------
function openCompare() {
  const body = $("#compare-body"); body.replaceChildren();
  if (!state.climate) {
    body.append(el("p", null, "Load a climate (.epw) first — the comparison needs real weather to reproduce in Ladybug."),
      el("div", { class: "ff-actions" }, el("button", { class: "btn", onclick: () => hideModal("compareModal") }, "OK")));
    return showModal("compareModal");
  }
  const c = state.climate, ours = oursReference(c);
  const ourTable = el("table", { class: "cmp-table" },
    el("tr", null, el("th", null, "surface"), el("th", null, "ours (kWh/m²·yr)")),
    ...ours.map((o) => el("tr", null, el("td", null, o.label), el("td", null, o.ours == null ? "—" : o.ours))));
  const ta = el("textarea", { class: "cmp-paste", placeholder: "Paste Ladybug results as key,value rows:\nhorizontal,1610\nsouth,1240\neast,980\nwest,990\nnorth,560" });
  const result = el("div", { class: "cmp-result" });

  const runCompare = () => {
    const lb = parseLadybugCSV(ta.value);
    if (!Object.keys(lb).length) { result.replaceChildren(el("p", { class: "tiny" }, "No rows parsed — use lines like “horizontal,1600”.")); return; }
    const rows = compareRows(ours, lb);
    result.replaceChildren(
      el("table", { class: "cmp-table" },
        el("tr", null, el("th", null, "surface"), el("th", null, "ours"), el("th", null, "Ladybug"), el("th", null, "Δ"), el("th", null, "%"), el("th", null, "verdict")),
        ...rows.map((r) => el("tr", { class: "cmp-" + r.status },
          el("td", null, r.label), el("td", null, r.ours == null ? "—" : r.ours), el("td", null, r.lb == null ? "—" : r.lb),
          el("td", null, r.delta == null ? "—" : r.delta), el("td", null, r.pct == null ? "—" : r.pct + "%"),
          el("td", null, r.status === "na" ? "no LB value" : r.status === "ok" ? "reproduces" : r.status === "near" ? "close" : "diverges")))),
      el("div", { class: "cmp-why" }, el("b", null, "Why they differ — and why that IS the lesson:"),
        el("ul", null, ...WHY_GENERAL.map((w) => el("li", null, w)))));
  };

  body.append(
    el("p", { class: "tiny" }, `Same EPW + Tregenza-145 required. Loaded: ${c.location.city || "EPW"} (${c.location.lat}°, ${c.location.lon}°), GHI ${c.annual.ghiTotalKWh} kWh/m²·yr. Our sky is isotropic — “reproduces” means we match Ladybug's METHOD within a few %, not absolute accuracy.`),
    el("h4", { class: "cmp-h" }, "Our incidence — unshaded unit surfaces"), ourTable,
    el("div", { class: "ff-actions" },
      el("button", { class: "btn", onclick: () => downloadJSON(comparisonPack(state, new Date().toISOString().slice(0, 10)), "eco-architect-comparison.json") }, "⤓ Comparison pack"),
      el("a", { class: "btn", href: "../../LADYBUG_RECIPE.md", target: "_blank", rel: "noopener" }, "Recipe ↗")),
    el("h4", { class: "cmp-h" }, "Paste Ladybug's results"), ta,
    el("div", { class: "ff-actions" }, el("button", { class: "btn primary", onclick: runCompare }, "Compare")),
    result);
  showModal("compareModal");
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
    const m = state.last && state.last.model, R = c.sun && c.sun.matrix;
    let occ = null;
    if (m && R) {
      const rad = incidentByModel(m, R); // parity-tested (web/radiation.js ↔ python/radiation.py)
      occ = el("div", { style: "margin-top:3px" }, "this massing, self-shaded: ",
        el("b", null, `glazing ${Math.round(rad.glazingMean)} · envelope ${Math.round(rad.envelopeMean)}`),
        " kWh/m²·yr ", el("span", { class: "cl-badge" }, "parity-tested"));
    }
    return el("div", { class: "climate-read" },
      el("div", null, el("span", { class: "cl-badge" }, "measured"),
        ` GHI ${a.ghiTotalKWh} kWh/m²·yr · Dec ${mo[11].ghiTotalKWh} / Jun ${mo[5].ghiTotalKWh}`),
      r ? el("div", { style: "margin-top:3px" }, "incident (unshaded): ",
        el("b", null, `horiz ${r.horizontal} · S ${r.south} · E ${r.east} · W ${r.west} · N ${r.north}`),
        " kWh/m²·yr", el("span", { class: "tiny" }, " — isotropic sky")) : null,
      occ);
  }
  if (forceId === "wind") {
    const r = c.windRose;
    return el("div", { class: "climate-read" },
      el("div", null, el("span", { class: "cl-badge" }, "measured"),
        ` prevailing ${r.prevailingAz}° · mean ${round2(r.meanSpeed * MPH)} mph · calm ${r.calmPct}%`),
      windRoseSVG(r));
  }
  if (forceId === "humidity") {
    const a = c.annual, rhs = c.monthly.map((m) => m.rhMean).filter(Number.isFinite);
    const lo = rhs.length ? round2(Math.min(...rhs)) : "—", hi = rhs.length ? round2(Math.max(...rhs)) : "—";
    return el("div", { class: "climate-read" }, el("span", { class: "cl-badge" }, "measured"),
      ` RH mean ${a.rhMean}% (monthly ${lo}–${hi}%) · air ${round2(cToF(a.dbtMean))}°F. The es(T) comfort metric is the next increment.`);
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
        ` ${c.location.city || "EPW"} — ${round2(cToF(c.annual.dbtMean))}°F, RH ${c.annual.rhMean}%, GHI ${c.annual.ghiTotalKWh} kWh/m²·yr, wind ${c.windRose.prevailingAz}°`),
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
      setStatus(`${c.location.city || "EPW"} loaded — ${round2(cToF(c.annual.dbtMean))}°F mean, GHI ${c.annual.ghiTotalKWh} kWh/m²·yr, wind from ${c.windRose.prevailingAz}° at ${round2(c.windRose.meanSpeed * MPH)} mph.`);
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
$("#v2-compare").addEventListener("click", openCompare);
const setStatus = (msg) => { $("#v2-status").textContent = msg; };

// ---- rebuild = structural render + a live pass ----------------------------
function rebuild() { renderClimateStrip(); buildForceDeck(); buildMake(); buildApertures(); buildCharter(); liveUpdate(); renderSeries(); }

// ---- boot -----------------------------------------------------------------
Series.load();
syncModeBtn();
rebuild();
setStatus("Read the site on the left, name the forces, commit a move — or press ✶ Propose a charter to begin.");
