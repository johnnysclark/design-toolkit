// Numeric self-test for the vectorize engine. There is no test runner in the
// repo, so this compiles to CommonJS and runs under node (see the command in the
// build notes). It checks each algorithm on synthetic shapes with hand-derived
// expectations, then throws if anything regresses.

import { binarize, despeckle, otsu, toGray } from "./binarize";
import { quantize } from "./color";
import { skeletonPaths, thinZhangSuen } from "./centreline";
import { fitPath } from "./fit";
import { traceLoops } from "./outline";
import { polygonArea, rdp, rdpClosed } from "./simplify";
import { toDXF } from "./dxf";
import { toSVG } from "./svg";
import { trace } from "./trace";
import type { Cmd, RGBA, TraceOptions } from "./types";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean): void {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
  cond ? pass++ : fail++;
}
function eq(name: string, got: number, exp: number): void {
  ok(`${name} (got ${got}, exp ${exp})`, got === exp);
}
function approx(name: string, got: number, exp: number, tol: number): void {
  ok(`${name} (got ${got.toFixed(3)}, exp ${exp}±${tol})`, Math.abs(got - exp) <= tol);
}

// ── helpers ──────────────────────────────────────────────────────────────────
function mask(w: number, h: number, on: (x: number, y: number) => boolean): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) m[y * w + x] = 1;
  return m;
}
function img(w: number, h: number, ink: (x: number, y: number) => boolean): RGBA {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const v = ink(x, y) ? 0 : 255;
      data[o] = v;
      data[o + 1] = v;
      data[o + 2] = v;
      data[o + 3] = 255;
    }
  return { data, width: w, height: h };
}
function sum(a: Uint8Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s;
}
function countCmd(cmds: Cmd[], c: Cmd["c"]): number {
  let n = 0;
  for (const k of cmds) if (k.c === c) n++;
  return n;
}

// ── Otsu + binarize ──────────────────────────────────────────────────────────
{
  const g = new Uint8Array(2000);
  for (let i = 0; i < 1000; i++) g[i] = 30;
  for (let i = 1000; i < 2000; i++) g[i] = 220;
  const t = otsu(g);
  ok(`otsu between modes (${t})`, t >= 30 && t <= 219);
  const b = binarize(g, t, false);
  eq("binarize ink count (dark)", sum(b), 1000);
  const bi = binarize(g, t, true);
  eq("binarize ink count (invert)", sum(bi), 1000);
  ok("binarize invert is complement", sum(b) + sum(bi) === 2000);
}

// ── despeckle ────────────────────────────────────────────────────────────────
{
  // A 4×4 blob plus a lone speck.
  const w = 12;
  const h = 8;
  const m = mask(w, h, (x, y) => (x >= 1 && x <= 4 && y >= 1 && y <= 4) || (x === 9 && y === 6));
  const { bin, regions } = despeckle(m, w, h, 4);
  eq("despeckle regions kept", regions, 1);
  eq("despeckle removed the speck", sum(bin), 16);
}

// ── RDP ──────────────────────────────────────────────────────────────────────
{
  const line = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 }
  ];
  eq("rdp collapses a straight run", rdp(line, 0.5).length, 2);
  const elbow = [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 5, y: 5 }
  ];
  eq("rdp keeps a real corner", rdp(elbow, 0.5).length, 3);
}

// ── outline: boundary-edge loop tracing ──────────────────────────────────────
{
  // Single 4×3 rectangle of ink.
  const w = 6;
  const h = 5;
  const m = mask(w, h, (x, y) => x >= 1 && x <= 4 && y >= 1 && y <= 3);
  const loops = traceLoops(m, w, h);
  eq("outline: one loop for a rectangle", loops.length, 1);
  approx("outline: rectangle area", Math.abs(polygonArea(loops[0])), 12, 0.001);
  eq("outline: rectangle simplifies to 4 corners", rdpClosed(loops[0], 1).length, 4);
}
{
  // 7×7 block with a 3×3 hole → outer loop + hole loop, opposite winding.
  const w = 9;
  const h = 9;
  const m = mask(
    w,
    h,
    (x, y) => x >= 1 && x <= 7 && y >= 1 && y <= 7 && !(x >= 3 && x <= 5 && y >= 3 && y <= 5)
  );
  const loops = traceLoops(m, w, h);
  eq("outline: ring has two loops", loops.length, 2);
  const areas = loops.map((l) => polygonArea(l)).sort((a, b) => Math.abs(b) - Math.abs(a));
  approx("outline: outer area", Math.abs(areas[0]), 49, 0.001);
  approx("outline: hole area", Math.abs(areas[1]), 9, 0.001);
  ok("outline: hole winds opposite the outer", Math.sign(areas[0]) !== Math.sign(areas[1]));
}
{
  // Pinch: two ink pixels touching corner-to-corner must give two simple loops,
  // never one self-crossing figure-eight.
  const m = mask(2, 2, (x, y) => (x === 0 && y === 0) || (x === 1 && y === 1));
  const loops = traceLoops(m, 2, 2);
  eq("outline: diagonal pinch → two loops", loops.length, 2);
  ok("outline: each pinch loop is a unit square", loops.every((l) => l.length === 4));
}

