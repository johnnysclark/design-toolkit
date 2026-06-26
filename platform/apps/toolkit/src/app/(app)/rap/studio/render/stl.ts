// ─────────────────────────────────────────────────────────────────────────────
// STL export — a TypeScript port of the repo's pure-Python tactile_print.py:
// extrude walls + columns from the floor and CLIP them at cut_height (so a
// reader can feel into the plan), add a floor slab, convert feet → mm. Output
// is binary STL, client-side. Reads the same deriveGeometry() solids as the 3D
// view, so the print matches the screen.
// ─────────────────────────────────────────────────────────────────────────────

import { applyTransform, deriveGeometry, type Transform } from "../engine/geometry";
import type { State } from "../engine/types";

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

export function buildStl(state: State, levelFilter: number | null = null): ArrayBuffer {
  const scene = deriveGeometry(state, levelFilter);
  const cut = state.tactile3d.cut_height;
  const floorT = state.tactile3d.floor_thickness;
  const tris: Tri[] = [];

  for (const bay of scene.bays) {
    const levelZ = scene.levels[bay.level]?.z ?? 0;
    const { w: W, d: D } = bay.footprint;

    if (state.tactile3d.floor) {
      addBox(tris, 0, 0, W, D, levelZ - floorT, levelZ, bay.transform);
    }
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

  // Floor slab under free elements per level — bays floor themselves, but a
  // level with only free walls/rooms/columns would otherwise print as floating
  // geometry with no base. One slab over the union bounding box per level.
  if (state.tactile3d.floor) {
    // Levels that already have a bay are floored by the per-bay slab above —
    // skip them here, or we emit a second coincident coplanar slab (non-manifold).
    const bayLevels = new Set(scene.bays.map((b) => b.level));
    const freeLevels = new Set<number>();
    for (const fw of scene.freeWalls) freeLevels.add(fw.level);
    for (const c of scene.freeColumns) freeLevels.add(c.level);
    for (const r of scene.rooms) freeLevels.add(r.level);
    for (const lvl of freeLevels) {
      if (bayLevels.has(lvl)) continue;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const grow = (x: number, y: number) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      };
      for (const fw of scene.freeWalls) if (fw.level === lvl) for (const s of fw.solids) for (const q of s.quad) grow(q.x, q.y);
      for (const c of scene.freeColumns)
        if (c.level === lvl) {
          grow(c.x - c.size / 2, c.y - c.size / 2);
          grow(c.x + c.size / 2, c.y + c.size / 2);
        }
      for (const r of scene.rooms)
        if (r.level === lvl) {
          grow(r.x, r.y);
          grow(r.x + r.w, r.y + r.h);
        }
      if (minX < maxX && minY < maxY) {
        const levelZ = scene.levels[lvl]?.z ?? 0;
        addBox(tris, minX, minY, maxX - minX, maxY - minY, levelZ - floorT, levelZ, idTransform);
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
