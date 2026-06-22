// Curated knowledge base for grounding (v1). MVP ships a small seed so the
// grounded path works end-to-end; the README's full KB (commands/components with
// plugin owner, version, doc URL) + BM25 retrieval is the v1 build-out.
//
// Each row: id, mode, name, nickname, tab, io, owner, version, doc, note.

export const KB = [
  {
    id: "gh-graft",
    mode: "grasshopper",
    name: "Graft Tree",
    nickname: "Graft",
    tab: "Sets > Tree",
    io: "in: Tree → out: Tree (each item to its own branch)",
    owner: "Grasshopper (built-in)",
    version: "Rhino 6+",
    doc: "https://grasshopperdocs.com/components/grasshopper/graftTree.html",
    note: "Pushes every item into its own branch — the usual fix for 'one X per Y'."
  },
  {
    id: "gh-flatten",
    mode: "grasshopper",
    name: "Flatten Tree",
    nickname: "Flatten",
    tab: "Sets > Tree",
    io: "in: Tree → out: single-branch list",
    owner: "Grasshopper (built-in)",
    version: "Rhino 6+",
    doc: "https://grasshopperdocs.com/components/grasshopper/flattenTree.html",
    note: "Collapses all branches into one list — destroys per-branch structure."
  },
  {
    id: "gh-divide-curve",
    mode: "grasshopper",
    name: "Divide Curve",
    nickname: "Divide",
    tab: "Curve > Division",
    io: "in: C (curve), N (count) → out: P (points), T (tangents), t (params)",
    owner: "Grasshopper (built-in)",
    version: "Rhino 6+",
    doc: "https://grasshopperdocs.com/components/grasshopper/divideCurve.html",
    note: "N is per-curve; mismatched tree paths cause silent shortest-list repeats."
  },
  {
    id: "rh-tolerance",
    mode: "rhino",
    name: "Document Absolute Tolerance",
    nickname: "tolerance",
    tab: "Document Properties > Units",
    io: "model setting",
    owner: "Rhino",
    version: "Rhino 6+",
    doc: "https://docs.mcneel.com/rhino/8/help/en-us/options/units.htm",
    note: "Booleans/joins fail when tolerance is wrong for the model scale."
  },
  {
    id: "py-rs-vs-geom",
    mode: "ghpython",
    name: "rhinoscriptsyntax vs Rhino.Geometry",
    nickname: "rs vs geometry",
    tab: "GhPython",
    io: "import rhinoscriptsyntax as rs  /  import Rhino.Geometry as rg",
    owner: "RhinoCommon",
    version: "Rhino 7+ (CPython in 8)",
    doc: "https://developer.rhino3d.com/guides/rhinopython/",
    note: "rs returns GUIDs (doc-bound); rg returns geometry objects (preferred in GH)."
  }
];

// Naive keyword retrieval, filtered by mode. v1 replaces this with BM25.
export function retrieve({ mode, question, limit = 4 }) {
  const q = (question || "").toLowerCase();
  const terms = q.split(/\W+/).filter((t) => t.length > 2);
  const scored = KB.filter((row) => row.mode === mode).map((row) => {
    const hay = `${row.name} ${row.nickname} ${row.note} ${row.io}`.toLowerCase();
    const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    return { row, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.row);
}

export function kbContext(rows) {
  if (!rows.length) return "";
  return rows
    .map(
      (r) =>
        `[${r.id}] ${r.name} (${r.nickname}) — ${r.tab}; ${r.io}; owner ${r.owner}; ${r.version}; ${r.note} (doc: ${r.doc})`
    )
    .join("\n");
}
