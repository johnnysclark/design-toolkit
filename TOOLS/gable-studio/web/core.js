// core.js — Gable Studio's SINGLE SOURCE OF TRUTH (v2).
//
// Pure, dependency-free, deterministic geometry + performance metrics + rule
// evaluation. NO DOM, NO Three.js, NO rhino imports here. python/gable_core.py
// is a line-for-line port; test/ proves they agree.
//
// THE FORM (v2): three independent plan rectangles, each with its own centre,
// width, length and rotation, so each can overhang the others:
//   • PLINTH — a floating floor SLAB (thickness t). The only floor.
//   • WALLS  — a rectangular tube (height h, wall thickness wt). No floor/ceiling.
//   • ROOF   — the overhanging plane: a single ridge with TWO independent pitch
//              angles (gable, shed, butterfly…), plus thickness.
// Plus 4 aperture cuts (3 wall + 1 roof). The ground is a RAVINE-EDGE topography.
//
// Conventions: +X East, +Y North, +Z Up, metres, degrees in. Azimuth cw from
// North. Floor (plinth top) is the datum z = 0; walls rise 0..h; terrain varies.
// Metrics are simplified PEDAGOGICAL PROXIES, not validated simulation.

const D2R = Math.PI / 180;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const rotZ = ([x, y, z], deg) => { const r = deg * D2R, c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c, z]; };
const dirAz = (azDeg, altDeg) => { const a = azDeg * D2R, e = altDeg * D2R; return [Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)]; };
const azOf = (n) => { let d = Math.atan2(n[0], n[1]) / D2R; return (d + 360) % 360; };

export { D2R, clamp, add, sub, scale, dot, len, norm, rotZ, dirAz };

// ---------------------------------------------------------------------------
export const DEFAULTS = {
  params: {
    plinth: { cx: 0, cy: 0, W: 10, L: 12, R: 0, t: 0.5 },
    walls: { cx: 0, cy: -0.5, W: 7, L: 9, R: 0, h: 3.2, wt: 0.25 },
    roof: { cx: 0, cy: -0.5, W: 9.5, L: 11, R: 0, ridgeRise: 2.4, pitchL: 30, pitchR: 30, ridgePos: 0, t: 0.35 },
    apertures: [
      { id: "A1", host: "wall_ny", u: 0.5, v: 0.5, w: 3.0, h: 1.8 },  // South: view to ravine
      { id: "A2", host: "wall_px", u: 0.5, v: 0.45, w: 1.2, h: 1.4 }, // East
      { id: "A3", host: "wall_py", u: 0.5, v: 0.32, w: 1.4, h: 1.0 }, // North: low inlet
      { id: "A4", host: "roof_r", u: 0.7, v: 0.5, w: 1.2, h: 1.2 },   // roof skylight (outlet)
    ],
  },
  site: {
    latitude: 42, northAngle: 0, windFromAz: 270, windSpeed: 5,
    deltaT: 6, viewTargetAz: 180, eyeHeight: 1.6,
    terrain: { plateauZ: -0.8, ravineDepth: 9, ravineEdge: 6, ravineWidth: 5, ravineAngle: 18, undAmp: 0.25 },
  },
};

export const WALL_HOSTS = ["wall_py", "wall_ny", "wall_px", "wall_nx"];
export const ROOF_HOSTS = ["roof_l", "roof_r"];
export const HOST_LABELS = {
  wall_py: "North wall (+Y)", wall_ny: "South wall (−Y)",
  wall_px: "East wall (+X)", wall_nx: "West wall (−X)",
  roof_l: "Roof slope L (−X)", roof_r: "Roof slope R (+X)",
};

// ---------------------------------------------------------------------------
// TERRAIN — ravine edge. Plateau near origin, smooth drop to a ravine on the
// +d side (d = signed distance across `ravineAngle`). Deterministic (ports).
// ---------------------------------------------------------------------------
export function terrainHeight(x, y, T) {
  const a = T.ravineAngle * D2R;
  const d = x * Math.cos(a) + y * Math.sin(a);
  let t = clamp((d - T.ravineEdge) / (T.ravineWidth || 1), 0, 1);
  t = t * t * (3 - 2 * t); // smoothstep
  return T.plateauZ - T.ravineDepth * t + T.undAmp * Math.sin(x * 0.15) * Math.cos(y * 0.17);
}

