// ─────────────────────────────────────────────────────────────────────────────
// STL export — a TypeScript port of the repo's pure-Python tactile_print.py:
// extrude walls + columns from the floor and CLIP them at cut_height (so a
// reader can feel into the plan), add a floor slab, convert feet → mm. Output
// is binary STL, client-side. Reads the same deriveGeometry() solids as the 3D
// view, so the print matches the screen.
// ─────────────────────────────────────────────────────────────────────────────

import { applyTransform, deriveGeometry, type Pt, type RegionG, type Transform } from "../engine/geometry";
import type { State, TactilePattern } from "../engine/types";
import { clipLineToRect, MM_TO_PLAN_FT } from "./planModel";

const FT_TO_MM = 304.8;

type Tri = [number[], number[], number[]];

function pushBox(tris: Tri[], corners3D: number[][]) {
  // corners order: 0-3 bottom (ccw), 4-7 top (ccw, matching xy of 0-3)
  const [a, b, c, d, e, f, g, h] = corners3D;
  const quad = (p0: number[], p1: number[], p2: number[], p3: number[]) => {
    tris.push([p0, p1, p2]);
    tris.push([p0, p2, p3]);
  };
  quad(a, b, c, d); // bottom
  quad(e, h, g, f); // top
  quad(a, e, f, b); // sides
  quad(b, f, g, c);
  quad(c, g, h, d);
  quad(d, h, e, a);
}

/** Add an axis-aligned (in bay-local space) box, rotated into world by the bay
 *  transform, spanning [zBot, zTop] in height. Coordinates in feet. */
function addBox(tris: Tri[], x: number, y: number, w: number, h: number, zBot: number, zTop: number, t: Transform) {
  const p = (lx: number, ly: number) => applyTransform({ x: lx, y: ly }, t);
  const c00 = p(x, y);
  const c10 = p(x + w, y);
  const c11 = p(x + w, y + h);
  const c01 = p(x, y + h);
  const corners = [
    [c00.x, zBot, c00.y],
    [c10.x, zBot, c10.y],
    [c11.x, zBot, c11.y],
    [c01.x, zBot, c01.y],
    [c00.x, zTop, c00.y],
    [c10.x, zTop, c10.y],
    [c11.x, zTop, c11.y],
    [c01.x, zTop, c01.y]
  ];
  pushBox(tris, corners);
}

/** Raised tactile relief on a region's top surface. Each mark is an independent
 *  watertight box (so the mesh stays manifold — crossing crosshatch ridges just
 *  produce overlapping closed solids a slicer unions cleanly). Marks sink EPS
 *  into the slab so the union is solid, not a coincident-face touch, and are
 *  clipped to the footprint so nothing pokes past the slab edge. Lateral pitch
 *  reuses MM_TO_PLAN_FT + clipLineToRect, so dot/ridge positions coincide with
 *  the 2D plan; only the relief height is STL-specific. */
function addTactileRelief(tris: Tri[], rg: RegionG, topZ: number, tac: TactilePattern | null) {
  if (!tac || tac.pattern === "none") return;
  const pitch = Math.max(0.05, tac.spacing_mm * MM_TO_PLAN_FT);
  const reliefH = tac.height_mm / 304.8; // ft (then × FT_TO_MM × scale on serialize)
  const EPS = 0.005; // sink into the slab → clean union, still manifold
  const z0 = topZ - EPS;
  const z1 = topZ + reliefH;
  const r = { x: rg.x, y: rg.y, w: rg.w, h: rg.h };
  const idT = { ox: 0, oy: 0, rot: 0 };

  if (tac.pattern === "dots") {
    const side = pitch * 0.4;
    for (let gx = r.x + pitch / 2; gx <= r.x + r.w - side; gx += pitch)
      for (let gy = r.y + pitch / 2; gy <= r.y + r.h - side; gy += pitch)
        addBox(tris, gx - side / 2, gy - side / 2, side, side, z0, z1, idT); // stud, fully inside
    return;
  }
  const width = pitch * 0.25;
  const angles = tac.pattern === "grid" ? [0, 90] : tac.pattern === "crosshatch" ? [tac.angle_deg, tac.angle_deg + 90] : [tac.angle_deg];
  for (const deg of angles) {
    const a = (deg * Math.PI) / 180;
    const d: Pt = { x: Math.cos(a), y: Math.sin(a) };
    const n: Pt = { x: -Math.sin(a), y: Math.cos(a) };
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const offs = [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x + r.w, r.y + r.h],
      [r.x, r.y + r.h]
    ].map(([x, y]) => (x - cx) * n.x + (y - cy) * n.y);
    const lo = Math.min(...offs);
    const hi = Math.max(...offs);
    for (let o = lo + pitch / 2; o < hi; o += pitch) {
      const P: Pt = { x: cx + n.x * o, y: cy + n.y * o };
      const seg = clipLineToRect(P, d, r);
      if (!seg) continue;
      const L = Math.hypot(seg[1].x - seg[0].x, seg[1].y - seg[0].y);
      // ridge as a rotated box: local x runs 0..L along the segment, width centered on the line.
      addBox(tris, 0, -width / 2, L, width, z0, z1, { ox: seg[0].x, oy: seg[0].y, rot: deg });
    }
  }
}

