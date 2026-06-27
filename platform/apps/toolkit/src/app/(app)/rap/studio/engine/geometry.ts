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

import type { ApertureType, Axis, Level, LineType, State, TactilePattern } from "./types";
import { COMPOSITE_FOCUS } from "./types";
import { toBraille } from "./braille";

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
/** How a phase's geometry is drawn in the active view: "focus" = the figure
 *  (solid, full detail); "reference" = context underlay (renderers draw it as a
 *  dashed outline a finger can read — never dimmed in colour or shrunk in relief). */
export type PhaseEmphasis = "focus" | "reference";
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
  phase: string;
  emphasis: PhaseEmphasis;
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
  phase: string;
  emphasis: PhaseEmphasis;
}
// A geometric region (floor plate or extruded box) resolved to world feet, with
// its layer's drafting style + the resolved tactile pattern baked in so renderers
// never look up state.layers themselves (parity: one resolution, all channels).
export interface RegionStyleG {
  lineweight_mm: number;
  linetype: LineType;
  tactile: TactilePattern | null; // null = flat (pattern "none" collapses to null)
}
export interface RegionG {
  id: string;
  level: number;
  kind: "plate" | "box";
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  name: string;
  braille: string;
  height: number; // box: extrusion height ft (0 for a plate)
  thickness: number; // plate: slab thickness ft (0 for a box)
  style: RegionStyleG;
  phase: string;
  emphasis: PhaseEmphasis;
}
export interface ColG {
  id: string;
  level: number;
  x: number;
  y: number;
  size: number;
  phase: string;
  emphasis: PhaseEmphasis;
}

export interface SceneGeometry {
  site: { w: number; h: number; ox: number; oy: number; boundary: Pt[] | null };
  bays: BayGeometry[];
  voids: VoidG[];
  freeWalls: FreeWallG[];
  regions: RegionG[];
  freeColumns: ColG[];
  levels: Level[];
  /** World-space bounds of everything (site + geometry), for a fallback viewBox. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Bounds of the GEOMETRY only (no site/lot) — what the viewers zoom-to-fit and
   *  center on. null when nothing is placed (then fall back to `bounds`). */
  geomBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
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

/** The active phase scope for a render. `focus` is a phase id or COMPOSITE_FOCUS;
 *  `hidden` lists phase ids that are never drawn (visible:"hidden"); `refOff` drops
 *  reference phases entirely (the master "reference underlay off" toggle). */
export interface PhaseView {
  focus: string;
  hidden: Set<string>;
  refOff: boolean;
}

/** Resolve how one phase renders under a view — the SIBLING of `onLevel`, and the
 *  single place phase scope is decided. Returns null to DROP the element. Read by
 *  BOTH deriveGeometry and describe() so the visual/tactile/spoken channels cannot
 *  disagree. With no view (null) every phase is "focus" (solid) — exact back-compat. */
export function emphasisOf(phaseId: string, view: PhaseView | null): PhaseEmphasis | null {
  if (!view) return "focus";
  // The focused phase always shows (focus wins over a stale hidden flag).
  if (view.focus !== COMPOSITE_FOCUS && phaseId === view.focus) return "focus";
  if (view.hidden.has(phaseId)) return null;
  if (view.focus === COMPOSITE_FOCUS) return "focus"; // whole building — every visible phase solid
  return view.refOff ? null : "reference"; // a non-focused phase = reference ghost (or dropped)
}

/** Build a PhaseView from state + a focused id, resolving the hidden-set once.
 *  Call sites (renderers, describe, exports) stay one-liners. */
export function phaseViewOf(state: State, focus: string, refOff = false): PhaseView {
  const hidden = new Set(state.phases.filter((p) => p.visible === "hidden").map((p) => p.id));
  return { focus, hidden, refOff };
}

/** levelFilter: when set, only elements on that level are emitted (mixed-use
 *  floor-by-floor view); null = the whole building. `view` scopes the PHASE axis
 *  (focus vs reference vs hidden); null = every phase solid (the composite). */
export function deriveGeometry(state: State, levelFilter: number | null = null, view: PhaseView | null = null): SceneGeometry {
  const onLevel = (lvl: number) => levelFilter === null || lvl === levelFilter;
  const bays: BayGeometry[] = [];
  const voids: VoidG[] = [];
  let minX = state.site.origin[0];
  let minY = state.site.origin[1];
  let maxX = state.site.origin[0] + state.site.width;
  let maxY = state.site.origin[1] + state.site.height;

  // Geometry-only bounds (excludes the site rect + lot boundary) so the viewers can
  // zoom-to-fit the actual geometry, centered, instead of the whole site.
  let gMinX = Infinity;
  let gMinY = Infinity;
  let gMaxX = -Infinity;
  let gMaxY = -Infinity;
  let hasGeom = false;

  const expand = (p: Pt) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    hasGeom = true;
    gMinX = Math.min(gMinX, p.x);
    gMinY = Math.min(gMinY, p.y);
    gMaxX = Math.max(gMaxX, p.x);
    gMaxY = Math.max(gMaxY, p.y);
  };

