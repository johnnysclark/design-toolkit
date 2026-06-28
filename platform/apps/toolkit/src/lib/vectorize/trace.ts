// Orchestrator — RGBA image + options → vector result. The three modes share the
// same binarise / simplify / fit machinery; they differ only in how the ink is
// turned into paths (region boundary, medial axis, or per-colour boundary).

import { binarize, despeckle, otsu, toGray } from "./binarize";
import { quantize, rgbToHex } from "./color";
import { skeletonPaths, thinZhangSuen } from "./centreline";
import { fitPath } from "./fit";
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
      return {
        c: "C",
        x1: c.x1 * s,
        y1: c.y1 * s,
        x2: c.x2 * s,
        y2: c.y2 * s,
        x: c.x * s,
        y: c.y * s
      };
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

// Outline of a single mask → filled subpaths (closed). Shared by outline + colour.
function fillSubpaths(
  bin: Uint8Array,
  w: number,
  h: number,
  opts: TraceOptions
): SubPath[] {
  const cornerRad = (opts.corner * Math.PI) / 180;
  const minArea = Math.max(1, opts.minLength * opts.minLength * 0.25);
  const out: SubPath[] = [];
  for (const loop of traceLoops(bin, w, h)) {
    const simp = rdpClosed(loop, opts.detail);
    if (simp.length < 3) continue;
    // Drop loops whose area is negligible (tiny holes / leftover nibs).
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

export function trace(img: { data: Uint8ClampedArray; width: number; height: number }, opts: TraceOptions): TraceResult {
  const w = img.width;
  const h = img.height;
  const s = opts.scale;
  const gray = toGray(img);
  const threshold = opts.autoThreshold ? otsu(gray) : opts.threshold;
  const cornerRad = (opts.corner * Math.PI) / 180;

  if (opts.mode === "centreline") {
    const bin0 = binarize(gray, threshold, opts.invert);
    const dsp = despeckle(bin0, w, h, Math.max(1, Math.round(opts.despeckle)));
    const skel = thinZhangSuen(dsp.bin, w, h);
    const subpaths: SubPath[] = [];
    for (const poly of skeletonPaths(skel, w, h, opts.minLength)) {
      const simp = rdp(poly, opts.detail);
      const cmds = fitPath(simp, false, opts.smooth, cornerRad).map((c) => scaleCmd(c, s));
      if (cmds.length >= 2) subpaths.push({ cmds, closed: false });
    }
    const layer: Layer = {
      kind: "stroke",
      color: opts.stroke,
      width: Math.max(0.2, opts.strokeWidth * s),
      subpaths
    };
    return { layers: [layer], width: w * s, height: h * s, stats: statsOf([layer], dsp.regions), threshold };
  }

  if (opts.mode === "color") {
    const k = Math.max(2, Math.min(12, Math.round(opts.colors)));
    const { palette, labels } = quantize(img, k);
    const n = w * h;
    const layers: { layer: Layer; coverage: number }[] = [];
    for (let pi = 0; pi < palette.length; pi++) {
      const mask = new Uint8Array(n);
      let coverage = 0;
      for (let i = 0; i < n; i++) {
        if (labels[i] === pi) {
          mask[i] = 1;
          coverage++;
        }
      }
      if (coverage === 0) continue;
      const dsp = despeckle(mask, w, h, Math.max(1, Math.round(opts.despeckle)));
      const subpaths = fillSubpaths(dsp.bin, w, h, opts);
      if (subpaths.length === 0) continue;
      layers.push({ layer: { kind: "fill", color: rgbToHex(palette[pi]), subpaths }, coverage });
    }
    // Paint biggest areas first so fine detail lands on top.
    layers.sort((a, b) => b.coverage - a.coverage);
    const ls = layers.map((l) => l.layer);
    return { layers: ls, width: w * s, height: h * s, stats: statsOf(ls, ls.length), threshold };
  }

  // outline (black-on-white fill)
  const bin0 = binarize(gray, threshold, opts.invert);
  const dsp = despeckle(bin0, w, h, Math.max(1, Math.round(opts.despeckle)));
  const subpaths = fillSubpaths(dsp.bin, w, h, opts);
  const layer: Layer = { kind: "fill", color: opts.fill, subpaths };
  return { layers: [layer], width: w * s, height: h * s, stats: statsOf([layer], dsp.regions), threshold };
}
