"use client";

// cards.tsx — the rebuilt Surveyor data sections. Each domain (climate, terrain,
// ground, water/hazards, surroundings) is always visible (no Macro/Micro toggle
// hiding half the data), and surfaces the deep derivations the engine now
// computes. All text is black; every mini-chart is backed by visible numbers, so
// nothing is SVG-only.

import { useState } from "react";
import { Card, Stat, Pill, Read } from "./ui";
import { WindRoseChart, SunPathChart, MonthlyClimate } from "./charts";
import type { AnalyzeResult, Synthesis, SiteContext } from "./types";

function fmt(v: number | null | undefined, dp = 1): string {
  return v == null || Number.isNaN(v) ? "—" : (Math.round(v * 10 ** dp) / 10 ** dp).toString();
}
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// --- shared mini-charts (accessible: numbers are visible text) --------------

function MiniBars({
  data,
  unit = "",
  ariaLabel,
  color = "#111827",
  highlight
}: {
  data: { label: string; value: number }[];
  unit?: string;
  ariaLabel: string;
  color?: string;
  highlight?: string;
}) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 0.0001);
  return (
    <div role="img" aria-label={ariaLabel} className="space-y-0.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-[11px] text-neutral-900">
          <span className="w-24 shrink-0 truncate text-right">{d.label}</span>
          <span className="relative h-2.5 flex-1 overflow-hidden rounded bg-neutral-100">
            <span
              className="absolute inset-y-0 left-0 rounded"
              style={{ width: `${(Math.abs(d.value) / max) * 100}%`, background: d.label === highlight ? "#ea580c" : color }}
            />
          </span>
          <span className="w-14 shrink-0 text-right tabular-nums">
            {fmt(d.value)}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function Sparkbars({ values, color = "#111827", ariaLabel }: { values: number[]; color?: string; ariaLabel: string }) {
  const max = Math.max(...values.map((v) => Math.abs(v)), 0.0001);
  return (
    <div className="flex items-end gap-[2px]" role="img" aria-label={ariaLabel}>
      {values.map((v, i) => (
        <span key={i} className="flex flex-1 flex-col items-center gap-0.5">
          <span className="flex h-9 w-full items-end">
            <span className="w-full rounded-sm" style={{ height: `${Math.max(2, (Math.abs(v) / max) * 100)}%`, background: color }} title={`${v}`} />
          </span>
          <span className="text-[8px] text-neutral-900">{MONTHS[i]}</span>
        </span>
      ))}
    </div>
  );
}

function StackBar({ segments, ariaLabel }: { segments: { label: string; pct: number; color: string }[]; ariaLabel: string }) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="flex h-4 w-full overflow-hidden rounded">
        {segments.map((s) => (
          <span key={s.label} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label}: ${s.pct}%`} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-neutral-900">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label} {s.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">{children}</div>;
}

// --- Climate & comfort ------------------------------------------------------

export function ClimateSection({ result, synthesis }: { result: AnalyzeResult; synthesis: Synthesis | null }) {
  const c = result.climate?.summary;
  const d = result.climate?.deep;
  if (!c || !d) {
    return (
      <Card title="Climate & comfort" source="Open-Meteo ERA5 reanalysis">
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-900">No climate data for this location.</p>
      </Card>
    );
  }
  const solar = [...d.facadeSolar].sort((a, b) => b.kwhM2Yr - a.kwhM2Yr);
  return (
    <Card
      title="Climate & comfort"
      source={`Open-Meteo ERA5 reanalysis (~25 km cell), ${c.year} · ${c.timezone}. A regional model, not a local station; comfort/design metrics are derived screening reads.`}
    >
      {/* the three diagrams */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <Subhead>Wind rose</Subhead>
          <WindRoseChart rose={c.windRose} />
        </div>
        <div>
          <Subhead>Sun path</Subhead>
          <SunPathChart paths={c.sunPaths} />
        </div>
        <div>
          <Subhead>Temp + humidity</Subhead>
          <MonthlyClimate temp={c.temp} rh={c.rh} tempUnit={c.units?.temperature_2m || "°C"} />
        </div>
      </div>

      {/* headline annual stats */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-100 pt-3">
        <Stat label="Prevailing wind" value={c.prevailingWind.dir ?? "—"} hint="Direction the wind most often blows FROM." />
        <Stat label="Annual temp" value={`${fmt(c.annual.tempMean)}°`} sub={`${fmt(c.annual.tempMin)}–${fmt(c.annual.tempMax)}°C`} />
        <Stat label="Mean RH" value={`${fmt(c.annual.rhMean)}%`} />
        <Stat label="Solar (GHI)" value={`${fmt(c.annual.ghiAnnualKwh)}`} sub="kWh/m²·yr" hint="Annual global horizontal solar energy." />
        <Stat label="Degree-days" value={`${fmt(c.annual.hdd18, 0)} HDD · ${fmt(c.annual.cdd18, 0)} CDD`} hint="Heating vs cooling demand, base 18 °C." />
      </div>

      {/* comfort */}
      <div className="mt-4 grid gap-5 border-t border-neutral-100 pt-3 md:grid-cols-2">
        <div>
          <Subhead>Outdoor comfort hours</Subhead>
          <StackBar
            ariaLabel={`Comfort hours: ${d.comfort.comfortablePct}% comfortable, ${d.comfort.tooHotPct}% too hot, ${d.comfort.tooColdPct}% too cold`}
            segments={[
              { label: "Comfortable", pct: d.comfort.comfortablePct, color: "#16a34a" },
              { label: "Too hot", pct: d.comfort.tooHotPct, color: "#ea580c" },
              { label: "Too cold", pct: d.comfort.tooColdPct, color: "#2563eb" }
            ]}
          />
          <p className="mt-1.5 text-[11px] text-neutral-900">{d.comfort.model}</p>
          <div className="mt-2">
            <Subhead>% comfortable by month</Subhead>
            <Sparkbars values={d.comfort.monthlyComfortPct} color="#16a34a" ariaLabel="Percent of hours comfortable each month" />
          </div>
        </div>
        <div>
          <Subhead>Design conditions (percentile)</Subhead>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Stat label="Heating 99.6%" value={`${fmt(d.designDays.heating996)}°C`} hint="Temp exceeded 99.6% of the year — size heating to this." />
            <Stat label="Cooling 0.4%" value={`${fmt(d.designDays.cooling04)}°C`} hint="Temp exceeded only 0.4% of the year — size cooling to this." />
            <Stat label="Record min" value={`${fmt(d.designDays.extremeMin)}°C`} />
            <Stat label="Record max" value={`${fmt(d.designDays.extremeMax)}°C`} />
          </div>
        </div>
      </div>

      {/* solar by orientation + passive strategies */}
      <div className="mt-4 grid gap-5 border-t border-neutral-100 pt-3 md:grid-cols-2">
        <div>
          <Subhead>Solar gain by façade (kWh/m²·yr)</Subhead>
          <MiniBars
            ariaLabel="Annual incident solar on each façade orientation"
            data={solar.map((f) => ({ label: f.orientation, value: f.kwhM2Yr }))}
            highlight={solar[0]?.orientation}
          />
        </div>
        <div>
          <Subhead>Passive strategy potential (Givoni)</Subhead>
          <MiniBars
            ariaLabel="Share of hours each passive strategy can hold comfort"
            unit="%"
            data={d.strategies.slice(0, 7).map((s) => ({ label: s.name, value: s.pct }))}
          />
          <p className="mt-1.5 text-[11px] text-neutral-900">Simplified building-bioclimatic zoning — an approximation to verify.</p>
        </div>
      </div>

      {/* seasonal wind + daylight + water */}
      <div className="mt-4 grid gap-5 border-t border-neutral-100 pt-3 sm:grid-cols-3">
        <div>
          <Subhead>Prevailing wind by season</Subhead>
          <div className="space-y-0.5 text-[12px] text-neutral-900">
            {d.seasonalWind.map((s) => (
              <div key={s.season} className="flex justify-between">
                <span>{s.season}</span>
                <span className="font-semibold">{s.dir ?? "—"} {s.dir ? `(${s.fraction}%)` : ""}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Subhead>Daylight</Subhead>
          <div className="space-y-0.5 text-[12px] text-neutral-900">
            {d.daylight.map((dl) => (
              <div key={dl.label} className="flex justify-between">
                <span>{dl.label}</span>
                <span className="font-semibold">{dl.hours} h</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Subhead>Precipitation</Subhead>
          {d.water.annualPrecipMm != null ? (
            <>
              <div className="text-sm font-semibold text-neutral-900">
                {d.water.annualPrecipMm} mm/yr{d.water.annualSnowCm ? ` · ${d.water.annualSnowCm} cm snow` : ""}
              </div>
              <div className="text-[11px] text-neutral-900">{d.water.wetDays} wet days (&gt;1 mm)</div>
              <div className="mt-1">
                <Sparkbars values={d.water.monthlyPrecipMm} color="#2563eb" ariaLabel="Monthly precipitation in millimetres" />
              </div>
            </>
          ) : (
            <p className="text-[12px] text-neutral-900">No precipitation data.</p>
          )}
        </div>
      </div>

      {synthesis && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <Read label="Climate read (AI)">{synthesis.climate_read}</Read>
        </div>
      )}
    </Card>
  );
}

// --- Terrain & topography ---------------------------------------------------

export function TerrainSection({ result, synthesis }: { result: AnalyzeResult; synthesis: Synthesis | null }) {
  const t = result.terrainDeep;
  const topo = result.topo;
  if (!t || !topo) {
    return (
      <Card title="Terrain & topography" source="USGS 3DEP elevation. US only.">
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-900">No terrain data (USGS 3DEP is US-only).</p>
      </Card>
    );
  }
  return (
    <Card title="Terrain & topography" source={`USGS 3DEP elevation, ${topo.n}×${topo.n} grid (${fmt(t.resMeters)} m). US only.`}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Elevation" value={`${fmt(topo.stats.min)}–${fmt(topo.stats.max)} m`} hint="Lowest to highest measured ground." />
        <Stat label="Relief" value={`${fmt(t.relief)} m`} hint="Highest minus lowest." />
        <Stat label="Mean slope" value={`${fmt(t.meanSlopePct)}%`} sub={`max ${fmt(t.maxSlopePct)}%`} />
        <Stat label="Buildable" value={`${fmt(t.buildablePct, 0)}%`} hint="Share of measured cells under 15% slope." />
      </div>

      <div className="mt-4 grid gap-5 border-t border-neutral-100 pt-3 md:grid-cols-2">
        <div>
          <Subhead>Slope distribution</Subhead>
          <MiniBars unit="%" ariaLabel="Share of site in each slope band" data={t.slopeBands.map((b) => ({ label: b.band, value: b.pct }))} />
        </div>
        <div>
          <Subhead>Aspect — which way slopes face</Subhead>
          <MiniBars
            unit="%"
            ariaLabel="Share of slopes facing each compass direction"
            data={t.aspect.distribution.map((a) => ({ label: a.dir, value: a.pct }))}
            highlight={t.aspect.dominant ?? undefined}
          />
          <p className="mt-1.5 text-[11px] text-neutral-900">Dominant aspect: <span className="font-semibold">{t.aspect.dominant ?? "—"}</span> (sun + drainage).</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-100 pt-3">
        <Stat label="High point" value={t.highPoint ? `${t.highPoint.elev} m` : "—"} sub={t.highPoint ? `${t.highPoint.lat.toFixed(4)}, ${t.highPoint.lon.toFixed(4)}` : undefined} />
        <Stat label="Low point" value={t.lowPoint ? `${t.lowPoint.elev} m` : "—"} sub={t.lowPoint ? `${t.lowPoint.lat.toFixed(4)}, ${t.lowPoint.lon.toFixed(4)}` : undefined} />
        <Stat label="Suggested datum" value={t.suggestedDatumM != null ? `${t.suggestedDatumM} m` : "—"} hint="A sensible 0-datum for grading (the low point)." />
      </div>

      {t.fabricatedPct > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          {t.fabricatedPct}% of the grid was outside 3DEP coverage and back-filled (flagged hollow on the map, excluded from slope/aspect).
        </p>
      )}
      {synthesis && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <Read label="Topography read (AI)">{synthesis.topography_read}</Read>
        </div>
      )}
    </Card>
  );
}

// --- Ground & ecology -------------------------------------------------------

export function GroundSection({ result }: { result: AnalyzeResult }) {
  const soil = result.soils;
  const lc = result.landcover;
  if (!soil && !lc) {
    return (
      <Card title="Ground & ecology" source="USDA SSURGO soils · USGS NLCD land cover. US only.">
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-900">No soils or land-cover data (US-only sources).</p>
      </Card>
    );
  }
  return (
    <Card title="Ground & ecology" source="USDA SSURGO soils (dominant map unit) · USGS/MRLC NLCD 2021 land cover. US only.">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Subhead>Soils (USDA SSURGO)</Subhead>
          {soil ? (
            <>
              <p className="text-sm font-semibold text-neutral-900">{soil.mapUnit ?? "—"}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                <Stat label="Drainage" value={soil.drainageClass ?? "—"} />
                <Stat label="Hydrologic group" value={soil.hydrologicGroup ?? "—"} hint="Runoff potential A (low) → D (high) — sizes stormwater." />
                <Stat label="Water table" value={soil.waterTableCm != null ? `${soil.waterTableCm} cm` : "—"} hint="Shallowest annual depth to water table." />
                <Stat label="Bedrock" value={soil.bedrockCm != null ? `${soil.bedrockCm} cm` : "deep"} />
                <Stat label="Flooding" value={soil.floodFrequency ?? "—"} />
                <Stat label="Hydric (wetland)" value={soil.hydricPct != null ? `${soil.hydricPct}%` : "—"} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {soil.dwellingLimitation && <Pill tone={limTone(soil.dwellingLimitation)}>Dwellings: {soil.dwellingLimitation}</Pill>}
                {soil.commercialLimitation && <Pill tone={limTone(soil.commercialLimitation)}>Small comm.: {soil.commercialLimitation}</Pill>}
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-900">No soils mapped here.</p>
          )}
        </div>
        <div>
          <Subhead>Land cover (NLCD)</Subhead>
          {lc ? (
            <>
              <p className="text-sm font-semibold text-neutral-900">{lc.className ?? "—"}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                <Stat label="Impervious surface" value={lc.imperviousPct != null ? `${lc.imperviousPct}%` : "—"} hint="Developed hard surface — runoff + heat." />
                <Stat label="Tree canopy" value={lc.treeCanopyPct != null ? `${lc.treeCanopyPct}%` : "—"} hint="Canopy cover — shade + stormwater." />
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-900">No land-cover data.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function limTone(rating: string): "good" | "warn" | "bad" | "neutral" {
  const r = rating.toLowerCase();
  if (r.includes("not limited")) return "good";
  if (r.includes("somewhat")) return "warn";
  if (r.includes("very")) return "bad";
  return "neutral";
}

// --- Water & hazards --------------------------------------------------------

export function HazardsSection({ result, synthesis }: { result: AnalyzeResult; synthesis: Synthesis | null }) {
  const { flood, watershed, seismic } = result;
  return (
    <Card title="Water & hazards" source="FEMA NFHL flood · USGS WBD watershed · USGS ASCE 7-16 seismic. US only.">
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <Subhead>Flood (FEMA NFHL)</Subhead>
          {flood && flood.mapped !== false ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {flood.inFloodZone ? <Pill tone="info">In SFHA · zone {flood.zone}</Pill> : <Pill tone="good">Outside SFHA · zone {flood.zone}</Pill>}
                {flood.subtype && <Pill tone="neutral">{flood.subtype}</Pill>}
                {flood.baseFloodElevation != null && <Pill tone="neutral">BFE {flood.baseFloodElevation} ft</Pill>}
              </div>
              {flood.note && <p className="mt-1.5 text-[12px] text-neutral-900">{flood.note}</p>}
            </>
          ) : (
            <p className="text-[12px] text-neutral-900">{flood?.note ?? "Not mapped / US-only."}</p>
          )}
        </div>
        <div>
          <Subhead>Watershed (USGS WBD)</Subhead>
          {watershed ? (
            <div className="space-y-1 text-[12px] text-neutral-900">
              <div><span className="font-semibold">{watershed.huc12Name ?? "—"}</span></div>
              <div>HUC12 {watershed.huc12 ?? "—"}</div>
              {watershed.huc8Name && <div>Basin: {watershed.huc8Name}</div>}
              {watershed.areaSqKm != null && <div>Subwatershed {fmt(watershed.areaSqKm)} km²</div>}
            </div>
          ) : (
            <p className="text-[12px] text-neutral-900">No watershed data.</p>
          )}
        </div>
        <div>
          <Subhead>Seismic (ASCE 7-16)</Subhead>
          {seismic ? (
            <>
              <div className="flex items-center gap-2">
                <Pill tone={sdcTone(seismic.sdc)}>SDC {seismic.sdc ?? "—"}</Pill>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                <Stat label="Ss" value={fmt(seismic.ss, 3)} hint="Mapped short-period spectral acceleration (g)." />
                <Stat label="S1" value={fmt(seismic.s1, 3)} hint="Mapped 1-second spectral acceleration (g)." />
                <Stat label="SDS" value={fmt(seismic.sds, 3)} />
                <Stat label="SD1" value={fmt(seismic.sd1, 3)} />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-900">Site Class {seismic.siteClass} assumed · Risk Cat II.</p>
            </>
          ) : (
            <p className="text-[12px] text-neutral-900">No seismic data.</p>
          )}
        </div>
      </div>
      {synthesis && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <Read label="Water & flood read (AI)">{synthesis.water_and_flood_read}</Read>
        </div>
      )}
    </Card>
  );
}

function sdcTone(sdc: string | null): "good" | "warn" | "bad" | "neutral" {
  if (!sdc) return "neutral";
  if (["A", "B"].includes(sdc)) return "good";
  if (["C", "D"].includes(sdc)) return "warn";
  return "bad"; // E/F
}

// --- Surroundings (lazy OSM context) ----------------------------------------

export function ContextSection({
  centroid,
  onContext
}: {
  centroid: { lat: number; lon: number };
  onContext?: (c: SiteContext | null) => void;
}) {
  const [context, setContext] = useState<SiteContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(350);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-analysis/context?lat=${centroid.lat}&lon=${centroid.lon}&radius=${radius}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load surroundings.");
      setContext(data.context);
      onContext?.(data.context); // surface to the map overlay
      if (!data.context) setError("No OpenStreetMap context found near this point.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Surroundings (OpenStreetMap)" source="OpenStreetMap via Overpass — nearby footprints, roads, water, green space. Global, keyless.">
      <p className="-mt-1 mb-3 text-xs text-neutral-900">
        Pull the real nearby context geometry — shown on the map (toggle “Nearby buildings”) and exportable to Rhino.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[12px] text-neutral-900">
          Radius
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="ml-1 rounded border border-neutral-300 px-1 py-0.5 text-[12px]">
            <option value={200}>200 m</option>
            <option value={350}>350 m</option>
            <option value={600}>600 m</option>
            <option value={1000}>1 km</option>
          </select>
        </label>
        <button onClick={load} disabled={loading} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {loading ? "Loading…" : context ? "Reload surroundings" : "Load surroundings"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-neutral-900">{error}</p>}
      {context && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <Stat label="Buildings" value={context.counts.building} />
          <Stat label="Roads" value={context.counts.road} />
          <Stat label="Water" value={context.counts.water} />
          <Stat label="Green space" value={context.counts.green} />
          <Stat label="Within" value={`${context.radiusM} m`} />
        </div>
      )}
    </Card>
  );
}
