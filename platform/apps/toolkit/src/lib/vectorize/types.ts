// Vectorize engine — shared types. Pure data, no DOM: the whole engine runs on
// typed arrays so it can be numerically self-tested in Node (see verify.ts) and
// run on the main thread in the browser.

// A minimal, ImageData-compatible bag of RGBA pixels. We type against this shape
// (not the DOM `ImageData`) so the engine is usable under Node for the self-test.
export interface RGBA {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Pt {
  x: number;
  y: number;
}

// SVG-style path commands. We keep an explicit command list (rather than a raw
// `d` string) so the same geometry can be serialised to SVG *and* flattened for
// DXF, and so the preview can draw node handles.
export type Cmd =
  | { c: "M"; x: number; y: number }
  | { c: "L"; x: number; y: number }
  | { c: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: "Z" };

export interface SubPath {
  cmds: Cmd[];
  closed: boolean;
}

// One drawing layer = one SVG <path>. Filled layers (outline / colour) carry a
// fill; stroked layers (centreline) carry a stroke + width.
export interface Layer {
  kind: "fill" | "stroke";
  color: string;
  width?: number; // stroke width, in output (original-image) px — stroke layers only
  subpaths: SubPath[];
}

// Two top-level modes for the vectorising process:
//   outline → STROKED paths (line work). Method = centreline (one line down the
//             middle of each stroke) or contour (stroke the boundary of the ink).
//   fill    → SOLID filled shapes. Style = mono (one colour) or colour (posterised
//             multi-layer).
export type TraceMode = "outline" | "fill";
export type OutlineMethod = "centreline" | "contour";
export type FillStyle = "mono" | "colour";

export interface TraceOptions {
  mode: TraceMode;
  outlineMethod: OutlineMethod;
  fillStyle: FillStyle;
  // Working→original-pixel multiplier. The engine traces at a (possibly
  // downscaled) working resolution for speed, then bakes this factor into every
  // coordinate so the result is in original-image pixels.
  scale: number;

  // ── binarisation ──
  blur: number; // pre-blur radius (working px) — knock back grain/noise; 0 = off
  autoThreshold: boolean; // Otsu global threshold (ignores `threshold`)
  threshold: number; // 0..255 manual global threshold
  adaptive: boolean; // local-mean threshold (overrides global) — for uneven scans
  adaptiveRadius: number; // local window radius (working px)
  adaptiveBias: number; // local-mean bias (higher = stricter)
  invert: boolean; // treat light as ink (white-on-black scans)

  // ── cleanup ──
  morph: number; // signed: >0 close (bridge gaps), <0 open (drop specks/fuzz)
  despeckle: number; // drop connected components smaller than this (working px²)
  holeArea: number; // drop loops/holes with area below this (working px²)

  // ── shape ──
  detail: number; // RDP tolerance in working px (0 = keep every pixel step)
  smooth: number; // 0..1 curve smoothing (0 = straight polylines)
  corner: number; // corner angle threshold in degrees — sharper turns stay hard
  minLength: number; // centreline: drop paths shorter than this (working px)

  // ── colours / styling ──
  colors: number; // colour fill: palette size (2..12)
  fill: string; // fill colour, mono fill
  stroke: string; // stroke colour, outline mode
  strokeWidth: number; // stroke width in working px, outline mode
}

export interface TraceStats {
  subpaths: number;
  nodes: number;
  regions: number;
}

export interface TraceResult {
  layers: Layer[];
  width: number; // original-image px
  height: number; // original-image px
  stats: TraceStats;
  threshold: number; // the threshold actually used (handy when auto/Otsu)
}
