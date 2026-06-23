// core.js — Gable Studio's SINGLE SOURCE OF TRUTH.
//
// Pure, dependency-free, deterministic geometry + performance metrics + rule
// evaluation for the prototypical massing: a rectangular PLINTH, a rectangular
// ROOM on top, and a single-ridge GABLE ROOF, plus 4 aperture cuts (3 walls + 1
// roof). NO DOM, NO Three.js, NO rhino imports in this file.
//
// Why "single source of truth": the browser viewport renders from it, the rule
// evaluator constrains on it, and python/gable_core.py is a line-for-line port
// of it. test/ proves the JS and python numbers agree. If you change a formula
// here, change it there too (the parity test will catch you if you forget).
//
// Conventions (shared with Rhino exports):
//   +X = East, +Y = North, +Z = Up. Metres. Degrees in, radians internal.
//   Azimuth = degrees clockwise from North (North 0, East 90, South 180).
//   Building base (plinth bottom) sits at z = 0; grade/soil rises to z = e.
//
// IMPORTANT: every metric below is a simplified PEDAGOGICAL PROXY, not a
// validated simulation. Teach it that way. Its value is that it is transparent,
// reproducible, and identical in the browser and in Rhino.

const D2R = Math.PI / 180;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// --- tiny vector helpers ----------------------------------------------------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// Rotate about +Z by deg (positive = CCW seen from above, +X toward +Y).
const rotZ = ([x, y, z], deg) => {
  const r = deg * D2R, c = Math.cos(r), s = Math.sin(r);
  return [x * c - y * s, x * s + y * c, z];
};
// Unit direction from azimuth (deg cw from North) + altitude (deg).
const dirAz = (azDeg, altDeg) => {
  const a = azDeg * D2R, e = altDeg * D2R;
  return [Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)];
};
// Azimuth (deg, 0..360 cw from North) of a horizontal direction.
const azOf = (n) => { let d = Math.atan2(n[0], n[1]) / D2R; return (d + 360) % 360; };

// ---------------------------------------------------------------------------
// DEFAULTS — a believable little building. Apertures: 3 walls + 1 roof.
// host: wall_py (+Y / "North"), wall_ny (-Y / "South"), wall_px (+X / "East"),
//       wall_nx (-X / "West"), roof_a (+X slope), roof_b (-X slope).
// ---------------------------------------------------------------------------
export const DEFAULTS = {
  params: {
    Wp: 8, Dp: 10, Hp: 0.8, Rp: 0, e: 0.0,            // plinth
    Wr: 6, Dr: 8, Hr: 3.2, Rr: 0, cx: 0, cy: 0,        // room (offset cx,cy on plinth)
    Wroof: 6, Droof: 8, Hg: 2.4, Rg: 0,                // roof (ridge runs along local Y)
    apertures: [
      { id: "A1", host: "wall_ny", u: 0.5, v: 0.5, w: 2.6, h: 1.6 }, // South: big solar/view
      { id: "A2", host: "wall_px", u: 0.5, v: 0.45, w: 1.2, h: 1.3 }, // East
      { id: "A3", host: "wall_py", u: 0.5, v: 0.35, w: 1.4, h: 1.0 }, // North: low inlet
      { id: "A4", host: "roof_b", u: 0.7, v: 0.5, w: 1.0, h: 1.0 },   // roof skylight (high outlet)
    ],
  },
  site: {
    latitude: 42, northAngle: 0, windFromAz: 270, windSpeed: 5,
    deltaT: 6, viewTargetAz: 180, eyeHeight: 1.6,
  },
};

export const WALL_HOSTS = ["wall_py", "wall_ny", "wall_px", "wall_nx"];
export const ROOF_HOSTS = ["roof_a", "roof_b"];
export const HOST_LABELS = {
  wall_py: "North wall (+Y)", wall_ny: "South wall (−Y)",
  wall_px: "East wall (+X)", wall_nx: "West wall (−X)",
  roof_a: "Roof slope A (+X)", roof_b: "Roof slope B (−X)",
};

