// Client-side export builders. Every download is generated in the browser from
// the analyze payload (no server call, no Vercel 60s exposure, free for anonymous
// visitors) — the .3dm loads rhino3dm's WASM from a CDN at click time.

import {
  terrainOBJ,
  contoursDXF,
  boundaryDXF,
  boundaryGeoJSON,
  climateEPW
} from "@/lib/site-analysis/exporters";
import { buildAnalysis3dm } from "@/lib/site-analysis/rhino3dm-client";
import type { AnalyzeResult, Contamination, Synthesis } from "./types";

export interface ExportItem {
  id: string;
  label: string;
  filename: string;
  available: boolean;
  make: () => string | Uint8Array | Promise<string | Uint8Array>;
  blurb: string;
}

export function slug(s: string): string {
  return (s || "site")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "site";
}

export function buildExportList(result: AnalyzeResult): ExportItem[] {
  const base = slug(result.site.name);
  const { topo, site, climate, flood } = result;
  return [
    {
      id: "3dm",
      label: ".3dm",
      filename: `${base}.3dm`,
      blurb: "Rhino model — terrain, sun path, wind rose, flood plane, labels on a shared origin.",
      available: !!(topo || climate),
      make: () => buildAnalysis3dm({ site, topo, climate: climate?.raw, flood })
    },
    {
      id: "obj",
      label: ".obj",
      filename: `${base}-terrain.obj`,
      blurb: "Terrain mesh (metres, local origin).",
      available: !!topo,
      make: () => terrainOBJ(topo as any)
    },
    {
      id: "dxf-contours",
      label: ".dxf contours",
      filename: `${base}-contours.dxf`,
      blurb: "Elevation contour polylines.",
      available: !!topo,
      make: () => contoursDXF(topo as any)
    },
    {
      id: "dxf-boundary",
      label: ".dxf boundary",
      filename: `${base}-boundary.dxf`,
      blurb: "Site boundary polylines (Superfund).",
      available: !!site.boundary,
      make: () => boundaryDXF(site.boundary as any, site.bbox as number[])
    },
    {
      id: "geojson",
      label: ".geojson",
      filename: `${base}-boundary.geojson`,
      blurb: "Boundary in WGS84 for GIS (Superfund).",
      available: !!site.boundary,
      make: () => boundaryGeoJSON(site as any)
    },
    {
      id: "epw",
      label: ".epw",
      filename: `${base}.epw`,
      blurb: "Generated EnergyPlus weather file for Ladybug.",
      available: !!climate?.raw,
      make: () => climateEPW(climate!.raw, site as any)
    }
  ];
}

