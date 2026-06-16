// rhino3dm-export.js — the "Ladybug analog": bake the site analysis as native
// Rhino geometry into a single .3dm a student opens with zero plugins.
//
// Everything lands on the SAME local-metre origin as terrain.obj / the DXF
// exports (SW corner of the site bbox, +X east, +Y north, +Z up), so the
// diagrams sit in true position and scale around the real ground.
//
// Layers (toggle them like Ladybug components in Rhino):
//   Terrain        — DEM mesh, vertex-coloured by elevation
//   Site Boundary  — EPA polygon draped at grade
//   Sun Path       — solstice/equinox + monthly day-arcs and hourly analemmas
//   Wind Rose      — frequency petals by direction, coloured by speed band
//   Flood Plane    — horizontal surface at the FEMA base flood elevation
//   Labels         — text dots with the key numbers
//   North          — north arrow

import rhino3dm from "rhino3dm";
import { makeProjector, solarPosition, windRose } from "./geo.js";

const RAD = Math.PI / 180;
let _rhino = null;
const getRhino = async () => (_rhino ||= await rhino3dm());

// --- colour helpers --------------------------------------------------------

// Elevation → Ladybug-ish gradient (low blue → green → yellow → brown → white).
function elevColor(t) {
  const stops = [
    [0.0, [40, 90, 140]], [0.25, [60, 155, 150]], [0.5, [110, 175, 95]],
    [0.7, [205, 195, 95]], [0.85, [150, 110, 70]], [1.0, [240, 240, 240]]
  ];
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
      const f = (t - t0) / (t1 - t0 || 1);
      return c0.map((v, k) => Math.round(v + (c1[k] - v) * f));
    }
  }
  return stops[stops.length - 1][1];
}
const WIND_BANDS = [[207, 224, 224], [143, 188, 191], [79, 142, 146], [47, 93, 98], [29, 58, 61]];

// --- doc scaffolding -------------------------------------------------------

function makeLayer(doc, rhino, name, [r, g, b]) {
  const layer = new rhino.Layer();
  layer.name = name;
  layer.color = { r, g, b, a: 255 };
  const idx = doc.layers().add(layer);
  const attr = new rhino.ObjectAttributes();
  attr.layerIndex = idx;
  return attr;
}

// --- main ------------------------------------------------------------------

// bundle: { site, topo, climate (raw hourly from climateYear), flood }
export async function buildAnalysisModel(bundle) {
  const rhino = await getRhino();
  const doc = new rhino.File3dm();
  doc.settings().modelUnitSystem = rhino.UnitSystem.Meters;

  const { site, topo, climate, flood } = bundle;
  const bbox = (topo && topo.bbox) || site.bbox;
  if (!bbox) throw new Error("No bounding box; cannot build a site model.");
  const [w, s, e, nth] = bbox;
  const proj = makeProjector(s, w); // origin = SW corner, shared with OBJ/DXF

  // Site footprint in metres + a representative ground height (origin = w,s → 0,0).
  const [spanX, spanY] = proj.toLocal(e, nth);
  const maxSpan = Math.max(spanX, spanY) || 200;
  const groundZ = topo?.stats?.mean ?? 0;
  const center = [...proj.toLocal(site.centroid.lon, site.centroid.lat), groundZ];

  // 1) Terrain (vertex-coloured) ------------------------------------------
  if (topo) addTerrain(doc, rhino, topo, proj);

  // 2) Site boundary -------------------------------------------------------
  if (site.boundary) addBoundary(doc, rhino, site.boundary, proj, groundZ);

  // 3) Sun path ------------------------------------------------------------
  const sunR = Math.max(maxSpan * 0.55, 40);
  if (site.centroid) addSunPath(doc, rhino, site.centroid, climate?.tzOffsetHours ?? 0, center, sunR);

  // 4) Wind rose (offset to the east so it sits beside the site) -----------
  if (climate && climate.windSpeed?.length) {
    const windR = sunR * 0.6;
    const windCenter = [center[0] + maxSpan * 0.9 + windR, center[1], groundZ];
    addWindRose(doc, rhino, climate, windCenter, windR);
  }

  // 5) Flood plane ---------------------------------------------------------
  if (flood && flood.inFloodZone && flood.baseFloodElevation != null) {
    addFloodPlane(doc, rhino, spanX, spanY, flood.baseFloodElevation * 0.3048);
  }

  // 6) North arrow + labels -----------------------------------------------
  addNorth(doc, rhino, center, sunR * 1.15);
  addLabels(doc, rhino, bundle, center, sunR);

  const bytes = doc.toByteArray();
  return Buffer.from(bytes);
}

