// units.js (v2) — IMPERIAL display layer (feet & inches).
//
// The engine (core.js) and all stored state compute in METRES / SI so the
// JS↔Python parity test and the Rhino export stay valid. We convert ONLY at the
// display boundary so the architect reads and types feet-and-inches, ft², ft³,
// mph — never metres.

export const FT = 3.280839895, FT2 = FT * FT, FT3 = FT * FT * FT, MPH = 2.2369362921;

// metres → "10′ 6″" (feet and whole inches; rounds to the nearest inch)
export function feetInches(m) {
  if (m == null || Number.isNaN(m)) return "—";
  const neg = m < 0;
  let totalIn = Math.round(Math.abs(m) * FT * 12);
  let ft = Math.floor(totalIn / 12), inch = totalIn - ft * 12;
  return `${neg ? "−" : ""}${ft}′ ${inch}″`;
}
// metres → decimal feet number (for slider ranges)
export const toFt = (m) => m * FT;
export const fromFt = (ft) => ft / FT;
const r2 = (x) => Math.round(x * 100) / 100;

// Convert a metric OUTPUT (with its SI unit string from VARIABLE_DEFS) to imperial
// for display. Returns {v, u}. Non-dimensional units (idx, °, ×, sr, 0–1, K, MJ…)
// pass through unchanged.
export function imp(unit, val) {
  if (val == null || Number.isNaN(val)) return { v: val, u: unit };
  switch (unit) {
    case "m": return { v: val * FT, u: "ft" };
    case "m²": return { v: val * FT2, u: "ft²" };
    case "m³": return { v: val * FT3, u: "ft³" };
    case "1/m": return { v: val / FT, u: "1/ft" };
    case "m/s": return { v: val * MPH, u: "mph" };
    default: return { v: val, u: unit };
  }
}

// Format a metric value+unit for a readout, e.g. "1,240 ft²" or "0.42".
export function fmtMetricImp(unit, val) {
  if (val == null || Number.isNaN(val)) return "—";
  if (unit === "m") return feetInches(val);            // lengths read as feet-inches
  const { v, u } = imp(unit, val);
  const a = Math.abs(v);
  const s = a >= 100 ? Math.round(v).toLocaleString() : a >= 1 ? r2(v).toString() : (Math.round(v * 1000) / 1000).toString();
  return u && u !== "0–1" ? `${s} ${u}` : s;
}

// Like imp() but returns the multiplier {f, u} — for editable fields (charter
// thresholds) where we display value×f and store input/f back as SI.
export function impConv(unit) {
  switch (unit) {
    case "m": return { f: FT, u: "ft" };
    case "m²": return { f: FT2, u: "ft²" };
    case "m³": return { f: FT3, u: "ft³" };
    case "1/m": return { f: 1 / FT, u: "1/ft" };
    case "m/s": return { f: MPH, u: "mph" };
    default: return { f: 1, u: unit };
  }
}
export const cToF = (c) => (c == null || Number.isNaN(c) ? c : c * 9 / 5 + 32);

// SLIDER conversion. Given a spec {unit}, return how to operate the slider:
//  - length ("m"): operate in decimal FEET, label as feet-inches.
//  - everything else (°, ratio, m/s shown as mph?): operate in the native value.
// Returns { toDisp(siVal), fromDisp(dispVal), dmin, dmax, dstep, label(siVal) }.
export function sliderUnit(spec) {
  if (spec.unit === "m") {
    const step = spec.step * FT;
    const dstep = step >= 1 ? Math.max(0.5, Math.round(step * 2) / 2) : step >= 0.4 ? 0.25 : step >= 0.15 ? 0.125 : 0.0625; // ½, ¼, ⅛, 1/16 ft
    return {
      toDisp: (m) => Math.round(m * FT / dstep) * dstep,
      fromDisp: (ft) => ft / FT,
      dmin: Math.round(spec.min * FT * 100) / 100, dmax: Math.round(spec.max * FT * 100) / 100, dstep,
      label: (m) => feetInches(m), unit: "ft",
    };
  }
  if (spec.unit === "m/s") {
    return { toDisp: (v) => Math.round(v * MPH * 10) / 10, fromDisp: (v) => v / MPH,
      dmin: r2(spec.min * MPH), dmax: r2(spec.max * MPH), dstep: Math.max(0.5, r2(spec.step * MPH)),
      label: (v) => `${r2(v * MPH)} mph`, unit: "mph" };
  }
  // native (degrees, ratios, az): operate on the stored value directly
  return { toDisp: (v) => v, fromDisp: (v) => v, dmin: spec.min, dmax: spec.max, dstep: spec.step,
    label: (v) => `${r2(v)}${spec.unit ? " " + spec.unit : ""}`, unit: spec.unit || "" };
}
