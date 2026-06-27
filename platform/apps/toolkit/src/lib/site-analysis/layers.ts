// layers.ts — additional keyless, US site-data fetchers (server-side), layered on
// top of the core climate / terrain / flood / boundary in datasources.ts.
//
// Each endpoint is keyless, was probed live (2026-06-27), and degrades to null on
// any failure so the analysis keeps going with whatever it has — honest coverage,
// never faked. All are US-only (the studio's focus); outside US coverage they
// simply return null, like USGS 3DEP and FEMA.
//
// Sources:
//   Soils      — USDA SSURGO via Soil Data Access (SDA), T-SQL POST
//   Land cover — MRLC/USGS NLCD land cover + % impervious + % tree canopy (WMS GFI)
//   Watershed  — USGS Watershed Boundary Dataset (WBD) HUC12 + HUC8
//   Seismic    — USGS ASCE 7-16 building-code seismic design parameters
//   Context    — OpenStreetMap nearby geometry via the Overpass API (lazy)

// --- shared fetch helpers --------------------------------------------------

// Several public APIs (notably Overpass) reject requests with no/blank User-Agent
// — node/undici's default — with 406. Identify ourselves on every call.
const UA = "AllMeansWorks-Surveyor/1.0 (https://toolkit.allmeans.works; contact jsclark2@gmail.com)";

async function getJson(url: string, timeout = 16000): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json", "User-Agent": UA } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function postForm(
  url: string,
  body: string,
  contentType: string,
  timeout = 25000
): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "POST",
      // A non-blank User-Agent is REQUIRED by Overpass (406 otherwise). Accept */*
      // because both Overpass and SSURGO/SDA pick their format from the request body
      // ([out:json] / format:"JSON"), not the Accept header.
      headers: { "Content-Type": contentType, Accept: "*/*", "User-Agent": UA },
      body,
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const numOrNull = (v: unknown): number | null =>
  v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

// --- Soils (USDA SSURGO via Soil Data Access) ------------------------------

export interface Soils {
  mapUnit: string | null; // e.g. "Drummer silty clay loam, 0 to 2 percent slopes"
  drainageClass: string | null; // e.g. "Poorly drained"
  hydrologicGroup: string | null; // A / B / C / D (runoff potential; A=low, D=high)
  waterTableCm: number | null; // shallowest annual water table depth (cm)
  bedrockCm: number | null; // depth to bedrock (cm); null = deeper than survey
  availableWaterStorage: number | null; // 0-100 cm (cm of water) — drought/irrigation
  floodFrequency: string | null; // None / Rare / Occasional / Frequent
  hydricPct: number | null; // % of the map unit that is hydric (wetland) soil
  slopePct: number | null; // representative slope gradient (%)
  dwellingLimitation: string | null; // SSURGO rating for dwellings w/o basements
  commercialLimitation: string | null; // SSURGO rating for small commercial buildings
}

const SDA_REST = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest";

// The dominant-condition aggregated soil attributes (muaggatt) for the map unit
// under the point — one keyless join, the engineering-relevant fields a designer
// needs for foundations + stormwater.
export async function soilsAt(lon: number, lat: number): Promise<Soils | null> {
  const sql =
    "SELECT TOP 1 m.muname, ma.drclassdcd, ma.hydgrpdcd, ma.wtdepannmin, ma.brockdepmin, " +
    "ma.aws0100wta, ma.flodfreqdcd, ma.hydclprs, ma.slopegradwta, ma.engdwobdcd, ma.engstafdcd " +
    "FROM mapunit m INNER JOIN muaggatt ma ON m.mukey = ma.mukey " +
    `WHERE m.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point(${lon} ${lat})'))`;
  const data = await postForm(SDA_REST, JSON.stringify({ format: "JSON", query: sql }), "application/json");
  const r = data?.Table?.[0];
  if (!r) return null;
  const mapUnit = r[0] ?? null;
  const drainageClass = r[1] ?? null;
  const hydrologicGroup = r[2] ?? null;
  const availableWaterStorage = numOrNull(r[5]);
  // NOTCOM / unsurveyed areas report a placeholder map unit with no real attributes.
  // Treat that as NO coverage (honest ✕), not a faked soils record — coverage must
  // never claim data it doesn't have.
  if (!mapUnit || /no digital data/i.test(mapUnit)) return null;
  if (!drainageClass && !hydrologicGroup && availableWaterStorage == null && r[3] == null) return null;
  return {
    mapUnit,
    drainageClass,
    hydrologicGroup,
    waterTableCm: numOrNull(r[3]),
    bedrockCm: numOrNull(r[4]),
    availableWaterStorage,
    floodFrequency: r[6] ?? null,
    hydricPct: numOrNull(r[7]),
    slopePct: numOrNull(r[8]),
    dwellingLimitation: r[9] ?? null,
    commercialLimitation: r[10] ?? null
  };
}

