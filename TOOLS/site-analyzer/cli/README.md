# Site Analyzer CLI (lightweight)

A no-setup version of the Site Analyzer for quick testing: **no API key, no server, no
`npm install`.** Just Node 18+ (for built-in `fetch`).

It reuses the verified, dependency-free data modules from `../web` (`datasources.js`,
`geo.js`, `exporters.js`), so keep that folder alongside this one. The only thing it skips is the
two model passes (contamination + design read), which need an Anthropic key and live in the web
version.

## Use

```bash
cd "TOOLS/site-analyzer/cli"

node analyze.js "Gowanus Canal"                 # search EPA NPL + analyze best match
node analyze.js --id NYN000206222               # analyze an exact EPA ID
node analyze.js --list "tar creek"              # list matching sites only
node analyze.js "Gowanus Canal" --export out    # also write Rhino files to ./out
node analyze.js "Gowanus" --grid 24 --year 2022 # finer terrain grid, different climate year
```

## What it prints

EPA site header + links, then climate (solar-noon sun altitudes, prevailing wind, temp/RH with
Jan→Dec sparklines), terrain relief, and the FEMA flood zone — the same hard data as the web app.

## What `--export` writes

- **`…-site-analysis.3dm`** — the ★ Ladybug-analog model: terrain (colour-by-elevation), sun-path
  dome, wind rose, flood plane, boundary, and labels on toggleable layers. Opens natively in Rhino,
  no plugin.
- `terrain.obj`, `contours.dxf`, `boundary.dxf`, `boundary.geojson`, and a year-long `.epw`.

Same files as the web app; all share one metric origin so they align in Rhino.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--id <EPA_ID>` | — | skip search, analyze this site |
| `--list` | off | list matches and stop |
| `--export <dir>` | — | write Rhino files (dir defaults to `out`) |
| `--grid <6-48>` | 14 | elevation sample grid |
| `--year <YYYY>` | 2023 | climate / EPW source year |

For the full experience — interactive map, charts, and the cited contamination & design-read
briefs — use `../web` (`npm start`).