// ---------------------------------------------------------------------------
// GEOMETRY — analytic faces (name, kind, area, world normal n, world centroid c)
// plus per-host face frames so apertures can be placed by (u,v).
// ---------------------------------------------------------------------------
function buildFrames(P) {
  const N = P_site_north(P);
  const roomC = [P.cx, P.cy]; // room/roof plan centre in building frame
  const wallZ = P.Hp + P.Hr / 2;
  const frames = {};

  // Room walls. tangent = horizontal along the wall; faceWidth along it; height = Hr.
  const wall = (key, nLocal, tanLocal, faceWidth, centerRelLocal) => {
    frames[key] = {
      kind: "wall",
      n: norm(rotZ(nLocal, P.Rr + N)),
      c: worldPoint(centerRelLocal, wallZ, P.Rr, roomC, N),
      uAxis: rotZ(tanLocal, P.Rr + N),       // along width
      vAxis: [0, 0, 1],                        // vertical (v=1 at top)
      faceWidth, faceHeight: P.Hr,
      area: faceWidth * P.Hr,
    };
  };
  wall("wall_px", [1, 0, 0], [0, 1, 0], P.Dr, [P.Wr / 2, 0]);
  wall("wall_nx", [-1, 0, 0], [0, 1, 0], P.Dr, [-P.Wr / 2, 0]);
  wall("wall_py", [0, 1, 0], [1, 0, 0], P.Wr, [0, P.Dr / 2]);
  wall("wall_ny", [0, -1, 0], [1, 0, 0], P.Wr, [0, -P.Dr / 2]);

  // Roof planes. ridge along local Y (length Droof); slope length s; eave z; ridge z.
  const eaveZ = P.Hp + P.Hr, s = Math.hypot(P.Wroof / 2, P.Hg) || 1e-9;
  const roof = (key, sign) => {
    const nLocal = norm([sign * P.Hg, 0, P.Wroof / 2]); // up & outward
    const uphillLocal = norm([-sign * P.Wroof / 2, 0, P.Hg]); // eave -> ridge (u=1 near ridge)
    frames[key] = {
      kind: "roof",
      n: norm(rotZ(nLocal, P.Rg + N)),
      c: worldPoint([sign * P.Wroof / 4, 0], eaveZ + P.Hg / 2, P.Rg, roomC, N),
      uAxis: rotZ(uphillLocal, P.Rg + N),     // along slope, toward ridge
      vAxis: rotZ([0, 1, 0], P.Rg + N),        // along ridge
      faceWidth: s, faceHeight: P.Droof,
      area: s * P.Droof,
    };
  };
  roof("roof_a", +1);
  roof("roof_b", -1);
  return frames;
}

// Plinth side faces that are above grade (exposed to sun/wind). z mid = e + ag/2.
function plinthSides(P) {
  const N = P_site_north(P);
  const ag = Math.max(0, P.Hp - P.e);
  if (ag <= 1e-6) return [];
  const zc = P.e + ag / 2;
  const mk = (nLocal, w, centerRel) => ({
    name: "plinth", kind: "plinth", area: w * ag,
    n: norm(rotZ(nLocal, P.Rp + N)),
    c: worldPoint(centerRel, zc, P.Rp, [0, 0], N),
  });
  return [
    mk([1, 0, 0], P.Dp, [P.Wp / 2, 0]),
    mk([-1, 0, 0], P.Dp, [-P.Wp / 2, 0]),
    mk([0, 1, 0], P.Wp, [0, P.Dp / 2]),
    mk([0, -1, 0], P.Wp, [0, -P.Dp / 2]),
  ];
}

// Transform a (centre-relative, planar) point + z into world coords:
// rotate by the element's own rotation, translate to the element centre, then
// rotate the whole building by north. z passes through unchanged.
function worldPoint(centerRel, z, elemRot, center, north) {
  const p = rotZ([centerRel[0], centerRel[1], 0], elemRot);
  const inBldg = [p[0] + center[0], p[1] + center[1], z];
  const w = rotZ([inBldg[0], inBldg[1], 0], north);
  return [w[0], w[1], z];
}
const P_site_north = (P) => P.__north || 0; // north baked onto params at build time

