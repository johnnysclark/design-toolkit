// Parity test for the Vantage optics core. Pure node, no deps:  node test/optics.test.mjs
// Asserts known photographic values so a refactor can't silently drift the physics.
import {
  SENSORS, fovDeg, fovs, hyperfocalM, dofLimitsM, blurDiscMm, cropFactor, equivalentFocalMm
} from "../web/optics.js";

let failures = 0;
function ok(name, got, want, tol) {
  const pass = Math.abs(got - want) <= tol;
  if (!pass) { failures++; console.error(`✗ ${name}: got ${got}, want ${want} ±${tol}`); }
  else console.log(`✓ ${name}: ${Number(got.toFixed ? got.toFixed(3) : got)}`);
}

const FF = SENSORS.fullFrame;

// 50mm "normal" lens on full frame → ~39.6° horizontal, ~27° vertical, ~46.8° diagonal.
ok("FOV 50mm FF horizontal", fovDeg(50, FF.width), 39.6, 0.2);
ok("FOV 50mm FF vertical", fovs(50, FF).v, 26.99, 0.2);
ok("FOV 50mm FF diagonal", fovs(50, FF).d, 46.79, 0.2);

// 24mm wide vs 200mm tele on full frame (horizontal angle of view).
ok("FOV 24mm FF horizontal", fovDeg(24, FF.width), 73.74, 0.3);
ok("FOV 200mm FF horizontal", fovDeg(200, FF.width), 10.29, 0.1);

// Hyperfocal: 50mm f/8, c=0.029 → ~10.83 m.
ok("hyperfocal 50mm f/8 FF", hyperfocalM(50, 8, FF.coc), 10.826, 0.05);

// Depth of field: 50mm f/8 focused at 3 m, full frame → near ≈ 2.36 m, far ≈ 4.12 m.
const dof = dofLimitsM(50, 8, 3, FF.coc);
ok("DoF near 50mm f/8 @3m FF", dof.near, 2.357, 0.03);
ok("DoF far 50mm f/8 @3m FF", dof.far, 4.124, 0.05);

// Past the hyperfocal distance the far limit is infinity.
const deep = dofLimitsM(50, 8, 12, FF.coc);
ok("DoF far is infinite beyond hyperfocal", deep.far === Infinity ? 1 : 0, 1, 0);

// Wider aperture → shallower DoF (f/1.4 total < f/8 total at the same focus).
const wide = dofLimitsM(50, 1.4, 3, FF.coc);
const narrow = dofLimitsM(50, 8, 3, FF.coc);
ok("wider aperture is shallower", wide.total < narrow.total ? 1 : 0, 1, 0);

// Object at the focus plane has zero blur; an out-of-focus object has > 0.
ok("zero blur at focus plane", blurDiscMm(3, 50, 2.8, 3), 0, 1e-9);
ok("blur grows off the focus plane", blurDiscMm(10, 50, 2.8, 3) > 0 ? 1 : 0, 1, 0);

// Longer lens blurs the background more (compression + bigger aperture diameter).
ok("longer lens blurs more", blurDiscMm(10, 85, 2.8, 3) > blurDiscMm(10, 50, 2.8, 3) ? 1 : 0, 1, 0);

// Crop factor: APS-C ≈ 1.53×; a 35mm on APS-C frames like a ~53mm on full frame.
ok("APS-C crop factor", cropFactor(SENSORS.apsc), 1.534, 0.02);
ok("APS-C 35mm equivalent", equivalentFocalMm(35, SENSORS.apsc), 53.7, 0.5);

if (failures) { console.error(`\n${failures} test(s) failed`); process.exit(1); }
console.log("\nAll optics tests passed.");
