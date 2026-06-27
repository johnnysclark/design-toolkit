// climate.ts — architect-relevant derivations from the hourly Open-Meteo year.
//
// The raw fetch (datasources.climateYear) already pulls a full year of hourly
// temp / RH / dew / wind / pressure / GHI-DNI-DHI / cloud / precip / snow. The
// engine previously surfaced only a wind rose, sun path, monthly temp/RH and a
// handful of annual means — leaving most of the design signal on the table. This
// module computes the metrics a studio actually designs against:
//
//   degree-days by month · adaptive comfort hours · ASHRAE design days ·
//   solar gain by façade orientation · Givoni passive-strategy mix ·
//   seasonal prevailing wind · daylight (sunrise/sunset/length) · precip & snow
//
// All pure functions over ClimateRaw — safe on server or client.

import type { ClimateRaw } from "./datasources";
import { solarPosition } from "./geo";

const RAD = Math.PI / 180;

export interface ClimateDeep {
  monthlyDegreeDays: { month: number; hdd: number; cdd: number }[];
  comfort: {
    model: string;
    comfortablePct: number;
    tooHotPct: number;
    tooColdPct: number;
    monthlyComfortPct: number[];
  };
  designDays: {
    heating996: number | null; // 99.6% heating dry-bulb (cold)
    heating99: number | null;
    cooling04: number | null; // 0.4% cooling dry-bulb (hot)
    cooling1: number | null;
    cooling2: number | null;
    extremeMin: number | null;
    extremeMax: number | null;
  };
  facadeSolar: { orientation: string; azimuth: number; tilt: number; kwhM2Yr: number }[];
  strategies: { name: string; pct: number }[];
  seasonalWind: { season: string; dir: string | null; fraction: number }[];
  daylight: { label: string; sunriseHour: number | null; sunsetHour: number | null; hours: number }[];
  water: {
    annualPrecipMm: number | null;
    monthlyPrecipMm: number[];
    annualSnowCm: number | null;
    wetDays: number | null; // days with >1mm precipitation
  };
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass = (deg: number) => COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
const monthOf = (iso: string) => Number(iso.slice(5, 7)) - 1;
const dayOf = (iso: string) => iso.slice(0, 10);

// --- psychrometrics --------------------------------------------------------

// Saturation vapour pressure (Pa) over water, Magnus/Tetens form. T in °C.
function pws(t: number): number {
  return 610.94 * Math.exp((17.625 * t) / (t + 243.04));
}
// Humidity ratio (kg/kg) from dry-bulb (°C), RH (%), station pressure (Pa).
function humidityRatio(t: number, rh: number, pPa: number): number {
  const pw = (Math.max(0, Math.min(100, rh)) / 100) * pws(t);
  const denom = pPa - pw;
  return denom > 0 ? (0.62198 * pw) / denom : 0;
}

// --- main ------------------------------------------------------------------

export function deriveClimate(raw: ClimateRaw): ClimateDeep {
  return {
    monthlyDegreeDays: monthlyDegreeDays(raw),
    comfort: adaptiveComfort(raw),
    designDays: designDays(raw),
    facadeSolar: facadeSolar(raw),
    strategies: givoniStrategies(raw),
    seasonalWind: seasonalWind(raw),
    daylight: daylight(raw),
    water: water(raw)
  };
}

// Heating + cooling degree-days per month, base 18 °C, from daily mean temp.
function monthlyDegreeDays(raw: ClimateRaw): ClimateDeep["monthlyDegreeDays"] {
  const days = new Map<string, { sum: number; n: number; month: number }>();
  for (let i = 0; i < raw.time.length; i++) {
    const t = raw.tempC[i];
    if (t == null || Number.isNaN(t)) continue;
    const key = dayOf(raw.time[i]);
    let d = days.get(key);
    if (!d) {
      d = { sum: 0, n: 0, month: monthOf(raw.time[i]) };
      days.set(key, d);
    }
    d.sum += t;
    d.n++;
  }
  const out = Array.from({ length: 12 }, (_, m) => ({ month: m, hdd: 0, cdd: 0 }));
  for (const d of days.values()) {
    if (!d.n) continue;
    const mean = d.sum / d.n;
    out[d.month].hdd += Math.max(0, 18 - mean);
    out[d.month].cdd += Math.max(0, mean - 18);
  }
  for (const o of out) {
    o.hdd = Math.round(o.hdd);
    o.cdd = Math.round(o.cdd);
  }
  return out;
}

// ASHRAE-55 adaptive comfort for naturally-ventilated spaces. Comfort temp =
// 0.31·Trm + 17.8, where Trm is the running-mean outdoor temp; 80%-acceptability
// band ±3.5 °C. Operative temp is approximated by air temp (no MRT/airspeed term),
// so this is a screening read, not a verdict — labelled as such.
function adaptiveComfort(raw: ClimateRaw): ClimateDeep["comfort"] {
  // daily mean temps in order
  const dayMeans = new Map<string, { sum: number; n: number }>();
  const order: string[] = [];
  for (let i = 0; i < raw.time.length; i++) {
    const key = dayOf(raw.time[i]);
    let d = dayMeans.get(key);
    if (!d) {
      d = { sum: 0, n: 0 };
      dayMeans.set(key, d);
      order.push(key);
    }
    const t = raw.tempC[i];
    if (t != null && !Number.isNaN(t)) {
      d.sum += t;
      d.n++;
    }
  }
  // Exponentially-weighted running mean (alpha 0.8) of PRIOR-day means. EN 15251 /
  // ASHRAE-55: today's running mean must depend only on PRECEDING days, so fold in
  // the previous day's mean, not today's.
  const trm = new Map<string, number>();
  let prevTrm: number | null = null;
  let prevDayMean: number | null = null;
  for (const key of order) {
    const dm = dayMeans.get(key)!;
    const mean: number = dm.n ? dm.sum / dm.n : prevDayMean ?? 15;
    const tr: number = prevTrm == null ? prevDayMean ?? mean : 0.8 * prevTrm + 0.2 * prevDayMean!;
    trm.set(key, tr);
    prevTrm = tr;
    prevDayMean = mean;
  }

  let comfortable = 0;
  let hot = 0;
  let cold = 0;
  let total = 0;
  const monthC = Array.from({ length: 12 }, () => ({ ok: 0, n: 0 }));
  for (let i = 0; i < raw.time.length; i++) {
    const t = raw.tempC[i];
    if (t == null || Number.isNaN(t)) continue;
    const tr = trm.get(dayOf(raw.time[i]));
    if (tr == null) continue;
    // adaptive model is defined for ~10–33.5 °C running mean; clamp gently
    const tComf = 0.31 * Math.max(10, Math.min(33.5, tr)) + 17.8;
    total++;
    const m = monthOf(raw.time[i]);
    monthC[m].n++;
    if (t < tComf - 3.5) cold++;
    else if (t > tComf + 3.5) hot++;
    else {
      comfortable++;
      monthC[m].ok++;
    }
  }
  const pct = (x: number) => (total ? Math.round((x / total) * 1000) / 10 : 0);
  return {
    model: "ASHRAE-55 adaptive (naturally ventilated; air temp ≈ operative)",
    comfortablePct: pct(comfortable),
    tooHotPct: pct(hot),
    tooColdPct: pct(cold),
    monthlyComfortPct: monthC.map((m) => (m.n ? Math.round((m.ok / m.n) * 1000) / 10 : 0))
  };
}

// ASHRAE-style design conditions as temperature percentiles of the hourly year.
function designDays(raw: ClimateRaw): ClimateDeep["designDays"] {
  const temps = raw.tempC.filter((t): t is number => t != null && !Number.isNaN(t)).slice().sort((a, b) => a - b);
  const N = temps.length;
  if (!N) {
    return { heating996: null, heating99: null, cooling04: null, cooling1: null, cooling2: null, extremeMin: null, extremeMax: null };
  }
  const at = (p: number) => {
    const idx = Math.max(0, Math.min(N - 1, Math.round(p * (N - 1))));
    return Math.round(temps[idx] * 10) / 10;
  };
  return {
    heating996: at(0.004), // exceeded 99.6% of the year
    heating99: at(0.01),
    cooling04: at(0.996), // exceeded only 0.4% of the year
    cooling1: at(0.99),
    cooling2: at(0.98),
    extremeMin: Math.round(temps[0] * 10) / 10,
    extremeMax: Math.round(temps[N - 1] * 10) / 10
  };
}

// Annual incident solar on vertical façades (8 orientations) + roof, kWh/m²·yr.
// Per hour: beam DNI·cosθ + sky-diffuse share + ground-reflected share.
function facadeSolar(raw: ClimateRaw): ClimateDeep["facadeSolar"] {
  const albedo = 0.2;
  const orientations = [
    { orientation: "N", azimuth: 0 },
    { orientation: "NE", azimuth: 45 },
    { orientation: "E", azimuth: 90 },
    { orientation: "SE", azimuth: 135 },
    { orientation: "S", azimuth: 180 },
    { orientation: "SW", azimuth: 225 },
    { orientation: "W", azimuth: 270 },
    { orientation: "NW", azimuth: 315 }
  ];
  const tilt = 90;
  const cosTilt = Math.cos(tilt * RAD);
  const skyShare = (1 + cosTilt) / 2; // 0.5 for vertical
  const groundShare = (1 - cosTilt) / 2; // 0.5 for vertical
  const sums = orientations.map(() => 0);
  let roof = 0;

  for (let i = 0; i < raw.time.length; i++) {
    const ghi = raw.ghi[i];
    if (ghi == null || ghi <= 0) continue;
    roof += ghi; // horizontal surface ≈ GHI
    const dni = raw.dni[i] ?? 0;
    const dhi = raw.dhi[i] ?? 0;
    // sun position for this hour (interpret site-local time → UTC via tz offset)
    const utc = new Date(raw.time[i] + ":00Z");
    utc.setUTCMinutes(utc.getUTCMinutes() - Math.round(raw.tzOffsetHours * 60));
    const { altitude, azimuth } = solarPosition(raw.lat, raw.lon, utc);
    if (altitude <= 0) continue;
    const altR = altitude * RAD;
    for (let k = 0; k < orientations.length; k++) {
      // incidence on a vertical plane facing `azimuth`
      const cosInc = Math.cos(altR) * Math.cos((azimuth - orientations[k].azimuth) * RAD);
      const beam = dni * Math.max(0, cosInc);
      const diffuse = dhi * skyShare;
      const reflected = ghi * albedo * groundShare;
      sums[k] += beam + diffuse + reflected;
    }
  }
  const toKwh = (whSum: number) => Math.round((whSum / 1000) * 10) / 10; // Wh→kWh
  const out = orientations.map((o, k) => ({
    orientation: o.orientation,
    azimuth: o.azimuth,
    tilt,
    kwhM2Yr: toKwh(sums[k])
  }));
  out.push({ orientation: "Roof (horizontal)", azimuth: 0, tilt: 0, kwhM2Yr: toKwh(roof) });
  return out;
}

// Givoni building-bioclimatic strategy mix — share of hours each passive strategy
// can hold comfort, by dry-bulb + humidity ratio. A deliberately simplified,
// mutually-exclusive zoning of the psychrometric chart (clearly an approximation).
function givoniStrategies(raw: ClimateRaw): ClimateDeep["strategies"] {
  const buckets = new Map<string, number>();
  let total = 0;
  const add = (k: string) => buckets.set(k, (buckets.get(k) ?? 0) + 1);
  for (let i = 0; i < raw.time.length; i++) {
    const t = raw.tempC[i];
    const rh = raw.rh[i];
    if (t == null || rh == null || Number.isNaN(t) || Number.isNaN(rh)) continue;
    const pPa = (raw.pressure[i] ?? 1013) * 100;
    const w = humidityRatio(t, rh, pPa);
    total++;
    if (t >= 20 && t <= 27 && w >= 0.004 && w <= 0.012) add("Comfort (no system)");
    else if (t < 7) add("Conventional heating");
    else if (t < 14) add("Passive/active solar heating");
    else if (t < 20) add("Internal heat gain");
    // Hot + dry → evaporative cooling stays viable to ~42 °C on Givoni's chart;
    // test it BEFORE the blanket hot/humid mechanical-cooling cutoff.
    else if (w < 0.007 && t > 30 && t <= 42) add("Evaporative cooling");
    else if (t > 34 || w > 0.02) add("Cooling / dehumidification");
    else if (t <= 32 && w >= 0.012) add("Natural ventilation");
    else if (w < 0.007) add("Thermal mass + night flush");
    else add("Thermal mass");
  }
  if (!total) return [];
  return [...buckets.entries()]
    .map(([name, count]) => ({ name, pct: Math.round((count / total) * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}

// Prevailing wind direction by meteorological season (DJF/MAM/JJA/SON).
function seasonalWind(raw: ClimateRaw): ClimateDeep["seasonalWind"] {
  const seasons = [
    { season: "Winter (DJF)", months: [11, 0, 1] },
    { season: "Spring (MAM)", months: [2, 3, 4] },
    { season: "Summer (JJA)", months: [5, 6, 7] },
    { season: "Autumn (SON)", months: [8, 9, 10] }
  ];
  return seasons.map((s) => {
    const bins = new Array(16).fill(0);
    let n = 0;
    for (let i = 0; i < raw.time.length; i++) {
      if (!s.months.includes(monthOf(raw.time[i]))) continue;
      const spd = raw.windSpeed[i];
      const dir = raw.windDir[i];
      if (spd == null || dir == null || spd < 0.5) continue;
      bins[Math.floor((((dir + 11.25) % 360) + 360) % 360 / 22.5) % 16]++;
      n++;
    }
    if (!n) return { season: s.season, dir: null, fraction: 0 };
    const idx = bins.indexOf(Math.max(...bins));
    return { season: s.season, dir: COMPASS[idx], fraction: Math.round((bins[idx] / n) * 1000) / 10 };
  });
}

// Sunrise/sunset/day-length for the marker days, scanning solar altitude.
function daylight(raw: ClimateRaw): ClimateDeep["daylight"] {
  const days = [
    { label: "Jun 21 (summer)", month: 5, day: 21 },
    { label: "Mar 21 (equinox)", month: 2, day: 21 },
    { label: "Dec 21 (winter)", month: 11, day: 21 }
  ];
  const year = raw.year;
  return days.map((d) => {
    let rise: number | null = null;
    let set: number | null = null;
    for (let h = 0; h <= 24; h += 0.25) {
      const utc = new Date(Date.UTC(year, d.month, d.day, 0, 0, 0));
      utc.setUTCMinutes(utc.getUTCMinutes() + Math.round((h - raw.tzOffsetHours) * 60));
      const { altitude } = solarPosition(raw.lat, raw.lon, utc);
      if (altitude > 0) {
        if (rise == null) rise = h;
        set = h;
      }
    }
    const hours = rise != null && set != null ? Math.round((set - rise) * 10) / 10 : 0;
    return {
      label: d.label,
      sunriseHour: rise,
      sunsetHour: set,
      hours
    };
  });
}

// Annual + monthly precipitation, snow, and wet-day count.
function water(raw: ClimateRaw): ClimateDeep["water"] {
  const hasPrecip = raw.precip?.some((v) => v != null);
  const hasSnow = raw.snow?.some((v) => v != null);
  const monthly = new Array(12).fill(0);
  const dayPrecip = new Map<string, number>();
  let annual = 0;
  let snow = 0;
  for (let i = 0; i < raw.time.length; i++) {
    const p = raw.precip?.[i];
    if (p != null && !Number.isNaN(p) && p > 0) {
      annual += p;
      monthly[monthOf(raw.time[i])] += p;
      const key = dayOf(raw.time[i]);
      dayPrecip.set(key, (dayPrecip.get(key) ?? 0) + p);
    }
    const s = raw.snow?.[i];
    if (s != null && !Number.isNaN(s) && s > 0) snow += s;
  }
  let wetDays = 0;
  for (const v of dayPrecip.values()) if (v > 1) wetDays++;
  return {
    annualPrecipMm: hasPrecip ? Math.round(annual) : null,
    monthlyPrecipMm: monthly.map((v) => Math.round(v)),
    annualSnowCm: hasSnow ? Math.round(snow) : null,
    wetDays: hasPrecip ? wetDays : null
  };
}
