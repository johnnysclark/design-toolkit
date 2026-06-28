// Curve fitting — turn a simplified polyline into SVG commands. With smoothing
// off you get straight segments; with smoothing on, a corner-aware Catmull-Rom
// → cubic-Bézier spline: smooth where the line flows, but sharp corners (turns
// past the corner-angle threshold) stay as hard joints.

import type { Cmd, Pt } from "./types";

// Exterior turn angle (radians) at b for the path a→b→c. 0 = dead straight,
// π = a full hairpin reversal.
function turn(a: Pt, b: Pt, c: Pt): number {
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const l1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const l2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (l1 === 0 || l2 === 0) return 0;
  let cos = (v1x * v2x + v1y * v2y) / (l1 * l2);
  if (cos > 1) cos = 1;
  else if (cos < -1) cos = -1;
  return Math.acos(cos);
}

function dedup(pts: Pt[], closed: boolean): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
  }
  if (closed && out.length > 1) {
    const f = out[0];
    const l = out[out.length - 1];
    if (f.x === l.x && f.y === l.y) out.pop();
  }
  return out;
}

function straight(P: Pt[], closed: boolean): Cmd[] {
  const cmds: Cmd[] = [{ c: "M", x: P[0].x, y: P[0].y }];
  for (let i = 1; i < P.length; i++) cmds.push({ c: "L", x: P[i].x, y: P[i].y });
  if (closed) cmds.push({ c: "Z" });
  return cmds;
}

// Append cubic Béziers for an OPEN run (the current point is assumed to already
// be run[0], placed by a prior M or the previous run). Uniform Catmull-Rom
// tangents, scaled by `smooth`; endpoints use a one-sided tangent so the curve
// leaves/arrives along the segment (meets corners cleanly).
function appendRun(cmds: Cmd[], run: Pt[], smooth: number): void {
  const m = run.length;
  if (m < 2) return;
  if (m === 2) {
    cmds.push({ c: "L", x: run[1].x, y: run[1].y });
    return;
  }
  const tx: number[] = new Array(m);
  const ty: number[] = new Array(m);
  for (let i = 0; i < m; i++) {
    const prev = run[i === 0 ? 0 : i - 1];
    const next = run[i === m - 1 ? m - 1 : i + 1];
    tx[i] = (next.x - prev.x) * 0.5 * smooth;
    ty[i] = (next.y - prev.y) * 0.5 * smooth;
  }
  for (let i = 0; i < m - 1; i++) {
    const p0 = run[i];
    const p1 = run[i + 1];
    cmds.push({
      c: "C",
      x1: p0.x + tx[i] / 3,
      y1: p0.y + ty[i] / 3,
      x2: p1.x - tx[i + 1] / 3,
      y2: p1.y - ty[i + 1] / 3,
      x: p1.x,
      y: p1.y
    });
  }
}

// A fully smooth, corner-free closed ring → a closed Catmull-Rom spline.
function closedSpline(P: Pt[], smooth: number): Cmd[] {
  const n = P.length;
  const cmds: Cmd[] = [{ c: "M", x: P[0].x, y: P[0].y }];
  const tan = (i: number) => {
    const prev = P[(i - 1 + n) % n];
    const next = P[(i + 1) % n];
    return { x: (next.x - prev.x) * 0.5 * smooth, y: (next.y - prev.y) * 0.5 * smooth };
  };
  for (let i = 0; i < n; i++) {
    const p0 = P[i];
    const p1 = P[(i + 1) % n];
    const t0 = tan(i);
    const t1 = tan((i + 1) % n);
    cmds.push({
      c: "C",
      x1: p0.x + t0.x / 3,
      y1: p0.y + t0.y / 3,
      x2: p1.x - t1.x / 3,
      y2: p1.y - t1.y / 3,
      x: p1.x,
      y: p1.y
    });
  }
  cmds.push({ c: "Z" });
  return cmds;
}

function sliceCyclic(P: Pt[], start: number, end: number): Pt[] {
  const n = P.length;
  const len = ((end - start + n) % n) + 1;
  const out: Pt[] = [];
  for (let k = 0; k < len; k++) out.push(P[(start + k) % n]);
  return out;
}

export function fitPath(pts: Pt[], closed: boolean, smooth: number, cornerRad: number): Cmd[] {
  const P = dedup(pts, closed);
  const n = P.length;
  if (n === 0) return [];
  if (n === 1) return [{ c: "M", x: P[0].x, y: P[0].y }];
  if (smooth <= 0 || n === 2) return straight(P, closed);

  const isCorner = (i: number): boolean => {
    if (!closed && (i === 0 || i === n - 1)) return true;
    const a = P[(i - 1 + n) % n];
    const b = P[i];
    const c = P[(i + 1) % n];
    return turn(a, b, c) > cornerRad;
  };

  const corners: number[] = [];
  for (let i = 0; i < n; i++) if (isCorner(i)) corners.push(i);

  if (closed) {
    if (corners.length === 0) return closedSpline(P, smooth);
    const cmds: Cmd[] = [{ c: "M", x: P[corners[0]].x, y: P[corners[0]].y }];
    for (let ci = 0; ci < corners.length; ci++) {
      const run = sliceCyclic(P, corners[ci], corners[(ci + 1) % corners.length]);
      appendRun(cmds, run, smooth);
    }
    cmds.push({ c: "Z" });
    return cmds;
  }

  // Open: corners[] always starts with 0 and ends with n-1.
  const cmds: Cmd[] = [{ c: "M", x: P[0].x, y: P[0].y }];
  for (let ci = 0; ci < corners.length - 1; ci++) {
    appendRun(cmds, P.slice(corners[ci], corners[ci + 1] + 1), smooth);
  }
  return cmds;
}

// Flatten a command list to a polyline (cubics sampled at `steps`) — used by the
// DXF exporter and for node/length stats.
export function flattenCmds(cmds: Cmd[], steps: number): Pt[] {
  const pts: Pt[] = [];
  let cx = 0;
  let cy = 0;
  for (const c of cmds) {
    if (c.c === "M") {
      cx = c.x;
      cy = c.y;
      pts.push({ x: cx, y: cy });
    } else if (c.c === "L") {
      cx = c.x;
      cy = c.y;
      pts.push({ x: cx, y: cy });
    } else if (c.c === "C") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const a = mt * mt * mt;
        const b = 3 * mt * mt * t;
        const d = 3 * mt * t * t;
        const e = t * t * t;
        pts.push({
          x: a * cx + b * c.x1 + d * c.x2 + e * c.x,
          y: a * cy + b * c.y1 + d * c.y2 + e * c.y
        });
      }
      cx = c.x;
      cy = c.y;
    }
    // "Z" — closure is carried by the SubPath.closed flag.
  }
  return pts;
}
