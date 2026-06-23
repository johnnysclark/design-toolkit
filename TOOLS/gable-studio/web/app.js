// app.js (v2) — owns state, wires panels to the core, keeps everything live.
import { DEFAULTS, run } from "./core.js";
import { createViewport } from "./viewport.js";
import { renderControls, renderDashboard, renderRules, paintResults, el } from "./ui.js";
import { buildExportZip, download, downloadJSON } from "./exporter.js";
import { importThreeDM } from "./rhinoImport.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
const state = {
  params: clone(DEFAULTS.params),
  site: clone(DEFAULTS.site),
  display: { mode: "pen", shadowIntensity: 0.6, sunHour: 15 },
  ruleset: { name: "My rules", rules: [] },
  lastMetrics: null,
};

const $ = (s) => document.querySelector(s);
const controlsEl = $("#controls"), dashEl = $("#dashboard"), rulesEl = $("#rules"), scoreEl = $("#score"), statusEl = $("#status");
let viewport = null;

try { viewport = createViewport($("#view")); }
catch (e) { $("#view").parentElement.append(el("div", { class: "viewerr" }, "3D viewport could not start (needs WebGL). The data + rules + export loop still works. " + e.message)); }

function recompute() {
  const { model, metrics, evaluation } = run(state.params, state.site, state.ruleset);
  state.lastMetrics = metrics;
  if (viewport) viewport.setModel(model, state.display);
  renderDashboard(dashEl, metrics);
  paintResults(rulesEl, scoreEl, evaluation);
}
const onParam = () => recompute();
const onDisplay = () => { if (viewport) viewport.setDisplay(state.display); };
function onRulesChange(structural) { if (structural) renderRules(rulesEl, state.ruleset, onRulesChange); recompute(); }

function rebuildAll() {
  renderControls(controlsEl, state, { param: onParam, display: onDisplay });
  renderRules(rulesEl, state.ruleset, onRulesChange);
  recompute();
}

function setStatus(msg, kind = "") { statusEl.textContent = msg; statusEl.className = "status " + kind; }

const modeBtn = $("#btn-mode");
modeBtn.addEventListener("click", () => {
  state.display.mode = state.display.mode === "pen" ? "analysis" : "pen";
  modeBtn.textContent = state.display.mode === "pen" ? "◫ Pen mode" : "☀ Analysis mode";
  modeBtn.classList.toggle("on", state.display.mode === "analysis");
  if (viewport) viewport.setDisplay(state.display);
  setStatus(state.display.mode === "analysis" ? "Ladybug-style: envelope coloured by yearly solar; day-arcs show the sun path." : "Pen mode: hidden-line drawing with cast shadows (use the shadow + sun-hour sliders).");
});

$("#btn-export").addEventListener("click", async () => {
  try { setStatus("Building export bundle…"); const blob = await buildExportZip(state, state.lastMetrics); download(blob, "gable-studio-export.zip"); setStatus("Exported gable-studio-export.zip (params, rules, Rhino 8 + Grasshopper python).", "ok"); }
  catch (e) { setStatus("Export failed: " + e.message, "bad"); }
});
$("#btn-save-design").addEventListener("click", () => downloadJSON({ params: state.params, site: state.site }, "gable-design.json"));
$("#btn-save-rules").addEventListener("click", () => downloadJSON(state.ruleset, "gable-ruleset.json"));

fileButton("#btn-load-design", (data) => { if (data.params) state.params = data.params; if (data.site) state.site = data.site; rebuildAll(); setStatus("Loaded design.", "ok"); });
fileButton("#btn-load-rules", (data) => { if (!data.rules) throw new Error("not a ruleset"); state.ruleset = data; rebuildAll(); setStatus(`Loaded ${data.rules.length} rules.`, "ok"); });

$("#btn-import-3dm").addEventListener("click", () => $("#file-3dm").click());
$("#file-3dm").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    setStatus("Reading .3dm…");
    const res = await importThreeDM(await f.arrayBuffer());
    if (res.params) { for (const g of Object.keys(res.params)) Object.assign(state.params[g], res.params[g]); rebuildAll(); }
    setStatus(res.message, res.mode === "convention" ? "ok" : "");
  } catch (err) { setStatus("Import failed: " + err.message, "bad"); }
  e.target.value = "";
});

$("#btn-reset").addEventListener("click", () => { state.params = clone(DEFAULTS.params); state.site = clone(DEFAULTS.site); rebuildAll(); setStatus("Reset to the default massing."); });

$("#examples").addEventListener("change", async (e) => {
  const v = e.target.value; if (!v) return;
  try { const r = await fetch(`./rulesets/${v}`); state.ruleset = await r.json(); rebuildAll(); setStatus(`Loaded example: ${state.ruleset.name}.`, "ok"); }
  catch (err) { setStatus("Could not load example: " + err.message, "bad"); }
  e.target.value = "";
});

function fileButton(sel, onData) {
  const btn = $(sel);
  const input = el("input", { type: "file", accept: "application/json", style: "display:none" });
  document.body.append(input);
  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return; try { onData(JSON.parse(await f.text())); } catch (err) { setStatus("Load failed: " + err.message, "bad"); } e.target.value = ""; });
}

rebuildAll();
setStatus("Drag a slider to see the metrics move; toggle Pen / Analysis; add rules to test your design intent.");