// ---------------------------------------------------------------------------
// GEOMETRY
// ---------------------------------------------------------------------------
function worldPoint(centerRel, z, elemRot, center, north) {
  const p = rotZ([centerRel[0], centerRel[1], 0], elemRot);
  const w = rotZ([p[0] + center[0], p[1] + center[1], 0], north);
  return [w[0], w[1], z];
}

function buildFrames(P, north) {
  const frames = {};
  const W = P.walls, Wc = [W.cx, W.cy];
  const wallZ = W.h / 2;
  const wall = (key, nLocal, tanLocal, faceWidth, centerRel) => {
    frames[key] = {
      kind: "wall", n: norm(rotZ(nLocal, W.R + north)),
      c: worldPoint(centerRel, wallZ, W.R, Wc, north),
      uAxis: rotZ(tanLocal, W.R + north), vAxis: [0, 0, 1],
      faceWidth, faceHeight: W.h, area: faceWidth * W.h,
    };
  };
  wall("wall_px", [1, 0, 0], [0, 1, 0], W.L, [W.W / 2, 0]);
  wall("wall_nx", [-1, 0, 0], [0, 1, 0], W.L, [-W.W / 2, 0]);
  wall("wall_py", [0, 1, 0], [1, 0, 0], W.W, [0, W.L / 2]);
  wall("wall_ny", [0, -1, 0], [1, 0, 0], W.W, [0, -W.L / 2]);

  // roof: ridge along local Y, two independent pitches, optional ridge offset
  const Rf = P.roof, Rc = [Rf.cx, Rf.cy];
  const zRidge = W.h + Rf.ridgeRise;
  const ridgeX = Rf.ridgePos * (Rf.W / 2);
  const halfL = ridgeX + Rf.W / 2, halfR = Rf.W / 2 - ridgeX;
  const tanL = Math.tan(Rf.pitchL * D2R), tanR = Math.tan(Rf.pitchR * D2R);
  const eaveZL = zRidge - halfL * tanL, eaveZR = zRidge - halfR * tanR;
  frames.roof_l = {
    kind: "roof", n: norm(rotZ([-tanL, 0, 1], Rf.R + north)),
    c: worldPoint([(ridgeX - Rf.W / 2) / 2, 0], (zRidge + eaveZL) / 2, Rf.R, Rc, north),
    uAxis: rotZ(norm([1, 0, tanL]), Rf.R + north), vAxis: rotZ([0, 1, 0], Rf.R + north),
    faceWidth: halfL * Math.sqrt(1 + tanL * tanL), faceHeight: Rf.L,
    area: halfL * Math.sqrt(1 + tanL * tanL) * Rf.L,
  };
  frames.roof_r = {
    kind: "roof", n: norm(rotZ([tanR, 0, 1], Rf.R + north)),
    c: worldPoint([(ridgeX + Rf.W / 2) / 2, 0], (zRidge + eaveZR) / 2, Rf.R, Rc, north),
    uAxis: rotZ(norm([-1, 0, tanR]), Rf.R + north), vAxis: rotZ([0, 1, 0], Rf.R + north),
    faceWidth: halfR * Math.sqrt(1 + tanR * tanR), faceHeight: Rf.L,
    area: halfR * Math.sqrt(1 + tanR * tanR) * Rf.L,
  };
  frames._roofGeom = { zRidge, ridgeX, halfL, halfR, eaveZL, eaveZR };
  return frames;
}