// Resolve the 4 apertures into world faces (area clamped to host face).
function buildApertures(P, frames) {
  return (P.apertures || []).map((ap) => {
    const f = frames[ap.host] || frames.wall_ny;
    const w = clamp(ap.w, 0.05, f.faceWidth);
    const h = clamp(ap.h, 0.05, f.faceHeight);
    const du = (clamp(ap.u, 0, 1) - 0.5) * f.faceWidth;
    const dv = (clamp(ap.v, 0, 1) - 0.5) * f.faceHeight;
    const c = add(add(f.c, scale(f.uAxis, du)), scale(f.vAxis, dv));
    return { id: ap.id, host: ap.host, kind: f.kind, area: w * h, w, h, n: f.n, c };
  });
}

// Full analytic model: exterior faces + apertures + a few plan helpers.
export function buildModel(rawParams, site) {
  const P = Object.assign({}, rawParams, { __north: site.northAngle || 0 });
  const frames = buildFrames(P);
  const walls = WALL_HOSTS.map((k) => Object.assign({ name: k }, frames[k]));
  const roofs = ROOF_HOSTS.map((k) => Object.assign({ name: k }, frames[k]));
  const plinth = plinthSides(P);
  const apertures = buildApertures(P, frames);
  return { P, site, frames, faces: [...walls, ...roofs, ...plinth], walls, roofs, plinth, apertures };
}

// ---------------------------------------------------------------------------
// SUN — sampled positions across the year (3 declinations × 5 hours = 15).
// ---------------------------------------------------------------------------
const DECLS = [{ k: "summer", d: 23.45 }, { k: "equinox", d: 0 }, { k: "winter", d: -23.45 }];
const HOURS = [8, 10, 12, 14, 16];
const N_SUN = DECLS.length * HOURS.length;     // 15
const N_SEASON = HOURS.length;                  // 5

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
        if (H > 0) az = 2 * Math.PI - az;       // afternoon -> west
        L = [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)];
      }
      out.push({ season: k, L, up: alt > 0 });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// METRICS — pure functions of (model). All deterministic proxies.
