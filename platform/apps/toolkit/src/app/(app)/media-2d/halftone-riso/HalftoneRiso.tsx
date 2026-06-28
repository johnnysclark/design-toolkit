"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Halftone & Riso — turn any image into a halftone, duotone or full Risograph-
// style spot-colour separation, entirely in the browser (nothing is uploaded).
//
// Pick a separation (Mono · Duotone · Tritone · CMYK), a dot shape and ruling,
// then craft each plate: its Riso ink, its screen angle and a touch of mis-
// registration. The plates over-print with a multiply blend onto a paper colour,
// with optional grain — the printerly "tooth". Export the finished composite as a
// full-resolution PNG, the per-ink plates as black-on-transparent masters for an
// actual Risograph, or the whole thing as a vector SVG of real dots.
//
// Styled in the toolkit's language (white ground, Archivo-Black headers, black
// 2px-border panels, all-black text) so it reads as part of the site, like the
// Drawing Cleaner.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildSvg,
  CHANNEL_LABELS,
  renderLayerPlate,
  renderToCanvas,
  type DotShape,
  type LayerCfg,
  type RenderParams,
  type SepMode
} from "./engine";

const ACCENT = "#ff3b21";

// Working resolution for the live preview; full res (capped) for export.
const WORK_MAX = 1100;
const EXPORT_MAX = 4096;

// Curated Risograph ink palette — authentic spot-ink hexes from the RISO colour
// guide. Pick from these or set any custom colour per plate.
const RISO_INKS: [string, string][] = [
  ["Black", "#000000"],
  ["Steel", "#3D3D3D"],
  ["Burgundy", "#914E72"],
  ["Purple", "#765BA7"],
  ["Violet", "#8D63A8"],
  ["Federal Blue", "#3D5588"],
  ["Blue", "#0078BF"],
  ["Aqua", "#5EC8E5"],
  ["Teal", "#00838A"],
  ["Green", "#00A95C"],
  ["Yellow", "#FFE800"],
  ["Gold", "#E5AD00"],
  ["Fluor. Orange", "#FF6C2F"],
  ["Orange", "#FF8E3C"],
  ["Bright Red", "#F15060"],
  ["Red", "#FF665E"],
  ["Fluor. Pink", "#FF48B0"],
  ["Pink", "#FF7CA8"],
  ["Kraft Brown", "#92592A"],
  ["Gray", "#88898A"],
  ["White", "#FFFFFF"]
];

const PAPERS: [string, string][] = [
  ["White", "#FFFFFF"],
  ["Natural", "#F6F1E7"],
  ["Cream", "#F4EFD9"],
  ["Newsprint", "#ECE7D6"],
  ["Cool Grey", "#E7E8E6"],
  ["Kraft", "#D9C3A0"]
];

const SHAPES: [DotShape, string][] = [
  ["circle", "Circle"],
  ["ellipse", "Ellipse"],
  ["diamond", "Diamond"],
  ["square", "Square"],
  ["line", "Line"],
  ["cross", "Cross"]
];

// Default plate stacks per separation mode — Riso-flavoured inks + the classic
// non-moiré screen angles.
const MODE_DEFAULTS: Record<SepMode, LayerCfg[]> = {
  mono: [{ ink: "#111111", angleDeg: 45, dx: 0, dy: 0, on: true }],
  duotone: [
    { ink: "#0E4DA4", angleDeg: 45, dx: 0, dy: 0, on: true },
    { ink: "#FF48B0", angleDeg: 15, dx: 0, dy: 0, on: true }
  ],
  tritone: [
    { ink: "#0078BF", angleDeg: 15, dx: 0, dy: 0, on: true },
    { ink: "#FF48B0", angleDeg: 75, dx: 0, dy: 0, on: true },
    { ink: "#FFE800", angleDeg: 0, dx: 0, dy: 0, on: true }
  ],
  cmyk: [
    { ink: "#0078BF", angleDeg: 15, dx: 0, dy: 0, on: true },
    { ink: "#FF48B0", angleDeg: 75, dx: 0, dy: 0, on: true },
    { ink: "#FFE800", angleDeg: 0, dx: 0, dy: 0, on: true },
    { ink: "#111111", angleDeg: 45, dx: 0, dy: 0, on: true }
  ]
};