// ── thinning + skeleton walking ──────────────────────────────────────────────
{
  // 8×3 ink bar → a ~1px medial line.
  const w = 12;
  const h = 6;
  const bar = mask(w, h, (x, y) => x >= 2 && x <= 9 && y >= 2 && y <= 4);
  const skel = thinZhangSuen(bar, w, h);
  ok(`thinning reduces mass (${sum(bar)}→${sum(skel)})`, sum(skel) < sum(bar) && sum(skel) <= 10);
  const paths = skeletonPaths(skel, w, h, 0);
  eq("skeleton of a bar is one path", paths.length, 1);
  ok("skeleton path spans the bar", paths[0].length >= 5);
}
{
  // A clean diagonal line (no junctions) → exactly one path. This is the case
  // that matters most for Make2D line work.
  const w = 12;
  const diag = mask(w, w, (x, y) => x === y && x >= 1 && x <= 10);
  const dpaths = skeletonPaths(diag, w, w, 0);
  eq("skeleton of a clean diagonal is one path", dpaths.length, 1);
}
{
  // 1px plus sign → a degree-4 crossing. 8-connectivity inflates the centre into
  // a small high-degree cluster, so we assert the topology (≥4 branches reach the
  // four arms) rather than an exact fragment count.
  const w = 9;
  const h = 9;
  const plus = mask(w, h, (x, y) => (x === 4 && y >= 1 && y <= 7) || (y === 4 && x >= 1 && x <= 7));
  const paths = skeletonPaths(plus, w, h, 0);
  ok(`skeleton of a plus has ≥4 branches (${paths.length})`, paths.length >= 4);
  const endpoints = [
    { x: 4, y: 1 },
    { x: 4, y: 7 },
    { x: 1, y: 4 },
    { x: 7, y: 4 }
  ];
  const reached = endpoints.filter((ep) =>
    paths.some((p) => p.some((q) => q.x === ep.x && q.y === ep.y))
  ).length;
  eq("skeleton of a plus reaches all four arm tips", reached, 4);
}

// ── curve fitting ────────────────────────────────────────────────────────────
{
  const lineOpen = fitPath([{ x: 0, y: 0 }, { x: 10, y: 0 }], false, 1, Math.PI / 3);
  ok("fit: 2-pt open → M+L", countCmd(lineOpen, "M") === 1 && countCmd(lineOpen, "L") === 1);
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 }
  ];
  const sq = fitPath(square, true, 1, Math.PI / 3); // 90° turns > 60° → all corners
  ok("fit: sharp square stays straight + closed", countCmd(sq, "L") === 4 && countCmd(sq, "Z") === 1);
  // A regular octagon (45° turns < 60°) with smoothing → all cubic, closed.
  const oct: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    oct.push({ x: Math.cos(a) * 50, y: Math.sin(a) * 50 });
  }
  const fo = fitPath(oct, true, 1, Math.PI / 3);
  ok("fit: smooth octagon → cubics, no straight segs", countCmd(fo, "C") === 8 && countCmd(fo, "L") === 0);
  ok("fit: smooth octagon closed", countCmd(fo, "Z") === 1);
}

// ── colour quantisation ──────────────────────────────────────────────────────
{
  // Three flat colour bands.
  const w = 9;
  const h = 3;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const band = (x / 3) | 0;
      const col = band === 0 ? [240, 20, 20] : band === 1 ? [20, 200, 20] : [20, 20, 230];
      data[o] = col[0];
      data[o + 1] = col[1];
      data[o + 2] = col[2];
      data[o + 3] = 255;
    }
  const q = quantize({ data, width: w, height: h }, 3);
  eq("quantize: 3 palette colours", q.palette.length, 3);
  const labelsUsed = new Set(Array.from(q.labels));
  eq("quantize: 3 labels used", labelsUsed.size, 3);
}

// ── end-to-end trace + serialisers ───────────────────────────────────────────
function baseOpts(over: Partial<TraceOptions>): TraceOptions {
  return {
    mode: "outline",
    scale: 1,
    threshold: 128,
    autoThreshold: true,
    invert: false,
    despeckle: 2,
    detail: 1,
    smooth: 1,
    corner: 60,
    minLength: 2,
    colors: 6,
    fill: "#111111",
    stroke: "#111111",
    strokeWidth: 1.5,
    ...over
  };
}
{
  // Filled disk → outline mode → at least one closed subpath.
  const w = 40;
  const h = 40;
  const disk = img(w, h, (x, y) => (x - 20) ** 2 + (y - 20) ** 2 <= 14 * 14);
  const r = trace(disk, baseOpts({ mode: "outline" }));
  ok("trace outline: produced subpaths", r.layers[0].subpaths.length >= 1);
  ok("trace outline: nodes counted", r.stats.nodes > 0);
  const svg = toSVG(r, "#ffffff");
  ok("toSVG: looks like svg", svg.startsWith("<svg") && svg.includes("<path") && svg.includes("fill-rule"));
  const dxf = toDXF(r, 0.5);
  ok("toDXF: has polylines + EOF", dxf.includes("LWPOLYLINE") && dxf.trimEnd().endsWith("EOF"));

  // Scale bakes into the output dimensions + coordinates.
  const r2 = trace(disk, baseOpts({ mode: "outline", scale: 2 }));
  eq("trace: scale bakes width", r2.width, 80);
}
{
  // A cross of strokes → centreline mode → stroked layer with multiple paths.
  const w = 40;
  const h = 40;
  const cross = img(w, h, (x, y) => (Math.abs(x - 20) <= 1 && y >= 5 && y <= 35) || (Math.abs(y - 20) <= 1 && x >= 5 && x <= 35));
  const r = trace(cross, baseOpts({ mode: "centreline", minLength: 3 }));
  ok("trace centreline: stroke layer", r.layers[0].kind === "stroke");
  ok("trace centreline: produced strokes", r.layers[0].subpaths.length >= 1);
}

// ── summary ──────────────────────────────────────────────────────────────────
console.log(`\n${pass}/${pass + fail} checks passed`);
if (fail > 0) throw new Error(`${fail} vectorize self-test(s) failed`);
