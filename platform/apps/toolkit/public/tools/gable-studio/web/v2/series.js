// series.js (v2) — the seed-is-truth genealogy of variations.
//
// A SERIES is the gradeable artifact: a lineage of forks, each a deliberate
// response to a named force. The SEED ({params, site, ruleset}) is the only
// truth; the cached metrics/evaluation are a convenience that a `coreVersion`
// stamp lets us detect as stale and recompute. Because core.js `run()` is pure,
// forking and re-deriving a whole series is free.

const clone = (o) => JSON.parse(JSON.stringify(o));
const STORE_KEY = "ecoArchitect.v2.series";

// Bump when core.js metric keys change so cached numbers can't silently lie.
export function coreVersion(metrics) {
  return "core/" + (metrics ? Object.keys(metrics).length : 0);
}

let _seq = 0;
const nextId = () => "var-" + (++_seq);

export function makeVariation(seed, parent, decision, cache) {
  const v = {
    id: nextId(),
    parentId: parent ? parent.id : null,
    rootId: parent ? parent.rootId : null,
    title: "",
    seed: clone(seed),
    decision: decision ? clone(decision) : { force: null, move: null, intent: "", note: "", winner: "" },
    cache: cache ? clone(cache) : null,
    coreVersion: cache ? coreVersion(cache.metrics) : null,
    createdSeq: _seq,
  };
  if (!v.rootId) v.rootId = v.id; // a root fork is its own lineage root
  return v;
}

// ---- the store ------------------------------------------------------------
export const Series = {
  list: [],

  add(v) { this.list.push(v); this.save(); return v; },
  get(id) { return this.list.find((v) => v.id === id) || null; },
  remove(id) {
    // re-parent any children of the removed node to its parent, so a lineage
    // never dangles.
    const node = this.get(id); if (!node) return;
    for (const c of this.list) if (c.parentId === id) c.parentId = node.parentId;
    this.list = this.list.filter((v) => v.id !== id);
    this.save();
  },
  clear() { this.list = []; this.save(); },

  // children of a node (for the indented lineage list)
  childrenOf(id) { return this.list.filter((v) => v.parentId === id); },
  roots() { return this.list.filter((v) => v.parentId == null); },

  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ seq: _seq, list: this.list })); }
    catch (e) { /* private mode / quota — series stays in memory this session */ }
  },
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY); if (!raw) return;
      const data = JSON.parse(raw);
      this.list = Array.isArray(data.list) ? data.list : [];
      _seq = Math.max(data.seq || 0, ...this.list.map((v) => v.createdSeq || 0), 0);
    } catch (e) { this.list = []; }
  },

  exportJSON() { return { kind: "eco-architect.series", version: 2, list: this.list }; },
  importJSON(data) {
    if (!data || !Array.isArray(data.list)) throw new Error("not an Eco-Architect series");
    this.list = data.list;
    _seq = Math.max(0, ...this.list.map((v) => v.createdSeq || 0));
    this.save();
  },
};

// ---- auto-diff: what changed from parent.seed -> child.seed ----------------
const round2 = (x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x);

function flatNums(obj, prefix, out) {
  for (const k in obj) {
    const val = obj[k];
    if (val && typeof val === "object") flatNums(val, prefix + k + ".", out); // recurse objects AND arrays (apertures)
    else if (typeof val === "number") out[prefix + k] = val;
  }
  return out;
}

const PARAM_LABEL = {
  "plinth.t": "plinth thickness", "plinth.cx": "plinth X", "plinth.cy": "plinth Y",
  "plinth.W": "plinth width", "plinth.L": "plinth length", "plinth.R": "plinth rotation",
  "walls.h": "wall height", "walls.W": "wall width", "walls.L": "wall length",
  "walls.R": "wall rotation", "walls.wt": "wall thickness", "walls.cx": "wall X", "walls.cy": "wall Y",
  "roof.pitchL": "roof pitch L", "roof.pitchR": "roof pitch R", "roof.ridgeRise": "ridge rise",
  "roof.ridgePos": "ridge shift", "roof.t": "roof thickness", "roof.W": "roof width", "roof.L": "roof length", "roof.R": "roof rotation",
  "apertures.0.w": "S window width", "apertures.0.h": "S window height", "apertures.0.u": "S window across", "apertures.0.v": "S window up",
};
const SITE_LABEL = {
  latitude: "latitude", northAngle: "north angle", windFromAz: "wind direction",
  windSpeed: "wind speed", deltaT: "ΔT", viewTargetAz: "view target", eyeHeight: "eye height",
  "terrain.plateauZ": "ground level", "terrain.ravineDepth": "ravine depth",
};

// Returns a list of plain-language change strings between two seeds.
export function diffSeeds(parentSeed, childSeed) {
  const changes = [];
  if (!parentSeed) return changes;

  const pp = flatNums(parentSeed.params, "", {}), cp = flatNums(childSeed.params, "", {});
  for (const k in cp) if (pp[k] !== cp[k]) {
    changes.push(`${PARAM_LABEL[k] || k}: ${round2(pp[k])} → ${round2(cp[k])}`);
  }
  const ps = flatNums(parentSeed.site, "", {}), cs = flatNums(childSeed.site, "", {});
  for (const k in cs) if (ps[k] !== cs[k]) {
    changes.push(`${SITE_LABEL[k] || k}: ${round2(ps[k])} → ${round2(cs[k])}`);
  }
  const pr = (parentSeed.ruleset && parentSeed.ruleset.rules) || [];
  const cr = (childSeed.ruleset && childSeed.ruleset.rules) || [];
  const pId = new Set(pr.map((r) => r.id)), cId = new Set(cr.map((r) => r.id));
  for (const r of cr) if (!pId.has(r.id)) changes.push(`+ rule: ${r.moveLabel || r.lhs || "note"}`);
  for (const r of pr) if (!cId.has(r.id)) changes.push(`− rule: ${r.moveLabel || r.lhs || "note"}`);

  return changes;
}
