# Site Analyzer

**Feed it a site → a verifiable, design-ready read of the real ground.**
The hard physical facts — climate, terrain, water/flood, boundary — come straight
from public agencies and download into Rhino; every *interpretive* claim the model
adds (contamination, design implications) arrives pre-tagged for trust. Less "tell me
about my site," more **"give me the measured ground and a flagged set of hypotheses to
verify before I design."**

**Status:** ✅ **built and working** (web + standalone + CLI). Maps to `TOOL CATALOG IDEAS.md` §1.
*This README is now a build-out: what exists, the gaps, and where it goes.*

---

## How it embodies the studio ethos
- **Hard data, sourced & downloadable** — EPA / USGS / FEMA / Open-Meteo, every layer degrades to a visible ✕ rather than being faked (honest coverage is the pedagogy).
- **Claim-tagging is built** — the contamination + synthesis passes tag every claim `✓ verified` / `? plausible-unverified` / `⚠ likely-hallucination` with a reason and source; the prompt forbids "verified" without a found source.
- **It already self-limits** — `key_tensions` + a "what this analysis cannot tell you" block + a field checklist are the tool refusing to overclaim.
- **Degrades to free** — the standalone single-file HTML gives all hard data + every export with no key, no install (the equity floor).

## What it reads (built)
| Layer | Source | Tier |
|---|---|---|
| Site identity / boundary | EPA NPL ArcGIS (Superfund, current dataset) | D0 |
| Climate (sun path, wind rose, temp/RH) | Open-Meteo ERA5 | D0 |
| Terrain (elevation grid + contours) | USGS 3DEP (EPQS) | D0 |
| Water / flood | FEMA NFHL | D0 |
| Contamination brief (claim-tagged, web-grounded) | Claude + web search | D2 |
| Design synthesis (reads + tensions + checklist) | Claude | D2 |
| **Exports** — `.3dm` (terrain + sun path + wind rose + flood plane + labels), `.obj`, `.dxf`, `.geojson`, `.epw` | hand-written, shared metric origin | D0 |

## Variants
| Folder | Form | Setup |
|---|---|---|
| [`web/`](web) | Full app (map + charts + model briefs) | `npm install`; key only for the two model passes |
| [`standalone/`](standalone) | Whole tool in one double-click HTML, live public-API data | none |
| [`cli/`](cli) | Terminal report + Rhino export | Node 18+, no key |

```bash
open "TOOLS/site-analyzer/standalone/index.html"      # zero setup
node "TOOLS/site-analyzer/cli/analyze.js" "Gowanus Canal"
```

---

## Gameplan

### MVP — built. Gaps to close
- Provenance "log" is a JSON dump, **not** the four-line *tool / asked / kept-changed-rejected / verified* trace; no capture of what the student kept/changed/rejected.
- `field_checklist` is display-only — **not** a downloadable/checkable verification worksheet.
- D0/D1/D2 and the **blind-vs-grounded** toggle exist in code but aren't surfaced as student choices.
- Locked to EPA Superfund sites — no arbitrary address/parcel.
- "Brief history" + "relevant links" reads (in the tagline) not built.
- No adversarial re-pass on the design read.
- Terrain null-cells are filled with the grid **mean** and baked into exports with no visual flag (looks like real flat ground).
- Charts are SVG-only with no text/table alternative (accessibility gap).

### v1 — close the loop
- **Four-line provenance log** + a "log my decision" control on each claim (keep / change / reject + why), exported with the dossier.
- **Verification worksheet** generated from the field checklist + every `?`/`⚠` claim (MD/CSV), as the graded-trace artifact.
- Surface **D0/D1/D2** + the **blind-vs-grounded diff** as explicit UI, shown side by side (this diff is the best hallucination lesson in the tool).
- **Brief history** + **relevant links** as new passes — history = a grounded claim-tagged pass (Sanborn maps, historic aerials, LoC, local archives); links = *deterministic* assembly from IDs already extracted (keeps it free + honest).
- Worksheet + log work in the standalone too (equity-floor parity).
- Accessible charts (table fallback + ARIA).

