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

// --- unit display (FEET for this tool) --------------------------------------
// State + core.js compute in METRES (SI), so the Rhino/GH export and the
// JS↔Python parity test stay valid. We convert ONLY at the display boundary so
// the architect reads and types feet (and mph / ft² / ft³).
const FT = 3.280839895, FT2 = FT * FT, FT3 = FT * FT * FT, MPH = 2.2369362921;
const CONV = {
  len: { f: FT, u: "ft" }, speed: { f: MPH, u: "mph" }, hour: { f: 1, u: "h" },
  deg: { f: 1, u: "°" }, tempK: { f: 1, u: "K" }, ratio: { f: 1, u: "" },
};
// numeric slider key -> unit kind. Dimensional keys default to length (feet);
// angles, ratios, speed and temperature are called out explicitly.
const KIND = {
  cx: "len", cy: "len", W: "len", L: "len", t: "len", h: "len", wt: "len", w: "len",
  ridgeRise: "len", eyeHeight: "len", plateauZ: "len", ravineDepth: "len", ravineEdge: "len", ravineWidth: "len",
  R: "deg", pitchL: "deg", pitchR: "deg", ravineAngle: "deg",
  latitude: "deg", longitude: "deg", northAngle: "deg", windFromAz: "deg", viewTargetAz: "deg",
  windSpeed: "speed", deltaT: "tempK", sunHour: "hour",
  ridgePos: "ratio", undAmp: "ratio", shadowIntensity: "ratio", u: "ratio", v: "ratio",
};
const conv = (key) => CONV[KIND[key] || "len"];
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const niceStep = (s) => (s >= 1 ? Math.max(1, Math.round(s)) : s >= 0.3 ? 0.25 : s >= 0.08 ? 0.1 : 0.05);
const lblOf = (label, c) => (c.u ? `${label} (${c.u})` : label);

function slider(obj, key, label, min, max, step, onChange) {
  const c = conv(key), f = c.f;
  const dmin = f === 1 ? min : r1(min * f), dmax = f === 1 ? max : r1(max * f);
  const dstep = f === 1 ? step : niceStep(step * f);
  const disp = () => r2(obj[key] * f);
  const range = el("input", { type: "range", min: dmin, max: dmax, step: dstep, value: disp() });
  const num = el("input", { type: "number", min: dmin, max: dmax, step: dstep, value: disp(), class: "num" });
  const sync = (v) => { v = Math.max(dmin, Math.min(dmax, +v)); obj[key] = v / f; range.value = v; num.value = v; onChange(); };
  range.addEventListener("input", () => sync(range.value));
  num.addEventListener("input", () => sync(num.value));
  return el("label", { class: "slider" }, [el("span", { class: "slk" }, lblOf(label, c)), range, num]);
}

function selectRow(obj, key, label, options, onChange) {
  const sel = el("select", { class: "dispsel", onchange: (e) => { obj[key] = e.target.value; onChange(); } },
    options.map(([v, t]) => el("option", { value: v, selected: v === obj[key] ? "selected" : null }, t)));
  return el("label", { class: "slider" }, [el("span", { class: "slk" }, label), sel]);
}

// group -> [obj-path, [ [key,label,min,max,step], ... ] ]  (labels carry no unit;
// the converter appends ft / ° / mph etc.)
const GROUPS = (state) => [
  ["Plinth (floor slab)", state.params.plinth, [["cx", "centre X", -6, 6, 0.1], ["cy", "centre Y", -6, 6, 0.1], ["W", "width", 2, 20, 0.1], ["L", "length", 2, 24, 0.1], ["R", "rotation", -45, 45, 1], ["t", "thickness", 0.1, 2, 0.05]]],
  ["Walls (gable)", state.params.walls, [["cx", "centre X", -6, 6, 0.1], ["cy", "centre Y", -6, 6, 0.1], ["W", "width", 2, 16, 0.1], ["L", "length", 2, 18, 0.1], ["R", "rotation", -45, 45, 1], ["h", "height", 2, 6, 0.05], ["wt", "wall thick", 0.1, 0.6, 0.02]]],
  ["Roof (overhang)", state.params.roof, [["cx", "centre X", -6, 6, 0.1], ["cy", "centre Y", -6, 6, 0.1], ["W", "width", 2, 18, 0.1], ["L", "length", 2, 20, 0.1], ["R", "rotation", -90, 90, 1], ["ridgeRise", "ridge rise", 0, 5, 0.05], ["pitchL", "pitch L", -45, 60, 1], ["pitchR", "pitch R", -45, 60, 1], ["ridgePos", "ridge shift", -1, 1, 0.05], ["t", "thickness", 0.1, 0.8, 0.02]]],
];
const TERR = (state) => [["plateauZ", "ground level", -3, 2, 0.1], ["ravineDepth", "ravine depth", 0, 15, 0.5], ["ravineEdge", "ravine edge", -4, 15, 0.5], ["ravineWidth", "ravine slope", 1, 12, 0.5], ["ravineAngle", "ravine direction", -90, 90, 5], ["undAmp", "undulation", 0, 1, 0.05]].map((r) => [state.site.terrain, ...r]);

