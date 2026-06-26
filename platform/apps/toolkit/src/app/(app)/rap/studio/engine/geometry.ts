// ─────────────────────────────────────────────────────────────────────────────
// deriveGeometry(state) — the one place state.json becomes geometry.
//
// Everything downstream (the 2D tactile plan SVG, the 3D scene, the STL relief)
// reads ONLY this output. That is renderer parity made literal: there is no
// second interpretation of the state, so the channels cannot disagree.
//
// All coordinates are in FEET. Each bay is emitted in LOCAL coordinates (its
// origin at 0,0) plus a `transform` (translate to origin, then rotate about it);
// renderers apply the transform with their native machinery (SVG transform,
// a three.js group, or applyTransform() for the STL). Voids are placed in world
// coordinates (the desktop tool stores them in site space).
// ─────────────────────────────────────────────────────────────────────────────

import type { ApertureType, Axis, Level, State } from "./types";

export interface Pt {
  x: number;
  y: number;
}
export interface Seg {
  a: Pt;
  b: Pt;
}
/** An axis-aligned solid rectangle in a bay's local coordinates. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface ColumnG {
  x: number;
  y: number;
  r: number;
}
export interface DoorSwing {
  hinge: Pt;
  leafEnd: Pt;
  radius: number;
  /** Arc sweep, in degrees, for the swing path. */
  a0: number;
  a1: number;
}
export interface OpeningMark {
  a: Pt;
  b: Pt;
  kind: ApertureType;
}
export interface CorridorG {
  rect: Rect;
  axis: Axis;
}
export interface VoidG {
  cx: number;
  cy: number;
  w: number;
  h: number;
  shape: "rectangle" | "circle";
}
export interface Transform {
  ox: number;
  oy: number;
  rot: number; // degrees
}
export interface BayGeometry {
  name: string;
  transform: Transform;
  footprint: { w: number; d: number };
  grid: Seg[];
  columns: ColumnG[];
  walls: Rect[];
  openings: OpeningMark[];
  doors: DoorSwing[];
  corridor: CorridorG | null;
  label: { x: number; y: number; text: string; braille: string };
  level: number;
}
// ── Free elements (world coordinates, no per-bay transform) ──────────────────
export interface FreeWallSolid {
  quad: Pt[]; // 4 world points (a filled wall chunk)
  cx: number;
  cy: number;
  len: number;
  angleDeg: number;
  start: Pt; // world start corner (for STL box placement)
}
export interface FreeWallG {
  id: string;
  level: number;
  thickness: number;
  height: number;
  solids: FreeWallSolid[];
  doors: DoorSwing[]; // world coords, absolute arc angles
  windows: { a: Pt; b: Pt }[];
}
export interface RoomG {
  id: string;
  level: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  name: string;
  use: string;
  braille: string;
}
export interface ColG {
  id: string;
  level: number;
  x: number;
  y: number;
  size: number;
}

