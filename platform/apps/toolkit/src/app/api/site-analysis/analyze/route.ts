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

// Public, hard-data-only (D0). Pulls climate (Open-Meteo, global) + terrain (USGS,
// US) + flood (FEMA, US) for a point — no model, no key, no auth. Two ways in:
//   { epaId }            → Superfund mode: resolve the EPA site + its boundary first
//   { lat, lon, label }  → Place mode: analyse any geocoded point
// The two cost passes (contamination, synthesis) live in their own auth-gated
// routes so neither this request nor those approach Vercel Hobby's 60s cap.
export const runtime = "nodejs";
export const maxDuration = 60;

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

// Condense the hourly year into the display + export summary (ported from the
// original server.js summarizeClimate).
function summarizeClimate(climate: ClimateRaw) {
  const wr = windRose(climate.windSpeed, climate.windDir);
  const totals = wr.matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const prevailingIdx = totals.indexOf(Math.max(...totals));
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
    prevailingWind: { dir: wr.dirs[prevailingIdx], fraction: totals[prevailingIdx] },
    temp: monthlyStats(climate.time, climate.tempC),
    rh: monthlyStats(climate.time, climate.rh),
    annual: {
      tempMean: mean(climate.tempC),
      tempMin: temps.length ? Math.min(...temps) : null,
      tempMax: temps.length ? Math.max(...temps) : null,
      rhMean: mean(climate.rh),
      windMean: mean(climate.windSpeed)
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

    // Hard-data layers in parallel. Each degrades to null on failure (USGS + FEMA
    // are US-only — outside the US they simply come back empty, never faked).
    const [climateRaw, flood, topo] = await Promise.all([
      climateYear(site.centroid.lat, site.centroid.lon, CLIMATE_YEAR).catch((e) => {
        console.error("climate:", e.message);
        return null;
      }),
      floodAt(site.centroid.lon, site.centroid.lat).catch(() => null),
      site.bbox
        ? elevationGrid(terrainBox(site.bbox, site.centroid), gridN).catch((e) => {
            console.error("topo:", e.message);
            return null;
          })
        : Promise.resolve(null)
    ]);

    const climate = climateRaw ? summarizeClimate(climateRaw) : null;

    const coverage = {
      boundary: !!site.boundary,
      climate: !!climate,
      terrain: !!topo,
      flood: !!flood && flood.mapped !== false
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
      // the EPW and the .3dm wind rose with no extra server round-trip.
      climate: climate ? { summary: climate, raw: climateRaw } : null,
      flood,
      topo,
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
