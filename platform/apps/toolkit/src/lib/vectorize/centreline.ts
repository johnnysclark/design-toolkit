// Centreline tracing — the architect's case: a Make2D dump or a pen sketch where
// every line should become ONE editable path down the middle of the stroke, not
// a thin closed outline around it. We skeletonise the ink to a 1px-wide medial
// axis (Zhang–Suen thinning) and walk that skeleton into polylines.

import type { Pt } from "./types";
import { polylineLength } from "./simplify";

// Zhang–Suen iterative thinning. Returns a 1px skeleton (1 = on). Classic two
// sub-iteration rule set; repeats until a full pass removes nothing.
export function thinZhangSuen(src: Uint8Array, w: number, h: number): Uint8Array {
  const img = src.slice();
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]);
  const toClear = new Int32Array(w * h);
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      let nClear = 0;
      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
          if (img[row + x] !== 1) continue;
          const p2 = at(x, y - 1);
          const p3 = at(x + 1, y - 1);
          const p4 = at(x + 1, y);
          const p5 = at(x + 1, y + 1);
          const p6 = at(x, y + 1);
          const p7 = at(x - 1, y + 1);
          const p8 = at(x - 1, y);
          const p9 = at(x - 1, y - 1);
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          let A = 0;
          if (p2 === 0 && p3 === 1) A++;
          if (p3 === 0 && p4 === 1) A++;
          if (p4 === 0 && p5 === 1) A++;
          if (p5 === 0 && p6 === 1) A++;
          if (p6 === 0 && p7 === 1) A++;
          if (p7 === 0 && p8 === 1) A++;
          if (p8 === 0 && p9 === 1) A++;
          if (p9 === 0 && p2 === 1) A++;
          if (A !== 1) continue;
          if (step === 0) {
            if (p2 * p4 * p6 !== 0) continue;
            if (p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0) continue;
            if (p2 * p6 * p8 !== 0) continue;
          }
          toClear[nClear++] = row + x;
        }
      }
      if (nClear > 0) {
        changed = true;
        for (let i = 0; i < nClear; i++) img[toClear[i]] = 0;
      }
    }
  }
  return img;
}

const NB: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0]
];

// Walk a 1px skeleton into polylines. Branches run between nodes (endpoints with
// one neighbour, junctions with three+); leftover all-degree-2 rings are emitted
// as closed loops. Each undirected pixel-step is consumed once. Spurs and short
// loops below `minLen` are dropped.
export function skeletonPaths(skel: Uint8Array, w: number, h: number, minLen: number): Pt[][] {
  const N = w * h;
  const idx = (x: number, y: number): number => y * w + x;
  const fg = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && skel[idx(x, y)] === 1;

  const deg = new Uint8Array(N);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (skel[idx(x, y)] !== 1) continue;
      let d = 0;
      for (const [dx, dy] of NB) if (fg(x + dx, y + dy)) d++;
      deg[idx(x, y)] = d;
    }
  }

  const used = new Set<number>(); // undirected edges: min*N + max
  const ekey = (a: number, b: number): number => (a < b ? a * N + b : b * N + a);
  const paths: Pt[][] = [];

  // Trace from `(sx,sy)` along one of its unused incident edges until the next
  // node (or, for a ring, back to the start). `stopAtStart` closes pure loops.
  const trace = (sx: number, sy: number, nx0: number, ny0: number): Pt[] => {
    const pts: Pt[] = [{ x: sx, y: sy }];
    let px = sx;
    let py = sy;
    let cx = nx0;
    let cy = ny0;
    used.add(ekey(idx(px, py), idx(cx, cy)));
    pts.push({ x: cx, y: cy });
    while (deg[idx(cx, cy)] === 2) {
      let nextX = -1;
      let nextY = -1;
      for (const [dx, dy] of NB) {
        const ax = cx + dx;
        const ay = cy + dy;
        if (!fg(ax, ay)) continue;
        if (ax === px && ay === py) continue;
        const k = ekey(idx(cx, cy), idx(ax, ay));
        if (used.has(k)) continue;
        used.add(k);
        nextX = ax;
        nextY = ay;
        break;
      }
      if (nextX < 0) break; // ring closed back onto a used edge, or dead end
      px = cx;
      py = cy;
      cx = nextX;
      cy = nextY;
      pts.push({ x: cx, y: cy });
    }
    return pts;
  };

  // Branches first, seeded from every node (degree ≠ 2).
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y);
      if (skel[p] !== 1 || deg[p] === 2) continue;
      for (const [dx, dy] of NB) {
        const nx = x + dx;
        const ny = y + dy;
        if (!fg(nx, ny)) continue;
        if (used.has(ekey(p, idx(nx, ny)))) continue;
        paths.push(trace(x, y, nx, ny));
      }
    }
  }

  // Pure loops (all degree 2) with no incident node — emit whatever edges remain.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y);
      if (skel[p] !== 1 || deg[p] !== 2) continue;
      for (const [dx, dy] of NB) {
        const nx = x + dx;
        const ny = y + dy;
        if (!fg(nx, ny)) continue;
        if (used.has(ekey(p, idx(nx, ny)))) continue;
        paths.push(trace(x, y, nx, ny));
        break;
      }
    }
  }

  const out: Pt[][] = [];
  for (const p of paths) {
    if (p.length >= 2 && polylineLength(p) >= minLen) out.push(p);
  }
  return out;
}
