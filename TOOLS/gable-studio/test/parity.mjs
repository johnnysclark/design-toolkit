// parity.mjs — run the JS core over several cases and dump metrics to JSON so
// python/gable_core.py can be checked against it. Node 18+ (uses structuredClone).
//   node test/parity.mjs   (run from TOOLS/gable-studio/)
import { DEFAULTS, analyze } from "../web/core.js";
import { writeFileSync } from "node:fs";

const P = DEFAULTS.params, S = DEFAULTS.site;
const cases = [
  { name: "defaults", params: structuredClone(P), site: structuredClone(S) },
  {
    name: "rotated+offset",
    params: Object.assign(structuredClone(P), { Rr: 25, Rp: -10, Rg: 40, cx: 0.8, cy: -0.6 }),
    site: Object.assign(structuredClone(S), { northAngle: 30 }),
  },
  {
    name: "earth-coupled",
    params: Object.assign(structuredClone(P), { Hp: 2.4, e: 1.8, Hg: 1.2 }),
    site: Object.assign(structuredClone(S), { latitude: 55, windFromAz: 200, windSpeed: 9 }),
  },
  {
    name: "tall+south-heavy",
    params: Object.assign(structuredClone(P), { Hr: 4.5, Hg: 4.0, Wr: 5, Dr: 12 }),
    site: Object.assign(structuredClone(S), { latitude: 30, viewTargetAz: 160 }),
  },
];

const out = cases.map((c) => {
  const { metrics } = analyze(c.params, c.site);
  return { name: c.name, params: c.params, site: c.site, metrics };
});
writeFileSync(new URL("./_parity.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} cases to test/_parity.json`);
