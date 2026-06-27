"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Drawing Cleaner — turn a phone photo or scan of a pen/pencil drawing into clean
// black-on-white, entirely in the browser (nothing is uploaded). This is the
// merged tool: it folds in the old "Scan Cleaner" sibling, so it carries the best
// of both — auto levels + live histogram, gamma, sharpen and adaptive lighting,
// PLUS straighten/crop, a draggable histogram, a curves editor with presets,
// denoise, keep-colour, and resize-on-export. Styled in the toolkit's language
// (white, Archivo-Black headers, black 2px-border panels, all-black text) so it
// reads as part of the site, like RAP Studio — not a foreign embedded app.
//
// The heavy pixel math (levels, adaptive levels, unsharp mask, median denoise,
// spline curves, auto-detect) is ported verbatim from the proven standalone
// tools; only the chrome and the React data-flow are new.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

// ── canvas ink (functional accents on a white ground) ───────────────────────
const INK = "#111111";
const ACCENT = "#ff3b21";
const GAMMA_MARK = "#b8860b"; // dark goldenrod — readable on white
const CURVE = "#ff3b21";

type Pt = { x: number; y: number };
type ViewMode = "split" | "before" | "after";

// ════════════════════════════ PURE PIXEL MATH ═══════════════════════════════
// (module scope — no React, no DOM; safe to reuse and easy to reason about)

function convertToGray(src: ImageData, w: number, h: number): Uint8Array {
  const d = src.data;
  const len = w * h;
  const gray = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const o = i << 2;
    gray[i] = (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
  }
  return gray;
}

function buildHistogram(gray: Uint8Array): Uint32Array {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  return hist;
}

function buildLevelsLUT(wp: number, bp: number, gamma: number): Uint8Array {
  const lut = new Uint8Array(256);
  const range = wp - bp;
  if (range <= 0) {
    for (let i = 0; i < 256; i++) lut[i] = i >= wp ? 255 : 0;
  } else {
    const ig = 1 / gamma;
    const ir = 1 / range;
    for (let i = 0; i < 256; i++) {
      if (i <= bp) lut[i] = 0;
      else if (i >= wp) lut[i] = 255;
      else lut[i] = Math.round(Math.pow((i - bp) * ir, ig) * 255);
    }
  }
  return lut;
}

function applyLevels(gray: Uint8Array, wp: number, bp: number, gamma: number): Uint8Array {
  const lut = buildLevelsLUT(wp, bp, gamma);
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = lut[gray[i]];
  return out;
}

// Local (per-region) levels via integral images — evens out uneven lighting /
// shadow gradients across a phone photo. Ported from Drawing-Image-Cleaner.
function adaptiveLevels(
  gray: Uint8Array,
  w: number,
  h: number,
  gwp: number,
  gbp: number,
  gamma: number,
  block: number
): Uint8Array {
  const out = new Uint8Array(w * h);
  const hb = block >> 1;
  const stride = w + 1;
  const integ = new Float64Array(stride * (h + 1));
  const intSq = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let rs = 0;
    let rq = 0;
    const ro = y * w;
    const r1 = (y + 1) * stride;
    const r0 = y * stride;
    for (let x = 0; x < w; x++) {
      const v = gray[ro + x];
      rs += v;
      rq += v * v;
      integ[r1 + x + 1] = integ[r0 + x + 1] + rs;
      intSq[r1 + x + 1] = intSq[r0 + x + 1] + rq;
    }
  }
  const ig = 1 / gamma;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const v = gray[idx];
      const x0 = Math.max(0, x - hb);
      const y0 = Math.max(0, y - hb);
      const x1 = Math.min(w, x + hb);
      const y1 = Math.min(h, y + hb);
      const area = (x1 - x0) * (y1 - y0);
      const sum = integ[y1 * stride + x1] - integ[y0 * stride + x1] - integ[y1 * stride + x0] + integ[y0 * stride + x0];
      const lm = sum / area;
      const sq = intSq[y1 * stride + x1] - intSq[y0 * stride + x1] - intSq[y1 * stride + x0] + intSq[y0 * stride + x0];
      const ls = Math.sqrt(Math.max(0, sq / area - lm * lm));
      const lw = Math.min(0.8, 0.4 + ls / 80);
      const gw = 1 - lw;
      const wp = Math.min(255, lm + ls * 1.2 + 15) * lw + gwp * gw;
      const bp = Math.max(0, lm - ls * 2 - 10) * lw + gbp * gw;
      const rng = wp - bp;
      if (rng <= 0) out[idx] = v >= wp ? 255 : 0;
      else if (v <= bp) out[idx] = 0;
      else if (v >= wp) out[idx] = 255;
      else out[idx] = Math.round(Math.pow((v - bp) / rng, ig) * 255);
    }
  }
  return out;
}

// 5×5-ish unsharp mask (two-pass box blur approximating a gaussian).
function unsharpMask(px: Uint8Array, w: number, h: number, amount: number): Uint8Array {
  const bl = new Uint8Array(w * h);
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const r = y * w;
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 2);
      const x1 = Math.min(w - 1, x + 2);
      let s = 0;
      for (let i = x0; i <= x1; i++) s += px[r + i];
      tmp[r + x] = s / (x1 - x0 + 1);
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - 2);
      const y1 = Math.min(h - 1, y + 2);
      let s = 0;
      for (let i = y0; i <= y1; i++) s += tmp[i * w + x];
      bl[y * w + x] = s / (y1 - y0 + 1);
    }
  }
  const out = new Uint8Array(w * h);
  const str = 0.5 + amount * 2;
  for (let i = 0; i < px.length; i++) {
    const v = px[i] + (px[i] - bl[i]) * str;
    out[i] = v < 0 ? 0 : v > 255 ? 255 : (v + 0.5) | 0;
  }
  return out;
}

// Median filter — knocks out speckle / scanner noise without softening lines.
function medianFilter(px: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const size = radius * 2 + 1;
  const mid = (size * size) >> 1;
  const buf = new Uint8Array(size * size);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let k = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = Math.max(0, Math.min(h - 1, y + dy));
        for (let dx = -radius; dx <= radius; dx++) {
          buf[k++] = px[yy * w + Math.max(0, Math.min(w - 1, x + dx))];
        }
      }
      buf.subarray(0, k).sort();
      out[y * w + x] = buf[mid];
    }
  }
  return out;
}