### Stretch
- **Generalize beyond Superfund** *(highest-leverage move)* — the climate/terrain/flood/export spine is already site-agnostic; only boundary + contamination are NPL-bound. Add geocoding (US Census Geocoder / Nominatim) + a parcel source (county ArcGIS / Regrid / OSM footprints) and it serves the whole studio.
- **Adversarial / red-team pass** on the synthesis ("which opportunities rest on the coarsest data? where would a site visit most likely overturn this?").
- **Hand-off bus** — a stable "site contract" JSON (below) consumed by form-helper, code-zoning-agent, precedent-librarian.
- Climate-futures overlay (SLR / future precip, tagged projection); equity layer (EJScreen, demographics) — ties to the RAP throughline.

---

## Potential directions
1. **Generalize beyond Superfund** to any address/parcel (the spine already supports it).
2. **Brief-history + relevant-links reads** (the genres most prone to invented dates/names → good teaching).
3. **Blind-vs-grounded diff as the headline demo** — the delta between with/without search is the tool's best artifact.
4. **Hand-off bus** so Site Analyzer is the studio's shared front door.
5. **Adversarial pass** completing the self-attack ethos.
6. **Resilience / climate-futures overlay** (trajectory, not just today).
7. **Equity / community layer** (EJScreen, displacement history) — turns a contamination read into a justice read.

---

## Technical notes (grounded in the code)
- **Stack:** pure Node 18+ ESM, zero build, two deps (`@anthropic-ai/sdk`, `rhino3dm`); `node:http` server; vanilla-JS/SVG frontend; Leaflet map. Model: `claude-opus-4-8`, adaptive thinking, structured outputs (ungrounded) / JSON-in-fence parse (grounded, because web_search + forced schema conflict).
- **Quick wins:** replace the EPQS point-grid (256+ HTTP calls) with a single 3DEP **ImageServer**/OpenTopography raster fetch; add disk cache + retry/backoff; flag fabricated terrain cells; multi-point flood sampling; escape ArcGIS `LIKE` wildcards.
- **The standalone is a hand-ported fork** (~500 dup lines) — at drift risk; a tiny inline-at-release build step would fix it.

## Delivery & equity (D0–D2)
All hard data + every export = **D0** (free, in the standalone — the `.3dm` building in-browser is the strongest equity story). Contamination + synthesis = **D2** (key + web_search, server-only). The clean line: **hard public data stays D0; model judgment is D2.** Note v1's new free sources (Overpass/Nominatim/Regrid) are often *free but not CORS-open* → likely server-only even though free.

## Integration / hand-offs
- **→ form-helper:** a `forceProfile` JSON — `{centroid, prevailingWind, windRose, sun{paths,altitudes}, annual, projector, groundZ}` — everything already computed in `geo.js`; shared metric origin means a carved form lands on the exported terrain in true position.
- **→ code-zoning-agent:** today `{centroid, bbox, boundaryGeoJSON, area, state/county/city}`; after the geocoding stretch, `{parcelId, parcelGeoJSON, jurisdiction, zoningDistrict}`. Clean seam: Site Analyzer = *what zone is this parcel*; code-zoning-agent = *what does that zone permit*.
- **Shared kit:** factor the claim-tag schema + worksheet + four-line log + MD/JSON export into a shared module (precedent-librarian has the complete version; this tool has only part — see `TOOL IDEAS ANALYSIS.md`).

## How to test it
- **Golden-fixture snapshots** for 3 reference sites (Gowanus / Tar Creek / Love Canal) to catch upstream API drift (the FEMA layer id is a hardcoded magic number that *will* break someday).
- **Export validators** not eyeballs — OBJ vertex/face counts; load the `.epw` headlessly in Ladybug; load the `.3dm` back via rhino3dm and assert layers + vertex colors.
- **Geometry unit tests** — `solarPosition` vs NOAA reference values; wind-rose fractions sum to ≈1.
- **Honesty evals (CI gates):** no `verified` without a resolving source; planted-hallucination recall; synthesis invents no numbers not in the input bundle.