// Plinth slab faces (top + sides + bottom), split above/below terrain.
function plinthFaces(P, north, T) {
  const Pl = P.plinth, Pc = [Pl.cx, Pl.cy];
  const topZ = 0, botZ = -Pl.t;
  const faces = [];
  faces.push({ name: "plinth_top", kind: "plinth", area: Pl.W * Pl.L, n: norm(rotZ([0, 0, 1], 0)), c: worldPoint([0, 0], topZ, Pl.R, Pc, north) });
  const side = (nLocal, w, centerRel) => ({ name: "plinth_side", kind: "plinth", area: w * Pl.t, n: norm(rotZ(nLocal, Pl.R + north)), c: worldPoint(centerRel, (topZ + botZ) / 2, Pl.R, Pc, north) });
  faces.push(side([1, 0, 0], Pl.L, [Pl.W / 2, 0]), side([-1, 0, 0], Pl.L, [-Pl.W / 2, 0]), side([0, 1, 0], Pl.W, [0, Pl.L / 2]), side([0, -1, 0], Pl.W, [0, -Pl.L / 2]));
  return faces;
}

function buildApertures(P, frames) {
  return (P.apertures || []).map((ap) => {
    const f = frames[ap.host] || frames.wall_ny;
    const w = clamp(ap.w, 0.05, f.faceWidth), h = clamp(ap.h, 0.05, f.faceHeight);
    const du = (clamp(ap.u, 0, 1) - 0.5) * f.faceWidth, dv = (clamp(ap.v, 0, 1) - 0.5) * f.faceHeight;
    const c = add(add(f.c, scale(f.uAxis, du)), scale(f.vAxis, dv));
    return { id: ap.id, host: ap.host, kind: f.kind, area: w * h, w, h, n: f.n, c };
  });
}

export function buildModel(rawParams, site) {
  const north = site.northAngle || 0;
  const P = rawParams;
  const frames = buildFrames(P, north);
  const walls = WALL_HOSTS.map((k) => Object.assign({ name: k }, frames[k]));
  const roofs = ROOF_HOSTS.map((k) => Object.assign({ name: k }, frames[k]));
  const plinth = plinthFaces(P, north, site.terrain);
  const apertures = buildApertures(P, frames);
  return { P, site, north, frames, roofGeom: frames._roofGeom,
    faces: [...walls, ...roofs, ...plinth], walls, roofs, plinth, apertures };
}

// ---------------------------------------------------------------------------
const DECLS = [{ k: "summer", d: 23.45 }, { k: "equinox", d: 0 }, { k: "winter", d: -23.45 }];
const HOURS = [8, 10, 12, 14, 16];
const N_SUN = DECLS.length * HOURS.length, N_SEASON = HOURS.length;

function sunSamples(latDeg) {
  const lat = latDeg * D2R, out = [];
  for (const { k, d } of DECLS) {
    const dec = d * D2R;
    for (const h of HOURS) {
      const H = (15 * (h - 12)) * D2R;
      const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
      const alt = Math.asin(clamp(sinAlt, -1, 1));
      let L = [0, 0, 0];
      if (alt > 0) {
        const cosAz = (Math.sin(dec) - Math.sin(lat) * sinAlt) / ((Math.cos(lat) * Math.cos(alt)) || 1e-9);
        let az = Math.acos(clamp(cosAz, -1, 1));
        if (H > 0) az = 2 * Math.PI - az;
        L = [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)];
      }
      out.push({ season: k, L, up: alt > 0 });
    }
  }
  return out;
}

// Single sun direction (for shadow casting / sun-path), equinox by default.
export function sunDirection(latDeg, hour, declDeg = 0) {
  const lat = latDeg * D2R, dec = declDeg * D2R, H = (15 * (hour - 12)) * D2R;
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  if (alt <= 0) return null;
  const cosAz = (Math.sin(dec) - Math.sin(lat) * sinAlt) / ((Math.cos(lat) * Math.cos(alt)) || 1e-9);
  let az = Math.acos(clamp(cosAz, -1, 1));
  if (H > 0) az = 2 * Math.PI - az;
  return [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)];
}

