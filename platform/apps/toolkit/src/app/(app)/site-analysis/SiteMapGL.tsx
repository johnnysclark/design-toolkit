"use client";

// SiteMapGL — the rebuilt Surveyor map, on MapLibre GL (replacing the Leaflet
// SiteMap). One vector base style (OpenFreeMap "liberty", keyless) carries streets,
// labels and extrudable buildings; on top of it we layer:
//   • 3D terrain + hillshade from a keyless AWS terrarium DEM (pitch to read relief)
//   • aerial imagery (Esri), FEMA flood, USGS surface water, NLCD land cover —
//     ArcGIS `export` / WMS rasters driven by MapLibre's {bbox-epsg-3857} token
//   • the analyzed site: study box, boundary, the 3DEP elevation grid (coloured;
//     fabricated cells flagged), the site marker, and OSM context geometry
//   • a PNG export of the live view for the studio pinup / report
//
// Loaded via next/dynamic({ssr:false}) so MapLibre's WebGL/window use never hits
// the server. Every tile source is keyless. All panel/legend text is black.

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Scale, Topo, SiteContext } from "./types";

type LatLon = { lat: number; lon: number };
type Boundary = { type: "MultiPolygon"; coordinates: number[][][][] } | null;
type OverlayKey = "aerial" | "hillshade" | "flood" | "water" | "landcover" | "context";

const VECTOR_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const TERRAIN_DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const FEMA_NFHL = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer";
const USGS_NHD = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer";
const MRLC_WMS = "https://www.mrlc.gov/geoserver/mrlc_display/wms";

const arcgisExport = (base: string, extra = "") =>
  `${base}/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&dpi=96&format=png32&transparent=true&f=image${extra}`;
const wmsGetMap = (layer: string) =>
  `${MRLC_WMS}?service=WMS&version=1.1.1&request=GetMap&layers=${layer}&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`;

const OVERLAYS: { key: OverlayKey; label: string; note?: string }[] = [
  { key: "aerial", label: "Aerial imagery" },
  { key: "hillshade", label: "Hillshade relief" },
  { key: "landcover", label: "Land cover", note: "US" },
  { key: "water", label: "Surface water", note: "US" },
  { key: "flood", label: "Flood zones", note: "US · site zoom" },
  { key: "context", label: "Nearby buildings" }
];

// Sequential elevation ramp (low → high) for the terrain grid dots.
function elevColor(t: number): string {
  const stops: [number, number[]][] = [
    [0, [37, 99, 235]],
    [0.5, [250, 204, 21]],
    [1, [180, 83, 9]]
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0 || 1);
      const c = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(180,83,9)";
}

