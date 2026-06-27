"use client";

// Client-only Leaflet map (vanilla — react-leaflet lags React 19).
//
// Two jobs in one component:
//   1. PICKER — before a site is chosen, the map is live: click anywhere to drop a
//      pin and survey that spot (the parent reverse-geocodes + analyzes it). Works
//      as a second way in alongside the search box.
//   2. RESULT — once a site is analyzed, it frames the site and draws the study box,
//      boundary, elevation grid and site marker.
//
// A layer panel (top-right) switches the basemap (street / aerial / topographic) and
// stacks thematic overlays — terrain relief, surface water, flood zones, labels —
// the same physical systems the data cards read out. Every layer is keyless and
// loads as plain <img> tiles (no CORS needed): OSM, Esri ArcGIS Online, OpenTopoMap,
// and ArcGIS `export` images from USGS NHD + FEMA NFHL.
//
// Leaflet touches `window`, so the JS is dynamic-imported inside an effect (never on
// the server); only the stylesheet is a static import.

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Scale, Topo } from "./types";

type LatLon = { lat: number; lon: number };
type Boundary = { type: "MultiPolygon"; coordinates: number[][][][] } | null;
type Base = "streets" | "satellite" | "topo";
type OverlayKey = "hillshade" | "water" | "flood" | "labels";

const MACRO_ZOOM = 12;

// --- Web-Mercator tile maths, so ArcGIS dynamic services (FEMA, USGS) can be driven
// as ordinary {z}/{x}/{y} tile layers: each tile becomes one `export` image request
// for that tile's 3857 bounding box. One round-trip per tile, loaded as an <img>.
const MERC_R = 6378137;
const MERC_ORIGIN = Math.PI * MERC_R; // 20037508.342789244
function tile3857(x: number, y: number, z: number) {
  const size = (2 * MERC_ORIGIN) / Math.pow(2, z);
  const xmin = -MERC_ORIGIN + x * size;
  const ymax = MERC_ORIGIN - y * size;
  return { xmin, ymin: ymax - size, xmax: xmin + size, ymax };
}
function arcgisExportUrl(base: string, coords: { x: number; y: number; z: number }, extra: string) {
  const b = tile3857(coords.x, coords.y, coords.z);
  return (
    `${base}/export?bbox=${b.xmin},${b.ymin},${b.xmax},${b.ymax}` +
    `&bboxSR=3857&imageSR=3857&size=256,256&dpi=96&format=png32&transparent=true&f=image${extra}`
  );
}

// Tile endpoints (all keyless, probed live).
const TILES = {
  streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  hillshade:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
  labels:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
};
const FEMA_NFHL = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer";
const USGS_NHD = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer";

// The overlay catalogue — drives both the Leaflet layers and the panel UI.
const OVERLAYS: { key: OverlayKey; label: string; note?: string }[] = [
  { key: "hillshade", label: "Terrain relief" },
  { key: "water", label: "Surface water", note: "US" },
  { key: "flood", label: "Flood zones", note: "US · site zoom" },
  { key: "labels", label: "Labels & roads" }
];

const BASES: { key: Base; label: string }[] = [
  { key: "satellite", label: "Aerial" },
  { key: "streets", label: "Street" },
  { key: "topo", label: "Topo" }
];

// A teardrop pin (HTML, no image asset → no broken-icon issue) for the dropped point.
function pinIcon(L: any) {
  return L.divIcon({
    className: "",
    html:
      '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.8 20.2 0 13 0z" ' +
      'fill="#111827" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="13" cy="13" r="4.5" fill="#fff"/></svg>',
    iconSize: [26, 34],
    iconAnchor: [13, 34]
  });
}