export interface SceneGeometry {
  site: { w: number; h: number; ox: number; oy: number; boundary: Pt[] | null };
  bays: BayGeometry[];
  voids: VoidG[];
  freeWalls: FreeWallG[];
  rooms: RoomG[];
  freeColumns: ColG[];
  levels: Level[];
  /** World-space bounds of everything, for a 2D viewBox. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Apply a bay transform to a local point → world feet. */
export function applyTransform(p: Pt, t: Transform): Pt {
  const r = (t.rot * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return {
    x: t.ox + p.x * c - p.y * s,
    y: t.oy + p.x * s + p.y * c
  };
}

/** Subtract a set of [start,end] open intervals from [0,len] → solid spans. */
function solidSpans(len: number, gaps: Array<[number, number]>): Array<[number, number]> {
  const sorted = gaps
    .map(([a, b]) => [Math.max(0, Math.min(a, b)), Math.min(len, Math.max(a, b))] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((p, q) => p[0] - q[0]);
  const spans: Array<[number, number]> = [];
  let cursor = 0;
  for (const [a, b] of sorted) {
    if (a > cursor) spans.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < len) spans.push([cursor, len]);
  return spans;
}

/** levelFilter: when set, only elements on that level are emitted (mixed-use
 *  floor-by-floor view); null = the whole building. */
export function deriveGeometry(state: State, levelFilter: number | null = null): SceneGeometry {
  const onLevel = (lvl: number) => levelFilter === null || lvl === levelFilter;
  const bays: BayGeometry[] = [];
  const voids: VoidG[] = [];
  let minX = state.site.origin[0];
  let minY = state.site.origin[1];
  let maxX = state.site.origin[0] + state.site.width;
  let maxY = state.site.origin[1] + state.site.height;

  const expand = (p: Pt) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  };

  for (const [name, bay] of Object.entries(state.bays)) {
    if (!onLevel(bay.level ?? 0)) continue;
    const [nx, ny] = bay.bays;
    const [sx, sy] = bay.spacing;
    const W = nx * sx;
    const D = ny * sy;
    const t: Transform = { ox: bay.origin[0], oy: bay.origin[1], rot: bay.rotation_deg };

    // Grid lines (local).
    const grid: Seg[] = [];
    for (let i = 0; i <= nx; i++) grid.push({ a: { x: i * sx, y: 0 }, b: { x: i * sx, y: D } });
    for (let j = 0; j <= ny; j++) grid.push({ a: { x: 0, y: j * sy }, b: { x: W, y: j * sy } });

    // Columns at every grid intersection.
    const columns: ColumnG[] = [];
    const r = state.style.column_size / 2;
    for (let i = 0; i <= nx; i++)
      for (let j = 0; j <= ny; j++) columns.push({ x: i * sx, y: j * sy, r });

    // ── Walls (perimeter), gapped at openings on that edge ──────────────────
    const walls: Rect[] = [];
    const doors: DoorSwing[] = [];
    const openings: OpeningMark[] = [];
    const th = bay.walls.thickness;

    // Sort apertures onto the four perimeter edges.
    const onEdge = (edge: "bottom" | "top" | "left" | "right") =>
      bay.walls.enabled
        ? bay.apertures.filter((ap) => {
            if (edge === "bottom") return ap.axis === "x" && ap.gridline === 0;
            if (edge === "top") return ap.axis === "x" && ap.gridline === ny;
            if (edge === "left") return ap.axis === "y" && ap.gridline === 0;
            return ap.axis === "y" && ap.gridline === nx; // right
          })
        : [];

    if (bay.walls.enabled) {
      // bottom edge (y in [0,th]), spans along x
      for (const [a, b] of solidSpans(W, onEdge("bottom").map((ap) => [ap.corner, ap.corner + ap.width])))
        walls.push({ x: a, y: 0, w: b - a, h: th });
      // top edge (y in [D-th,D]), spans along x
      for (const [a, b] of solidSpans(W, onEdge("top").map((ap) => [ap.corner, ap.corner + ap.width])))
        walls.push({ x: a, y: D - th, w: b - a, h: th });
      // left edge (x in [0,th]), spans along y
      for (const [a, b] of solidSpans(D, onEdge("left").map((ap) => [ap.corner, ap.corner + ap.width])))
        walls.push({ x: 0, y: a, w: th, h: b - a });
      // right edge (x in [W-th,W]), spans along y
      for (const [a, b] of solidSpans(D, onEdge("right").map((ap) => [ap.corner, ap.corner + ap.width])))
        walls.push({ x: W - th, y: a, w: th, h: b - a });
    }

    // Aperture symbols — only where a wall gap actually exists (perimeter edge +
    // walls enabled), so a door/window isn't drawn floating on an interior line.
    for (const ap of bay.apertures) {
      const perimeter =
        bay.walls.enabled &&
        ((ap.axis === "x" && (ap.gridline === 0 || ap.gridline === ny)) || (ap.axis === "y" && (ap.gridline === 0 || ap.gridline === nx)));
      if (!perimeter) continue;
      // Anchor point + direction of the opening line, in local coords.
      let p0: Pt;
      let dir: Pt; // unit-ish direction the opening runs
      let inward: Pt; // unit-ish direction pointing into the bay
      if (ap.axis === "x") {
        const y = ap.gridline * sy;
        p0 = { x: ap.corner, y };
        dir = { x: 1, y: 0 };
        inward = { x: 0, y: ap.gridline >= ny ? -1 : 1 };
      } else {
        const x = ap.gridline * sx;
        p0 = { x, y: ap.corner };
        dir = { x: 0, y: 1 };
        inward = { x: ap.gridline >= nx ? -1 : 1, y: 0 };
      }
      const p1: Pt = { x: p0.x + dir.x * ap.width, y: p0.y + dir.y * ap.width };

      if (ap.type === "door") {
        const hinge = ap.hinge === "start" ? p0 : p1;
        const swingSign = ap.swing === "positive" ? 1 : -1;
        const inX = inward.x * swingSign;
        const inY = inward.y * swingSign;
        // Leaf swings from along-the-wall toward inward.
        const leafEnd: Pt = { x: hinge.x + inX * ap.width, y: hinge.y + inY * ap.width };
        const towardOther = ap.hinge === "start" ? dir : { x: -dir.x, y: -dir.y };
        const a0 = (Math.atan2(towardOther.y, towardOther.x) * 180) / Math.PI;
        const a1 = (Math.atan2(inY, inX) * 180) / Math.PI;
        doors.push({ hinge, leafEnd, radius: ap.width, a0, a1 });
      } else {
        openings.push({ a: p0, b: p1, kind: ap.type });
      }
    }

    // ── Corridor band ───────────────────────────────────────────────────────
    let corridor: CorridorG | null = null;
    if (bay.corridor.enabled) {
      const w = bay.corridor.width;
      if (bay.corridor.axis === "x") {
        const cy = bay.corridor.position * sy;
        corridor = { rect: { x: 0, y: cy - w / 2, w: W, h: w }, axis: "x" };
      } else {
        const cx = bay.corridor.position * sx;
        corridor = { rect: { x: cx - w / 2, y: 0, w, h: D }, axis: "y" };
      }
    }

    // Expand world bounds with the four (rotated) bay corners.
    for (const corner of [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: D },
      { x: 0, y: D }
    ])
      expand(applyTransform(corner, t));

    bays.push({
      name,
      transform: t,
      footprint: { w: W, d: D },
      grid,
      columns,
      walls,
      openings,
      doors,
      corridor,
      label: { x: 0, y: -3, text: bay.label, braille: bay.braille },
      level: bay.level ?? 0
    });

    // World-space void belonging to this bay (if any).
    if (bay.void_center && bay.void_size) {
      voids.push({
        cx: bay.void_center[0],
        cy: bay.void_center[1],
        w: bay.void_size[0],
        h: bay.void_size[1],
        shape: bay.void_shape
      });
      expand({ x: bay.void_center[0] - bay.void_size[0] / 2, y: bay.void_center[1] - bay.void_size[1] / 2 });
      expand({ x: bay.void_center[0] + bay.void_size[0] / 2, y: bay.void_center[1] + bay.void_size[1] / 2 });
    }
  }

  // ── Free walls (interior + exterior), gapped at their openings ──────────────
  const freeWalls: FreeWallG[] = [];
  for (const w of state.walls) {
    if (!onLevel(w.level)) continue;
    const [ax, ay] = w.a;
    const [bx, by] = w.b;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-6;
    const ux = dx / len;
    const uy = dy / len; // along
    const nx = -uy;
    const ny = ux; // normal
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const half = w.thickness / 2;
    const height = w.height ?? state.tactile3d.wall_height;

    const mine = state.openings.filter((o) => o.wallId === w.id);
    const ints = mine.map((o) => [o.pos * len - o.width / 2, o.pos * len + o.width / 2] as [number, number]);
    const solids: FreeWallSolid[] = solidSpans(len, ints).map(([s0, s1]) => {
      const p0x = ax + ux * s0;
      const p0y = ay + uy * s0;
      const p1x = ax + ux * s1;
      const p1y = ay + uy * s1;
      return {
        quad: [
          { x: p0x + nx * half, y: p0y + ny * half },
          { x: p1x + nx * half, y: p1y + ny * half },
          { x: p1x - nx * half, y: p1y - ny * half },
          { x: p0x - nx * half, y: p0y - ny * half }
        ],
        cx: (p0x + p1x) / 2,
        cy: (p0y + p1y) / 2,
        len: s1 - s0,
        angleDeg,
        start: { x: p0x - nx * half, y: p0y - ny * half }
      };
    });

    const doors: DoorSwing[] = [];
    const windows: { a: Pt; b: Pt }[] = [];
    for (const o of mine) {
      const c = o.pos * len;
      const e0 = { x: ax + ux * (c - o.width / 2), y: ay + uy * (c - o.width / 2) };
      const e1 = { x: ax + ux * (c + o.width / 2), y: ay + uy * (c + o.width / 2) };
      if (o.type === "door") {
        doors.push({
          hinge: e0,
          leafEnd: { x: e0.x + nx * o.width, y: e0.y + ny * o.width },
          radius: o.width,
          a0: (Math.atan2(uy, ux) * 180) / Math.PI,
          a1: (Math.atan2(ny, nx) * 180) / Math.PI
        });
      } else if (o.type === "window") {
        windows.push({ a: e0, b: e1 });
      }
      // portal = an open gap, no symbol
    }
    freeWalls.push({ id: w.id, level: w.level, thickness: w.thickness, height, solids, doors, windows });
    expand({ x: ax, y: ay });
    expand({ x: bx, y: by });
  }

  // ── Rooms (program spaces) ──────────────────────────────────────────────────
  const rooms: RoomG[] = state.rooms
    .filter((r) => onLevel(r.level))
    .map((r) => {
      const [x, y] = r.origin;
      const [w, h] = r.size;
      expand({ x, y });
      expand({ x: x + w, y: y + h });
      return { id: r.id, level: r.level, x, y, w, h, cx: x + w / 2, cy: y + h / 2, name: r.name, use: r.use, braille: r.braille };
    });

  // ── Free columns ────────────────────────────────────────────────────────────
  const freeColumns: ColG[] = state.columns
    .filter((c) => onLevel(c.level))
    .map((c) => ({ id: c.id, level: c.level, x: c.at[0], y: c.at[1], size: c.size }));
  for (const c of freeColumns) expand({ x: c.x, y: c.y });

  const boundary = state.site.boundary ? state.site.boundary.map(([x, y]) => ({ x, y })) : null;
  if (boundary) for (const p of boundary) expand(p);

  return {
    site: { w: state.site.width, h: state.site.height, ox: state.site.origin[0], oy: state.site.origin[1], boundary },
    bays,
    voids,
    freeWalls,
    rooms,
    freeColumns,
    levels: state.levels,
    bounds: { minX, minY, maxX, maxY }
  };
}
