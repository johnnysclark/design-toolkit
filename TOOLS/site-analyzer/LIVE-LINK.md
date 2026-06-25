# Live Link — Web 3D ⇄ Rhino, and Vibe-Coded vs. Ladybug

**An architecture exploration for Phase 2 of Site Analyzer: replace the one-way
`.3dm` download with a *live link* between a 3D web app (Next.js + react-three-fiber
or similar) and a Rhino model — so you can switch fluidly between the two — and use
that link to put Site Analyzer's home-grown ("vibe-coded") environmental analysis
*next to* a validated Ladybug Tools run on the same ground and diff them.**

**Status:** 🟡 design doc — no new running code yet. This is the "explore" pass: the
transport options, the comparison architecture, the data contract, and a staged build
plan. It anchors the Phase 2 loop already named in
[`README.md`](README.md) ("analyze new designs back in Rhino") and the
[`web/README.md`](web/README.md) roadmap.

> **Why this fits the studio ethos.** The whole repo is "grade the trace, not the
> output" and "verification must be external — the model can't acquit itself." A
> vibe-coded-vs-Ladybug diff is that ethos compiled to geometry: our own analysis is
> the *output*, Ladybug is the *external check*, and the delta is the lesson. This
> doc tags every external-tool claim `✓ verified` / `? unverified` and cites it, the
> same discipline the tools impose on the model.

---

## 1. What we already have (the foundation is most of the work)

The hard part of any "live link" is a **shared, true-position coordinate frame** — and
Site Analyzer already establishes one. Reading the existing code:

