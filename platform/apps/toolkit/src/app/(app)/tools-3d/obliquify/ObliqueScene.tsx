"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ObliqueScene — the three.js (react-three-fiber) viewport for Obliquify.
//
// Oblique (paraline) projection done properly: an ORTHOGRAPHIC camera whose
// projection matrix is post-sheared so eye-space depth slides into screen x/y.
// That is the textbook definition of an oblique projection — the camera-facing
// plane stays true-shape while the depth axis recedes at a chosen angle and
// foreshortening ratio (cabinet = ½, cavalier = 1). The shear is injected by
// wrapping camera.updateProjectionMatrix(), so it survives every orbit, zoom and
// resize that rebuilds the projection.
//
// Loaded via next/dynamic({ ssr:false }) — WebGL + the STL/OBJ/PLY loaders are
// browser-only. Look matches the site / RAP: white faces, black edges, a paraline
// line-drawing read.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Center, Edges, Grid } from "@react-three/drei";

const INK = "#111111";
const FACE = "#f4f4f2";

export type ViewPreset = { key: number; dir: [number, number, number] };

type Props = {
  geometries: THREE.BufferGeometry[] | null;
  angle: number; // degrees
  depthRatio: number; // 0..1.4 (cabinet .5, cavalier 1)
  dirX: 1 | -1;
  dirY: 1 | -1;
  oblique: boolean;
  showEdges: boolean;
  showGrid: boolean;
  preset: ViewPreset;
  onReady: (canvas: HTMLCanvasElement) => void;
};

// ── the oblique shear, applied by wrapping updateProjectionMatrix ────────────
function ObliqueProjection({
  angle,
  depthRatio,
  dirX,
  dirY,
  oblique
}: Pick<Props, "angle" | "depthRatio" | "dirX" | "dirY" | "oblique">) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const orig = cam.updateProjectionMatrix.bind(cam);
    const a = (angle * Math.PI) / 180;
    // Eye-space depth (z<0 in front) → screen offset L·(cosα, sinα) per unit depth.
    const kx = -depthRatio * Math.cos(a) * dirX;
    const ky = -depthRatio * Math.sin(a) * dirY;
    const shear = new THREE.Matrix4().set(1, 0, kx, 0, 0, 1, ky, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    cam.updateProjectionMatrix = function () {
      orig();
      if (oblique) {
        this.projectionMatrix.multiply(shear);
        this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
      }
    };
    cam.updateProjectionMatrix();
    return () => {
      cam.updateProjectionMatrix = orig;
      orig();
    };
  }, [camera, angle, depthRatio, dirX, dirY, oblique]);
  return null;
}

// ── snap the camera to a preset direction (front / top / side / corner) ──────
function CameraRig({ preset }: { preset: ViewPreset }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    const dist = 14;
    const d = new THREE.Vector3(...preset.dir);
    if (d.lengthSq() === 0) d.set(0, 0, 1);
    d.normalize().multiplyScalar(dist);
    camera.position.copy(d);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    } else {
      camera.lookAt(0, 0, 0);
    }
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.key]);
  return null;
}

// Re-apply the shear every frame (after controls), so zoom/orbit never strips it.
function KeepObliqueAlive() {
  const camera = useThree((s) => s.camera);
  useFrame(() => camera.updateProjectionMatrix());
  return null;
}

function ExportHook({ onReady }: { onReady: (c: HTMLCanvasElement) => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    onReady(gl.domElement);
  }, [gl, onReady]);
  return null;
}

function ModelMesh({ geometry, showEdges }: { geometry: THREE.BufferGeometry; showEdges: boolean }) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={FACE} roughness={0.85} metalness={0} flatShading />
      {showEdges && <Edges threshold={18} color={INK} />}
    </mesh>
  );
}

// Default demo massing — a small stepped building, so the viewer always has
// something with real depth to read under the oblique projection.
function DemoMassing({ showEdges }: { showEdges: boolean }) {
  const blocks: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, 0.6, 0], size: [6, 1.2, 4] }, // plinth
    { pos: [-1, 2.1, 0.4], size: [3.2, 1.8, 2.6] }, // mid mass
    { pos: [1.6, 3.0, -0.4], size: [1.6, 3.6, 1.6] } // tower
  ];
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={FACE} roughness={0.85} metalness={0} flatShading />
          {showEdges && <Edges threshold={1} color={INK} />}
        </mesh>
      ))}
    </group>
  );
}

export default function ObliqueScene({
  geometries,
  angle,
  depthRatio,
  dirX,
  dirY,
  oblique,
  showEdges,
  showGrid,
  preset,
  onReady
}: Props) {
  // Re-center when the model identity changes.
  const fitKey = useMemo(() => (geometries ? geometries.length + ":" + (geometries[0]?.uuid ?? "") : "demo"), [geometries]);

  // Normalize an imported model to a consistent ~8-unit size so the fixed camera
  // zoom frames it well (the demo massing is already authored at that scale).
  const normScale = useMemo(() => {
    if (!geometries || geometries.length === 0) return 1;
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    for (const g of geometries) {
      g.computeBoundingBox();
      if (g.boundingBox) box.union(tmp.copy(g.boundingBox));
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return 8 / maxDim;
  }, [geometries]);

  return (
    <Canvas
      orthographic
      camera={{ position: [9, 7, 11], zoom: 38, near: -200, far: 400 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => gl.setClearColor("#ffffff", 1)}
      dpr={[1, 2]}
      style={{ width: "100%", height: "100%", background: "#ffffff" }}
    >
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#ffffff", "#d8d8d2", 0.5]} />
      <directionalLight position={[6, 12, 8]} intensity={0.9} />

      <Center key={fitKey}>
        {geometries ? (
          <group scale={normScale}>
            {geometries.map((g, i) => (
              <ModelMesh key={i} geometry={g} showEdges={showEdges} />
            ))}
          </group>
        ) : (
          <DemoMassing showEdges={showEdges} />
        )}
      </Center>

      {showGrid && (
        <Grid
          position={[0, -0.01, 0]}
          args={[40, 40]}
          cellSize={1}
          cellColor="#dcdcd6"
          sectionSize={5}
          sectionColor="#bfbfb8"
          infiniteGrid
          fadeDistance={60}
          fadeStrength={1.5}
        />
      )}

      <ObliqueProjection angle={angle} depthRatio={depthRatio} dirX={dirX} dirY={dirY} oblique={oblique} />
      <CameraRig preset={preset} />
      <KeepObliqueAlive />
      <ExportHook onReady={onReady} />
      <OrbitControls makeDefault enableDamping={false} />
    </Canvas>
  );
}
