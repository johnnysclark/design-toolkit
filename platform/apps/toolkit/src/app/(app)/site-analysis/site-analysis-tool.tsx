"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import FullscreenButton from "@/components/FullscreenButton";
import ModelToggle, { useModelTier, type ModelTier } from "@/components/ModelToggle";
import Link from "next/link";
import { Card, Stat, CoverageStrip } from "./ui";
import { ClimateSection, TerrainSection, GroundSection, HazardsSection, ContextSection } from "./cards";
import { SynthesisStrip, ContaminationPanel } from "./ai";
import SiteChat from "./chat";
import SiteSources from "./sources";
import BlindVsGrounded from "./blind-grounded";
import FurtherResources from "./resources";
import { buildExportList, download, dossierJSON, dossierMarkdown, metricsCSV, slug } from "./exports";
import type {
  Mode,
  Scale,
  AnalyzeResult,
  Contamination,
  Synthesis,
  GeoPlace,
  SiteCandidate,
  SiteContext
} from "./types";

// MapLibre touches WebGL/window — load it client-only so it never hits the server.
const SiteMapGL = dynamic(() => import("./SiteMapGL"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-neutral-100 text-sm text-neutral-900">Loading map…</div>
  )
});

type Candidate = GeoPlace | SiteCandidate;

const PLACE_EXAMPLES = ["Millennium Park, Chicago", "Venice, Italy", "1600 Pennsylvania Ave"];
const SUPERFUND_EXAMPLES = ["Love Canal", "Times Beach", "Berkeley Pit"];
const US_CENTER = { lat: 39.5, lon: -98.35 };

// Parse a response defensively (a timeout can return a non-JSON body).
async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 504 || /timed out|timeout|FUNCTION_INVOCATION_TIMEOUT|took too long|an error occurred/i.test(text)) {
      throw new Error("That site took too long and the request timed out. Try again — very large sites can be slow.");
    }
    throw new Error(`The server returned an unexpected response (HTTP ${res.status}). Please try again.`);
  }
}