// ---------------------------------------------------------------------------
export function computeMetrics(model) {
  const { P, site, faces, apertures, north } = model;
  const sun = sunSamples(site.latitude);

  // Solar
  let solarEnvelope = 0, solarUseful = 0, solarSouth = 0, solarWinter = 0, solarSummer = 0;
  for (const s of sun) {
    if (!s.up) continue;
    for (const f of faces) solarEnvelope += f.area * Math.max(0, dot(f.n, s.L));
    for (const a of apertures) {
      const g = a.area * Math.max(0, dot(a.n, s.L));
      solarUseful += g;
      if (s.season === "winter") solarWinter += g;
      if (s.season === "summer") solarSummer += g;
      const az = azOf(a.n);
      if (az >= 135 && az <= 225) solarSouth += g;
    }
  }
  solarEnvelope /= N_SUN; solarUseful /= N_SUN; solarSouth /= N_SUN;
  solarWinter /= N_SEASON; solarSummer /= N_SEASON;
  const overheatRatio = solarWinter > 1e-6 ? solarSummer / solarWinter : (solarSummer > 0 ? 99 : 0);

  // Wind
  const fWind = dirAz(site.windFromAz, 0);
  let windExposure = 0;
  for (const f of faces) { if (Math.abs(f.n[2]) > 0.95) continue; windExposure += f.area * Math.max(0, dot(f.n, fWind)); }
  const windPressure = 0.5 * 1.225 * site.windSpeed * site.windSpeed * windExposure;

  // Channelling between walls and plinth across the wind
  const u = rotZ(fWind, 90);
  const halfAlong = (rot, hw, hd) => { const ex = rotZ([1, 0, 0], rot), ey = rotZ([0, 1, 0], rot); return hw * Math.abs(dot(u, ex)) + hd * Math.abs(dot(u, ey)); };
  const wallsHalfU = halfAlong(P.walls.R + north, P.walls.W / 2, P.walls.L / 2);
  const plinthHalfU = halfAlong(P.plinth.R + north, P.plinth.W / 2, P.plinth.L / 2);
  const cuWalls = dot(rotZ([P.walls.cx, P.walls.cy, 0], north), u);
  const cuPlinth = dot(rotZ([P.plinth.cx, P.plinth.cy, 0], north), u);
  const gapPlus = (cuPlinth + plinthHalfU) - (cuWalls + wallsHalfU);
  const gapMinus = (cuWalls - wallsHalfU) - (cuPlinth - plinthHalfU);
  const minGap = Math.min(gapPlus, gapMinus);
  const channelIndex = minGap > 0.05 ? (2 * wallsHalfU) / minGap : 0;

  // Stack ventilation
  let zmean = 0, atot = 0;
  for (const a of apertures) { zmean += a.c[2] * a.area; atot += a.area; }
  zmean = atot > 0 ? zmean / atot : 0;
  let Ain = 0, Aout = 0, zinA = 0, zoutA = 0;
  for (const a of apertures) {
    const isOut = a.kind === "roof" || a.c[2] > zmean + 1e-9;
    if (isOut) { Aout += a.area; zoutA += a.c[2] * a.area; } else { Ain += a.area; zinA += a.c[2] * a.area; }
  }
  const zin = Ain > 0 ? zinA / Ain : 0, zout = Aout > 0 ? zoutA / Aout : 0;
  const stackHeight = Math.max(0, zout - zin);
  const Astar = (Ain > 0 && Aout > 0) ? 1 / Math.sqrt(1 / (Ain * Ain) + 1 / (Aout * Aout)) : 0;
  const stackIndex = (Astar > 0 && stackHeight > 0) ? 0.61 * Astar * Math.sqrt(2 * 9.81 * stackHeight * Math.max(0, site.deltaT) / 293.15) : 0;

  // Views (eye at walls centre)
  const eyeW = rotZ([P.walls.cx, P.walls.cy, 0], north);
  const eye = [eyeW[0], eyeW[1], site.eyeHeight];
  const vTarget = dirAz(site.viewTargetAz, 0);
  let viewAmount = 0, viewQuality = 0, skyView = 0;
  for (const a of apertures) {
    const d = sub(a.c, eye); const r = len(d); if (r < 1e-3) continue;
    const dh = scale(d, 1 / r);
    const omega = a.area * Math.max(0, dot(dh, a.n)) / (r * r);
    if (a.kind === "roof") skyView += a.area * Math.max(0, dot(dh, [0, 0, 1])) / (r * r);
    else { viewAmount += omega; viewQuality += omega * Math.max(0, dot(dh, vTarget)); }
  }

  // Earth coupling vs terrain
  const Pl = P.plinth;
  const gc = rotZ([Pl.cx, Pl.cy, 0], north);
  const ground = terrainHeight(gc[0], gc[1], site.terrain);
  const botZ = -Pl.t;
  const buriedSide = clamp(Math.min(ground, 0) - botZ, 0, Pl.t);
  const perim = 2 * (Pl.W + Pl.L);
  const soilContactArea = perim * buriedSide + (buriedSide > 1e-6 ? Pl.W * Pl.L : 0);
  const massVolume = Pl.W * Pl.L * Pl.t;
  const buriedFraction = Pl.t > 1e-6 ? buriedSide / Pl.t : 0;

  // Derived
  const innerW = Math.max(0, P.walls.W - 2 * P.walls.wt), innerL = Math.max(0, P.walls.L - 2 * P.walls.wt);
  const roofVoid = 0.5 * P.roof.W * P.roof.L * Math.max(0, P.roof.ridgeRise);
  const enclosedVolume = innerW * innerL * P.walls.h + roofVoid;
  const thermalMassRatio = enclosedVolume > 1e-6 ? (massVolume * 2.0) / enclosedVolume : 0;
  let envelopeArea = 0; for (const f of faces) envelopeArea += f.area;
  let glazingArea = 0; for (const a of apertures) glazingArea += a.area;
  const glazingRatio = envelopeArea > 1e-6 ? glazingArea / envelopeArea : 0;
  const surfaceToVolume = enclosedVolume > 1e-6 ? envelopeArea / enclosedVolume : 0;
  const ridgeHeight = P.walls.h + P.roof.ridgeRise;
  const pitchDeg = (P.roof.pitchL + P.roof.pitchR) / 2;

  return {
    solarEnvelope, solarUseful, solarSouth, solarWinterUseful: solarWinter, solarSummerUseful: solarSummer, overheatRatio,
    windExposure, windPressure, channelIndex,
    stackIndex, stackHeight, effectiveOpenArea: Astar,
    viewAmount, viewQuality, skyView,
    soilContactArea, massVolume, thermalMassRatio, buriedFraction,
    enclosedVolume, envelopeArea, glazingArea, glazingRatio, surfaceToVolume,
    footprint: P.plinth.W * P.plinth.L, ridgeHeight, pitchDeg, pitchLeft: P.roof.pitchL, pitchRight: P.roof.pitchR,
  };
}

