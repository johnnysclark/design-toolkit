// app4.js — "Design → goals" (V4). Reuses core.js (run/evaluate) + viewport.js +
// v2/units.js UNCHANGED. The star is the right-hand GOALS panel: each goal fills
// toward its target and flips green the moment it's met, live as you design. The
// bottom "force brainstormer" turns a fuzzy desire into testable numeric goals.
import { run, buildModel, DEFAULTS, VARIABLE_DEFS, evaluateRule, rotZ } from "../core.js";
import { createViewport } from "../viewport.js";
import { fmtMetricImp, impConv, sliderUnit, feetInches } from "../v2/units.js";

// ---- tiny DOM helper -------------------------------------------------------
function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}
const $ = (s) => document.querySelector(s);
const DEF = Object.fromEntries(VARIABLE_DEFS.map((d) => [d.key, d]));
const labelOf = (key) => (DEF[key]?.label || key);
const unitOf = (key) => (DEF[key]?.unit || "");

// ---- state -----------------------------------------------------------------
const state = {
  params: structuredClone(DEFAULTS.params),
  site: structuredClone(DEFAULTS.site),
  display: { mode: "analysis", analysisField: "solarYear", sunHour: 12, shadowIntensity: 0.6 },
  // goals = rules over the metric vars. Seeded so the panel is alive on load.
  goals: [
    { id: "g1", lhs: "solarWinterUseful", op: ">=", rhs: 4.0 },
    { id: "g2", lhs: "overheatRatio", op: "<=", rhs: 0.6 },
    { id: "g3", lhs: "viewQuality", op: ">=", rhs: 0.18 },
    { id: "g4", lhs: "glazingRatio", op: "between", rhs: [0.035, 0.12] },
  ],
};
let GID = 100;
let last = null;            // { model, metrics, vars }
let viewport = null;

// ---- goal math: a consistent "fill toward met" progress for every operator --
// Returns { met, progress 0..1, state, goalText, marginText }. progress fills as
// you approach the target and is full when met — so every goal reads the same way.
function goalStatus(goal) {
  const r = evaluateRule(goal, last.vars);          // { ok, value, margin }
  const v = r.value, op = goal.op, rhs = goal.rhs;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  let progress = 0;
  if (r.ok) progress = 1;
  else if (op === ">=" || op === ">") progress = rhs > 0 ? clamp01(v / rhs) : (v <= 0 ? 0 : 1);
  else if (op === "<=" || op === "<") progress = v > 0 ? clamp01(rhs / v) : 1;
  else if (op === "between") progress = v < rhs[0] ? clamp01(rhs[0] ? v / rhs[0] : 0) : clamp01(v ? rhs[1] / v : 0);
  else if (op === "outside") progress = 0.4;
  else if (op === "==") progress = clamp01(1 - Math.abs(v - rhs) / (Math.abs(rhs) || 1));
  const st = r.ok ? "met" : progress >= 0.8 ? "close" : "far";

  const u = unitOf(goal.lhs), c = impConv(u);
  const tgt = Array.isArray(rhs) ? `${disp(rhs[0], u)}–${disp(rhs[1], u)}` : disp(rhs, u);
  const OPW = { ">=": "at least", ">": "over", "<=": "at most", "<": "under", "between": "between", "outside": "outside", "==": "≈" };
  const goalText = `goal: ${OPW[op] || op} ${tgt}`;
  let marginText = "";
  if (r.ok) marginText = "✓ met";
  else if (r.margin != null) {
    const need = Math.abs(r.margin) * c.f;
    const dir = (op === "<=" || op === "<") ? "lower" : (op === ">=" || op === ">") ? "higher" : "closer";
    marginText = `needs ${roundDisp(need)}${c.u && c.u !== "0–1" ? " " + c.u : ""} ${dir}`;
  }
  return { met: r.ok, value: r.value, progress, state: st, goalText, marginText };
}
// display a single SI value in the metric's imperial unit (no unit suffix)
function disp(siVal, unit) {
  if (unit === "m") return feetInches(siVal);
  const { v } = impConv(unit), out = siVal * v;
  return roundDisp(out);
}
const roundDisp = (x) => (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : Math.abs(x) >= 1 ? (Math.round(x * 100) / 100) : (Math.round(x * 1000) / 1000));

