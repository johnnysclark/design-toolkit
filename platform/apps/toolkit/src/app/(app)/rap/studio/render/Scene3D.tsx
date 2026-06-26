"use client";

// 3D viewport — the *visual test* renderer (sighted aid only; the wrapper marks
// it aria-hidden). Reads the same deriveGeometry() output as the tactile plan and
// the STL (renderer parity). Three.js can't server-render, so the parent loads
// this with next/dynamic({ ssr: false }).
//
// Axes: world X (east) → three X, world Y (north) → three Z, height → three Y.
// levelFilter shows one floor at a time for mixed-use work (null = whole building).
//
// LOOK (Goal 6): orthographic (parallel) projection ALWAYS; pure black & white;
// solid black VISIBLE edges + dotted black HIDDEN edges; exactly ONE ground at
// z=0 (no z-fighting / no double / no floating floor).

import { memo, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Bounds, Edges, Line } from "@react-three/drei";
import { deriveGeometry } from "../engine/geometry";
import type { State } from "../engine/types";

const WHITE = "#fff";
const INK = "#111";
const GROUND_Y = -0.05; // the one ground sits here, just below z=0
const HIDDEN = { dashSize: 0.6, gapSize: 0.5 }; // feet — dotted hidden-edge cadence

// Hidden-edge pass: EdgesGeometry + explicit lineSegments so we can call
// computeLineDistances() (LineDashedMaterial only dashes with per-vertex line
// distances). The trick that makes ONLY hidden lines dotted: depthFunc =
// GreaterDepth, so a dashed edge draws ONLY where its depth is *greater* than the
// nearest face already in the depth buffer — i.e. only where it sits behind
// geometry (genuinely occluded). depthWrite off so it never hides anything else.
// Visible edges are left to the solid <Edges> pass; they fail GreaterDepth and so
// never get dotted. Faces are drawn (white, opaque) and write depth first.
function HiddenEdges({ args }: { args: [number, number, number] }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(args[0], args[1], args[2]), 15), [args]);
  return (
    <lineSegments geometry={geo} renderOrder={2} onUpdate={(self) => self.computeLineDistances()}>
      <lineDashedMaterial color={INK} dashSize={HIDDEN.dashSize} gapSize={HIDDEN.gapSize} depthFunc={THREE.GreaterDepth} depthWrite={false} />
    </lineSegments>
  );
}

// White unlit box with black solid visible edges + black dotted hidden edges.
// position/args/rotation mirror a normal <mesh><boxGeometry/></mesh>.
function BWBox({
  position,
  args,
  rotation = [0, 0, 0]
}: {
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={args} />
      {/* Unlit white faces → pure B&W, no shading; occlude the solid visible edges.
          polygonOffset so those visible edges don't z-fight the face they sit on. */}
      <meshBasicMaterial color={WHITE} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      {/* (a) VISIBLE edges: solid black, slightly bold for a graphic outline read
          (drei fat lines). Normal depth test → only un-occluded edges draw. */}
      <Edges threshold={15} color={INK} lineWidth={1.6} />
      {/* (b) HIDDEN edges: dotted black, drawn only where occluded (GreaterDepth). */}
      <HiddenEdges args={args} />
    </mesh>
  );
}

