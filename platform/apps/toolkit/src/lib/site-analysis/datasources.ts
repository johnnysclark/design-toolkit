// datasources.ts — fetch wrappers for the public data behind a site (server-side).
//
// Ported from TOOLS/site-analyzer/web/datasources.js. Every endpoint is keyless
// and was probed live. Each fetcher degrades gracefully: if a source is down or
// has no data, it returns null/empty and the analysis continues with what it has.
// The point of the tool is to be honest about coverage, not to fake it.
//
// Sources:
//   EPA NPL sites (search + metadata)  — ArcGIS FeatureServer
//   EPA Superfund site boundaries      — ArcGIS FeatureServer (polygons)
//   USGS 3DEP elevation                — EPQS point service
//   FEMA NFHL flood hazard zones       — ArcGIS MapServer
//   Open-Meteo ERA5 archive            — hourly climate (drives charts + EPW)

const EPA_ORG = "https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services";
const NPL_LAYER = `${EPA_ORG}/Superfund_National_Priorities_List_(NPL)_Sites_with_Status_Information/FeatureServer/0`;
const BOUNDARY_LAYER = `${EPA_ORG}/FAC_Superfund_Site_Boundaries_EPA_Public/FeatureServer/0`;
const EPQS = "https://epqs.nationalmap.gov/v1/json";
// 3DEP ImageServer getSamples returns a whole grid of elevations in ONE request —
// far faster + more reliable than EPQS one-point-per-call (which blew Vercel's 60s
// cap on big sites). EPQS stays as the single-point fallback below.
const DEP_GETSAMPLES =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples";
const FEMA_FLOOD = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";
const OPEN_METEO = "https://archive-api.open-meteo.com/v1/archive";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

// Nominatim's usage policy asks every caller to identify itself. Server-side only.
const GEOCODER_UA =
  "AllMeansWorks-DesignToolkit/1.0 (https://toolkit.allmeans.works; contact jsclark2@gmail.com)";

export interface SiteCandidate {
  name: string;
  epaId: string;
  semsId?: string;
  status?: string;
  state?: string;
  city?: string;
  county?: string;
  region?: string | number;
  score?: number;
  centroid: { lat: number; lon: number } | null;
}
export interface Boundary {
  areaAcres: number | null;
  bbox: [number, number, number, number];
  geojson: { type: "MultiPolygon"; coordinates: number[][][][] };
}
export interface Site extends SiteCandidate {
  bbox?: [number, number, number, number];
  areaAcres: number | null;
  boundary: Boundary["geojson"] | null;
  documents: Record<string, { text: string; url: string | null } | null>;
  dates: Record<string, unknown>;
}
export interface Topo {
  n: number;
  bbox: [number, number, number, number];
  grid: number[][];
  stats: {
    min: number | null;
    max: number | null;
    mean: number | null;
    missing: number;
    total: number;
  };
}
export interface Flood {
  mapped: boolean;
  inFloodZone?: boolean;
  zone?: string;
  subtype?: string | null;
  baseFloodElevation?: number | null;
  note?: string;
}
// A geocoded place (Place mode) — any address/landmark, not a Superfund site.
export interface GeoPlace {
  label: string; // full display name, e.g. "Champaign, IL, United States"
  shortLabel: string; // the salient name, e.g. "Champaign"
  lat: number;
  lon: number;
  bbox: [number, number, number, number]; // [w, s, e, n]
  category: string | null; // OSM class/type, e.g. "place/city", "building/yes"
  importance: number | null;
}

async function fetchJson(url: string, { timeout = 30000 } = {}): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function arcgis(layerUrl: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ f: "json", ...params });
  return fetchJson(`${layerUrl}/query?${qs}`);
}

// Strip the EPA HTML-anchor wrappers their fields ship with → {text, url}.
function unlink(html: unknown): { text: string; url: string | null } | null {
  if (!html || typeof html !== "string") return null;
  const m = html.match(/href="([^"]+)"[^>]*>([^<]*)</i);
  if (m) return { text: m[2].trim(), url: m[1] };
  return { text: html.replace(/<[^>]+>/g, "").trim(), url: null };
}

// --- EPA Superfund ---------------------------------------------------------