// --- terrain ---------------------------------------------------------------

function addTerrain(doc, rhino, topo, proj) {
  const attr = makeLayer(doc, rhino, "Terrain", [150, 130, 100]);
  const { grid, n, bbox } = topo;
  const [w, s, e, nth] = bbox;
  let min = Infinity, max = -Infinity;
  for (const row of grid) for (const v of row) { if (v < min) min = v; if (v > max) max = v; }
  const span = max - min || 1;

  const mesh = new rhino.Mesh();
  const verts = mesh.vertices();
  const vcol = mesh.vertexColors();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const lon = w + ((e - w) * c) / (n - 1);
      const lat = s + ((nth - s) * r) / (n - 1);
      const [x, y] = proj.toLocal(lon, lat);
      const z = grid[r][c];
      verts.add(x, y, z);
      const [cr, cg, cb] = elevColor((z - min) / span);
      vcol.add(cr, cg, cb);
    }
  }
  const idx = (r, c) => r * n + c;
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n - 1; c++)
      mesh.faces().addQuadFace(idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c));
  doc.objects().addMesh(mesh, attr);
}

// --- boundary --------------------------------------------------------------

function addBoundary(doc, rhino, geojson, proj, z) {
  const attr = makeLayer(doc, rhino, "Site Boundary", [138, 75, 47]);
  const polys = geojson.type === "MultiPolygon" ? geojson.coordinates : [geojson.coordinates];
  for (const poly of polys)
    for (const ring of poly) {
      const pts = ring.map(([lon, lat]) => { const [x, y] = proj.toLocal(lon, lat); return [x, y, z]; });
      if (pts.length > 1) doc.objects().addPolyline(pts, attr);
    }
}

// --- sun path --------------------------------------------------------------

// Local clock hour → UTC Date for a given month/day.
function localUTC(year, month, day, hour, tz) {
  const d = new Date(Date.UTC(year, month, day, 0, 0, 0));
  d.setUTCMinutes(d.getUTCMinutes() + Math.round((hour - tz) * 60));
  return d;
}
const sunVec = (alt, az, R, c) => [
  c[0] + R * Math.cos(alt * RAD) * Math.sin(az * RAD),
  c[1] + R * Math.cos(alt * RAD) * Math.cos(az * RAD),
  c[2] + R * Math.sin(alt * RAD)
];

function addSunPath(doc, rhino, centroid, tz, center, R) {
  const base = makeLayer(doc, rhino, "Sun Path", [120, 120, 130]);
  const hot = makeLayer(doc, rhino, "Sun Path · Solstices", [192, 57, 43]);
  const yr = 2023;

  // Horizon ring + altitude rings (30°, 60°).
  for (const alt of [0, 30, 60]) {
    const ring = [];
    for (let a = 0; a <= 360; a += 5) ring.push(sunVec(alt, a, R, center));
    doc.objects().addPolyline(ring, base);
  }

  // Day arcs for the 21st of each month; highlight the solstices.
  for (let m = 0; m < 12; m++) {
    const pts = [];
    for (let h = 0; h <= 24; h += 0.25) {
      const { altitude, azimuth } = solarPosition(centroid.lat, centroid.lon, localUTC(yr, m, 21, h, tz));
      if (altitude > 0) pts.push(sunVec(altitude, azimuth, R, center));
    }
    if (pts.length > 1) doc.objects().addPolyline(pts, m === 5 || m === 11 ? hot : base);
  }

  // Hourly analemma lines (sun at each whole local hour across the 12 months).
  for (let h = 4; h <= 20; h++) {
    const pts = [];
    for (let m = 0; m < 12; m++) {
      const { altitude, azimuth } = solarPosition(centroid.lat, centroid.lon, localUTC(yr, m, 21, h, tz));
      if (altitude > 0) pts.push(sunVec(altitude, azimuth, R, center));
    }
    if (pts.length > 2) { pts.push(pts[0]); doc.objects().addPolyline(pts, base); }
  }
}

// --- wind rose -------------------------------------------------------------