  for (const [name, bay] of Object.entries(state.bays)) {
    if (!onLevel(bay.level ?? 0)) continue;
    const bayEmphasis = emphasisOf(bay.phase ?? "main", view);
    if (!bayEmphasis) continue;
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
      level: bay.level ?? 0,
      phase: bay.phase ?? "main",
      emphasis: bayEmphasis
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
    const wallEmphasis = emphasisOf(w.phase ?? "main", view);
    if (!wallEmphasis) continue;
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
    freeWalls.push({ id: w.id, level: w.level, thickness: w.thickness, height, solids, doors, windows, phase: w.phase ?? "main", emphasis: wallEmphasis });
    expand({ x: ax, y: ay });
    expand({ x: bx, y: by });
  }

  // ── Geometric regions (floor plates + extruded boxes) ───────────────────────
  // Resolve each region's layer style + tactile pattern ONCE here, so every
  // renderer reads the same drafting intent (parity). Tactile resolution order
  // (contract A.7): region.tactile ?? layer.tactile ?? none.
  const regions: RegionG[] = [];
  for (const r of state.regions) {
    if (!onLevel(r.level ?? 0)) continue;
    const regionEmphasis = emphasisOf(r.phase ?? "main", view);
    if (!regionEmphasis) continue;
    const [x, y] = r.origin;
    const [w, h] = r.size;
    expand({ x, y });
    expand({ x: x + w, y: y + h });
    const layer = state.layers[r.layer];
    const resolved = r.tactile ?? layer?.tactile ?? null;
    const tactile = resolved && resolved.pattern !== "none" ? resolved : null;
    regions.push({
      id: r.id,
      level: r.level ?? 0,
      kind: r.kind,
      x,
      y,
      w,
      h,
      cx: x + w / 2,
      cy: y + h / 2,
      name: r.name,
      braille: toBraille(r.name),
      height: r.kind === "box" ? r.height ?? 0 : 0,
      thickness: r.kind === "plate" ? r.thickness ?? state.tactile3d.floor_thickness : 0,
      style: {
        lineweight_mm: layer?.lineweight_mm ?? state.style.wall_lineweight_mm,
        linetype: layer?.linetype ?? "solid",
        tactile
      },
      phase: r.phase ?? "main",
      emphasis: regionEmphasis
    });
  }

  // ── Free columns ────────────────────────────────────────────────────────────
  const freeColumns: ColG[] = [];
  for (const c of state.columns) {
    if (!onLevel(c.level)) continue;
    const colEmphasis = emphasisOf(c.phase ?? "main", view);
    if (!colEmphasis) continue;
    freeColumns.push({ id: c.id, level: c.level, x: c.at[0], y: c.at[1], size: c.size, phase: c.phase ?? "main", emphasis: colEmphasis });
  }
  for (const c of freeColumns) expand({ x: c.x, y: c.y });

  const boundary = state.site.boundary ? state.site.boundary.map(([x, y]) => ({ x, y })) : null;
  // The lot boundary grows the site-inclusive bounds only — NOT the geometry bounds,
  // so a small building in a big lot still zooms to the building.
  if (boundary)
    for (const p of boundary) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

  return {
    site: { w: state.site.width, h: state.site.height, ox: state.site.origin[0], oy: state.site.origin[1], boundary },
    bays,
    voids,
    freeWalls,
    regions,
    freeColumns,
    levels: state.levels,
    bounds: { minX, minY, maxX, maxY },
    geomBounds: hasGeom ? { minX: gMinX, minY: gMinY, maxX: gMaxX, maxY: gMaxY } : null
  };
}

/** Axis-aligned bounding box (world feet) of all geometry tagged to a phase, or
 *  null if the phase is empty. OUTSIDE the render path — feeds `phase fit`/`status`
 *  and the derive-time `basis` snapshot. Bays use their four (rotated) corners. */
export interface Footprint {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export function phaseFootprint(state: State, phaseId: string): Footprint | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let any = false;
  const acc = (x: number, y: number) => {
    any = true;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const bay of Object.values(state.bays)) {
    if ((bay.phase ?? "main") !== phaseId) continue;
    const [nx, ny] = bay.bays;
    const [sx, sy] = bay.spacing;
    const W = nx * sx;
    const D = ny * sy;
    const t: Transform = { ox: bay.origin[0], oy: bay.origin[1], rot: bay.rotation_deg };
    for (const corner of [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: D },
      { x: 0, y: D }
    ]) {
      const p = applyTransform(corner, t);
      acc(p.x, p.y);
    }
  }
  for (const w of state.walls) {
    if ((w.phase ?? "main") !== phaseId) continue;
    acc(w.a[0], w.a[1]);
    acc(w.b[0], w.b[1]);
  }
  for (const r of state.regions) {
    if ((r.phase ?? "main") !== phaseId) continue;
    acc(r.origin[0], r.origin[1]);
    acc(r.origin[0] + r.size[0], r.origin[1] + r.size[1]);
  }
  for (const c of state.columns) {
    if ((c.phase ?? "main") !== phaseId) continue;
    acc(c.at[0], c.at[1]);
  }
  return any ? { minX, minY, maxX, maxY } : null;
}
