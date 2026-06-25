// ui.js (v2) — control panel (nested params + display), live metrics dashboard,
// and the rule builder. Pure view layer over the state object app.js owns.
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
  const a = Math.abs(x);
  const s = a >= 100 ? x.toFixed(0) : a >= 10 ? x.toFixed(1) : a >= 1 ? x.toFixed(2) : x.toFixed(3);
  return u ? `${s} ${u}` : s;
};

function slider(obj, key, label, min, max, step, onChange) {
  const range = el("input", { type: "range", min, max, step, value: obj[key] });
  const num = el("input", { type: "number", min, max, step, value: obj[key], class: "num" });
  const sync = (v) => { v = Math.max(min, Math.min(max, +v)); obj[key] = v; range.value = v; num.value = v; onChange(); };
  range.addEventListener("input", () => sync(range.value));
  num.addEventListener("input", () => sync(num.value));
  return el("label", { class: "slider" }, [el("span", { class: "slk" }, label), range, num]);
}

function selectRow(obj, key, label, options, onChange) {
  const sel = el("select", { class: "dispsel", onchange: (e) => { obj[key] = e.target.value; onChange(); } },
    options.map(([v, t]) => el("option", { value: v, selected: v === obj[key] ? "selected" : null }, t)));
  return el("label", { class: "slider" }, [el("span", { class: "slk" }, label), sel]);
}

// group -> [obj-path, [ [key,label,min,max,step], ... ] ]
const GROUPS = (state) => [
  ["Plinth (floor slab)", state.params.plinth, [["cx", "centre X", -6, 6, 0.1], ["cy", "centre Y", -6, 6, 0.1], ["W", "width", 2, 20, 0.1], ["L", "length", 2, 24, 0.1], ["R", "rotation°", -45, 45, 1], ["t", "thickness", 0.1, 2, 0.05]]],
  ["Walls (tube)", state.params.walls, [["cx", "centre X", -6, 6, 0.1], ["cy", "centre Y", -6, 6, 0.1], ["W", "width", 2, 16, 0.1], ["L", "length", 2, 18, 0.1], ["R", "rotation°", -45, 45, 1], ["h", "height", 2, 6, 0.05], ["wt", "wall thick", 0.1, 0.6, 0.02]]],
  ["Roof (overhang)", state.params.roof, [["cx", "centre X", -6, 6, 0.1], ["cy", "centre Y", -6, 6, 0.1], ["W", "width", 2, 18, 0.1], ["L", "length", 2, 20, 0.1], ["R", "rotation°", -90, 90, 1], ["ridgeRise", "ridge rise", 0, 5, 0.05], ["pitchL", "pitch L°", -45, 60, 1], ["pitchR", "pitch R°", -45, 60, 1], ["ridgePos", "ridge shift", -1, 1, 0.05], ["t", "thickness", 0.1, 0.8, 0.02]]],
];
const SITE = (state) => [["latitude", "latitude°", -60, 70, 0.5], ["longitude", "longitude°", -180, 180, 0.5], ["northAngle", "north°", -180, 180, 1], ["windFromAz", "wind from°", 0, 360, 1], ["windSpeed", "wind m/s", 0, 25, 0.5], ["deltaT", "ΔT °K", 0, 20, 0.5], ["viewTargetAz", "view az°", 0, 360, 1], ["eyeHeight", "eye ht", 1, 2, 0.05]].map((r) => [state.site, ...r]);
const TERR = (state) => [["plateauZ", "ground z", -3, 2, 0.1], ["ravineDepth", "ravine depth", 0, 15, 0.5], ["ravineEdge", "ravine edge", -4, 15, 0.5], ["ravineWidth", "ravine slope", 1, 12, 0.5], ["ravineAngle", "ravine dir°", -90, 90, 5], ["undAmp", "undulation", 0, 1, 0.05]].map((r) => [state.site.terrain, ...r]);