// Sequential elevation ramp (low → high), used for the micro terrain dots.
function elevColor(t: number): string {
  const stops: [number, number[]][] = [
    [0, [37, 99, 235]], // blue (low)
    [0.5, [250, 204, 21]], // yellow (mid)
    [1, [180, 83, 9]] // brown (high)
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

export default function SiteMap({
  centroid,
  bbox,
  boundary,
  topo,
  flood,
  scale,
  picker = false,
  pin = null,
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
  onPick?: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const basesRef = useRef<Record<Base, any>>({} as any);
  const ovRef = useRef<Record<OverlayKey, any>>({} as any);
  const dataRef = useRef<any>(null); // analyzed vectors (study box, boundary, dots, site marker)
  const pinRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [base, setBase] = useState<Base>("satellite");
  const [ov, setOv] = useState<Record<OverlayKey, boolean>>({
    hillshade: false,
    water: false,
    flood: false,
    labels: true
  });

  // Create the map + every layer once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      const start = pin ?? centroid;
      const map = L.map(containerRef.current, {
        center: [start.lat, start.lon],
        zoom: picker ? (pin ? 15 : 4) : MACRO_ZOOM,
        maxZoom: 19,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true
      });

      // Stacking panes: basemap (default tilePane, 200) < thematic overlays < the
      // analyzed vectors (overlayPane, 400) < markers. Labels ride on top of the
      // thematic overlays but under the site geometry.
      const panes: [string, number][] = [
        ["sa-hillshade", 210],
        ["sa-water", 220],
        ["sa-flood", 230],
        ["sa-labels", 340]
      ];
      for (const [name, z] of panes) {
        map.createPane(name);
        map.getPane(name)!.style.zIndex = String(z);
      }

      basesRef.current = {
        streets: L.tileLayer(TILES.streets, {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors"
        }),
        satellite: L.tileLayer(TILES.satellite, {
          maxZoom: 19,
          attribution: "Imagery © Esri, Maxar, Earthstar Geographics"
        }),
        topo: L.tileLayer(TILES.topo, {
          maxZoom: 19,
          maxNativeZoom: 17,
          attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors"
        })
      };

      // ArcGIS `export` services as tile layers (FEMA flood, USGS hydrography).
      const ExportLayer = (L.TileLayer as any).extend({
        getTileUrl(coords: any) {
          return arcgisExportUrl(this.options.base, coords, this.options.extra || "");
        }
      });

      ovRef.current = {
        hillshade: L.tileLayer(TILES.hillshade, {
          pane: "sa-hillshade",
          opacity: 0.5,
          maxZoom: 19,
          attribution: "Hillshade © Esri"
        }),
        water: new ExportLayer("", {
          base: USGS_NHD,
          extra: "",
          pane: "sa-water",
          opacity: 0.85,
          minZoom: 8,
          maxZoom: 19,
          attribution: "Hydrography: USGS National Hydrography Dataset"
        }),
        flood: new ExportLayer("", {
          base: FEMA_NFHL,
          extra: "&layers=show:28",
          pane: "sa-flood",
          opacity: 0.5,
          minZoom: 11,
          maxZoom: 19,
          attribution: "Flood: FEMA National Flood Hazard Layer"
        }),
        labels: L.tileLayer(TILES.labels, {
          pane: "sa-labels",
          opacity: 0.9,
          maxZoom: 19
        })
      };

      dataRef.current = L.layerGroup().addTo(map);

      // Click-to-drop-a-pin (live in both picker and result views — click anywhere to
      // survey a new spot). Read through a ref so the handler never goes stale.
      map.on("click", (e: any) => onPickRef.current?.(e.latlng.lat, e.latlng.lng));

      mapRef.current = map;
      syncLayers();
      drawData();
      drawPin();
      if (!picker) frame(scale, false);
      setTimeout(() => map.invalidateSize(), 0);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Crosshair cursor while picking is enabled.
  useEffect(() => {
    if (containerRef.current) containerRef.current.style.cursor = onPick ? "crosshair" : "";
  }, [onPick]);

  // Apply the basemap + overlay selection to Leaflet.
  useEffect(() => {
    syncLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, ov]);

  // Redraw the analyzed geometry + reframe when the site (or flood result) changes,
  // or when picker flips off. `flood` is a dep so the site marker recolors.
  useEffect(() => {
    if (!mapRef.current) return;
    drawData();
    if (!picker) frame(scale, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroid.lat, centroid.lon, boundary, topo, flood, picker]);

  // Move/clear the dropped pin.
  useEffect(() => {
    drawPin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lon]);

  // Animate scale changes (zoom + framing) once a site is analyzed. Also redraw: the
  // terrain elevation dots are gated on scale === "micro" and every analysis starts
  // at macro, so without this they never appear on the first Macro→Micro flip.
  useEffect(() => {
    if (!mapRef.current || picker) return;
    drawData();
    frame(scale, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  function syncLayers() {
    const map = mapRef.current;
    if (!map) return;
    for (const k of Object.keys(basesRef.current) as Base[]) {
      const layer = basesRef.current[k];
      if (k === base) {
        if (!map.hasLayer(layer)) layer.addTo(map);
      } else if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
    for (const k of Object.keys(ovRef.current) as OverlayKey[]) {
      const layer = ovRef.current[k];
      if (ov[k]) {
        if (!map.hasLayer(layer)) layer.addTo(map);
      } else if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  }

  function frame(s: Scale, animate: boolean) {
    const map = mapRef.current;
    if (!map) return;
    if (s === "micro") {
      const b = microBounds();
      if (b) {
        map.flyToBounds(b, { padding: [28, 28], duration: animate ? 1.1 : 0, maxZoom: 18 });
        return;
      }
      map.flyTo([centroid.lat, centroid.lon], 17, { duration: animate ? 1.1 : 0 });
    } else {
      map.flyTo([centroid.lat, centroid.lon], MACRO_ZOOM, { duration: animate ? 1.1 : 0 });
    }
  }

  function microBounds(): any {
    const L = LRef.current;
    if (!L) return null;
    if (bbox && bbox.every((v) => Number.isFinite(v))) {
      const [w, s, e, n] = bbox;
      return L.latLngBounds([s, w], [n, e]);
    }
    return null;
  }

  function drawPin() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (pinRef.current) {
      map.removeLayer(pinRef.current);
      pinRef.current = null;
    }
    if (pin && Number.isFinite(pin.lat) && Number.isFinite(pin.lon)) {
      pinRef.current = L.marker([pin.lat, pin.lon], { icon: pinIcon(L), interactive: false }).addTo(map);
    }
  }

  function drawData() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = dataRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    if (picker) return; // nothing analyzed yet

    // Study-area box (the terrain footprint).
    if (bbox && bbox.every((v) => Number.isFinite(v))) {
      const [w, s, e, n] = bbox;
      L.rectangle(
        [
          [s, w],
          [n, e]
        ],
        { color: "#737373", weight: 1, dashArray: "4 4", fill: false }
      ).addTo(layer);
    }

    // Boundary polygon (Superfund mode).
    if (boundary && boundary.coordinates?.length) {
      L.geoJSON(boundary as any, {
        style: { color: "#ea580c", weight: 2.5, fillColor: "#ea580c", fillOpacity: 0.12 }
      }).addTo(layer);
    }

    // Terrain elevation dots over the grid (micro layer; subtle).
    if (topo && topo.grid?.length && scale === "micro") {
      const { grid, n, bbox: tb, stats } = topo;
      const [w, s, e, nth] = tb;
      const min = stats.min ?? 0;
      const max = stats.max ?? min + 1;
      const span = max - min || 1;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const lon = w + ((e - w) * c) / (n - 1);
          const lat = s + ((nth - s) * r) / (n - 1);
          L.circleMarker([lat, lon], {
            radius: 3,
            stroke: false,
            fillColor: elevColor((grid[r][c] - min) / span),
            fillOpacity: 0.55
          }).addTo(layer);
        }
      }
    }

    // The site point itself.
    const inFlood = !!flood?.inFloodZone;
    L.circleMarker([centroid.lat, centroid.lon], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: inFlood ? "#0ea5e9" : "#111827",
      fillOpacity: 1
    })
      .addTo(layer)
      .bindTooltip(inFlood ? `Flood zone ${flood?.zone ?? ""}`.trim() : "Site", {
        direction: "top",
        offset: [0, -6]
      });
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ background: "#e5e5e5" }}
        aria-label="Site map — click to drop a pin"
      />
      <LayerPanel base={base} setBase={setBase} ov={ov} setOv={setOv} />
    </div>
  );
}

// --- Layer toggle panel (sibling of the map div, so its clicks never reach Leaflet) ---

function LayerPanel({
  base,
  setBase,
  ov,
  setOv
}: {
  base: Base;
  setBase: (b: Base) => void;
  ov: Record<OverlayKey, boolean>;
  setOv: (v: Record<OverlayKey, boolean>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute right-2 top-2 z-[1000] text-neutral-900">
      {open ? (
        <div className="w-52 rounded-lg border border-neutral-300 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="display-font text-[11px] uppercase tracking-tight">Layers</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Collapse layers"
              className="text-neutral-900 hover:opacity-60"
            >
              ✕
            </button>
          </div>

          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
            Basemap
          </div>
          <div className="mb-3 grid grid-cols-3 gap-1">
            {BASES.map((b) => (
              <button
                key={b.key}
                onClick={() => setBase(b.key)}
                className={[
                  "rounded-md border px-1.5 py-1 text-[11px] font-medium transition",
                  base === b.key
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900"
                ].join(" ")}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
            Overlays
          </div>
          <div className="space-y-1.5">
            {OVERLAYS.map((o) => (
              <label
                key={o.key}
                className="flex cursor-pointer items-center gap-2 text-[12px] text-neutral-900"
              >
                <input
                  type="checkbox"
                  checked={ov[o.key]}
                  onChange={(e) => setOv({ ...ov, [o.key]: e.target.checked })}
                  className="h-3.5 w-3.5 accent-neutral-900"
                />
                <span>{o.label}</span>
                {o.note && (
                  <span className="ml-auto text-[9px] uppercase tracking-wide text-neutral-900">
                    {o.note}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="display-font rounded-lg border border-neutral-300 bg-white/95 px-3 py-1.5 text-[11px] uppercase tracking-tight shadow-lg backdrop-blur hover:border-neutral-900"
        >
          ▦ Layers
        </button>
      )}
    </div>
  );
}
