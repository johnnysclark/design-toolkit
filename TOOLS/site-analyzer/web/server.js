// Site Analyzer — local web app server.
//
// Zero build step: `node server.js`, then open http://localhost:3000.
// Serves the static frontend from ./public and exposes:
//   GET  /api/search?q=         → EPA Superfund site candidates
//   POST /api/analyze {epaId}   → full physical-reality dossier + map data
//   GET  /api/export/:fmt?epaId= → Rhino-ready file (obj/dxf/geojson/epw)
//
// ANTHROPIC_API_KEY is needed for the contamination + synthesis passes. The map
// and all hard-data layers (boundary, climate, terrain, flood, exports) work
// without it — they come from public APIs, not the model.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

import {
  MODEL,
  CONTAMINATION_SCHEMA,
  SYNTHESIS_SCHEMA,
  contaminationSystem,
  contaminationUser,
  SYNTHESIS_SYSTEM,
  synthesisUser
} from "./prompts.js";
import {
  searchSites,
  getSite,
  climateYear,
  floodAt,
  elevationGrid
} from "./datasources.js";
import { windRose, monthlyStats, sunPaths } from "./geo.js";
import {
  terrainOBJ,
  contoursDXF,
  boundaryDXF,
  boundaryGeoJSON,
  climateEPW
} from "./exporters.js";
import { buildAnalysisModel } from "./rhino3dm-export.js";

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const GRID_N = Math.min(Math.max(parseInt(process.env.GRID_N, 10) || 14, 6), 48);
const CLIMATE_YEAR = parseInt(process.env.CLIMATE_YEAR, 10) || 2023;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n⚠  ANTHROPIC_API_KEY is not set. Map + data layers + exports still work,\n" +
      "   but the contamination & synthesis briefs will be skipped.\n" +
      "   Start with:  ANTHROPIC_API_KEY=sk-ant-… npm start\n"
  );
}

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// Small in-memory cache so re-downloading exports doesn't re-hit every API.
const cache = new Map(); // epaId → { site, climate, topo }
const remember = (id, patch) => cache.set(id, { ...(cache.get(id) || {}), ...patch });

// --- Model calls -----------------------------------------------------------

async function runStructured({ system, user, schema, grounded }) {
  const params = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: user }]
  };
  if (grounded) {
    params.tools = [{ type: "web_search_20260209", name: "web_search" }];
    params.messages[0].content +=
      "\n\nReturn your answer as a single JSON object matching the agreed schema, inside a ```json code block. No prose outside the block.";
  } else {
    params.output_config = { format: { type: "json_schema", schema } };
  }
  const message = await client.messages.stream(params).finalMessage();
  if (message.stop_reason === "refusal") throw new Error("The model declined this request (safety refusal).");
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return parseJson(text);
}

function parseJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("Could not parse a JSON object from the model response.");
  }
}

// --- Analysis pipeline -----------------------------------------------------