export function renderControls(container, state, cb) {
  container.innerHTML = "";
  // display
  container.append(el("h4", {}, "Display"));
  container.append(selectRow(state.display, "analysisField", "overlay", [["solarNow", "Solar — sun now"], ["solarYear", "Solar — yearly"], ["wind", "Wind — windward"]], cb.display));
  container.append(slider(state.display, "shadowIntensity", "shadow", 0, 1, 0.05, cb.display));
  container.append(slider(state.display, "sunHour", "sun hour", 5, 19, 0.25, cb.display));
  // form
  for (const [title, obj, rows] of GROUPS(state)) {
    container.append(el("h4", {}, title));
    for (const [k, lbl, mn, mx, st] of rows) container.append(slider(obj, k, lbl, mn, mx, st, cb.param));
  }
  container.append(el("h4", {}, "Apertures (3 walls + 1 roof)"));
  state.params.apertures.forEach((ap) => container.append(apertureRow(ap, cb.param)));
  container.append(el("h4", {}, "Site"));
  for (const [obj, k, lbl, mn, mx, st] of SITE(state)) container.append(slider(obj, k, lbl, mn, mx, st, cb.param));
  container.append(el("h4", {}, "Terrain (ravine edge)"));
  for (const [obj, k, lbl, mn, mx, st] of TERR(state)) container.append(slider(obj, k, lbl, mn, mx, st, cb.param));
}

function apertureRow(ap, onChange) {
  const opts = [...WALL_HOSTS, ...ROOF_HOSTS].map((h) => el("option", { value: h, selected: h === ap.host ? "selected" : null }, HOST_LABELS[h]));
  const host = el("select", { class: "hostsel", onchange: (e) => { ap.host = e.target.value; onChange(); } }, opts);
  const mini = (key, lbl, mn, mx, st) => {
    const n = el("input", { type: "number", min: mn, max: mx, step: st, value: ap[key], class: "num" });
    n.addEventListener("input", () => { ap[key] = +n.value; onChange(); });
    return el("label", { class: "mini" }, [el("span", {}, lbl), n]);
  };
  return el("div", { class: "apblock" }, [
    el("div", { class: "aphead" }, [el("b", {}, ap.id), host]),
    el("div", { class: "apgrid" }, [mini("u", "u", 0, 1, 0.01), mini("v", "v", 0, 1, 0.01), mini("w", "w m", 0.1, 8, 0.05), mini("h", "h m", 0.1, 5, 0.05)]),
  ]);
}

// --- dashboard --------------------------------------------------------------
const DASH = [
  ["Solar", [["solarWinterUseful", 4], ["solarSummerUseful", 4], ["overheatRatio", 3], ["solarSouth", 4]]],
  ["Wind", [["windExposure", 80], ["windPressure", 5000], ["channelIndex", 10]]],
  ["Air", [["stackIndex", 1.5], ["stackHeight", 6]]],
  ["View", [["viewQuality", 0.5], ["viewAmount", 1.2], ["skyView", 0.3]]],
  ["Earth", [["soilContactArea", 160], ["thermalMassRatio", 6], ["buriedFraction", 1]]],
  ["Form", [["enclosedVolume", 280], ["glazingRatio", 0.4], ["pitchDeg", 60]]],
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
export const newRule = () => ({ id: "R" + RID++, lhs: "solarWinterUseful", op: ">", rhs: 2, weight: 1, hard: false });

export function renderRules(container, ruleset, onChange) {
  container.innerHTML = "";
  const varOpts = VARIABLE_DEFS.map((d) => ({ v: d.key, t: `${d.label} (${d.unit})`, g: d.group }));
  ruleset.rules.forEach((rule) => container.append(ruleRow(rule, ruleset, varOpts, onChange)));
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
  return el("div", { class: "rule", "data-rid": rule.id }, [dot, sel, op, rhsEls, el("label", { class: "hardlbl", title: "must-pass" }, [hard, "hard"]), del]);
}

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