const cl8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

// Natural cubic-spline LUT through the curve points (returns null for identity).
function computeCurveLUT(pts: Pt[]): Uint8Array | null {
  if (pts.length < 2) return null;
  if (pts.length === 2 && pts[0].x === 0 && pts[0].y === 0 && pts[1].x === 255 && pts[1].y === 255) return null;
  const n = pts.length - 1;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  if (n === 1) {
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      if (i <= xs[0]) lut[i] = cl8(ys[0]);
      else if (i >= xs[1]) lut[i] = cl8(ys[1]);
      else {
        const t = (i - xs[0]) / (xs[1] - xs[0]);
        lut[i] = cl8(ys[0] + t * (ys[1] - ys[0]));
      }
    }
    return lut;
  }
  const hh: number[] = [];
  for (let i = 0; i < n; i++) hh[i] = xs[i + 1] - xs[i];
  const alpha = new Array(n + 1).fill(0);
  for (let i = 1; i < n; i++) alpha[i] = (3 / hh[i]) * (ys[i + 1] - ys[i]) - (3 / hh[i - 1]) * (ys[i] - ys[i - 1]);
  const l = new Array(n + 1);
  const mu = new Array(n + 1);
  const z = new Array(n + 1);
  l[0] = 1;
  mu[0] = 0;
  z[0] = 0;
  for (let i = 1; i < n; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - hh[i - 1] * mu[i - 1];
    mu[i] = hh[i] / l[i];
    z[i] = (alpha[i] - hh[i - 1] * z[i - 1]) / l[i];
  }
  l[n] = 1;
  z[n] = 0;
  const c = new Array(n + 1);
  const b = new Array(n);
  const d = new Array(n);
  c[n] = 0;
  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / hh[j] - (hh[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * hh[j]);
  }
  const lut = new Uint8Array(256);
  let seg = 0;
  for (let i = 0; i < 256; i++) {
    if (i <= xs[0]) {
      lut[i] = cl8(ys[0]);
      continue;
    }
    if (i >= xs[n]) {
      lut[i] = cl8(ys[n]);
      continue;
    }
    while (seg < n - 1 && i > xs[seg + 1]) seg++;
    if (i < xs[seg]) seg = 0;
    while (seg < n - 1 && i > xs[seg + 1]) seg++;
    const dx = i - xs[seg];
    lut[i] = cl8(ys[seg] + b[seg] * dx + c[seg] * dx * dx + d[seg] * dx * dx * dx);
  }
  return lut;
}

// Auto-detect white/black/gamma from the histogram — finds the paper tone and the
// line tone and sets levels that push paper to white and lines to black.
function autoDetect(hist: Uint32Array, total: number): { white: number; black: number; gamma: number } {
  const smooth = new Float64Array(256);
  const radius = 7;
  for (let i = 0; i < 256; i++) {
    let sum = 0;
    let wt = 0;
    for (let k = -radius; k <= radius; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < 256) {
        const w = 1 - Math.abs(k) / (radius + 1);
        sum += hist[idx] * w;
        wt += w;
      }
    }
    smooth[i] = sum / wt;
  }
  let paperPeak = 200;
  let paperMax = 0;
  for (let i = 140; i <= 252; i++) {
    if (smooth[i] > paperMax) {
      paperMax = smooth[i];
      paperPeak = i;
    }
  }
  let cumulative = 0;
  let p2 = 0;
  let p5 = 0;
  const target2 = Math.floor(total * 0.02);
  const target5 = Math.floor(total * 0.05);
  for (let i = 0; i < 256; i++) {
    cumulative += hist[i];
    if (p2 === 0 && cumulative >= target2) p2 = i;
    if (p5 === 0 && cumulative >= target5) {
      p5 = i;
      break;
    }
  }
  let linePeak = p2;
  let lineMax = 0;
  const minCount = paperMax * 0.003;
  for (let i = 0; i <= Math.min(130, paperPeak - 40); i++) {
    if (smooth[i] > lineMax && smooth[i] > minCount) {
      lineMax = smooth[i];
      linePeak = i;
    }
  }
  const lineRef = lineMax > minCount * 5 ? linePeak : p5;
  let wpCandidate = paperPeak;
  const dropThreshold = paperMax * 0.15;
  for (let i = paperPeak; i >= 100; i--) {
    if (smooth[i] < dropThreshold) {
      wpCandidate = i;
      break;
    }
  }
  let white = Math.max(wpCandidate, paperPeak - 25);
  white = Math.max(120, Math.min(250, white));
  let black = Math.max(0, lineRef + 10);
  black = Math.max(5, Math.min(130, black));
  const range = white - black;
  let gamma = 100;
  if (range > 120) gamma = 130;
  else if (range > 80) gamma = 115;
  if (black >= white - 20) black = Math.max(5, white - 60);
  return { white, black, gamma };
}

const CURVE_PRESETS: Record<string, Pt[]> = {
  scurve: [{ x: 0, y: 0 }, { x: 64, y: 40 }, { x: 192, y: 220 }, { x: 255, y: 255 }],
  punch: [{ x: 0, y: 0 }, { x: 50, y: 20 }, { x: 128, y: 100 }, { x: 200, y: 210 }, { x: 255, y: 255 }],
  fade: [{ x: 0, y: 0 }, { x: 80, y: 60 }, { x: 160, y: 230 }, { x: 200, y: 252 }, { x: 255, y: 255 }],
  highcon: [{ x: 0, y: 0 }, { x: 80, y: 10 }, { x: 176, y: 245 }, { x: 255, y: 255 }]
};

const RESIZE_OPTIONS = [0, 6000, 5000, 4000, 3000, 2000, 1500, 1000];

// ════════════════════════════════ COMPONENT ═════════════════════════════════