// --- Land cover (MRLC / USGS NLCD) -----------------------------------------

export interface LandCover {
  classCode: number | null;
  className: string | null;
  imperviousPct: number | null; // % developed impervious surface
  treeCanopyPct: number | null; // % tree-canopy cover
}

const NLCD_CLASSES: Record<number, string> = {
  11: "Open water",
  12: "Perennial ice/snow",
  21: "Developed, open space",
  22: "Developed, low intensity",
  23: "Developed, medium intensity",
  24: "Developed, high intensity",
  31: "Barren land",
  41: "Deciduous forest",
  42: "Evergreen forest",
  43: "Mixed forest",
  51: "Dwarf scrub",
  52: "Shrub/scrub",
  71: "Grassland/herbaceous",
  72: "Sedge/herbaceous",
  73: "Lichens",
  74: "Moss",
  81: "Pasture/hay",
  82: "Cultivated crops",
  90: "Woody wetlands",
  95: "Emergent herbaceous wetlands"
};

const MRLC_WMS = "https://www.mrlc.gov/geoserver/mrlc_display";

// One WMS GetFeatureInfo for a layer at a point — PALETTE_INDEX is the raster
// value (NLCD class code for land cover; the percentage for impervious/canopy).
async function nlcdValueAt(layer: string, lon: number, lat: number): Promise<number | null> {
  const d = 0.008;
  const qs = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetFeatureInfo",
    layers: layer,
    query_layers: layer,
    crs: "EPSG:4326", // WMS 1.3.0 EPSG:4326 axis order is lat,lon
    bbox: `${lat - d},${lon - d},${lat + d},${lon + d}`,
    width: "101",
    height: "101",
    i: "50",
    j: "50",
    info_format: "application/json"
  });
  const data = await getJson(`${MRLC_WMS}/${layer}/ows?${qs}`, 14000);
  const v = data?.features?.[0]?.properties?.PALETTE_INDEX;
  return v == null ? null : Number(v);
}

export async function landCoverAt(lon: number, lat: number): Promise<LandCover | null> {
  const [lc, imp, tcc] = await Promise.all([
    nlcdValueAt("NLCD_2021_Land_Cover_L48", lon, lat),
    nlcdValueAt("NLCD_2021_Impervious_L48", lon, lat),
    nlcdValueAt("nlcd_tcc_conus_2021_v2021-4", lon, lat)
  ]);
  if (lc == null && imp == null && tcc == null) return null;
  return {
    classCode: lc,
    className: lc != null ? NLCD_CLASSES[lc] ?? `NLCD class ${lc}` : null,
    imperviousPct: imp,
    treeCanopyPct: tcc
  };
}

// --- Watershed (USGS Watershed Boundary Dataset) ---------------------------

export interface Watershed {
  huc12: string | null;
  huc12Name: string | null;
  huc8: string | null;
  huc8Name: string | null;
  areaSqKm: number | null;
}

const WBD = "https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer";

async function wbdAt(layerId: number, fields: string, lon: number, lat: number): Promise<any | null> {
  const qs = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: fields,
    returnGeometry: "false",
    f: "json"
  });
  const data = await getJson(`${WBD}/${layerId}/query?${qs}`, 14000);
  return data?.features?.[0]?.attributes ?? null;
}

export async function watershedAt(lon: number, lat: number): Promise<Watershed | null> {
  const [sub, basin] = await Promise.all([
    wbdAt(6, "name,huc12,areasqkm", lon, lat), // 12-digit HU (subwatershed)
    wbdAt(4, "name,huc8", lon, lat) // 8-digit HU (subbasin)
  ]);
  if (!sub && !basin) return null;
  return {
    huc12: sub?.huc12 ?? null,
    huc12Name: sub?.name ?? null,
    huc8: basin?.huc8 ?? null,
    huc8Name: basin?.name ?? null,
    areaSqKm: numOrNull(sub?.areasqkm)
  };
}

// --- Seismic (USGS ASCE 7-16) ----------------------------------------------

export interface Seismic {
  ss: number | null; // mapped MCE_R spectral accel, short period (g)
  s1: number | null; // mapped MCE_R spectral accel, 1-second (g)
  sds: number | null; // design spectral accel, short period (g)
  sd1: number | null; // design spectral accel, 1-second (g)
  sdc: string | null; // Seismic Design Category (A-F)
  siteClass: string; // assumed site class (default D — stiff soil)
  referenceDocument: string; // "ASCE 7-16"
}