export default function SiteAnalysisTool({ signedIn }: { signedIn: boolean }) {
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("place");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Map frame only (Region ⇄ Site) — the DATA always shows; this just reframes the
  // map and toggles the on-map elevation grid. Land on the Site after an analysis.
  const [scale, setScale] = useState<Scale>("micro");
  // OSM context geometry — loaded on demand, shared between the map overlay and the
  // Surroundings card.
  const [context, setContext] = useState<SiteContext | null>(null);

  const [contamination, setContamination] = useState<Contamination | null>(null);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPhase, setAiPhase] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [tier, setTier] = useModelTier("surveyor");

  const abortRef = useRef<AbortController | null>(null);

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
        const res = await fetch(`/api/site-analysis/search?mode=${mode}&q=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal });
        const data = await readJson(res);
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
    setResult(null);
    setAnalyzeError(null);
    setContamination(null);
    setSynthesis(null);
    setContext(null);
    setScale("micro");
    setPin(null);
  }

  async function analyze(payload: Record<string, unknown>, display: string) {
    setOpen(false);
    setCandidates([]);
    setQuery(display);
    setContamination(null);
    setSynthesis(null);
    setContext(null);
    setAiError(null);
    setScale("micro");
    setAnalyzing(true);
    setAnalyzeError(null);
    setResult(null);
    try {
      const res = await fetch("/api/site-analysis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.error || "Analysis failed.");
      setResult(data as AnalyzeResult);
      setPin(null);
    } catch (e: any) {
      setAnalyzeError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function selectCandidate(c: Candidate) {
    if (mode === "superfund") {
      const s = c as SiteCandidate;
      return analyze({ epaId: s.epaId }, s.name);
    }
    const p = c as GeoPlace;
    return analyze({ lat: p.lat, lon: p.lon, label: p.label, category: p.category }, p.shortLabel);
  }

  async function pickPoint(lat: number, lon: number) {
    if (mode !== "place") setMode("place");
    setPin({ lat, lon });
    setOpen(false);
    setCandidates([]);
    let label = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    let shortLabel = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    let category: string | null = null;
    try {
      const res = await fetch(`/api/site-analysis/search?lat=${lat}&lon=${lon}`);
      const data = await readJson(res);
      if (res.ok && data?.place) {
        label = data.place.label || label;
        shortLabel = data.place.shortLabel || shortLabel;
        category = data.place.category ?? null;
      }
    } catch {
      /* keep the coordinate label */
    }
    await analyze({ lat, lon, label, category }, shortLabel);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setAnalyzeError("This browser can't share a location. Search or click the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        pickPoint(p.coords.latitude, p.coords.longitude);
      },
      () => {
        setLocating(false);
        setAnalyzeError("Couldn't get your location. Search or click the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
          body: JSON.stringify({ epaId: result.site.epaId, grounded: true, tier })
        });
        const cd = await readJson(cr);
        if (cr.status === 401) throw new Error("Sign in to run the AI analysis.");
        if (!cr.ok) throw new Error(cd?.error || "Contamination pass failed.");
        contam = cd.contamination as Contamination;
        setContamination(contam);
      }
      setAiPhase("Reading the data for design…");
      const sr = await fetch("/api/site-analysis/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: leanBundle(result, contam), tier })
      });
      const sd = await readJson(sr);
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
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Surveyor <span className="font-sans text-lg font-normal normal-case text-neutral-900">— Site Analysis</span>
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-900">
          The measured ground of a real place — climate &amp; comfort, terrain, soils, land cover, water, hazards and
          surroundings — with Rhino-ready exports. Hard data is free and sourced; AI judgment is tagged for you to verify.
        </p>
      </header>

      {/* control bar */}
      <div className="sticky top-14 z-20 -mx-2 border-b border-neutral-200 bg-neutral-50/90 px-2 py-3 backdrop-blur">
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
              role="combobox"
              aria-expanded={open && candidates.length > 0}
              aria-controls="surveyor-search-results"
              aria-autocomplete="list"
              placeholder={mode === "superfund" ? "Search an EPA Superfund site by name…" : "Search any address, city, or landmark…"}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
            />
            <span className="sr-only" role="status" aria-live="polite">
              {searching ? "Searching…" : candidates.length ? `${candidates.length} results` : ""}
            </span>
            {searching && <span aria-hidden className="absolute right-3 top-2.5 text-xs text-neutral-900">…</span>}
            {open && candidates.length > 0 && (
              <ul id="surveyor-search-results" role="listbox" className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
                {candidates.map((c, i) => (
                  <li key={i} role="option" aria-selected={false}>
                    <button
                      onClick={() => selectCandidate(c)}
                      className="flex w-full flex-col items-start gap-0.5 border-b border-neutral-100 px-3 py-2 text-left last:border-0 hover:bg-neutral-50"
                    >
                      <span className="text-sm font-medium text-neutral-900">{"shortLabel" in c ? (c as GeoPlace).shortLabel : c.name}</span>
                      <span className="line-clamp-1 text-xs text-neutral-900">{candidateSub(c, mode)}</span>
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
                { value: "macro", label: "◍ Region" },
                { value: "micro", label: "⌖ Site" }
              ]}
            />
          )}
        </div>
        {searchError && <p className="mt-2 text-xs text-neutral-900">{searchError}</p>}
        {!result && !analyzing && (
          <p className="mt-2 text-xs text-neutral-900">
            Try{" "}
            {(mode === "superfund" ? SUPERFUND_EXAMPLES : PLACE_EXAMPLES).map((ex, i) => (
              <button key={ex} onClick={() => analyzeExample(ex)} className="underline decoration-dotted underline-offset-2 hover:text-neutral-700">
                {ex}
                {i < 2 ? ", " : ""}
              </button>
            ))}
          </p>
        )}
      </div>

      {/* the map — always live; a picker before a site is chosen, the analyzed site after */}
      <div>
        <div ref={mapBoxRef} className="relative h-[480px] w-full overflow-hidden rounded-xl border border-neutral-200">
          <FullscreenButton targetRef={mapBoxRef} label="map" className="absolute left-2 top-28 z-10" />
          <SiteMapGL
            centroid={result ? result.site.centroid : US_CENTER}
            bbox={result?.site.bbox}
            boundary={result?.site.boundary ?? null}
            topo={result?.topo ?? null}
            flood={result?.flood ?? null}
            scale={scale}
            picker={!result}
            pin={pin}
            context={context}
            onPick={pickPoint}
          />
        </div>
        {result ? (
          <p className="mt-2 text-center text-xs text-neutral-900">
            {scale === "macro" ? "Region view." : "Site view — with the terrain grid."} Pan/zoom or tilt to 3D in the ▦ panel. Click anywhere to survey a new spot.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-neutral-900">
            <span>Click anywhere on the map to drop a pin and survey that spot — or search above.</span>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 font-medium text-neutral-900 hover:border-neutral-900 disabled:opacity-50"
            >
              {locating ? "Locating…" : "⌖ Use my location"}
            </button>
            <span>Toggle aerial, terrain, land cover + flood layers in the ▦ panel.</span>
          </div>
        )}
      </div>

      {analyzing && (
        <div role="status" aria-live="polite" className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-900">
          Pulling the measured ground — climate, terrain, soils, land cover, water, hazards…
        </div>
      )}
      {analyzeError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-neutral-900">
          {analyzeError}
        </div>
      )}

      {result && (
        <Results
          result={result}
          mode={mode}
          signedIn={signedIn}
          contamination={contamination}
          synthesis={synthesis}
          aiLoading={aiLoading}
          aiPhase={aiPhase}
          aiError={aiError}
          onRunAI={runAI}
          tier={tier}
          setTier={setTier}
          onContext={setContext}
        />
      )}

      <FurtherResources />
    </div>
  );

  function analyzeExample(ex: string) {
    setQuery(ex);
    setOpen(true);
  }
}

// ---------------------------------------------------------------------------

function Results({
  result,
  mode,
  signedIn,
  contamination,
  synthesis,
  aiLoading,
  aiPhase,
  aiError,
  onRunAI,
  tier,
  setTier,
  onContext
}: {
  result: AnalyzeResult;
  mode: Mode;
  signedIn: boolean;
  contamination: Contamination | null;
  synthesis: Synthesis | null;
  aiLoading: boolean;
  aiPhase: string;
  aiError: string | null;
  onRunAI: () => void;
  tier: ModelTier;
  setTier: (t: ModelTier) => void;
  onContext: (c: SiteContext | null) => void;
}) {
  const { site, coverage } = result;
  const siteKey = site.epaId || `${site.centroid.lat},${site.centroid.lon}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-font text-2xl uppercase leading-tight tracking-tight text-neutral-900">{site.name}</h2>
          <p className="text-sm text-neutral-900">
            {site.address || `${site.centroid.lat.toFixed(4)}, ${site.centroid.lon.toFixed(4)}`}
            {site.status ? ` · ${site.status}` : ""}
          </p>
        </div>
        <CoverageStrip coverage={coverage} mode={mode} />
      </div>

      <OverviewSection result={result} mode={mode} />
      <ClimateSection result={result} synthesis={synthesis} />
      <TerrainSection result={result} synthesis={synthesis} />
      <GroundSection result={result} />
      <HazardsSection result={result} synthesis={synthesis} />
      <ContextSection key={siteKey} centroid={site.centroid} onContext={onContext} />

      {/* AI band */}
      <div className="space-y-5">
        {signedIn && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-900">AI depth</span>
            <ModelToggle value={tier} onChange={setTier} size="sm" disabled={aiLoading} />
          </div>
        )}
        {signedIn && (
          <SiteSources
            key={`src-${siteKey}`}
            place={chatContext(result, contamination, synthesis).place}
            context={chatContext(result, contamination, synthesis)}
            tier={tier}
          />
        )}
        <AiControls mode={mode} signedIn={signedIn} hasSynthesis={!!synthesis} aiLoading={aiLoading} aiPhase={aiPhase} aiError={aiError} onRunAI={onRunAI} />
        {contamination && <ContaminationPanel contamination={contamination} />}
        {synthesis && <SynthesisStrip synthesis={synthesis} />}
        {signedIn && <BlindVsGrounded key={`bvg-${siteKey}`} place={chatContext(result, contamination, synthesis).place} tier={tier} />}
        {signedIn && <SiteChat key={`chat-${siteKey}`} context={chatContext(result, contamination, synthesis)} tier={tier} />}
      </div>

      <Exports result={result} contamination={contamination} synthesis={synthesis} />
    </div>
  );
}

