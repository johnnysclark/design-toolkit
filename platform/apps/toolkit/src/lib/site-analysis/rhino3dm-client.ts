// rhino3dm-client.ts — the "Ladybug analog" .3dm, built IN THE BROWSER.
//
// Ported from TOOLS/site-analyzer/web/rhino3dm-export.js. The original ran on the
// server with the `rhino3dm` npm module; here we load rhino3dm's WASM from the CDN
// at click-time instead, so:
//   - no server-side WASM to bundle on Vercel (the .3dm stays free / D0), and
//   - nothing about this file is in the build graph — a CDN/parse failure throws
//     at runtime inside one button's try/catch and never touches the rest of the tool.
//
// Everything lands on the SAME local-metre origin as the OBJ / DXF exports (SW
// corner of the site bbox, +X east, +Y north, +Z up), so the diagrams sit in true
// position around the real ground.

import { makeProjector, solarPosition, windRose } from "./geo";

const RAD = Math.PI / 180;

// rhino3dm 8.x UMD build. `@8` lets jsdelivr resolve the latest 8.x (the API we
// use — File3dm/Mesh/Layer/addPolyline/addTextDot/toByteArray — is stable across 8.x).
const RHINO_CDN = "https://cdn.jsdelivr.net/npm/rhino3dm@8/rhino3dm.min.js";

declare global {
  interface Window {
    rhino3dm?: () => Promise<any>;
  }
}

