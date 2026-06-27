"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Obliquify — import a 3D model and view it under a true oblique (paraline)
// projection. Cabinet / cavalier presets, adjustable receding angle, depth ratio
// and direction; a demo massing is loaded by default so the viewer always shows
// something to test against. STL / OBJ / PLY / 3DM (Rhino), all parsed in the
// browser (nothing is uploaded). Export the framed view as a PNG. Chrome matches
// the site / RAP: white, Archivo-Black headers, black 2px-border panels, all-black
// text.
//
// Oblique is shown view-locked to a principal face (Front / Plan / Side), which is
// what makes it a correct cabinet / cavalier / planometric drawing; "3·4 Axon" is
// a free-orbit true axonometric for comparison.
//
// (Supersedes the old 2D image-extrusion tool — Obliquify is a 3D tool now.)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as THREE from "three";

const ObliqueScene = dynamic(() => import("./ObliqueScene"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm font-semibold text-neutral-900">Loading 3D…</div>
});

// ── collect baked, world-space mesh geometries from a loaded scene graph ──────
// Expands instanced meshes (Rhino blocks) so every placement shows, and skips
// empty geometry. Uses only Matrix4 instance methods, so a type-only THREE
// import is enough.
function collectMeshGeometries(root: THREE.Object3D): THREE.BufferGeometry[] {
  root.updateMatrixWorld(true);
  const out: THREE.BufferGeometry[] = [];
  root.traverse((c) => {
    const mesh = c as THREE.Mesh & {
      isInstancedMesh?: boolean;
      count?: number;
      getMatrixAt?: (i: number, m: THREE.Matrix4) => void;
    };
    if (!mesh.isMesh || !mesh.geometry) return;
    const base = mesh.geometry as THREE.BufferGeometry;
    const pos = base.getAttribute("position");
    if (!pos || pos.count === 0) return;
    const bake = (world: THREE.Matrix4) => {
      const g = base.clone();
      g.applyMatrix4(world);
      if (!g.getAttribute("normal")) g.computeVertexNormals();
      out.push(g);
    };
    if (mesh.isInstancedMesh && typeof mesh.getMatrixAt === "function" && mesh.count) {
      const inst = mesh.matrixWorld.clone();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, inst); // inst ← per-instance local matrix
        bake(mesh.matrixWorld.clone().multiply(inst)); // world = parentWorld · instance
      }
    } else {
      bake(mesh.matrixWorld);
    }
  });
  return out;
}

// ── parse a dropped/loaded model into an array of BufferGeometry ─────────────
async function parseModel(file: File): Promise<THREE.BufferGeometry[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".obj")) {
    const text = await file.text();
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    return collectMeshGeometries(new OBJLoader().parse(text));
  }

  if (name.endsWith(".3dm")) {
    // Rhino files: parsed in a worker via rhino3dm WASM (vendored under
    // /vendor/rhino3dm/). 3DMLoader returns Rhino's render meshes; Rhino is
    // Z-up, so rotate −90° about X into three's Y-up before baking.
    const buf = await file.arrayBuffer();
    const { Rhino3dmLoader } = await import("three/examples/jsm/loaders/3DMLoader.js");
    const loader = new Rhino3dmLoader();
    loader.setLibraryPath("/vendor/rhino3dm/");
    const object = await new Promise<THREE.Object3D>((resolve, reject) =>
      loader.parse(buf, resolve, reject)
    );
    object.rotation.x = -Math.PI / 2; // Rhino Z-up → three Y-up
    const out = collectMeshGeometries(object);
    if (typeof (loader as unknown as { dispose?: () => void }).dispose === "function") {
      (loader as unknown as { dispose: () => void }).dispose();
    }
    return out;
  }

  const buf = await file.arrayBuffer();
  if (name.endsWith(".ply")) {
    const { PLYLoader } = await import("three/examples/jsm/loaders/PLYLoader.js");
    const g = new PLYLoader().parse(buf);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    const pos = g.getAttribute("position");
    return pos && pos.count > 0 ? [g] : [];
  }
  // default: STL (binary or ascii)
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  const g = new STLLoader().parse(buf);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const pos = g.getAttribute("position");
  return pos && pos.count > 0 ? [g] : [];
}

type ProjPreset = { id: string; label: string; angle: number; depth: number };
const PROJ_PRESETS: ProjPreset[] = [
  { id: "cabinet", label: "Cabinet", angle: 45, depth: 0.5 },
  { id: "cavalier", label: "Cavalier", angle: 45, depth: 1.0 },
  { id: "thirty", label: "30°", angle: 30, depth: 0.5 },
  { id: "sixty", label: "60°", angle: 60, depth: 0.5 }
];

