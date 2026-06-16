#!/usr/bin/env node
// Site Analyzer — lightweight CLI. No API key, no server, no npm install.
//
// Reuses the verified, dependency-free data modules from ../site-analyzer
// (everything except the Anthropic model passes, which need a key). Pure Node 18+
// built-ins (global fetch). Run it straight from the terminal:
//
//   node analyze.js "Gowanus Canal"            # search + analyze the best match
//   node analyze.js --id NYN000206222          # analyze an exact EPA ID
//   node analyze.js --list "tar creek"         # just list matching sites
//   node analyze.js "Gowanus" --export out     # also write Rhino files to ./out
//   node analyze.js "Gowanus" --grid 20 --year 2022
//
// What you get without a key: the EPA site, climate (sun/wind/humidity), terrain,
// and flood — the same hard data the web app shows. The contamination + design
// reads are model passes and live only in the web version.

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { searchSites, getSite, climateYear, floodAt, elevationGrid } from "../site-analyzer/datasources.js";
import { windRose, monthlyStats, sunPaths } from "../site-analyzer/geo.js";
import { terrainOBJ, contoursDXF, boundaryDXF, boundaryGeoJSON, climateEPW } from "../site-analyzer/exporters.js";
import { buildAnalysisModel } from "../site-analyzer/rhino3dm-export.js";

// --- tiny terminal helpers -------------------------------------------------

const C = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  teal: (s) => `\x1b[36m${s}\x1b[0m`,
  rust: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`
};
const rule = (t = "") => console.log(C.dim("─".repeat(4) + (t ? ` ${t} ` : "") + "─".repeat(Math.max(0, 64 - t.length))));
const SPARK = "▁▂▃▄▅▆▇█";
function sparkline(vals) {
  const v = vals.map((x) => (x == null ? null : x));
  const present = v.filter((x) => x != null);
  if (!present.length) return "(no data)";
  const min = Math.min(...present), max = Math.max(...present);
  return v.map((x) => (x == null ? " " : SPARK[Math.min(7, Math.floor(((x - min) / (max - min || 1)) * 7.999))])).join("");
}

// --- args ------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { query: [], list: false, exportDir: null, grid: 14, year: 2023, id: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") opts.list = true;
    else if (a === "--export") opts.exportDir = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "out";
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--grid") opts.grid = Math.min(Math.max(parseInt(argv[++i], 10) || 14, 6), 48);
    else if (a === "--year") opts.year = parseInt(argv[++i], 10) || 2023;
    else if (a === "--help" || a === "-h") opts.help = true;
    else opts.query.push(a);
  }
  opts.query = opts.query.join(" ").trim();
  return opts;
}

const HELP = `Site Analyzer CLI — no key, no server.

  node analyze.js "<site name>"          search EPA NPL + analyze best match
  node analyze.js --id <EPA_ID>          analyze an exact site
  node analyze.js --list "<name>"        list matches only
  node analyze.js "<name>" --export <dir>  write Rhino files (obj/dxf/geojson/epw)
  node analyze.js "<name>" --grid <6-48> --year <YYYY>

