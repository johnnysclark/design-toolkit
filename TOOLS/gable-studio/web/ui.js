// ui.js — DOM for the control panel, the live metrics dashboard, and the rule
// builder. Pure view layer: it reads/writes the state object app.js owns and
// calls back when something changes.
import { VARIABLE_DEFS, HOST_LABELS, WALL_HOSTS, ROOF_HOSTS } from "./core.js";

export function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

const fmt = (x, u) => {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  const abs = Math.abs(x);
  const s = abs >= 100 ? x.toFixed(0) : abs >= 10 ? x.toFixed(1) : abs >= 1 ? x.toFixed(2) : x.toFixed(3);
  return u ? `${s} ${u}` : s;
};

// --- parameter sliders ------------------------------------------------------
const SLIDERS = {
  Plinth: [["Wp", "width", 2, 20, 0.1], ["Dp", "depth", 2, 24, 0.1], ["Hp", "height", 0.2, 4, 0.05], ["Rp", "rotation°", -45, 45, 1], ["e", "soil depth", 0, 4, 0.05]],
  Room: [["Wr", "width", 2, 18, 0.1], ["Dr", "depth", 2, 20, 0.1], ["Hr", "wall height", 2, 6, 0.05], ["Rr", "rotation°", -45, 45, 1], ["cx", "offset X", -3, 3, 0.05], ["cy", "offset Y", -3, 3, 0.05]],
  Roof: [["Wroof", "width", 2, 18, 0.1], ["Droof", "depth", 2, 20, 0.1], ["Hg", "ridge rise", 0, 6, 0.05], ["Rg", "ridge rot°", -90, 90, 1]],
};
const SITE_SLIDERS = [["latitude", "latitude°", -60, 70, 1], ["northAngle", "north°", -180, 180, 1], ["windFromAz", "wind from°", 0, 360, 1], ["windSpeed", "wind m/s", 0, 25, 0.5], ["deltaT", "ΔT °K", 0, 20, 0.5], ["viewTargetAz", "view az°", 0, 360, 1], ["eyeHeight", "eye ht", 1, 2, 0.05]];

function slider(obj, key, label, min, max, step, onChange) {
  const range = el("input", { type: "range", min, max, step, value: obj[key] });
  const num = el("input", { type: "number", min, max, step, value: obj[key], class: "num" });
  const sync = (v) => { v = Math.max(min, Math.min(max, +v)); obj[key] = v; range.value = v; num.value = v; onChange(); };
  range.addEventListener("input", () => sync(range.value));
  num.addEventListener("input", () => sync(num.value));
  return el("label", { class: "slider" }, [el("span", { class: "slk" }, label), range, num]);
}

export function renderControls(container, state, onChange) {
  container.innerHTML = "";
  for (const [group, rows] of Object.entries(SLIDERS)) {
    container.append(el("h4", {}, group));
    for (const [k, lbl, mn, mx, st] of rows) container.append(slider(state.params, k, lbl, mn, mx, st, onChange));
  }
  container.append(el("h4", {}, "Apertures (3 walls + 1 roof)"));
  state.params.apertures.forEach((ap, i) => container.append(apertureRow(ap, i, onChange)));
  container.append(el("h4", {}, "Site"));
  for (const [k, lbl, mn, mx, st] of SITE_SLIDERS) container.append(slider(state.site, k, lbl, mn, mx, st, onChange));
}

function apertureRow(ap, i, onChange) {
  const opts = [...WALL_HOSTS, ...ROOF_HOSTS].map((h) => el("option", { value: h, selected: h === ap.host ? "selected" : null }, HOST_LABELS[h]));
  const host = el("select", { class: "hostsel", onchange: (e) => { ap.host = e.target.value; onChange(); } }, opts);
  const mini = (key, lbl, mn, mx, st) => {
    const n = el("input", { type: "number", min: mn, max: mx, step: st, value: ap[key], class: "num" });
    n.addEventListener("input", () => { ap[key] = +n.value; onChange(); });
    return el("label", { class: "mini" }, [el("span", {}, lbl), n]);
  };
  return el("div", { class: "apblock" }, [
    el("div", { class: "aphead" }, [el("b", {}, ap.id), host]),
    el("div", { class: "apgrid" }, [mini("u", "u", 0, 1, 0.01), mini("v", "v", 0, 1, 0.01), mini("w", "w m", 0.1, 6, 0.05), mini("h", "h m", 0.1, 4, 0.05)]),
  ]);
}

// --- metrics dashboard ------------------------------------------------------
const DASH = [
  ["Solar", [["solarWinterUseful", 3], ["solarSummerUseful", 3], ["overheatRatio", 3], ["solarSouth", 3]]],
  ["Wind", [["windExposure", 60], ["windPressure", 4000], ["channelIndex", 5]]],
  ["Air", [["stackIndex", 1.2], ["stackHeight", 6]]],
  ["View", [["viewQuality", 0.4], ["viewAmount", 1], ["skyView", 0.2]]],
  ["Earth", [["soilContactArea", 140], ["thermalMassRatio", 6], ["buriedFraction", 1]]],
  ["Form", [["enclosedVolume", 260], ["glazingRatio", 0.4], ["pitchDeg", 60]]],
];
const DEF = Object.fromEntries(VARIABLE_DEFS.map((d) => [d.key, d]));

