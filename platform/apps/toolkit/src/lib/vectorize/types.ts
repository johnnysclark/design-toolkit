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

export type TraceMode = "outline" | "centreline" | "color";

export interface TraceOptions {
  mode: TraceMode;
  // Working→original-pixel multiplier. The engine traces at a (possibly
  // downscaled) working resolution for speed, then bakes this factor into every
  // coordinate so the result is in original-image pixels.
  scale: number;
  threshold: number; // 0..255 — ink is darker than this (after optional invert)
  autoThreshold: boolean; // ignore `threshold`, use Otsu
  invert: boolean; // treat light as ink (e.g. white-on-black scans)
  despeckle: number; // drop connected components smaller than this (working px²)
  detail: number; // RDP tolerance in working px (0 = keep every pixel step)
  smooth: number; // 0..1 curve smoothing (0 = straight polylines)
  corner: number; // corner angle threshold in degrees — sharper turns stay hard
  minLength: number; // drop paths/loops shorter than this (working px)
  colors: number; // colour mode: palette size (2..12)
  fill: string; // fill colour, outline mode
  stroke: string; // stroke colour, centreline mode
  strokeWidth: number; // stroke width in working px, centreline mode
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