function Model({ state, levelFilter }: { state: State; levelFilter: number | null }) {
  const scene = useMemo(() => deriveGeometry(state, levelFilter), [state, levelFilter]);
  const wallH = state.tactile3d.wall_height;
  const floorT = state.tactile3d.floor_thickness;
  const levelZ = (lvl: number) => scene.levels[lvl]?.z ?? 0;

  // The ONE ground: a single white plane just below z=0, sized to the site (fall
  // back to bounds). Nothing else renders at GROUND_Y, so no surface shares a depth.
  const gw = scene.site.w || scene.bounds.maxX - scene.bounds.minX || 100;
  const gh = scene.site.h || scene.bounds.maxY - scene.bounds.minY || 100;
  const gcx = scene.site.ox + gw / 2;
  const gcy = scene.site.oy + gh / 2;

  return (
    <group>
      {/* The single ground plane (below z=0). */}
      <mesh position={[gcx, GROUND_Y, gcy]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[gw, gh]} />
        <meshBasicMaterial color={WHITE} polygonOffset polygonOffsetFactor={2} polygonOffsetUnits={2} />
      </mesh>

      {/* Site boundary (infill lot) — the single black ground outline, riding on z=0 */}
      {scene.site.boundary && scene.site.boundary.length >= 3 && (
        <Line points={[...scene.site.boundary, scene.site.boundary[0]].map((p) => [p.x, 0, p.y] as [number, number, number])} color={INK} lineWidth={1.5} />
      )}

      {/* Atrium voids — outline just above the ground (parity with the 2D plan + read-back) */}
      {scene.voids.map((v, i) => {
        const pts: [number, number, number][] =
          v.shape === "circle"
            ? Array.from({ length: 49 }, (_, k) => {
                const a = (k / 48) * Math.PI * 2;
                const r = Math.max(v.w, v.h) / 2;
                return [v.cx + r * Math.cos(a), 0.02, v.cy + r * Math.sin(a)] as [number, number, number];
              })
            : ([
                [v.cx - v.w / 2, 0.02, v.cy - v.h / 2],
                [v.cx + v.w / 2, 0.02, v.cy - v.h / 2],
                [v.cx + v.w / 2, 0.02, v.cy + v.h / 2],
                [v.cx - v.w / 2, 0.02, v.cy + v.h / 2],
                [v.cx - v.w / 2, 0.02, v.cy - v.h / 2]
              ] as [number, number, number][]);
        return <Line key={`void${i}`} points={pts} color={INK} lineWidth={1.5} />;
      })}

      {/* Bays (the structural grid jig) */}
      {scene.bays.map((bay) => {
        const z = levelZ(bay.level);
        const rot = (-bay.transform.rot * Math.PI) / 180;
        const { w: W, d: D } = bay.footprint;
        return (
          <group key={bay.name} position={[bay.transform.ox, 0, bay.transform.oy]} rotation={[0, rot, 0]}>
            {state.tactile3d.floor && <BWBox position={[W / 2, z - floorT / 2, D / 2]} args={[W, floorT, D]} />}
            {bay.corridor && (
              <BWBox
                position={[bay.corridor.rect.x + bay.corridor.rect.w / 2, z + 0.05, bay.corridor.rect.y + bay.corridor.rect.h / 2]}
                args={[bay.corridor.rect.w, 0.1, bay.corridor.rect.h]}
              />
            )}
            {bay.columns.map((c, i) => (
              <BWBox key={`c${i}`} position={[c.x, z + wallH / 2, c.y]} args={[c.r * 2, wallH, c.r * 2]} />
            ))}
            {bay.walls.map((wll, i) => (
              <BWBox key={`w${i}`} position={[wll.x + wll.w / 2, z + wallH / 2, wll.y + wll.h / 2]} args={[wll.w, wallH, wll.h]} />
            ))}
          </group>
        );
      })}

      {/* Geometric regions — plate = thin slab, box = extruded massing volume */}
      {scene.regions.map((rg) => {
        const z = levelZ(rg.level);
        if (rg.kind === "plate") {
          // slab: top at z, thickness down
          return <BWBox key={rg.id} position={[rg.cx, z - rg.thickness / 2, rg.cy]} args={[rg.w, rg.thickness, rg.h]} />;
        }
        // box: massing volume from z up to z+height
        return <BWBox key={rg.id} position={[rg.cx, z + rg.height / 2, rg.cy]} args={[rg.w, rg.height, rg.h]} />;
      })}

      {/* Free walls — each solid chunk as a rotated box */}
      {scene.freeWalls.map((fw) =>
        fw.solids.map((s, i) => (
          <BWBox key={`${fw.id}-${i}`} position={[s.cx, levelZ(fw.level) + fw.height / 2, s.cy]} rotation={[0, (-s.angleDeg * Math.PI) / 180, 0]} args={[s.len, fw.height, fw.thickness]} />
        ))
      )}

      {/* Free columns */}
      {scene.freeColumns.map((c) => (
        <BWBox key={c.id} position={[c.x, levelZ(c.level) + wallH / 2, c.y]} args={[c.size, wallH, c.size]} />
      ))}
    </group>
  );
}

function Scene3D({ state, levelFilter = null }: { state: State; levelFilter?: number | null }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [80, 90, 120], zoom: 6, near: -2000, far: 4000 }}
      style={{ background: WHITE }}
    >
      {/* No lights, no shadows: meshBasic is unlit → pure black & white. */}
      <Bounds fit clip observe margin={1.2}>
        <Model state={state} levelFilter={levelFilter} />
      </Bounds>
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}

export default memo(Scene3D);
