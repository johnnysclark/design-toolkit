import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSite,
  climateYear,
  floodAt,
  elevationGrid,
  defaultBbox,
  type ClimateRaw
} from "@/lib/site-analysis/datasources";
import { windRose, monthlyStats, sunPaths } from "@/lib/site-analysis/geo";
import { deriveClimate } from "@/lib/site-analysis/climate";
import { deriveTerrain } from "@/lib/site-analysis/terrain";
import { soilsAt, landCoverAt, watershedAt, seismicAt } from "@/lib/site-analysis/layers";

// Public, hard-data-only (D0). Pulls climate (Open-Meteo, global) + terrain (USGS,
// US) + flood (FEMA, US) for a point — no model, no key, no auth. Two ways in:
//   { epaId }            → Superfund mode: resolve the EPA site + its boundary first
//   { lat, lon, label }  → Place mode: analyse any geocoded point
// The two cost passes (contamination, synthesis) live in their own auth-gated
// routes, so this stays a quick, key-free hard-data request. The added soils/
// landcover/watershed/seismic fetchers run in parallel with climate/terrain/flood.
export const runtime = "nodejs";
export const maxDuration = 120;

const CLIMATE_YEAR = 2023;

// Terrain study box. Some sites are huge (Tar Creek Superfund is ~485 sq mi) — a
// grid across the whole span is both slow (it spans many source rasters) and
// meaningless as a "site" read. Cap it to a ~6.6 km box around the centroid so the
// terrain sample is fast and local; normal-sized sites pass through unchanged.
function terrainBox(
  bbox: [number, number, number, number],
  centroid: { lat: number; lon: number },
  maxHalfDeg = 0.03
): [number, number, number, number] {
  const [w, s, e, n] = bbox;
  if (e - w <= 2 * maxHalfDeg && n - s <= 2 * maxHalfDeg) return bbox;
  const { lat, lon } = centroid;
  return [lon - maxHalfDeg, lat - maxHalfDeg, lon + maxHalfDeg, lat + maxHalfDeg];
}

// Architect-relevant climate derivations from the same hourly year: annual solar
// (GHI), heating/cooling degree-days, and mean diurnal swing. All grouped by day.
function climateExtras(climate: ClimateRaw) {
  const days = new Map<string, { temps: number[]; ghi: number }>();
  let ghiSum = 0;
  for (let i = 0; i < climate.time.length; i++) {
    const key = climate.time[i].slice(0, 10);
    let d = days.get(key);
    if (!d) {
      d = { temps: [], ghi: 0 };
      days.set(key, d);
    }
    const t = climate.tempC[i];
    if (t != null && !Number.isNaN(t)) d.temps.push(t);
    const g = climate.ghi[i];
    if (g != null && !Number.isNaN(g) && g > 0) {
      d.ghi += g; // W/m² over one hour = Wh/m²
      ghiSum += g;
    }
  }
  let hdd = 0;
  let cdd = 0;
  let swingSum = 0;
  let swingDays = 0;
  for (const d of days.values()) {
    if (!d.temps.length) continue;
    const m = d.temps.reduce((a, b) => a + b, 0) / d.temps.length;
    hdd += Math.max(0, 18 - m);
    cdd += Math.max(0, m - 18);
    swingSum += Math.max(...d.temps) - Math.min(...d.temps);
    swingDays++;
  }
  const ghiAnnualKwh = ghiSum / 1000; // Wh/m² → kWh/m²·yr
  return {
    ghiAnnualKwh: ghiSum ? ghiAnnualKwh : null,
    peakSunHours: days.size && ghiSum ? ghiAnnualKwh / days.size : null,
    hdd18: Math.round(hdd),
    cdd18: Math.round(cdd),
    diurnalSwingC: swingDays ? swingSum / swingDays : null
  };
}

