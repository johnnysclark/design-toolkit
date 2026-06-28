// ─────────────────────────────────────────────────────────────────────────────
// Halftone & Riso — the engine. Pure pixel + screening math, no React, no JSX, so
// it is easy to reason about and is shared verbatim by the live preview, the
// full-resolution PNG export, the per-plate (per-ink) separation export, and the
// vector SVG export.
//
// The model mirrors how an AM (amplitude-modulated) halftone press actually
// works: the image is separated into one or more ink channels (coverage maps,
// 0..1), each channel is screened into a grid of dots — same ruling, its own
// screen angle — and the inked plates are over-printed with a multiply blend
// onto the paper. Risograph is the same machine with spot inks, deliberate
// mis-registration and a little grain.
// ─────────────────────────────────────────────────────────────────────────────

export type SepMode = "mono" | "duotone" | "tritone" | "cmyk";
export type DotShape = "circle" | "ellipse" | "diamond" | "square" | "line" | "cross";

export interface LayerCfg {
  ink: string; // hex
  angleDeg: number; // screen angle
  dx: number; // mis-registration, px at work resolution
  dy: number;
  on: boolean;
}

export interface Tone {
  brightness: number; // −100..100, additive
  contrast: number; // −100..100, classic factor
  gamma: number; // 0.3..3 (>1 brightens mids)
  invert: boolean;
}

export interface RenderParams {
  mode: SepMode;
  shape: DotShape;
  cell: number; // dot pitch / ruling, px
  gain: number; // dot-gain multiplier (≈0.6..1.5)
  crisp: boolean; // 1-bit (hard) dot edges, for true plates
  inkOpacity: number; // 0..1 per-plate ink strength
  gcr: number; // CMYK black generation, 0..1
  tone: Tone;
  paper: string; // hex
  grain: number; // 0..0.6
  grainSize: number; // px
  jitter: number; // registration jitter, px at work resolution
  layers: LayerCfg[];
}

const TWO_PI = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Deterministic PRNG (mulberry32) — stable grain / jitter across re-renders so
// the preview doesn't shimmer and the export matches what you saw.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ════════════════════════════ TONE + SEPARATION ═════════════════════════════

// Pre-screen tonal adjust (brightness / contrast / gamma / invert) applied to RGB
// before separation, so colour modes stay faithful. Returns a fresh RGBA buffer.
export function adjustRGB(src: Uint8ClampedArray, tone: Tone): Uint8ClampedArray {
  const { brightness, contrast, gamma, invert } = tone;
  const c = Math.max(-100, Math.min(100, contrast));
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const ig = 1 / Math.max(0.01, gamma);
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let v = factor * (i - 128) + 128 + brightness;
    v = Math.pow(Math.max(0, v) / 255, ig) * 255;
    if (invert) v = 255 - v;
    lut[i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  }
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    out[i] = lut[src[i]];
    out[i + 1] = lut[src[i + 1]];
    out[i + 2] = lut[src[i + 2]];
    out[i + 3] = 255;
  }
  return out;
}

// Split the (already tone-adjusted) RGBA into ink coverage maps (0..1 ink
// density), one Float32Array per channel, ordered to match the mode's layers.
export function separate(rgba: Uint8ClampedArray, w: number, h: number, mode: SepMode, gcr: number): Float32Array[] {
  const n = w * h;
  if (mode === "mono") {
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i << 2;
      const L = (rgba[o] * 0.299 + rgba[o + 1] * 0.587 + rgba[o + 2] * 0.114) / 255;
      d[i] = 1 - L;
    }
    return [d];
  }
  if (mode === "duotone") {
    // Two tonal plates over darkness — a "key" carrying the full range and an
    // "accent" biased to the shadows. Different inks + angles give the classic
    // two-colour over-print.
    const a = new Float32Array(n);
    const b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i << 2;
      const L = (rgba[o] * 0.299 + rgba[o + 1] * 0.587 + rgba[o + 2] * 0.114) / 255;
      const dk = 1 - L;
      a[i] = dk;
      b[i] = clamp01(Math.pow(dk, 1.25) * 1.04);
    }
    return [a, b];
  }
  if (mode === "tritone") {
    // CMY process without black — the bright, inky Riso look.
    const C = new Float32Array(n);
    const M = new Float32Array(n);
    const Y = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i << 2;
      C[i] = 1 - rgba[o] / 255;
      M[i] = 1 - rgba[o + 1] / 255;
      Y[i] = 1 - rgba[o + 2] / 255;
    }
    return [C, M, Y];
  }
  // CMYK process with under-colour removal (gcr pulls neutral density into K).
  const C = new Float32Array(n);
  const M = new Float32Array(n);
  const Y = new Float32Array(n);
  const K = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    let c = 1 - rgba[o] / 255;
    let m = 1 - rgba[o + 1] / 255;
    let y = 1 - rgba[o + 2] / 255;
    const k = Math.min(c, m, y) * gcr;
    c -= k;
    m -= k;
    y -= k;
    C[i] = c < 0 ? 0 : c;
    M[i] = m < 0 ? 0 : m;
    Y[i] = y < 0 ? 0 : y;
    K[i] = k < 0 ? 0 : k;
  }
  return [C, M, Y, K];
}

