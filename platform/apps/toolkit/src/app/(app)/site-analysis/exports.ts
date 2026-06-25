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
      ...rest,
      // drop the hourly arrays from the dossier; keep the summary.
      climate: climate ? { summary: climate.summary } : null,
      contamination,
      synthesis,
      exportedAt: new Date().toISOString()
    },
    null,
    2
  );
}

export function dossierMarkdown(
  result: AnalyzeResult,
  contamination: Contamination | null,
  synthesis: Synthesis | null
): string {
  const { site, climate, flood, topo, coverage, meta } = result;
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
