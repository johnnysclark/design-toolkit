// rad_ref.mjs — write the JS reference for the radiation parity test.
// Builds the default model + a deterministic sky matrix, computes occluded
// per-surface incident radiation, and writes test/_rad_parity.json. The python
// port (python/radiation.py) must reproduce these values (test/parity_rad.py).
// Run: node test/rad_ref.mjs   (from the gable-studio folder)
import { writeFileSync } from "fs";
import { DEFAULTS, buildModel } from "../web/core.js";
import { PATCHES, incidentByModel } from "../web/radiation.js";

const params = DEFAULTS.params, site = DEFAULTS.site;
const model = buildModel(params, site);

// A deterministic, varied sky matrix (kWh/m² per patch) — shared verbatim with
// python via the JSON, so only the consume-the-matrix math is under test.
const R = PATCHES.map((pt, i) => 8 + 4 * Math.sin(pt.alt * Math.PI / 180) + (i % 9) * 0.3);

const result = incidentByModel(model, R);
writeFileSync(new URL("./_rad_parity.json", import.meta.url), JSON.stringify({ params, site, R, result }, null, 1));
console.log(`wrote _rad_parity.json — ${result.faceVals.length} faces, ${result.apVals.length} apertures; envelopeMean=${result.envelopeMean.toFixed(4)}, glazingMean=${result.glazingMean.toFixed(4)}`);
console.log("face kWh:", result.faceVals.map((f) => `${f.name}:${f.kwh.toFixed(1)}`).join("  "));
