"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Vectorize — raster → vector, entirely in the browser (nothing is uploaded).
// Three trace modes share one engine (src/lib/vectorize):
//   • Centreline — Zhang–Suen thinning + skeleton walk → one path per stroke.
//     The architect's case: a Make2D dump or a pen sketch becomes editable lines.
//   • Outline    — boundary-edge loop tracing → filled shapes (logos, poché).
//   • Colour     — median-cut posterise → one filled vector layer per colour.
// Threshold (Otsu auto / manual), despeckle, RDP simplify and corner-aware
// Catmull-Rom smoothing tune the result; export is SVG or millimetre DXF.
//
// Styled in the toolkit's language (white, Archivo-Black headers, 2px-black
// panels, all-black text, the #ff3b21 accent) so it reads as part of the site.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cmdsToD,
  layerToPath,
  toDXF,
  toSVG,
  trace,
  type FillStyle,
  type OutlineMethod,
  type TraceMode,
  type TraceOptions,
  type TraceResult
} from "@/lib/vectorize";

const ACCENT = "#ff3b21";

type ViewMode = "vector" | "overlay" | "source";

interface Working {
  data: ImageData;
  scale: number; // working px → original px
  w: number;
  h: number;
}

const RES_OPTIONS: [string, string][] = [
  ["600", "Fast · 0.6k"],
  ["1000", "Balanced · 1k"],
  ["1600", "Fine · 1.6k"],
  ["2400", "Max · 2.4k"]
];

