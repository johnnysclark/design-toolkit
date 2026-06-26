// ─────────────────────────────────────────────────────────────────────────────
// planModel — turns SceneGeometry into a flat list of world-space drawing
// primitives for the 2D tactile plan. BOTH the on-screen SVG and the 1-bit
// PIAF raster export consume this exact list, so the printed swell-paper sheet
// matches the screen preview. Pure black-on-white, the way touch reads best.
//
// All points are world feet. Bay-local geometry is transformed to world here
// (including rotation), and door-swing arcs are sampled to polylines, so a
// renderer only needs a flat world→screen map (with a Y-flip for plan north-up).
// ─────────────────────────────────────────────────────────────────────────────

import { applyTransform, deriveGeometry, type Pt, type Transform } from "../engine/geometry";
import type { State } from "../engine/types";

export type DrawPrim =
  | { kind: "line"; pts: Pt[]; weight: "light" | "heavy" | "corridor"; dashed?: boolean }
  | { kind: "fill"; pts: Pt[] } // filled black polygon (walls)
  | { kind: "circle"; c: Pt; r: number; fill: boolean }
  | { kind: "text"; at: Pt; text: string; size: number; braille?: boolean; anchor?: "start" | "middle" };

export interface PlanModel {
  prims: DrawPrim[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function rectCorners(x: number, y: number, w: number, h: number, t: Transform): Pt[] {
  return [
    applyTransform({ x, y }, t),
    applyTransform({ x: x + w, y }, t),
    applyTransform({ x: x + w, y: y + h }, t),
    applyTransform({ x, y: y + h }, t)
  ];
}

function arcPolyline(hinge: Pt, radius: number, a0: number, a1: number, t: Transform): Pt[] {
  const steps = 14;
  const pts: Pt[] = [];
  // Normalize sweep to the short direction.
  let span = a1 - a0;
  while (span > 180) span -= 360;
  while (span < -180) span += 360;
  for (let i = 0; i <= steps; i++) {
    const ang = ((a0 + (span * i) / steps) * Math.PI) / 180;
    pts.push(applyTransform({ x: hinge.x + radius * Math.cos(ang), y: hinge.y + radius * Math.sin(ang) }, t));
  }
  return pts;
}

export function buildPlanModel(state: State, levelFilter: number | null = null): PlanModel {
  const scene = deriveGeometry(state, levelFilter);
  const prims: DrawPrim[] = [];

  // Site boundary — irregular infill lot polygon if present, else the rectangle.
  const { ox, oy, w, h } = scene.site;
  if (scene.site.boundary && scene.site.boundary.length >= 3) {
    const b = scene.site.boundary;
    prims.push({ kind: "line", pts: [...b, b[0]], weight: "heavy", dashed: true });
  } else {
    prims.push({ kind: "line", pts: [{ x: ox, y: oy }, { x: ox + w, y: oy }, { x: ox + w, y: oy + h }, { x: ox, y: oy + h }, { x: ox, y: oy }], weight: "light" });
  }

  for (const bay of scene.bays) {
    const t = bay.transform;

    // Grid (light).
    for (const g of bay.grid) {
      prims.push({ kind: "line", pts: [applyTransform(g.a, t), applyTransform(g.b, t)], weight: "light" });
    }

    // Corridor — dashed band edges (corridor weight).
    if (bay.corridor) {
      const c = bay.corridor.rect;
      if (bay.corridor.axis === "x") {
        prims.push({ kind: "line", pts: [applyTransform({ x: c.x, y: c.y }, t), applyTransform({ x: c.x + c.w, y: c.y }, t)], weight: "corridor", dashed: true });
        prims.push({ kind: "line", pts: [applyTransform({ x: c.x, y: c.y + c.h }, t), applyTransform({ x: c.x + c.w, y: c.y + c.h }, t)], weight: "corridor", dashed: true });
      } else {
        prims.push({ kind: "line", pts: [applyTransform({ x: c.x, y: c.y }, t), applyTransform({ x: c.x, y: c.y + c.h }, t)], weight: "corridor", dashed: true });
        prims.push({ kind: "line", pts: [applyTransform({ x: c.x + c.w, y: c.y }, t), applyTransform({ x: c.x + c.w, y: c.y + c.h }, t)], weight: "corridor", dashed: true });
      }
    }

    // Walls (filled black polygons).
    for (const wRect of bay.walls) {
      prims.push({ kind: "fill", pts: rectCorners(wRect.x, wRect.y, wRect.w, wRect.h, t) });
    }

    // Columns (filled circles).
    for (const col of bay.columns) {
      prims.push({ kind: "circle", c: applyTransform({ x: col.x, y: col.y }, t), r: col.r, fill: true });
    }

    // Door swings (leaf + arc).
    for (const d of bay.doors) {
      prims.push({ kind: "line", pts: [applyTransform(d.hinge, t), applyTransform(d.leafEnd, t)], weight: "heavy" });
      prims.push({ kind: "line", pts: arcPolyline(d.hinge, d.radius, d.a0, d.a1, t), weight: "light" });
    }

    // Window / portal marks across the opening.
    for (const o of bay.openings) {
      if (o.kind === "window") {
        // double line to read as glazing
        const mid = { x: (o.a.x + o.b.x) / 2, y: (o.a.y + o.b.y) / 2 };
        prims.push({ kind: "line", pts: [applyTransform(o.a, t), applyTransform(o.b, t)], weight: "heavy" });
        prims.push({ kind: "circle", c: applyTransform(mid, t), r: 0.6, fill: false });
      }
      // portals are left fully open (no mark)
    }

    // Label + braille, just below the bay.
    const lp = applyTransform({ x: bay.label.x, y: bay.label.y }, t);
    prims.push({ kind: "text", at: lp, text: bay.label.text, size: 2.4 });
    prims.push({ kind: "text", at: { x: lp.x, y: lp.y - 3 }, text: bay.label.braille, size: 3.2, braille: true });
  }

  // Rooms — outline (program spaces).
  for (const rm of scene.rooms) {
    prims.push({ kind: "line", pts: [{ x: rm.x, y: rm.y }, { x: rm.x + rm.w, y: rm.y }, { x: rm.x + rm.w, y: rm.y + rm.h }, { x: rm.x, y: rm.y + rm.h }, { x: rm.x, y: rm.y }], weight: "light" });
  }

  // Free walls — solid black chunks + door/window symbols.
  for (const fw of scene.freeWalls) {
    for (const s of fw.solids) prims.push({ kind: "fill", pts: s.quad });
    for (const d of fw.doors) {
      prims.push({ kind: "line", pts: [d.hinge, d.leafEnd], weight: "heavy" });
      prims.push({ kind: "line", pts: arcPolyline(d.hinge, d.radius, d.a0, d.a1, { ox: 0, oy: 0, rot: 0 }), weight: "light" });
    }
    for (const win of fw.windows) {
      prims.push({ kind: "line", pts: [win.a, win.b], weight: "heavy" });
      prims.push({ kind: "circle", c: { x: (win.a.x + win.b.x) / 2, y: (win.a.y + win.b.y) / 2 }, r: 0.6, fill: false });
    }
  }

  // Free columns.
  for (const c of scene.freeColumns) {
    prims.push({ kind: "circle", c: { x: c.x, y: c.y }, r: c.size / 2, fill: true });
  }

  // Room labels (drawn last so walls don't cover them).
  for (const rm of scene.rooms) {
    prims.push({ kind: "text", at: { x: rm.cx, y: rm.cy + 1.4 }, text: rm.name, size: 2.6, anchor: "middle" });
    prims.push({ kind: "text", at: { x: rm.cx, y: rm.cy - 2.4 }, text: rm.braille, size: 3, braille: true, anchor: "middle" });
  }

  // Voids (world-space outline).
  for (const v of scene.voids) {
    if (v.shape === "circle") {
      prims.push({ kind: "circle", c: { x: v.cx, y: v.cy }, r: Math.max(v.w, v.h) / 2, fill: false });
    } else {
      const x = v.cx - v.w / 2;
      const y = v.cy - v.h / 2;
      prims.push({ kind: "line", pts: [{ x, y }, { x: x + v.w, y }, { x: x + v.w, y: y + v.h }, { x, y: y + v.h }, { x, y }], weight: "heavy" });
    }
  }

  // Pad bounds a little for labels/margins.
  const pad = 6;
  return {
    prims,
    bounds: {
      minX: scene.bounds.minX - pad,
      minY: scene.bounds.minY - pad,
      maxX: scene.bounds.maxX + pad,
      maxY: scene.bounds.maxY + pad
    }
  };
}