export default function SiteMapGL({
  centroid,
  bbox,
  boundary,
  topo,
  flood,
  scale,
  picker = false,
  pin = null,
  context = null,
  onPick
}: {
  centroid: LatLon;
  bbox?: [number, number, number, number];
  boundary?: Boundary;
  topo?: Topo | null;
  flood?: { inFloodZone?: boolean; zone?: string } | null;
  scale: Scale;
  picker?: boolean;
  pin?: LatLon | null;
  context?: SiteContext | null;
  onPick?: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [is3d, setIs3d] = useState(false);
  const [exaggeration, setExaggeration] = useState(1.4);
  const [ov, setOv] = useState<Record<OverlayKey, boolean>>({
    aerial: false,
    hillshade: false,
    flood: false,
    water: false,
    landcover: false,
    context: false
  });
  const [ready, setReady] = useState(false);

  // --- create the map once -------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = pin ?? centroid;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: VECTOR_STYLE,
      center: [start.lon, start.lat],
      zoom: picker ? (pin ? 15 : 3.4) : 13,
      pitch: 0,
      attributionControl: { compact: true },
      preserveDrawingBuffer: true // needed for PNG export
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

    map.on("load", () => {
      loadedRef.current = true;
      addBaseSourcesAndLayers(map);
      drawSite(map);
      drawContext(map);
      drawPin(map);
      if (!picker) frame(map, scale, false);
      setReady(true);
    });

    map.on("click", (e) => onPickRef.current?.(e.lngLat.lat, e.lngLat.lng));
    const setCursor = () => (map.getCanvas().style.cursor = onPickRef.current ? "crosshair" : "");
    map.on("mousemove", setCursor);

    return () => {
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- sync overlays -------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const vis = (id: string, on: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    };
    vis("ov-aerial", ov.aerial);
    vis("ov-hillshade", ov.hillshade);
    vis("ov-flood", ov.flood);
    vis("ov-water", ov.water);
    vis("ov-landcover", ov.landcover);
    vis("ctx-fill", ov.context);
    vis("ctx-line", ov.context);
    vis("ctx-roads", ov.context);
  }, [ov, ready]);

  // --- 3D terrain: react to exaggeration WITHOUT moving the camera ---------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.setTerrain(is3d ? { source: "terrain-dem", exaggeration } : null);
  }, [is3d, exaggeration, ready]);

  // --- animate the camera only when 3D actually toggles --------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.easeTo({ pitch: is3d ? 60 : 0, duration: 600 });
  }, [is3d, ready]);

  // --- redraw site geometry + reframe when the analysis changes ------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    drawSite(map);
    if (!picker) frame(map, scale, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroid.lat, centroid.lon, boundary, topo, flood, picker, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || picker) return;
    drawSite(map);
    frame(map, scale, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && loadedRef.current) drawContext(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && loadedRef.current) drawPin(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lon, ready]);

  // --- drawing helpers -----------------------------------------------------
  function firstSymbolId(map: maplibregl.Map): string | undefined {
    return map.getStyle().layers?.find((l) => l.type === "symbol")?.id;
  }

  function addBaseSourcesAndLayers(map: maplibregl.Map) {
    const beforeLabels = firstSymbolId(map);

    map.addSource("terrain-dem", {
      type: "raster-dem",
      tiles: [TERRAIN_DEM],
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 15,
      attribution: "Elevation: Mapzen/AWS Terrain Tiles"
    });
    map.addSource("esri-imagery", {
      type: "raster",
      tiles: [ESRI_IMAGERY],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics"
    });
    map.addSource("fema-flood", {
      type: "raster",
      tiles: [arcgisExport(FEMA_NFHL, "&layers=show:28")],
      tileSize: 256,
      attribution: "Flood: FEMA NFHL"
    });
    map.addSource("usgs-nhd", {
      type: "raster",
      tiles: [arcgisExport(USGS_NHD)],
      tileSize: 256,
      attribution: "Hydrography: USGS NHD"
    });
    map.addSource("nlcd", {
      type: "raster",
      tiles: [wmsGetMap("NLCD_2021_Land_Cover_L48")],
      tileSize: 256,
      attribution: "Land cover: USGS/MRLC NLCD 2021"
    });

    const raster = (id: string, source: string, opacity: number, before?: string) =>
      map.addLayer(
        { id, type: "raster", source, layout: { visibility: "none" }, paint: { "raster-opacity": opacity } },
        before
      );
    raster("ov-aerial", "esri-imagery", 1, beforeLabels);
    map.addLayer(
      {
        id: "ov-hillshade",
        type: "hillshade",
        source: "terrain-dem",
        layout: { visibility: "none" },
        paint: { "hillshade-exaggeration": 0.5 }
      },
      beforeLabels
    );
    raster("ov-landcover", "nlcd", 0.55, beforeLabels);
    raster("ov-water", "usgs-nhd", 0.85, beforeLabels);
    raster("ov-flood", "fema-flood", 0.5, beforeLabels);

    // Empty GeoJSON sources the analysis fills in.
    for (const id of ["site-box", "site-boundary", "site-grid", "site-marker", "ctx", "pin"]) {
      map.addSource(id, { type: "geojson", data: emptyFC() });
    }

    // Context geometry (OSM) — under the site geometry.
    map.addLayer({ id: "ctx-fill", type: "fill", source: "ctx", filter: ["==", ["geometry-type"], "Polygon"], layout: { visibility: "none" }, paint: { "fill-color": ["match", ["get", "kind"], "water", "#38bdf8", "green", "#86efac", "building", "#a3a3a3", "#d4d4d4"], "fill-opacity": 0.45 } });
    map.addLayer({ id: "ctx-line", type: "line", source: "ctx", filter: ["==", ["geometry-type"], "Polygon"], layout: { visibility: "none" }, paint: { "line-color": "#525252", "line-width": 0.6 } });
    map.addLayer({ id: "ctx-roads", type: "line", source: "ctx", filter: ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "kind"], "road"]], layout: { visibility: "none" }, paint: { "line-color": "#737373", "line-width": 1 } });

    // Study box.
    map.addLayer({ id: "site-box", type: "line", source: "site-box", paint: { "line-color": "#737373", "line-width": 1, "line-dasharray": [2, 2] } });
    // Boundary (Superfund).
    map.addLayer({ id: "site-boundary-fill", type: "fill", source: "site-boundary", paint: { "fill-color": "#ea580c", "fill-opacity": 0.12 } });
    map.addLayer({ id: "site-boundary-line", type: "line", source: "site-boundary", paint: { "line-color": "#ea580c", "line-width": 2.5 } });
    // Terrain grid dots (fabricated cells hollow/grey).
    map.addLayer({
      id: "site-grid",
      type: "circle",
      source: "site-grid",
      paint: {
        "circle-radius": 3.4,
        "circle-color": ["case", ["get", "fab"], "#e5e5e5", ["get", "color"]],
        "circle-opacity": ["case", ["get", "fab"], 0.5, 0.75],
        "circle-stroke-color": ["case", ["get", "fab"], "#a3a3a3", "rgba(0,0,0,0)"],
        "circle-stroke-width": ["case", ["get", "fab"], 1, 0]
      }
    });
    // Site marker.
    map.addLayer({ id: "site-marker", type: "circle", source: "site-marker", paint: { "circle-radius": 7, "circle-color": ["get", "color"], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    // Pin.
    map.addLayer({ id: "pin", type: "circle", source: "pin", paint: { "circle-radius": 8, "circle-color": "#111827", "circle-stroke-color": "#fff", "circle-stroke-width": 2.5 } });
  }

  function drawSite(map: maplibregl.Map) {
    const setData = (id: string, data: any) => (map.getSource(id) as maplibregl.GeoJSONSource)?.setData(data);
    if (picker) {
      for (const id of ["site-box", "site-boundary", "site-grid", "site-marker"]) setData(id, emptyFC());
      return;
    }
    // study box
    setData(
      "site-box",
      bbox && bbox.every(Number.isFinite)
        ? fc([poly([[[bbox[0], bbox[1]], [bbox[2], bbox[1]], [bbox[2], bbox[3]], [bbox[0], bbox[3]], [bbox[0], bbox[1]]]])])
        : emptyFC()
    );
    // boundary
    setData("site-boundary", boundary?.coordinates?.length ? { type: "Feature", properties: {}, geometry: boundary } : emptyFC());
    // grid dots (only at site/micro scale, like before)
    if (topo?.grid?.length && scale === "micro") {
      const { grid, n, bbox: tb, stats, missingMask } = topo;
      const [w, s, e, nth] = tb;
      const min = stats.min ?? 0;
      const max = stats.max ?? min + 1;
      const span = max - min || 1;
      const feats: any[] = [];
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const lon = w + ((e - w) * c) / (n - 1);
          const lat = s + ((nth - s) * r) / (n - 1);
          const fab = !!missingMask?.[r]?.[c];
          feats.push(pt([lon, lat], { color: elevColor((grid[r][c] - min) / span), fab }));
        }
      setData("site-grid", fc(feats));
    } else {
      setData("site-grid", emptyFC());
    }
    // marker
    const inFlood = !!flood?.inFloodZone;
    setData("site-marker", fc([pt([centroid.lon, centroid.lat], { color: inFlood ? "#0ea5e9" : "#111827" })]));
  }

  function drawContext(map: maplibregl.Map) {
    const src = map.getSource("ctx") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData((context?.geojson as any) ?? emptyFC());
  }

  function drawPin(map: maplibregl.Map) {
    const src = map.getSource("pin") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(pin && Number.isFinite(pin.lat) ? fc([pt([pin.lon, pin.lat], {})]) : emptyFC());
  }

  function frame(map: maplibregl.Map, s: Scale, animate: boolean) {
    if (s === "micro" && bbox && bbox.every(Number.isFinite)) {
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: animate ? 900 : 0, maxZoom: 18 });
      return;
    }
    map.flyTo({ center: [centroid.lon, centroid.lat], zoom: s === "micro" ? 16 : 12.5, duration: animate ? 900 : 0 });
  }

  function exportPng() {
    const map = mapRef.current;
    if (!map) return;
    map.once("render", () => {
      const url = map.getCanvas().toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "surveyor-map.png";
      a.click();
    });
    map.triggerRepaint();
  }

  return (
    <div className="relative h-full w-full">
      {/* The map container fills the box as an in-flow block. NB: it must NOT rely
          on `absolute inset-0` — MapLibre forces `position: relative` on its own
          `.maplibregl-map` class, overriding Tailwind's `.absolute` (equal
          specificity, later source order), which collapses the element to 0 height. */}
      <div ref={containerRef} className="h-full w-full" style={{ background: "#e5e5e5" }} aria-label="Site map — click to drop a pin and survey that spot" />
      <ControlPanel
        is3d={is3d}
        setIs3d={setIs3d}
        exaggeration={exaggeration}
        setExaggeration={setExaggeration}
        ov={ov}
        setOv={setOv}
        onExport={exportPng}
      />
      {ov.landcover && <Legend />}
    </div>
  );
}