interface ToneState {
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
}

interface Preset {
  label: string;
  mode: SepMode;
  shape: DotShape;
  cell: number;
  gain: number;
  crisp: boolean;
  inkOpacity: number;
  paper: string;
  grain: number;
  grainSize: number;
  jitter: number;
  gcr: number;
  tone: ToneState;
  inks: string[];
  angles: number[];
}

const PRESETS: Preset[] = [
  {
    label: "Riso 2-Tone",
    mode: "duotone",
    shape: "circle",
    cell: 6,
    gain: 1.05,
    crisp: false,
    inkOpacity: 0.92,
    paper: "#F6F1E7",
    grain: 0.12,
    grainSize: 1.6,
    jitter: 1.2,
    gcr: 0.5,
    tone: { brightness: 2, contrast: 10, gamma: 1.05, invert: false },
    inks: ["#0E4DA4", "#FF48B0"],
    angles: [45, 15]
  },
  {
    label: "Fluoro Pop",
    mode: "duotone",
    shape: "circle",
    cell: 6,
    gain: 1.1,
    crisp: false,
    inkOpacity: 0.9,
    paper: "#FBF7E9",
    grain: 0.08,
    grainSize: 1.5,
    jitter: 1.8,
    gcr: 0.5,
    tone: { brightness: 6, contrast: 14, gamma: 1.1, invert: false },
    inks: ["#FF48B0", "#FFE800"],
    angles: [75, 0]
  },
  {
    label: "Process Riso",
    mode: "tritone",
    shape: "circle",
    cell: 5,
    gain: 1.05,
    crisp: false,
    inkOpacity: 0.9,
    paper: "#F7F3EA",
    grain: 0.1,
    grainSize: 1.5,
    jitter: 1.2,
    gcr: 0.5,
    tone: { brightness: 2, contrast: 8, gamma: 1.05, invert: false },
    inks: ["#0078BF", "#FF48B0", "#FFE800"],
    angles: [15, 75, 0]
  },
  {
    label: "CMYK Mag",
    mode: "cmyk",
    shape: "circle",
    cell: 4,
    gain: 1.0,
    crisp: false,
    inkOpacity: 0.95,
    paper: "#FFFFFF",
    grain: 0.04,
    grainSize: 1.4,
    jitter: 0,
    gcr: 0.55,
    tone: { brightness: 0, contrast: 6, gamma: 1.0, invert: false },
    inks: ["#0078BF", "#FF48B0", "#FFE800", "#111111"],
    angles: [15, 75, 0, 45]
  },
  {
    label: "Newsprint",
    mode: "mono",
    shape: "circle",
    cell: 5,
    gain: 1.0,
    crisp: false,
    inkOpacity: 0.95,
    paper: "#F4F1E6",
    grain: 0.14,
    grainSize: 1.4,
    jitter: 0,
    gcr: 0.5,
    tone: { brightness: 4, contrast: 16, gamma: 1.0, invert: false },
    inks: ["#1A1A1A"],
    angles: [45]
  },
  {
    label: "Comic Ink",
    mode: "mono",
    shape: "circle",
    cell: 8,
    gain: 1.08,
    crisp: true,
    inkOpacity: 1,
    paper: "#FFFFFF",
    grain: 0,
    grainSize: 1.5,
    jitter: 0,
    gcr: 0.5,
    tone: { brightness: 0, contrast: 28, gamma: 1.05, invert: false },
    inks: ["#111111"],
    angles: [45]
  },
  {
    label: "Cyanotype",
    mode: "mono",
    shape: "circle",
    cell: 6,
    gain: 1.05,
    crisp: false,
    inkOpacity: 0.95,
    paper: "#EFEAD8",
    grain: 0.08,
    grainSize: 1.6,
    jitter: 0,
    gcr: 0.5,
    tone: { brightness: 0, contrast: 10, gamma: 1.0, invert: true },
    inks: ["#1C3F6E"],
    angles: [45]
  },
  {
    label: "Poster Duo",
    mode: "duotone",
    shape: "diamond",
    cell: 9,
    gain: 1.12,
    crisp: false,
    inkOpacity: 0.95,
    paper: "#F2EFE4",
    grain: 0.06,
    grainSize: 1.8,
    jitter: 1.0,
    gcr: 0.5,
    tone: { brightness: 0, contrast: 20, gamma: 1.0, invert: false },
    inks: ["#243A8C", "#F15060"],
    angles: [45, 15]
  },
  {
    label: "Line Screen",
    mode: "mono",
    shape: "line",
    cell: 6,
    gain: 1.0,
    crisp: false,
    inkOpacity: 1,
    paper: "#FFFFFF",
    grain: 0,
    grainSize: 1.5,
    jitter: 0,
    gcr: 0.5,
    tone: { brightness: 0, contrast: 18, gamma: 1.0, invert: false },
    inks: ["#111111"],
    angles: [45]
  }
];

