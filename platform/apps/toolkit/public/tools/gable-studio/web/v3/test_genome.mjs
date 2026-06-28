// test_genome.mjs — gene catalog, encode/decode round-trip, and a random-genome
// finiteness sweep through the real core.js run(). Run: node web/v3/test_genome.mjs
import { DEFAULTS, run } from "../core.js";
import { GENE_CATALOG, CATALOG_BY_PATH, DEFAULT_GENES, buildGenes, bounds, encode, decode, snap, getPath } from "./genome.js";
import { mulberry32 } from "./nsga2.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}  (got ${JSON.stringify(got)})`); } };
const clone = (o) => JSON.parse(JSON.stringify(o));
const seed0 = () => ({ params: clone(DEFAULTS.params), site: clone(DEFAULTS.site), ruleset: { rules: [] } });

// ---- snap ------------------------------------------------------------------
check("snap to 0.1 grid", snap(2.37, 0.1) === 2.4, snap(2.37, 0.1));
check("snap passthrough when no step", snap(5.123, 0) === 5.123, snap(5.123, 0));
check("snap removes float fuzz", snap(0.3, 0.1) === 0.3, snap(0.3, 0.1));

// ---- catalog integrity -----------------------------------------------------
check("catalog non-empty", GENE_CATALOG.length >= 20, GENE_CATALOG.length);
check("every gene min<max & numeric step", GENE_CATALOG.every((g) => g.min < g.max && Number.isFinite(g.step) && g.step >= 0), null);
check("every gene target is params|site", GENE_CATALOG.every((g) => g.target === "params" || g.target === "site"), null);
check("default gene set is 8", DEFAULT_GENES.length === 8, DEFAULT_GENES.length);
check("default genes all in catalog", DEFAULT_GENES.every((p) => CATALOG_BY_PATH[p]), null);

// ---- default seed values lie within catalog ranges -------------------------
{
  const s = seed0();
  const off = DEFAULT_GENES.filter((p) => { const g = CATALOG_BY_PATH[p]; const v = getPath(g.target === "site" ? s.site : s.params, p); return !(v >= g.min && v <= g.max); });
  check("default values within gene ranges", off.length === 0, off);
}

// ---- encode/decode round-trip ----------------------------------------------
{
  const genes = buildGenes(DEFAULT_GENES);
  check("buildGenes count", genes.length === 8, genes.length);
  check("bounds shape", bounds(genes).every((b) => "min" in b && "max" in b), null);
  const s = seed0();
  const x = encode(s, genes);
  const back = decode(x, genes, s);
  let okRT = true;
  genes.forEach((g, i) => { const v = getPath(g.target === "site" ? back.site : back.params, g.path); if (Math.abs(v - x[i]) > (g.step || 1e-9)) okRT = false; });
  check("encode→decode round-trips within step", okRT, null);
  // decode must NOT mutate the source seed
  decode(x.map((v) => v + 1), genes, s);
  check("decode does not mutate source seed", JSON.stringify(s) === JSON.stringify(seed0()), null);
}

// ---- nested path resolution (params array + site dotted) --------------------
{
  const genes = buildGenes(["apertures.0.w", "terrain.plateauZ"]);
  const s = seed0();
  const out = decode([2.5, -1.3], genes, s);
  check("sets apertures.0.w (array index path)", out.params.apertures[0].w === 2.5, out.params.apertures[0].w);
  check("sets terrain.plateauZ (site dotted path)", out.site.terrain.plateauZ === -1.3, out.site.terrain.plateauZ);
}

// ---- override clamping to catalog extremes ----------------------------------
{
  const g = buildGenes(["walls.h"], { "walls.h": { min: -100, max: 100 } })[0];
  check("override min clamped to catalog", g.min === CATALOG_BY_PATH["walls.h"].min, g.min);
  check("override max clamped to catalog", g.max === CATALOG_BY_PATH["walls.h"].max, g.max);
}

// ---- random-genome finiteness sweep through run() --------------------------
function sweep(paths, n, seed) {
  const genes = buildGenes(paths), B = bounds(genes), rand = mulberry32(seed);
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const x = B.map((b) => b.min + rand() * (b.max - b.min));
    const s = decode(x, genes, seed0());
    const r = run(s.params, s.site, null);
    for (const k in r.metrics) if (!Number.isFinite(r.metrics[k])) { bad++; break; }
  }
  return bad;
}
check("default genes: 300 random designs all finite", sweep(DEFAULT_GENES, 300, 11) === 0, null);
check("all catalog genes: 200 random designs all finite", sweep(GENE_CATALOG.map((g) => g.path), 200, 22) === 0, null);

console.log(`\ngenome: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