let _rhinoPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("Not in a browser."));
    const existing = document.querySelector<HTMLScriptElement>(`script[data-rhino3dm]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load rhino3dm.")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.rhino3dm = "true";
    s.addEventListener("load", () => {
      s.dataset.loaded = "true";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error("Failed to load rhino3dm from the CDN.")));
    document.head.appendChild(s);
  });
}

async function getRhino(): Promise<any> {
  if (_rhinoPromise) return _rhinoPromise;
  _rhinoPromise = (async () => {
    await loadScript(RHINO_CDN);
    if (typeof window === "undefined" || typeof window.rhino3dm !== "function") {
      throw new Error("rhino3dm did not load.");
    }
    return window.rhino3dm();
  })();
  return _rhinoPromise;
}

// --- colour helpers --------------------------------------------------------

function elevColor(t: number): number[] {
  const stops: [number, number[]][] = [
    [0.0, [40, 90, 140]], [0.25, [60, 155, 150]], [0.5, [110, 175, 95]],
    [0.7, [205, 195, 95]], [0.85, [150, 110, 70]], [1.0, [240, 240, 240]]
  ];
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (t - t0) / (t1 - t0 || 1);
      return c0.map((v, k) => Math.round(v + (c1[k] - v) * f));
    }
  }
  return stops[stops.length - 1][1];
}
const WIND_BANDS = [
  [207, 224, 224], [143, 188, 191], [79, 142, 146], [47, 93, 98], [29, 58, 61]
];

// --- doc scaffolding -------------------------------------------------------

function makeLayer(doc: any, rhino: any, name: string, [r, g, b]: number[]) {
  const layer = new rhino.Layer();
  layer.name = name;
  layer.color = { r, g, b, a: 255 };
  const idx = doc.layers().add(layer);
  const attr = new rhino.ObjectAttributes();
  attr.layerIndex = idx;
  return attr;
}

// --- main ------------------------------------------------------------------

// bundle: { site, topo, climate (raw hourly from /analyze), flood }
export async function buildAnalysis3dm(bundle: any): Promise<Uint8Array> {
  const rhino = await getRhino();
  const doc = new rhino.File3dm();
  doc.settings().modelUnitSystem = rhino.UnitSystem.Meters;

  const { site, topo, climate, flood } = bundle;
  const bbox = (topo && topo.bbox) || site.bbox;
  if (!bbox) throw new Error("No bounding box; cannot build a site model.");
  const [w, s, e, nth] = bbox;
  const proj = makeProjector(s, w); // origin = SW corner, shared with OBJ/DXF

  const [spanX, spanY] = proj.toLocal(e, nth);
  const maxSpan = Math.max(spanX, spanY) || 200;
  const groundZ = topo?.stats?.mean ?? 0;
  const center = [...proj.toLocal(site.centroid.lon, site.centroid.lat), groundZ];

  if (topo) addTerrain(doc, rhino, topo, proj);
  if (site.boundary) addBoundary(doc, rhino, site.boundary, proj, groundZ);

  const sunR = Math.max(maxSpan * 0.55, 40);
  if (site.centroid) addSunPath(doc, rhino, site.centroid, climate?.tzOffsetHours ?? 0, center, sunR);

  if (climate && climate.windSpeed?.length) {
    const windR = sunR * 0.6;
    const windCenter = [center[0] + maxSpan * 0.9 + windR, center[1], groundZ];
    addWindRose(doc, rhino, climate, windCenter, windR);
  }

  if (flood && flood.inFloodZone && flood.baseFloodElevation != null) {
    addFloodPlane(doc, rhino, spanX, spanY, flood.baseFloodElevation * 0.3048);
  }

  addNorth(doc, rhino, center, sunR * 1.15);
  addLabels(doc, rhino, bundle, center, sunR);

  return doc.toByteArray() as Uint8Array;
}

// --- terrain ---------------------------------------------------------------

function addTerrain(doc: any, rhino: any, topo: any, proj: any) {
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
  const idx = (r: number, c: number) => r * n + c;
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n - 1; c++)
      mesh.faces().addQuadFace(idx(r, c), idx(r, c + 1), idx(r + 1, c + 1), idx(r + 1, c));
  doc.objects().addMesh(mesh, attr);
}

// --- boundary --------------------------------------------------------------

function addBoundary(doc: any, rhino: any, geojson: any, proj: any, z: number) {
  const attr = makeLayer(doc, rhino, "Site Boundary", [138, 75, 47]);
  const polys = geojson.type === "MultiPolygon" ? geojson.coordinates : [geojson.coordinates];
  for (const poly of polys)
    for (const ring of poly) {
      const pts = ring.map(([lon, lat]: [number, number]) => {
        const [x, y] = proj.toLocal(lon, lat);
        return [x, y, z];
      });
      if (pts.length > 1) doc.objects().addPolyline(pts, attr);
    }
}

// --- sun path --------------------------------------------------------------

function localUTC(year: number, month: number, day: number, hour: number, tz: number): Date {
  const d = new Date(Date.UTC(year, month, day, 0, 0, 0));
  d.setUTCMinutes(d.getUTCMinutes() + Math.round((hour - tz) * 60));
  return d;
}
const sunVec = (alt: number, az: number, R: number, c: number[]) => [
  c[0] + R * Math.cos(alt * RAD) * Math.sin(az * RAD),
  c[1] + R * Math.cos(alt * RAD) * Math.cos(az * RAD),
  c[2] + R * Math.sin(alt * RAD)
];

function addSunPath(doc: any, rhino: any, centroid: any, tz: number, center: number[], R: number) {
  const base = makeLayer(doc, rhino, "Sun Path", [120, 120, 130]);
  const hot = makeLayer(doc, rhino, "Sun Path · Solstices", [192, 57, 43]);
  const yr = 2023;

  for (const alt of [0, 30, 60]) {
    const ring = [];
    for (let a = 0; a <= 360; a += 5) ring.push(sunVec(alt, a, R, center));
    doc.objects().addPolyline(ring, base);
  }

  for (let m = 0; m < 12; m++) {
    const pts = [];
    for (let h = 0; h <= 24; h += 0.25) {
      const { altitude, azimuth } = solarPosition(centroid.lat, centroid.lon, localUTC(yr, m, 21, h, tz));
      if (altitude > 0) pts.push(sunVec(altitude, azimuth, R, center));
    }
    if (pts.length > 1) doc.objects().addPolyline(pts, m === 5 || m === 11 ? hot : base);
  }

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

function addWindRose(doc: any, rhino: any, climate: any, center: number[], R: number) {
  const attr = makeLayer(doc, rhino, "Wind Rose", [47, 93, 98]);
  const wr = windRose(climate.windSpeed, climate.windDir);
  const dirN = wr.dirs.length;
  const sector = (2 * Math.PI) / dirN;
  const maxFrac = Math.max(0.0001, ...wr.matrix.map((row) => row.reduce((a, b) => a + b, 0)));

  for (const f of [0.5, 1]) {
    const ring = [];
    for (let a = 0; a <= 360; a += 5)
      ring.push([center[0] + R * f * Math.sin(a * RAD), center[1] + R * f * Math.cos(a * RAD), center[2]]);
    doc.objects().addPolyline(ring, attr);
  }

  wr.matrix.forEach((row, d) => {
    const a0 = d * sector - sector / 2;
    const a1 = d * sector + sector / 2;
    let r0 = 0;
    row.forEach((frac, b) => {
      if (frac <= 0) return;
      const r1 = r0 + (frac / maxFrac) * R;
      const mesh = new rhino.Mesh();
      const v = mesh.vertices();
      const polar = (r: number, a: number) => [
        center[0] + r * Math.sin(a),
        center[1] + r * Math.cos(a),
        center[2]
      ];
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

function addFloodPlane(doc: any, rhino: any, spanX: number, spanY: number, zMeters: number) {
  const attr = makeLayer(doc, rhino, "Flood Plane", [70, 130, 200]);
  const mesh = new rhino.Mesh();
  const v = mesh.vertices();
  v.add(0, 0, zMeters); v.add(spanX, 0, zMeters); v.add(spanX, spanY, zMeters); v.add(0, spanY, zMeters);
  mesh.faces().addQuadFace(0, 1, 2, 3);
  doc.objects().addMesh(mesh, attr);
}

// --- north + labels --------------------------------------------------------

function addNorth(doc: any, rhino: any, center: number[], len: number) {
  const attr = makeLayer(doc, rhino, "North", [40, 40, 40]);
  doc.objects().addPolyline(
    [[center[0], center[1], center[2]], [center[0], center[1] + len, center[2]]],
    attr
  );
  doc.objects().addTextDot("N", [center[0], center[1] + len, center[2]], attr);
}

function addLabels(doc: any, rhino: any, bundle: any, center: number[], R: number) {
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
    doc.objects().addTextDot(
      `Sun noon ${sum.toFixed(0)}° (Jun) / ${win.toFixed(0)}° (Dec)`,
      [center[0], center[1], center[2] + R * 0.6],
      attr
    );
    doc.objects().addTextDot(
      `Prevailing wind: ${prevailing}`,
      [center[0] + R, center[1], center[2] + R * 0.6],
      attr
    );
  }
  if (flood && flood.inFloodZone) {
    doc.objects().addTextDot(
      `FEMA zone ${flood.zone}${flood.baseFloodElevation != null ? ` · BFE ${flood.baseFloodElevation} ft` : ""}`,
      [center[0], center[1] + R * 0.3, center[2] + 2],
      attr
    );
  }
}