// Trigger a browser download from text or bytes.
export function download(
  filename: string,
  content: string | Uint8Array,
  mime = "application/octet-stream"
) {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: `${mime};charset=utf-8` })
      : new Blob([new Uint8Array(content)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- the dossier (JSON + Markdown) -----------------------------------------

export function dossierJSON(
  result: AnalyzeResult,
  contamination: Contamination | null,
  synthesis: Synthesis | null
): string {
  const { climate, ...rest } = result;
  return JSON.stringify(
    {
      // `rest` carries site, flood, topo (grid), terrainDeep, soils, landcover,
      // watershed, seismic, coverage, meta.
      ...rest,
      // drop the hourly arrays; keep the summary + the derived deep metrics.
      climate: climate ? { summary: climate.summary, deep: climate.deep } : null,
      contamination,
      synthesis,
      exportedAt: new Date().toISOString()
    },
    null,
    2
  );
}

// A flat, spreadsheet-friendly CSV of every scalar metric the analysis produced —
// the fastest way for a student to pull the numbers into Excel/Sheets.
export function metricsCSV(result: AnalyzeResult): string {
  const rows: string[][] = [["section", "metric", "value", "unit"]];
  const add = (s: string, m: string, v: unknown, u = "") =>
    rows.push([s, m, v == null ? "" : String(v), u]);
  const { site, climate, topo, terrainDeep, flood, soils, landcover, watershed, seismic } = result;

  add("site", "name", site.name);
  add("site", "lat", site.centroid.lat);
  add("site", "lon", site.centroid.lon);
  if (site.areaAcres != null) add("site", "area", site.areaAcres, "acres");

  if (climate) {
    const a = climate.summary.annual;
    const d = climate.deep;
    add("climate", "prevailing_wind", climate.summary.prevailingWind.dir);
    add("climate", "elevation", climate.summary.elevation, "m");
    add("climate", "temp_mean", a.tempMean, "C");
    add("climate", "temp_min", a.tempMin, "C");
    add("climate", "temp_max", a.tempMax, "C");
    add("climate", "rh_mean", a.rhMean, "%");
    add("climate", "wind_mean", a.windMean, "m/s");
    add("climate", "ghi_annual", a.ghiAnnualKwh, "kWh/m2/yr");
    add("climate", "hdd18", a.hdd18);
    add("climate", "cdd18", a.cdd18);
    add("comfort", "comfortable", d.comfort.comfortablePct, "%");
    add("comfort", "too_hot", d.comfort.tooHotPct, "%");
    add("comfort", "too_cold", d.comfort.tooColdPct, "%");
    add("design", "heating_99.6", d.designDays.heating996, "C");
    add("design", "cooling_0.4", d.designDays.cooling04, "C");
    add("design", "extreme_min", d.designDays.extremeMin, "C");
    add("design", "extreme_max", d.designDays.extremeMax, "C");
    for (const f of d.facadeSolar) add("solar_facade", f.orientation, f.kwhM2Yr, "kWh/m2/yr");
    for (const st of d.strategies) add("passive_strategy", st.name, st.pct, "%");
    d.monthlyDegreeDays.forEach((m, i) => {
      add("degree_days", `hdd_month_${i + 1}`, m.hdd);
      add("degree_days", `cdd_month_${i + 1}`, m.cdd);
    });
    add("water", "annual_precip", d.water.annualPrecipMm, "mm");
    add("water", "annual_snow", d.water.annualSnowCm, "cm");
  }
  if (topo && terrainDeep) {
    add("terrain", "elev_min", topo.stats.min, "m");
    add("terrain", "elev_max", topo.stats.max, "m");
    add("terrain", "relief", terrainDeep.relief, "m");
    add("terrain", "mean_slope", terrainDeep.meanSlopePct, "%");
    add("terrain", "max_slope", terrainDeep.maxSlopePct, "%");
    add("terrain", "buildable", terrainDeep.buildablePct, "%");
    add("terrain", "dominant_aspect", terrainDeep.aspect.dominant);
    add("terrain", "fabricated_cells", terrainDeep.fabricatedPct, "%");
  }
  if (soils) {
    add("soils", "map_unit", soils.mapUnit);
    add("soils", "drainage", soils.drainageClass);
    add("soils", "hydrologic_group", soils.hydrologicGroup);
    add("soils", "water_table", soils.waterTableCm, "cm");
    add("soils", "flood_frequency", soils.floodFrequency);
    add("soils", "dwellings_rating", soils.dwellingLimitation);
  }
  if (landcover) {
    add("land_cover", "class", landcover.className);
    add("land_cover", "impervious", landcover.imperviousPct, "%");
    add("land_cover", "tree_canopy", landcover.treeCanopyPct, "%");
  }
  if (watershed) {
    add("watershed", "huc12_name", watershed.huc12Name);
    add("watershed", "huc12", watershed.huc12);
  }
  if (flood && flood.mapped !== false) {
    add("flood", "zone", flood.zone);
    add("flood", "in_sfha", flood.inFloodZone);
  }
  if (seismic) {
    add("seismic", "Ss", seismic.ss);
    add("seismic", "S1", seismic.s1);
    add("seismic", "SDC", seismic.sdc);
  }

  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function dossierMarkdown(
  result: AnalyzeResult,
  contamination: Contamination | null,
  synthesis: Synthesis | null
): string {
  const { site, climate, flood, topo, terrainDeep, soils, landcover, watershed, seismic, coverage, meta } = result;
  const L: string[] = [];
  L.push(`# Site Analysis — ${site.name}`);
  L.push("");
  L.push(`*${meta.mode === "superfund" ? "Superfund mode" : "Place mode"} · generated ${meta.generatedAt}*`);
  if (site.address) L.push(`**Location:** ${site.address}`);
  L.push(
    `**Coordinates:** ${site.centroid.lat.toFixed(5)}, ${site.centroid.lon.toFixed(5)}` +
      (climate ? ` · **Elevation:** ${Math.round(climate.summary.elevation)} m` : "")
  );
  if (site.epaId) L.push(`**EPA ID:** ${site.epaId}${site.status ? ` · ${site.status}` : ""}`);
  L.push("");
  L.push(`## Coverage`);
  L.push(
    `climate ${coverage.climate ? "✓" : "✕"} · terrain ${coverage.terrain ? "✓" : "✕"} · flood ${
      coverage.flood ? "✓" : "✕"
    }${meta.mode === "superfund" ? ` · boundary ${coverage.boundary ? "✓" : "✕"}` : ""}`
  );
  L.push("");
  if (climate) {
    const c = climate.summary;
    L.push(`## Climate (Open-Meteo ERA5, ${c.year})`);
    L.push(`- Prevailing wind: **${c.prevailingWind.dir}**`);
    L.push(
      `- Annual temp: ${fmt(c.annual.tempMean)}°C mean (${fmt(c.annual.tempMin)}–${fmt(c.annual.tempMax)}°C)`
    );
    L.push(`- Mean RH: ${fmt(c.annual.rhMean)}% · mean wind: ${fmt(c.annual.windMean)} m/s`);
    L.push("");
  }
  if (topo) {
    L.push(`## Terrain (USGS 3DEP, ${topo.n}×${topo.n})`);
    L.push(
      `- Elevation ${fmt(topo.stats.min)}–${fmt(topo.stats.max)} m (range ${fmt(
        (topo.stats.max ?? 0) - (topo.stats.min ?? 0)
      )} m)` + (topo.stats.missing ? ` · ${topo.stats.missing}/${topo.stats.total} cells estimated` : "")
    );
    L.push("");
  }
  if (flood) {
    L.push(`## Flood (FEMA NFHL)`);
    L.push(
      flood.mapped === false
        ? `- Not mapped here.`
        : `- Zone **${flood.zone}**${flood.inFloodZone ? " (in SFHA)" : ""}${
            flood.baseFloodElevation != null ? ` · BFE ${flood.baseFloodElevation} ft` : ""
          }`
    );
    L.push("");
  }
  if (climate?.deep) {
    const d = climate.deep;
    L.push(`## Comfort & design conditions`);
    L.push(
      `- Outdoor comfort: ${d.comfort.comfortablePct}% comfortable · ${d.comfort.tooHotPct}% too hot · ${d.comfort.tooColdPct}% too cold (${d.comfort.model})`
    );
    L.push(
      `- Design days: heating 99.6% ${fmt(d.designDays.heating996)}°C · cooling 0.4% ${fmt(d.designDays.cooling04)}°C · extremes ${fmt(d.designDays.extremeMin)}–${fmt(d.designDays.extremeMax)}°C`
    );
    const topSolar = [...d.facadeSolar].sort((a, b) => b.kwhM2Yr - a.kwhM2Yr).slice(0, 3).map((f) => `${f.orientation} ${f.kwhM2Yr}`).join(", ");
    L.push(`- Solar by façade (kWh/m²·yr, top): ${topSolar}`);
    L.push(`- Passive strategies: ${d.strategies.slice(0, 4).map((s) => `${s.name} ${s.pct}%`).join(" · ")}`);
    if (d.water.annualPrecipMm != null)
      L.push(`- Precipitation: ${d.water.annualPrecipMm} mm/yr${d.water.annualSnowCm ? `, ${d.water.annualSnowCm} cm snow` : ""}`);
    L.push("");
  }
  if (terrainDeep) {
    L.push(`## Terrain (derived)`);
    L.push(
      `- Relief ${fmt(terrainDeep.relief)} m · mean slope ${fmt(terrainDeep.meanSlopePct)}% · max ${fmt(terrainDeep.maxSlopePct)}% · buildable ${fmt(terrainDeep.buildablePct)}%`
    );
    L.push(
      `- Dominant aspect ${terrainDeep.aspect.dominant ?? "—"}${terrainDeep.fabricatedPct ? ` · ${terrainDeep.fabricatedPct}% of grid back-filled (flagged)` : ""}`
    );
    L.push("");
  }
  if (soils) {
    L.push(`## Soils (USDA SSURGO)`);
    L.push(`- ${soils.mapUnit ?? "—"}`);
    L.push(
      `- Drainage ${soils.drainageClass ?? "—"} · hydrologic group ${soils.hydrologicGroup ?? "—"} · water table ${soils.waterTableCm != null ? `${soils.waterTableCm} cm` : "—"} · flooding ${soils.floodFrequency ?? "—"}`
    );
    if (soils.dwellingLimitation) L.push(`- Dwellings rating: ${soils.dwellingLimitation}`);
    L.push("");
  }
  if (landcover) {
    L.push(`## Land cover (NLCD)`);
    L.push(`- ${landcover.className ?? "—"} · impervious ${landcover.imperviousPct ?? "—"}% · tree canopy ${landcover.treeCanopyPct ?? "—"}%`);
    L.push("");
  }
  if (watershed) {
    L.push(`## Watershed (USGS WBD)`);
    L.push(`- ${watershed.huc12Name ?? "—"} (HUC12 ${watershed.huc12 ?? "—"})${watershed.huc8Name ? ` · basin ${watershed.huc8Name}` : ""}`);
    L.push("");
  }
  if (seismic) {
    L.push(`## Seismic (ASCE 7-16)`);
    L.push(`- Seismic Design Category ${seismic.sdc ?? "—"} · Ss ${fmt(seismic.ss)} · S1 ${fmt(seismic.s1)} (Site Class ${seismic.siteClass}, Risk Cat II)`);
    L.push("");
  }
  if (contamination) {
    L.push(`## Contamination`);
    L.push(contamination.summary);
    for (const x of contamination.contaminants_of_concern || []) {
      L.push(`- **${x.name}** (${x.media}) [${x.claim.status}] — ${x.health_or_design_note}`);
    }
    L.push("");
  }
  if (synthesis) {
    L.push(`## Design synthesis`);
    L.push(`> ${synthesis.site_in_a_sentence}`);
    L.push("");
    L.push(`**Climate read.** ${synthesis.climate_read}`);
    L.push(`**Topography read.** ${synthesis.topography_read}`);
    L.push(`**Water & flood read.** ${synthesis.water_and_flood_read}`);
    L.push(`**Contamination implications.** ${synthesis.contamination_implications}`);
    L.push("");
    L.push(`**Key tensions.** ${synthesis.key_tensions}`);
    L.push(`**What this cannot tell you.** ${synthesis.what_this_analysis_cannot_tell_you}`);
    if (synthesis.design_opportunities?.length) {
      L.push("");
      L.push(`### Design opportunities`);
      for (const o of synthesis.design_opportunities) L.push(`- [${o.status}] ${o.claim}`);
    }
    if (synthesis.field_checklist?.length) {
      L.push("");
      L.push(`### Field checklist`);
      for (const f of synthesis.field_checklist) L.push(`- [ ] ${f}`);
    }
  }
  L.push("");
  L.push(`---`);
  L.push(`*Hard data is sourced; AI judgment is tagged for you to verify. Not ground truth.*`);
  return L.join("\n");
}

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : (Math.round(v * 10) / 10).toString();
}
