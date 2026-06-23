// exporter.js — bundle the current design + rules + the python that re-runs the
// SAME constraints in Rhino 8 / Grasshopper. The bundled params.json carries the
// browser-computed metrics so each python script can self-test that its numbers
// match (proving the loop). Zero codegen-by-string: the python is shipped as-is
// from ../python so it can't drift from what's in the repo.
import { makeZip } from "./zip.js";

const PY_FILES = ["gable_core.py", "run_rhino3dm.py", "run_rhinocommon.py", "gh_component.py"];

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`could not fetch ${url} (${r.status}) — are you serving from the gable-studio/ root?`);
  return r.text();
}

const RUN_TXT = `GABLE STUDIO — export bundle
============================
This folder re-runs, in Rhino 8 / Grasshopper, the exact constraints you built
in the browser. params.json holds your design + the metrics the web app computed;
ruleset.json holds your rules. The python recomputes the metrics and checks them
against params.json (a built-in parity self-test).

WHAT'S HERE
  params.json            your params + site + browser-computed metrics
  ruleset.json           your rules
  gable_core.py          the shared geometry+metric maths (no Rhino needed)
  run_rhino3dm.py        plain python: recompute, evaluate rules, write a .3dm
  run_rhinocommon.py     paste into Rhino 8 ScriptEditor: builds + bakes geometry
  gh_component.py        paste into a Grasshopper GHPython / Script component

QUICK START
  1) Plain python (no Rhino):   python3 run_rhino3dm.py
        -> prints metrics + PASS/FAIL rule table + parity check, writes gable.3dm
        (writing the .3dm needs:  pip install rhino3dm)
  2) Rhino 8:  open the ScriptEditor (Tools > Script), paste run_rhinocommon.py,
        Run. It builds the massing on tidy layers (Plinth/Room/Roof/Apertures)
        and prints the report. Re-import that .3dm into the web app to close the loop.
  3) Grasshopper:  drop a Script (python) component, set its inputs per the header
        comment in gh_component.py, paste the body. Outputs geometry + each metric
        + pass/fail booleans.

LAYER CONVENTION (so the web app can re-import):
  Plinth, Room, Roof, Apertures, Ridge, Report
`;

export async function buildExportZip(state, metrics) {
  const dir = "gable-studio-export/";
  const files = [
    { name: dir + "params.json", data: JSON.stringify({ params: state.params, site: state.site, metrics }, null, 2) },
    { name: dir + "ruleset.json", data: JSON.stringify(state.ruleset, null, 2) },
    { name: dir + "RUN.txt", data: RUN_TXT },
  ];
  const py = await Promise.all(PY_FILES.map((f) => fetchText(`../python/${f}`)));
  PY_FILES.forEach((f, i) => files.push({ name: dir + f, data: py[i] }));
  return makeZip(files);
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadJSON(obj, name) {
  download(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }), name);
}