// --- GeoJSON helpers (typed loose; MapLibre wants literal-typed GeoJSON) -----
const emptyFC = (): any => ({ type: "FeatureCollection", features: [] });
const fc = (features: any[]): any => ({ type: "FeatureCollection", features });
const pt = (coordinates: number[], properties: any): any => ({ type: "Feature", properties, geometry: { type: "Point", coordinates } });
const poly = (coordinates: number[][][]): any => ({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates } });

// --- control panel ----------------------------------------------------------
function ControlPanel({
  is3d,
  setIs3d,
  exaggeration,
  setExaggeration,
  ov,
  setOv,
  onExport
}: {
  is3d: boolean;
  setIs3d: (v: boolean) => void;
  exaggeration: number;
  setExaggeration: (v: number) => void;
  ov: Record<OverlayKey, boolean>;
  setOv: (v: Record<OverlayKey, boolean>) => void;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute right-2 top-2 z-[5] text-neutral-900">
      {open ? (
        <div className="w-56 rounded-lg border border-neutral-300 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="display-font text-[11px] uppercase tracking-tight text-neutral-900">Map layers</span>
            <button onClick={() => setOpen(false)} aria-label="Collapse layers" className="text-neutral-900 hover:opacity-60">✕</button>
          </div>

          <button
            onClick={() => setIs3d(!is3d)}
            aria-pressed={is3d}
            className={`mb-2 w-full rounded-md border px-2 py-1.5 text-[12px] font-medium transition ${is3d ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900"}`}
          >
            {is3d ? "▣ 3D terrain — on" : "△ 3D terrain — off"}
          </button>
          {is3d && (
            <label className="mb-2 block text-[11px] text-neutral-900">
              Vertical exaggeration ×{exaggeration.toFixed(1)}
              <input type="range" min={1} max={3} step={0.2} value={exaggeration} onChange={(e) => setExaggeration(Number(e.target.value))} className="mt-1 w-full accent-neutral-900" />
            </label>
          )}

          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">Overlays</div>
          <div className="space-y-1.5">
            {OVERLAYS.map((o) => (
              <label key={o.key} className="flex cursor-pointer items-center gap-2 text-[12px] text-neutral-900">
                <input type="checkbox" checked={ov[o.key]} onChange={(e) => setOv({ ...ov, [o.key]: e.target.checked })} className="h-3.5 w-3.5 accent-neutral-900" />
                <span>{o.label}</span>
                {o.note && <span className="ml-auto text-[9px] uppercase tracking-wide text-neutral-900">{o.note}</span>}
              </label>
            ))}
          </div>

          <button onClick={onExport} className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-[12px] font-medium text-neutral-900 hover:border-neutral-900">⬇ Export map image (PNG)</button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="display-font rounded-lg border border-neutral-300 bg-white/95 px-3 py-1.5 text-[11px] uppercase tracking-tight text-neutral-900 shadow-lg backdrop-blur hover:border-neutral-900">▦ Layers · 3D</button>
      )}
    </div>
  );
}

const NLCD_LEGEND: [string, string][] = [
  ["#466b9f", "Water"],
  ["#b3ac9f", "Developed/built"],
  ["#68aa63", "Forest"],
  ["#ccba7c", "Shrub/grass"],
  ["#dbd83d", "Crops/pasture"],
  ["#b8d9eb", "Wetlands"]
];
function Legend() {
  return (
    <div className="absolute bottom-8 right-2 z-[5] rounded-lg border border-neutral-300 bg-white/95 p-2 text-[10px] text-neutral-900 shadow">
      <div className="mb-1 font-semibold uppercase tracking-wide">Land cover (NLCD)</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {NLCD_LEGEND.map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