export const CHANNEL_LABELS: Record<SepMode, string[]> = {
  mono: ["Ink"],
  duotone: ["Key", "Accent"],
  tritone: ["Cyan", "Magenta", "Yellow"],
  cmyk: ["Cyan", "Magenta", "Yellow", "Black"]
};

// ═══════════════════════════════ SCREENING ══════════════════════════════════

// Summed-area table of a coverage map → O(1) average ink density over any cell.
export function buildIntegral(cov: Float32Array, w: number, h: number): Float64Array {
  const stride = w + 1;
  const I = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let rs = 0;
    const ro = y * w;
    const r1 = (y + 1) * stride;
    const r0 = y * stride;
    for (let x = 0; x < w; x++) {
      rs += cov[ro + x];
      I[r1 + x + 1] = I[r0 + x + 1] + rs;
    }
  }
  return I;
}

// Walk the rotated AM-screen lattice over a w×h field; for every cell call
// cb(cx, cy, t) with the cell-centre in image space and the average ink
// density t (0..1) under it. The lattice is the cell grid rotated by the screen
// angle, which is what de-correlates the plates and makes the rosette.
export function forEachDot(
  w: number,
  h: number,
  cell: number,
  angleDeg: number,
  integ: Float64Array,
  cb: (cx: number, cy: number, t: number) => void
): void {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // Project the image corners into the rotated (u,v) frame to bound the lattice.
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h]
  ];
  for (const [x, y] of corners) {
    const u = x * c + y * s;
    const v = -x * s + y * c;
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  const half = cell / 2;
  const stride = w + 1;
  for (let v = Math.floor(vMin / cell) * cell - cell; v <= vMax + cell; v += cell) {
    for (let u = Math.floor(uMin / cell) * cell - cell; u <= uMax + cell; u += cell) {
      const cx = u * c - v * s; // inverse rotation back to image space
      const cy = u * s + v * c;
      if (cx < -half || cy < -half || cx > w + half || cy > h + half) continue;
      let x0 = Math.floor(cx - half);
      let y0 = Math.floor(cy - half);
      let x1 = Math.ceil(cx + half);
      let y1 = Math.ceil(cy + half);
      if (x0 < 0) x0 = 0;
      if (y0 < 0) y0 = 0;
      if (x1 > w) x1 = w;
      if (y1 > h) y1 = h;
      if (x1 <= x0 || y1 <= y0) continue;
      const area = (x1 - x0) * (y1 - y0);
      const sum = integ[y1 * stride + x1] - integ[y0 * stride + x1] - integ[y1 * stride + x0] + integ[y0 * stride + x0];
      const t = sum / area;
      if (t > 0.004) cb(cx, cy, t);
    }
  }
}

// Corners of a rectangle (half-extents hw×hh) centred at (cx,cy), rotated by a.
function rectCorners(cx: number, cy: number, hw: number, hh: number, a: number): number[][] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh]
  ].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

function addPoly(path: Path2D, pts: number[][]): void {
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  path.closePath();
}

