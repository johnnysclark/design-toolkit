// geo.ts — dependency-free geometry + climate math (pure; safe on server & client).
//
// Ported from TOOLS/site-analyzer/web/geo.js. Three jobs:
//   1. Solar position (NOAA algorithm) → sun-path diagram for the site.
//   2. Climate binning (wind rose, monthly profiles) over the hourly Open-Meteo series.
//   3. Map projection (lat/lon → local metres) so terrain/boundary export at the
//      right footprint and orientation.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface SunSample {
  hour: number;
  altitude: number;
  azimuth: number;
}
export interface SunPath {
  key: string;
  label: string;
  month: number;
  day: number;
  points: SunSample[];
  peakAltitude: number;
}
export interface WindRose {
  dirs: string[];
  bands: number[];
  matrix: number[][];
  calmFraction: number;
  sector: number;
}
export interface MonthStat {
  mean: number | null;
  min: number | null;
  max: number | null;
}
export interface Projector {
  toLocal(lon: number, lat: number): [number, number];
  mPerDegLat: number;
  mPerDegLon: number;
}

// --- Solar position --------------------------------------------------------

// NOAA solar position algorithm. `date` is a JS Date interpreted in UTC.
// Returns { altitude, azimuth } in degrees. Azimuth is measured clockwise from
// true north (0 = N, 90 = E, 180 = S, 270 = W).
export function solarPosition(
  lat: number,
  lon: number,
  date: Date
): { altitude: number; azimuth: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;

  const L0 = mod(280.46646 + t * (36000.76983 + t * 0.0003032), 360);
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const Mr = M * RAD;

  const C =
    Math.sin(Mr) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * Mr) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * Mr) * 0.000289;

  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);

  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);

  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;

  const y = Math.tan((eps * RAD) / 2) ** 2;
  const eot =
    4 *
    DEG *
    (y * Math.sin(2 * L0 * RAD) -
      2 * e * Math.sin(Mr) +
      4 * e * y * Math.sin(Mr) * Math.cos(2 * L0 * RAD) -
      0.5 * y * y * Math.sin(4 * L0 * RAD) -
      1.25 * e * e * Math.sin(2 * Mr));

  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const tst = mod(minutes + eot + 4 * lon, 1440); // lon east-positive
  let ha = tst / 4 - 180; // hour angle, degrees
  if (ha < -180) ha += 360;

  const latR = lat * RAD;
  const declR = decl * RAD;
  const haR = ha * RAD;

  const altitude =
    Math.asin(Math.sin(latR) * Math.sin(declR) + Math.cos(latR) * Math.cos(declR) * Math.cos(haR)) *
    DEG;

  const azimuth = mod(
    Math.atan2(Math.sin(haR), Math.cos(haR) * Math.sin(latR) - Math.tan(declR) * Math.cos(latR)) *
      DEG +
      180,
    360
  );

  return { altitude, azimuth };
}

// Sun-path arcs for the diagram: for each marker day (summer/winter solstice,
// equinox), an array of {hour, altitude, azimuth} sampled every 30 min while the
// sun is up. `tzOffsetHours` converts the site's local clock to UTC for the calc.
export function sunPaths(lat: number, lon: number, tzOffsetHours: number): SunPath[] {
  const days = [
    { key: "summer", label: "Jun 21 (summer solstice)", month: 5, day: 21 },
    { key: "equinox", label: "Mar 21 (equinox)", month: 2, day: 21 },
    { key: "winter", label: "Dec 21 (winter solstice)", month: 11, day: 21 }
  ];
  const year = 2023;
  return days.map((d) => {
    const points: SunSample[] = [];
    for (let h = 0; h <= 24; h += 0.5) {
      // Local time h → UTC.
      const utc = new Date(Date.UTC(year, d.month, d.day, 0, 0, 0));
      utc.setUTCMinutes(utc.getUTCMinutes() + Math.round((h - tzOffsetHours) * 60));
      const { altitude, azimuth } = solarPosition(lat, lon, utc);
      if (altitude > 0) points.push({ hour: h, altitude, azimuth });
    }
    // Noon-ish peak altitude is a useful summary number.
    const peak = points.reduce((m, p) => Math.max(m, p.altitude), 0);
    return { ...d, points, peakAltitude: peak };
  });
}

// --- Climate binning -------------------------------------------------------

// Wind rose: fraction of hours in each of `dirBins` compass sectors, split by
// speed band. matrix[d][b] is a fraction of all hours. Calm hours (≈0 wind)
// are tallied separately.
export function windRose(
  speeds: number[],
  directions: number[],
  dirBins = 16,
  speedBands = [2, 4, 6, 8]
): WindRose {
  const bands = [...speedBands, Infinity];
  const matrix = Array.from({ length: dirBins }, () => new Array(bands.length).fill(0));
  let calm = 0;
  let n = 0;
  const sector = 360 / dirBins;
  for (let i = 0; i < speeds.length; i++) {
    const s = speeds[i];
    const dir = directions[i];
    if (s == null || dir == null || Number.isNaN(s) || Number.isNaN(dir)) continue;
    n++;
    if (s < 0.5) {
      calm++;
      continue;
    }
    const d = Math.floor(mod(dir + sector / 2, 360) / sector) % dirBins;
    let b = bands.findIndex((hi) => s < hi);
    if (b < 0) b = bands.length - 1;
    matrix[d][b]++;
  }
  if (n > 0) {
    for (let d = 0; d < dirBins; d++)
      for (let b = 0; b < bands.length; b++) matrix[d][b] /= n;
  }
  const dirs = Array.from({ length: dirBins }, (_, d) => compass(d * sector));
  return { dirs, bands: speedBands, matrix, calmFraction: n ? calm / n : 0, sector };
}

// Monthly mean (and min/max) of an hourly series indexed against ISO time strings.
export function monthlyStats(times: string[], values: number[]): MonthStat[] {
  const months = Array.from({ length: 12 }, () => ({
    sum: 0,
    n: 0,
    min: Infinity,
    max: -Infinity
  }));
  for (let i = 0; i < times.length; i++) {
    const v = values[i];
    if (v == null || Number.isNaN(v)) continue;
    const m = Number(times[i].slice(5, 7)) - 1;
    const b = months[m];
    b.sum += v;
    b.n++;
    if (v < b.min) b.min = v;
    if (v > b.max) b.max = v;
  }
  return months.map((b) => ({
    mean: b.n ? b.sum / b.n : null,
    min: b.n ? b.min : null,
    max: b.n ? b.max : null
  }));
}

function compass(deg: number): string {
  const names = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
  ];
  return names[Math.round(mod(deg, 360) / 22.5) % 16];
}

// --- Map projection --------------------------------------------------------

// Equirectangular projection around a reference lat/lon → local metres (x east,
// y north). Good enough for a single site footprint; keeps Rhino geometry to scale.
export function makeProjector(refLat: number, refLon: number): Projector {
  const mPerDegLat =
    111132.92 - 559.82 * Math.cos(2 * refLat * RAD) + 1.175 * Math.cos(4 * refLat * RAD);
  const mPerDegLon = 111412.84 * Math.cos(refLat * RAD) - 93.5 * Math.cos(3 * refLat * RAD);
  return {
    toLocal(lon: number, lat: number): [number, number] {
      return [(lon - refLon) * mPerDegLon, (lat - refLat) * mPerDegLat];
    },
    mPerDegLat,
    mPerDegLon
  };
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
