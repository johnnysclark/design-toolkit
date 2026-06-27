# Ladybug side-by-side — reproduction recipe

How to run the **same incident-radiation analysis in Ladybug Tools** that
Eco-Architect (V2 → ☁ Load climate → ⚖ Compare to Ladybug) computes, so you can
put the two side by side. This is written as an **instructor demo**: you run it
once per climate and share the numbers; students don't each need Rhino.

> **What the comparison proves — and doesn't.** Eco-Architect's solar engine is a
> *cumulative sky matrix the same shape Ladybug uses* (Tregenza-145 patches,
> `incident = Σ patch · max(0, n·dir)`), built from the same EPW. Where they
> **agree** (a few %), that proves we **reproduce Ladybug's method**, not that
> either is "accurate" — both omit multi-bounce, spectral and cloud-microphysics
> effects. Where they **diverge**, that's the lesson (see *Expected differences*).

## Prerequisites
- Rhino 8 + **Ladybug Tools 1.x** (install via Rhino **PackageManager** → search
  "ladybug tools", or Food4Rhino).
- The **same `.epw`** you loaded into Eco-Architect (e.g. from
  [climate.onebuilding.org](https://climate.onebuilding.org) or
  [energyplus.net/weather](https://energyplus.net/weather)).

## A · The sky comparison (5 unobstructed surfaces) — start here
This isolates the **sky model** (our isotropic diffuse vs Ladybug's Perez) with
no geometry to match.

1. **In Eco-Architect:** load the `.epw`, open **⚖ Compare to Ladybug**, note the
   five "ours" numbers, and click **⤓ Comparison pack** (it pins the EPW + that
   the sky is Tregenza-145, ground reflectance 0).
2. **In Grasshopper**, make five **1 m × 1 m** surfaces, one facing each way:
   - horizontal (normal +Z, "roof"), south (−Y), east (+X), west (−X), north (+Y).
   - +X = East, +Y = North, +Z = Up (Rhino world; keep North at +Y).
3. Wire: **LB Import EPW** (your file) → **LB Cumulative Sky Matrix**
   - set the sky to **Tregenza** (the 145-patch default; leave "high density" off),
   - set **ground reflectance = 0.0** (to match ours — we add no ground bounce; see
     *Expected differences* if you leave it at the 0.2 default).
   → **LB Incident Radiation** with `_geometry` = the five surfaces and no context.
4. Read **total radiation per surface** in **kWh/m²** (the sum over the year).
5. Type the results as `key,value` rows and **paste into the Compare tab**:
   ```
   horizontal,1610
   south,1240
   east,980
   west,990
   north,560
   ```
   Press **Compare**. Green = reproduces (≤5%), amber = close (≤15%), red = diverges.

## B · The building comparison (self-shaded, advanced)
To check the **occluded** numbers (the overhang shading the walls — the
"self-shaded" kWh/m² on the Sun card):
1. Get the massing into Rhino: open the **V1 export's `gable.3dm`** (V1 → ⤓ Export),
   or paste `run_rhinocommon.py` into the Rhino 8 ScriptEditor to rebuild it on the
   `Plinth/Walls/Roof/Apertures` layers from `params.json`.
2. In Grasshopper: **LB Incident Radiation** with `_geometry` = the **Apertures**
   layer and `context_` = **Walls + Roof + Plinth** (so the eaves shade the glass).
   Use the same Tregenza-145 sky matrix from step A.
3. Compare the area-weighted aperture result to Eco-Architect's **glazing** number.

## Expected differences (this is the teaching moment)
- **Isotropic vs Perez.** Ours spreads diffuse light evenly; Ladybug's Perez model
  concentrates it near the sun and horizon. Expect the **largest gap on sunny,
  clear-sky orientations** (often the equator-facing wall).
- **Ground reflection.** Ladybug's Incident Radiation adds a ground hemisphere
  (≈ albedo × GHI). If you leave reflectance at 0.2, **Ladybug's vertical walls
  read higher** than ours by roughly `0.2 × GHI × 0.5`. Set it to 0 to match, or
  keep it and discuss the difference.
- **Beam quantisation.** Ours bins the sun's beam to the nearest of 145 patches
  (no circumsolar disc), so a wall near 45° tilt can read a little high or low.
- **Time/position.** Ours uses a simplified solar position (no equation-of-time);
  Ladybug uses the EPW's. Small effect on annual totals.

## Schema for the comparison pack (`eco-architect-comparison.json`)
`manifest` pins `patchModel: tregenza145`, `patchCount: 145`, `skyModel:
isotropic…`, `groundReflectance: 0`, `northAngle`, and the EPW identity;
`oursReference` carries the five `{key, label, ours}` numbers. Keeping these fixed
on both sides is what makes the side-by-side honest.