export default function DrawingCleaner() {
  // Buffers (mutable, non-rendering).
  const rawImgRef = useRef<HTMLImageElement | null>(null);
  const srcRef = useRef<ImageData | null>(null);
  const grayRef = useRef<Uint8Array | null>(null);
  const histRef = useRef<Uint32Array>(new Uint32Array(256));
  const outRef = useRef<ImageData | null>(null);
  const dimsRef = useRef({ w: 0, h: 0 });
  const cropRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const autoRef = useRef({ white: 200, black: 60, gamma: 100 });
  const fileNameRef = useRef("");
  const splitRef = useRef(0.5);

  // Crop drag scratch (display coords).
  const cropStartRef = useRef<Pt | null>(null);
  const cropEndRef = useRef<Pt | null>(null);

  // Reactive UI state.
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ViewMode>("split");
  const [wp, setWp] = useState(200);
  const [bp, setBp] = useState(60);
  const [gam, setGam] = useState(100); // gamma × 100
  const [sharpen, setSharpen] = useState(false);
  const [sharpenAmt, setSharpenAmt] = useState(50);
  const [denoise, setDenoise] = useState(false);
  const [denoiseR, setDenoiseR] = useState(1);
  const [adaptive, setAdaptive] = useState(false);
  const [block, setBlock] = useState(64);
  const [desat, setDesat] = useState(true);
  const [rotateTenths, setRotateTenths] = useState(0); // deg × 10
  const [resize, setResize] = useState(0);
  const [curvePts, setCurvePts] = useState<Pt[]>([{ x: 0, y: 0 }, { x: 255, y: 255 }]);
  const [showCurves, setShowCurves] = useState(false);
  const [manual, setManual] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropReady, setCropReady] = useState(false);
  const [status, setStatus] = useState("Load an image to begin");
  const [meta, setMeta] = useState("");
  const [zoom, setZoom] = useState("");
  const [processing, setProcessing] = useState(false);

  // Version counters force the imperative redraws.
  const [geomVersion, setGeomVersion] = useState(0);
  const [outVersion, setOutVersion] = useState(0);
  const [sizeVersion, setSizeVersion] = useState(0);

  // DOM hosts.
  const histCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const curvesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const curvesDragIdx = useRef(-1);

  const markManual = useCallback(() => {
    if (grayRef.current) setManual(true);
  }, []);

  // ── geometry: rotate + crop → working source, gray, histogram ──────────────
  const applyGeometry = useCallback((deg: number) => {
    const raw = rawImgRef.current;
    if (!raw) return;
    const rw = raw.naturalWidth;
    const rh = raw.naturalHeight;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const nw = Math.ceil(rw * cos + rh * sin);
    const nh = Math.ceil(rw * sin + rh * cos);
    const c = document.createElement("canvas");
    c.width = nw;
    c.height = nh;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, nw, nh);
    ctx.translate(nw / 2, nh / 2);
    ctx.rotate(rad);
    ctx.drawImage(raw, -rw / 2, -rh / 2);
    let finalCanvas = c;
    const cr = cropRef.current;
    if (cr) {
      const cc = document.createElement("canvas");
      cc.width = cr.w;
      cc.height = cr.h;
      cc.getContext("2d")!.drawImage(c, cr.x, cr.y, cr.w, cr.h, 0, 0, cr.w, cr.h);
      finalCanvas = cc;
    }
    const w = finalCanvas.width;
    const h = finalCanvas.height;
    dimsRef.current = { w, h };
    const src = finalCanvas.getContext("2d")!.getImageData(0, 0, w, h);
    srcRef.current = src;
    grayRef.current = convertToGray(src, w, h);
    histRef.current = buildHistogram(grayRef.current);
    setGeomVersion((v) => v + 1);
  }, []);

  // ── the processing pipeline (debounced via the effect below) ───────────────
  const processImage = useCallback(() => {
    const gray = grayRef.current;
    const { w, h } = dimsRef.current;
    if (!gray || !w) return;
    setProcessing(true);
    setStatus("Processing…");
    // Defer so the spinner can paint before the (synchronous) crunch.
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const gamma = gam / 100;
          let p = adaptive ? adaptiveLevels(gray, w, h, wp, bp, gamma, block) : applyLevels(gray, wp, bp, gamma);
          const curveLUT = computeCurveLUT(curvePts);
          if (curveLUT) {
            const o = new Uint8Array(p.length);
            for (let i = 0; i < p.length; i++) o[i] = curveLUT[p[i]];
            p = o;
          }
          if (denoise) p = medianFilter(p, w, h, denoiseR);
          if (sharpen) p = unsharpMask(p, w, h, sharpenAmt / 100);

          const out = new ImageData(w, h);
          const od = out.data;
          if (desat) {
            for (let i = 0, len = p.length; i < len; i++) {
              const v = p[i];
              const o = i << 2;
              od[o] = v;
              od[o | 1] = v;
              od[o | 2] = v;
              od[o | 3] = 255;
            }
          } else {
            const sd = srcRef.current!.data;
            for (let i = 0, len = p.length; i < len; i++) {
              const o = i << 2;
              const g = gray[i];
              const v = p[i];
              if (g < 1) {
                od[o] = v;
                od[o | 1] = v;
                od[o | 2] = v;
              } else {
                const r = v / g;
                od[o] = Math.min(255, Math.round(sd[o] * r));
                od[o | 1] = Math.min(255, Math.round(sd[o | 1] * r));
                od[o | 2] = Math.min(255, Math.round(sd[o | 2] * r));
              }
              od[o | 3] = 255;
            }
          }
          outRef.current = out;
          setOutVersion((v) => v + 1);
          const mp = ((w * h) / 1e6).toFixed(1);
          setStatus(`Done — ${w}×${h} (${mp} MP)`);
        } catch (err) {
          setStatus("Error: " + (err as Error).message);
        } finally {
          setProcessing(false);
        }
      }, 20);
    });
  }, [adaptive, wp, bp, gam, block, curvePts, denoise, denoiseR, sharpen, sharpenAmt, desat]);

  // Debounced processing whenever an input or the geometry changes.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => processImage(), 60);
    return () => clearTimeout(t);
  }, [loaded, geomVersion, processImage]);

  // ── file loading ───────────────────────────────────────────────────────────
  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/") && !/\.(jpe?g|png|bmp|webp|tiff?)$/i.test(file.name)) {
        setStatus("Error: not a supported image file");
        return;
      }
      fileNameRef.current = file.name || "pasted-image.png";
      setStatus("Loading " + fileNameRef.current + "…");
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          rawImgRef.current = img;
          cropRef.current = null;
          cropStartRef.current = null;
          cropEndRef.current = null;
          setCropMode(false);
          setCropReady(false);
          setRotateTenths(0);
          applyGeometry(0);
          const a = autoDetect(histRef.current, dimsRef.current.w * dimsRef.current.h);
          autoRef.current = a;
          // Reset sliders to auto, clear enhancements + curves.
          setWp(a.white);
          setBp(a.black);
          setGam(a.gamma);
          setSharpen(false);
          setAdaptive(false);
          setDenoise(false);
          setDesat(true);
          setCurvePts([{ x: 0, y: 0 }, { x: 255, y: 255 }]);
          setManual(false);
          setView("split");
          setLoaded(true);
          const { w, h } = dimsRef.current;
          const mp = ((w * h) / 1e6).toFixed(1);
          setMeta(`${w}×${h} (${mp} MP) — ${fileNameRef.current}`);
        };
        img.onerror = () => setStatus("Error: could not decode image");
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [applyGeometry]
  );

  // Drag-drop + clipboard paste (mount-once).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const f = items[i].getAsFile();
          if (f) {
            loadFile(f);
            break;
          }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [loadFile]);

  // Container resize → re-fit the preview.
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setSizeVersion((v) => v + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── reset to auto / clear ────────────────────────────────────────────────
  const resetToAuto = useCallback(() => {
    const a = autoRef.current;
    setWp(a.white);
    setBp(a.black);
    setGam(a.gamma);
    setSharpen(false);
    setAdaptive(false);
    setDenoise(false);
    setDesat(true);
    setCurvePts([{ x: 0, y: 0 }, { x: 255, y: 255 }]);
    setManual(false);
  }, []);

  const clearAll = useCallback(() => {
    rawImgRef.current = null;
    srcRef.current = null;
    grayRef.current = null;
    outRef.current = null;
    cropRef.current = null;
    dimsRef.current = { w: 0, h: 0 };
    histRef.current = new Uint32Array(256);
    setLoaded(false);
    setManual(false);
    setRotateTenths(0);
    setCropMode(false);
    setCropReady(false);
    setResize(0);
    setMeta("");
    setZoom("");
    setStatus("Load an image to begin");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── crop apply ──────────────────────────────────────────────────────────────
  const applyCrop = useCallback(() => {
    const start = cropStartRef.current;
    const end = cropEndRef.current;
    const host = hostRef.current;
    if (!start || !end || !host) return;
    const canvas = host.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { w, h } = dimsRef.current;
    const scaleX = w / rect.width;
    const scaleY = h / rect.height;
    const x1 = Math.max(0, Math.min(start.x, end.x));
    const y1 = Math.max(0, Math.min(start.y, end.y));
    const x2 = Math.min(rect.width, Math.max(start.x, end.x));
    const y2 = Math.min(rect.height, Math.max(start.y, end.y));
    cropRef.current = {
      x: Math.round(x1 * scaleX),
      y: Math.round(y1 * scaleY),
      w: Math.max(10, Math.round((x2 - x1) * scaleX)),
      h: Math.max(10, Math.round((y2 - y1) * scaleY))
    };
    setCropMode(false);
    setCropReady(false);
    cropStartRef.current = null;
    cropEndRef.current = null;
    applyGeometry(rotateTenths / 10);
    const a = autoDetect(histRef.current, dimsRef.current.w * dimsRef.current.h);
    autoRef.current = a;
    setWp(a.white);
    setBp(a.black);
    setGam(a.gamma);
    setManual(false);
    const { w: nw, h: nh } = dimsRef.current;
    const mp = ((nw * nh) / 1e6).toFixed(1);
    setMeta(`${nw}×${nh} (${mp} MP) — ${fileNameRef.current}`);
    setStatus("Crop applied");
  }, [applyGeometry, rotateTenths]);

  // ════════════════════════════ HISTOGRAM DRAW ══════════════════════════════
  useEffect(() => {
    const canvas = histCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.floor(rect.width * dpr);
    const H = Math.floor(rect.height * dpr);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    const hist = histRef.current;
    if (!grayRef.current) return;
    let mx = 0;
    for (let i = 2; i < 254; i++) if (hist[i] > mx) mx = hist[i];
    if (!mx) mx = 1;
    const logM = Math.log(mx + 1);
    const gamma = gam / 100;
    const pad = H * 0.04;

    ctx.fillStyle = "rgba(255,59,33,0.07)";
    ctx.fillRect((wp / 255) * W, 0, W - (wp / 255) * W, H);
    ctx.fillStyle = "rgba(17,17,17,0.05)";
    ctx.fillRect(0, 0, (bp / 255) * W, H);

    const bw = W / 256;
    for (let i = 0; i < 256; i++) {
      if (!hist[i]) continue;
      const bh = (Math.log(hist[i] + 1) / logM) * (H - pad * 2);
      ctx.fillStyle = i <= bp ? "rgba(17,17,17,0.4)" : i >= wp ? "rgba(255,59,33,0.4)" : "rgba(17,17,17,0.28)";
      ctx.fillRect(i * bw, H - pad - bh, Math.max(bw - 0.3, 1), bh);
    }

    const lut = buildLevelsLUT(wp, bp, gamma);
    const curveLUT = computeCurveLUT(curvePts);
    ctx.beginPath();
    ctx.strokeStyle = curveLUT ? "rgba(255,59,33,0.85)" : "rgba(17,17,17,0.55)";
    ctx.lineWidth = 1.5 * dpr;
    for (let i = 0; i < 256; i++) {
      let o = lut[i];
      if (curveLUT) o = curveLUT[o];
      const x = (i / 255) * W;
      const y = H - pad - (o / 255) * (H - pad * 2);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();

    const ml = 2.5 * dpr;
    const bpX = (bp / 255) * W;
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = ml;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(bpX, 0);
    ctx.lineTo(bpX, H);
    ctx.stroke();
    ctx.font = "bold " + 11 * dpr + "px ui-sans-serif, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("B " + bp, bpX + 4 * dpr, 13 * dpr);

    const wpX = (wp / 255) * W;
    ctx.strokeStyle = ACCENT;
    ctx.fillStyle = ACCENT;
    ctx.lineWidth = ml;
    ctx.beginPath();
    ctx.moveTo(wpX, 0);
    ctx.lineTo(wpX, H);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText("W " + wp, wpX - 4 * dpr, 13 * dpr);

    const midV = bp + (wp - bp) * Math.pow(0.5, gamma);
    const midX = (midV / 255) * W;
    ctx.strokeStyle = GAMMA_MARK;
    ctx.fillStyle = GAMMA_MARK;
    ctx.lineWidth = 2 * dpr;
    ctx.setLineDash([4 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, H);
    ctx.stroke();
    ctx.setLineDash([]);
    const ts = 6 * dpr;
    ctx.beginPath();
    ctx.moveTo(midX, H);
    ctx.lineTo(midX - ts, H - ts * 1.5);
    ctx.lineTo(midX + ts, H - ts * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.font = "bold " + 10 * dpr + "px ui-sans-serif, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("γ " + gamma.toFixed(1), midX, H - ts * 1.5 - 3 * dpr);

    ctx.fillStyle = "rgba(17,17,17,0.35)";
    ctx.font = 9 * dpr + "px ui-sans-serif, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("0", 2 * dpr, H - 2 * dpr);
    ctx.textAlign = "right";
    ctx.fillText("255", W - 2 * dpr, H - 2 * dpr);
  }, [wp, bp, gam, curvePts, geomVersion, loaded, sizeVersion]);

  // Draggable histogram white/black handles.
  const histValueAt = (clientX: number) => {
    const parent = histCanvasRef.current!.parentElement!;
    const r = parent.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(255, ((clientX - r.left) / r.width) * 255)));
  };
  const histNear = (clientX: number): "white" | "black" | null => {
    const parent = histCanvasRef.current!.parentElement!;
    const r = parent.getBoundingClientRect();
    const mx = clientX - r.left;
    const dw = Math.abs(mx - (wp / 255) * r.width);
    const db = Math.abs(mx - (bp / 255) * r.width);
    const th = 12;
    if (dw < th && db < th) return dw <= db ? "white" : "black";
    if (dw < th) return "white";
    if (db < th) return "black";
    return null;
  };
  const histDragRef = useRef<"white" | "black" | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const parent = histCanvasRef.current?.parentElement;
      if (!parent) return;
      if (!histDragRef.current) {
        if (grayRef.current) parent.style.cursor = histNear(e.clientX) ? "ew-resize" : "";
        return;
      }
      e.preventDefault();
      const v = histValueAt(e.clientX);
      if (histDragRef.current === "white") setWp(Math.max(bp + 10, Math.min(255, v)));
      else setBp(Math.max(0, Math.min(wp - 10, v)));
      markManual();
    };
    const onUp = () => {
      if (histDragRef.current) {
        histDragRef.current = null;
        const parent = histCanvasRef.current?.parentElement;
        if (parent) parent.style.cursor = "";
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [wp, bp, markManual]);

  // ════════════════════════════ CURVES DRAW ═════════════════════════════════
  useEffect(() => {
    if (!showCurves) return;
    const canvas = curvesCanvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement!;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.floor(rect.width * dpr);
    const H = Math.floor(rect.height * dpr);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    const pad = 8 * dpr;
    const gw = W - pad * 2;
    const gh = H - pad * 2;
    const tX = (v: number) => pad + (v / 255) * gw;
    const tY = (v: number) => pad + gh - (v / 255) * gh;

    ctx.strokeStyle = "rgba(17,17,17,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = i * 64;
      ctx.beginPath();
      ctx.moveTo(tX(v), pad);
      ctx.lineTo(tX(v), pad + gh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad, tY(v));
      ctx.lineTo(pad + gw, tY(v));
      ctx.stroke();
    }

    if (grayRef.current) {
      const ll = buildLevelsLUT(wp, bp, gam / 100);
      const ph = new Uint32Array(256);
      const hist = histRef.current;
      for (let i = 0; i < 256; i++) ph[ll[i]] += hist[i];
      let mh = 0;
      for (let i = 2; i < 254; i++) if (ph[i] > mh) mh = ph[i];
      if (!mh) mh = 1;
      const lm = Math.log(mh + 1);
      ctx.fillStyle = "rgba(17,17,17,0.08)";
      for (let i = 0; i < 256; i++) {
        if (!ph[i]) continue;
        const bh = (Math.log(ph[i] + 1) / lm) * gh * 0.9;
        ctx.fillRect(tX(i), tY(0) - bh, Math.max(gw / 256, 1), bh);
      }
    }

    ctx.strokeStyle = "rgba(17,17,17,0.18)";
    ctx.lineWidth = dpr;
    ctx.setLineDash([3 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(tX(0), tY(0));
    ctx.lineTo(tX(255), tY(255));
    ctx.stroke();
    ctx.setLineDash([]);

    const lut = computeCurveLUT(curvePts) || (() => {
      const l = new Uint8Array(256);
      for (let i = 0; i < 256; i++) l[i] = i;
      return l;
    })();
    ctx.beginPath();
    ctx.strokeStyle = CURVE;
    ctx.lineWidth = 2.5 * dpr;
    for (let i = 0; i < 256; i++) {
      const x = tX(i);
      const y = tY(lut[i]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();

    for (let i = 0; i < curvePts.length; i++) {
      const p = curvePts[i];
      const cx = tX(p.x);
      const cy = tY(p.y);
      const r = (i === curvesDragIdx.current ? 7 : 5) * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = CURVE;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 || i === curvePts.length - 1 ? CURVE : "#fff";
      ctx.fill();
    }
  }, [showCurves, curvePts, wp, bp, gam, geomVersion, loaded, sizeVersion]);

  const curvesCoord = (clientX: number, clientY: number): Pt => {
    const wrap = curvesCanvasRef.current!.parentElement!;
    const r = wrap.getBoundingClientRect();
    const p = 8;
    const gw = r.width - p * 2;
    const gh = r.height - p * 2;
    return {
      x: Math.max(0, Math.min(255, Math.round(((clientX - r.left - p) / gw) * 255))),
      y: Math.max(0, Math.min(255, Math.round((1 - (clientY - r.top - p) / gh) * 255)))
    };
  };
  const findNearPt = (c: Pt, th: number): number => {
    const wrap = curvesCanvasRef.current!.parentElement!;
    const r = wrap.getBoundingClientRect();
    const p = 8;
    const gw = r.width - p * 2;
    const gh = r.height - p * 2;
    let bi = -1;
    let bd = 1e9;
    for (let i = 0; i < curvePts.length; i++) {
      const pt = curvePts[i];
      const px = p + (pt.x / 255) * gw;
      const py = p + (1 - pt.y / 255) * gh;
      const cx = p + (c.x / 255) * gw;
      const cy = p + (1 - c.y / 255) * gh;
      const dd = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      if (dd < bd) {
        bd = dd;
        bi = i;
      }
    }
    return bd < th ? bi : -1;
  };
  const onCurvesDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const c = curvesCoord(e.clientX, e.clientY);
    const n = findNearPt(c, 12);
    if (n >= 0) {
      curvesDragIdx.current = n;
    } else {
      const next = [...curvePts, { x: c.x, y: c.y }].sort((a, b) => a.x - b.x);
      curvesDragIdx.current = next.findIndex((p) => p.x === c.x && p.y === c.y);
      setCurvePts(next);
      markManual();
    }
  };
  useEffect(() => {
    if (!showCurves) return;
    const onMove = (e: MouseEvent) => {
      if (curvesDragIdx.current < 0) return;
      const c = curvesCoord(e.clientX, e.clientY);
      setCurvePts((prev) => {
        const next = prev.map((p) => ({ ...p }));
        const i = curvesDragIdx.current;
        const p = next[i];
        if (!p) return prev;
        if (i === 0 || i === next.length - 1) p.y = c.y;
        else {
          p.x = Math.max(next[i - 1].x + 1, Math.min(next[i + 1].x - 1, c.x));
          p.y = c.y;
        }
        return next;
      });
      markManual();
    };
    const onUp = () => {
      curvesDragIdx.current = -1;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCurves, markManual]);
  const onCurvesDouble = (e: React.MouseEvent) => {
    e.preventDefault();
    const c = curvesCoord(e.clientX, e.clientY);
    const n = findNearPt(c, 12);
    if (n > 0 && n < curvePts.length - 1) {
      setCurvePts((prev) => prev.filter((_, i) => i !== n));
      curvesDragIdx.current = -1;
      markManual();
    }
  };

  // ════════════════════════════ PREVIEW RENDER ══════════════════════════════
  useEffect(() => {
    const host = hostRef.current;
    const wrap = previewWrapRef.current;
    if (!host || !wrap || !loaded || !srcRef.current) return;
    const { w, h } = dimsRef.current;
    host.innerHTML = "";
    let cleanup: (() => void) | undefined;
    const r = wrap.getBoundingClientRect();
    const scale = Math.min((r.width - 24) / w, (r.height - 24) / h, 1);
    const dw = Math.max(1, Math.floor(w * scale));
    const dh = Math.max(1, Math.floor(h * scale));
    setZoom(Math.round(scale * 100) + "%");

    const makeCanvas = (data: ImageData) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.putImageData(data, 0, 0);
      c.style.width = dw + "px";
      c.style.height = dh + "px";
      c.style.display = "block";
      return c;
    };

    const src = srcRef.current;
    const out = outRef.current || src;

    if (view === "before" || cropMode || !outRef.current) {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.lineHeight = "0";
      container.appendChild(makeCanvas(view === "after" && outRef.current ? out : src));
      host.appendChild(container);

      if (cropMode) {
        const canvas = container.querySelector("canvas")!;
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:absolute;border:2px dashed #ff3b21;background:rgba(255,59,33,0.08);pointer-events:none;display:none;";
        container.appendChild(overlay);
        const place = () => {
          const s = cropStartRef.current;
          const en = cropEndRef.current;
          if (!s || !en) {
            overlay.style.display = "none";
            return;
          }
          const x1 = Math.min(s.x, en.x);
          const y1 = Math.min(s.y, en.y);
          overlay.style.display = "block";
          overlay.style.left = x1 + "px";
          overlay.style.top = y1 + "px";
          overlay.style.width = Math.abs(en.x - s.x) + "px";
          overlay.style.height = Math.abs(en.y - s.y) + "px";
        };
        let dragging = false;
        const local = (clientX: number, clientY: number) => {
          const rect = canvas.getBoundingClientRect();
          return {
            x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
            y: Math.max(0, Math.min(rect.height, clientY - rect.top))
          };
        };
        canvas.style.cursor = "crosshair";
        canvas.addEventListener("mousedown", (e) => {
          dragging = true;
          cropStartRef.current = local(e.clientX, e.clientY);
          cropEndRef.current = { ...cropStartRef.current };
          place();
          e.preventDefault();
        });
        const move = (e: MouseEvent) => {
          if (!dragging) return;
          cropEndRef.current = local(e.clientX, e.clientY);
          place();
        };
        const up = () => {
          if (!dragging) return;
          dragging = false;
          const s = cropStartRef.current;
          const en = cropEndRef.current;
          setCropReady(!!(s && en && Math.abs(en.x - s.x) > 5 && Math.abs(en.y - s.y) > 5));
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
        cleanup = () => {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
        };
      }
      return cleanup;
    }

    if (view === "after") {
      const container = document.createElement("div");
      container.style.lineHeight = "0";
      container.appendChild(makeCanvas(out));
      host.appendChild(container);
      return;
    }

    // split
    const container = document.createElement("div");
    container.style.cssText = `position:relative;overflow:hidden;line-height:0;width:${dw}px;height:${dh}px;`;
    container.appendChild(makeCanvas(out)); // after, full
    const ov = document.createElement("div");
    ov.style.cssText = `position:absolute;top:0;left:0;height:100%;overflow:hidden;pointer-events:none;width:${Math.floor(splitRef.current * dw)}px;`;
    ov.appendChild(makeCanvas(src));
    container.appendChild(ov);
    const handle = document.createElement("div");
    handle.style.cssText = `position:absolute;top:0;width:3px;height:100%;background:#ff3b21;cursor:col-resize;z-index:10;left:${Math.floor(splitRef.current * dw)}px;box-shadow:0 0 0 1px rgba(0,0,0,0.15);`;
    const grip = document.createElement("div");
    grip.style.cssText = "position:absolute;top:50%;left:-6px;width:15px;height:34px;margin-top:-17px;background:#ff3b21;border-radius:6px;box-shadow:0 0 0 1px rgba(0,0,0,0.15);";
    handle.appendChild(grip);
    container.appendChild(handle);
    const tag = (text: string, side: "left" | "right") => {
      const t = document.createElement("div");
      t.textContent = text;
      t.style.cssText = `position:absolute;top:8px;${side}:8px;padding:3px 9px;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;background:#111;color:#fff;border-radius:4px;pointer-events:none;`;
      return t;
    };
    container.appendChild(tag("Original", "left"));
    container.appendChild(tag("Cleaned", "right"));
    host.appendChild(container);

    let dragging = false;
    const onMove = (clientX: number) => {
      const rect = container.getBoundingClientRect();
      let p = (clientX - rect.left) / rect.width;
      p = Math.max(0.02, Math.min(0.98, p));
      splitRef.current = p;
      ov.style.width = Math.floor(p * dw) + "px";
      handle.style.left = Math.floor(p * dw) + "px";
    };
    handle.addEventListener("mousedown", (e) => {
      dragging = true;
      e.preventDefault();
    });
    const mm = (e: MouseEvent) => dragging && onMove(e.clientX);
    const mu = () => (dragging = false);
    document.addEventListener("mousemove", mm);
    document.addEventListener("mouseup", mu);
    cleanup = () => {
      document.removeEventListener("mousemove", mm);
      document.removeEventListener("mouseup", mu);
    };
    return cleanup;
  }, [view, outVersion, loaded, sizeVersion, cropMode, geomVersion]);

  // ── export ───────────────────────────────────────────────────────────────
  const exportPng = useCallback(() => {
    const out = outRef.current;
    if (!out) return;
    const { w, h } = dimsRef.current;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.putImageData(out, 0, 0);
    let final = c;
    if (resize > 0) {
      const longEdge = Math.max(w, h);
      if (resize < longEdge) {
        const s = resize / longEdge;
        const rw = Math.round(w * s);
        const rh = Math.round(h * s);
        final = document.createElement("canvas");
        final.width = rw;
        final.height = rh;
        const rc = final.getContext("2d")!;
        rc.imageSmoothingEnabled = true;
        rc.imageSmoothingQuality = "high";
        rc.drawImage(c, 0, 0, rw, rh);
      }
    }
    final.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = (fileNameRef.current.replace(/\.[^.]+$/, "") || "drawing") + "_cleaned.png";
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`Exported ${a.download} (${final.width}×${final.height})`);
    }, "image/png");
  }, [resize]);

  // Space toggles before/after.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      if (e.code === "Space" && loaded) {
        e.preventDefault();
        setView((v) => (v === "after" ? "before" : "after"));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loaded]);

  const resizeLabel =
    resize === 0
      ? "Original"
      : (() => {
          const { w, h } = dimsRef.current;
          const longEdge = Math.max(w, h);
          if (!longEdge || resize >= longEdge) return "Original";
          const s = resize / longEdge;
          return `${w}×${h} → ${Math.round(w * s)}×${Math.round(h * s)}`;
        })();

  // ════════════════════════════════ RENDER ══════════════════════════════════
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
      />

      {/* ── Controls column ── */}
      <div className="w-full shrink-0 space-y-4 lg:w-[340px]">
        <Panel
          title="Image"
          right={
            <button type="button" onClick={clearAll} disabled={!loaded} className={btnSm}>
              Clear
            </button>
          }
        >
          <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className={btn}>
              Load image
            </button>
            <button type="button" onClick={resetToAuto} disabled={!manual} className={btn}>
              Reset to auto
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-900">
            Drop a photo or scan onto the preview, click Load, or paste with <b>Ctrl/Cmd+V</b>. Nothing is uploaded — it all
            runs in your browser.
          </p>
        </Panel>

        <Panel title="Straighten & crop">
          <SliderRow
            label="Rotate"
            value={(rotateTenths / 10).toFixed(1) + "°"}
            min={-100}
            max={100}
            step={1}
            raw={rotateTenths}
            disabled={!loaded}
            onChange={(v) => {
              setRotateTenths(v);
              cropRef.current = null;
              setCropMode(false);
              applyGeometry(v / 10);
              autoRef.current = autoDetect(histRef.current, dimsRef.current.w * dimsRef.current.h);
              markManual();
            }}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!loaded}
              onClick={() => {
                setCropReady(false);
                cropStartRef.current = null;
                cropEndRef.current = null;
                setCropMode((m) => !m);
                if (!cropMode) setView("before");
              }}
              className={cropMode ? btnSmActive : btnSm}
            >
              {cropMode ? "Cropping…" : "Crop"}
            </button>
            <button type="button" disabled={!cropReady} onClick={applyCrop} className={btnSm}>
              Apply
            </button>
          </div>
          {cropMode && <p className="mt-2 text-xs text-neutral-900">Drag a rectangle on the image, then Apply.</p>}
        </Panel>

        <Panel title="Levels">
          <div
            className="relative h-36 overflow-hidden rounded-md border-2 border-neutral-900 bg-white"
            onMouseDown={(e) => {
              const n = histNear(e.clientX);
              if (n) {
                histDragRef.current = n;
                e.preventDefault();
              }
            }}
          >
            <canvas ref={histCanvasRef} className="block h-full w-full" />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-neutral-900">
            <span>■ Black {bp}</span>
            <span>γ {(gam / 100).toFixed(1)}</span>
            <span>White {wp} ■</span>
          </div>
          <div className="mt-3 space-y-3">
            <SliderRow
              label="White point"
              value={String(wp)}
              min={100}
              max={255}
              raw={wp}
              disabled={!loaded}
              onChange={(v) => {
                setWp(Math.max(bp + 5, v));
                markManual();
              }}
            />
            <SliderRow
              label="Black point"
              value={String(bp)}
              min={0}
              max={150}
              raw={bp}
              disabled={!loaded}
              onChange={(v) => {
                setBp(Math.min(wp - 5, v));
                markManual();
              }}
            />
            <SliderRow
              label="Midtones (gamma)"
              value={(gam / 100).toFixed(1)}
              min={20}
              max={350}
              raw={gam}
              disabled={!loaded}
              onChange={(v) => {
                setGam(v);
                markManual();
              }}
            />
          </div>
        </Panel>

        <Panel title="Enhancements">
          <div className="space-y-2.5">
            <CheckRow label="Desaturate (black & white)" checked={desat} disabled={!loaded} onChange={(c) => { setDesat(c); markManual(); }} />
            <CheckRow label="Sharpen lines" checked={sharpen} disabled={!loaded} onChange={(c) => { setSharpen(c); markManual(); }} />
            {sharpen && (
              <SliderRow label="Strength" value={String(sharpenAmt)} min={10} max={100} raw={sharpenAmt} disabled={!loaded} onChange={(v) => { setSharpenAmt(v); markManual(); }} />
            )}
            <CheckRow label="Denoise (despeckle)" checked={denoise} disabled={!loaded} onChange={(c) => { setDenoise(c); markManual(); }} />
            {denoise && (
              <SliderRow label="Radius" value={String(denoiseR)} min={1} max={3} raw={denoiseR} disabled={!loaded} onChange={(v) => { setDenoiseR(v); markManual(); }} />
            )}
            <CheckRow label="Adaptive lighting" checked={adaptive} disabled={!loaded} onChange={(c) => { setAdaptive(c); markManual(); }} />
            {adaptive && (
              <SliderRow label="Block size" value={String(block)} min={16} max={256} step={16} raw={block} disabled={!loaded} onChange={(v) => { setBlock(v); markManual(); }} />
            )}
          </div>
        </Panel>

        <Panel
          title="Curves (advanced)"
          right={
            <button type="button" onClick={() => setShowCurves((s) => !s)} className={btnSm}>
              {showCurves ? "Hide" : "Show"}
            </button>
          }
        >
          {showCurves ? (
            <div>
              <div
                className="relative aspect-square w-full overflow-hidden rounded-md border-2 border-neutral-900 bg-white"
                style={{ cursor: "crosshair" }}
                onMouseDown={onCurvesDown}
                onDoubleClick={onCurvesDouble}
              >
                <canvas ref={curvesCanvasRef} className="absolute inset-0 h-full w-full" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {(["scurve", "punch", "fade", "highcon"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={btnSm}
                    onClick={() => {
                      setCurvePts(CURVE_PRESETS[k].map((p) => ({ ...p })));
                      markManual();
                    }}
                  >
                    {k === "scurve" ? "S-Curve" : k === "punch" ? "Punch lines" : k === "fade" ? "Fade BG" : "Hi-contrast"}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${btnSm} col-span-2`}
                  onClick={() => {
                    setCurvePts([{ x: 0, y: 0 }, { x: 255, y: 255 }]);
                    markManual();
                  }}
                >
                  Reset curve
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-900">Click to add a point, drag to move, double-click to remove.</p>
            </div>
          ) : (
            <p className="text-xs text-neutral-900">A hand-drawn tone curve on top of the levels — for fine contrast control.</p>
          )}
        </Panel>

        <Panel title="Export">
          <label className="flex items-center justify-between text-xs font-semibold text-neutral-900">
            <span>Resize (long edge)</span>
            <span>{resizeLabel}</span>
          </label>
          <select
            value={resize}
            disabled={!loaded}
            onChange={(e) => setResize(Number(e.target.value))}
            className="mt-1.5 w-full rounded border-2 border-neutral-900 px-2 py-1.5 text-xs font-semibold text-neutral-900 disabled:opacity-40"
          >
            {RESIZE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r === 0 ? "Original size" : `${r} px`}
              </option>
            ))}
          </select>
          <button type="button" onClick={exportPng} disabled={!loaded} className={`${btnPrimary} mt-3`}>
            Export full-resolution PNG
          </button>
        </Panel>
      </div>

      {/* ── Preview column ── */}
      <div className="min-w-0 flex-1">
        <section className="rounded-lg border-2 border-neutral-900 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Tabs
              label="Choose the preview mode"
              tabs={[
                ["split", "Split"],
                ["before", "Before"],
                ["after", "After"]
              ]}
              active={view}
              onPick={(t) => setView(t as ViewMode)}
            />
            <div className="flex items-center gap-3 text-xs font-semibold text-neutral-900">
              {zoom && <span>{zoom}</span>}
            </div>
          </div>

          <div
            ref={previewWrapRef}
            className="relative flex h-[62vh] min-h-[20rem] items-center justify-center overflow-auto rounded-md border-2 border-neutral-900 bg-[repeating-conic-gradient(#f3f3f1_0%_25%,#fafafa_0%_50%)] bg-[length:22px_22px]"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("ring-2", "ring-[#ff3b21]");
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-[#ff3b21]")}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("ring-2", "ring-[#ff3b21]");
              if (e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
            }}
          >
            {!loaded && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="m-6 flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 self-stretch rounded-xl border-2 border-dashed border-neutral-900 bg-white/70 p-8 text-neutral-900 transition hover:bg-white"
              >
                <span className="text-4xl" aria-hidden="true">▱</span>
                <span className="display-font text-base uppercase">Drop a drawing here</span>
                <span className="max-w-xs text-center text-xs text-neutral-900">
                  or click to load — a phone photo or scan of a pen / pencil drawing works best. JPG, PNG, BMP, WebP. Paste with
                  Ctrl/Cmd+V.
                </span>
              </button>
            )}
            <div ref={hostRef} className={loaded ? "block" : "hidden"} />
            {processing && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="display-font rounded-md border-2 border-neutral-900 bg-white px-5 py-2 text-sm uppercase text-neutral-900 shadow">
                  Processing…
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-900">
            <span className="font-semibold">{status}</span>
            <span>{meta || "Space = before/after toggle · Ctrl/Cmd+V = paste"}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────── small UI bits ──────────────────────────────
const btn =
  "flex-1 rounded border-2 border-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900";
const btnPrimary =
  "w-full rounded border-2 border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:border-[#ff3b21] hover:bg-[#ff3b21] disabled:cursor-not-allowed disabled:opacity-40";
const btnSm =
  "rounded border-2 border-neutral-900 px-2.5 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900";
const btnSmActive = "rounded border-2 border-[#ff3b21] bg-[#ff3b21] px-2.5 py-1 text-xs font-semibold text-white";

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border-2 border-neutral-900 p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="display-font text-sm uppercase tracking-tight text-neutral-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  raw,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  raw: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs font-semibold text-neutral-900">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[#ff3b21] disabled:opacity-40"
      />
    </div>
  );
}

function CheckRow({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-xs font-semibold text-neutral-900">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#ff3b21] disabled:opacity-40"
      />
    </label>
  );
}

// Toggle-button group (matches RAP Studio's Tabs).
function Tabs({
  tabs,
  active,
  onPick,
  label
}: {
  tabs: string[][];
  active: string;
  onPick: (t: string) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {tabs.map(([id, lbl]) => (
        <button
          key={id}
          type="button"
          aria-pressed={active === id}
          onClick={() => onPick(id)}
          className={`rounded px-2.5 py-1 text-xs font-semibold ${
            active === id ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-900 hover:border-neutral-900"
          }`}
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}