// LANDING — environmental controls only (climate forces + the display overlay).
export function renderEnvControls(container, state, cb) {
  container.innerHTML = "";
  container.append(el("h4", {}, "Display overlay"));
  container.append(selectRow(state.display, "analysisField", "overlay", [["solarNow", "Solar — sun now"], ["solarYear", "Solar — yearly"], ["wind", "Wind — windward"]], cb.display));
  container.append(slider(state.display, "sunHour", "sun hour", 5, 19, 0.25, cb.display));
  container.append(slider(state.display, "shadowIntensity", "shadow", 0, 1, 0.05, cb.display));
  const site = state.site;
  const grp = (title, rows) => { container.append(el("h4", {}, title)); for (const [k, lbl, mn, mx, st] of rows) container.append(slider(site, k, lbl, mn, mx, st, cb.param)); };
  grp("Location & sun", [["latitude", "latitude", -60, 70, 0.5], ["longitude", "longitude", -180, 180, 0.5], ["northAngle", "north", -180, 180, 1]]);
  grp("Wind", [["windFromAz", "wind from", 0, 360, 1], ["windSpeed", "wind speed", 0, 25, 0.5]]);
  grp("Air & comfort", [["deltaT", "ΔT", 0, 20, 0.5]]);
  grp("View", [["viewTargetAz", "view azimuth", 0, 360, 1], ["eyeHeight", "eye height", 1, 2, 0.05]]);
}

// EXAMPLE WINDOW — building geometry + terrain (opens in the floating studio).
export function renderMassingControls(container, state, cb) {
  container.innerHTML = "";
  for (const [title, obj, rows] of GROUPS(state)) {
    container.append(el("h4", {}, title));
    for (const [k, lbl, mn, mx, st] of rows) container.append(slider(obj, k, lbl, mn, mx, st, cb.param));
  }
  container.append(el("h4", {}, "Apertures (3 walls + 1 roof)"));
  state.params.apertures.forEach((ap) => container.append(apertureRow(ap, cb.param)));
  container.append(el("h4", {}, "Terrain (ravine edge)"));
  for (const [obj, k, lbl, mn, mx, st] of TERR(state)) container.append(slider(obj, k, lbl, mn, mx, st, cb.param));
}

