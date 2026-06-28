// charts.js (v3) — hand-built SVG views of the Pareto front. No charting library,
// matching the tool's dependency-free ethos. Dominated vs front is encoded by
// opacity + accent (not grey) to honor the all-text-black rule.
//
//   · scatter            — 2 objectives: objective-space scatter, front highlighted
//   · parallel           — ≥3 objectives: parallel coordinates (Wallacei's signature) + brushing
//   · renderConvergence  — front size & feasibility over generations
//   · kneePoint          — the suggested compromise (nearest the ideal corner)

const NS = "http://www.w3.org/2000/svg";
function s(tag, attrs, ...kids) {
  const e = document.createElementNS(NS, tag);
  for (const k in (attrs || {})) { const v = attrs[k]; if (v == null || v === false) continue; if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
  for (const kid of kids.flat()) { if (kid == null || kid === false) continue; e.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return e;
}
const fmt = (v) => { const a = Math.abs(v); return a >= 100 ? Math.round(v).toString() : a >= 1 ? (Math.round(v * 100) / 100).toString() : (Math.round(v * 1000) / 1000).toString(); };
const betterArrow = (dir, axis) => axis === "x" ? (dir === "max" ? "→" : "←") : (dir === "max" ? "↑" : "↓");

// The suggested compromise: front point nearest the ideal corner (per-objective
// normalized, "better" mapped to 1). Pure — also used for the spawn suggestion.
export function kneePoint(front, dirs) {
  if (!front || !front.length) return null;
  const M = dirs.length, lo = Array(M).fill(Infinity), hi = Array(M).fill(-Infinity);
  for (const p of front) for (let k = 0; k < M; k++) { lo[k] = Math.min(lo[k], p.objectives[k]); hi[k] = Math.max(hi[k], p.objectives[k]); }
  let best = front[0], bd = Infinity;
  for (const p of front) {
    let d = 0;
    for (let k = 0; k < M; k++) { const r = (hi[k] - lo[k]) || 1; let t = (p.objectives[k] - lo[k]) / r; if (dirs[k] === "max") t = 1 - t; d += t * t; }
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

const elDiv = (txt) => { const d = document.createElement("div"); d.className = "chart-empty"; d.textContent = txt; return d; };

export function renderFront(container, result, objMeta, handlers = {}) {
  container.replaceChildren();
  const M = objMeta.length;
  if (!result || !result.population || !result.population.length) { container.append(elDiv("Run the optimizer to populate the front.")); return; }
  if (M <= 1) { container.append(elDiv("Single objective — watch the convergence trace below. Add a second objective for a Pareto front.")); return; }
  const svg = s("svg", { viewBox: "0 0 360 300", preserveAspectRatio: "xMidYMid meet" });
  const dirs = objMeta.map((o) => o.dir);
  const knee = kneePoint(result.front, dirs);
  if (M === 2) scatter(svg, result, objMeta, knee, handlers);
  else parallel(svg, result, objMeta, knee, handlers);
  container.append(svg);
}

// ---- 2-objective scatter ---------------------------------------------------
function scatter(svg, result, objMeta, knee, h) {
  const W = 360, H = 300, mL = 50, mR = 16, mT = 26, mB = 46;
  const x0 = mL, x1 = W - mR, yb = H - mB, yt = mT;
  const pop = result.population, front = result.front;
  const ext = (k) => { let lo = Infinity, hi = -Infinity; for (const p of pop) { const v = p.objectives[k]; if (v < lo) lo = v; if (v > hi) hi = v; } if (!(hi > lo)) { lo -= 1; hi += 1; } return [lo, hi]; };
  const [ax0, ax1] = ext(0), [ay0, ay1] = ext(1);
  const sx = (v) => x0 + (v - ax0) / (ax1 - ax0) * (x1 - x0);
  const sy = (v) => yb - (v - ay0) / (ay1 - ay0) * (yb - yt);

  // grid + frame
  for (let i = 0; i <= 4; i++) {
    const gx = x0 + i / 4 * (x1 - x0), gy = yb - i / 4 * (yb - yt);
    svg.append(s("line", { class: "gridline", x1: gx, y1: yt, x2: gx, y2: yb }));
    svg.append(s("line", { class: "gridline", x1: x0, y1: gy, x2: x1, y2: gy }));
  }
  svg.append(s("line", { class: "axis", x1: x0, y1: yb, x2: x1, y2: yb }));
  svg.append(s("line", { class: "axis", x1: x0, y1: yt, x2: x0, y2: yb }));
  // axis tick labels (min/max)
  svg.append(s("text", { class: "axlabel small", x: x0, y: yb + 12 }, fmt(ax0)));
  svg.append(s("text", { class: "axlabel small", x: x1, y: yb + 12, "text-anchor": "end" }, fmt(ax1)));
  svg.append(s("text", { class: "axlabel small", x: x0 - 4, y: yb, "text-anchor": "end" }, fmt(ay0)));
  svg.append(s("text", { class: "axlabel small", x: x0 - 4, y: yt + 8, "text-anchor": "end" }, fmt(ay1)));
  // axis titles + better arrows
  svg.append(s("text", { class: "axlabel", x: (x0 + x1) / 2, y: H - 6, "text-anchor": "middle" },
    `${objMeta[0].label}${objMeta[0].unit ? " (" + objMeta[0].unit + ")" : ""} — better ${betterArrow(objMeta[0].dir, "x")}`));
  svg.append(s("text", { class: "axlabel", x: 13, y: (yt + yb) / 2, "text-anchor": "middle", transform: `rotate(-90 13 ${(yt + yb) / 2})` },
    `${objMeta[1].label}${objMeta[1].unit ? " (" + objMeta[1].unit + ")" : ""} — better ${betterArrow(objMeta[1].dir, "y")}`));
  if (objMeta.tension) svg.append(s("text", { class: "tensiontag", x: (x0 + x1) / 2, y: yt - 8, "text-anchor": "middle" }, "⚔ " + objMeta.tension));

  // dominated population
  for (const p of pop) if (p.rank !== 0) svg.append(s("circle", { class: "pt", cx: sx(p.objectives[0]), cy: sy(p.objectives[1]), r: 2.4 }));
  // front polyline (sorted by objective 0)
  const fsorted = front.slice().sort((a, b) => a.objectives[0] - b.objectives[0]);
  if (fsorted.length > 1) svg.append(s("polyline", { class: "frontline", points: fsorted.map((p) => `${sx(p.objectives[0])},${sy(p.objectives[1])}`).join(" ") }));
  // front points (interactive)
  for (const p of front) {
    const c = s("circle", { class: "pt-front", cx: sx(p.objectives[0]), cy: sy(p.objectives[1]), r: 3.6,
      onpointerenter: () => h.onHover && h.onHover(p), onpointerleave: () => h.onHover && h.onHover(null), onclick: () => h.onSelect && h.onSelect(p) });
    svg.append(c);
  }
  if (knee) svg.append(s("circle", { class: "pt-knee", cx: sx(knee.objectives[0]), cy: sy(knee.objectives[1]), r: 6, onclick: () => h.onSelect && h.onSelect(knee) }));
  if (h.selected) svg.append(s("circle", { class: "pt-sel", cx: sx(h.selected.objectives[0]), cy: sy(h.selected.objectives[1]), r: 4 }));
  if (knee) svg.append(s("text", { class: "axlabel small", x: sx(knee.objectives[0]) + 8, y: sy(knee.objectives[1]) - 6 }, "suggested"));
}

// ---- parallel coordinates (≥3 objectives) + brushing -----------------------
function parallel(svg, result, objMeta, knee, h) {
  const W = 360, H = 300, mL = 28, mR = 28, mT = 40, mB = 52;
  const M = objMeta.length, yt = mT, yb = H - mB;
  const axX = (j) => mL + (M === 1 ? 0 : j * (W - mL - mR) / (M - 1));
  const pop = result.population;
  const ext = objMeta.map((_, k) => { let lo = Infinity, hi = -Infinity; for (const p of pop) { const v = p.objectives[k]; if (v < lo) lo = v; if (v > hi) hi = v; } if (!(hi > lo)) { lo -= 1; hi += 1; } return [lo, hi]; });
  // normalized so "up = better" on every axis
  const norm = (v, k) => { let t = (v - ext[k][0]) / (ext[k][1] - ext[k][0]); if (objMeta[k].dir === "min") t = 1 - t; return t; };
  const yOf = (t) => yb - t * (yb - yt);

  // axes + labels
  for (let j = 0; j < M; j++) {
    const ax = axX(j);
    svg.append(s("line", { class: "pcaxis", x1: ax, y1: yt, x2: ax, y2: yb }));
    svg.append(s("text", { class: "axlabel small", x: ax, y: yt - 12, "text-anchor": "middle" }, "▲ better"));
    svg.append(s("text", { class: "axlabel small", x: ax, y: yt - 3, "text-anchor": "middle" }, fmt(objMeta[j].dir === "max" ? ext[j][1] : ext[j][0])));
    svg.append(s("text", { class: "axlabel small", x: ax, y: yb + 11, "text-anchor": "middle" }, fmt(objMeta[j].dir === "max" ? ext[j][0] : ext[j][1])));
    const lab = objMeta[j].label.length > 14 ? objMeta[j].label.slice(0, 13) + "…" : objMeta[j].label;
    svg.append(s("text", { class: "axlabel", x: ax, y: yb + 24, "text-anchor": "middle" }, lab));
    if (objMeta[j].unit) svg.append(s("text", { class: "axlabel small", x: ax, y: yb + 34, "text-anchor": "middle" }, objMeta[j].unit));
  }

  const lineEls = []; // { el, vals:[normalized per axis] }
  const ptsOf = (p) => objMeta.map((_, k) => `${axX(k)},${yOf(norm(p.objectives[k], k))}`).join(" ");
  for (const p of pop) if (p.rank !== 0) {
    const el = s("polyline", { class: "pcline", points: ptsOf(p) });
    svg.append(el); lineEls.push({ el, vals: objMeta.map((_, k) => norm(p.objectives[k], k)) });
  }
  for (const p of result.front) {
    const el = s("polyline", { class: "pcline-front", points: ptsOf(p),
      onpointerenter: () => h.onHover && h.onHover(p), onpointerleave: () => h.onHover && h.onHover(null), onclick: () => h.onSelect && h.onSelect(p) });
    svg.append(el); lineEls.push({ el, vals: objMeta.map((_, k) => norm(p.objectives[k], k)), front: true });
  }
  if (knee) svg.append(s("polyline", { class: "pcline-front", points: ptsOf(knee), style: "stroke-width:2.4;opacity:1" }));

  // ---- brushing: drag on an axis to keep a normalized band; double-click clears
  const brushes = new Array(M).fill(null);
  const applyBrush = () => {
    const active = brushes.some(Boolean);
    for (const L of lineEls) {
      const keep = !active || brushes.every((b, k) => !b || (L.vals[k] >= b[0] && L.vals[k] <= b[1]));
      L.el.classList.toggle("pcline-dim", !keep);
    }
  };
  for (let j = 0; j < M; j++) {
    const ax = axX(j);
    const zone = s("rect", { x: ax - 9, y: yt, width: 18, height: yb - yt, fill: "transparent", style: "cursor:ns-resize", ondblclick: () => { brushes[j] = null; band.setAttribute("display", "none"); applyBrush(); } });
    const band = s("rect", { class: "pcbrush", x: ax - 7, width: 14, display: "none" });
    let startY = null;
    const toN = (clientY) => { const r = svg.getBoundingClientRect(); const vy = (clientY - r.top) / r.height * H; return Math.max(0, Math.min(1, (yb - vy) / (yb - yt))); };
    zone.addEventListener("pointerdown", (e) => { startY = e.clientY; zone.setPointerCapture(e.pointerId); });
    zone.addEventListener("pointermove", (e) => {
      if (startY == null) return;
      const a = toN(startY), b = toN(e.clientY), lo = Math.min(a, b), hi = Math.max(a, b);
      band.setAttribute("display", ""); band.setAttribute("y", yOf(hi)); band.setAttribute("height", Math.max(2, yOf(lo) - yOf(hi)));
    });
    zone.addEventListener("pointerup", (e) => {
      if (startY == null) return; const a = toN(startY), b = toN(e.clientY); startY = null;
      if (Math.abs(a - b) < 0.02) { brushes[j] = null; band.setAttribute("display", "none"); } else brushes[j] = [Math.min(a, b), Math.max(a, b)];
      applyBrush();
    });
    svg.append(band); svg.append(zone);
  }
}

// ---- convergence sparkline (front size + feasibility over generations) ------
export function renderConvergence(svg, history) {
  svg.replaceChildren();
  if (!history || history.length < 2) return;
  const W = 240, H = 54, m = 4;
  const n = history.length;
  const maxFront = Math.max(1, ...history.map((h) => h.frontSize));
  const x = (i) => m + i / (n - 1) * (W - 2 * m);
  const yF = (v) => H - m - (v / maxFront) * (H - 2 * m);
  const yP = (v) => H - m - v * (H - 2 * m);
  svg.append(s("polyline", { class: "cv-line", points: history.map((h, i) => `${x(i)},${yF(h.frontSize)}`).join(" ") }));
  svg.append(s("polyline", { class: "cv-line2", points: history.map((h, i) => `${x(i)},${yP(h.feasibleFraction)}`).join(" ") }));
  svg.append(s("text", { class: "axlabel small", x: m, y: 10 }, "front size"));
  svg.append(s("text", { class: "axlabel small", x: W - m, y: 10, "text-anchor": "end", style: "fill:var(--accent)" }, "feasible %"));
}
