// Ramer–Douglas–Peucker polyline simplification — for both open polylines
// (centreline strokes) and closed rings (outline loops).

import type { Pt } from "./types";

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const ex = p.x - (a.x + t * dx);
  const ey = p.y - (a.y + t * dy);
  return Math.sqrt(ex * ex + ey * ey);
}

// Open polyline. Iterative (explicit stack) so very long pixel chains don't blow
// the call stack.
export function rdp(points: Pt[], eps: number): Pt[] {
  const n = points.length;
  if (eps <= 0 || n < 3) return points.slice();
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: number[] = [0, n - 1];
  while (stack.length) {
    const j = stack.pop() as number;
    const i = stack.pop() as number;
    let maxD = -1;
    let idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = perpDist(points[k], points[i], points[j]);
      if (d > maxD) {
        maxD = d;
        idx = k;
      }
    }
    if (maxD > eps && idx > 0) {
      keep[idx] = 1;
      stack.push(i, idx);
      stack.push(idx, j);
    }
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i]);
  return out;
}

// Closed ring: split at the vertex farthest from ring[0] (a robust "diameter"
// pivot), RDP each half, then stitch back without duplicating the shared joints.
export function rdpClosed(ring: Pt[], eps: number): Pt[] {
  const n = ring.length;
  if (eps <= 0 || n < 4) return ring.slice();
  let far = 0;
  let farD = -1;
  for (let i = 1; i < n; i++) {
    const dx = ring[i].x - ring[0].x;
    const dy = ring[i].y - ring[0].y;
    const d = dx * dx + dy * dy;
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const a = ring.slice(0, far + 1);
  const b = ring.slice(far).concat([ring[0]]);
  const ra = rdp(a, eps);
  const rb = rdp(b, eps);
  // ra: ring[0] … ring[far]; rb: ring[far] … ring[0]. Drop each tail to avoid
  // repeating ring[far] and ring[0].
  return ra.slice(0, -1).concat(rb.slice(0, -1));
}

export function polylineLength(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    L += Math.sqrt(dx * dx + dy * dy);
  }
  return L;
}

// Signed area of a closed polygon (shoelace). |area| is the enclosed area; the
// sign gives winding (used to drop negligible loops).
export function polygonArea(ring: Pt[]): number {
  let a = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    a += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
  }
  return a / 2;
}
