"use client";

// 3D viewport — the *visual test* renderer. It reads the same deriveGeometry()
// output as the tactile plan and the STL, so what you see here is what gets
// embossed and printed. Three.js can't server-render, so the parent loads this
// with next/dynamic({ ssr: false }).
//
// Axes: world X (east) → three X, world Y (north) → three Z, height → three Y.
// Each bay is a <group> translated to its origin and rotated about the up-axis,
// so children stay in clean bay-local coordinates.

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Bounds, Edges } from "@react-three/drei";
import { deriveGeometry } from "../engine/geometry";
import type { State } from "../engine/types";

function Model({ state }: { state: State }) {
  const scene = deriveGeometry(state);
  const wallH = state.tactile3d.wall_height;
  const colSize = state.style.column_size;
  const floorT = state.tactile3d.floor_thickness;

  return (
    <group>
      {scene.bays.map((bay) => {
        const levelZ = scene.levels[bay.level]?.z ?? 0;
        const rot = (-bay.transform.rot * Math.PI) / 180;
        const { w: W, d: D } = bay.footprint;
        return (
          <group key={bay.name} position={[bay.transform.ox, 0, bay.transform.oy]} rotation={[0, rot, 0]}>
            {/* Floor slab */}
            {state.tactile3d.floor && (
              <mesh position={[W / 2, levelZ - floorT / 2, D / 2]} receiveShadow>
                <boxGeometry args={[W, floorT, D]} />
                <meshStandardMaterial color="#ececec" />
              </mesh>
            )}
            {/* Corridor strip (accent) */}
            {bay.corridor && (
              <mesh position={[bay.corridor.rect.x + bay.corridor.rect.w / 2, levelZ + 0.05, bay.corridor.rect.y + bay.corridor.rect.h / 2]}>
                <boxGeometry args={[bay.corridor.rect.w, 0.1, bay.corridor.rect.h]} />
                <meshStandardMaterial color="#ff3b21" transparent opacity={0.5} />
              </mesh>
            )}
            {/* Columns */}
            {bay.columns.map((c, i) => (
              <mesh key={`c${i}`} position={[c.x, levelZ + wallH / 2, c.y]} castShadow>
                <boxGeometry args={[colSize, wallH, colSize]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
            ))}
            {/* Walls */}
            {bay.walls.map((wll, i) => (
              <mesh key={`w${i}`} position={[wll.x + wll.w / 2, levelZ + wallH / 2, wll.y + wll.h / 2]} castShadow>
                <boxGeometry args={[wll.w, wallH, wll.h]} />
                <meshStandardMaterial color="#c9c9c9" />
                <Edges threshold={15} color="#333" />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

export default function Scene3D({ state }: { state: State }) {
  return (
    <Canvas shadows camera={{ position: [80, 90, 120], fov: 40 }} style={{ background: "#fafafa" }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[60, 120, 40]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <Grid
        args={[400, 400]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#dcdcdc"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#bcbcbc"
        infiniteGrid
        fadeDistance={400}
        position={[0, -0.01, 0]}
      />
      <Bounds fit clip observe margin={1.2}>
        <Model state={state} />
      </Bounds>
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
