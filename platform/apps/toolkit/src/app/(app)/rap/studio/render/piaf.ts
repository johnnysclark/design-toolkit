// ─────────────────────────────────────────────────────────────────────────────
// PIAF export — rasterise the SAME plan model the on-screen SVG uses to a
// 1-bit (pure black/white) PNG at the swell-paper density touch reads best.
// On real PIAF microcapsule paper, every black pixel becomes a raised ridge,
// so a clean 1-bit image is exactly the deliverable. Client-side via <canvas>.
// ─────────────────────────────────────────────────────────────────────────────

import { buildPlanModel, PLAN_WEIGHTS } from "./planModel";
import type { State } from "../engine/types";

const WEIGHT_FT = PLAN_WEIGHTS;

/** Draw the plan to a canvas, then threshold to a crisp 1-bit black/white. */
export function buildPiafCanvas(state: State, pxWidth = 1700, levelFilter: number | null = null): HTMLCanvasElement {
  const { prims, bounds } = buildPlanModel(state, levelFilter);
  const { minX, minY, maxX, maxY } = bounds;
  const worldW = Math.max(1, maxX - minX);
  const worldH = Math.max(1, maxY - minY);
  const scale = pxWidth / worldW;
  const W = Math.round(pxWidth);
  const H = Math.round(worldH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const X = (x: number) => (x - minX) * scale;
  const Y = (y: number) => (minY + maxY - y - minY) * scale; // flip Y (north-up)

  for (const p of prims) {
    if (p.kind === "line") {
      ctx.lineWidth = Math.max(1.5, (p.widthFt ?? WEIGHT_FT[p.weight]) * scale);
      ctx.setLineDash(p.dash ? p.dash.map((dd) => dd * scale) : p.dashed ? [3 * scale, 2 * scale] : []);
      ctx.beginPath();
      p.pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(X(pt.x), Y(pt.y)) : ctx.lineTo(X(pt.x), Y(pt.y))));
      ctx.stroke();
    } else if (p.kind === "tactileDot") {
      // Filled relief dot, floored so a thin pattern dot survives the 1-bit threshold.
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(X(p.c.x), Y(p.c.y), Math.max(1.5, p.r * scale), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "fill") {
      ctx.setLineDash([]);
      ctx.beginPath();
      p.pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(X(pt.x), Y(pt.y)) : ctx.lineTo(X(pt.x), Y(pt.y))));
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === "circle") {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(X(p.c.x), Y(p.c.y), Math.max(1, p.r * scale), 0, Math.PI * 2);
      if (p.fill) ctx.fill();
      else {
        ctx.lineWidth = Math.max(1.5, WEIGHT_FT.light * scale);
        ctx.stroke();
      }
    } else if (p.kind === "text") {
      ctx.setLineDash([]);
      const px = Math.max(11, p.size * scale);
      ctx.font = `${px}px ${p.braille ? "'Apple Braille','Segoe UI Symbol',monospace" : "'IBM Plex Mono',monospace"}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = p.anchor === "middle" ? "center" : "left";
      ctx.fillText(p.text, X(p.at.x), Y(p.at.y));
    }
  }

  // Threshold to true 1-bit: any non-white pixel → black.
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = lum < 200 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function piafPngDataUrl(state: State, pxWidth = 1700): string {
  return buildPiafCanvas(state, pxWidth).toDataURL("image/png");
}