// Add one dot of the chosen shape, sized so density t maps to area (t=1 fills the
// cell so shadows go solid). The size laws are shared with the SVG emitter below.
export function addDotToPath(
  path: Path2D,
  shape: DotShape,
  cx: number,
  cy: number,
  t: number,
  cell: number,
  gain: number,
  a: number
): void {
  if (t <= 0.004) return;
  const st = Math.sqrt(t);
  switch (shape) {
    case "circle": {
      const r = st * cell * 0.5 * Math.SQRT2 * gain;
      if (r <= 0.05) return;
      path.moveTo(cx + r, cy);
      path.arc(cx, cy, r, 0, TWO_PI);
      break;
    }
    case "ellipse": {
      const rx = st * cell * 0.56 * Math.SQRT2 * gain;
      const ry = rx * 0.6;
      if (rx <= 0.05) return;
      path.moveTo(cx + rx * Math.cos(a), cy + rx * Math.sin(a));
      path.ellipse(cx, cy, rx, ry, a, 0, TWO_PI);
      break;
    }
    case "square":
      addPoly(path, rectCorners(cx, cy, st * cell * 0.5 * gain, st * cell * 0.5 * gain, a));
      break;
    case "diamond": {
      const hsz = st * cell * 0.62 * gain;
      addPoly(path, rectCorners(cx, cy, hsz, hsz, a + Math.PI / 4));
      break;
    }
    case "line":
      addPoly(path, rectCorners(cx, cy, cell * 0.53, t * cell * gain * 0.5, a));
      break;
    case "cross": {
      const arm = st * cell * 0.6 * gain;
      const thick = arm * 0.4;
      addPoly(path, rectCorners(cx, cy, arm, thick, a));
      addPoly(path, rectCorners(cx, cy, thick, arm, a));
      break;
    }
  }
}

const f2 = (n: number) => n.toFixed(2);
const polySvg = (pts: number[][]) => `<polygon points="${pts.map((p) => f2(p[0]) + "," + f2(p[1])).join(" ")}"/>`;

// Vector twin of addDotToPath — emits one SVG element string for the dot.
export function dotSvg(shape: DotShape, cx: number, cy: number, t: number, cell: number, gain: number, a: number): string {
  if (t <= 0.004) return "";
  const st = Math.sqrt(t);
  switch (shape) {
    case "circle": {
      const r = st * cell * 0.5 * Math.SQRT2 * gain;
      return `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}"/>`;
    }
    case "ellipse": {
      const rx = st * cell * 0.56 * Math.SQRT2 * gain;
      const ry = rx * 0.6;
      const deg = ((a * 180) / Math.PI).toFixed(1);
      return `<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx)}" ry="${f2(ry)}" transform="rotate(${deg} ${f2(cx)} ${f2(cy)})"/>`;
    }
    case "square":
      return polySvg(rectCorners(cx, cy, st * cell * 0.5 * gain, st * cell * 0.5 * gain, a));
    case "diamond": {
      const hsz = st * cell * 0.62 * gain;
      return polySvg(rectCorners(cx, cy, hsz, hsz, a + Math.PI / 4));
    }
    case "line":
      return polySvg(rectCorners(cx, cy, cell * 0.53, t * cell * gain * 0.5, a));
    case "cross": {
      const arm = st * cell * 0.6 * gain;
      const thick = arm * 0.4;
      return polySvg(rectCorners(cx, cy, arm, thick, a)) + polySvg(rectCorners(cx, cy, thick, arm, a));
    }
  }
  return "";
}

// ═══════════════════════════════ COMPOSITE ══════════════════════════════════

function thresholdAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 128 ? 255 : 0;
  ctx.putImageData(img, 0, 0);
}