function apertureRow(ap, onChange) {
  const opts = [...WALL_HOSTS, ...ROOF_HOSTS].map((h) => el("option", { value: h, selected: h === ap.host ? "selected" : null }, HOST_LABELS[h]));
  const host = el("select", { class: "hostsel", onchange: (e) => { ap.host = e.target.value; onChange(); } }, opts);
  const mini = (key, lbl, mn, mx, st) => {
    const c = conv(key), f = c.f;
    const dmin = f === 1 ? mn : r1(mn * f), dmax = f === 1 ? mx : r1(mx * f), dstep = f === 1 ? st : niceStep(st * f);
    const n = el("input", { type: "number", min: dmin, max: dmax, step: dstep, value: r2(ap[key] * f), class: "num" });
    n.addEventListener("input", () => { ap[key] = Math.max(dmin, Math.min(dmax, +n.value)) / f; onChange(); });
    return el("label", { class: "mini" }, [el("span", {}, lblOf(lbl, c)), n]);
  };
  return el("div", { class: "apblock" }, [
    el("div", { class: "aphead" }, [el("b", {}, ap.id), host]),
    el("div", { class: "apgrid" }, [mini("u", "u", 0, 1, 0.01), mini("v", "v", 0, 1, 0.01), mini("w", "width", 0.1, 8, 0.05), mini("h", "height", 0.1, 5, 0.05)]),
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

// metric outputs convert to imperial for display (the proxies stay SI).
function toImperial(unit, val) {
  if (val === null || val === undefined || Number.isNaN(val)) return { v: val, u: unit };
  switch (unit) {
    case "m": return { v: val * FT, u: "ft" };
    case "m²": return { v: val * FT2, u: "ft²" };
    case "m³": return { v: val * FT3, u: "ft³" };
    case "1/m": return { v: val / FT, u: "1/ft" };
    default: return { v: val, u: unit };
  }
}

// plain-English "what is this stat?" for the hover popups.
const DESCRIPTIONS = {
  solarWinterUseful: "Useful winter sun landing on the glazing (low-sun season, summed over the apertures). Higher = more free winter heating.",
  solarSummerUseful: "Summer sun on the glazing. You usually want this LOW so the building doesn't overheat.",
  overheatRatio: "Summer ÷ winter aperture gain. Above 1 means more sun in summer than winter — an overheating warning.",
  solarSouth: "Aperture gain on south-facing glass (135–225° azimuth) — the passive-solar sweet spot.",
  windExposure: "Windward area facing the wind (vertical faces only). Bigger = more wind pressure to resist.",
  windPressure: "Wind load proxy ½·ρ·V²·exposure. It grows with the SQUARE of wind speed, so doubling wind ≈ 4× load.",
  channelIndex: "How much the gap between the walls and the plinth pinches the across-wind flow (a venturi cue). Higher = more channelling.",
  stackIndex: "Buoyancy-driven natural ventilation from low inlets up to high outlets. Higher = stronger stack effect.",
  stackHeight: "Vertical distance between the average inlet and outlet aperture — the stack's driving height.",
  viewQuality: "View openness weighted toward your target azimuth — how much the windows actually look where you want.",
  viewAmount: "Total view openness from an interior eye point (solid angle through all the wall windows).",
  skyView: "Upward view through the roof skylight — daylight and sky access.",
  soilContactArea: "Plinth area sitting below the ground line — earth-coupling / thermal contact with the soil.",
  thermalMassRatio: "Concrete slab heat capacity ÷ enclosed air volume — how much thermal mass per unit of interior.",
  buriedFraction: "Fraction of the plinth thickness that is below grade (0 = on top of the ground, 1 = fully buried).",
  enclosedVolume: "Interior air volume (walls plus the roof void).",
  glazingRatio: "Glazed area ÷ total envelope area.",
  pitchDeg: "Average roof pitch across the left and right slopes.",
};

// a single floating tooltip, positioned at the cursor — never clipped by panels.
let _tip;
function floatTip() {
  if (!_tip) { _tip = el("div", { class: "floattip" }); document.body.append(_tip); }
  return _tip;
}
function attachTip(node, text) {
  node.classList.add("hastip");
  node.addEventListener("mouseenter", () => { const t = floatTip(); t.textContent = text; t.style.display = "block"; });
  node.addEventListener("mousemove", (e) => {
    const t = floatTip(), pad = 14, w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > innerHeight - 8) y = e.clientY - h - pad;
    t.style.left = Math.max(8, x) + "px"; t.style.top = Math.max(8, y) + "px";
  });
  node.addEventListener("mouseleave", () => { if (_tip) _tip.style.display = "none"; });
}

export function renderDashboard(container, metrics) {
  container.innerHTML = "";
  for (const [group, rows] of DASH) {
    const wrap = el("div", { class: "dgroup" }, [el("h4", {}, group)]);
    for (const [key, soft] of rows) {
      const d = DEF[key] || { label: key, unit: "" };
      const val = metrics[key];
      const pct = Math.max(0, Math.min(1, (val || 0) / soft)) * 100;
      const imp = toImperial(d.unit, val);
      const metric = el("div", { class: "metric" }, [
        el("div", { class: "mtop" }, [el("span", { class: "mlbl" }, d.label), el("span", { class: "mval" }, fmt(imp.v, imp.u))]),
        el("div", { class: "bar" }, [el("div", { class: "barfill", style: `width:${pct}%` })]),
      ]);
      if (DESCRIPTIONS[key]) attachTip(metric, DESCRIPTIONS[key]);
      wrap.append(metric);
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
