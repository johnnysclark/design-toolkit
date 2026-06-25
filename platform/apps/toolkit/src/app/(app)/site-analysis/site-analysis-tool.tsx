"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteMap from "./SiteMap";
import { WindRoseChart, SunPathChart, MonthlyClimate } from "./charts";
import { Card, Stat, Pill, CoverageStrip, Read } from "./ui";
import { SynthesisStrip, ContaminationPanel } from "./ai";
import {
  buildExportList,
  download,
  dossierJSON,
  dossierMarkdown,
  slug
} from "./exports";
import { makeProjector } from "@/lib/site-analysis/geo";
import type {
  Mode,
  Scale,
  AnalyzeResult,
  Contamination,
  Synthesis,
  GeoPlace,
  SiteCandidate
} from "./types";

type Candidate = GeoPlace | SiteCandidate;

const PLACE_EXAMPLES = ["Millennium Park, Chicago", "Venice, Italy", "1600 Pennsylvania Ave"];
const SUPERFUND_EXAMPLES = ["Love Canal", "Times Beach", "Berkeley Pit"];

export default function SiteAnalysisTool({ signedIn }: { signedIn: boolean }) {
  const [mode, setMode] = useState<Mode>("place");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [scale, setScale] = useState<Scale>("macro");

  const [contamination, setContamination] = useState<Contamination | null>(null);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPhase, setAiPhase] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Debounced search.
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/site-analysis/search?mode=${mode}&q=${encodeURIComponent(query.trim())}`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Search failed.");
        setCandidates(data.results || []);
      } catch (e: any) {
        if (e.name !== "AbortError") setSearchError(e.message);
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query, mode, open]);

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setQuery("");
    setCandidates([]);
    setOpen(false);
    setSearchError(null);
  }

  async function selectCandidate(c: Candidate) {
    setOpen(false);
    setCandidates([]);
    const label = "epaId" in c && mode === "superfund" ? c.name : (c as GeoPlace).label;
    setQuery("shortLabel" in c ? (c as GeoPlace).shortLabel : c.name);
    setContamination(null);
    setSynthesis(null);
    setAiError(null);
    setScale("macro");
    setAnalyzing(true);
    setAnalyzeError(null);
    setResult(null);
    try {
      const payload =
        mode === "superfund"
          ? { epaId: (c as SiteCandidate).epaId }
          : {
              lat: (c as GeoPlace).lat,
              lon: (c as GeoPlace).lon,
              label,
              category: (c as GeoPlace).category
            };
      const res = await fetch("/api/site-analysis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analysis failed.");
      setResult(data as AnalyzeResult);
    } catch (e: any) {
      setAnalyzeError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function runAI() {
    if (!result) return;
    setAiLoading(true);
    setAiError(null);
    try {
      let contam: Contamination | null = contamination;
      if (mode === "superfund" && result.site.epaId && !contam) {
        setAiPhase("Reading EPA records + the web…");
        const cr = await fetch("/api/site-analysis/contamination", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ epaId: result.site.epaId, grounded: true })
        });
        const cd = await cr.json();
        if (cr.status === 401) throw new Error("Sign in to run the AI analysis.");
        if (!cr.ok) throw new Error(cd?.error || "Contamination pass failed.");
        contam = cd.contamination as Contamination;
        setContamination(contam);
      }
      setAiPhase("Reading the data for design…");
      const sr = await fetch("/api/site-analysis/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: leanBundle(result, contam) })
      });
      const sd = await sr.json();
      if (sr.status === 401) throw new Error("Sign in to run the AI analysis.");
      if (!sr.ok) throw new Error(sd?.error || "Synthesis pass failed.");
      setSynthesis(sd.synthesis as Synthesis);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
      setAiPhase("");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl">Site Analysis</h1>
        <p className="mt-1 max-w-2xl text-neutral-600">
          The measured ground of a physical place — climate, terrain, water — with Rhino-ready
          exports. Hard data is free and sourced; AI judgment is tagged for you to verify.
        </p>
      </header>

      {/* control bar */}
      <div className="sticky top-0 z-20 -mx-2 border-b border-neutral-200 bg-neutral-50/90 px-2 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={mode}
            onChange={(v) => switchMode(v as Mode)}
            options={[
              { value: "place", label: "Place" },
              { value: "superfund", label: "Superfund" }
            ]}
          />
          <div className="relative min-w-[260px] flex-1">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => query.trim().length >= 2 && setOpen(true)}
              placeholder={
                mode === "superfund"
                  ? "Search an EPA Superfund site by name…"
                  : "Search any address, city, or landmark…"
              }
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
            {searching && (
              <span className="absolute right-3 top-2.5 text-xs text-neutral-400">…</span>
            )}
            {open && candidates.length > 0 && (
              <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
                {candidates.map((c, i) => (
                  <li key={i}>
                    <button
                      onClick={() => selectCandidate(c)}
                      className="flex w-full flex-col items-start gap-0.5 border-b border-neutral-100 px-3 py-2 text-left last:border-0 hover:bg-neutral-50"
                    >
                      <span className="text-sm font-medium text-neutral-900">
                        {"shortLabel" in c ? (c as GeoPlace).shortLabel : c.name}
                      </span>
                      <span className="line-clamp-1 text-xs text-neutral-500">
                        {candidateSub(c, mode)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {result && (
            <Segmented
              big
              value={scale}
              onChange={(v) => setScale(v as Scale)}
              options={[
                { value: "macro", label: "◍ Macro" },
                { value: "micro", label: "⌖ Micro" }
              ]}
            />
          )}
        </div>
        {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}
        {!result && !analyzing && (
          <p className="mt-2 text-xs text-neutral-400">
            Try {(mode === "superfund" ? SUPERFUND_EXAMPLES : PLACE_EXAMPLES).map((ex, i) => (
              <button
                key={ex}
                onClick={() => {
                  setQuery(ex);
                  setOpen(true);
                }}
                className="underline decoration-dotted underline-offset-2 hover:text-neutral-700"
              >
                {ex}
                {i < 2 ? ", " : ""}
              </button>
            ))}
          </p>
        )}
      </div>

      {analyzing && (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Pulling the measured ground…
        </div>
      )}
      {analyzeError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {analyzeError}
        </div>
      )}

      {result && <Results
        result={result}
        scale={scale}
        mode={mode}
        signedIn={signedIn}
        contamination={contamination}
        synthesis={synthesis}
        aiLoading={aiLoading}
        aiPhase={aiPhase}
        aiError={aiError}
        onRunAI={runAI}
      />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Results({
  result,
  scale,
  mode,
  signedIn,
  contamination,
  synthesis,
  aiLoading,
  aiPhase,
  aiError,
  onRunAI
}: {
  result: AnalyzeResult;
  scale: Scale;
  mode: Mode;
  signedIn: boolean;
  contamination: Contamination | null;
  synthesis: Synthesis | null;
  aiLoading: boolean;
  aiPhase: string;
  aiError: string | null;
  onRunAI: () => void;
}) {
  const { site, climate, flood, topo, coverage } = result;
  const terrain = topo ? terrainReadout(topo) : null;

  return (
    <div className="space-y-5">
      {/* result header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-font text-2xl uppercase leading-tight tracking-tight text-neutral-900">
            {site.name}
          </h2>
          <p className="text-sm text-neutral-500">
            {site.address || `${site.centroid.lat.toFixed(4)}, ${site.centroid.lon.toFixed(4)}`}
            {site.status ? ` · ${site.status}` : ""}
          </p>
        </div>
        <CoverageStrip coverage={coverage} mode={mode} />
      </div>

      {/* map */}
      <div className="h-[440px] w-full overflow-hidden rounded-xl border border-neutral-200">
        <SiteMap
          centroid={site.centroid}
          bbox={site.bbox}
          boundary={site.boundary ?? null}
          topo={topo}
          flood={flood}
          scale={scale}
        />
      </div>
      <p className="-mt-3 text-center text-xs text-neutral-400">
        {scale === "macro"
          ? "Macro — the region around the site (street map, zoomed out)."
          : "Micro — the immediate surroundings (aerial, with the terrain grid)."}
      </p>

      {/* scale-dependent hard-data cards */}
      <div key={scale} className="animate-[fadeIn_.35s_ease] space-y-5">
        {scale === "macro" ? (
          <MacroCards result={result} synthesis={synthesis} />
        ) : (
          <MicroCards result={result} terrain={terrain} synthesis={synthesis} />
        )}
      </div>

      {/* AI band (always visible) */}
      <div className="space-y-5">
        <AiControls
          mode={mode}
          signedIn={signedIn}
          hasSynthesis={!!synthesis}
          aiLoading={aiLoading}
          aiPhase={aiPhase}
          aiError={aiError}
          onRunAI={onRunAI}
        />
        {contamination && <ContaminationPanel contamination={contamination} />}
        {synthesis && <SynthesisStrip synthesis={synthesis} />}
      </div>

      {/* exports */}
      <Exports result={result} contamination={contamination} synthesis={synthesis} />
    </div>
  );
}

// --- Macro: climate + regional position ------------------------------------

function MacroCards({
  result,
  synthesis
}: {
  result: AnalyzeResult;
  synthesis: Synthesis | null;
}) {
  const { site, climate, coverage } = result;
  const c = climate?.summary;
  return (
    <>
      <Card title="Climate — the regional read (~25 km cell)">
        {c ? (
          <>
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  Wind rose
                </div>
                <WindRoseChart rose={c.windRose} />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  Sun path
                </div>
                <SunPathChart paths={c.sunPaths} />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  Temp + humidity
                </div>
                <MonthlyClimate temp={c.temp} rh={c.rh} tempUnit={c.units?.temperature_2m || "°C"} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-100 pt-3">
              <Stat label="Prevailing wind" value={c.prevailingWind.dir} />
              <Stat
                label="Annual temp"
                value={`${fmt(c.annual.tempMean)}°`}
                sub={`${fmt(c.annual.tempMin)}–${fmt(c.annual.tempMax)}°C`}
              />
              <Stat label="Mean RH" value={`${fmt(c.annual.rhMean)}%`} />
              <Stat label="Mean wind" value={`${fmt(c.annual.windMean)} m/s`} />
              <Stat label="Source" value="Open-Meteo ERA5" sub={`${c.year} · ${c.timezone}`} />
            </div>
            {synthesis && (
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <Read label="Climate read (AI)">{synthesis.climate_read}</Read>
              </div>
            )}
          </>
        ) : (
          <Missing label="climate" />
        )}
      </Card>

      <Card title="Regional position">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat
            label="Coordinates"
            value={`${site.centroid.lat.toFixed(4)}, ${site.centroid.lon.toFixed(4)}`}
          />
          {climate && <Stat label="Elevation" value={`${Math.round(climate.summary.elevation)} m`} />}
          {climate && <Stat label="Timezone" value={climate.summary.timezone} />}
          {site.mode === "superfund" ? (
            <>
              <Stat label="EPA Region" value={site.region ?? "—"} />
              <Stat
                label="State / county"
                value={[site.state, site.county].filter(Boolean).join(" · ") || "—"}
              />
              <Stat label="NPL status" value={site.status ?? "—"} />
              {site.score != null && <Stat label="Site score" value={site.score} />}
            </>
          ) : (
            <>
              {site.category && <Stat label="Type" value={site.category.replace("/", " · ")} />}
              <Stat label="Full address" value={site.address ?? "—"} />
            </>
          )}
        </div>
        {!coverage.terrain && site.mode === "place" && (
          <p className="mt-3 text-xs text-neutral-400">
            Terrain + flood layers are US-only — outside the US they read ✕ (climate + map are global).
          </p>
        )}
      </Card>
    </>
  );
}

// --- Micro: site identity, terrain, flood ----------------------------------

function MicroCards({
  result,
  terrain,
  synthesis
}: {
  result: AnalyzeResult;
  terrain: ReturnType<typeof terrainReadout> | null;
  synthesis: Synthesis | null;
}) {
  const { site, flood, topo } = result;
  const docs = site.documents || {};
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card title="Site identity">
        <div className="grid grid-cols-2 gap-4">
          {site.mode === "superfund" ? (
            <>
              <Stat label="EPA ID" value={site.epaId ?? "—"} />
              <Stat label="Area" value={site.areaAcres != null ? `${fmt(site.areaAcres)} ac` : "—"} />
              <Stat label="NPL status" value={site.status ?? "—"} />
              <Stat label="Listed" value={asDate(site.dates?.listed) ?? "—"} />
            </>
          ) : (
            <>
              <Stat label="Place" value={site.name} />
              {site.category && <Stat label="Type" value={site.category.replace("/", " · ")} />}
              <Stat
                label="Coordinates"
                value={`${site.centroid.lat.toFixed(5)}, ${site.centroid.lon.toFixed(5)}`}
              />
            </>
          )}
        </div>
        {site.mode === "superfund" && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
            {Object.entries(docs).map(([k, v]) =>
              v?.url ? (
                <a
                  key={k}
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-200"
                >
                  {docLabel(k)} ↗
                </a>
              ) : null
            )}
          </div>
        )}
        {site.mode === "superfund" && !site.boundary && (
          <p className="mt-2 text-xs text-neutral-400">No EPA boundary polygon published for this site.</p>
        )}
      </Card>

      <Card title="Terrain (USGS 3DEP)">
        {terrain ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Elevation" value={`${fmt(terrain.min)}–${fmt(terrain.max)} m`} />
              <Stat label="Relief" value={`${fmt(terrain.range)} m`} />
              <Stat label="Mean slope" value={`~${fmt(terrain.slopePct)}%`} sub="coarse grid estimate" />
              <Stat label="Grid" value={`${topo!.n}×${topo!.n} · ${fmt(terrain.resMeters)} m`} />
            </div>
            {terrain.missing > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {terrain.missing}/{terrain.total} cells were outside coverage and estimated from the
                grid mean — flagged, not measured.
              </p>
            )}
            {synthesis && (
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <Read label="Topography read (AI)">{synthesis.topography_read}</Read>
              </div>
            )}
          </>
        ) : (
          <Missing label="terrain (USGS is US-only)" />
        )}
      </Card>

      <Card title="Water / flood (FEMA NFHL)">
        {flood && flood.mapped !== false ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {flood.inFloodZone ? (
                <Pill tone="info">In SFHA · zone {flood.zone}</Pill>
              ) : (
                <Pill tone="good">Outside SFHA · zone {flood.zone}</Pill>
              )}
              {flood.subtype && <Pill tone="neutral">{flood.subtype}</Pill>}
              {flood.baseFloodElevation != null && (
                <Pill tone="neutral">BFE {flood.baseFloodElevation} ft</Pill>
              )}
            </div>
            {flood.note && <p className="mt-2 text-sm text-neutral-600">{flood.note}</p>}
            {synthesis && (
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <Read label="Water & flood read (AI)">{synthesis.water_and_flood_read}</Read>
              </div>
            )}
          </>
        ) : (
          <Missing label="flood (FEMA is US-only / unmapped here)" />
        )}
      </Card>

      <Card title="Immediate surroundings">
        <p className="text-sm leading-relaxed text-neutral-600">
          The aerial map above shows the {result.site.bbox ? "~1.8 km" : ""} study area. The colored
          dots are the {topo ? `${topo.n}×${topo.n}` : ""} USGS elevation samples (blue low → brown
          high). Switch to <span className="font-medium">Macro</span> for the regional climate read.
        </p>
        {synthesis?.contamination_implications && (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <Read label="Contamination implications (AI)">
              {synthesis.contamination_implications}
            </Read>
          </div>
        )}
      </Card>
    </div>
  );
}

// --- AI run controls / gate ------------------------------------------------

function AiControls({
  mode,
  signedIn,
  hasSynthesis,
  aiLoading,
  aiPhase,
  aiError,
  onRunAI
}: {
  mode: Mode;
  signedIn: boolean;
  hasSynthesis: boolean;
  aiLoading: boolean;
  aiPhase: string;
  aiError: string | null;
  onRunAI: () => void;
}) {
  const runLabel =
    mode === "superfund" ? "Run contamination + design synthesis" : "Run design synthesis";
  return (
    <Card accent title="AI reading (spends the studio's key)">
      {!signedIn ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-neutral-700">
            The map, data, charts and every export above are free and need no account. The two AI
            passes{mode === "superfund" ? " (contamination brief + design synthesis)" : " (design synthesis)"} are
            for signed-in studio members — they spend the Anthropic key.
          </p>
          <Link
            href="/login"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sign in to run the AI
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <button
            onClick={onRunAI}
            disabled={aiLoading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {aiLoading ? aiPhase || "Working…" : hasSynthesis ? "Re-run AI reading" : runLabel}
          </button>
          <p className="text-xs text-neutral-500">
            Reasons only over the hard data above
            {mode === "superfund" ? " + a web-cited EPA contamination brief" : ""}. Every claim is
            tagged for you to verify.
          </p>
          {aiError && <p className="text-sm text-red-600">{aiError}</p>}
        </div>
      )}
    </Card>
  );
}

// --- Exports ---------------------------------------------------------------

function Exports({
  result,
  contamination,
  synthesis
}: {
  result: AnalyzeResult;
  contamination: Contamination | null;
  synthesis: Synthesis | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const items = buildExportList(result);
  const base = slug(result.site.name);

  async function run(id: string, filename: string, make: () => any, mime: string) {
    setBusy(id);
    setErr(null);
    try {
      const content = await make();
      download(filename, content, mime);
    } catch (e: any) {
      setErr(`${filename}: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="Exports — Rhino-ready (free, built in your browser)">
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.id}
            disabled={!it.available || busy === it.id}
            title={it.available ? it.blurb : "Not available for this site"}
            onClick={() => run(it.id, it.filename, it.make, it.id === "3dm" ? "model/vnd.3dm" : "text/plain")}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === it.id ? "…" : it.label}
          </button>
        ))}
        <span className="mx-1 self-center text-neutral-300">|</span>
        <button
          onClick={() =>
            download(`${base}-dossier.json`, dossierJSON(result, contamination, synthesis), "application/json")
          }
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:border-neutral-900"
        >
          dossier.json
        </button>
        <button
          onClick={() =>
            download(`${base}-dossier.md`, dossierMarkdown(result, contamination, synthesis), "text/markdown")
          }
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:border-neutral-900"
        >
          dossier.md
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <p className="mt-2 text-xs text-neutral-400">
        Terrain, contours and boundary share one local-metre origin, so they line up when imported
        together. The .3dm also carries sun path + wind rose + flood plane.
      </p>
    </Card>
  );
}