// Paper-coloured noise multiply — the Riso "tooth". Darkens by up to `amount`,
// sampled from a low-res value-noise field scaled by `size`.
function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, size: number): void {
  if (amount <= 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const sz = Math.max(1, size);
  const nw = Math.max(2, Math.round(w / sz) + 1);
  const nh = Math.max(2, Math.round(h / sz) + 1);
  const noise = new Float32Array(nw * nh);
  const rng = mulberry32(1337);
  for (let i = 0; i < noise.length; i++) noise[i] = rng();
  for (let y = 0; y < h; y++) {
    const gy = y / sz;
    const y0 = Math.min(nh - 1, Math.floor(gy));
    const y1 = Math.min(nh - 1, y0 + 1);
    const fy = gy - y0;
    for (let x = 0; x < w; x++) {
      const gx = x / sz;
      const x0 = Math.min(nw - 1, Math.floor(gx));
      const x1 = Math.min(nw - 1, x0 + 1);
      const fx = gx - x0;
      const n00 = noise[y0 * nw + x0];
      const n10 = noise[y0 * nw + x1];
      const n01 = noise[y1 * nw + x0];
      const n11 = noise[y1 * nw + x1];
      const n = n00 * (1 - fx) * (1 - fy) + n10 * fx * (1 - fy) + n01 * (1 - fx) * fy + n11 * fx * fy;
      const fac = 1 - amount * 0.5 + amount * (n - 0.5);
      const o = (y * w + x) << 2;
      d[o] *= fac;
      d[o + 1] *= fac;
      d[o + 2] *= fac;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export interface RenderStats {
  dotCount: number;
}

// Render the full composite (paper + over-printed plates + grain) into `canvas`,
// sized to the source. `offsetScale` scales mis-registration from work px to the
// render resolution (so a 1px nudge in the preview lands the same on export).
export function renderToCanvas(
  src: ImageData,
  params: RenderParams,
  canvas: HTMLCanvasElement,
  scratch: HTMLCanvasElement,
  offsetScale = 1
): RenderStats {
  const w = src.width;
  const h = src.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dotCount: 0 };
  ctx.fillStyle = params.paper;
  ctx.fillRect(0, 0, w, h);

  const adj = adjustRGB(src.data, params.tone);
  const covs = separate(adj, w, h, params.mode, params.gcr);

  scratch.width = w;
  scratch.height = h;
  const lctx = scratch.getContext("2d");
  if (!lctx) return { dotCount: 0 };

  const rng = mulberry32(0x9e3779b9);
  let dotCount = 0;
  params.layers.forEach((L, i) => {
    if (!L.on || i >= covs.length) return;
    const integ = buildIntegral(covs[i], w, h);
    const a = (L.angleDeg * Math.PI) / 180;
    const path = new Path2D();
    forEachDot(w, h, params.cell, L.angleDeg, integ, (cx, cy, t) => {
      addDotToPath(path, params.shape, cx, cy, t, params.cell, params.gain, a);
      dotCount++;
    });
    lctx.clearRect(0, 0, w, h);
    lctx.fillStyle = L.ink;
    lctx.fill(path);
    if (params.crisp) thresholdAlpha(lctx, w, h);
    const jx = (rng() * 2 - 1) * params.jitter;
    const jy = (rng() * 2 - 1) * params.jitter;
    ctx.globalAlpha = params.inkOpacity;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(scratch, (L.dx + jx) * offsetScale, (L.dy + jy) * offsetScale);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  });

  applyGrain(ctx, w, h, params.grain, params.grainSize);
  return { dotCount };
}

// One ink's plate, black-on-transparent — the master you'd hand a Risograph (it
// screens one drum per pass). Ignores paper / grain / over-print on purpose.
export function renderLayerPlate(src: ImageData, params: RenderParams, layerIndex: number, canvas: HTMLCanvasElement): void {
  const w = src.width;
  const h = src.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const adj = adjustRGB(src.data, params.tone);
  const covs = separate(adj, w, h, params.mode, params.gcr);
  const L = params.layers[layerIndex];
  if (!L || layerIndex >= covs.length) return;
  const integ = buildIntegral(covs[layerIndex], w, h);
  const a = (L.angleDeg * Math.PI) / 180;
  const path = new Path2D();
  forEachDot(w, h, params.cell, L.angleDeg, integ, (cx, cy, t) =>
    addDotToPath(path, params.shape, cx, cy, t, params.cell, params.gain, a)
  );
  ctx.fillStyle = "#000000";
  ctx.fill(path);
  if (params.crisp) thresholdAlpha(ctx, w, h);
}

// Vector composite — one <g> per inked plate (mix-blend-mode:multiply so the
// over-print reads in Illustrator / Inkscape / browsers), dots as real geometry.
export function buildSvg(src: ImageData, params: RenderParams, offsetScale = 1): { svg: string; dotCount: number } {
  const w = src.width;
  const h = src.height;
  const adj = adjustRGB(src.data, params.tone);
  const covs = separate(adj, w, h, params.mode, params.gcr);
  const rng = mulberry32(0x9e3779b9);
  let body = "";
  let dotCount = 0;
  params.layers.forEach((L, i) => {
    if (!L.on || i >= covs.length) return;
    const integ = buildIntegral(covs[i], w, h);
    const a = (L.angleDeg * Math.PI) / 180;
    let parts = "";
    forEachDot(w, h, params.cell, L.angleDeg, integ, (cx, cy, t) => {
      parts += dotSvg(params.shape, cx, cy, t, params.cell, params.gain, a);
      dotCount++;
    });
    const jx = (rng() * 2 - 1) * params.jitter;
    const jy = (rng() * 2 - 1) * params.jitter;
    const ox = ((L.dx + jx) * offsetScale).toFixed(2);
    const oy = ((L.dy + jy) * offsetScale).toFixed(2);
    body += `<g fill="${L.ink}" fill-opacity="${params.inkOpacity}" style="mix-blend-mode:multiply" transform="translate(${ox} ${oy})">${parts}</g>\n`;
  });
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
    `<rect width="${w}" height="${h}" fill="${params.paper}"/>\n${body}</svg>`;
  return { svg, dotCount };
}
