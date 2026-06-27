// test_weather.mjs — validates the EPW parser against a synthetic, fully-known
// year. Run: node web/v2/test_weather.mjs  (from the gable-studio folder).
import { parseEPW, describeClimate } from "./weather.js";

// ---- build a synthetic EPW where every aggregate is predictable -------------
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // non-leap = 365
function synthEPW() {
  const head = [
    "LOCATION,Testville,MA,USA,Synthetic,000000,42.0,-71.0,-5.0,40.0",
    "DESIGN CONDITIONS,0",
    "TYPICAL/EXTREME PERIODS,0",
    "GROUND TEMPERATURES,0",
    "HOLIDAYS/DAYLIGHT SAVINGS,No,0,0,0",
    "COMMENTS 1,synthetic",
    "COMMENTS 2,synthetic",
    "DATA PERIODS,1,1,Data,Sunday,1/1,12/31",
  ];
  const rows = [];
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= DAYS[m - 1]; d++) for (let h = 1; h <= 24; h++) {
    const sun = h >= 8 && h <= 16;            // 9 sunny hours/day
    const f = new Array(35).fill("0");
    f[0] = 2020; f[1] = m; f[2] = d; f[3] = h; f[4] = 60; f[5] = "_";
    f[6] = m;            // dry-bulb = month  -> monthly mean = month exactly
    f[7] = m - 5;        // dew point
    f[8] = 50;           // RH
    f[9] = 101325;       // pressure
    f[13] = sun ? 500 : 0;   // GHI
    f[14] = sun ? 600 : 0;   // DNI
    f[15] = sun ? 100 : 0;   // DHI
    f[20] = 90;          // wind from due East
    f[21] = 5;           // wind speed
    f[22] = 5;           // sky cover
    rows.push(f.join(","));
  }
  return head.concat(rows).join("\n") + "\n";
}

// ---- assertions -------------------------------------------------------------
let pass = 0, fail = 0;
const approx = (a, b, eps = 0.01) => Number.isFinite(a) && Math.abs(a - b) <= eps;
function check(name, cond, got) { if (cond) { pass++; } else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } }

const c = parseEPW(synthEPW());
console.log(describeClimate(c));

check("nRows = 8760", c.nRows === 8760, c.nRows);
check("recordsPerHour = 1", c.recordsPerHour === 1, c.recordsPerHour);
check("not leap", c.leap === false, c.leap);
check("lat parsed", c.location.lat === 42, c.location.lat);
check("lon parsed", c.location.lon === -71, c.location.lon);
check("Jan dbt mean = 1", approx(c.monthly[0].dbtMean, 1), c.monthly[0].dbtMean);
check("Jul dbt mean = 7", approx(c.monthly[6].dbtMean, 7), c.monthly[6].dbtMean);
check("Dec dbt mean = 12", approx(c.monthly[11].dbtMean, 12), c.monthly[11].dbtMean);
check("RH mean = 50", approx(c.monthly[5].rhMean, 50), c.monthly[5].rhMean);
check("annual dbt mean ~ 6.526", approx(c.annual.dbtMean, 6.526, 0.01), c.annual.dbtMean);
check("annual GHI = 1642.5 kWh/m²", approx(c.annual.ghiTotalKWh, 1642.5, 0.5), c.annual.ghiTotalKWh);
check("wind rose total = 8760", c.windRose.total === 8760, c.windRose.total);
check("no calm hours", c.windRose.calm === 0, c.windRose.calm);
check("prevailing wind ~ 90° (E)", approx(c.windRose.prevailingAz, 90, 0.5), c.windRose.prevailingAz);
check("mean speed = 5", approx(c.windRose.meanSpeed, 5), c.windRose.meanSpeed);
// all wind in the East bin (index 4), speed bin for 5 m/s is index 3 (<=6)
check("rose mass in E/5-6 bin", c.windRose.counts[4][3] === 8760, c.windRose.counts[4][3]);

// sentinel handling: a row with RH=999 (missing) must not poison the mean
const withMissing = parseEPW(synthEPW().replace(",50,101325", ",999,101325")); // first row RH -> missing
check("sentinel RH dropped (mean still ~50)", approx(withMissing.monthly[0].rhMean, 50, 0.05), withMissing.monthly[0].rhMean);

console.log(`\nweather parser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
