"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Obliquify — import a 3D model and view it under a true oblique (paraline)
// projection. Cabinet / cavalier presets, adjustable receding angle, depth ratio
// and direction; a demo massing is loaded by default so the viewer always shows
// something to test against. STL / OBJ / PLY, all parsed in the browser (nothing
// is uploaded). Export the framed view as a PNG. Chrome matches the site / RAP:
// white, Archivo-Black headers, black 2px-border panels, all-black text.
//
// (Supersedes the old 2D image-extrusion tool — Obliquify is a 3D tool now.)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as THREE from "three";
import type { ViewPreset } from "./ObliqueScene";

const ObliqueScene = dynamic(() => import("./ObliqueScene"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm font-semibold text-neutral-900">Loading 3D…</div>
});

// ── parse a dropped/loaded model into an array of BufferGeometry ─────────────
async function parseModel(file: File): Promise<THREE.BufferGeometry[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".obj")) {
    const text = await file.text();
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    const group = new OBJLoader().parse(text);
    group.updateMatrixWorld(true);
    const out: THREE.BufferGeometry[] = [];
    group.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        const g = (mesh.geometry as THREE.BufferGeometry).clone();
        g.applyMatrix4(mesh.matrixWorld);
        if (!g.getAttribute("normal")) g.computeVertexNormals();
        out.push(g);
      }
    });
    return out;
  }
  const buf = await file.arrayBuffer();
  if (name.endsWith(".ply")) {
    const { PLYLoader } = await import("three/examples/jsm/loaders/PLYLoader.js");
    const g = new PLYLoader().parse(buf);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    return [g];
  }
  // default: STL (binary or ascii)
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  const g = new STLLoader().parse(buf);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  return [g];
}

type ProjPreset = { id: string; label: string; angle: number; depth: number };
const PROJ_PRESETS: ProjPreset[] = [
  { id: "cabinet", label: "Cabinet", angle: 45, depth: 0.5 },
  { id: "cavalier", label: "Cavalier", angle: 45, depth: 1.0 },
  { id: "thirty", label: "30°", angle: 30, depth: 0.6 },
  { id: "sixty", label: "60°", angle: 60, depth: 0.6 }
];

const VIEWS: { id: string; label: string; dir: [number, number, number] }[] = [
  { id: "corner", label: "3/4", dir: [9, 7, 11] },
  { id: "front", label: "Front", dir: [0, 0, 1] },
  { id: "right", label: "Right", dir: [1, 0, 0] },
  { id: "top", label: "Top", dir: [0, 1, 0.0001] }
];

const DIRS: { id: string; glyph: string; dx: 1 | -1; dy: 1 | -1 }[] = [
  { id: "up-left", glyph: "↖", dx: -1, dy: 1 },
  { id: "up-right", glyph: "↗", dx: 1, dy: 1 },
  { id: "down-left", glyph: "↙", dx: -1, dy: -1 },
  { id: "down-right", glyph: "↘", dx: 1, dy: -1 }
];

