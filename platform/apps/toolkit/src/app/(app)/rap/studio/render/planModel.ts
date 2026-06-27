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

import { applyTransform, deriveGeometry, type PhaseEmphasis, type PhaseView, type Pt, type Transform } from "../engine/geometry";
import type { LineType, State, TactilePattern } from "../engine/types";

export type DrawPrim =
  // `dash` (explicit ft dash array from a linetype) and `widthFt` (explicit stroke
  // from a layer lineweight) override the named-weight defaults when present.
  | { kind: "line"; pts: Pt[]; weight: "light" | "heavy" | "corridor"; dashed?: boolean; dash?: number[]; widthFt?: number }
  | { kind: "fill"; pts: Pt[] } // filled black polygon (walls)
  | { kind: "circle"; c: Pt; r: number; fill: boolean }
  | { kind: "tactileDot"; c: Pt; r: number } // filled relief dot (raised on PIAF/STL)
  | { kind: "text"; at: Pt; text: string; size: number; braille?: boolean; anchor?: "start" | "middle" };

export interface PlanModel {
  prims: DrawPrim[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Stroke weights in FEET, shared by the on-screen SVG and the PIAF raster so
 *  screen == print. (Deliberately not derived from state.style.*_lineweight_mm,
 *  which is the desktop Rhino renderer's mm scale — a different ratio.) */
export const PLAN_WEIGHTS = { light: 0.18, heavy: 0.55, corridor: 0.3 } as const;

// ── Tactile + layer-style scales (shared by SVG, PIAF and STL for parity) ─────

// mm → plan-feet display scale. PINNED by contract (spacing_mm * 0.0328). This is
// a tactile-display scale (≈10× the literal mm→ft of 0.00328) so a 4 mm pitch
// reads ~0.13 ft on the sheet. STL reuses it for lateral tiling so dot/ridge
// POSITIONS coincide between plan and print.
export const MM_TO_PLAN_FT = 0.0328;

// Linetype → dash array in FEET. solid => undefined (continuous).
export const LINE_DASH: Record<LineType, number[] | undefined> = {
  solid: undefined,
  dashed: [3, 2],
  dotted: [0.6, 1.2],
  center: [4, 1, 1, 1],
  hidden: [1.5, 1]
};

// Lineweight mm → plan stroke ft, clamped to the light pen.
export const weightToFt = (lineweight_mm: number) => Math.max(PLAN_WEIGHTS.light, lineweight_mm * 0.04);

// A reserved dash a finger reads as "reference / context" — distinct from the
// linetype dashes (dashed 3,2 · dotted 0.6,1.2 · hidden 1.5,1). A reference phase
// is NEVER dimmed or shrunk in relief (PIAF is 1-bit; STL relief = real height);
// instead its FILLS become hollow outlines and its lines take this dash, so the
// focus phase reads as solid figure and the others as hollow ground.
export const REF_DASH = [1.0, 1.0];

/** Push an element's primitives with its phase emphasis applied. Focus → as-is.
 *  Reference → fills become dashed outlines, lines take the reference dash, and
 *  tactile dots + text labels are dropped (hollow context, no false relief). */
function pushEmph(out: DrawPrim[], local: DrawPrim[], emphasis: PhaseEmphasis) {
  if (emphasis === "focus") {
    out.push(...local);
    return;
  }
  for (const p of local) {
    if (p.kind === "fill") {
      out.push({ kind: "line", weight: "light", dash: REF_DASH, pts: [...p.pts, p.pts[0]] });
    } else if (p.kind === "line") {
      out.push({ ...p, weight: "light", dashed: undefined, dash: REF_DASH });
    } else if (p.kind === "circle") {
      out.push({ ...p, fill: false });
    }
    // tactileDot + text are intentionally dropped for reference geometry.
  }
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

/** Clip an infinite line (point P, unit dir d) to an axis-aligned rect → the
 *  in-rect segment, or null. Liang–Barsky. Exported so the STL relief reuses the
 *  exact same clip, keeping ridge positions spatially identical to the plan. */
export function clipLineToRect(P: Pt, d: Pt, r: { x: number; y: number; w: number; h: number }): [Pt, Pt] | null {
  let t0 = -1e9;
  let t1 = 1e9;
  const p = [-d.x, d.x, -d.y, d.y];
  const q = [P.x - r.x, r.x + r.w - P.x, P.y - r.y, r.y + r.h - P.y];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  if (t0 > t1) return null;
  return [
    { x: P.x + d.x * t0, y: P.y + d.y * t0 },
    { x: P.x + d.x * t1, y: P.y + d.y * t1 }
  ];
}

/** Emit one TactilePattern clipped to a region footprint rect, using its resolved
 *  layer stroke. dots → a plain grid of relief dots (angle ignored, per contract);
 *  lines/crosshatch/grid → parallel ridges swept across the rect at the angle(s). */
function emitTactile(prims: DrawPrim[], r: { x: number; y: number; w: number; h: number }, tac: TactilePattern, lineweight_mm: number) {
  if (!tac || tac.pattern === "none") return;
  const pitch = Math.max(0.05, tac.spacing_mm * MM_TO_PLAN_FT);
  const stroke = weightToFt(lineweight_mm);

  if (tac.pattern === "dots") {
    const rad = pitch * 0.18;
    for (let gx = r.x + pitch / 2; gx <= r.x + r.w - rad; gx += pitch)
      for (let gy = r.y + pitch / 2; gy <= r.y + r.h - rad; gy += pitch) prims.push({ kind: "tactileDot", c: { x: gx, y: gy }, r: rad });
    return;
  }
  // line families: pick the angle set, then sweep parallels across the rect.
  const angles = tac.pattern === "grid" ? [0, 90] : tac.pattern === "crosshatch" ? [tac.angle_deg, tac.angle_deg + 90] : [tac.angle_deg];
  for (const deg of angles) {
    const a = (deg * Math.PI) / 180;
    const d = { x: Math.cos(a), y: Math.sin(a) }; // line direction
    const n = { x: -Math.sin(a), y: Math.cos(a) }; // sweep normal
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    // project the 4 corners onto n to bound the sweep
    const offs = [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x + r.w, r.y + r.h],
      [r.x, r.y + r.h]
    ].map(([x, y]) => (x - cx) * n.x + (y - cy) * n.y);
    const lo = Math.min(...offs);
    const hi = Math.max(...offs);
    for (let o = lo + pitch / 2; o < hi; o += pitch) {
      const P = { x: cx + n.x * o, y: cy + n.y * o };
      const seg = clipLineToRect(P, d, r);
      if (seg) prims.push({ kind: "line", pts: seg, weight: "light", widthFt: stroke });
    }
  }
}

export function buildPlanModel(state: State, levelFilter: number | null = null, view: PhaseView | null = null): PlanModel {
  const scene = deriveGeometry(state, levelFilter, view);
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
    const bp: DrawPrim[] = []; // collect this bay's prims, then apply its phase emphasis

    // Grid (light).
    for (const g of bay.grid) {
      bp.push({ kind: "line", pts: [applyTransform(g.a, t), applyTransform(g.b, t)], weight: "light" });
    }

    // Corridor — dashed band edges (corridor weight).
    if (bay.corridor) {
      const c = bay.corridor.rect;
      if (bay.corridor.axis === "x") {
        bp.push({ kind: "line", pts: [applyTransform({ x: c.x, y: c.y }, t), applyTransform({ x: c.x + c.w, y: c.y }, t)], weight: "corridor", dashed: true });
        bp.push({ kind: "line", pts: [applyTransform({ x: c.x, y: c.y + c.h }, t), applyTransform({ x: c.x + c.w, y: c.y + c.h }, t)], weight: "corridor", dashed: true });
      } else {
        bp.push({ kind: "line", pts: [applyTransform({ x: c.x, y: c.y }, t), applyTransform({ x: c.x, y: c.y + c.h }, t)], weight: "corridor", dashed: true });
        bp.push({ kind: "line", pts: [applyTransform({ x: c.x + c.w, y: c.y }, t), applyTransform({ x: c.x + c.w, y: c.y + c.h }, t)], weight: "corridor", dashed: true });
      }
    }

    // Walls (filled black polygons).
    for (const wRect of bay.walls) {
      bp.push({ kind: "fill", pts: rectCorners(wRect.x, wRect.y, wRect.w, wRect.h, t) });
    }

    // Columns (filled squares — matches the 3D + STL box footprint, so a reader
    // feels the same shape on swell paper and in the print).
    for (const col of bay.columns) {
      bp.push({ kind: "fill", pts: rectCorners(col.x - col.r, col.y - col.r, col.r * 2, col.r * 2, t) });
    }

    // Door swings (leaf + arc).
    for (const d of bay.doors) {
      bp.push({ kind: "line", pts: [applyTransform(d.hinge, t), applyTransform(d.leafEnd, t)], weight: "heavy" });
      bp.push({ kind: "line", pts: arcPolyline(d.hinge, d.radius, d.a0, d.a1, t), weight: "light" });
    }

    // Window / portal marks across the opening.
    for (const o of bay.openings) {
      if (o.kind === "window") {
        // double line to read as glazing
        const mid = { x: (o.a.x + o.b.x) / 2, y: (o.a.y + o.b.y) / 2 };
        bp.push({ kind: "line", pts: [applyTransform(o.a, t), applyTransform(o.b, t)], weight: "heavy" });
        bp.push({ kind: "circle", c: applyTransform(mid, t), r: 0.6, fill: false });
      }
      // portals are left fully open (no mark)
    }

    // Label + braille, just below the bay.
    const lp = applyTransform({ x: bay.label.x, y: bay.label.y }, t);
    bp.push({ kind: "text", at: lp, text: bay.label.text, size: 2.4 });
    bp.push({ kind: "text", at: { x: lp.x, y: lp.y - 3 }, text: bay.label.braille, size: 3.2, braille: true });

    pushEmph(prims, bp, bay.emphasis);
  }

  // Geometric regions — footprint outline (linetype/lineweight from the layer),
  // box gets an inset double-outline to read as a solid volume, plus any tactile
  // pattern clipped to the footprint.
  for (const rg of scene.regions) {
    const rp: DrawPrim[] = [];
    const dash = LINE_DASH[rg.style.linetype];
    const widthFt = weightToFt(rg.style.lineweight_mm);
    const rect = { x: rg.x, y: rg.y, w: rg.w, h: rg.h };
    const outline = (rr: { x: number; y: number; w: number; h: number }) =>
      rp.push({
        kind: "line",
        widthFt,
        dash,
        weight: "light",
        pts: [
          { x: rr.x, y: rr.y },
          { x: rr.x + rr.w, y: rr.y },
          { x: rr.x + rr.w, y: rr.y + rr.h },
          { x: rr.x, y: rr.y + rr.h },
          { x: rr.x, y: rr.y }
        ]
      });
    outline(rect);
    if (rg.kind === "box") {
      const ins = Math.min(2, rg.w / 6, rg.h / 6);
      outline({ x: rg.x + ins, y: rg.y + ins, w: rg.w - 2 * ins, h: rg.h - 2 * ins });
    }
    // Tactile texture only reads on the focused (figure) phase; a reference ghost
    // carries no relief (it would lie about depth on PIAF/STL).
    if (rg.emphasis === "focus" && rg.style.tactile) emitTactile(rp, rect, rg.style.tactile, rg.style.lineweight_mm);
    pushEmph(prims, rp, rg.emphasis);
  }

  // Free walls — solid black chunks + door/window symbols.
  for (const fw of scene.freeWalls) {
    const wp: DrawPrim[] = [];
    for (const s of fw.solids) wp.push({ kind: "fill", pts: s.quad });
    for (const d of fw.doors) {
      wp.push({ kind: "line", pts: [d.hinge, d.leafEnd], weight: "heavy" });
      wp.push({ kind: "line", pts: arcPolyline(d.hinge, d.radius, d.a0, d.a1, { ox: 0, oy: 0, rot: 0 }), weight: "light" });
    }
    for (const win of fw.windows) {
      wp.push({ kind: "line", pts: [win.a, win.b], weight: "heavy" });
      wp.push({ kind: "circle", c: { x: (win.a.x + win.b.x) / 2, y: (win.a.y + win.b.y) / 2 }, r: 0.6, fill: false });
    }
    pushEmph(prims, wp, fw.emphasis);
  }

  // Free columns (square footprint to match 3D + STL).
  const idT = { ox: 0, oy: 0, rot: 0 };
  for (const c of scene.freeColumns) {
    pushEmph(prims, [{ kind: "fill", pts: rectCorners(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size, idT) }], c.emphasis);
  }

  // Region labels (drawn last so outlines/tactile fill don't cover them). A box
  // annotates its extrusion height so a non-zero massing reads on a flat plan.
  for (const rg of scene.regions) {
    if (rg.emphasis !== "focus") continue; // reference regions read as hollow outline, no label pile-up
    const tag = rg.kind === "box" ? `${rg.name} (↑ ${rg.height} ft)` : rg.name;
    prims.push({ kind: "text", at: { x: rg.cx, y: rg.cy + 1.4 }, text: tag, size: 2.6, anchor: "middle" });
    prims.push({ kind: "text", at: { x: rg.cx, y: rg.cy - 2.4 }, text: rg.braille, size: 3, braille: true, anchor: "middle" });
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

  // Grow bounds to include label/braille glyph boxes — geometry-only bounds
  // would clip text on south/east-edge or rotated bays, and the braille key is
  // the primary non-visual deliverable. (Monospace ≈ 0.62 em advance.)
  let { minX, minY, maxX, maxY } = scene.bounds;
  for (const p of prims) {
    if (p.kind !== "text") continue;
    const w = p.text.length * p.size * 0.62;
    const x0 = p.anchor === "middle" ? p.at.x - w / 2 : p.at.x;
    const x1 = p.anchor === "middle" ? p.at.x + w / 2 : p.at.x + w;
    minX = Math.min(minX, x0);
    maxX = Math.max(maxX, x1);
    minY = Math.min(minY, p.at.y - p.size);
    maxY = Math.max(maxY, p.at.y + p.size);
  }
  const pad = 6;
  return { prims, bounds: { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad } };
}
