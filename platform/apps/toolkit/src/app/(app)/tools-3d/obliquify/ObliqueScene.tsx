"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ObliqueScene — the three.js (react-three-fiber) viewport for Obliquify.
//
// Oblique (paraline) projection, done by the book: an ORTHOGRAPHIC camera locked
// to a principal face (Front / Plan / Side) whose projection matrix is post-
// sheared so the face-perpendicular depth axis slides across the screen at a
// chosen angle and foreshortening (cabinet = ½, cavalier = 1). The face you look
// at stays TRUE-SHAPE; the depth recedes. That is the exact definition of an
// oblique projection — and because the camera is locked to the face while oblique
// is on, the result is always a correct cabinet / cavalier / planometric drawing
// (not an ambiguous skew). Turn oblique off, or pick "3·4 Axon", to free-orbit a
// true orthographic / axonometric view for comparison.
//
// The shear is injected by wrapping camera.updateProjectionMatrix(), so it
// survives every zoom and resize that rebuilds the projection, and is re-applied
// each frame after the controls run.
//
// Loaded via next/dynamic({ ssr:false }) — WebGL + the model loaders are
// browser-only. Look matches the site / RAP: white faces, black edges.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Center, Edges, Grid } from "@react-three/drei";

const INK = "#111111";
const FACE = "#f4f4f2";

type Props = {
  geometries: THREE.BufferGeometry[] | null;
  angle: number; // degrees
  depthRatio: number; // 0..1.4 (cabinet .5, cavalier 1)
  dirX: 1 | -1;
  dirY: 1 | -1;
  oblique: boolean; // effective: oblique on AND a face view (not axon)
  allowOrbit: boolean; // free orbit (axon / comparison mode)
  camDir: [number, number, number];
  viewNonce: number; // bump to re-snap the camera to camDir
  showEdges: boolean;
  showGrid: boolean;
  onReady: (canvas: HTMLCanvasElement) => void;
};

// ── the oblique shear, applied by wrapping updateProjectionMatrix ────────────
// Eye-space depth (z<0 in front of an ortho cam) → screen offset of
// depthRatio·(cosα, sinα) per unit depth, in the chosen diagonal quadrant.
// Because the camera is snapped to look straight down a principal world axis,
// eye-space depth IS that model axis — so the projected drawing is a true
// oblique of the facing plane.
function ObliqueProjection({
  angle,
  depthRatio,
  dirX,
  dirY,
  oblique
}: Pick<Props, "angle" | "depthRatio" | "dirX" | "dirY" | "oblique">) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target?: THREE.Vector3 } | null;
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const orig = cam.updateProjectionMatrix.bind(cam);
    const a = (angle * Math.PI) / 180;
    const kx = -depthRatio * Math.cos(a) * dirX;
    const ky = -depthRatio * Math.sin(a) * dirY;
    // Shear eye-space depth into screen x/y, but measured from the model centre
    // (the camera target at distance D), not from the camera itself. The kx·D /
    // ky·D terms in the last column cancel the constant camera-distance offset so
    // the centred model stays centred on screen — only the front↔back recede.
    // D = distance to the orbit target (invariant under pan); falls back to the
    // camera-to-origin distance before controls exist.
    const D = controls?.target ? camera.position.distanceTo(controls.target) : camera.position.length() || 16;
    const shear = new THREE.Matrix4().set(1, 0, kx, kx * D, 0, 1, ky, ky * D, 0, 0, 1, 0, 0, 0, 0, 1);
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
  }, [camera, controls, angle, depthRatio, dirX, dirY, oblique]);
  return null;
}

// ── snap the camera to a principal direction (front / plan / side / corner) ──
function CameraRig({ camDir, viewNonce }: { camDir: [number, number, number]; viewNonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    const dist = 16;
    const d = new THREE.Vector3(...camDir);
    if (d.lengthSq() === 0) d.set(0, 0, 1);
    d.normalize().multiplyScalar(dist);
    camera.position.copy(d);
    camera.up.set(0, 1, 0);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    } else {
      camera.lookAt(0, 0, 0);
    }
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewNonce]);
  return null;
}

// Re-apply the shear every frame (after controls), so zoom never strips it.
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
    <mesh geometry={geometry}>
      <meshStandardMaterial color={FACE} roughness={0.85} metalness={0} flatShading side={THREE.DoubleSide} />
      {showEdges && <Edges threshold={30} color={INK} />}
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
        <mesh key={i} position={b.pos}>
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
  allowOrbit,
  camDir,
  viewNonce,
  showEdges,
  showGrid,
  onReady
}: Props) {
  // Re-center when the model identity changes.
  const fitKey = useMemo(() => (geometries ? geometries.length + ":" + (geometries[0]?.uuid ?? "") : "demo"), [geometries]);

  // Own the GPU lifecycle of imported geometries: r3f only auto-disposes the
  // geometries IT creates (e.g. <boxGeometry>), not BufferGeometry passed via the
  // `geometry` prop. Dispose the previous set when the model changes or unmounts.
  useEffect(() => {
    return () => {
      geometries?.forEach((g) => g.dispose());
    };
  }, [geometries]);

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
      camera={{ position: [0, 0, 16], zoom: 38, near: -500, far: 1000 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => gl.setClearColor("#ffffff", 1)}
      dpr={[1, 2]}
      style={{ width: "100%", height: "100%", background: "#ffffff" }}
    >
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#ffffff", "#d8d8d2", 0.55]} />
      <directionalLight position={[6, 12, 8]} intensity={0.85} />
      <directionalLight position={[-8, 5, -6]} intensity={0.35} />

      <Center key={fitKey}>
        {geometries ? (
          <group scale={normScale}>
            {geometries.map((g) => (
              <ModelMesh key={g.uuid} geometry={g} showEdges={showEdges} />
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
      <CameraRig camDir={camDir} viewNonce={viewNonce} />
      <KeepObliqueAlive />
      <ExportHook onReady={onReady} />
      <OrbitControls makeDefault enableDamping={false} enableRotate={allowOrbit} enablePan={allowOrbit} />
    </Canvas>
  );
}
