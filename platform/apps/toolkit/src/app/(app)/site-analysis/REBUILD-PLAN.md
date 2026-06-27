# Surveyor — Rebuild Plan

Scope (confirmed with John, 2026-06-26): **full rebuild + enrich** · **US-focused, deeper** (keep high-res US sources; non-US degrades to climate-only) · **all four data domains** · **MapLibre GL** map. Findings + fixes: [`REBUILD-ANALYSIS.md`](./REBUILD-ANALYSIS.md).

## Verified keyless endpoints (probed live 2026-06-27)
- **Soils** — USDA SSURGO via Soil Data Access SDA `POST https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest` (T-SQL; `SDA_Get_Mukey_from_intersection_with_WktWgs84('point(lon lat)')` → mukey → component/horizon props). ✓
- **Land cover / canopy / impervious** — MRLC WMS `GetFeatureInfo` `https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/ows` (PALETTE_INDEX = NLCD class). ✓
- **Watershed** — USGS WBD `https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer` (query HUC12 layer by point). ✓
- **Seismic** — USGS `https://earthquake.usgs.gov/ws/building-codes/asce7-16/calculate?latitude=&longitude=&riskCategory=II&siteClass=D` (Ss/S1/SDS/SD1/SDC). ✓ (old `designmaps` path 301s)
- **Context geometry** — OSM Overpass `POST https://overpass-api.de/api/interpreter` (buildings/roads/water/green/amenities in a bbox → GeoJSON; display + Rhino export). ✓
- **Demographics** — Census geographies `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` → tract FIPS → ACS 5-yr Data API. ✓
- **Climate depth** — Open-Meteo archive (multi-year window + `global_tilted_irradiance` tilt/azimuth confirmed). ✓
- TBD during build: USFS Wildfire Hazard Potential ImageServer service name; NOAA SLR overlay.

## Architecture
- `lib/site-analysis/datasources.ts` — existing fetchers, **bugs fixed** (boundary exact-match + empty guard; GIS_AREA unit-aware; flood unmapped≠no-hazard; terrain returns a `missingMask`).
- `lib/site-analysis/layers.ts` — **NEW** domain fetchers (soils, landcover, watershed, seismic, hazards, context, demographics).
- `lib/site-analysis/climate.ts` — **NEW** deep climate (degree-days/mo, comfort hours, Givoni zones, design days, solar-by-orientation, balance point, day-length).
- `lib/site-analysis/terrain.ts` — **NEW** aspect, slope distribution, buildable-area, cut/fill, high/low points.
- `lib/site-analysis/geo.ts` — keep solar/windrose/projector (minor fixes).
- `lib/site-analysis/exporters.ts` + `rhino3dm-client.ts` — fixed + extended (polyline contours, georef, units, CSV, context geometry, robust .3dm).
- `app/api/site-analysis/analyze` — orchestrate core layers fast; **NEW** lazy `layers` endpoint for heavy fetches.
- AI: enforce no-"verified"-when-ungrounded, **blind-vs-grounded** toggle, richer synthesis, shared grounding.
- UI: new dashboard IA (map + data coexist), **MapLibre GL**, domain cards, a11y charts, all-black sweep, compare/save.

## Phasing → tracked in the task list (Phases 1–6).
