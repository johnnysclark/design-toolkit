"use client";

// Client-only Leaflet map (vanilla — react-leaflet lags React 19). Keyless tiles:
// OpenStreetMap street tiles for the MACRO/regional view, Esri World Imagery for
// the MICRO/aerial view — matching the toggle. flyTo animates between scales.
//
// Leaflet touches `window`, so the JS is dynamic-imported inside an effect (never
// on the server); only the stylesheet is a static import.

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Scale, Topo } from "./types";

type LatLon = { lat: number; lon: number };
type Boundary = { type: "MultiPolygon"; coordinates: number[][][][] } | null;

const MACRO_ZOOM = 12;

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
  scale
}: {
  centroid: LatLon;
  bbox?: [number, number, number, number];
  boundary?: Boundary;
  topo?: Topo | null;
  flood?: { inFloodZone?: boolean; zone?: string } | null;
  scale: Scale;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const streetRef = useRef<any>(null);
  const imageryRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const labelsRef = useRef<any>(null);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      const map = L.map(containerRef.current, {
        center: [centroid.lat, centroid.lon],
        zoom: MACRO_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true
      });

      streetRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors"
        }
      );
      imageryRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Imagery © Esri, Maxar, Earthstar Geographics"
        }
      );
      // Faint place labels over the aerial so the micro view stays legible.
      labelsRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.9 }
      );
      overlayRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;
      applyBase(scale);
      drawOverlays();
      frame(scale, false);
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

  // Redraw overlays + reframe when the analyzed site (or flood result) changes.
  useEffect(() => {
    if (!mapRef.current) return;
    drawOverlays();
    frame(scale, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroid.lat, centroid.lon, boundary, topo, flood]);

  // Animate scale changes (zoom + basemap). Also redraw overlays: the terrain
  // elevation dots are gated on scale === "micro", and every new analysis starts
  // at macro, so without this the dots never appear on the first Macro→Micro flip.
  useEffect(() => {
    if (!mapRef.current) return;
    applyBase(scale);
    drawOverlays();
    frame(scale, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  function applyBase(s: Scale) {
    const map = mapRef.current;
    if (!map) return;
    const street = streetRef.current;
    const imagery = imageryRef.current;
    const labels = labelsRef.current;
    if (s === "micro") {
      if (map.hasLayer(street)) map.removeLayer(street);
      if (!map.hasLayer(imagery)) imagery.addTo(map);
      if (!map.hasLayer(labels)) labels.addTo(map);
    } else {
      if (map.hasLayer(imagery)) map.removeLayer(imagery);
      if (map.hasLayer(labels)) map.removeLayer(labels);
      if (!map.hasLayer(street)) street.addTo(map);
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

  function drawOverlays() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = overlayRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

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
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: "#e5e5e5" }}
      aria-label="Site map"
    />
  );
}
