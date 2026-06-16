# Site Analyzer — standalone HTML

The whole tool in **one file you double-click open**. No server, no API key, no `npm install`,
no build. Just `index.html` and a browser with an internet connection.

## Use

Open `index.html` in any modern browser (double-click, or drag into a tab). Search a Superfund
site → click a result → it pulls the data live and renders the map, climate charts, terrain, and
flood. Export buttons download the Rhino files straight from the browser.

## How it works

Every data source supports cross-origin requests, so the browser calls them directly — no
backend needed:

- **EPA Superfund** (ArcGIS) — search + boundary polygon
- **USGS 3DEP** (EPQS) — terrain elevation grid
- **FEMA NFHL** (ArcGIS) — flood zone
- **Open-Meteo** — hourly climate (drives the charts + generated `.epw`)

All the geometry/climate math and file exporters are ported inline from `../site-analyzer`
(verified byte-identical for mesh geometry and EPW data rows), so this page stands alone.

## Exports

The **★ Full site analysis (`.3dm`)** button builds the Ladybug-analog model — terrain coloured
by elevation, sun-path dome, wind rose, flood plane, boundary, and labels on toggleable layers —
**in the browser** via the `rhino3dm` WASM module (loaded from CDN). Even this no-server build
writes a native Rhino file that opens with no plugin. Also exports `terrain.obj`, `contours.dxf`,
`boundary.dxf`, `boundary.geojson`, and a year-long `.epw`; all share one metric origin so they
align in Rhino.

## What's missing vs the full version

The **contamination** and **design-read** briefs are model passes that need an Anthropic API key
and a server — they're not in this build. For those, run `../site-analyzer` (`npm start`). The
CLI in `../site-analyzer-cli` is the no-browser equivalent of this page.

## Notes

- Needs internet (live APIs + OpenStreetMap tiles + Leaflet CDN).
- Climate is Open-Meteo ERA5 reanalysis (~25 km), not a measured TMY — fine for early-stage and
  relative analysis; verify against a measured station file for final work.
- Terrain sampling is many small USGS requests; the "Terrain grid" control (6–40) trades detail
  for speed. If a layer fails or is out of coverage, its badge greys out and the rest still works.