Hard data: EPA · USGS · FEMA · Open-Meteo. Contamination/design reads are in the web version.`;

// --- report ----------------------------------------------------------------

function mean(arr) {
  const v = arr.filter((x) => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function reportClimate(raw) {
  rule("CLIMATE — sun · wind · humidity");
  const wr = windRose(raw.windSpeed, raw.windDir);
  const totals = wr.matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const order = totals.map((t, i) => [wr.dirs[i], t]).sort((a, b) => b[1] - a[1]);
  const paths = sunPaths(raw.lat, raw.lon, raw.tzOffsetHours);
  const peak = (k) => (paths.find((p) => p.key === k)?.peakAltitude ?? 0).toFixed(0);
  const temp = monthlyStats(raw.time, raw.tempC);
  const rh = monthlyStats(raw.time, raw.rh);
  const temps = raw.tempC.filter((x) => x != null);

  console.log(`  Source        ${C.dim("Open-Meteo ERA5 reanalysis (~25 km), year " + raw.year)}`);
  console.log(`  Sun altitude  ${C.b(peak("summer") + "°")} summer  ·  ${peak("equinox")}° equinox  ·  ${C.b(peak("winter") + "°")} winter (solar noon)`);
  console.log(`  Prevailing    ${C.b(order[0][0])}  ${C.dim("(top: " + order.slice(0, 4).map(([d, t]) => `${d} ${(t * 100).toFixed(0)}%`).join(", ") + ")")}`);
  console.log(`  Wind / calm   mean ${mean(raw.windSpeed)?.toFixed(1)} m/s  ·  calm ${(wr.calmFraction * 100).toFixed(0)}% of hours`);
  console.log(`  Temperature   mean ${mean(raw.tempC)?.toFixed(1)}°C  ·  range ${Math.min(...temps).toFixed(0)}–${Math.max(...temps).toFixed(0)}°C`);
  console.log(`  Humidity      mean ${mean(raw.rh)?.toFixed(0)}% RH`);
  console.log(`  ${C.dim("Jan→Dec")}  temp ${C.rust(sparkline(temp.map((m) => m.mean)))}   rh ${C.teal(sparkline(rh.map((m) => m.mean)))}`);
}

function reportTopo(topo) {
  rule("TOPOGRAPHY — USGS 3DEP");
  if (!topo) return console.log("  " + C.dim("Not available (outside US 3DEP coverage or no boundary)."));
  const s = topo.stats;
  console.log(`  Elevation     ${C.b(s.min?.toFixed(1) + " m")} → ${C.b(s.max?.toFixed(1) + " m")}  ·  relief ${(s.max - s.min).toFixed(1)} m`);
  console.log(`  Sampled       ${topo.n}×${topo.n} grid${s.missing ? C.dim(`  (${s.missing}/${s.total} filled with mean)`) : ""}`);
}

function reportFlood(f) {
  rule("WATER & FLOOD — FEMA NFHL");
  if (!f || f.mapped === false) return console.log("  " + C.dim("No FEMA data at the site centroid (may be unmapped)."));
  const tag = f.inFloodZone ? C.red(`zone ${f.zone} — in SFHA`) : C.green(`zone ${f.zone}`);
  console.log(`  Flood         ${tag}${f.baseFloodElevation != null ? `  ·  base flood elev. ${f.baseFloodElevation} ft` : ""}`);
  if (f.subtype) console.log(`  Subtype       ${f.subtype}`);
}

// --- exports ---------------------------------------------------------------

async function doExports(dir, site, topo, climateRaw, flood) {
  await mkdir(dir, { recursive: true });
  const slug = (site.name || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const written = [];
  const put = async (name, body) => { await writeFile(join(dir, name), body); written.push(name); };

  // The Ladybug-analog model — terrain, sun path, wind rose, flood, labels on layers.
  if (site.bbox) await put(`${slug}-site-analysis.3dm`, await buildAnalysisModel({ site, topo, climate: climateRaw, flood }));
  if (topo) {
    await put(`${slug}-terrain.obj`, terrainOBJ(topo));
    await put(`${slug}-contours.dxf`, contoursDXF(topo, 0));
  }
  if (site.boundary && site.bbox) {
    await put(`${slug}-boundary.dxf`, boundaryDXF(site.boundary, site.bbox));
    await put(`${slug}-boundary.geojson`, boundaryGeoJSON(site));
  }
  if (climateRaw) await put(`${slug}-${climateRaw.year}.epw`, climateEPW(climateRaw, site));

  rule("EXPORTS");
  if (!written.length) console.log("  " + C.dim("Nothing to export (no terrain/boundary/climate)."));
  else written.forEach((w) => console.log(`  ${C.green("✓")} ${join(dir, w)}`));
}

// --- main ------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.query && !opts.id)) return console.log(HELP);

  let epaId = opts.id;
  if (!epaId) {
    process.stdout.write(C.dim(`Searching EPA NPL for "${opts.query}"…\n`));
    const results = await searchSites(opts.query);
    if (!results.length) return console.log("No NPL sites matched. Try a shorter or different name.");
    if (opts.list || results.length > 1) {
      rule(`${results.length} MATCH${results.length > 1 ? "ES" : ""}`);
      results.forEach((r, i) =>
        console.log(`  ${C.b(String(i + 1).padStart(2))}. ${r.name}  ${C.dim(`[${r.epaId}] ${[r.city, r.state].filter(Boolean).join(", ")} · ${r.status}`)}`)
      );
      if (opts.list) return;
      epaId = results[0].epaId;
      console.log(C.dim(`\n→ Analyzing the top match. Use --id to pick another, or --list to just browse.\n`));
    } else {
      epaId = results[0].epaId;
    }
  }

  process.stdout.write(C.dim("Pulling boundary, climate, terrain, flood…\n\n"));
  const site = await getSite(epaId);
  if (!site) return console.log(`No NPL site found for EPA ID ${epaId}.`);
  if (!site.centroid) return console.log("Site has no coordinates; cannot analyze.");

  const [climateRaw, flood, topo] = await Promise.all([
    climateYear(site.centroid.lat, site.centroid.lon, opts.year).catch(() => null),
    floodAt(site.centroid.lon, site.centroid.lat).catch(() => null),
    site.bbox ? elevationGrid(site.bbox, opts.grid).catch(() => null) : Promise.resolve(null)
  ]);

  console.log(C.b(site.name) + C.dim(`  [${site.epaId}]`));
  console.log(`${[site.city, site.county, site.state].filter(Boolean).join(", ")} · EPA Region ${site.region ?? "?"} · ${site.status}` +
    (site.areaAcres ? ` · ${site.areaAcres.toFixed(1)} acres` : ""));
  if (site.documents?.progressProfile?.url) console.log(C.dim("EPA profile: ") + site.documents.progressProfile.url);
  if (site.documents?.listingNarrative?.url) console.log(C.dim("Narrative:   ") + site.documents.listingNarrative.url);
  console.log("");

  if (climateRaw) reportClimate(climateRaw);
  else { rule("CLIMATE"); console.log("  " + C.dim("Climate data unavailable.")); }
  reportTopo(topo);
  reportFlood(flood);

  rule("CONTAMINATION & DESIGN READ");
  console.log("  " + C.dim("Model passes — available in the web version (needs ANTHROPIC_API_KEY)."));
  if (site.documents?.listingNarrative?.url) console.log("  " + C.dim("Start here: ") + site.documents.listingNarrative.url);

  if (opts.exportDir) { console.log(""); await doExports(opts.exportDir, site, topo, climateRaw, flood); }
  rule();
  console.log(C.dim("Hard data: EPA · USGS · FEMA · Open-Meteo. Reanalysis climate ≈ 25 km. Verify before you design."));
}

main().catch((e) => {
  console.error(C.red("\nError: ") + e.message);
  process.exit(1);
});