// ---------------------------------------------------------------------------
export function computeMetrics(model) {
  const { P, site, faces, apertures } = model;
  const sun = sunSamples(site.latitude);

  // --- Solar -----------------------------------------------------------------
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
      if (az >= 135 && az <= 225) solarSouth += g; // south-facing apertures
    }
  }
  solarEnvelope /= N_SUN; solarUseful /= N_SUN; solarSouth /= N_SUN;
  solarWinter /= N_SEASON; solarSummer /= N_SEASON;
  // overheating risk proxy: summer useful gain relative to winter (want low)
  const overheatRatio = solarWinter > 1e-6 ? solarSummer / solarWinter : (solarSummer > 0 ? 99 : 0);

  // --- Wind ------------------------------------------------------------------
  const fWind = dirAz(site.windFromAz, 0); // points toward where wind comes FROM
  let windExposure = 0;
  for (const f of faces) {
    if (Math.abs(f.n[2]) > 0.95) continue;   // skip near-horizontal faces
    windExposure += f.area * Math.max(0, dot(f.n, fWind));
  }
  const windPressure = 0.5 * 1.225 * site.windSpeed * site.windSpeed * windExposure; // ~N

  // Channelling / venturi: plan throat between room and plinth across the wind.
  const u = rotZ(fWind, 90);                 // cross-wind horizontal axis
  const halfAlong = (rot, hw, hd) => {
    const ex = rotZ([1, 0, 0], rot), ey = rotZ([0, 1, 0], rot);
    return hw * Math.abs(dot(u, ex)) + hd * Math.abs(dot(u, ey));
  };
  const N = site.northAngle || 0;
  const roomHalfU = halfAlong(P.Rr + N, P.Wr / 2, P.Dr / 2);
  const plinthHalfU = halfAlong(P.Rp + N, P.Wp / 2, P.Dp / 2);
  const roomCW = rotZ([P.cx, P.cy, 0], N);
  const cuRoom = dot(roomCW, u);
  const gapPlus = (0 + plinthHalfU) - (cuRoom + roomHalfU);
  const gapMinus = (cuRoom - roomHalfU) - (0 - plinthHalfU);
  const minGap = Math.min(gapPlus, gapMinus);
  const channelIndex = minGap > 0.05 ? (2 * roomHalfU) / minGap : 0;

  // --- Stack ventilation -----------------------------------------------------
  // Split apertures into outlets (above mean height or on the roof) vs inlets.
  let zmean = 0, atot = 0;
  for (const a of apertures) { zmean += a.c[2] * a.area; atot += a.area; }
  zmean = atot > 0 ? zmean / atot : 0;
  let Ain = 0, Aout = 0, zinA = 0, zoutA = 0;
  for (const a of apertures) {
    const isOut = a.kind === "roof" || a.c[2] > zmean + 1e-9;
    if (isOut) { Aout += a.area; zoutA += a.c[2] * a.area; }
    else { Ain += a.area; zinA += a.c[2] * a.area; }
  }
  const zin = Ain > 0 ? zinA / Ain : 0, zout = Aout > 0 ? zoutA / Aout : 0;
  const stackHeight = Math.max(0, zout - zin);
  const Astar = (Ain > 0 && Aout > 0) ? 1 / Math.sqrt(1 / (Ain * Ain) + 1 / (Aout * Aout)) : 0;
  const Cd = 0.61, g = 9.81, Tabs = 293.15;
  const stackIndex = (Astar > 0 && stackHeight > 0)
    ? Cd * Astar * Math.sqrt(2 * g * stackHeight * Math.max(0, site.deltaT) / Tabs) : 0;

  // --- Views -----------------------------------------------------------------
  const eyeWorld = (() => {
    const w = rotZ([P.cx, P.cy, 0], N);
    return [w[0], w[1], P.Hp + site.eyeHeight];
  })();
  const vTarget = dirAz(site.viewTargetAz, 0);
  let viewAmount = 0, viewQuality = 0, skyView = 0;
  for (const a of apertures) {
    const d = sub(a.c, eyeWorld); const r = len(d); if (r < 1e-3) continue;
    const dh = scale(d, 1 / r);
    const omega = a.area * Math.max(0, dot(dh, a.n)) / (r * r); // projected solid angle
    if (a.kind === "roof") {
      skyView += a.area * Math.max(0, dot(dh, [0, 0, 1])) / (r * r);
    } else {
      viewAmount += omega;
      viewQuality += omega * Math.max(0, dot(dh, vTarget));
    }
  }

  // --- Thermal mass / earth coupling ----------------------------------------
  const perim = 2 * (P.Wp + P.Dp);
  const buried = Math.min(P.e, P.Hp);
  const soilContactArea = perim * buried + P.Wp * P.Dp;     // sides below grade + base
  const massVolume = P.Wp * P.Dp * P.Hp;                     // plinth = thermal mass
  const roomVolume = P.Wr * P.Dr * P.Hr + 0.5 * P.Wroof * P.Droof * P.Hg;
  const thermalMassRatio = roomVolume > 1e-6 ? (massVolume * 2.0) / roomVolume : 0; // MJ/K per m³
  const buriedFraction = P.Hp > 1e-6 ? buried / P.Hp : 0;

  // --- Derived ---------------------------------------------------------------
  let envelopeArea = 0; for (const f of faces) envelopeArea += f.area;
  let glazingArea = 0; for (const a of apertures) glazingArea += a.area;
  const glazingRatio = envelopeArea > 1e-6 ? glazingArea / envelopeArea : 0;
  const surfaceToVolume = roomVolume > 1e-6 ? envelopeArea / roomVolume : 0;
  const ridgeHeight = P.Hp + P.Hr + P.Hg;
  const pitchDeg = Math.atan2(P.Hg, P.Wroof / 2) / D2R;

  return {
    solarEnvelope, solarUseful, solarSouth, solarWinterUseful: solarWinter,
    solarSummerUseful: solarSummer, overheatRatio,
    windExposure, windPressure, channelIndex,
    stackIndex, stackHeight, effectiveOpenArea: Astar,
    viewAmount, viewQuality, skyView,
    soilContactArea, massVolume, thermalMassRatio, buriedFraction,
    enclosedVolume: roomVolume, envelopeArea, glazingArea, glazingRatio,
    surfaceToVolume, footprint: P.Wp * P.Dp, ridgeHeight, pitchDeg,
  };
}

