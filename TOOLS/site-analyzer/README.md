# Site Analyzer

Read a **Superfund site** through its physical realities — climate, terrain, water, and
contamination — then **export the ground itself for Rhino** so students can model real designs
against the real place.

Same studio ethos as `precedent-researcher`: hard data is sourced and downloadable; every
*model* claim is tagged (`verified` / `unverified` / `likely-hallucination`) and cited. AI is a
material to interrogate, not an authority.

## Run

```bash
cd TOOLS/site-analyzer
npm install
ANTHROPIC_API_KEY=sk-ant-… npm start      # → http://localhost:3000
```

The map and every hard-data layer (boundary, climate, terrain, flood) and all exports work
**without** an API key — they come from public APIs. The key only enables the two model briefs:
the **contamination** read (web-search grounded, cited) and the **design read** synthesis.

## What it does

1. **Search** the EPA National Priorities List by name (e.g. "Gowanus Canal").
2. **Analyze** the selected site — fans out to live sources and renders a map + dossier:
   - **Climate (priority):** sun-path diagram, wind rose, monthly temperature & humidity, from
     Open-Meteo ERA5 hourly reanalysis.
   - **Topography:** USGS 3DEP elevation grid → relief stats.
   - **Water & flood:** FEMA NFHL flood zone at the site.
   - **Contamination:** EPA metadata + a web-grounded brief of contaminants, plume, institutional
     controls, and remediation status — each claim cited.
   - **Design read:** the model reasons over all of the above into orientation, opportunities,
     tensions, and an honest "what this cannot tell you."
3. **Export for Rhino**:
   | File | What | Notes |
   |---|---|---|
   | `…-site-analysis.3dm` | **★ Ladybug-analog model** — terrain (vertex-coloured by elevation), sun-path dome, wind rose, flood plane, boundary, north arrow & labels, each on its own toggleable layer | **opens natively in Rhino, no plugin** (`File ▸ Open`); `?n=` terrain resolution |
   | `…-terrain.obj` | DEM → triangulated mesh | metres; origin = site SW corner; `?n=` up to 64 |
   | `…-contours.dxf` | contour polylines | `?n=` resolution, `?interval=` metres |
   | `…-boundary.dxf` | EPA site boundary | metres, same origin as terrain |
   | `…-boundary.geojson` | boundary in WGS84 | for any GIS tool |
   | `…-<year>.epw` | generated weather file | hourly sun/wind/humidity for Ladybug |

   Every export shares **one origin and projection** (site SW corner, metres), so they line up
   when imported together. The `.3dm` is the headline: it's a **Ladybug analog** — instead of
   handing you a raw EPW to wire into Grasshopper, it bakes the environmental analysis (sun path,
   wind rose, flood level, coloured terrain) as real Rhino geometry positioned on the actual site,
   ready to model against. (The raw `.epw` is still exported for full Ladybug/EnergyPlus runs.)

## Data sources (all keyless)

- EPA Superfund NPL sites & boundaries — ArcGIS FeatureServers
- USGS 3DEP elevation — EPQS point service
- FEMA National Flood Hazard Layer — ArcGIS MapServer
- Open-Meteo ERA5 archive — hourly climate

## Honest limits

- **Climate is reanalysis (~25 km), not a measured TMY.** The `.epw` is *generated* from
  Open-Meteo, good for early-stage and relative analysis; verify against a measured station file
  (e.g. climate.onebuilding.org) for final work.
- **Terrain** is a coarse sampled grid via EPQS (US only); **flood** is a single-point query.
- **Contamination & design reads are model output** — every claim is tagged and (where grounded)
  cited. Treat the `field_checklist` as required homework, not optional.

## Config (env)

| Var | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | enables contamination + design-read passes |
| `PORT` | 3000 | server port |
| `GRID_N` | 14 | elevation grid sampled during analysis (6–48) |
| `CLIMATE_YEAR` | 2023 | source year for climate + EPW |

## Roadmap (deferred)

The "analyze new designs back in Rhino" loop — round-tripping a student's massing model against
sun/wind/flood/contamination constraints — is the intended Phase 2.
