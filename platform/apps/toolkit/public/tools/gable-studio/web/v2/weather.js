// weather.js (v2 · Benchmark Track, Phase 2.5 — STAGE A) -------------------------
//
// Zero-dependency EPW (EnergyPlus Weather) parser + climate aggregation. This is
// the "Stage A" the overhaul plan describes: a JS-canonical fixture generator that
// runs ONCE on load and is NOT part of the JS↔Python parity surface. It turns an
// 8760-row weather file into a small, fixed-size climate summary (monthly means,
// annual totals, a wind rose, design conditions) that downstream physical-unit
// metrics (kWh/m², comfort) will consume.
//
// Honesty: nothing here is "comparable to Ladybug" yet — this only reads the same
// weather file Ladybug reads, so a later side-by-side starts from identical inputs.
// The radiation→geometry step (Perez sky + the parity-ported raycast) is the NEXT
// increment and is deliberately not here.
//
// EPW spec: 8 header records, then hourly rows. Columns we use (0-indexed), with
// the file's "missing" sentinels:
//   6  dry-bulb °C        (missing 99.9)
//   7  dew-point °C       (missing 99.9)
//   8  relative humidity %(missing 999)
//   9  pressure Pa        (missing 999999)
//   13 global horiz Wh/m² (missing 9999)
//   14 direct normal Wh/m²(missing 9999)
//   15 diffuse horiz Wh/m²(missing 9999)
//   20 wind direction °   (missing 999)
//   21 wind speed m/s     (missing 999)
//   22 total sky cover    (missing 99)

import { buildSkyMatrix, referenceOrientations, dayOfYear } from "./sky.js";

const COL = {
  dbt: { i: 6, miss: 99.9 }, dpt: { i: 7, miss: 99.9 }, rh: { i: 8, miss: 999 },
  pressure: { i: 9, miss: 999999 }, ghi: { i: 13, miss: 9999 }, dni: { i: 14, miss: 9999 },
  dhi: { i: 15, miss: 9999 }, windDir: { i: 20, miss: 999 }, windSpeed: { i: 21, miss: 999 },
  skyCover: { i: 22, miss: 99 },
};

function cell(parts, def) {
  const v = parseFloat(parts[def.i]);
  if (!Number.isFinite(v)) return NaN;
  // sentinels are exact (99.9 / 999 / 9999 / 999999); treat at-or-above as missing
  return v >= def.miss - 1e-6 ? NaN : v;
}
const meanOf = (a) => { let s = 0, n = 0; for (const x of a) if (Number.isFinite(x)) { s += x; n++; } return n ? s / n : NaN; };
const sumOf = (a) => { let s = 0; for (const x of a) if (Number.isFinite(x)) s += x; return s; };
function percentile(arr, p) {
  const v = arr.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const idx = Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))));
  return v[idx];
}

// 16-point compass, N at index 0, clockwise.
export const ROSE_DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const SPEED_EDGES = [0.5, 2, 4, 6, 8, 10]; // m/s bin upper edges; below 0.5 = calm, above 10 = top bin