function summarizeClimate(climate) {
  const wr = windRose(climate.windSpeed, climate.windDir);
  // Prevailing direction = sector with the most hours.
  const totals = wr.matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const prevailingIdx = totals.indexOf(Math.max(...totals));
  const mean = (arr) => {
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

async function analyze(epaId) {
  const site = await getSite(epaId);
  if (!site) throw new Error(`No NPL site found for EPA ID ${epaId}.`);
  if (!site.centroid) throw new Error("Site has no coordinates; cannot analyze.");
  remember(epaId, { site });

  // Hard-data layers in parallel. Each degrades to null on failure.
  const [climateRaw, flood, topo] = await Promise.all([
    climateYear(site.centroid.lat, site.centroid.lon, CLIMATE_YEAR).catch((e) => {
      console.error("climate:", e.message);
      return null;
    }),
    floodAt(site.centroid.lon, site.centroid.lat).catch(() => null),
    site.bbox
      ? elevationGrid(site.bbox, GRID_N).catch((e) => {
          console.error("topo:", e.message);
          return null;
        })
      : Promise.resolve(null)
  ]);
  if (climateRaw) remember(epaId, { climate: climateRaw });
  if (topo) remember(epaId, { topo });
  if (flood) remember(epaId, { flood });

  const climate = climateRaw ? summarizeClimate(climateRaw) : null;

  // Model passes (skipped without an API key).
  let contamination = null;
  let synthesis = null;
  if (client) {
    contamination = await runStructured({
      system: contaminationSystem(true),
      user: contaminationUser(site),
      schema: CONTAMINATION_SCHEMA,
      grounded: true
    }).catch((e) => {
      console.error("contamination:", e.message);
      return { error: e.message };
    });

    const bundle = {
      site: { name: site.name, epaId: site.epaId, status: site.status, location: [site.city, site.county, site.state].filter(Boolean).join(", "), areaAcres: site.areaAcres },
      climate: climate && {
        annual: climate.annual,
        prevailingWind: climate.prevailingWind,
        windRoseTopSectors: climate.windRose.dirs.map((d, i) => ({ dir: d, fraction: climate.windRose.matrix[i].reduce((a, b) => a + b, 0) })).sort((a, b) => b.fraction - a.fraction).slice(0, 4),
        tempByMonth: climate.temp.map((m) => m.mean),
        rhByMonth: climate.rh.map((m) => m.mean),
        peakSunAltitude: climate.sunPaths.find((p) => p.key === "summer")?.peakAltitude,
        winterSunAltitude: climate.sunPaths.find((p) => p.key === "winter")?.peakAltitude
      },
      topography: topo ? { gridN: topo.n, ...topo.stats } : { note: "Not sampled (outside US 3DEP or no bbox)." },
      flood,
      contamination: contamination && !contamination.error ? contamination : { note: "Contamination brief unavailable." }
    };

    synthesis = await runStructured({
      system: SYNTHESIS_SYSTEM,
      user: synthesisUser(bundle),
      schema: SYNTHESIS_SCHEMA,
      grounded: false
    }).catch((e) => {
      console.error("synthesis:", e.message);
      return { error: e.message };
    });
  }

  return {
    meta: { epaId, model: client ? MODEL : null, generatedAt: new Date().toISOString(), gridN: GRID_N, climateYear: CLIMATE_YEAR },
    site,
    climate,
    flood,
    topo: topo ? { sampled: true, n: topo.n, bbox: topo.bbox, stats: topo.stats } : { sampled: false },
    contamination,
    synthesis,
    coverage: {
      boundary: !!site.boundary,
      climate: !!climate,
      terrain: !!topo,
      flood: !!flood && flood.mapped !== false,
      contamination: !!(contamination && !contamination.error),
      synthesis: !!(synthesis && !synthesis.error)
    }
  };
}

// --- Exports ---------------------------------------------------------------

async function getCachedSite(epaId) {
  const c = cache.get(epaId);
  if (c?.site) return c.site;
  const site = await getSite(epaId);
  if (site) remember(epaId, { site });
  return site;
}

async function getCachedTopo(epaId, site, n) {
  const c = cache.get(epaId);
  if (c?.topo && c.topo.n >= n) return c.topo;
  const topo = await elevationGrid(site.bbox, n);
  remember(epaId, { topo });
  return topo;
}

async function getCachedClimate(epaId, site) {
  const c = cache.get(epaId);
  if (c?.climate) return c.climate;
  const climate = await climateYear(site.centroid.lat, site.centroid.lon, CLIMATE_YEAR);
  remember(epaId, { climate });
  return climate;
}

async function buildExport(fmt, epaId, query) {
  const site = await getCachedSite(epaId);
  if (!site) throw new Error(`No site for EPA ID ${epaId}.`);
  const slug = (site.name || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  switch (fmt) {
    case "terrain.obj": {
      const n = Math.min(Math.max(parseInt(query.get("n"), 10) || 32, 6), 64);
      if (!site.bbox) throw new Error("No bounding box for terrain.");
      const topo = await getCachedTopo(epaId, site, n);
      return { filename: `${slug}-terrain.obj`, type: "text/plain", body: terrainOBJ(topo) };
    }
    case "contours.dxf": {
      const n = Math.min(Math.max(parseInt(query.get("n"), 10) || 32, 6), 64);
      if (!site.bbox) throw new Error("No bounding box for contours.");
      const topo = await getCachedTopo(epaId, site, n);
      const interval = parseFloat(query.get("interval")) || 0;
      return { filename: `${slug}-contours.dxf`, type: "application/dxf", body: contoursDXF(topo, interval) };
    }
    case "boundary.dxf": {
      if (!site.boundary || !site.bbox) throw new Error("No boundary polygon for this site.");
      return { filename: `${slug}-boundary.dxf`, type: "application/dxf", body: boundaryDXF(site.boundary, site.bbox) };
    }
    case "boundary.geojson": {
      if (!site.boundary) throw new Error("No boundary polygon for this site.");
      return { filename: `${slug}-boundary.geojson`, type: "application/geo+json", body: boundaryGeoJSON(site) };
    }
    case "epw": {
      const climate = await getCachedClimate(epaId, site);
      return { filename: `${slug}-${CLIMATE_YEAR}.epw`, type: "text/plain", body: climateEPW(climate, site) };
    }
    case "analysis.3dm": {
      // The Ladybug-analog model: terrain + sun path + wind rose + flood + labels,
      // baked as native Rhino geometry. Gather every layer we can (cache or fetch).
      const n = Math.min(Math.max(parseInt(query.get("n"), 10) || 24, 6), 64);
      const c = cache.get(epaId) || {};
      const [topo, climate] = await Promise.all([
        site.bbox ? getCachedTopo(epaId, site, n).catch(() => null) : Promise.resolve(null),
        getCachedClimate(epaId, site).catch(() => null)
      ]);
      const flood = c.flood || (await floodAt(site.centroid.lon, site.centroid.lat).catch(() => null));
      const body = await buildAnalysisModel({ site, topo, climate, flood });
      return { filename: `${slug}-site-analysis.3dm`, type: "application/octet-stream", body };
    }
    default:
      throw new Error(`Unknown export format: ${fmt}`);
  }
}

// --- HTTP server -----------------------------------------------------------

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = normalize(join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) return void res.writeHead(403).end("Forbidden");
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1_000_000) reject(new Error("Request too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const json = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (req.method === "GET" && url.pathname === "/api/search") {
      const q = (url.searchParams.get("q") || "").trim();
      if (q.length < 2) return json(res, 400, { error: "Enter at least 2 characters." });
      return json(res, 200, { results: await searchSites(q) });
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const { epaId } = JSON.parse((await readBody(req)) || "{}");
      if (!epaId) return json(res, 400, { error: "An EPA ID is required." });
      return json(res, 200, await analyze(epaId.trim()));
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/export/")) {
      const fmt = url.pathname.slice("/api/export/".length);
      const epaId = (url.searchParams.get("epaId") || "").trim();
      if (!epaId) return json(res, 400, { error: "epaId is required." });
      const out = await buildExport(fmt, epaId, url.searchParams);
      res.writeHead(200, {
        "Content-Type": out.type,
        "Content-Disposition": `attachment; filename="${out.filename}"`
      });
      return void res.end(out.body);
    }

    if (req.method === "GET") return void (await serveStatic(req, res));
    res.writeHead(405).end("Method not allowed");
  } catch (err) {
    console.error(err);
    json(res, 500, { error: err.message || "Internal error" });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Site Analyzer running →  http://localhost:${PORT}\n`);
});