export function analyze(params, site) {
  const model = buildModel(params, site);
  return { model, metrics: computeMetrics(model) };
}

// Viewport-only: per-face average solar incidence, normalized 0..1.
export function perFaceSolar(model) {
  const sun = sunSamples(model.site.latitude);
  const res = {}; let mx = 1e-9;
  for (const f of model.faces) {
    let s = 0; for (const u of sun) if (u.up) s += Math.max(0, dot(f.n, u.L));
    s /= N_SUN; res[f.name] = s; if (s > mx) mx = s;
  }
  for (const k in res) res[k] /= mx;
  return res;
}

// ---------------------------------------------------------------------------
export const VARIABLE_DEFS = [
  { key: "walls_h", label: "Wall height", unit: "m", group: "Params" },
  { key: "walls_wt", label: "Wall thickness", unit: "m", group: "Params" },
  { key: "plinth_t", label: "Plinth thickness", unit: "m", group: "Params" },
  { key: "roof_pitchL", label: "Roof pitch L", unit: "°", group: "Params" },
  { key: "roof_pitchR", label: "Roof pitch R", unit: "°", group: "Params" },
  { key: "roof_ridgeRise", label: "Ridge rise", unit: "m", group: "Params" },
  { key: "pitchDeg", label: "Roof pitch (avg)", unit: "°", group: "Form" },
  { key: "ridgeHeight", label: "Ridge height (abs)", unit: "m", group: "Form" },
  { key: "footprint", label: "Plinth footprint", unit: "m²", group: "Form" },
  { key: "enclosedVolume", label: "Enclosed volume", unit: "m³", group: "Form" },
  { key: "envelopeArea", label: "Envelope area", unit: "m²", group: "Form" },
  { key: "glazingRatio", label: "Glazing ratio", unit: "0–1", group: "Form" },
  { key: "surfaceToVolume", label: "Surface : volume", unit: "1/m", group: "Form" },
  { key: "solarUseful", label: "Solar gain (apertures, yr)", unit: "idx", group: "Solar" },
  { key: "solarWinterUseful", label: "Winter solar gain", unit: "idx", group: "Solar" },
  { key: "solarSummerUseful", label: "Summer solar gain", unit: "idx", group: "Solar" },
  { key: "solarSouth", label: "South-facing solar gain", unit: "idx", group: "Solar" },
  { key: "overheatRatio", label: "Overheating ratio (S/W)", unit: "×", group: "Solar" },
  { key: "solarEnvelope", label: "Solar on whole envelope", unit: "idx", group: "Solar" },
  { key: "windExposure", label: "Wind exposure (windward)", unit: "m²", group: "Wind" },
  { key: "windPressure", label: "Wind load proxy", unit: "N", group: "Wind" },
  { key: "channelIndex", label: "Wind channelling", unit: "×", group: "Wind" },
  { key: "stackIndex", label: "Stack ventilation", unit: "idx", group: "Air" },
  { key: "stackHeight", label: "Effective stack height", unit: "m", group: "Air" },
  { key: "viewAmount", label: "View openness", unit: "sr", group: "View" },
  { key: "viewQuality", label: "View toward target", unit: "sr", group: "View" },
  { key: "skyView", label: "Sky view (skylight)", unit: "sr", group: "View" },
  { key: "soilContactArea", label: "Soil-contact area", unit: "m²", group: "Earth" },
  { key: "thermalMassRatio", label: "Thermal mass ratio", unit: "MJ/K·m³", group: "Earth" },
  { key: "buriedFraction", label: "Buried fraction", unit: "0–1", group: "Earth" },
];

