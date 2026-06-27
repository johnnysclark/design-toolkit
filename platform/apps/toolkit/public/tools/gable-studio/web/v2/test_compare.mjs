// test_compare.mjs — validates the Ladybug comparison logic.
// Run: node web/v2/test_compare.mjs
import { oursReference, parseLadybugCSV, compareRows, comparisonPack } from "./compare.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };

// --- CSV parsing: comma/tab, optional header, fuzzy keys -------------------
const p1 = parseLadybugCSV("horizontal,1600\nsouth,1200\nN,400\neast,800\nW,810");
check("parse comma + N/W aliases", p1.horizontal === 1600 && p1.south === 1200 && p1.north === 400 && p1.east === 800 && p1.west === 810, p1);
const p2 = parseLadybugCSV("key\tvalue\nSouth Wall\t1300\nH\t1480");
check("parse tab + header + 'South Wall'", p2.south === 1300 && p2.horizontal === 1480, p2);
check("garbage lines ignored", Object.keys(parseLadybugCSV("hello world\n\n# comment")).length === 0, parseLadybugCSV("hello world"));

// --- comparison rows + status bands ----------------------------------------
const climate = {
  location: { city: "X", lat: 42, lon: -71 }, annual: { ghiTotalKWh: 1600 },
  sun: { reference: { horizontal: 1500, south: 1100, east: 750, west: 760, north: 400 } },
};
const ours = oursReference(climate);
check("oursReference reads the 5 orientations", ours.length === 5 && ours[0].ours === 1500, ours.map((o) => o.ours));

const lb = parseLadybugCSV("horizontal,1480\nsouth,1300\nwest,745\nnorth,360"); // east omitted → na
const rows = compareRows(ours, lb);
const st = Object.fromEntries(rows.map((r) => [r.key, r.status]));
check("horizontal within 5% → ok", st.horizontal === "ok", st);     // 1500 vs 1480 = +1.35%
check("south >15% → bad", st.south === "bad", st);                   // 1100 vs 1300 = -15.4%
check("east missing → na", st.east === "na", st);
check("west within 5% → ok", st.west === "ok", st);                  // 760 vs 745 = +2.0%
check("north 5–15% → near", st.north === "near", st);               // 400 vs 360 = +11.1%
check("delta + pct computed", rows[0].delta === 20 && rows[0].pct === 1.4, { delta: rows[0].delta, pct: rows[0].pct });

// --- comparison pack --------------------------------------------------------
const pack = comparisonPack({ climate, seed: { site: { northAngle: 0 }, params: {} } }, "2026-06-27");
check("pack pins Tregenza-145 + isotropic + units", pack.manifest.patchCount === 145 && /isotropic/.test(pack.manifest.skyModel) && pack.manifest.units === "kWh/m2.yr", pack.manifest);
check("pack carries our reference", pack.oursReference.length === 5, pack.oursReference);

console.log(`\nladybug compare: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
