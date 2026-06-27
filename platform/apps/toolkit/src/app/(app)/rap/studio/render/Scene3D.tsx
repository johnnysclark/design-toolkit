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
import { OrbitControls, Bounds, Edges, Line, Grid } from "@react-three/drei";
import { deriveGeometry, type PhaseEmphasis, type PhaseView } from "../engine/geometry";
import type { State } from "../engine/types";

const WHITE = "#fff";
const INK = "#111";
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

// A reference (non-focused) phase: a faint, face-less wireframe ghost a sighted
// reader sees the focus phase sitting inside. No white faces (so it never hides
// the figure) and no hidden-line pass — it reads as transparent context.
function RefBox({
  position,
  args,
  rotation = [0, 0, 0]
}: {
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
}) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(args[0], args[1], args[2]), 15), [args]);
  return (
    <lineSegments geometry={geo} position={position} rotation={rotation} renderOrder={1}>
      <lineBasicMaterial color={INK} transparent opacity={0.3} depthWrite={false} />
    </lineSegments>
  );
}

// White unlit box with black solid visible edges + black dotted hidden edges.
// position/args/rotation mirror a normal <mesh><boxGeometry/></mesh>. A reference
// emphasis renders the faint ghost wireframe instead (the figure/ground read).
function BWBox({
  position,
  args,
  rotation = [0, 0, 0],
  emphasis = "focus"
}: {
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
  emphasis?: PhaseEmphasis;
}) {
  if (emphasis === "reference") return <RefBox position={position} args={args} rotation={rotation} />;
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

function Model({ state, levelFilter, view }: { state: State; levelFilter: number | null; view: PhaseView | null }) {
  const scene = useMemo(() => deriveGeometry(state, levelFilter, view), [state, levelFilter, view]);
  const wallH = state.tactile3d.wall_height;
  const floorT = state.tactile3d.floor_thickness;
  const levelZ = (lvl: number) => scene.levels[lvl]?.z ?? 0;

  // The ONE ground: a single white plane just below z=0, sized to the site (fall
  // back to bounds). Nothing else renders at GROUND_Y, so no surface shares a depth.
  const gw = scene.site.w || scene.bounds.maxX - scene.bounds.minX || 100;
  const gh = scene.site.h || scene.bounds.maxY - scene.bounds.minY || 100;
  const gcx = scene.site.ox + gw / 2;
  const gcy = scene.site.oy + gh / 2;

  // Pad the grid out past the model so it reads as ground, not a tight platter.
  const gridW = Math.max(gw, 60) + 40;
  const gridD = Math.max(gh, 60) + 40;
  return (
    <group>
      {/* Ground: a standard, very light 5-ft reference grid on z=0 — no solid
          plane and no lot outline, just the grid. Heavier line every 25 ft. */}
      <Grid
        position={[gcx, 0, gcy]}
        args={[gridW, gridD]}
        cellSize={5}
        cellThickness={0.6}
        cellColor="#dcdcdc"
        sectionSize={25}
        sectionThickness={0.9}
        sectionColor="#c2c2c2"
        infiniteGrid={false}
        fadeDistance={2000}
        fadeStrength={0}
        followCamera={false}
      />

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
            {state.tactile3d.floor && <BWBox position={[W / 2, z - floorT / 2, D / 2]} args={[W, floorT, D]} emphasis={bay.emphasis} />}
            {bay.corridor && (
              <BWBox
                position={[bay.corridor.rect.x + bay.corridor.rect.w / 2, z + 0.05, bay.corridor.rect.y + bay.corridor.rect.h / 2]}
                args={[bay.corridor.rect.w, 0.1, bay.corridor.rect.h]}
                emphasis={bay.emphasis}
              />
            )}
            {bay.columns.map((c, i) => (
              <BWBox key={`c${i}`} position={[c.x, z + wallH / 2, c.y]} args={[c.r * 2, wallH, c.r * 2]} emphasis={bay.emphasis} />
            ))}
            {bay.walls.map((wll, i) => (
              <BWBox key={`w${i}`} position={[wll.x + wll.w / 2, z + wallH / 2, wll.y + wll.h / 2]} args={[wll.w, wallH, wll.h]} emphasis={bay.emphasis} />
            ))}
          </group>
        );
      })}

      {/* Geometric regions — plate = thin slab, box = extruded massing volume */}
      {scene.regions.map((rg) => {
        const z = levelZ(rg.level);
        if (rg.kind === "plate") {
          // slab: top at z, thickness down
          return <BWBox key={rg.id} position={[rg.cx, z - rg.thickness / 2, rg.cy]} args={[rg.w, rg.thickness, rg.h]} emphasis={rg.emphasis} />;
        }
        // box: massing volume from z up to z+height
        return <BWBox key={rg.id} position={[rg.cx, z + rg.height / 2, rg.cy]} args={[rg.w, rg.height, rg.h]} emphasis={rg.emphasis} />;
      })}

      {/* Free walls — each solid chunk as a rotated box */}
      {scene.freeWalls.map((fw) =>
        fw.solids.map((s, i) => (
          <BWBox key={`${fw.id}-${i}`} position={[s.cx, levelZ(fw.level) + fw.height / 2, s.cy]} rotation={[0, (-s.angleDeg * Math.PI) / 180, 0]} args={[s.len, fw.height, fw.thickness]} emphasis={fw.emphasis} />
        ))
      )}

      {/* Free columns */}
      {scene.freeColumns.map((c) => (
        <BWBox key={c.id} position={[c.x, levelZ(c.level) + wallH / 2, c.y]} args={[c.size, wallH, c.size]} emphasis={c.emphasis} />
      ))}
    </group>
  );
}

function Scene3D({ state, levelFilter = null, view = null }: { state: State; levelFilter?: number | null; view?: PhaseView | null }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [80, 90, 120], zoom: 6, near: -2000, far: 4000 }}
      style={{ background: WHITE }}
    >
      {/* No lights, no shadows: meshBasic is unlit → pure black & white. */}
      <Bounds fit clip observe margin={1.2}>
        <Model state={state} levelFilter={levelFilter} view={view} />
      </Bounds>
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}

export default memo(Scene3D);