export default function Obliquify() {
  const [geometries, setGeometries] = useState<THREE.BufferGeometry[] | null>(null);
  const [modelName, setModelName] = useState("Demo massing");
  const [oblique, setOblique] = useState(true);
  const [presetId, setPresetId] = useState("cabinet");
  const [angle, setAngle] = useState(45);
  const [depth, setDepth] = useState(0.5);
  const [dirId, setDirId] = useState("up-right");
  const [showEdges, setShowEdges] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [preset, setPreset] = useState<ViewPreset>({ key: 0, dir: [9, 7, 11] });
  const [status, setStatus] = useState("Demo massing loaded — import a model or orbit to inspect.");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const dir = useMemo(() => DIRS.find((d) => d.id === dirId) ?? DIRS[1], [dirId]);

  const onReady = useCallback((c: HTMLCanvasElement) => {
    canvasRef.current = c;
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!/\.(stl|obj|ply)$/i.test(file.name)) {
      setStatus("Unsupported file — use STL, OBJ or PLY.");
      return;
    }
    setStatus("Parsing " + file.name + "…");
    try {
      const geos = await parseModel(file);
      if (!geos.length) {
        setStatus("No geometry found in " + file.name + ".");
        return;
      }
      setGeometries(geos);
      setModelName(file.name);
      const tris = geos.reduce((n, g) => n + (g.getAttribute("position")?.count ?? 0) / 3, 0);
      setStatus(`${file.name} — ${Math.round(tris).toLocaleString()} triangles`);
    } catch (err) {
      setStatus("Could not parse " + file.name + ": " + (err as Error).message);
    }
  }, []);

  const useDemo = useCallback(() => {
    setGeometries(null);
    setModelName("Demo massing");
    setStatus("Demo massing loaded — import a model or orbit to inspect.");
  }, []);

  const applyProjPreset = useCallback((p: ProjPreset) => {
    setPresetId(p.id);
    setAngle(p.angle);
    setDepth(p.depth);
    setOblique(true);
  }, []);

  const exportPng = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = (modelName.replace(/\.[^.]+$/, "") || "model") + "_oblique.png";
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Exported " + a.download);
    }, "image/png");
  }, [modelName]);

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj,.ply"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
      />

      {/* ── Controls column ── */}
      <div className="w-full shrink-0 space-y-4 lg:w-[320px]">
        <Panel title="Model">
          <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className={btn}>
              Import model
            </button>
            <button type="button" onClick={useDemo} className={btn} disabled={geometries === null}>
              Demo
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-900">
            STL, OBJ or PLY. Drop a file on the viewer or click Import — nothing is uploaded, it&apos;s parsed in your browser.
            Orbit to inspect; the oblique shear holds as you turn.
          </p>
        </Panel>

        <Panel title="Projection">
          <div className="grid grid-cols-2 gap-1.5">
            {PROJ_PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => applyProjPreset(p)} className={oblique && presetId === p.id ? chipActive : chip}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-3">
            <SliderRow
              label="Receding angle"
              value={angle + "°"}
              min={0}
              max={90}
              raw={angle}
              onChange={(v) => {
                setAngle(v);
                setPresetId("custom");
                setOblique(true);
              }}
            />
            <SliderRow
              label="Depth ratio"
              value={depth.toFixed(2)}
              min={0}
              max={140}
              raw={Math.round(depth * 100)}
              onChange={(v) => {
                setDepth(v / 100);
                setPresetId("custom");
                setOblique(true);
              }}
            />
          </div>
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-semibold text-neutral-900">Receding direction</div>
            <div className="grid w-[112px] grid-cols-3 gap-1.5">
              <DirBtn d={DIRS[0]} active={dirId} onPick={setDirId} />
              <Spacer />
              <DirBtn d={DIRS[1]} active={dirId} onPick={setDirId} />
              <Spacer />
              <Spacer />
              <Spacer />
              <DirBtn d={DIRS[2]} active={dirId} onPick={setDirId} />
              <Spacer />
              <DirBtn d={DIRS[3]} active={dirId} onPick={setDirId} />
            </div>
          </div>
          <label className="mt-3 flex items-center justify-between text-xs font-semibold text-neutral-900">
            <span>Oblique projection</span>
            <input type="checkbox" checked={oblique} onChange={(e) => setOblique(e.target.checked)} className="h-4 w-4 accent-[#ff3b21]" />
          </label>
          <p className="mt-1 text-xs text-neutral-900">Off = plain orthographic, for comparison.</p>
        </Panel>

        <Panel title="Display">
          <div className="space-y-2.5">
            <CheckRow label="Edge outlines" checked={showEdges} onChange={setShowEdges} />
            <CheckRow label="Ground grid" checked={showGrid} onChange={setShowGrid} />
          </div>
          <div className="mt-3 text-xs font-semibold text-neutral-900">View</div>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={chip}
                onClick={() => setPreset((prev) => ({ key: prev.key + 1, dir: v.dir }))}
              >
                {v.label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Export">
          <button type="button" onClick={exportPng} className={btnPrimary}>
            Export PNG
          </button>
        </Panel>
      </div>

      {/* ── Viewer column ── */}
      <div className="min-w-0 flex-1">
        <section className="rounded-lg border-2 border-neutral-900 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="display-font text-sm uppercase tracking-tight text-neutral-900">Viewport — oblique</h2>
            <span className="text-xs font-semibold text-neutral-900">{modelName}</span>
          </div>
          <div
            className="relative h-[64vh] min-h-[22rem] overflow-hidden rounded-md border-2 border-neutral-900 bg-white"
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
            <ObliqueScene
              geometries={geometries}
              angle={angle}
              depthRatio={oblique ? depth : 0}
              dirX={dir.dx}
              dirY={dir.dy}
              oblique={oblique}
              showEdges={showEdges}
              showGrid={showGrid}
              preset={preset}
              onReady={onReady}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-900">
            <span className="font-semibold">{status}</span>
            <span>Drag-orbit · scroll-zoom · drop a model to load</span>
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
  "w-full rounded border-2 border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:border-[#ff3b21] hover:bg-[#ff3b21]";
const chip =
  "rounded border-2 border-neutral-900 px-2 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white";
const chipActive = "rounded border-2 border-[#ff3b21] bg-[#ff3b21] px-2 py-1.5 text-xs font-semibold text-white";

function Spacer() {
  return <div className="invisible" />;
}

function DirBtn({ d, active, onPick }: { d: (typeof DIRS)[number]; active: string; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-label={d.id}
      aria-pressed={active === d.id}
      onClick={() => onPick(d.id)}
      className={`aspect-square rounded border-2 text-sm font-bold ${
        active === d.id ? "border-[#ff3b21] bg-[#ff3b21] text-white" : "border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white"
      }`}
    >
      {d.glyph}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border-2 border-neutral-900 p-3">
      <h2 className="display-font mb-2.5 text-sm uppercase tracking-tight text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  raw,
  onChange
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  raw: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs font-semibold text-neutral-900">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </label>
      <input type="range" min={min} max={max} value={raw} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5 w-full accent-[#ff3b21]" />
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-xs font-semibold text-neutral-900">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#ff3b21]" />
    </label>
  );
}