function addWindRose(doc, rhino, climate, center, R) {
  const attr = makeLayer(doc, rhino, "Wind Rose", [47, 93, 98]);
  const wr = windRose(climate.windSpeed, climate.windDir);
  const dirN = wr.dirs.length;
  const sector = (2 * Math.PI) / dirN;
  const maxFrac = Math.max(0.0001, ...wr.matrix.map((row) => row.reduce((a, b) => a + b, 0)));

  // Reference rings.
  for (const f of [0.5, 1]) {
    const ring = [];
    for (let a = 0; a <= 360; a += 5) ring.push([center[0] + R * f * Math.sin(a * RAD), center[1] + R * f * Math.cos(a * RAD), center[2]]);
    doc.objects().addPolyline(ring, attr);
  }

  wr.matrix.forEach((row, d) => {
    const a0 = d * sector - sector / 2; // petal centred on the compass direction
    const a1 = d * sector + sector / 2;
    let r0 = 0;
    row.forEach((frac, b) => {
      if (frac <= 0) return;
      const r1 = r0 + (frac / maxFrac) * R;
      const mesh = new rhino.Mesh();
      const v = mesh.vertices();
      const polar = (r, a) => [center[0] + r * Math.sin(a), center[1] + r * Math.cos(a), center[2]];
      const p = [polar(r0, a0), polar(r1, a0), polar(r1, a1), polar(r0, a1)];
      p.forEach(([x, y, z]) => v.add(x, y, z));
      mesh.faces().addQuadFace(0, 1, 2, 3);
      const vc = mesh.vertexColors();
      const [cr, cg, cb] = WIND_BANDS[b % WIND_BANDS.length];
      for (let k = 0; k < 4; k++) vc.add(cr, cg, cb);
      doc.objects().addMesh(mesh, attr);
      r0 = r1;
    });
  });
}

// --- flood plane -----------------------------------------------------------

function addFloodPlane(doc, rhino, spanX, spanY, zMeters) {
  const attr = makeLayer(doc, rhino, "Flood Plane", [70, 130, 200]);
  const mesh = new rhino.Mesh();
  const v = mesh.vertices();
  v.add(0, 0, zMeters); v.add(spanX, 0, zMeters); v.add(spanX, spanY, zMeters); v.add(0, spanY, zMeters);
  mesh.faces().addQuadFace(0, 1, 2, 3);
  doc.objects().addMesh(mesh, attr);
}

// --- north + labels --------------------------------------------------------

function addNorth(doc, rhino, center, len) {
  const attr = makeLayer(doc, rhino, "North", [40, 40, 40]);
  doc.objects().addPolyline([[center[0], center[1], center[2]], [center[0], center[1] + len, center[2]]], attr);
  doc.objects().addTextDot("N", [center[0], center[1] + len, center[2]], attr);
}

function addLabels(doc, rhino, bundle, center, R) {
  const attr = makeLayer(doc, rhino, "Labels", [30, 30, 30]);
  const { site, climate, flood } = bundle;
  const top = [center[0], center[1], center[2] + R + 8];
  doc.objects().addTextDot(`${site.name} · ${site.status}`, top, attr);

  if (climate) {
    const wr = windRose(climate.windSpeed, climate.windDir);
    const totals = wr.matrix.map((row) => row.reduce((a, b) => a + b, 0));
    const prevailing = wr.dirs[totals.indexOf(Math.max(...totals))];
    const sum = solarPosition(site.centroid.lat, site.centroid.lon, localUTC(2023, 5, 21, 12, climate.tzOffsetHours)).altitude;
    const win = solarPosition(site.centroid.lat, site.centroid.lon, localUTC(2023, 11, 21, 12, climate.tzOffsetHours)).altitude;
    doc.objects().addTextDot(`Sun noon ${sum.toFixed(0)}° (Jun) / ${win.toFixed(0)}° (Dec)`, [center[0], center[1], center[2] + R * 0.6], attr);
    doc.objects().addTextDot(`Prevailing wind: ${prevailing}`, [center[0] + R, center[1], center[2] + R * 0.6], attr);
  }
  if (flood && flood.inFloodZone) {
    doc.objects().addTextDot(`FEMA zone ${flood.zone}${flood.baseFloodElevation != null ? ` · BFE ${flood.baseFloodElevation} ft` : ""}`, [center[0], center[1] + R * 0.3, center[2] + 2], attr);
  }
}