// --- Overview / regional position ------------------------------------------

function OverviewSection({ result, mode }: { result: AnalyzeResult; mode: Mode }) {
  const { site, climate } = result;
  const docs = site.documents || {};
  return (
    <Card
      title="Site overview"
      source={mode === "superfund" ? "US EPA National Priorities List (Superfund) record." : "Geocoded via OpenStreetMap / Nominatim."}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Coordinates" value={`${site.centroid.lat.toFixed(4)}, ${site.centroid.lon.toFixed(4)}`} hint="Latitude, longitude (WGS84)." />
        {climate && <Stat label="Elevation" value={`${Math.round(climate.summary.elevation)} m`} hint="From the Open-Meteo model." />}
        {climate && <Stat label="Timezone" value={climate.summary.timezone} />}
        {mode === "superfund" ? (
          <>
            <Stat label="EPA Region" value={site.region ?? "—"} />
            <Stat label="State / county" value={[site.state, site.county].filter(Boolean).join(" · ") || "—"} />
            <Stat label="NPL status" value={site.status ?? "—"} />
            <Stat label="EPA ID" value={site.epaId ?? "—"} />
            <Stat label="Area" value={site.areaAcres != null ? `${fmt(site.areaAcres)} ac` : "—"} hint="From the EPA boundary layer (unit-converted)." />
          </>
        ) : (
          <>
            {site.category && <Stat label="Type" value={site.category.replace("/", " · ")} />}
            <Stat label="Address" value={site.address ?? "—"} />
          </>
        )}
      </div>
      {mode === "superfund" && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
          {Object.entries(docs).map(([k, v]) =>
            v?.url ? (
              <a key={k} href={v.url} target="_blank" rel="noreferrer" className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-900 hover:bg-neutral-200">
                {docLabel(k)} ↗
              </a>
            ) : null
          )}
        </div>
      )}
    </Card>
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
  const runLabel = mode === "superfund" ? "Run contamination + design synthesis" : "Run design synthesis";
  return (
    <Card accent title="AI reading (spends the studio's key)">
      {!signedIn ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-neutral-900">
            The map, all data, charts and every export above are free and need no account. The AI passes
            {mode === "superfund" ? " (contamination brief + design synthesis)" : " (design synthesis)"} are for signed-in studio members — they spend the Anthropic key.
          </p>
          <Link href="/login" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Sign in to run the AI
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <button onClick={onRunAI} disabled={aiLoading} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {aiLoading ? aiPhase || "Working…" : hasSynthesis ? "Re-run AI reading" : runLabel}
          </button>
          <p className="text-xs text-neutral-900">
            Reasons only over the hard data above{mode === "superfund" ? " + a web-cited EPA contamination brief" : ""}. Every claim is tagged for you to verify.
          </p>
          {aiError && <p role="alert" className="text-sm text-neutral-900">{aiError}</p>}
        </div>
      )}
    </Card>
  );
}