// ---- the GOALS panel (the hero) --------------------------------------------
function renderGoals() {
  const listEl = $("#goal-list"); listEl.innerHTML = "";
  const statuses = state.goals.map((g) => ({ g, s: goalStatus(g) }));
  const metN = statuses.filter((x) => x.s.met).length;
  $("#goal-count").textContent = state.goals.length ? `${metN} / ${state.goals.length} met` : "—";

  const tally = $("#goal-tally"); tally.innerHTML = "";
  for (const { s } of statuses) tally.append(el("div", { class: "v4pip " + s.state }));

  if (!state.goals.length) {
    listEl.append(el("div", { class: "v4empty" }, "No goals yet. Add one below, or ask the force brainstormer to suggest some from what you want."));
    return;
  }
  const ICON = { met: "✓", close: "◑", far: "" };
  for (const { g, s } of statuses) {
    const card = el("div", { class: "v4goal " + s.state }, [
      el("div", { class: "v4goal-top" }, [
        el("span", { class: "v4goal-ico" }, ICON[s.state] || ""),
        el("span", { class: "v4goal-lbl" }, labelOf(g.lhs)),
        el("span", { class: "v4goal-val" }, s.value == null ? "—" : fmtMetricImp(unitOf(g.lhs), s.value)),
        el("button", { class: "v4goal-x", title: "Remove goal", onclick: () => { state.goals = state.goals.filter((x) => x !== g); renderGoals(); } }, "✕"),
      ]),
      el("div", { class: "v4goal-track" }, [el("div", { class: "v4goal-fill", style: `width:${Math.round(s.progress * 100)}%` })]),
      el("div", { class: "v4goal-foot" }, [
        el("span", { class: "v4goal-state" }, s.state === "met" ? "Met" : s.state === "close" ? "Within reach" : "Keep going"),
        el("span", {}, s.marginText || s.goalText),
      ]),
    ]);
    listEl.append(card);
  }
}

// add-goal row (manual) + a "load a starter set" link
function renderAddGoal() {
  const host = $("#add-goal"); host.innerHTML = "";
  const groups = [...new Set(VARIABLE_DEFS.filter((d) => d.group !== "Params").map((d) => d.group))];
  const metricSel = el("select", {}, groups.map((grp) =>
    el("optgroup", { label: grp }, VARIABLE_DEFS.filter((d) => d.group === grp).map((d) => el("option", { value: d.key }, `${d.label}`)))));
  const opSel = el("select", {}, [">=", "<=", ">", "<", "between"].map((o) => el("option", { value: o }, o)));
  const numInp = el("input", { type: "number", step: "0.01", value: "1" });
  const add = el("button", { class: "v4btn", type: "button", onclick: () => {
    const key = metricSel.value, op = opSel.value;
    const n = parseFloat(numInp.value); if (Number.isNaN(n)) return;
    const rhs = op === "between" ? [n, n * 2] : n;
    state.goals.push({ id: "g" + (GID++), lhs: key, op, rhs });
    renderGoals();
  } }, "Add");
  host.append(el("div", { class: "v4addrow" }, [metricSel, opSel, numInp, add]));
}

// ---- left controls (reuse v2/units sliderUnit for feet-inches) -------------
const CONTROLS = (st) => [
  ["Room", [
    [st.params.walls, "W", "width", 2, 16, 0.1, "m"], [st.params.walls, "L", "length", 2, 18, 0.1, "m"],
    [st.params.walls, "h", "wall height", 2, 6, 0.05, "m"],
  ]],
  ["Roof", [
    [st.params.roof, "pitchL", "pitch L", -30, 60, 1, "°"], [st.params.roof, "pitchR", "pitch R", -30, 60, 1, "°"],
    [st.params.roof, "ridgeRise", "ridge rise", 0, 5, 0.05, "m"], [st.params.roof, "W", "roof width", 2, 18, 0.1, "m"], [st.params.roof, "L", "roof length", 2, 20, 0.1, "m"],
  ]],
  ["Site & sun", [
    [st.site, "latitude", "latitude", -60, 70, 0.5, "°"], [st.site, "northAngle", "north rotation", -180, 180, 1, "°"],
    [st.site, "windFromAz", "wind from", 0, 360, 1, "°"], [st.site, "windSpeed", "wind speed", 0, 25, 0.5, "m/s"],
  ]],
];

function buildControls() {
  const body = $("#control-body"); body.innerHTML = "";
  for (const [title, rows] of CONTROLS(state)) {
    const grp = el("div", { class: "v4grp" }, [el("h4", {}, title)]);
    for (const [obj, key, label, min, max, step, unit] of rows) grp.append(slider(obj, key, label, min, max, step, unit));
    body.append(grp);
  }
  // apertures
  const apg = el("div", { class: "v4grp" }, [el("h4", {}, "Openings")]);
  for (const ap of state.params.apertures) apg.append(apertureRow(ap));
  body.append(apg);
}