// --- little helpers --------------------------------------------------------

function Segmented({
  value,
  onChange,
  options,
  big
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  big?: boolean;
}) {
  return (
    <div className={`inline-flex rounded-lg border border-neutral-300 bg-white p-0.5 ${big ? "" : ""}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            "display-font rounded-md uppercase tracking-tight transition",
            big ? "px-4 py-1.5 text-sm" : "px-3 py-1.5 text-xs",
            value === o.value
              ? "bg-neutral-900 text-white"
              : "text-neutral-500 hover:text-neutral-900"
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Missing({ label }: { label: string }) {
  return (
    <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-400">
      No {label} data for this location.
    </p>
  );
}

function candidateSub(c: Candidate, mode: Mode): string {
  if (mode === "superfund") {
    const s = c as SiteCandidate;
    return [s.city, s.county, s.state, s.status].filter(Boolean).join(" · ");
  }
  return (c as GeoPlace).label;
}

function leanBundle(result: AnalyzeResult, contamination: Contamination | null) {
  const { site, climate, flood, topo, meta } = result;
  return {
    mode: meta.mode,
    site: {
      name: site.name,
      address: site.address,
      epaId: site.epaId,
      status: site.status,
      city: site.city,
      county: site.county,
      state: site.state,
      region: site.region,
      category: site.category,
      centroid: site.centroid,
      areaAcres: site.areaAcres,
      hasBoundary: !!site.boundary,
      dates: site.dates
    },
    climate: climate?.summary ?? null,
    flood,
    topo: topo ? { n: topo.n, bbox: topo.bbox, stats: topo.stats } : null,
    contamination
  };
}

function terrainReadout(topo: NonNullable<AnalyzeResult["topo"]>) {
  const { stats, grid, n, bbox } = topo;
  const min = stats.min ?? 0;
  const max = stats.max ?? 0;
  const [w, s, e, nth] = bbox;
  const proj = makeProjector(s, w);
  const [spanX, spanY] = proj.toLocal(e, nth);
  const dx = spanX / (n - 1);
  const dy = spanY / (n - 1);
  // Mean gradient magnitude across interior cells (rise/run → %).
  let sum = 0;
  let count = 0;
  for (let r = 1; r < n - 1; r++) {
    for (let c = 1; c < n - 1; c++) {
      const gx = (grid[r][c + 1] - grid[r][c - 1]) / (2 * dx || 1);
      const gy = (grid[r + 1][c] - grid[r - 1][c]) / (2 * dy || 1);
      sum += Math.sqrt(gx * gx + gy * gy);
      count++;
    }
  }
  const slopePct = count ? (sum / count) * 100 : 0;
  const resMeters = (Math.abs(dx) + Math.abs(dy)) / 2;
  return {
    min,
    max,
    range: max - min,
    slopePct,
    resMeters,
    missing: stats.missing,
    total: stats.total
  };
}

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : (Math.round(v * 10) / 10).toString();
}

function asDate(v: unknown): string | null {
  if (!v) return null;
  const n = Number(v);
  // EPA ships epoch-millis for dates.
  if (Number.isFinite(n) && n > 1e11) return new Date(n).toISOString().slice(0, 10);
  return String(v);
}

function docLabel(k: string): string {
  const map: Record<string, string> = {
    listingNarrative: "Listing narrative",
    progressProfile: "EPA site profile",
    proposedNotice: "Proposed notice",
    finalNotice: "Final notice"
  };
  return map[k] || k;
}
