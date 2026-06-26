"use client";

// 3D viewport — the *visual test* renderer. Reads the same deriveGeometry()
// output as the tactile plan and the STL (renderer parity). Three.js can't
// server-render, so the parent loads this with next/dynamic({ ssr: false }).
//
// Axes: world X (east) → three X, world Y (north) → three Z, height → three Y.
// levelFilter shows one floor at a time for mixed-use work (null = whole building).

import { memo, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Bounds, Edges, Line } from "@react-three/drei";
import { deriveGeometry } from "../engine/geometry";
import type { State } from "../engine/types";

const USE_COLOR: Record<string, string> = {
  residential: "#bcd8ff",
  retail: "#ffd9b0",
  office: "#c9ecc9",
  lobby: "#e6ccff",
  circulation: "#ededed",
  parking: "#d2d2d2",
  amenity: "#ffd2e2",
  core: "#bdbdbd",
  mechanical: "#ded6bb",
  open: "#dff3df",
  other: "#e4e4e4"
};

function Model({ state, levelFilter }: { state: State; levelFilter: number | null }) {
  const scene = useMemo(() => deriveGeometry(state, levelFilter), [state, levelFilter]);
  const wallH = state.tactile3d.wall_height;
  const floorT = state.tactile3d.floor_thickness;
  const levelZ = (lvl: number) => scene.levels[lvl]?.z ?? 0;

  return (
    <group>
      {/* Site boundary (infill lot) as a ground line */}
      {scene.site.boundary && scene.site.boundary.length >= 3 && (
        <Line points={[...scene.site.boundary, scene.site.boundary[0]].map((p) => [p.x, 0.02, p.y] as [number, number, number])} color="#111" lineWidth={1.5} />
      )}

      {/* Atrium voids — outline on the floor (parity with the 2D plan + read-back) */}
      {scene.voids.map((v, i) => {
        const pts: [number, number, number][] =
          v.shape === "circle"
            ? Array.from({ length: 49 }, (_, k) => {
                const a = (k / 48) * Math.PI * 2;
                const r = Math.max(v.w, v.h) / 2;
                return [v.cx + r * Math.cos(a), 0.03, v.cy + r * Math.sin(a)] as [number, number, number];
              })
            : ([
                [v.cx - v.w / 2, 0.03, v.cy - v.h / 2],
                [v.cx + v.w / 2, 0.03, v.cy - v.h / 2],
                [v.cx + v.w / 2, 0.03, v.cy + v.h / 2],
                [v.cx - v.w / 2, 0.03, v.cy + v.h / 2],
                [v.cx - v.w / 2, 0.03, v.cy - v.h / 2]
              ] as [number, number, number][]);
        return <Line key={`void${i}`} points={pts} color="#111" lineWidth={1.5} />;
      })}

      {/* Bays (the structural grid jig) */}
      {scene.bays.map((bay) => {
        const z = levelZ(bay.level);
        const rot = (-bay.transform.rot * Math.PI) / 180;
        const { w: W, d: D } = bay.footprint;
        return (
          <group key={bay.name} position={[bay.transform.ox, 0, bay.transform.oy]} rotation={[0, rot, 0]}>
            {state.tactile3d.floor && (
              <mesh position={[W / 2, z - floorT / 2, D / 2]} receiveShadow>
                <boxGeometry args={[W, floorT, D]} />
                <meshStandardMaterial color="#ececec" />
              </mesh>
            )}
            {bay.corridor && (
              <mesh position={[bay.corridor.rect.x + bay.corridor.rect.w / 2, z + 0.05, bay.corridor.rect.y + bay.corridor.rect.h / 2]}>
                <boxGeometry args={[bay.corridor.rect.w, 0.1, bay.corridor.rect.h]} />
                <meshStandardMaterial color="#ff3b21" transparent opacity={0.5} />
              </mesh>
            )}
            {bay.columns.map((c, i) => (
              <mesh key={`c${i}`} position={[c.x, z + wallH / 2, c.y]} castShadow>
                <boxGeometry args={[c.r * 2, wallH, c.r * 2]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
            ))}
            {bay.walls.map((wll, i) => (
              <mesh key={`w${i}`} position={[wll.x + wll.w / 2, z + wallH / 2, wll.y + wll.h / 2]} castShadow>
                <boxGeometry args={[wll.w, wallH, wll.h]} />
                <meshStandardMaterial color="#c9c9c9" />
                <Edges threshold={15} color="#333" />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Rooms — color-coded floor patches by program use */}
      {scene.rooms.map((rm) => (
        <mesh key={rm.id} position={[rm.cx, levelZ(rm.level) + 0.04, rm.cy]} receiveShadow>
          <boxGeometry args={[rm.w, 0.08, rm.h]} />
          <meshStandardMaterial color={USE_COLOR[rm.use] ?? "#e4e4e4"} />
        </mesh>
      ))}

      {/* Free walls — each solid chunk as a rotated box */}
      {scene.freeWalls.map((fw) =>
        fw.solids.map((s, i) => (
          <mesh key={`${fw.id}-${i}`} position={[s.cx, levelZ(fw.level) + fw.height / 2, s.cy]} rotation={[0, (-s.angleDeg * Math.PI) / 180, 0]} castShadow>
            <boxGeometry args={[s.len, fw.height, fw.thickness]} />
            <meshStandardMaterial color="#c2c2c2" />
            <Edges threshold={15} color="#333" />
          </mesh>
        ))
      )}

      {/* Free columns */}
      {scene.freeColumns.map((c) => (
        <mesh key={c.id} position={[c.x, levelZ(c.level) + wallH / 2, c.y]} castShadow>
          <boxGeometry args={[c.size, wallH, c.size]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Scene3D({ state, levelFilter = null }: { state: State; levelFilter?: number | null }) {
  return (
    <Canvas shadows camera={{ position: [80, 90, 120], fov: 40 }} style={{ background: "#fafafa" }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[60, 120, 40]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <Grid args={[400, 400]} cellSize={10} cellThickness={0.5} cellColor="#dcdcdc" sectionSize={50} sectionThickness={1} sectionColor="#bcbcbc" infiniteGrid fadeDistance={400} position={[0, -0.01, 0]} />
      <Bounds fit clip observe margin={1.2}>
        <Model state={state} levelFilter={levelFilter} />
      </Bounds>
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}

export default memo(Scene3D);