export function flatten(params, metrics) {
  const out = {};
  for (const grp of ["plinth", "walls", "roof"]) for (const k in params[grp]) if (typeof params[grp][k] === "number") out[`${grp}_${k}`] = params[grp][k];
  for (const k in metrics) out[k] = metrics[k];
  return out;
}

// ---------------------------------------------------------------------------
export function evaluateRule(rule, vars) {
  const x = vars[rule.lhs];
  if (x === undefined || x === null || Number.isNaN(x)) return { id: rule.id, ok: false, value: null, margin: null, reason: "no value" };
  let ok = false, margin = 0; const r = rule.rhs;
  switch (rule.op) {
    case "<": ok = x < r; margin = r - x; break;
    case "<=": ok = x <= r; margin = r - x; break;
    case ">": ok = x > r; margin = x - r; break;
    case ">=": ok = x >= r; margin = x - r; break;
    case "==": ok = Math.abs(x - r) <= (rule.tol ?? 1e-6); margin = -(Math.abs(x - r)); break;
    case "between": ok = x >= r[0] && x <= r[1]; margin = Math.min(x - r[0], r[1] - x); break;
    case "outside": ok = x < r[0] || x > r[1]; margin = Math.max(r[0] - x, x - r[1]); break;
    default: ok = false;
  }
  return { id: rule.id, ok, value: x, margin };
}

export function evaluateRuleset(ruleset, vars) {
  const rules = (ruleset && ruleset.rules) || [];
  const results = rules.map((rule) => Object.assign({ rule }, evaluateRule(rule, vars)));
  let hardPass = true, weightTotal = 0, weightPass = 0;
  for (const res of results) {
    const w = res.rule.weight ?? 1; weightTotal += w;
    if (res.ok) weightPass += w;
    if ((res.rule.hard ?? false) && !res.ok) hardPass = false;
  }
  return { results, hardPass, score: weightTotal > 0 ? weightPass / weightTotal : 1, passCount: results.filter((r) => r.ok).length, total: results.length };
}

export function run(params, site, ruleset) {
  const { model, metrics } = analyze(params, site);
  const vars = flatten(params, metrics);
  return { model, metrics, vars, evaluation: ruleset ? evaluateRuleset(ruleset, vars) : null };
}