// Views: the three principal faces give a TRUE oblique (face stays true-shape,
// depth recedes). "3·4 Axon" is a free-orbit true axonometric for comparison.
type ViewDef = { id: string; label: string; dir: [number, number, number]; axon?: boolean };
const VIEWS: ViewDef[] = [
  { id: "front", label: "Front", dir: [0, 0, 1] },
  { id: "plan", label: "Plan", dir: [0, 1, 0.0001] },
  { id: "side", label: "Side", dir: [1, 0, 0] },
  { id: "axon", label: "3·4 Axon", dir: [9, 7, 11], axon: true }
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
  const [viewId, setViewId] = useState("front");
  const [viewNonce, setViewNonce] = useState(0);
  const [status, setStatus] = useState("Demo massing loaded — cabinet projection, Front. Import a model or pick a view.");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const dir = useMemo(() => DIRS.find((d) => d.id === dirId) ?? DIRS[1], [dirId]);
  const view = useMemo(() => VIEWS.find((v) => v.id === viewId) ?? VIEWS[0], [viewId]);
  const isAxon = !!view.axon;
  const effectiveOblique = oblique && !isAxon;

  const onReady = useCallback((c: HTMLCanvasElement) => {
    canvasRef.current = c;
  }, []);

  const pickView = useCallback((id: string) => {
    setViewId(id);
    setViewNonce((n) => n + 1); // re-snap even if same button is pressed again
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!/\.(stl|obj|ply|3dm)$/i.test(file.name)) {
      setStatus("Unsupported file — use STL, OBJ, PLY or 3DM.");
      return;
    }
    setStatus("Parsing " + file.name + "…");
    try {
      const geos = await parseModel(file);
      if (!geos.length) {
        setStatus(
          /\.3dm$/i.test(file.name)
            ? `No render meshes in ${file.name}. In Rhino, shade the view (or mesh the objects) before saving the .3dm.`
            : "No geometry found in " + file.name + "."
        );
        return;
      }
      setGeometries(geos);
      setModelName(file.name);
      // triangles = index.count/3 for indexed meshes (OBJ/PLY/3DM), else position.count/3 (STL)
      const tris = geos.reduce((n, g) => {
        const idx = g.getIndex();
        return n + (idx ? idx.count : (g.getAttribute("position")?.count ?? 0)) / 3;
      }, 0);
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

  const applyProjPreset = useCallback(
    (p: ProjPreset) => {
      setPresetId(p.id);
      setAngle(p.angle);
      setDepth(p.depth);
      setOblique(true);
      if (isAxon) pickView("front"); // a projection preset only reads on a face
    },
    [isAxon, pickView]
  );

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
        accept=".stl,.obj,.ply,.3dm"
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
            STL, OBJ, PLY or 3DM (Rhino). Drop a file on the viewer or click Import — nothing is uploaded, it&apos;s parsed in
            your browser. A .3dm needs render meshes saved in it (shade the Rhino view before saving).
          </p>
        </Panel>

        <Panel title="Projection">
          <div className="grid grid-cols-2 gap-1.5">
            {PROJ_PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => applyProjPreset(p)} className={effectiveOblique && presetId === p.id ? chipActive : chip}>
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
          <p className="mt-1 text-xs text-neutral-900">
            {isAxon
              ? "3·4 Axon is a true axonometric — orbit freely. Oblique applies to the Front / Plan / Side views."
              : "Off = plain orthographic (elevation / plan / section), for comparison."}
          </p>
        </Panel>

        <Panel title="View">
          <div className="grid grid-cols-4 gap-1.5">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" className={viewId === v.id ? chipActive : chip} onClick={() => pickView(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-neutral-900">
            Front / Plan / Side keep that face true-shape while depth recedes — a correct cabinet / cavalier / planometric
            drawing.
          </p>
        </Panel>

        <Panel title="Display">
          <div className="space-y-2.5">
            <CheckRow label="Edge outlines" checked={showEdges} onChange={setShowEdges} />
            <CheckRow label="Ground grid" checked={showGrid} onChange={setShowGrid} />
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
            <h2 className="display-font text-sm uppercase tracking-tight text-neutral-900">
              Viewport — {isAxon ? "axonometric" : effectiveOblique ? "oblique" : "orthographic"}
            </h2>
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
              depthRatio={effectiveOblique ? depth : 0}
              dirX={dir.dx}
              dirY={dir.dy}
              oblique={effectiveOblique}
              allowOrbit={isAxon}
              camDir={view.dir}
              viewNonce={viewNonce}
              showEdges={showEdges}
              showGrid={showGrid}
              onReady={onReady}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-900">
            <span className="font-semibold">{status}</span>
            <span>{isAxon ? "drag-orbit · scroll-zoom · drop a model" : "scroll-zoom · drop a model · pick a view"}</span>
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