const ASCE7 = "https://earthquake.usgs.gov/ws/building-codes/asce7-16/calculate";

// Default Site Class D (the IBC default when no geotechnical data is available)
// and Risk Category II (standard occupancy). Returns the design values a studio
// uses to set a Seismic Design Category early.
export async function seismicAt(lat: number, lon: number): Promise<Seismic | null> {
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    riskCategory: "II",
    siteClass: "D",
    title: "Site"
  });
  const data = await getJson(`${ASCE7}?${qs}`, 18000);
  const d = data?.response?.data;
  if (!d) return null;
  return {
    ss: numOrNull(d.ss),
    s1: numOrNull(d.s1),
    sds: numOrNull(d.sds),
    sd1: numOrNull(d.sd1),
    sdc: d.sdc ?? null,
    siteClass: "D",
    referenceDocument: "ASCE 7-16"
  };
}

// --- Context geometry (OpenStreetMap via Overpass) -------------------------

// Real nearby footprints/lines for BOTH map display and Rhino export. Heavier
// (full geometry, a few seconds) → fetched lazily by its own endpoint, not in the
// core analyze pass. Keyless; global, but we use it for any analyzed point.

export type ContextKind = "building" | "road" | "water" | "green";

export interface SiteContext {
  radiusM: number;
  center: { lat: number; lon: number };
  counts: Record<ContextKind, number>;
  geojson: {
    type: "FeatureCollection";
    features: {
      type: "Feature";
      properties: { kind: ContextKind; name?: string; tags?: Record<string, string> };
      geometry:
        | { type: "Polygon"; coordinates: number[][][] }
        | { type: "LineString"; coordinates: number[][] };
    }[];
  };
}

const OVERPASS = "https://overpass-api.de/api/interpreter";

function classifyOsm(tags: Record<string, string> = {}): ContextKind | null {
  if (tags.building) return "building";
  if (tags.highway) return "road";
  if (tags.natural === "water" || tags.waterway || tags.water) return "water";
  if (tags.leisure || tags.landuse) return "green";
  return null;
}

// Convert one Overpass `out geom;` way into a GeoJSON feature. Closed ways for
// area kinds (building/water/green) become Polygons; everything else LineStrings.
function wayToFeature(el: any): SiteContext["geojson"]["features"][number] | null {
  const kind = classifyOsm(el.tags);
  if (!kind || !Array.isArray(el.geometry) || el.geometry.length < 2) return null;
  const coords: number[][] = el.geometry.map((p: any) => [p.lon, p.lat]);
  const first = coords[0];
  const last = coords[coords.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1];
  const areaKind = kind === "building" || kind === "water" || kind === "green";
  const name = el.tags?.name;
  if (areaKind && closed && coords.length >= 4) {
    return {
      type: "Feature",
      properties: { kind, ...(name ? { name } : {}), tags: el.tags },
      geometry: { type: "Polygon", coordinates: [coords] }
    };
  }
  return {
    type: "Feature",
    properties: { kind, ...(name ? { name } : {}), tags: el.tags },
    geometry: { type: "LineString", coordinates: coords }
  };
}

export async function contextAt(
  lon: number,
  lat: number,
  radiusM = 350
): Promise<SiteContext | null> {
  const r = Math.max(80, Math.min(1200, Math.round(radiusM)));
  const q =
    `[out:json][timeout:25];(` +
    `way["building"](around:${r},${lat},${lon});` +
    `way["highway"](around:${r},${lat},${lon});` +
    `way["natural"="water"](around:${r},${lat},${lon});` +
    `way["waterway"](around:${r},${lat},${lon});` +
    `way["leisure"~"park|garden|pitch|playground|recreation_ground"](around:${r},${lat},${lon});` +
    `way["landuse"~"forest|grass|meadow|recreation_ground|cemetery|village_green"](around:${r},${lat},${lon});` +
    `);out geom;`;
  const data = await postForm(
    OVERPASS,
    new URLSearchParams({ data: q }).toString(),
    "application/x-www-form-urlencoded",
    28000
  );
  if (!data?.elements) return null;
  const features: SiteContext["geojson"]["features"] = [];
  const counts: Record<ContextKind, number> = { building: 0, road: 0, water: 0, green: 0 };
  for (const el of data.elements) {
    if (el.type !== "way") continue;
    const f = wayToFeature(el);
    if (!f) continue;
    counts[f.properties.kind]++;
    features.push(f);
  }
  if (!features.length) return null;
  return {
    radiusM: r,
    center: { lat, lon },
    counts,
    geojson: { type: "FeatureCollection", features }
  };
}
