// parity.mjs — run the JS core over several v2 cases and dump metrics to JSON so
// python/gable_core.py can be checked against it. Node 18+.
//   node test/parity.mjs   (run from TOOLS/gable-studio/)
import { DEFAULTS, analyze } from "../web/core.js";
import { writeFileSync } from "node:fs";

const base = () => structuredClone(DEFAULTS);
const cases = [];
{ const c = base(); cases.push({ name: "defaults", ...c }); }
{
  const c = base();
  c.params.plinth.R = -10; c.params.walls.R = 25; c.params.roof.R = 18;
  c.params.walls.cx = 0.8; c.params.walls.cy = -1.2; c.params.roof.cx = -0.5;
  c.site.northAngle = 30;
  cases.push({ name: "rotated+offset", ...c });
}
{
  const c = base();
  c.params.roof.pitchL = -12; c.params.roof.pitchR = -20; c.params.roof.ridgePos = 0.3; // butterfly + offset ridge
  c.params.plinth.t = 1.6; c.site.terrain.plateauZ = 0.4; // partly buried
  cases.push({ name: "butterfly+buried", ...c });
}
{
  const c = base();
  c.params.roof.pitchL = 40; c.params.roof.pitchR = 5; c.params.walls.h = 4.5; // asymmetric / shed-ish
  c.site.latitude = 55; c.site.windFromAz = 200; c.site.windSpeed = 11;
  cases.push({ name: "asym+north", ...c });
}

const out = cases.map((c) => {
  const { metrics } = analyze(c.params, c.site);
  return { name: c.name, params: c.params, site: c.site, metrics };
});
writeFileSync(new URL("./_parity.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} cases to test/_parity.json`);