function slider(obj, key, label, min, max, step, unit) {
  const su = sliderUnit({ unit, min, max, step });
  const range = el("input", { type: "range", min: su.dmin, max: su.dmax, step: su.dstep, value: su.toDisp(obj[key]) });
  const val = el("span", { class: "v4val" }, su.label(obj[key]));
  range.addEventListener("input", () => { obj[key] = su.fromDisp(+range.value); val.textContent = su.label(obj[key]); liveUpdate(); });
  return el("div", { class: "v4row" }, [el("span", {}, label), val, range]);
}

const HOSTS = [["wall_ny", "South wall"], ["wall_py", "North wall"], ["wall_px", "East wall"], ["wall_nx", "West wall"], ["roof_l", "Roof L"], ["roof_r", "Roof R"]];
function apertureRow(ap) {
  const host = el("select", { onchange: (e) => { ap.host = e.target.value; liveUpdate(); } },
    HOSTS.map(([v, t]) => el("option", { value: v, selected: v === ap.host ? "selected" : null }, t)));
  const mini = (k, lbl, mn, mx, st, ft) => {
    const f = ft ? 3.280839895 : 1;
    const inp = el("input", { type: "number", min: mn * f, max: mx * f, step: st * f, value: Math.round(ap[k] * f * 100) / 100 });
    inp.addEventListener("input", () => { ap[k] = Math.max(mn, Math.min(mx, (+inp.value) / f)); liveUpdate(); });
    return el("label", {}, [el("span", {}, lbl), inp]);
  };
  return el("div", {}, [
    el("div", { class: "v4aphead" }, [el("b", {}, ap.id), host]),
    el("div", { class: "v4apgrid" }, [mini("w", "w (ft)", 0.1, 8, 0.05, true), mini("h", "h (ft)", 0.1, 5, 0.05, true), mini("u", "across", 0, 1, 0.01, false), mini("v", "up", 0, 1, 0.01, false)]),
  ]);
}

// ---- walls-over-roof warning (same precondition as v2; params-only) --------
function wallsOverRoof() {
  const P = state.params, north = state.site.northAngle || 0, W = P.walls, Rf = P.roof;
  let over = 0;
  for (const [lx, ly] of [[W.W / 2, W.L / 2], [-W.W / 2, W.L / 2], [W.W / 2, -W.L / 2], [-W.W / 2, -W.L / 2]]) {
    const p = rotZ([lx, ly, 0], W.R), world = rotZ([p[0] + W.cx, p[1] + W.cy, 0], north);
    const a = rotZ([world[0], world[1], 0], -north), rl = rotZ([a[0] - Rf.cx, a[1] - Rf.cy, 0], -Rf.R);
    over = Math.max(over, Math.abs(rl[0]) - Rf.W / 2, Math.abs(rl[1]) - Rf.L / 2);
  }
  return over;
}
function updateWarning() {
  const w = $("#geo-warning"), over = wallsOverRoof();
  if (over > 0.02) { w.style.display = "block"; w.textContent = `⚠ The room pokes ${feetInches(over)} past the roof — it won't be fully enclosed. Shrink the room or widen the roof.`; }
  else w.style.display = "none";
}

// ---- the live loop ---------------------------------------------------------
function liveUpdate() {
  const r = run(state.params, state.site, null);
  last = { model: r.model, metrics: r.metrics, vars: r.vars };
  if (viewport) viewport.setModel(r.model, state.display);
  renderGoals();
  updateWarning();
}

// ---- brainstormer chat -----------------------------------------------------
const aiThread = [];   // [{role, content}]
function addMsg(role, html) {
  const b = el("div", { class: "v4bubble" }); b.innerHTML = html;
  const m = el("div", { class: "v4msg " + role }, [b]);
  $("#thread").append(m); $("#thread").scrollTop = $("#thread").scrollHeight;
  return b;
}
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const mdLite = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

