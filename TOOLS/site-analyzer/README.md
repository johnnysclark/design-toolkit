# Site Analyzer

**Feed it a site → get a structured read for doing architecture there.**
Climate, orientation, terrain, water/flood, constraints, a brief history, and
relevant links — plus the ground itself exported for Rhino so students model real
designs against the real place.

Studio ethos: hard data is **sourced and downloadable**; every *model* claim is
tagged (`✓ verified` / `? unverified` / `⚠ likely-hallucination`) and cited. AI is a
material to interrogate, not an authority.

**Status:** ✅ working (built). Maps to `TOOL-CATALOG.md` §1 — Site & Context Analysis.

## What it reads
- **Climate** — sun path, wind rose, temperature/humidity (Open-Meteo ERA5)
- **Terrain** — elevation grid + contours (USGS 3DEP)
- **Water/flood** — FEMA NFHL flood zone
- **Site** — EPA Superfund boundary/identity (current demo dataset)
- **(planned)** brief history, zoning/constraints summary, curated relevant links
- **Exports** — Rhino `.3dm` analysis model, terrain `.obj`, contours/boundary `.dxf`, `.geojson`, climate `.epw`

## Variants
| Folder | Form | Setup |
|---|---|---|
| [`web/`](web) | Full web app (map + charts + model briefs) | `npm install`; API key only for the two model passes |
| [`standalone/`](standalone) | The whole tool in one double-click HTML file (live public-API data) | none |
| [`cli/`](cli) | Terminal version for quick testing + Rhino export | Node 18+, no key |

```bash
open "TOOLS/site-analyzer/standalone/index.html"      # zero setup
node TOOLS/site-analyzer/cli/analyze.js "Gowanus Canal"
```

## Ideas / backlog
- Generalize beyond Superfund datasets to any parcel/address.
- Add the "brief history" + "relevant links" reads (sourced, claim-tagged).
- Zoning/constraints summary (hand-off to **code-zoning-agent**).
- Feed orientation/sun/wind directly into **form-helper**.