const EXPORT_SIZES: [string, string][] = [
  ["0", "Native"],
  ["3000", "3000 px"],
  ["2000", "2000 px"],
  ["1500", "1500 px"],
  ["1000", "1000 px"]
];

type ViewMode = "split" | "before" | "after";
type SectionKey = "presets" | "screen" | "inks" | "tone" | "paper" | "export";

const inkName = (hex: string): string => {
  const m = RISO_INKS.find(([, h]) => h.toLowerCase() === hex.toLowerCase());
  return m ? m[0] : "custom";
};

const fmtCount = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

// ════════════════════════════════ COMPONENT ═════════════════════════════════

export default function HalftoneRiso() {
  // image sources
  const rawImgRef = useRef<HTMLImageElement | null>(null);
  const srcWorkRef = useRef<ImageData | null>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const fileNameRef = useRef("");

  // preview DOM
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRectRef = useRef({ ox: 0, oy: 0, dw: 0, dh: 0 });

  // params
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<SepMode>("duotone");
  const [shape, setShape] = useState<DotShape>("circle");
  const [cell, setCell] = useState(6);
  const [gain, setGain] = useState(1.05);
  const [crisp, setCrisp] = useState(false);
  const [inkOpacity, setInkOpacity] = useState(0.92);
  const [gcr, setGcr] = useState(0.5);
  const [brightness, setBrightness] = useState(2);
  const [contrast, setContrast] = useState(10);
  const [gamma, setGamma] = useState(1.05);
  const [invert, setInvert] = useState(false);
  const [paper, setPaper] = useState("#F6F1E7");
  const [grain, setGrain] = useState(0.12);
  const [grainSize, setGrainSize] = useState(1.6);
  const [jitter, setJitter] = useState(1.2);
  const [layers, setLayers] = useState<LayerCfg[]>(() => MODE_DEFAULTS.duotone.map((l) => ({ ...l })));

  // view / ui
  const [view, setView] = useState<ViewMode>("after");
  const [split, setSplit] = useState(0.5);
  const [exportSize, setExportSize] = useState("0");
  const [status, setStatus] = useState("Drop an image to begin");
  const [meta, setMeta] = useState("");
  const [zoom, setZoom] = useState("");
  const [dotCount, setDotCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renderSeq, setRenderSeq] = useState(0);
  const [resizeTick, setResizeTick] = useState(0);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    presets: true,
    screen: true,
    inks: true,
    tone: false,
    paper: false,
    export: true
  });
  const toggle = useCallback((k: SectionKey) => setOpen((o) => ({ ...o, [k]: !o[k] })), []);

  // lazily-created offscreen canvases
  useEffect(() => {
    beforeCanvasRef.current = document.createElement("canvas");
    outCanvasRef.current = document.createElement("canvas");
    scratchRef.current = document.createElement("canvas");
  }, []);

  const buildParams = useCallback((): RenderParams => {
    return {
      mode,
      shape,
      cell,
      gain,
      crisp,
      inkOpacity,
      gcr,
      tone: { brightness, contrast, gamma, invert },
      paper,
      grain,
      grainSize,
      jitter,
      layers
    };
  }, [mode, shape, cell, gain, crisp, inkOpacity, gcr, brightness, contrast, gamma, invert, paper, grain, grainSize, jitter, layers]);

  // ── load an image (file / drop / paste) ──────────────────────────────────
  const loadFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("That doesn't look like an image file.");
      return;
    }
    fileNameRef.current = file.name || "pasted-image.png";
    setStatus("Loading…");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        rawImgRef.current = img;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const ws = Math.min(1, WORK_MAX / Math.max(iw, ih));
        const ww = Math.max(1, Math.round(iw * ws));
        const wh = Math.max(1, Math.round(ih * ws));
        const bc = beforeCanvasRef.current!;
        bc.width = ww;
        bc.height = wh;
        const bctx = bc.getContext("2d")!;
        bctx.drawImage(img, 0, 0, ww, wh);
        srcWorkRef.current = bctx.getImageData(0, 0, ww, wh);
        setLoaded(true);
        setView("after");
        setMeta(`${iw}×${ih}`);
        setRenderSeq((s) => s + 1);
      };
      img.onerror = () => setStatus("Couldn't decode that image.");
      img.src = reader.result as string;
    };
    reader.onerror = () => setStatus("Couldn't read that file.");
    reader.readAsDataURL(file);
  }, []);

  const clearAll = useCallback(() => {
    rawImgRef.current = null;
    srcWorkRef.current = null;
    setLoaded(false);
    setStatus("Drop an image to begin");
    setMeta("");
    setZoom("");
    setDotCount(0);
    const cv = previewCanvasRef.current;
    if (cv) {
      const ctx = cv.getContext("2d");
      ctx?.clearRect(0, 0, cv.width, cv.height);
    }
  }, []);

  // drag-drop + clipboard paste
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            loadFile(f);
            e.preventDefault();
            return;
          }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [loadFile]);

  // ── draw the visible preview from the offscreen composite / original ──────
  const drawPreview = useCallback(() => {
    const wrap = previewWrapRef.current;
    const cv = previewCanvasRef.current;
    if (!wrap || !cv) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    if (cw === 0 || ch === 0) return;
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
    cv.style.width = `${cw}px`;
    cv.style.height = `${ch}px`;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const out = outCanvasRef.current;
    const before = beforeCanvasRef.current;
    if (!loaded || !out || out.width === 0) {
      setZoom("");
      return;
    }
    const iw = out.width;
    const ih = out.height;
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const ox = (cw - dw) / 2;
    const oy = (ch - dh) / 2;
    imgRectRef.current = { ox, oy, dw, dh };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (view === "before" && before) {
      ctx.drawImage(before, ox, oy, dw, dh);
    } else if (view === "split" && before) {
      ctx.drawImage(out, ox, oy, dw, dh);
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, dw * split, dh);
      ctx.clip();
      ctx.drawImage(before, ox, oy, dw, dh);
      ctx.restore();
      const sx = ox + dw * split;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, oy);
      ctx.lineTo(sx, oy + dh);
      ctx.stroke();
    } else {
      ctx.drawImage(out, ox, oy, dw, dh);
    }
    setZoom(`${Math.round(scale * 100)}%`);
  }, [loaded, view, split]);

  // re-draw preview when the composite, view, split or container size changes
  useEffect(() => {
    drawPreview();
  }, [drawPreview, renderSeq, resizeTick]);

  // observe the preview container for responsive redraw
  useEffect(() => {
    const wrap = previewWrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ── the live render (debounced) ───────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const src = srcWorkRef.current;
    const out = outCanvasRef.current;
    const scratch = scratchRef.current;
    if (!src || !out || !scratch) return;
    setProcessing(true);
    const params = buildParams();
    const timer = setTimeout(() => {
      const stats = renderToCanvas(src, params, out, scratch, 1);
      setDotCount(stats.dotCount);
      setProcessing(false);
      setRenderSeq((s) => s + 1);
    }, 110);
    return () => clearTimeout(timer);
  }, [loaded, buildParams]);

  // status line tracks the current setup
  useEffect(() => {
    if (!loaded) return;
    const live = layers.filter((l) => l.on).length;
    const modeLabel = mode === "cmyk" ? "CMYK" : mode[0].toUpperCase() + mode.slice(1);
    setStatus(`${modeLabel} · ${live} ink${live === 1 ? "" : "s"} · ${shape}`);
  }, [loaded, mode, shape, layers]);

  // ── mode / layer editing ──────────────────────────────────────────────────
  const pickMode = useCallback((m: SepMode) => {
    setMode(m);
    setLayers(MODE_DEFAULTS[m].map((l) => ({ ...l })));
  }, []);

  const updateLayer = useCallback((i: number, patch: Partial<LayerCfg>) => {
    setLayers((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }, []);

  const applyPreset = useCallback((p: Preset) => {
    setMode(p.mode);
    setShape(p.shape);
    setCell(p.cell);
    setGain(p.gain);
    setCrisp(p.crisp);
    setInkOpacity(p.inkOpacity);
    setPaper(p.paper);
    setGrain(p.grain);
    setGrainSize(p.grainSize);
    setJitter(p.jitter);
    setGcr(p.gcr);
    setBrightness(p.tone.brightness);
    setContrast(p.tone.contrast);
    setGamma(p.tone.gamma);
    setInvert(p.tone.invert);
    setLayers(
      MODE_DEFAULTS[p.mode].map((l, i) => ({
        ...l,
        ink: p.inks[i] ?? l.ink,
        angleDeg: p.angles[i] ?? l.angleDeg
      }))
    );
  }, []);

  // ── split drag ────────────────────────────────────────────────────────────
  const draggingRef = useRef(false);
  const updateSplit = useCallback((clientX: number) => {
    const { ox, dw } = imgRectRef.current;
    const rect = previewWrapRef.current?.getBoundingClientRect();
    if (!rect || dw <= 0) return;
    const x = clientX - rect.left - ox;
    setSplit(Math.max(0, Math.min(1, x / dw)));
  }, []);
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!loaded || view !== "split") return;
      draggingRef.current = true;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      updateSplit(e.clientX);
    },
    [loaded, view, updateSplit]
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingRef.current) updateSplit(e.clientX);
    },
    [updateSplit]
  );
  const endDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);

  // ── exports ───────────────────────────────────────────────────────────────
  // Rasterise the original at the chosen export resolution → ImageData.
  const exportSource = useCallback((): { src: ImageData; scaleFromWork: number } | null => {
    const img = rawImgRef.current;
    const work = srcWorkRef.current;
    if (!img || !work) return null;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const target = exportSize === "0" ? Math.min(EXPORT_MAX, Math.max(iw, ih)) : Math.min(EXPORT_MAX, Number(exportSize));
    const s = Math.min(1, target / Math.max(iw, ih));
    const ew = Math.max(1, Math.round(iw * s));
    const eh = Math.max(1, Math.round(ih * s));
    const c = document.createElement("canvas");
    c.width = ew;
    c.height = eh;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, ew, eh);
    return { src: ctx.getImageData(0, 0, ew, eh), scaleFromWork: ew / work.width };
  }, [exportSize]);

  const baseName = useCallback(() => fileNameRef.current.replace(/\.[^.]+$/, "") || "halftone", []);

  const download = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const exportPng = useCallback(() => {
    const es = exportSource();
    if (!es) return;
    setBusy(true);
    setStatus("Rendering full-resolution PNG…");
    // let the status paint before the heavy synchronous render
    setTimeout(() => {
      const c = document.createElement("canvas");
      const scratch = document.createElement("canvas");
      const params = buildParams();
      renderToCanvas(es.src, params, c, scratch, es.scaleFromWork);
      c.toBlob((blob) => {
        if (blob) download(blob, `${baseName()}_halftone.png`);
        setBusy(false);
        setStatus(`Exported ${c.width}×${c.height} PNG`);
      }, "image/png");
    }, 30);
  }, [exportSource, buildParams, download, baseName]);

  const exportPlate = useCallback(
    (i: number) => {
      const es = exportSource();
      if (!es) return;
      setBusy(true);
      setStatus(`Rendering plate ${i + 1}…`);
      setTimeout(() => {
        const c = document.createElement("canvas");
        const params = buildParams();
        renderLayerPlate(es.src, params, i, c);
        const nm = inkName(layers[i].ink).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        c.toBlob((blob) => {
          if (blob) download(blob, `${baseName()}_plate-${i + 1}-${nm}.png`);
          setBusy(false);
          setStatus(`Exported plate ${i + 1} (${CHANNEL_LABELS[mode][i] ?? "ink"}) — black on transparent`);
        }, "image/png");
      }, 30);
    },
    [exportSource, buildParams, download, baseName, layers, mode]
  );

  const exportSvg = useCallback(() => {
    const src = srcWorkRef.current;
    if (!src) return;
    setBusy(true);
    setStatus("Building vector SVG…");
    setTimeout(() => {
      const params = buildParams();
      const { svg, dotCount: dc } = buildSvg(src, params, 1);
      download(new Blob([svg], { type: "image/svg+xml" }), `${baseName()}_halftone.svg`);
      setBusy(false);
      setStatus(`Exported vector SVG · ${fmtCount(dc)} dots`);
    }, 30);
  }, [buildParams, download, baseName]);

  // keyboard: Space toggles before/after
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && loaded && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setView((v) => (v === "before" ? "after" : "before"));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loaded]);

  const channelLabels = CHANNEL_LABELS[mode];
  const inkOptions = useMemo(() => RISO_INKS.map(([n, h]) => [h, n] as [string, string]), []);

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadFile(f);
          e.target.value = "";
        }}
      />

      {/* ── Controls column ── */}
      <div className="w-full shrink-0 space-y-3 lg:w-[360px]">
        <div>
          <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className={btn}>
              Load image
            </button>
            <button type="button" onClick={clearAll} disabled={!loaded} className={btn}>
              Clear
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-900">
            Drop an image onto the preview, click Load, or paste with <b>Ctrl/Cmd+V</b>. Nothing is uploaded — it all runs in
            your browser.
          </p>
        </div>

        <Section title="Presets" open={open.presets} onToggle={() => toggle("presets")}>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => applyPreset(p)} disabled={!loaded} className={btnSm}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-900">A starting point — every control below stays editable.</p>
        </Section>

        <Section title="Screen" open={open.screen} onToggle={() => toggle("screen")}>
          <div className="mb-1.5 text-xs font-semibold text-neutral-900">Separation</div>
          <Tabs
            label="Choose the colour separation"
            tabs={[
              ["mono", "Mono"],
              ["duotone", "Duo"],
              ["tritone", "Tri"],
              ["cmyk", "CMYK"]
            ]}
            active={mode}
            onPick={(t) => pickMode(t as SepMode)}
          />
          <p className="mt-1.5 text-xs text-neutral-900">
            {mode === "mono"
              ? "One ink — a classic halftone."
              : mode === "duotone"
                ? "Two inks — a key plate + a shadow accent."
                : mode === "tritone"
                  ? "Three process inks (CMY) — bright, no black."
                  : "Four process inks (CMYK) — full colour in dots."}
          </p>

          <div className="mt-3 space-y-2.5">
            <SelectRow
              label="Dot shape"
              value={shape}
              options={SHAPES.map(([v, l]) => [v, l])}
              onChange={(v) => setShape(v as DotShape)}
            />
            <SliderRow label="Ruling (dot pitch)" value={`${cell} px`} min={3} max={20} raw={cell} onChange={setCell} />
            <SliderRow
              label="Dot gain"
              value={`${gain.toFixed(2)}×`}
              min={0.6}
              max={1.6}
              step={0.05}
              raw={gain}
              onChange={setGain}
            />
            <SliderRow
              label="Ink strength"
              value={`${Math.round(inkOpacity * 100)}%`}
              min={0.6}
              max={1}
              step={0.02}
              raw={inkOpacity}
              onChange={setInkOpacity}
            />
            {mode === "cmyk" && (
              <SliderRow
                label="Black generation (K)"
                value={`${Math.round(gcr * 100)}%`}
                min={0}
                max={1}
                step={0.05}
                raw={gcr}
                onChange={setGcr}
              />
            )}
            <CheckRow label="Crisp (1-bit) edges" checked={crisp} onChange={setCrisp} />
          </div>
        </Section>

        <Section title="Inks & Plates" open={open.inks} onToggle={() => toggle("inks")}>
          <div className="space-y-2.5">
            {layers.map((L, i) => (
              <div key={i} className="rounded border-2 border-neutral-900 p-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-900">
                    <input
                      type="checkbox"
                      checked={L.on}
                      onChange={(e) => updateLayer(i, { on: e.target.checked })}
                      className="h-4 w-4 accent-[#ff3b21]"
                    />
                    <span
                      className="inline-block h-4 w-4 shrink-0 rounded-sm border-2 border-neutral-900"
                      style={{ backgroundColor: L.ink }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{channelLabels[i] ?? `Ink ${i + 1}`}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => exportPlate(i)}
                    disabled={!loaded || busy || !L.on}
                    title="Export this plate as a black-on-transparent PNG master"
                    className={btnTiny}
                  >
                    ⤓ plate
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={inkOptions.some(([h]) => h.toLowerCase() === L.ink.toLowerCase()) ? L.ink : "custom"}
                    onChange={(e) => e.target.value !== "custom" && updateLayer(i, { ink: e.target.value })}
                    className="min-w-0 flex-1 rounded border-2 border-neutral-900 px-2 py-1 text-xs font-semibold text-neutral-900"
                  >
                    {!inkOptions.some(([h]) => h.toLowerCase() === L.ink.toLowerCase()) && <option value="custom">Custom</option>}
                    {inkOptions.map(([h, n]) => (
                      <option key={h} value={h}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={L.ink}
                    onChange={(e) => updateLayer(i, { ink: e.target.value })}
                    className="h-7 w-9 shrink-0 cursor-pointer rounded border-2 border-neutral-900 bg-white p-0.5"
                    aria-label={`${channelLabels[i] ?? "Ink"} colour`}
                  />
                </div>
                <div className="mt-2">
                  <SliderRow
                    label="Screen angle"
                    value={`${L.angleDeg}°`}
                    min={0}
                    max={180}
                    raw={L.angleDeg}
                    onChange={(v) => updateLayer(i, { angleDeg: v })}
                  />
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <SliderRow
                    label="Offset X"
                    value={`${L.dx}`}
                    min={-10}
                    max={10}
                    step={0.5}
                    raw={L.dx}
                    onChange={(v) => updateLayer(i, { dx: v })}
                  />
                  <SliderRow
                    label="Offset Y"
                    value={`${L.dy}`}
                    min={-10}
                    max={10}
                    step={0.5}
                    raw={L.dy}
                    onChange={(v) => updateLayer(i, { dy: v })}
                  />
                </div>
              </div>
            ))}
            <SliderRow
              label="Registration jitter"
              value={`${jitter.toFixed(1)} px`}
              min={0}
              max={6}
              step={0.2}
              raw={jitter}
              onChange={setJitter}
            />
            <p className="text-xs text-neutral-900">
              Each plate prints in its own ink at its own angle; offsets &amp; jitter are the printerly mis-registration.
            </p>
          </div>
        </Section>

        <Section title="Tone" open={open.tone} onToggle={() => toggle("tone")}>
          <div className="space-y-2.5">
            <SliderRow label="Brightness" value={`${brightness}`} min={-100} max={100} raw={brightness} onChange={setBrightness} />
            <SliderRow label="Contrast" value={`${contrast}`} min={-100} max={100} raw={contrast} onChange={setContrast} />
            <SliderRow
              label="Gamma"
              value={gamma.toFixed(2)}
              min={0.3}
              max={3}
              step={0.05}
              raw={gamma}
              onChange={setGamma}
            />
            <CheckRow label="Invert (negative)" checked={invert} onChange={setInvert} />
          </div>
        </Section>

        <Section title="Paper & Grain" open={open.paper} onToggle={() => toggle("paper")}>
          <div className="space-y-2.5">
            <div>
              <div className="mb-1.5 text-xs font-semibold text-neutral-900">Paper</div>
              <div className="flex flex-wrap gap-1.5">
                {PAPERS.map(([n, h]) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setPaper(h)}
                    title={n}
                    aria-label={n}
                    className={`h-7 w-7 rounded border-2 ${
                      paper.toLowerCase() === h.toLowerCase() ? "border-[#ff3b21]" : "border-neutral-900"
                    }`}
                    style={{ backgroundColor: h }}
                  />
                ))}
                <input
                  type="color"
                  value={paper}
                  onChange={(e) => setPaper(e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded border-2 border-neutral-900 bg-white p-0.5"
                  aria-label="Custom paper colour"
                />
              </div>
            </div>
            <SliderRow
              label="Grain"
              value={`${Math.round(grain * 100)}%`}
              min={0}
              max={0.5}
              step={0.02}
              raw={grain}
              onChange={setGrain}
            />
            <SliderRow
              label="Grain size"
              value={`${grainSize.toFixed(1)} px`}
              min={1}
              max={6}
              step={0.5}
              raw={grainSize}
              onChange={setGrainSize}
            />
          </div>
        </Section>

        <Section title="Export" open={open.export} onToggle={() => toggle("export")}>
          <div className="space-y-2.5">
            <SelectRow label="Size (longest side)" value={exportSize} options={EXPORT_SIZES.map(([v, l]) => [v, l])} onChange={setExportSize} />
            <button type="button" onClick={exportPng} disabled={!loaded || busy} className={btnPrimary}>
              {busy ? "Working…" : "Export composite PNG"}
            </button>
            <button type="button" onClick={exportSvg} disabled={!loaded || busy} className={btnSm + " w-full"}>
              Export vector SVG
            </button>
            <p className="text-xs text-neutral-900">
              Composite = finished art (paper + over-print + grain). <b>SVG</b> is real vector dots for crisp print, plotter or
              laser. Per-ink <b>plate</b> masters (black-on-transparent, for an actual Risograph) export from each row in Inks &amp;
              Plates above.
            </p>
          </div>
        </Section>
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
              {dotCount > 0 && <span>~{fmtCount(dotCount)} dots</span>}
              {zoom && <span>{zoom}</span>}
            </div>
          </div>

          <div
            ref={previewWrapRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`relative flex h-[64vh] min-h-[20rem] items-center justify-center overflow-hidden rounded-md border-2 border-neutral-900 bg-[repeating-conic-gradient(#f3f3f1_0%_25%,#fafafa_0%_50%)] bg-[length:22px_22px] ${
              loaded && view === "split" ? "cursor-col-resize" : ""
            }`}
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
                <span className="text-4xl" aria-hidden="true">◍</span>
                <span className="display-font text-base uppercase">Drop an image here</span>
                <span className="max-w-xs text-center text-xs text-neutral-900">
                  or click to load — a photo, drawing or render. JPG, PNG, WebP. Paste with Ctrl/Cmd+V.
                </span>
              </button>
            )}
            <canvas ref={previewCanvasRef} className={loaded ? "block touch-none" : "hidden"} />
            {processing && loaded && (
              <div className="pointer-events-none absolute bottom-2 right-2">
                <div className="display-font rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-[11px] uppercase text-neutral-900 shadow">
                  Screening…
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-900">
            <span className="font-semibold">{status}</span>
            <span>{meta ? `${meta} · Space = before/after` : "Space = before/after toggle"}</span>
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
const btnTiny =
  "shrink-0 rounded border-2 border-neutral-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900";

// Collapsible disclosure — header toggles, body unmounts when closed.
function Section({
  title,
  open,
  onToggle,
  children
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border-2 border-neutral-900">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-neutral-50"
      >
        <span className="display-font text-sm uppercase tracking-tight text-neutral-900">{title}</span>
        <span aria-hidden="true" className={`text-xs text-neutral-900 transition-transform ${open ? "rotate-90" : ""}`}>
          ▸
        </span>
      </button>
      {open && <div className="border-t-2 border-neutral-900 px-3 py-3">{children}</div>}
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

function SelectRow({
  label,
  value,
  options,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  options: string[][];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-neutral-900">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded border-2 border-neutral-900 px-2 py-1.5 text-xs font-semibold text-neutral-900 disabled:opacity-40"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

// Toggle-button group (matches the Drawing Cleaner / RAP Studio Tabs).
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
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
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