// Search NPL sites by name. Returns up to `limit` candidates with centroid + IDs.
export async function searchSites(q: string, limit = 12): Promise<SiteCandidate[]> {
  const safe = q.replace(/'/g, "''");
  const data = await arcgis(NPL_LAYER, {
    where: `UPPER(Site_Name) LIKE UPPER('%${safe}%')`,
    outFields:
      "Site_Name,Site_EPA_ID,SEMS_ID,Status,State,City,County,Region_ID,Longitude,Latitude,Site_Score",
    returnGeometry: "false",
    orderByFields: "Site_Name",
    resultRecordCount: String(limit)
  });
  return (data.features || []).map((f: any) => normalizeNpl(f.attributes));
}

function normalizeNpl(a: any): SiteCandidate {
  return {
    name: a.Site_Name,
    epaId: a.Site_EPA_ID,
    semsId: a.SEMS_ID,
    status: a.Status,
    state: a.State,
    city: a.City,
    county: a.County,
    region: a.Region_ID,
    score: a.Site_Score,
    centroid:
      a.Longitude != null && a.Latitude != null ? { lat: a.Latitude, lon: a.Longitude } : null
  };
}

// Full record for one site by EPA ID → the study-area backbone.
export async function getSite(epaId: string): Promise<Site | null> {
  const safe = epaId.replace(/'/g, "''");
  const data = await arcgis(NPL_LAYER, {
    where: `Site_EPA_ID='${safe}'`,
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326"
  });
  const f = (data.features || [])[0];
  if (!f) return null;
  const a = f.attributes;
  const base = normalizeNpl(a);

  const boundary = await getBoundary(epaId, base.name).catch(() => null);
  const centroid = base.centroid || (f.geometry ? { lat: f.geometry.y, lon: f.geometry.x } : null);

  // bbox from boundary if present, else a default ~1.2km box around the point.
  let bbox: [number, number, number, number] | undefined;
  if (boundary?.bbox) bbox = boundary.bbox;
  else if (centroid) {
    const d = 0.008; // ~0.9 km
    bbox = [centroid.lon - d, centroid.lat - d, centroid.lon + d, centroid.lat + d];
  }

  return {
    ...base,
    centroid,
    bbox,
    areaAcres: boundary?.areaAcres ?? null,
    boundary: boundary?.geojson ?? null,
    documents: {
      listingNarrative: unlink(a.Site_Listing_Narrative),
      progressProfile: unlink(a.Site_Progress_Profile),
      proposedNotice: unlink(a.Proposed_FR_Notice),
      finalNotice: unlink(a.Final_FR_Notice)
    },
    dates: {
      proposed: a.Proposed_Date,
      listed: a.Listing_Date,
      constructionComplete: a.Construction_Completion_Date,
      deleted: a.Deletion_Date
    }
  };
}

// Boundary polygon for a site. Matches on EPA_ID first, name as a fallback.
export async function getBoundary(epaId: string, name?: string): Promise<Boundary | null> {
  const safeId = (epaId || "").replace(/'/g, "''");
  const where = `EPA_ID LIKE '%${safeId}%'`;
  let data = await arcgis(BOUNDARY_LAYER, {
    where,
    outFields: "EPA_ID,SITE_NAME,SITE_FEATURE_TYPE,GIS_AREA,GIS_AREA_UNITS",
    returnGeometry: "true",
    outSR: "4326"
  });
  if ((!data.features || !data.features.length) && name) {
    const safeName = name.replace(/'/g, "''");
    data = await arcgis(BOUNDARY_LAYER, {
      where: `UPPER(SITE_NAME) LIKE UPPER('%${safeName}%')`,
      outFields: "EPA_ID,SITE_NAME,SITE_FEATURE_TYPE,GIS_AREA,GIS_AREA_UNITS",
      returnGeometry: "true",
      outSR: "4326"
    });
  }
  const feats = data.features || [];
  if (!feats.length) return null;

  // Merge all matching rings into one MultiPolygon and compute a bbox.
  const polygons: number[][][][] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let area = 0;
  for (const f of feats) {
    area += f.attributes.GIS_AREA || 0;
    for (const ring of f.geometry?.rings || []) {
      polygons.push([ring]);
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!polygons.length) return null;
  return {
    areaAcres: area || null,
    bbox: [minX, minY, maxX, maxY],
    geojson: { type: "MultiPolygon", coordinates: polygons }
  };
}

// --- Geocoding (Place mode) ------------------------------------------------

// Free-text → places, via OpenStreetMap Nominatim (keyless, global). This is the
// general-purpose entry point: any address, city, or landmark. (Superfund mode
// uses searchSites() instead.) Server-side only — Nominatim's policy needs a
// real User-Agent, which we can only set off the browser.
export async function geocodeSearch(q: string, limit = 8): Promise<GeoPlace[]> {
  const qs = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(limit)
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let data: any[];
  try {
    const res = await fetch(`${NOMINATIM}?${qs}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": GEOCODER_UA }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from the geocoder`);
    data = await res.json();
  } finally {
    clearTimeout(timer);
  }
  return (data || []).map((r) => {
    // Nominatim boundingbox is [south, north, west, east] as strings.
    const [s, n, w, e] = (r.boundingbox || []).map(Number);
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    const bbox: [number, number, number, number] =
      [w, s, e, n].every((v) => Number.isFinite(v))
        ? [w, s, e, n]
        : defaultBbox(lat, lon);
    return {
      label: r.display_name as string,
      shortLabel: (r.name || String(r.display_name).split(",")[0]).trim(),
      lat,
      lon,
      bbox,
      category: r.class && r.type ? `${r.class}/${r.type}` : r.type || null,
      importance: r.importance != null ? Number(r.importance) : null
    };
  });
}

// Point → place, via Nominatim /reverse. Powers the map's "drop a pin" input:
// a clicked lat/lon becomes a named GeoPlace (same shape as geocodeSearch), so the
// pin path and the typed-search path feed the analyzer identically. Server-side
// only (Nominatim's policy needs a real User-Agent). Degrades to a coordinate
// label if the reverse lookup is down — a pin should always be analyzable.
export async function reverseGeocode(lat: number, lon: number): Promise<GeoPlace> {
  const coordLabel = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  const fallback: GeoPlace = {
    label: coordLabel,
    shortLabel: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    lat,
    lon,
    bbox: defaultBbox(lat, lon),
    category: null,
    importance: null
  };
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return fallback;
  const qs = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18"
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${NOMINATIM_REVERSE}?${qs}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": GEOCODER_UA }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from the geocoder`);
    const r = await res.json();
    if (!r || r.error) return fallback;
    const name = String(r.name || String(r.display_name || "").split(",")[0] || "").trim();
    // jsonv2 reverse names the field `category`; search uses `class`. Accept either.
    const klass = r.category || r.class;
    return {
      label: r.display_name || coordLabel,
      shortLabel: name || fallback.shortLabel,
      lat,
      lon,
      bbox: defaultBbox(lat, lon),
      category: klass && r.type ? `${klass}/${r.type}` : r.type || null,
      importance: null
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

// A ~0.9 km box around a point — the default study area for terrain sampling and
// the micro map when a source gives us no real footprint.
export function defaultBbox(lat: number, lon: number, halfDeg = 0.008):
  [number, number, number, number] {
  return [lon - halfDeg, lat - halfDeg, lon + halfDeg, lat + halfDeg];
}

// --- USGS elevation --------------------------------------------------------

// One elevation sample (metres). Returns null off the US 3DEP coverage.
export async function elevationAt(lon: number, lat: number): Promise<number | null> {
  try {
    const data = await fetchJson(`${EPQS}?x=${lon}&y=${lat}&units=Meters&wkid=4326`, {
      timeout: 15000
    });
    const v = Number(data?.value);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// Sample an n×n elevation grid over a bbox in a SINGLE 3DEP getSamples request.
// Rows go south→north, cols west→east. One round-trip (~2-8s) instead of n²
// point calls — this is what keeps `analyze` under Vercel's 60s function cap.
export async function elevationGrid(
  bbox: [number, number, number, number],
  n = 12
): Promise<Topo> {
  const [w, s, e, nth] = bbox;
  // Points in row-major order; locationId in the response == this index.
  const points: [number, number][] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const lon = w + ((e - w) * c) / (n - 1);
      const lat = s + ((nth - s) * r) / (n - 1);
      points.push([lon, lat]);
    }
  }

  const grid: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  const body = new URLSearchParams({
    geometry: JSON.stringify({ points, spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryMultipoint",
    returnFirstValueOnly: "true",
    f: "json"
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  let data: any;
  try {
    const res = await fetch(DEP_GETSAMPLES, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from 3DEP getSamples`);
    data = await res.json();
  } finally {
    clearTimeout(timer);
  }

  for (const sm of data?.samples || []) {
    const id = Number(sm.locationId);
    const v = Number(sm.value);
    // 3DEP NoData comes back as a huge negative; keep only sane elevations.
    if (Number.isInteger(id) && id >= 0 && id < n * n && Number.isFinite(v) && v > -500 && v < 9000) {
      grid[Math.floor(id / n)][id % n] = v;
    }
  }

  const flat = grid.flat().filter((v): v is number => v != null);
  // Nothing came back in coverage → let the caller record terrain as absent (✕),
  // rather than inventing a flat plane.
  if (!flat.length) throw new Error("No 3DEP elevation coverage for this area.");

  // Fill any gaps (out-of-coverage cells) with the grid mean so the mesh stays closed.
  const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
  let missing = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] == null) {
        grid[r][c] = mean;
        missing++;
      }

  return {
    n,
    bbox,
    grid: grid as number[][],
    stats: { min: Math.min(...flat), max: Math.max(...flat), mean, missing, total: n * n }
  };
}

// --- FEMA flood ------------------------------------------------------------

export async function floodAt(lon: number, lat: number): Promise<Flood> {
  try {
    const qs = new URLSearchParams({
      geometry: `${lon},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE",
      returnGeometry: "false",
      f: "json"
    });
    const data = await fetchJson(`${FEMA_FLOOD}?${qs}`, { timeout: 20000 });
    const a = (data.features || [])[0]?.attributes;
    if (!a)
      return {
        mapped: true,
        inFloodZone: false,
        zone: "X (or unmapped here)",
        note: "No special flood hazard area at this point."
      };
    return {
      mapped: true,
      inFloodZone: a.SFHA_TF === "T",
      zone: a.FLD_ZONE,
      subtype: a.ZONE_SUBTY || null,
      baseFloodElevation: a.STATIC_BFE && a.STATIC_BFE > -9999 ? a.STATIC_BFE : null
    };
  } catch {
    return { mapped: false, note: "FEMA NFHL did not return data for this location." };
  }
}

// --- Open-Meteo climate ----------------------------------------------------

export interface ClimateRaw {
  year: number;
  lat: number;
  lon: number;
  elevation: number;
  tzOffsetHours: number;
  timezone: string;
  units: Record<string, string>;
  time: string[];
  tempC: number[];
  rh: number[];
  dewC: number[];
  windSpeed: number[];
  windDir: number[];
  pressure: number[];
  ghi: number[];
  dni: number[];
  dhi: number[];
  cloud: number[];
}

// A full year of hourly climate for the site. Drives wind rose, humidity/temp
// profiles, and the generated EPW. ERA5 reanalysis: global, keyless, ~25km cells.
export async function climateYear(lat: number, lon: number, year = 2023): Promise<ClimateRaw> {
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    hourly:
      "temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,surface_pressure,shortwave_radiation,direct_normal_irradiance,diffuse_radiation,cloud_cover",
    wind_speed_unit: "ms",
    timezone: "auto"
  });
  const data = await fetchJson(`${OPEN_METEO}?${qs}`, { timeout: 40000 });
  const h = data.hourly || {};
  return {
    year,
    lat: data.latitude,
    lon: data.longitude,
    elevation: data.elevation,
    tzOffsetHours: (data.utc_offset_seconds || 0) / 3600,
    timezone: data.timezone,
    units: data.hourly_units || {},
    time: h.time || [],
    tempC: h.temperature_2m || [],
    rh: h.relative_humidity_2m || [],
    dewC: h.dew_point_2m || [],
    windSpeed: h.wind_speed_10m || [],
    windDir: h.wind_direction_10m || [],
    pressure: h.surface_pressure || [],
    ghi: h.shortwave_radiation || [],
    dni: h.direct_normal_irradiance || [],
    dhi: h.diffuse_radiation || [],
    cloud: h.cloud_cover || []
  };
}