// Parse an EPW file's text into a compact, JSON-serialisable climate object.
export function parseEPW(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  if (!lines.length) throw new Error("empty file");

  // header
  const loc = lines[0].split(",");
  if ((loc[0] || "").toUpperCase() !== "LOCATION") throw new Error("not an EPW (no LOCATION header)");
  const location = {
    city: loc[1] || "", state: loc[2] || "", country: loc[3] || "",
    lat: parseFloat(loc[6]), lon: parseFloat(loc[7]), tz: parseFloat(loc[8]), elev: parseFloat(loc[9]),
  };
  const dpIdx = lines.findIndex((l) => l.toUpperCase().startsWith("DATA PERIODS"));
  if (dpIdx < 0) throw new Error("not an EPW (no DATA PERIODS header)");
  const recordsPerHour = parseInt((lines[dpIdx].split(",")[2] || "1"), 10) || 1;
  const rows = lines.slice(dpIdx + 1).map((l) => l.split(",")).filter((p) => p.length >= 22);
  if (!rows.length) throw new Error("EPW has no hourly data rows");

  // hourly typed arrays + month index (1..12) per row
  const month = [], dbt = [], dpt = [], rh = [], ghi = [], dni = [], dhi = [], windDir = [], windSpeed = [], sky = [], hour = [], doy = [];
  for (const p of rows) {
    const mo = parseInt(p[1], 10);
    month.push(mo); hour.push(parseFloat(p[3])); doy.push(dayOfYear(mo, parseInt(p[2], 10)));
    dbt.push(cell(p, COL.dbt)); dpt.push(cell(p, COL.dpt)); rh.push(cell(p, COL.rh));
    ghi.push(cell(p, COL.ghi)); dni.push(cell(p, COL.dni)); dhi.push(cell(p, COL.dhi));
    windDir.push(cell(p, COL.windDir)); windSpeed.push(cell(p, COL.windSpeed)); sky.push(cell(p, COL.skyCover));
  }
  const n = rows.length;

  // monthly aggregates (12 entries). Radiation: mean W/m² over hours + total kWh/m².
  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    const pick = (arr) => arr.filter((_, k) => month[k] === m);
    const mg = pick(ghi), md = pick(dni), mf = pick(dhi);
    monthly.push({
      dbtMean: round3(meanOf(pick(dbt))), rhMean: round3(meanOf(pick(rh))),
      windSpeedMean: round3(meanOf(pick(windSpeed))),
      ghiMean: round3(meanOf(mg)), dniMean: round3(meanOf(md)), dhiMean: round3(meanOf(mf)),
      ghiTotalKWh: round3(sumOf(mg) / 1000), dniTotalKWh: round3(sumOf(md) / 1000), dhiTotalKWh: round3(sumOf(mf) / 1000),
    });
  }

  // annual
  const annual = {
    dbtMean: round3(meanOf(dbt)), rhMean: round3(meanOf(rh)), windSpeedMean: round3(meanOf(windSpeed)),
    ghiTotalKWh: round3(sumOf(ghi) / 1000), dniTotalKWh: round3(sumOf(dni) / 1000), dhiTotalKWh: round3(sumOf(dhi) / 1000),
    diurnalRange: round3(meanOf(monthlyDiurnal(month, dbt))),
  };

  // design conditions (ASHRAE-style heating/cooling percentiles of dry-bulb)
  const design = {
    heating_99_6: round3(percentile(dbt, 0.004)),   // 99.6% (cold)
    cooling_0_4: round3(percentile(dbt, 0.996)),     // 0.4% (hot)
    tMin: round3(percentile(dbt, 0)), tMax: round3(percentile(dbt, 1)),
  };

  // STAGE A radiation: build the cumulative sky matrix (Tregenza-145) and the
  // five teaching orientations in real kWh/m²·yr.
  const tz = Number.isFinite(location.tz) ? location.tz : Math.round((location.lon || 0) / 15);
  const skyMatrix = buildSkyMatrix({ lat: location.lat, lon: location.lon, tz, doy, hour, dni, dhi });

  return {
    location, recordsPerHour, nRows: n, leap: n >= 8784,
    monthly, annual, design,
    windRose: windRose(windDir, windSpeed),
    sun: { matrix: skyMatrix, reference: referenceOrientations(skyMatrix) },
  };
}

// approximate daily diurnal range per month: mean(monthly Tmax) - mean(monthly Tmin)
function monthlyDiurnal(month, dbt) {
  // group into days isn't tracked here; approximate with monthly Tmax-Tmin which is
  // an upper bound on the swing — labelled as such where shown.
  const out = [];
  for (let m = 1; m <= 12; m++) {
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < dbt.length; k++) if (month[k] === m && Number.isFinite(dbt[k])) { if (dbt[k] < lo) lo = dbt[k]; if (dbt[k] > hi) hi = dbt[k]; }
    if (hi > lo) out.push(hi - lo);
  }
  return out;
}

function windRose(dir, speed) {
  const bins = ROSE_DIRS.map(() => SPEED_EDGES.map(() => 0).concat([0])); // [16][speedBins+1]
  let calm = 0, total = 0;
  let sumU = 0, sumV = 0, sumS = 0, nS = 0;
  for (let k = 0; k < dir.length; k++) {
    const s = speed[k], d = dir[k];
    if (!Number.isFinite(s)) continue;
    total++;
    if (s < 0.5 || !Number.isFinite(d)) { calm++; continue; }
    const di = ((Math.round(d / 22.5) % 16) + 16) % 16;
    let si = SPEED_EDGES.findIndex((e) => s <= e); if (si < 0) si = SPEED_EDGES.length;
    bins[di][si]++;
    const r = d * Math.PI / 180; sumU += s * Math.sin(r); sumV += s * Math.cos(r); sumS += s; nS++;
  }
  // prevailing direction = vector-mean bearing the wind comes FROM
  const prevailingAz = nS ? ((Math.atan2(sumU, sumV) * 180 / Math.PI) + 360) % 360 : NaN;
  return {
    dirs: ROSE_DIRS, speedEdges: SPEED_EDGES.slice(),
    counts: bins, total, calm,
    calmPct: total ? round3(100 * calm / total) : 0,
    prevailingAz: round3(prevailingAz), meanSpeed: nS ? round3(sumS / nS) : 0,
  };
}

const round3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : NaN);

// A one-line human summary for the UI / status line.
export function describeClimate(c) {
  const L = c.location;
  return `${L.city || "site"} (${round3(L.lat)}°, ${round3(L.lon)}°) · annual mean ${c.annual.dbtMean}°C, RH ${c.annual.rhMean}% · prevailing wind from ${c.windRose.prevailingAz}° at ${c.windRose.meanSpeed} m/s · GHI ${c.annual.ghiTotalKWh} kWh/m²·yr`;
}