export default function Vectorize() {
  // ── source image ──
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const dataUrlRef = useRef<string>("");
  const workingRef = useRef<Working | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── options ──
  const [mode, setMode] = useState<TraceMode>("outline");
  const [outlineMethod, setOutlineMethod] = useState<OutlineMethod>("centreline");
  const [fillStyle, setFillStyle] = useState<FillStyle>("mono");
  const [blur, setBlur] = useState(0);
  const [autoThreshold, setAuto] = useState(true);
  const [threshold, setThreshold] = useState(128);
  const [adaptive, setAdaptive] = useState(false);
  const [adaptiveRadius, setAdaptiveRadius] = useState(14);
  const [adaptiveBias, setAdaptiveBias] = useState(8);
  const [invert, setInvert] = useState(false);
  const [morphAmt, setMorphAmt] = useState(0);
  const [despeckle, setDespeckle] = useState(6);
  const [holeArea, setHoleArea] = useState(2);
  const [detail, setDetail] = useState(1.2);
  const [smooth, setSmooth] = useState(0.8);
  const [corner, setCorner] = useState(78);
  const [minLength, setMinLength] = useState(6);
  const [colors, setColors] = useState(6);
  const [fill, setFill] = useState("#111111");
  const [stroke, setStroke] = useState("#111111");
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [maxDim, setMaxDim] = useState(1000);

  // ── output / view ──
  const [view, setView] = useState<ViewMode>("vector");
  const [showNodes, setShowNodes] = useState(false);
  const [whiteBg, setWhiteBg] = useState(false);
  const [outWidthMm, setOutWidthMm] = useState(200);
  const [zoom, setZoom] = useState(1);

  // ── derived / status ──
  const [result, setResult] = useState<TraceResult | null>(null);
  const [tracing, setTracing] = useState(false);
  const [traceMs, setTraceMs] = useState(0);
  const [status, setStatus] = useState("Drop a drawing, paste, or try the sample.");

  const [open, setOpen] = useState({
    source: true,
    mode: true,
    ink: true,
    cleanup: true,
    shape: true,
    output: true
  });
  const toggle = (k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // ── working-resolution downscale (vectors are resolution-independent, so we
  //    trace a capped raster for speed and bake the scale back into the output) ──
  const rebuildWorking = useCallback((dim: number) => {
    const img = imgElRef.current;
    if (!img) return;
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const long = Math.max(W, H);
    const f = long > dim ? dim / long : 1;
    const ww = Math.max(1, Math.round(W * f));
    const hh = Math.max(1, Math.round(H * f));
    const c = document.createElement("canvas");
    c.width = ww;
    c.height = hh;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, ww, hh);
    workingRef.current = { data: ctx.getImageData(0, 0, ww, hh), scale: W / ww, w: ww, h: hh };
  }, []);

  const loadFromImage = useCallback(
    (img: HTMLImageElement, dataUrl: string, name: string) => {
      imgElRef.current = img;
      dataUrlRef.current = dataUrl;
      setFileName(name);
      rebuildWorking(maxDim);
      setLoaded(true);
      setZoom(1);
      const mp = ((img.naturalWidth * img.naturalHeight) / 1e6).toFixed(1);
      setStatus(`${img.naturalWidth}×${img.naturalHeight} (${mp} MP) — ${name}`);
    },
    [maxDim, rebuildWorking]
  );

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/") && !/\.(jpe?g|png|bmp|webp|gif|tiff?)$/i.test(file.name)) {
        setStatus("Error: not a supported image file");
        return;
      }
      setStatus("Loading " + (file.name || "image") + "…");
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const img = new Image();
        img.onload = () => loadFromImage(img, url, file.name || "pasted-image.png");
        img.onerror = () => setStatus("Error: could not decode image");
        img.src = url;
      };
      reader.onerror = () => setStatus("Error: could not read file");
      reader.readAsDataURL(file);
    },
    [loadFromImage]
  );

  // Procedural sample — a little plan-ish line drawing that shows off centreline.
  const loadSample = useCallback(() => {
    const W = 900;
    const H = 640;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    if (!x) return;
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, W, H);
    x.strokeStyle = "#111111";
    x.lineJoin = "round";
    x.lineCap = "round";
    // outer wall
    x.lineWidth = 7;
    x.strokeRect(70, 70, W - 140, H - 140);
    // interior partitions
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(380, 70);
    x.lineTo(380, 360);
    x.lineTo(W - 70, 360);
    x.moveTo(380, 470);
    x.lineTo(W - 70, 470);
    x.moveTo(70, 470);
    x.lineTo(380, 470);
    x.stroke();
    // a column (circle) + grid dot
    x.lineWidth = 4;
    x.beginPath();
    x.arc(225, 250, 26, 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.arc(225, 250, 3, 0, Math.PI * 2);
    x.fillStyle = "#111111";
    x.fill();
    // a door swing
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(380, 250);
    x.lineTo(470, 250);
    x.moveTo(470, 250);
    x.arc(380, 250, 90, 0, Math.PI / 2, false);
    x.stroke();
    // stair hatching
    x.lineWidth = 2.5;
    x.beginPath();
    for (let i = 0; i <= 8; i++) {
      const yy = 510 + i * 14;
      x.moveTo(120, yy);
      x.lineTo(330, yy);
    }
    x.moveTo(120, 510);
    x.lineTo(120, 622);
    x.moveTo(330, 510);
    x.lineTo(330, 622);
    x.stroke();
    // a diagonal brace + dimension ticks
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(470, 380);
    x.lineTo(W - 90, H - 90);
    x.stroke();
    const url = c.toDataURL("image/png");
    const img = new Image();
    img.onload = () => {
      loadFromImage(img, url, "sample-plan.png");
      setMode("outline");
      setOutlineMethod("centreline");
    };
    img.src = url;
  }, [loadFromImage]);

  const clearAll = useCallback(() => {
    imgElRef.current = null;
    workingRef.current = null;
    dataUrlRef.current = "";
    setLoaded(false);
    setResult(null);
    setStatus("Drop a drawing, paste, or try the sample.");
  }, []);

  // Re-downscale when the trace-resolution control changes.
  useEffect(() => {
    if (loaded) rebuildWorking(maxDim);
  }, [maxDim, loaded, rebuildWorking]);

  // ── drag-drop + clipboard paste (mount-once) ──
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

  // ── the trace (debounced; the engine is synchronous but fast at capped res) ──
  const optsKey = JSON.stringify({
    mode,
    outlineMethod,
    fillStyle,
    blur,
    autoThreshold,
    threshold,
    adaptive,
    adaptiveRadius,
    adaptiveBias,
    invert,
    morphAmt,
    despeckle,
    holeArea,
    detail,
    smooth,
    corner,
    minLength,
    colors,
    fill,
    stroke,
    strokeWidth,
    maxDim
  });

  useEffect(() => {
    if (!loaded) return;
    setTracing(true);
    const id = window.setTimeout(() => {
      const wk = workingRef.current;
      if (!wk) {
        setTracing(false);
        return;
      }
      const opts: TraceOptions = {
        mode,
        outlineMethod,
        fillStyle,
        scale: wk.scale,
        blur,
        autoThreshold,
        threshold,
        adaptive,
        adaptiveRadius,
        adaptiveBias,
        invert,
        morph: morphAmt,
        despeckle,
        holeArea,
        detail,
        smooth,
        corner,
        minLength,
        colors,
        fill,
        stroke,
        strokeWidth
      };
      const t0 = performance.now();
      try {
        const res = trace(wk.data, opts);
        setResult(res);
        setTraceMs(performance.now() - t0);
      } catch (err) {
        setStatus("Trace error: " + (err instanceof Error ? err.message : String(err)));
      }
      setTracing(false);
    }, 150);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, optsKey]);

  // ── preview sizing (fit + zoom) ──
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    // Native non-passive wheel listener so we can preventDefault the page scroll
    // while zooming (React's onWheel is passive and would warn).
    const onWheel = (e: WheelEvent) => {
      if (!workingRef.current) return;
      e.preventDefault();
      setZoom((z) => Math.max(0.1, Math.min(16, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const dispScale = useMemo(() => {
    if (!result) return 1;
    const fit = Math.min((box.w - 24) / result.width, (box.h - 24) / result.height);
    const f = Number.isFinite(fit) && fit > 0 ? fit : 1;
    return Math.max(0.02, Math.min(16, f * zoom));
  }, [result, box, zoom]);

  // ── preview SVG (built by hand so we can recolour the overlay + draw nodes) ──
  const previewSVG = useMemo(() => {
    if (!result) return "";
    const W = result.width;
    const H = result.height;
    const dispW = Math.max(1, Math.round(W * dispScale));
    const dispH = Math.max(1, Math.round(H * dispScale));
    const parts: string[] = [];
    if (view === "vector") parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);
    if (view === "source" || view === "overlay") {
      parts.push(
        `<image href="${dataUrlRef.current}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" opacity="${
          view === "overlay" ? 0.4 : 1
        }"/>`
      );
    }
    if (view === "vector") {
      for (const l of result.layers) parts.push(layerToPath(l));
    } else if (view === "overlay") {
      for (const l of result.layers) {
        const d = l.subpaths.map((sp) => cmdsToD(sp.cmds)).join("");
        if (!d) continue;
        if (l.kind === "fill") {
          parts.push(`<path d="${d}" fill="${ACCENT}" fill-rule="evenodd" fill-opacity="0.45"/>`);
        } else {
          const sw = Math.max(l.width ?? 1, 1.1 / dispScale);
          parts.push(
            `<path d="${d}" fill="none" stroke="${ACCENT}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
          );
        }
      }
    }
    if (showNodes && view !== "source") {
      const r = Math.max(0.6, 2.4 / dispScale);
      let n = 0;
      const dots: string[] = [];
      const CAP = 4000;
      outer: for (const l of result.layers) {
        for (const sp of l.subpaths) {
          for (const cmd of sp.cmds) {
            if (cmd.c === "Z") continue;
            dots.push(`<circle cx="${cmd.x}" cy="${cmd.y}" r="${r}"/>`);
            if (++n >= CAP) break outer;
          }
        }
      }
      parts.push(`<g fill="${ACCENT}" fill-opacity="0.9">${dots.join("")}</g>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${dispW}" height="${dispH}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision">${parts.join(
      ""
    )}</svg>`;
  }, [result, view, showNodes, dispScale]);

  // ── exports ──
  const baseName = () => (fileName ? fileName.replace(/\.[^.]+$/, "") : "vectorized");
  const exportSVG = useCallback(() => {
    if (!result) return;
    download(`${baseName()}.svg`, toSVG(result, whiteBg ? "#ffffff" : null), "image/svg+xml");
  }, [result, whiteBg, fileName]);

  const exportDXF = useCallback(() => {
    if (!result) return;
    const mmPerPx = outWidthMm / result.width;
    download(`${baseName()}.dxf`, toDXF(result, mmPerPx), "application/dxf");
  }, [result, outWidthMm, fileName]);

  const [copied, setCopied] = useState(false);
  const copySVG = useCallback(() => {
    if (!result) return;
    navigator.clipboard?.writeText(toSVG(result, whiteBg ? "#ffffff" : null)).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      },
      () => setStatus("Clipboard blocked — use Export SVG instead.")
    );
  }, [result, whiteBg]);

  // ── stats ──
  const stats = useMemo(() => {
    if (!result) return null;
    const svgBytes = toSVG(result, whiteBg ? "#ffffff" : null).length;
    return {
      regions: result.stats.regions,
      subpaths: result.stats.subpaths,
      nodes: result.stats.nodes,
      kb: (svgBytes / 1024).toFixed(svgBytes > 1024 * 100 ? 0 : 1)
    };
  }, [result, whiteBg]);

  // Colour fill quantises RGB directly, so the black-ink threshold controls don't
  // apply to it; every other mode binarises first.
  const isColour = mode === "fill" && fillStyle === "colour";
  const usesThreshold = !isColour;

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
      <div className="w-full shrink-0 space-y-3 lg:w-[340px]">
        <Section title="Image" open={open.source} onToggle={() => toggle("source")}>
          <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className={btn}>
              Load image
            </button>
            <button type="button" onClick={loadSample} className={btn}>
              Sample
            </button>
            <button type="button" onClick={clearAll} disabled={!loaded} className={btn}>
              Clear
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-900">
            Drop a file on the canvas, click Load, or paste (Ctrl/Cmd+V). A clean black-on-white scan —{" "}
            <em>or a Make2D / line drawing</em> — traces best.
          </p>
          <div className="mt-3">
            <SelectRow
              label="Trace resolution"
              value={String(maxDim)}
              options={RES_OPTIONS}
              onChange={(v) => setMaxDim(Number(v))}
            />
            <p className="mt-1 text-[11px] text-neutral-900">Higher = finer detail, slower. Vectors scale cleanly regardless.</p>
          </div>
        </Section>

        <Section title="Mode" open={open.mode} onToggle={() => toggle("mode")}>
          <Tabs
            label="Vectorize mode"
            tabs={[
              ["outline", "Outline"],
              ["fill", "Fill"]
            ]}
            active={mode}
            onPick={(t) => setMode(t as TraceMode)}
          />
          <p className="mt-2 text-xs text-neutral-900">
            {mode === "outline"
              ? "Stroked line work — the output is open/closed paths, not solids."
              : "Solid filled shapes — the ink (or each colour) becomes a filled region."}
          </p>

          {mode === "outline" && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold text-neutral-900">Method</div>
              <Tabs
                label="Outline method"
                tabs={[
                  ["centreline", "Centreline"],
                  ["contour", "Contour"]
                ]}
                active={outlineMethod}
                onPick={(t) => setOutlineMethod(t as OutlineMethod)}
              />
              <p className="mt-2 text-xs text-neutral-900">
                {outlineMethod === "centreline"
                  ? "One line down the middle of each stroke — a Make2D / pen drawing becomes single editable paths."
                  : "Strokes the boundary of the ink — the silhouette / edge of filled shapes (thick lines give a double edge)."}
              </p>
            </div>
          )}

          {mode === "fill" && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold text-neutral-900">Style</div>
              <Tabs
                label="Fill style"
                tabs={[
                  ["mono", "Mono"],
                  ["colour", "Colour"]
                ]}
                active={fillStyle}
                onPick={(t) => setFillStyle(t as FillStyle)}
              />
              <p className="mt-2 text-xs text-neutral-900">
                {fillStyle === "mono"
                  ? "A single filled colour — silhouettes, logos, poché. Interior holes drop out (even-odd)."
                  : "Posterises the image and fills each flat colour band as its own layer."}
              </p>
              {fillStyle === "colour" && (
                <div className="mt-3">
                  <SliderRow label="Colours" value={String(colors)} min={2} max={12} raw={colors} onChange={setColors} />
                </div>
              )}
            </div>
          )}
        </Section>

        {usesThreshold && (
          <Section title="Ink & threshold" open={open.ink} onToggle={() => toggle("ink")}>
            <CheckRow label="Adaptive (uneven lighting)" checked={adaptive} onChange={setAdaptive} />
            {adaptive ? (
              <div className="mt-2 space-y-3">
                <SliderRow label="Local radius" value={`${adaptiveRadius} px`} min={3} max={60} raw={adaptiveRadius} onChange={setAdaptiveRadius} />
                <SliderRow label="Bias" value={String(adaptiveBias)} min={0} max={40} raw={adaptiveBias} onChange={setAdaptiveBias} />
                <p className="text-[11px] text-neutral-900">
                  Thresholds each pixel against its neighbourhood — pulls ink out of shadowed phone photos. Bias up = stricter.
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <CheckRow label="Auto (Otsu)" checked={autoThreshold} onChange={setAuto} />
                <SliderRow
                  label="Threshold"
                  value={autoThreshold && result ? `${result.threshold} (auto)` : String(threshold)}
                  min={1}
                  max={254}
                  raw={autoThreshold && result && result.threshold >= 0 ? result.threshold : threshold}
                  disabled={autoThreshold}
                  onChange={(v) => {
                    setThreshold(v);
                    setAuto(false);
                  }}
                />
              </div>
            )}
            <div className="mt-2">
              <CheckRow label="Invert (light ink on dark)" checked={invert} onChange={setInvert} />
            </div>
          </Section>
        )}

        <Section title="Cleanup" open={open.cleanup} onToggle={() => toggle("cleanup")}>
          <SliderRow label="Pre-blur" value={blur === 0 ? "off" : `${blur} px`} min={0} max={6} raw={blur} onChange={setBlur} />
          <div className="mt-1 mb-3 text-[11px] text-neutral-900">Softens grain &amp; noise before tracing.</div>
          <SliderRow
            label="Clean up"
            value={morphAmt === 0 ? "off" : morphAmt > 0 ? `bridge ${morphAmt}` : `open ${-morphAmt}`}
            min={-4}
            max={4}
            raw={morphAmt}
            onChange={setMorphAmt}
          />
          <div className="mt-1 mb-3 text-[11px] text-neutral-900">
            − drops specks &amp; shaves fuzz · + bridges hairline gaps and joins broken strokes.
          </div>
          <SliderRow label="Despeckle" value={`${despeckle} px²`} min={0} max={150} raw={despeckle} onChange={setDespeckle} />
          <div className="mt-3">
            <SliderRow label="Min feature / hole" value={`${holeArea} px²`} min={0} max={150} raw={holeArea} onChange={setHoleArea} />
          </div>
          <div className="mt-1 text-[11px] text-neutral-900">Drops isolated specks and tiny loops / holes below this area.</div>
        </Section>

        <Section title="Shape & smoothing" open={open.shape} onToggle={() => toggle("shape")}>
          <SliderRow label="Detail (simplify)" value={detail.toFixed(1)} min={0} max={6} step={0.1} raw={detail} onChange={setDetail} />
          <div className="mt-1 mb-3 text-[11px] text-neutral-900">Lower = follows every wobble. Higher = fewer, cleaner nodes.</div>
          <SliderRow label="Smoothing" value={`${Math.round(smooth * 100)}%`} min={0} max={100} raw={Math.round(smooth * 100)} onChange={(v) => setSmooth(v / 100)} />
          <div className="mt-3">
            <SliderRow label="Corner threshold" value={`${corner}°`} min={20} max={160} raw={corner} onChange={setCorner} />
          </div>
          <div className="mt-1 text-[11px] text-neutral-900">Turns sharper than this stay hard corners; gentler ones curve.</div>
          {mode === "outline" && outlineMethod === "centreline" && (
            <div className="mt-3">
              <SliderRow label="Min line length" value={`${minLength} px`} min={0} max={40} raw={minLength} onChange={setMinLength} />
              <div className="mt-1 text-[11px] text-neutral-900">Drops skeleton spurs and crumbs at crossings.</div>
            </div>
          )}
          {mode === "outline" && (
            <>
              <div className="mt-3">
                <SliderRow label="Stroke weight" value={strokeWidth.toFixed(1)} min={0.3} max={8} step={0.1} raw={strokeWidth} onChange={setStrokeWidth} />
              </div>
              <div className="mt-3">
                <ColorRow label="Stroke colour" value={stroke} onChange={setStroke} />
              </div>
            </>
          )}
          {mode === "fill" && fillStyle === "mono" && (
            <div className="mt-3">
              <ColorRow label="Fill colour" value={fill} onChange={setFill} />
            </div>
          )}
        </Section>

        <Section title="Export" open={open.output} onToggle={() => toggle("output")}>
          <CheckRow label="White background (SVG)" checked={whiteBg} onChange={setWhiteBg} />
          <div className="mt-3">
            <label className="flex items-center justify-between text-xs font-semibold text-neutral-900">
              <span>Output width (DXF)</span>
              <span className="tabular-nums">{outWidthMm} mm</span>
            </label>
            <input
              type="number"
              min={1}
              value={outWidthMm}
              onChange={(e) => setOutWidthMm(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1.5 w-full rounded border-2 border-neutral-900 px-2 py-1.5 text-xs font-semibold text-neutral-900"
            />
            <p className="mt-1 text-[11px] text-neutral-900">Sets the DXF scale — the drawing&apos;s long edge maps to real millimetres for CAD / laser.</p>
          </div>
          <button type="button" onClick={exportSVG} disabled={!result} className={`${btnPrimary} mt-3`}>
            Export SVG
          </button>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={exportDXF} disabled={!result} className={btn}>
              Export DXF
            </button>
            <button type="button" onClick={copySVG} disabled={!result} className={btn}>
              {copied ? "Copied ✓" : "Copy SVG"}
            </button>
          </div>
        </Section>
      </div>

      {/* ── Preview column ── */}
      <div className="min-w-0 flex-1">
        <section className="rounded-lg border-2 border-neutral-900 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Tabs
              label="Preview mode"
              tabs={[
                ["vector", "Vector"],
                ["overlay", "Overlay"],
                ["source", "Source"]
              ]}
              active={view}
              onPick={(t) => setView(t as ViewMode)}
            />
            <div className="flex items-center gap-2">
              <CheckRow label="Nodes" checked={showNodes} onChange={setShowNodes} compact />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setZoom((z) => Math.max(0.1, z / 1.3))} disabled={!result} className={btnSm} aria-label="Zoom out">
                  −
                </button>
                <button type="button" onClick={() => setZoom(1)} disabled={!result} className={btnSm}>
                  Fit
                </button>
                <button type="button" onClick={() => setZoom((z) => Math.min(16, z * 1.3))} disabled={!result} className={btnSm} aria-label="Zoom in">
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            ref={previewRef}
            className="relative flex h-[64vh] min-h-[22rem] items-center justify-center overflow-auto rounded-md border-2 border-neutral-900 bg-[repeating-conic-gradient(#f3f3f1_0%_25%,#fafafa_0%_50%)] bg-[length:22px_22px]"
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
                <span className="text-4xl" aria-hidden="true">⌗</span>
                <span className="display-font text-base uppercase">Drop a drawing here</span>
                <span className="max-w-xs text-center text-xs text-neutral-900">
                  or click to load — a scan, a sketch, or a Make2D line drawing. JPG, PNG, WebP. Paste with Ctrl/Cmd+V, or
                  press <strong>Sample</strong>.
                </span>
              </button>
            )}
            {loaded && previewSVG && (
              <div
                className="shrink-0 shadow-sm"
                role="img"
                aria-label={`Vector preview — ${mode} trace of ${fileName || "the image"}`}
                // The preview SVG is generated by our own engine from in-memory
                // pixels — no external/user HTML — so injecting it is safe here.
                dangerouslySetInnerHTML={{ __html: previewSVG }}
              />
            )}
            {tracing && (
              <div className="pointer-events-none absolute right-3 top-3">
                <div className="display-font rounded-md border-2 border-neutral-900 bg-white px-3 py-1 text-xs uppercase text-neutral-900 shadow">
                  Tracing…
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-neutral-900">
            <span className="font-semibold">{status}</span>
            {stats && (
              <span className="tabular-nums">
                {isColour ? `${stats.subpaths} shapes` : `${stats.regions} region${stats.regions === 1 ? "" : "s"}`} ·{" "}
                {stats.subpaths} path{stats.subpaths === 1 ? "" : "s"} · {stats.nodes} nodes · ~{stats.kb} KB ·{" "}
                {Math.round(traceMs)} ms
              </span>
            )}
          </div>
        </section>
        <p className="mt-2 text-xs text-neutral-900">
          Scroll to zoom · drag a file anywhere on the canvas · everything is computed in your browser — the image is never
          uploaded.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────── helpers ────────────────────────────
function download(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ─────────────────────────── small UI bits (toolkit house style) ─────────────
const btn =
  "flex-1 rounded border-2 border-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900";
const btnPrimary =
  "w-full rounded border-2 border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:border-[#ff3b21] hover:bg-[#ff3b21] disabled:cursor-not-allowed disabled:opacity-40";
const btnSm =
  "rounded border-2 border-neutral-900 px-2.5 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900";

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
  onChange,
  compact
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (c: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 text-xs font-semibold text-neutral-900 ${compact ? "" : "justify-between"}`}>
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
  options: [string, string][];
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

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border-2 border-neutral-900 bg-white p-0.5"
      />
    </label>
  );
}

function Tabs({
  tabs,
  active,
  onPick,
  label
}: {
  tabs: [string, string][];
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
