// Outline tracing — extract the boundary of the ink region as closed loops, at
// pixel-edge resolution. Each ink pixel contributes a unit boundary edge wherever
// its neighbour is background; those directed edges are linked head-to-tail into
// closed loops (outer borders + holes). Rendered with fill-rule:evenodd, holes
// drop out automatically. No marching-squares lookup table — just the four sides
// of each pixel, which is exact and easy to reason about.

import type { Pt } from "./types";

interface Edge {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  used: boolean;
}

export function traceLoops(bin: Uint8Array, w: number, h: number): Pt[][] {
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h ? 0 : bin[y * w + x]);
  const cw = w + 1; // corner grid is (w+1) × (h+1)
  const ckey = (x: number, y: number): number => y * cw + x;

  const edgesFrom = new Map<number, Edge[]>();
  const add = (fx: number, fy: number, tx: number, ty: number): void => {
    const k = ckey(fx, fy);
    const e: Edge = { fx, fy, tx, ty, used: false };
    const arr = edgesFrom.get(k);
    if (arr) arr.push(e);
    else edgesFrom.set(k, [e]);
  };

  // Orient each side so the ink stays on a consistent hand → loops link cleanly.
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (bin[row + x] !== 1) continue;
      if (at(x, y - 1) === 0) add(x + 1, y, x, y); // top    → leftward
      if (at(x, y + 1) === 0) add(x, y + 1, x + 1, y + 1); // bottom → rightward
      if (at(x - 1, y) === 0) add(x, y, x, y + 1); // left   → downward
      if (at(x + 1, y) === 0) add(x + 1, y + 1, x + 1, y); // right  → upward
    }
  }

  // At a "pinch" (two regions touching corner-to-corner) a node has two ways out.
  // Take the sharpest consistent turn (largest signed angle from the incoming
  // heading) so the walk hugs one region — the standard boundary-following rule
  // that keeps loops simple and splits a diagonal touch into two separate loops
  // rather than one self-crossing figure-eight. Ordinary nodes have a single
  // outgoing edge, so this only matters at pinches.
  const pickNext = (cx: number, cy: number, inDx: number, inDy: number): Edge | null => {
    const arr = edgesFrom.get(ckey(cx, cy));
    if (!arr) return null;
    let best: Edge | null = null;
    let bestAng = -Infinity;
    for (const e of arr) {
      if (e.used) continue;
      const odx = e.tx - e.fx;
      const ody = e.ty - e.fy;
      const cross = inDx * ody - inDy * odx;
      const dot = inDx * odx + inDy * ody;
      let ang = Math.atan2(cross, dot); // (−π, π]
      if (ang <= 0) ang += 2 * Math.PI; // (0, 2π]
      if (ang > bestAng) {
        bestAng = ang;
        best = e;
      }
    }
    return best;
  };

  const loops: Pt[][] = [];
  for (const arr of edgesFrom.values()) {
    for (const seed of arr) {
      if (seed.used) continue;
      const startKey = ckey(seed.fx, seed.fy);
      const loop: Pt[] = [];
      let cur: Edge | null = seed;
      while (cur) {
        cur.used = true;
        loop.push({ x: cur.fx, y: cur.fy });
        const inDx = cur.tx - cur.fx;
        const inDy = cur.ty - cur.fy;
        if (ckey(cur.tx, cur.ty) === startKey) break; // closed
        cur = pickNext(cur.tx, cur.ty, inDx, inDy);
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  return loops;
}
