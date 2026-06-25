// occlusion.mjs — prove the analysis grid self-shadows: a bigger roof overhang
// must reduce solar on the walls (and a ray up must hit the roof). Run from
// TOOLS/gable-studio/:  node test/occlusion.mjs
import { DEFAULTS, buildModel, massingTriangles, sampleSolarGrid, rayHitsAny } from "../web/core.js";

function wallSamples(model) {
  const s = [];
  for (const key of ["wall_px", "wall_nx", "wall_py", "wall_ny"]) {
    const f = model.frames[key];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const cu = (i + 0.5) / 5 - 0.5, cv = (j + 0.5) / 5 - 0.5;
      s.push({ p: [f.c[0] + f.uAxis[0] * cu * f.faceWidth + f.vAxis[0] * cv * f.faceHeight,
                   f.c[1] + f.uAxis[1] * cu * f.faceWidth + f.vAxis[1] * cv * f.faceHeight,
                   f.c[2] + f.uAxis[2] * cu * f.faceWidth + f.vAxis[2] * cv * f.faceHeight], n: f.n });
    }
  }
  return s;
}
const wallAvg = (model) => {
  const tris = massingTriangles(model);
  const { values } = sampleSolarGrid(wallSamples(model), tris, "solarYear", model.site.latitude, 12);
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const A = buildModel(DEFAULTS.params, DEFAULTS.site);
const Bp = JSON.parse(JSON.stringify(DEFAULTS.params));
Bp.roof.W = 16; Bp.roof.L = 18; Bp.roof.ridgeRise = 4;   // much bigger overhang, eaves above walls
const B = buildModel(Bp, DEFAULTS.site);

const a = wallAvg(A), b = wallAvg(B);
console.log(`wall solar (yearly avg) — default overhang: ${a.toFixed(4)}  ·  big overhang: ${b.toFixed(4)}`);

// ray straight up from just above the floor under the ridge must hit the roof
const tris = massingTriangles(A);
const up = rayHitsAny([A.P.walls.cx, A.P.walls.cy, 0.1], [0, 0, 1], tris, 1e9);

let ok = true;
if (!(b < a)) { console.log("FAIL: bigger roof overhang did not reduce wall solar"); ok = false; }
if (!up) { console.log("FAIL: upward ray under the ridge did not hit the roof"); ok = false; }
console.log(ok ? "OCCLUSION OK — overhang shades the walls; rays hit the massing ✓" : "OCCLUSION FAILED");
process.exit(ok ? 0 : 1);
