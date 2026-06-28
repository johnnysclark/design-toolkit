// Orchestrator — RGBA image + options → vector result.
//
// Pipeline:  gray → [pre-blur] → threshold (global / Otsu / adaptive) →
//            [morphology: open/close] → despeckle → trace.
//
// Two modes:
//   outline → STROKED paths.  method "centreline" (Zhang–Suen medial axis, one
//             line per stroke) or "contour" (boundary loops, stroked).
//   fill    → SOLID paths.    style "mono" (one fill) or "colour" (median-cut
//             posterise → one filled layer per colour).

import { adaptiveBinarize, binarize, despeckle, otsu, toGray } from "./binarize";
import { blurChannel, blurRGBA } from "./blur";
import { quantize, rgbToHex } from "./color";
import { skeletonPaths, thinZhangSuen } from "./centreline";
import { fitPath } from "./fit";
import { morph } from "./morph";
import { traceLoops } from "./outline";
import { rdp, rdpClosed } from "./simplify";
import type { Cmd, Layer, SubPath, TraceOptions, TraceResult } from "./types";

function scaleCmd(c: Cmd, s: number): Cmd {
  switch (c.c) {
    case "M":
      return { c: "M", x: c.x * s, y: c.y * s };
    case "L":
      return { c: "L", x: c.x * s, y: c.y * s };
    case "C":
      return { c: "C", x1: c.x1 * s, y1: c.y1 * s, x2: c.x2 * s, y2: c.y2 * s, x: c.x * s, y: c.y * s };
    default:
      return { c: "Z" };
  }
}

function anchorCount(cmds: Cmd[]): number {
  let n = 0;
  for (const c of cmds) if (c.c !== "Z") n++;
  return n;
}

function statsOf(layers: Layer[], regions: number): TraceResult["stats"] {
  let subpaths = 0;
  let nodes = 0;
  for (const l of layers) {
    for (const sp of l.subpaths) {
      subpaths++;
      nodes += anchorCount(sp.cmds);
    }
  }
  return { subpaths, nodes, regions };
}

// gray → clean binary ink mask, plus the threshold actually used (−1 = adaptive).
function preprocess(
  gray: Uint8Array,
  w: number,
  h: number,
  opts: TraceOptions
): { bin: Uint8Array; regions: number; threshold: number } {
  const g = opts.blur > 0 ? blurChannel(gray, w, h, opts.blur) : gray;
  let bin: Uint8Array;
  let threshold: number;
  if (opts.adaptive) {
    bin = adaptiveBinarize(g, w, h, opts.adaptiveRadius, opts.adaptiveBias, opts.invert);
    threshold = -1;
  } else {
    threshold = opts.autoThreshold ? otsu(g) : opts.threshold;
    bin = binarize(g, threshold, opts.invert);
  }
  if (opts.morph !== 0) bin = morph(bin, w, h, opts.morph);
  const dsp = despeckle(bin, w, h, Math.max(1, Math.round(opts.despeckle)));
  return { bin: dsp.bin, regions: dsp.regions, threshold };
}

// Boundary loops of a mask → simplified + fitted CLOSED subpaths. Loops with area
// below `holeArea` (tiny holes, leftover nibs) are dropped. Shared by fill-mono,
// fill-colour and outline-contour (the last strokes them instead of filling).
function loopSubpaths(bin: Uint8Array, w: number, h: number, opts: TraceOptions): SubPath[] {
  const cornerRad = (opts.corner * Math.PI) / 180;
  const minArea = Math.max(0, opts.holeArea);
  const out: SubPath[] = [];
  for (const loop of traceLoops(bin, w, h)) {
    const simp = rdpClosed(loop, opts.detail);
    if (simp.length < 3) continue;
    let area = 0;
    for (let i = 0, j = simp.length - 1; i < simp.length; j = i++) {
      area += (simp[j].x + simp[i].x) * (simp[j].y - simp[i].y);
    }
    if (Math.abs(area / 2) < minArea) continue;
    const cmds = fitPath(simp, true, opts.smooth, cornerRad).map((c) => scaleCmd(c, opts.scale));
    if (cmds.length >= 2) out.push({ cmds, closed: true });
  }
  return out;
}

export function trace(
  img: { data: Uint8ClampedArray; width: number; height: number },
  opts: TraceOptions
): TraceResult {
  const w = img.width;
  const h = img.height;
  const s = opts.scale;
  const cornerRad = (opts.corner * Math.PI) / 180;

  // ── Fill · colour — quantise RGB, trace each band as its own filled layer ──
  if (opts.mode === "fill" && opts.fillStyle === "colour") {
    const src = opts.blur > 0 ? blurRGBA(img, opts.blur) : img;
    const k = Math.max(2, Math.min(12, Math.round(opts.colors)));
    const { palette, labels } = quantize(src, k);
    const n = w * h;
    const scored: { layer: Layer; coverage: number }[] = [];
    for (let pi = 0; pi < palette.length; pi++) {
      let mask: Uint8Array = new Uint8Array(n);
      let coverage = 0;
      for (let i = 0; i < n; i++) {
        if (labels[i] === pi) {
          mask[i] = 1;
          coverage++;
        }
      }
      if (coverage === 0) continue;
      if (opts.morph !== 0) mask = morph(mask, w, h, opts.morph);
      const dsp = despeckle(mask, w, h, Math.max(1, Math.round(opts.despeckle)));
      const subpaths = loopSubpaths(dsp.bin, w, h, opts);
      if (subpaths.length === 0) continue;
      scored.push({ layer: { kind: "fill", color: rgbToHex(palette[pi]), subpaths }, coverage });
    }
    scored.sort((a, b) => b.coverage - a.coverage); // biggest areas first
    const layers = scored.map((l) => l.layer);
    return { layers, width: w * s, height: h * s, stats: statsOf(layers, layers.length), threshold: -1 };
  }

  const gray = toGray(img);
  const pre = preprocess(gray, w, h, opts);

  // ── Outline · centreline — medial axis → one stroked path per stroke ──
  if (opts.mode === "outline" && opts.outlineMethod === "centreline") {
    const skel = thinZhangSuen(pre.bin, w, h);
    const subpaths: SubPath[] = [];
    for (const poly of skeletonPaths(skel, w, h, opts.minLength)) {
      const simp = rdp(poly, opts.detail);
      const cmds = fitPath(simp, false, opts.smooth, cornerRad).map((c) => scaleCmd(c, s));
      if (cmds.length >= 2) subpaths.push({ cmds, closed: false });
    }
    const layer: Layer = { kind: "stroke", color: opts.stroke, width: Math.max(0.2, opts.strokeWidth * s), subpaths };
    return { layers: [layer], width: w * s, height: h * s, stats: statsOf([layer], pre.regions), threshold: pre.threshold };
  }

  // ── Outline · contour — boundary loops, STROKED ──
  if (opts.mode === "outline") {
    const subpaths = loopSubpaths(pre.bin, w, h, opts);
    const layer: Layer = { kind: "stroke", color: opts.stroke, width: Math.max(0.2, opts.strokeWidth * s), subpaths };
    return { layers: [layer], width: w * s, height: h * s, stats: statsOf([layer], pre.regions), threshold: pre.threshold };
  }

  // ── Fill · mono — boundary loops, FILLED (holes via even-odd) ──
  const subpaths = loopSubpaths(pre.bin, w, h, opts);
  const layer: Layer = { kind: "fill", color: opts.fill, subpaths };
  return { layers: [layer], width: w * s, height: h * s, stats: statsOf([layer], pre.regions), threshold: pre.threshold };
}