export function renderDashboard(container, metrics) {
  container.innerHTML = "";
  for (const [group, rows] of DASH) {
    const wrap = el("div", { class: "dgroup" }, [el("h4", {}, group)]);
    for (const [key, soft] of rows) {
      const d = DEF[key] || { label: key, unit: "" };
      const val = metrics[key];
      const pct = Math.max(0, Math.min(1, (val || 0) / soft)) * 100;
      wrap.append(el("div", { class: "metric" }, [
        el("div", { class: "mtop" }, [el("span", { class: "mlbl" }, d.label), el("span", { class: "mval" }, fmt(val, d.unit))]),
        el("div", { class: "bar" }, [el("div", { class: "barfill", style: `width:${pct}%` })]),
      ]));
    }
    container.append(wrap);
  }
}

// --- rule builder -----------------------------------------------------------
const OPS = ["<", "<=", ">", ">=", "==", "between", "outside"];
let RID = 1;
export const newRule = () => ({ id: "R" + RID++, lhs: "solarWinterUseful", op: ">", rhs: 1.5, weight: 1, hard: false });

export function renderRules(container, ruleset, onChange) {
  container.innerHTML = "";
  const varOpts = () => VARIABLE_DEFS.map((d) => ({ v: d.key, t: `${d.label} (${d.unit})`, g: d.group }));
  ruleset.rules.forEach((rule) => container.append(ruleRow(rule, ruleset, varOpts(), onChange)));
  container.append(el("button", { class: "addrule", onclick: () => { ruleset.rules.push(newRule()); onChange(true); } }, "+ add rule"));
}

function ruleRow(rule, ruleset, varOpts, onChange) {
  const groups = [...new Set(varOpts.map((o) => o.g))];
  const sel = el("select", { class: "lhs", onchange: (e) => { rule.lhs = e.target.value; onChange(); } },
    groups.map((g) => el("optgroup", { label: g }, varOpts.filter((o) => o.g === g).map((o) => el("option", { value: o.v, selected: o.v === rule.lhs ? "selected" : null }, o.t)))));
  const op = el("select", { class: "op", onchange: (e) => { rule.op = e.target.value; if ((rule.op === "between" || rule.op === "outside") && !Array.isArray(rule.rhs)) rule.rhs = [0, 1]; if (!(rule.op === "between" || rule.op === "outside") && Array.isArray(rule.rhs)) rule.rhs = rule.rhs[0]; onChange(true); } },
    OPS.map((o) => el("option", { value: o, selected: o === rule.op ? "selected" : null }, o)));
  const isRange = rule.op === "between" || rule.op === "outside";
  let rhsEls;
  if (isRange) {
    if (!Array.isArray(rule.rhs)) rule.rhs = [0, 1];
    const lo = el("input", { type: "number", step: 0.01, value: rule.rhs[0], class: "num" });
    const hi = el("input", { type: "number", step: 0.01, value: rule.rhs[1], class: "num" });
    lo.addEventListener("input", () => { rule.rhs[0] = +lo.value; onChange(); });
    hi.addEventListener("input", () => { rule.rhs[1] = +hi.value; onChange(); });
    rhsEls = el("span", { class: "rhs2" }, [lo, "…", hi]);
  } else {
    const n = el("input", { type: "number", step: 0.01, value: Array.isArray(rule.rhs) ? 0 : rule.rhs, class: "num" });
    n.addEventListener("input", () => { rule.rhs = +n.value; onChange(); });
    rhsEls = n;
  }
  const hard = el("input", { type: "checkbox", checked: rule.hard ? "checked" : null });
  hard.addEventListener("change", () => { rule.hard = hard.checked; onChange(); });
  const del = el("button", { class: "del", title: "delete", onclick: () => { ruleset.rules = ruleset.rules.filter((r) => r !== rule); onChange(true); } }, "✕");
  const dot = el("span", { class: "dot", "data-rid": rule.id });
  return el("div", { class: "rule", "data-rid": rule.id }, [
    dot, sel, op, rhsEls,
    el("label", { class: "hardlbl", title: "must-pass" }, [hard, "hard"]),
    del,
  ]);
}

// Update pass/fail dots + score without rebuilding inputs (keeps focus).
export function paintResults(rulesContainer, scoreEl, evaluation) {
  if (!evaluation) return;
  for (const res of evaluation.results) {
    const dot = rulesContainer.querySelector(`.dot[data-rid="${res.id}"]`);
    if (dot) { dot.classList.toggle("ok", res.ok); dot.classList.toggle("bad", !res.ok); dot.title = res.value == null ? "no value" : `value ${fmt(res.value)} · margin ${fmt(res.margin)}`; }
  }
  const pct = Math.round(evaluation.score * 100);
  scoreEl.innerHTML = "";
  scoreEl.append(
    el("span", { class: "scorepct " + (evaluation.hardPass ? "ok" : "bad") }, `${pct}%`),
    el("span", { class: "scoresub" }, `${evaluation.passCount}/${evaluation.total} rules · ${evaluation.hardPass ? "all hard-rules pass" : "a hard-rule fails"}`),
  );
}