// --- Exports ---------------------------------------------------------------

function Exports({ result, contamination, synthesis }: { result: AnalyzeResult; contamination: Contamination | null; synthesis: Synthesis | null }) {
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
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === it.id ? "…" : it.label}
          </button>
        ))}
        <span className="mx-1 self-center text-neutral-300">|</span>
        <button
          onClick={() => download(`${base}-dossier.json`, dossierJSON(result, contamination, synthesis), "application/json")}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:border-neutral-900"
        >
          dossier.json
        </button>
        <button
          onClick={() => download(`${base}-dossier.md`, dossierMarkdown(result, contamination, synthesis), "text/markdown")}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:border-neutral-900"
        >
          dossier.md
        </button>
        <button
          onClick={() => download(`${base}-metrics.csv`, metricsCSV(result), "text/csv")}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:border-neutral-900"
        >
          metrics.csv
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-neutral-900">{err}</p>}
      <p className="mt-2 text-xs text-neutral-900">
        Terrain, contours and boundary share one local-metre origin, so they line up when imported together. The .3dm also carries
        sun path + wind rose + flood plane. The map’s ▦ panel exports a PNG for your pinup.
      </p>
    </Card>
  );
}

// --- helpers ---------------------------------------------------------------

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
    <div role="radiogroup" className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={[
            "display-font rounded-md uppercase tracking-tight transition",
            big ? "px-4 py-1.5 text-sm" : "px-3 py-1.5 text-xs",
            value === o.value ? "bg-neutral-900 text-white" : "text-neutral-900 hover:text-neutral-900"
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function candidateSub(c: Candidate, mode: Mode): string {
  if (mode === "superfund") {
    const s = c as SiteCandidate;
    return [s.city, s.county, s.state, s.status].filter(Boolean).join(" · ");
  }
  return (c as GeoPlace).label;
}

// Compact bundle handed to the synthesis pass — now includes the new domains so
// the AI reasons over soils/landcover/watershed/seismic + the deep climate/terrain
// metrics, not just the four original layers.
function leanBundle(result: AnalyzeResult, contamination: Contamination | null) {
  const { site, climate, flood, topo, terrainDeep, soils, landcover, watershed, seismic, meta } = result;
  const deep = climate?.deep;
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
      hasBoundary: !!site.boundary
    },
    climate: climate?.summary ?? null,
    climateDeep: deep
      ? {
          comfort: deep.comfort,
          designDays: deep.designDays,
          facadeSolar: deep.facadeSolar,
          topStrategies: deep.strategies.slice(0, 4),
          seasonalWind: deep.seasonalWind,
          water: deep.water
        }
      : null,
    flood,
    terrain: topo ? { stats: topo.stats } : null,
    terrainDeep,
    soils,
    landcover,
    watershed,
    seismic,
    contamination
  };
}

