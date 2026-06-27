// terrain.ts — design-relevant derivations from the USGS 3DEP elevation grid.
//
// The engine previously reduced terrain to four scalars (min/max/mean/slope%).
// This module reads the full grid for what a site designer needs: slope AND
// aspect distributions, a buildable-area estimate, cut/fill datum, and the
// located high/low points — all of which respect the `missingMask` so fabricated
// (gap-filled) cells never masquerade as measured ground.

import type { Topo } from "./datasources";
import { makeProjector } from "./geo";

const DEG = 180 / Math.PI;

export interface TerrainDeep {
  fabricatedPct: number; // % of cells back-filled (out of 3DEP coverage)
  relief: number; // measured max − min (m)
  meanSlopePct: number;
  maxSlopePct: number;
  resMeters: number; // grid spacing
  slopeBands: { band: string; pct: number }[]; // flat/gentle/moderate/steep
  aspect: { dominant: string | null; distribution: { dir: string; pct: number }[] };
  buildablePct: number; // % of measured cells under ~15% slope
  highPoint: { lat: number; lon: number; elev: number } | null;
  lowPoint: { lat: number; lon: number; elev: number } | null;
  suggestedDatumM: number | null; // a sensible 0-datum for grading (the low point)
}

const COMPASS8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compass8 = (deg: number) => COMPASS8[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

export function deriveTerrain(topo: Topo): TerrainDeep {
  const { grid, n, bbox, missingMask, stats } = topo;
  const [w, s, e, nth] = bbox;
  const proj = makeProjector(s, w);
  const [spanX, spanY] = proj.toLocal(e, nth);
  const dx = spanX / (n - 1);
  const dy = spanY / (n - 1);
  const resMeters = (Math.abs(dx) + Math.abs(dy)) / 2;

  const fabricated = missingMask ?? Array.from({ length: n }, () => new Array(n).fill(false));
  let fabCount = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (fabricated[r][c]) fabCount++;

  // Per-interior-cell slope + aspect, skipping any cell touching a fabricated one.
  const slopeBands = [
    { band: "Flat (<5%)", lo: 0, hi: 5, n: 0 },
    { band: "Gentle (5–10%)", lo: 5, hi: 10, n: 0 },
    { band: "Moderate (10–20%)", lo: 10, hi: 20, n: 0 },
    { band: "Steep (>20%)", lo: 20, hi: Infinity, n: 0 }
  ];
  const aspectBins = new Array(8).fill(0);
  let slopeSum = 0;
  let maxSlope = 0;
  let measuredInterior = 0;
  let buildable = 0;

  const touchesFab = (r: number, c: number) =>
    fabricated[r][c] || fabricated[r][c - 1] || fabricated[r][c + 1] || fabricated[r - 1][c] || fabricated[r + 1][c];

  for (let r = 1; r < n - 1; r++) {
    for (let c = 1; c < n - 1; c++) {
      if (touchesFab(r, c)) continue;
      const gx = (grid[r][c + 1] - grid[r][c - 1]) / (2 * (dx || 1)); // dz/dEast
      const gy = (grid[r + 1][c] - grid[r - 1][c]) / (2 * (dy || 1)); // dz/dNorth
      const slope = Math.sqrt(gx * gx + gy * gy);
      const slopePct = slope * 100;
      slopeSum += slopePct;
      if (slopePct > maxSlope) maxSlope = slopePct;
      measuredInterior++;
      for (const b of slopeBands) if (slopePct >= b.lo && slopePct < b.hi) b.n++;
      if (slopePct < 15) buildable++;
      // aspect = compass bearing of the downhill direction (−gradient)
      if (slopePct > 1) {
        const bearing = (Math.atan2(-gx, -gy) * DEG + 360) % 360;
        aspectBins[Math.round(bearing / 45) % 8]++;
      }
    }
  }

  const aspectTotal = aspectBins.reduce((a, b) => a + b, 0);
  const aspectDist = COMPASS8.map((dir, i) => ({
    dir,
    pct: aspectTotal ? Math.round((aspectBins[i] / aspectTotal) * 1000) / 10 : 0
  }));
  const dominantAspect = aspectTotal ? COMPASS8[aspectBins.indexOf(Math.max(...aspectBins))] : null;

  // Located high/low points over MEASURED cells only.
  let high: TerrainDeep["highPoint"] = null;
  let low: TerrainDeep["lowPoint"] = null;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (fabricated[r][c]) continue;
      const z = grid[r][c];
      const lon = w + ((e - w) * c) / (n - 1);
      const lat = s + ((nth - s) * r) / (n - 1);
      if (!high || z > high.elev) high = { lat, lon, elev: Math.round(z * 10) / 10 };
      if (!low || z < low.elev) low = { lat, lon, elev: Math.round(z * 10) / 10 };
    }
  }

  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    fabricatedPct: Math.round((fabCount / (n * n)) * 1000) / 10,
    relief: stats.min != null && stats.max != null ? r1(stats.max - stats.min) : 0,
    meanSlopePct: measuredInterior ? r1(slopeSum / measuredInterior) : 0,
    maxSlopePct: r1(maxSlope),
    resMeters: r1(resMeters),
    slopeBands: slopeBands.map((b) => ({
      band: b.band,
      pct: measuredInterior ? Math.round((b.n / measuredInterior) * 1000) / 10 : 0
    })),
    aspect: { dominant: dominantAspect, distribution: aspectDist },
    buildablePct: measuredInterior ? Math.round((buildable / measuredInterior) * 1000) / 10 : 0,
    highPoint: high,
    lowPoint: low,
    suggestedDatumM: low ? low.elev : null
  };
}