// Condense the hourly year into the display + export summary (ported from the
// original server.js summarizeClimate).
function summarizeClimate(climate: ClimateRaw) {
  const wr = windRose(climate.windSpeed, climate.windDir);
  const totals = wr.matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const maxTotal = Math.max(...totals);
  const prevailingIdx = totals.indexOf(maxTotal);
  const mean = (arr: number[]) => {
    const v = arr.filter((x) => x != null && !Number.isNaN(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const temps = climate.tempC.filter((x) => x != null);
  return {
    source: "Open-Meteo ERA5 reanalysis (~25 km)",
    year: climate.year,
    tzOffsetHours: climate.tzOffsetHours,
    timezone: climate.timezone,
    elevation: climate.elevation,
    units: climate.units,
    windRose: wr,
    // Don't fabricate a prevailing direction when there's no wind data (all-zero
    // totals would otherwise always read "N").
    prevailingWind:
      maxTotal > 0
        ? { dir: wr.dirs[prevailingIdx], fraction: totals[prevailingIdx] }
        : { dir: null, fraction: 0 },
    temp: monthlyStats(climate.time, climate.tempC),
    rh: monthlyStats(climate.time, climate.rh),
    annual: {
      tempMean: mean(climate.tempC),
      tempMin: temps.length ? Math.min(...temps) : null,
      tempMax: temps.length ? Math.max(...temps) : null,
      rhMean: mean(climate.rh),
      windMean: mean(climate.windSpeed),
      ...climateExtras(climate)
    },
    sunPaths: sunPaths(climate.lat, climate.lon, climate.tzOffsetHours)
  };
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body?.epaId ? "superfund" : "place";
  // Modest grid keeps the USGS point-grid fan-out well under 60s. (A single-raster
  // fetch is the v1 upgrade — see the tool's SPEC.md.)
  const gridN = Math.min(Math.max(parseInt(body?.gridN, 10) || 12, 8), 16);

  // Build a unified `site` object for either mode, so the rest of the pipeline and
  // the whole UI render the same shape.
  let site: any;
  try {
    if (mode === "superfund") {
      const epaId = String(body?.epaId || "").trim();
      const found = await getSite(epaId);
      if (!found) {
        return NextResponse.json({ error: `No NPL site found for EPA ID ${epaId}.` }, { status: 404 });
      }
      if (!found.centroid) {
        return NextResponse.json(
          { error: "This site has no coordinates, so it cannot be analyzed." },
          { status: 422 }
        );
      }
      site = { ...found, mode: "superfund" };
    } else {
      const lat = Number(body?.lat);
      const lon = Number(body?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return NextResponse.json(
          { error: "Provide a place (lat/lon + label) or an EPA ID." },
          { status: 400 }
        );
      }
      const label = String(body?.label || "").trim() || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      site = {
        mode: "place",
        name: label.split(",")[0].trim(),
        address: label,
        epaId: null,
        centroid: { lat, lon },
        // Always sample a consistent ~1.8 km study box around the point so the
        // terrain read is meaningful (a geocoder's address bbox can be a single
        // building; a city's bbox is far too large).
        bbox: defaultBbox(lat, lon),
        boundary: null,
        areaAcres: null,
        status: null,
        city: null,
        county: null,
        state: null,
        region: null,
        category: body?.category ?? null,
        documents: {},
        dates: {}
      };
    }

    // Hard-data layers in parallel. Each degrades to null on failure (these
    // sources are US-only — outside the US they simply come back empty, never
    // faked). The four point-fetchers (soils/landcover/watershed/seismic) are
    // single fast queries, so they ride along here; the heavy Overpass context
    // geometry is its own lazy endpoint.
    const { lat, lon } = site.centroid;
    const [climateRaw, flood, topo, soils, landcover, watershed, seismic] = await Promise.all([
      climateYear(lat, lon, CLIMATE_YEAR).catch((e) => {
        console.error("climate:", e.message);
        return null;
      }),
      floodAt(lon, lat).catch(() => null),
      site.bbox
        ? elevationGrid(terrainBox(site.bbox, site.centroid), gridN).catch((e) => {
            console.error("topo:", e.message);
            return null;
          })
        : Promise.resolve(null),
      soilsAt(lon, lat).catch(() => null),
      landCoverAt(lon, lat).catch(() => null),
      watershedAt(lon, lat).catch(() => null),
      seismicAt(lat, lon).catch(() => null)
    ]);

    const climate = climateRaw ? summarizeClimate(climateRaw) : null;
    const climateDeep = climateRaw ? deriveClimate(climateRaw) : null;
    const terrainDeep = topo ? deriveTerrain(topo) : null;

    const coverage = {
      boundary: !!site.boundary,
      climate: !!climate,
      terrain: !!topo,
      flood: !!flood && flood.mapped !== false,
      soils: !!soils,
      landcover: !!landcover,
      watershed: !!watershed,
      seismic: !!seismic
    };

    const result = {
      meta: {
        mode,
        epaId: site.epaId ?? null,
        label: site.address ?? site.name ?? null,
        generatedAt: new Date().toISOString(),
        gridN,
        climateYear: CLIMATE_YEAR
      },
      site,
      // `summary` drives the UI + exports; `raw` (hourly) lets the browser build
      // the EPW and the .3dm wind rose with no extra server round-trip; `deep`
      // carries the comfort/degree-day/solar-by-orientation derivations.
      climate: climate && climateDeep ? { summary: climate, raw: climateRaw, deep: climateDeep } : null,
      flood,
      topo,
      terrainDeep,
      soils,
      landcover,
      watershed,
      seismic,
      coverage
    };

    // Best-effort trace: only signed-in members get a tool_runs row (RLS needs an
    // owner). We log the lean summary, never the hourly arrays / full grid.
    try {
      const supabase = await createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("tool_runs").insert({
          owner: user.id,
          tool: "site-analysis",
          input: { mode, epaId: site.epaId ?? null, label: site.address ?? site.name, gridN },
          output: {
            meta: result.meta,
            site: { name: site.name, epaId: site.epaId, status: site.status, mode },
            coverage
          }
        });
      }
    } catch {
      // never let trace logging break the response
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("site-analysis/analyze:", err);
    return NextResponse.json({ error: err?.message || "Analysis failed." }, { status: 500 });
  }
}