function chatContext(result: AnalyzeResult, contamination: Contamination | null, synthesis: Synthesis | null) {
  const { site, climate, flood, topo, terrainDeep, soils, landcover, watershed, seismic, meta } = result;
  return {
    mode: meta.mode,
    place: {
      name: site.name,
      address: site.address,
      epaId: site.epaId,
      status: site.status,
      city: site.city,
      county: site.county,
      state: site.state,
      region: site.region,
      category: site.category,
      coordinates: site.centroid,
      areaAcres: site.areaAcres
    },
    climate: climate
      ? {
          source: climate.summary.source,
          prevailingWind: climate.summary.prevailingWind,
          annual: climate.summary.annual,
          comfort: climate.deep.comfort,
          designDays: climate.deep.designDays,
          timezone: climate.summary.timezone,
          elevation: climate.summary.elevation
        }
      : null,
    terrain: topo ? { stats: topo.stats, deep: terrainDeep } : null,
    flood,
    soils,
    landcover,
    watershed,
    seismic,
    aiReading: synthesis
      ? {
          site_in_a_sentence: synthesis.site_in_a_sentence,
          key_tensions: synthesis.key_tensions,
          cannot_tell_you: synthesis.what_this_analysis_cannot_tell_you
        }
      : null,
    contamination: contamination
      ? { summary: contamination.summary, contaminants: contamination.contaminants_of_concern?.map((c) => c.name), remediation: contamination.remediation_status }
      : null
  };
}

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : (Math.round(v * 10) / 10).toString();
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