async function sendBrainstorm(text) {
  if (!text.trim()) return;
  addMsg("user", esc(text));
  aiThread.push({ role: "user", content: text });
  const bot = addMsg("bot", ""); bot.classList.add("dots");
  $("#chat-send").disabled = true;
  const ctx = {
    metrics: last ? Object.fromEntries(Object.entries(last.metrics).map(([k, v]) => [k, +(+v).toFixed(4)])) : {},
    goals: state.goals.map((g) => ({ metricKey: g.lhs, op: g.op, rhs: g.rhs })),
  };
  let acc = "", errored = false;
  try {
    const res = await fetch("/api/gable-studio/brainstorm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: aiThread, tier: "deep", context: ctx }),
    });
    if (res.status === 401) {
      bot.classList.remove("dots"); aiThread.pop();
      bot.innerHTML = `Sign in to use the brainstormer — <a href="/login" target="_top">open the sign-in page →</a>. Designing &amp; testing goals stays free.`;
      return;
    }
    if (!res.ok || !res.body) throw new Error("Request failed (" + res.status + ")");
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const frames = buf.split("\n\n"); buf = frames.pop();
      for (const f of frames) {
        const ev = (f.match(/^event: (.*)$/m) || [])[1], dm = f.match(/^data: (.*)$/m);
        if (!dm) continue; let data; try { data = JSON.parse(dm[1]); } catch { continue; }
        if (ev === "token") { bot.classList.remove("dots"); acc += data.text || ""; bot.innerHTML = mdLite(stripGoals(acc)); $("#thread").scrollTop = 1e9; }
        else if (ev === "done") { acc = data.text || acc; }
        else if (ev === "error") { errored = true; bot.classList.remove("dots"); bot.innerHTML = "⚠ " + esc(data.message || "Something went wrong."); }
      }
    }
  } catch (e) {
    errored = true; bot.classList.remove("dots"); bot.innerHTML = "⚠ " + esc(e.message || "Network error.");
  } finally {
    $("#chat-send").disabled = false;
  }
  if (errored) return;
  bot.classList.remove("dots");
  const proposals = parseGoals(acc);
  bot.innerHTML = mdLite(stripGoals(acc).trim() || "Here are some goals to try:");
  aiThread.push({ role: "assistant", content: stripGoals(acc).trim() });
  if (proposals.length) bot.append(renderProposals(proposals));
}

// the assistant ends its reply with a ```goals [ ... ] ``` block of proposals
function parseGoals(text) {
  const m = text.match(/```goals\s*([\s\S]*?)```/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[1].trim());
    return (Array.isArray(arr) ? arr : []).filter((p) => p && DEF[p.metricKey] && ["<", "<=", ">", ">=", "between"].includes(p.op));
  } catch { return []; }
}
const stripGoals = (text) => text.replace(/```goals[\s\S]*?```/g, "").replace(/```goals[\s\S]*$/, "");

function renderProposals(props) {
  const wrap = el("div", { class: "v4proposals" });
  for (const p of props) {
    const tgt = Array.isArray(p.rhs) ? `${p.rhs[0]}–${p.rhs[1]}` : p.rhs;
    const chip = el("button", { class: "v4prop", type: "button", title: p.why || "" },
      [el("span", { class: "pin" }, "＋"), `${labelOf(p.metricKey)} ${p.op} ${tgt}`]);
    chip.addEventListener("click", () => {
      if (chip.disabled) return;
      state.goals.push({ id: "g" + (GID++), lhs: p.metricKey, op: p.op, rhs: p.rhs });
      renderGoals();
      chip.disabled = true; chip.firstChild.textContent = "✓"; chip.lastChild.textContent = " added";
    });
    wrap.append(chip);
  }
  return wrap;
}

// ---- view controls ---------------------------------------------------------
function syncMode() { $("#modeBtn").textContent = state.display.mode === "analysis" ? "☀ Analysis" : "◫ Pen"; }
function wireTop() {
  $("#modeBtn").addEventListener("click", () => { state.display.mode = state.display.mode === "analysis" ? "pen" : "analysis"; syncMode(); viewport && viewport.setDisplay(state.display); });
  $("#overlay").addEventListener("change", (e) => { state.display.analysisField = e.target.value; viewport && viewport.setDisplay(state.display); });
  $("#sunHour").addEventListener("input", (e) => { state.display.sunHour = +e.target.value; viewport && viewport.setDisplay(state.display); });
}
function wireChat() {
  $("#composer").addEventListener("submit", (e) => { e.preventDefault(); const i = $("#chat-input"); const t = i.value; i.value = ""; sendBrainstorm(t); });
  $("#chat-clear").addEventListener("click", () => { aiThread.length = 0; $("#thread").querySelectorAll(".v4msg").forEach((n, i) => { if (i > 0) n.remove(); }); });
  document.querySelectorAll(".v4chip.seed").forEach((c) => c.addEventListener("click", () => { $("#chat-input").value = c.textContent.replace(/[“”]/g, ""); sendBrainstorm($("#chat-input").value); $("#chat-input").value = ""; }));
}

// ---- boot ------------------------------------------------------------------
function boot() {
  try { viewport = createViewport($("#view")); } catch (e) { console.error("viewport failed", e); }
  buildControls(); renderAddGoal(); wireTop(); wireChat(); syncMode();
  liveUpdate();
}
boot();