| Asset (exists today) | Where | Why it matters for the live link |
|---|---|---|
| **One metric origin for every export** — SW corner of the site bbox, +X east, +Y north, +Z up, metres | [`web/rhino3dm-export.js`](web/rhino3dm-export.js) header; `makeProjector(s, w)` | Two different analyses (ours, Ladybug's) drop onto the *same* ground at the *same* scale → overlay/diff is trivial. This is the killer feature; most "live link" projects spend weeks here. |
| **Native `.3dm` writer** (terrain mesh, sun-path dome, wind rose, flood plane, labels) via `rhino3dm` | `buildAnalysisModel()` in `web/rhino3dm-export.js` | The geometry payload already exists; the link just needs to *transport* it instead of downloading it. |
| **`.epw` export** (hourly sun/wind/RH/temp) | `climateEPW()` in `web/exporters.js` | The single input both analysis arms consume. **This is what makes the comparison honest** — same weather, two engines. |
| **Vibe-coded analysis in pure JS** — `solarPosition` (NOAA algorithm), `windRose`, `sunPaths`, `monthlyStats` | [`web/geo.js`](web/geo.js) | The "output" arm of the A/B. Already deterministic and keyless. |
| **`rhino3dm` dependency** (WASM, runs in Node *and* the browser) | [`web/package.json`](web/package.json) | Lets a web viewer parse `.3dm` client-side with no server round-trip — the D0 floor for the link. |

So Phase 2 is **not** "build a coordinate system + a geometry pipeline." It's "add a
transport + a viewer + a second (validated) analysis arm." Three separable pieces.

---

## 2. Three separable problems (don't conflate them)

The request bundles three things that have *different* best answers. Keeping them
separate is the main design insight:

1. **The viewer** — a real 3D web surface (Next.js + react-three-fiber / Three.js)
   that renders the terrain + diagrams and can show two analyses overlaid.
2. **The link** — moving geometry *between* the web app and a live Rhino session, in
   both directions, so you can "switch easily between the web app and the Rhino model."
3. **The comparison** — running Ladybug on the same ground to check the vibe-coded
   numbers.

Problem 3 (the comparison) **does not require** problems 1 or 2. The cheapest, most
honest version runs headless with no Rhino at all (§4). Build it first.

---

## 3. The link — transport options compared

Goal: geometry round-trips between the web app and a live Rhino model so they stay in
sync. Four candidates.

| Option | What it is | Live? | Bi-directional? | Cost to stand up | Best at |
|---|---|---|---|---|---|
| **A. `rhino3dm` files** *(have it)* | Read/write `.3dm` in browser + Node; no server | ✕ (file, on demand) | ✕ (export only) | **Zero — already shipped** | The D0 equity floor: viewer parses the exported `.3dm` client-side, no install |
| **B. Speckle** | Open-source data platform: Rhino + Grasshopper *connectors*, a server, and a plugin-free web viewer; "send/receive" model | **Near-live** (send-on-change + web auto-update; not socket-level) | **✓** (web ⇄ Rhino ⇄ Grasshopper) | Low–medium (install connector, point at a server) | "Switch easily between web app and Rhino" — purpose-built for exactly this |
| **C. Rhino.Compute / Hops** | Headless Rhino+Grasshopper behind a stateless REST API; solves GH definitions server-side | Request/response | ✕ (compute, not sync) | Medium–high (**Windows host**, server ops) | Running a **Grasshopper/Ladybug definition headlessly** and returning results to the web |
| **D. Custom WebSocket plugin** | A small RhinoCommon/Python plugin in Rhino that opens a socket and pushes/pulls geometry | **✓ true real-time** | **✓** | High (you build + maintain a Rhino plugin) | Maximum control / true sub-second sync if you ever need it |

**Claim tags & sources**

- Speckle bundles the Rhino + Grasshopper connectors and offers a plugin-free web
  viewer; recent connector line is 3.x (3.8.2 noted in product updates).
  `✓ verified` — [Speckle Rhino docs](https://docs.speckle.systems/connectors/rhino/rhino),
  [Speckle product updates](https://speckle.systems/updates/),
  [Speckle Rhino integration](https://speckle.systems/integrations/rhino/).
- Speckle's send/receive is commit-based, so "live" means *send-on-change + the web
  view updates*, **not** a guaranteed real-time socket. `? unverified` — inferred from
  the send/receive model; confirm whether auto-send + viewer auto-refresh gives the
  feel you want before committing.
- Speckle's web viewer is Three.js-based. `? unverified` — widely reported; not
  confirmed against a primary source here. Verify if it affects the viewer choice.
- Rhino.Compute is open-source, based on Rhino.Inside, exposes RhinoCommon as a
  **stateless REST API**; Hops passes a GH definition to a headless Rhino+GH server
  which solves it and returns the result. New CLI args (`load-grasshopper`,
  `create-headless-doc`) landed **Nov 2025**. `✓ verified` —
  [Rhino Compute guides](https://developer.rhino3d.com/guides/compute/),
  [What is Hops](https://developer.rhino3d.com/guides/compute/what-is-hops/),
  [Compute CHANGELOG](https://github.com/mcneel/compute.rhino3d/blob/8.x/CHANGELOG.HOPS.md).
- Rhino.Compute runs Rhino, which is **Windows-first**; plan for a Windows host (or a
  hosted compute provider). `? unverified` here — verify current macOS/Linux support
  before betting an architecture on it.

### Recommendation for the link

**Pick by phase, don't marry one tool:**

- **Keep A (`rhino3dm`) as the permanent D0 floor.** The viewer should always be able
  to load the exported `.3dm` with zero install. Equity-floor parity with the rest of
  the repo.
- **Use B (Speckle) for the actual "switch between web and Rhino" experience.** It is
  the off-the-shelf answer to "live link 3D web ⇄ Rhino," has the connectors and a web
  viewer already, and saves you from building/maintaining a plugin. This is the
  recommended primary link.
- **Reserve C (Rhino.Compute/Hops) for *geometry-dependent* Ladybug** — radiation on a
  student's actual massing, shadow studies, view analysis — where Ladybug needs the
  Rhino geometry + Radiance/EnergyPlus. Not needed for sun-path/wind-rose diffs (§4).
- **Skip D unless** Speckle's latency genuinely isn't "live" enough. It's the most
  control and the most rope; don't pay for it until a measured need appears.

> **One-line answer to "which transport":** *Speckle for the link, `rhino3dm` as the
> free floor, Rhino.Compute only when Ladybug needs real geometry.* Three layers, each
> earning its keep.

---

## 4. The comparison — vibe-coded vs. Ladybug (the heart of the request)

This is what you actually want to *test*. The insight that makes it cheap and honest:

> **The most direct comparison — sun position and wind rose — needs no Rhino and no
> Grasshopper.** `ladybug-core` is a pure-Python library with `Sunpath`, `WindRose`,
> and `EPW` classes that run standalone. `✓ verified` —
> [ladybug-core on PyPI](https://pypi.org/project/ladybug-core/),
> [ladybug repo](https://github.com/ladybug-tools/ladybug),
> [ladybug.sunpath module](https://www.ladybug.tools/apidoc/ladybug/_modules/ladybug/sunpath.html).

So the A/B is: **feed the *same* `.epw` into both engines, diff the outputs.**

```
                       site-analyzer .epw  (one weather input)
                        /                                \
        VIBE arm (have)                              LADYBUG arm (new)
        web/geo.js                                   ladybug-core (Python)
        solarPosition() NOAA                         Sunpath.calculate_sun()
        windRose()                                   WindRose
                        \                                /
                         →  same metric origin  ←
                         →  diff: Δaltitude, Δazimuth (°),
                            Δsector-fraction (%), peak-noon delta
                         →  overlay both in the web viewer + a numeric table
```

**What "validated" means here, honestly.** Our `solarPosition` already implements the
NOAA algorithm (see [`web/geo.js`](web/geo.js)); Ladybug's `Sunpath` is also a
standard astronomical model. We **expect them to agree closely on sun position** — and
that is itself the finding worth showing students: *the vibe-coded sun path is
trustworthy, and here's the external check that earns that trust.* The wind rose is
more likely to differ (binning conventions, calm-hour handling, sector counts) — a
**better teaching delta**, because it shows where a plausible home-grown choice
silently diverges from the reference. Tag each result `✓ matches` / `? small delta` /
`⚠ material divergence` with the number, exactly like the model-claim tags elsewhere.

**Engine boundaries to respect (don't overclaim what runs headless):**

| Ladybug analysis | Needs | Headless without Rhino/GH? |
|---|---|---|
| Sun position / sun path | `ladybug-core` only | ✓ yes — pure Python |
| Wind rose, climate stats from EPW | `ladybug-core` only | ✓ yes — pure Python |
| Radiation / daylight on geometry | `honeybee` + **Radiance** | ✕ needs the engine (+ usually geometry from Rhino) |
| Energy model | `honeybee-energy` + **EnergyPlus/OpenStudio** | ✕ needs the engine |

`✓ verified` that core is pure-Python and the daylight/energy arms bind external
engines — [honeybee repo](https://github.com/ladybug-tools/honeybee),
[Ladybug Tools home](https://www.ladybug.tools/). **Implication:** Phase A (sun +
wind) is a tiny Python sidecar, no Rhino. Phase B (radiation/energy on a massing) is
where Rhino.Compute/Hops (§3-C) earns its place, because *that* Ladybug needs the live
geometry the link provides.

---

## 5. The data contract (one JSON both arms speak)

Both analysis arms — and the link — should emit the same shape so they're directly
comparable and the viewer is engine-agnostic. This extends the `forceProfile` /
"site contract" already sketched in [`README.md`](README.md) → integration.

```jsonc
{
  "origin":   { "lat": 40.67, "lon": -73.99, "datum": "WGS84",
                "localFrame": "SW-corner, +X E, +Y N, +Z up, metres" },
  "engine":   "vibe" | "ladybug" | "rhino-live",
  "version":  "geo.js@<sha>" | "ladybug-core@x.y.z",
  "sun": {
    "samples": [ { "month": 6, "day": 21, "hour": 12.0,
                   "altitude": 72.3, "azimuth": 180.4 } ],
    "peakNoonAltitude": { "summer": 72.3, "winter": 26.1 }
  },
  "wind": {
    "sectors": 16, "calmHandling": "dropped-below-0.5ms",
    "rose": [ { "dir": "NNE", "fraction": 0.041, "bySpeedBand": [..] } ],
    "prevailing": { "dir": "WNW", "fraction": 0.12 }
  },
  "provenance": {                      // the four-line trace, per repo ethos
    "tool": "ladybug-core 0.x",
    "asked": "sun + wind for <epw>",
    "keptChangedRejected": "kept",
    "verifiedAgainst": "site-analyzer .epw <sha256>"
  }
}
```

The **diff** is then a deterministic function of two such objects → a third
`diff` object (`Δaltitude` array, `Δazimuth` array, per-sector `Δfraction`, max/mean
deltas, a `verdict` tag). That diff *is* the gradable artifact — it goes in the
provenance log, not just on screen.

---

## 6. Staged build plan

Each phase is independently demoable; stop at any line and you still have a thesis.

| Phase | Build | Transport | Proves |
|---|---|---|---|
| **0 — viewer (D0)** | Next.js + react-three-fiber page that loads the existing exported `.3dm` via `rhino3dm` WASM and renders terrain + sun path + wind rose | A (files) | "Web 3D viewer of the real ground," zero install, no Rhino |
| **A — the diff (D1, headless)** | Python sidecar: `ladybug-core` reads the same `.epw` → emits the §5 contract; a deterministic differ; viewer overlays vibe vs Ladybug + a delta table | none (just the EPW) | **Vibe-coded vs Ladybug, the core ask** — no Rhino needed |
| **B — the live link** | Speckle connector in Rhino + receive/send in the web app; "open in Rhino" / "pull from Rhino" buttons | B (Speckle) | "Switch easily between the web app and the Rhino model" |
| **C — geometry-aware Ladybug** | Student massing round-trips via the link; a GH+Ladybug definition runs radiation/shadow on it via Rhino.Compute; results return to the viewer | C (Compute/Hops) | The Phase-2 loop the README names: *analyze new designs back in Rhino* |
| **D — RAP hand-off** | The validated geometry/diff feeds `rap-tactile-cad` for tactile/sonified read-back | reuse | The accessibility throughline reads the *checked* model, not the unchecked one |

**Recommended first push of code (later):** Phase 0 + Phase A. Together they are the
complete, runnable thesis — a real 3D web viewer showing the vibe-coded analysis with
Ladybug as the external check — and they need **no Rhino, no Windows, no server**.
Phase B/C add the literal "live link" once the comparison is trustworthy.

---

## 7. Degradation ladder (D0–D2), matching the repo

- **D0 (free, no install, no key):** Next.js/Three viewer loads the exported `.3dm`
  client-side via `rhino3dm`; vibe-coded analysis renders. The equity floor.
- **D1 (free, local Python):** `ladybug-core` sidecar produces the validated arm and
  the diff. Deterministic, keyless, offline-capable.
- **D2 (heavier infra):** Speckle server + Rhino host (live link); Rhino.Compute +
  Radiance/EnergyPlus for geometry-dependent Ladybug. Real-geometry round-trip.

Same clean line the tool already draws: **hard/deterministic stays low-tier; the
expensive engines are opt-in.**

---

## 8. Honest limits & risks

- **"Live" is doing a lot of work.** Speckle is send-on-change, not a guaranteed
  real-time socket; verify the round-trip *feels* live before promising it. True
  sub-second sync is option D (a plugin you maintain). `? unverified` — confirm.
- **Rhino.Compute is Windows-first and is real server ops** (auth, scaling, a GH
  definition to maintain). Don't take it on until Phase C actually needs geometry-aware
  Ladybug. `? unverified` on current cross-platform support — check before committing.
- **Sun position will probably *agree*** between the two engines (both standard
  models). That's a feature, not a failure — frame it as "the check passed." The wind
  rose is where to hunt for an honest, teachable delta (binning/calm conventions).
- **EPW provenance is upstream.** Our `.epw` is *generated* from Open-Meteo ERA5
  (~25 km reanalysis), per [`web/README.md`](web/README.md) — so a vibe-vs-Ladybug
  match only proves the two *engines* agree on the *same* input, not that the input is
  ground truth. Keep that caveat visible in the diff UI.
- **Version drift is a real claim risk.** Connector/library versions move fast (Speckle
  3.x, Rhino.Compute Nov-2025 args, `ladybug-core` releases). Pin versions and
  re-verify the `✓`/`?` tags in this doc at build time — don't trust today's tags
  blindly tomorrow.

---

## 9. Integration / hand-offs

- **→ `rap-tactile-cad`:** the live link means RAP can read the **checked** geometry
  (or the validated Ladybug arm) rather than the unverified one — the tactile/sonified
  read-back of a model whose analysis has an external pass. Reinforces RAP's
  "fidelity, not plausibility" core.
- **↔ `form-helper`:** the same metric origin lets a carved form (form-helper) land on
  the live terrain in true position and be re-analyzed (vibe + Ladybug) on the spot —
  the round-trip loop, closed.
- **Shared kit:** the §5 contract is a superset of the `forceProfile` already promised
  to form-helper and the `{centroid, bbox, boundary…}` promised to code-zoning-agent;
  define it once, reuse everywhere.

---

## 10. Open questions for the next pass

1. **Viewer framework** — Next.js + react-three-fiber (richest, recommended) vs.
   extending the existing vanilla-JS/SVG frontend (lighter, no build step, matches
   current zero-build ethos)? The repo currently prizes zero-build.
2. **Speckle hosting** — self-host the server (control, ops) vs. hosted
   `app.speckle.systems` (fast start, external dependency / data leaves the machine)?
3. **Diff surfacing** — overlay-in-3D vs. side-by-side vs. a "blind-vs-grounded"-style
   toggle (the README calls that toggle the tool's best hallucination lesson; reuse the
   pattern for vibe-vs-validated)?
4. **Where the diff lives** — pure-Python differ (deterministic, D1) vs. computed in
   the viewer (no sidecar, but JS re-implements Ladybug's parsing)? Recommend Python.

---

### Sources

- Speckle — [Rhino docs](https://docs.speckle.systems/connectors/rhino/rhino) ·
  [Rhino integration](https://speckle.systems/integrations/rhino/) ·
  [Grasshopper integration](https://speckle.systems/integrations/grasshopper/) ·
  [product updates](https://speckle.systems/updates/) ·
  [speckle-sharp repo](https://github.com/specklesystems/speckle-sharp)
- Rhino.Compute / Hops —
  [Compute guides](https://developer.rhino3d.com/guides/compute/) ·
  [What is Hops](https://developer.rhino3d.com/guides/compute/what-is-hops/) ·
  [Hops component](https://developer.rhino3d.com/guides/compute/hops-component/) ·
  [Compute CHANGELOG (8.x)](https://github.com/mcneel/compute.rhino3d/blob/8.x/CHANGELOG.HOPS.md)
- Ladybug Tools —
  [ladybug-core (PyPI)](https://pypi.org/project/ladybug-core/) ·
  [ladybug repo](https://github.com/ladybug-tools/ladybug) ·
  [sunpath module](https://www.ladybug.tools/apidoc/ladybug/_modules/ladybug/sunpath.html) ·
  [honeybee repo](https://github.com/ladybug-tools/honeybee) ·
  [Ladybug Tools home](https://www.ladybug.tools/)
- `rhino3dm` — already a dependency; see [`web/package.json`](web/package.json) and
  [`web/rhino3dm-export.js`](web/rhino3dm-export.js)