export function buildStl(state: State, levelFilter: number | null = null): ArrayBuffer {
  const scene = deriveGeometry(state, levelFilter);
  const cut = state.tactile3d.cut_height;
  const floorT = state.tactile3d.floor_thickness;
  const tris: Tri[] = [];

  for (const bay of scene.bays) {
    const levelZ = scene.levels[bay.level]?.z ?? 0;

    // Walls clipped at cut height.
    for (const wll of bay.walls) {
      addBox(tris, wll.x, wll.y, wll.w, wll.h, levelZ, levelZ + cut, bay.transform);
    }
    // Columns clipped at cut height.
    for (const c of bay.columns) {
      addBox(tris, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, levelZ, levelZ + cut, bay.transform);
    }
  }

  const idTransform = { ox: 0, oy: 0, rot: 0 };

  // Free walls (interior + exterior) — each solid chunk as a rotated box.
  for (const fw of scene.freeWalls) {
    const levelZ = scene.levels[fw.level]?.z ?? 0;
    for (const s of fw.solids) {
      addBox(tris, 0, 0, s.len, fw.thickness, levelZ, levelZ + cut, { ox: s.start.x, oy: s.start.y, rot: s.angleDeg });
    }
  }

  // Free columns.
  for (const c of scene.freeColumns) {
    const levelZ = scene.levels[c.level]?.z ?? 0;
    addBox(tris, c.x - c.size / 2, c.y - c.size / 2, c.size, c.size, levelZ, levelZ + cut, idTransform);
  }

  // ── Regions — plates are slabs, boxes are massing volumes. Boxes are NOT
  // clipped at cut height (walls/columns keep their cut clip); each region also
  // gets raised tactile relief on its top surface. ──────────────────────────────
  for (const rg of scene.regions) {
    const levelZ = scene.levels[rg.level]?.z ?? 0;
    if (rg.kind === "plate") {
      const thick = rg.thickness || floorT;
      addBox(tris, rg.x, rg.y, rg.w, rg.h, levelZ - thick, levelZ, idTransform); // top at level z
      addTactileRelief(tris, rg, levelZ, rg.style.tactile);
    } else {
      addBox(tris, rg.x, rg.y, rg.w, rg.h, levelZ, levelZ + rg.height, idTransform); // massing, full height
      addTactileRelief(tris, rg, levelZ + rg.height, rg.style.tactile);
    }
  }

  // ── Floor slabs — ONE per level, spanning the union bounding box of EVERYTHING
  // on that level (bay footprints + free walls/regions/columns). A single slab per
  // level avoids coincident double-slabs (non-manifold) AND guarantees free
  // elements outside a bay footprint still get a base. Regions also emit their own
  // closed solids above; a plate + this auto slab may overlap, which is benign for
  // slicing (both closed manifolds). (A rotated bay's slab is its AABB; benign.)
  if (state.tactile3d.floor) {
    type BBox = { minX: number; minY: number; maxX: number; maxY: number };
    const bboxes = new Map<number, BBox>();
    const grow = (lvl: number, x: number, y: number) => {
      const b = bboxes.get(lvl) ?? { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      b.minX = Math.min(b.minX, x);
      b.minY = Math.min(b.minY, y);
      b.maxX = Math.max(b.maxX, x);
      b.maxY = Math.max(b.maxY, y);
      bboxes.set(lvl, b);
    };
    for (const bay of scene.bays) {
      const { w: W, d: D } = bay.footprint;
      for (const corner of [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: D }, { x: 0, y: D }]) {
        const p = applyTransform(corner, bay.transform);
        grow(bay.level, p.x, p.y);
      }
    }
    for (const fw of scene.freeWalls) for (const s of fw.solids) for (const q of s.quad) grow(fw.level, q.x, q.y);
    for (const c of scene.freeColumns) {
      grow(c.level, c.x - c.size / 2, c.y - c.size / 2);
      grow(c.level, c.x + c.size / 2, c.y + c.size / 2);
    }
    for (const rg of scene.regions) {
      grow(rg.level, rg.x, rg.y);
      grow(rg.level, rg.x + rg.w, rg.y + rg.h);
    }
    for (const [lvl, b] of bboxes) {
      if (b.minX < b.maxX && b.minY < b.maxY) {
        const levelZ = scene.levels[lvl]?.z ?? 0;
        addBox(tris, b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY, levelZ - floorT, levelZ, idTransform);
      }
    }
  }

  // ── Serialise to binary STL (feet → mm × scale_factor) ──────────────────────
  const s = FT_TO_MM * state.tactile3d.scale_factor;
  const n = tris.length;
  const buf = new ArrayBuffer(84 + n * 50);
  const view = new DataView(buf);
  // 80-byte header left zero, then triangle count.
  view.setUint32(80, n, true);
  let off = 84;
  const normal = (t: Tri): number[] => {
    const [p0, p1, p2] = t;
    const ux = p1[0] - p0[0],
      uy = p1[1] - p0[1],
      uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0],
      vy = p2[1] - p0[1],
      vz = p2[2] - p0[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const m = Math.hypot(nx, ny, nz) || 1;
    return [nx / m, ny / m, nz / m];
  };
  for (const t of tris) {
    const nrm = normal(t);
    view.setFloat32(off, nrm[0], true);
    view.setFloat32(off + 4, nrm[1], true);
    view.setFloat32(off + 8, nrm[2], true);
    off += 12;
    for (const v of t) {
      view.setFloat32(off, v[0] * s, true);
      view.setFloat32(off + 4, v[1] * s, true);
      view.setFloat32(off + 8, v[2] * s, true);
      off += 12;
    }
    view.setUint16(off, 0, true);
    off += 2;
  }
  return buf;
}