// One call: params + site -> { model, metrics }.
export function analyze(params, site) {
  const model = buildModel(params, site);
  return { model, metrics: computeMetrics(model) };
}

// Viewport-only helper (not used by metrics/parity): per-face average solar
// incidence, normalized 0..1, for colouring the envelope as a heatmap.
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
// VARIABLE REGISTRY — what a student can write a rule about (params + metrics).
// ---------------------------------------------------------------------------
export const VARIABLE_DEFS = [
  // dimensional params
  { key: "Wp", label: "Plinth width", unit: "m", group: "Params" },
  { key: "Dp", label: "Plinth depth", unit: "m", group: "Params" },
  { key: "Hp", label: "Plinth height", unit: "m", group: "Params" },
  { key: "e", label: "Soil/burial depth", unit: "m", group: "Params" },
  { key: "Wr", label: "Room width", unit: "m", group: "Params" },
  { key: "Dr", label: "Room depth", unit: "m", group: "Params" },
  { key: "Hr", label: "Wall height", unit: "m", group: "Params" },
  { key: "Hg", label: "Ridge rise", unit: "m", group: "Params" },
  { key: "pitchDeg", label: "Roof pitch", unit: "°", group: "Form" },
  { key: "ridgeHeight", label: "Ridge height (abs)", unit: "m", group: "Form" },
  { key: "footprint", label: "Plinth footprint", unit: "m²", group: "Form" },
  { key: "enclosedVolume", label: "Enclosed volume", unit: "m³", group: "Form" },
  { key: "envelopeArea", label: "Envelope area", unit: "m²", group: "Form" },
  { key: "glazingRatio", label: "Glazing ratio", unit: "0–1", group: "Form" },
  { key: "surfaceToVolume", label: "Surface : volume", unit: "1/m", group: "Form" },
  // performance metrics
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

// Flatten params + metrics into a single {key: number} lookup for rules.
export function flatten(params, metrics) {
  const out = {};
  for (const k of Object.keys(params)) if (typeof params[k] === "number") out[k] = params[k];
  for (const k of Object.keys(metrics)) out[k] = metrics[k];
  return out;
}

// ---------------------------------------------------------------------------
// RULES — a rule is a testable constraint over one variable.
//   { id, label, lhs, op, rhs, weight, hard }
//   op: '<' '<=' '>' '>=' '==' 'between' 'outside'
//   rhs: number, or [lo, hi] for between/outside
// ---------------------------------------------------------------------------
export function evaluateRule(rule, vars) {
  const x = vars[rule.lhs];
  if (x === undefined || x === null || Number.isNaN(x)) {
    return { id: rule.id, ok: false, value: null, margin: null, reason: "no value" };
  }
  let ok = false, margin = 0;
  const r = rule.rhs;
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
    const w = res.rule.weight ?? 1;
    weightTotal += w;
    if (res.ok) weightPass += w;
    if ((res.rule.hard ?? false) && !res.ok) hardPass = false;
  }
  const score = weightTotal > 0 ? weightPass / weightTotal : 1;
  return { results, hardPass, score, passCount: results.filter((r) => r.ok).length, total: results.length };
}

// Convenience: params + site + ruleset -> everything the UI / scripts need.
export function run(params, site, ruleset) {
  const { model, metrics } = analyze(params, site);
  const vars = flatten(params, metrics);
  const evald = ruleset ? evaluateRuleset(ruleset, vars) : null;
  return { model, metrics, vars, evaluation: evald };
}
