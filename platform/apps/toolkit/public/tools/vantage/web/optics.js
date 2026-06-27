// optics.js — the honest core. Pure thin-lens formulas, no rendering, no DOM.
// Imported by app.js / diagram.js / ui.js AND by ../test/optics.test.mjs, so it
// must stay free of browser globals. Units: focal length + sensor + circle of
// confusion in millimetres; world distances in metres (converted internally).

export const FULL_FRAME_DIAGONAL = Math.hypot(36, 24); // 43.27mm — the crop-factor reference

// Sensor presets. `coc` (circle of confusion) is the largest blur that still reads
// as "sharp" for that format — the conventional d/1500 of the diagonal.
export const SENSORS = {
  fullFrame: { id: "fullFrame", label: "Full frame (36×24)", width: 36, height: 24, coc: 0.029 },
  apsc:      { id: "apsc",      label: "APS-C (23.6×15.7)",  width: 23.6, height: 15.7, coc: 0.019 },
  mft:       { id: "mft",       label: "Micro 4/3 (17.3×13)", width: 17.3, height: 13, coc: 0.015 }
};

const DEG = 180 / Math.PI;

// Angle of view (degrees) for one sensor dimension at a given focal length.
export function fovDeg(focalMm, sensorDimMm) {
  return 2 * Math.atan(sensorDimMm / (2 * focalMm)) * DEG;
}

// Horizontal / vertical / diagonal angles of view (degrees).
export function fovs(focalMm, sensor) {
  return {
    h: fovDeg(focalMm, sensor.width),
    v: fovDeg(focalMm, sensor.height),
    d: fovDeg(focalMm, Math.hypot(sensor.width, sensor.height))
  };
}

// Physical aperture diameter (mm) = focal length / f-number.
export function apertureDiameterMm(focalMm, fNumber) {
  return focalMm / fNumber;
}

// Crop factor vs full frame, and the full-frame-equivalent focal length.
export function cropFactor(sensor) {
  return FULL_FRAME_DIAGONAL / Math.hypot(sensor.width, sensor.height);
}
export function equivalentFocalMm(focalMm, sensor) {
  return focalMm * cropFactor(sensor);
}

// Hyperfocal distance (metres): focus here and everything from H/2 to infinity is
// acceptably sharp. H = f²/(N·c) + f.
export function hyperfocalM(focalMm, fNumber, cocMm) {
  return (focalMm * focalMm) / (fNumber * cocMm) / 1000 + focalMm / 1000;
}

// Depth of field for a given focus distance (metres in, metres out).
// far is Infinity once the focus distance reaches the hyperfocal distance.
export function dofLimitsM(focalMm, fNumber, focusM, cocMm) {
  const f = focalMm;
  const s = focusM * 1000; // mm
  const Hmm = (f * f) / (fNumber * cocMm) + f; // hyperfocal in mm
  const near = (Hmm * s) / (Hmm + (s - f));
  const farDenom = Hmm - (s - f);
  const far = farDenom <= 0 ? Infinity : (Hmm * s) / farDenom;
  const total = far === Infinity ? Infinity : far - near;
  return {
    near: near / 1000,
    far: far / 1000,
    total: total === Infinity ? Infinity : total / 1000,
    hyperfocal: Hmm / 1000
  };
}

// Blur-disc (circle of confusion) diameter ON THE SENSOR, in mm, for an object at
// `distM` when focus is at `focusM`. This is the physical driver of "how blurry":
// b = A·f·|d − s| / (d·(s − f)), A = f/N. Returns 0 for objects at the focus plane.
export function blurDiscMm(distM, focalMm, fNumber, focusM) {
  const f = focalMm;
  const d = distM * 1000;
  const s = focusM * 1000;
  if (d <= 0) return 0;
  const A = f / fNumber;
  const denom = d * (s - f);
  if (denom === 0) return 0;
  return Math.abs((A * f * (d - s)) / denom);
}

// Same blur expressed as a fraction of the sensor's circle of confusion — a unitless
// "blurriness" (1 = just-acceptably-sharp, >1 = visibly soft). Handy for driving the
// renderer's blur strength so the picture tracks the numbers.
export function blurInCoc(distM, focalMm, fNumber, focusM, cocMm) {
  return blurDiscMm(distM, focalMm, fNumber, focusM) / cocMm;
}

// Magnification-ish framing helper: how tall (in metres) a vertical slice of the
// world is at distance `distM`, given the vertical angle of view. Used by the plan
// schematic + the "what you're seeing" text.
export function frameHeightM(distM, focalMm, sensor) {
  const v = fovDeg(focalMm, sensor.height) / DEG;
  return 2 * distM * Math.tan(v / 2);
}
