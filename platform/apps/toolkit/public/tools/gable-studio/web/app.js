// app.js (v2) — owns state, wires panels to the core, keeps everything live.
import { DEFAULTS, run } from "./core.js";
import { createViewport } from "./viewport.js";
import { renderEnvControls, renderMassingControls, renderDashboard, renderRules, paintResults, el } from "./ui.js";
import { buildExportZip, download, downloadJSON } from "./exporter.js";
import { importThreeDM } from "./rhinoImport.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
const state = {
  params: clone(DEFAULTS.params),
  site: clone(DEFAULTS.site),
  display: { mode: "analysis", shadowIntensity: 0.6, sunHour: 15, analysisField: "solarNow" },
  ruleset: { name: "My rules", rules: [] },
  lastMetrics: null,
};

const $ = (s) => document.querySelector(s);
const envEl = $("#env-controls"), massingEl = $("#massing"), dashEl = $("#dashboard"), rulesEl = $("#rules"), scoreEl = $("#score"), statusEl = $("#status");
let viewport = null;

try { viewport = createViewport($("#view")); }
catch (e) { $("#view").parentElement.append(el("div", { class: "viewerr" }, "3D viewport could not start (needs WebGL). The data + rules + export loop still works. " + e.message)); }

function recompute() {
  const { model, metrics, evaluation } = run(state.params, state.site, state.ruleset);
  state.lastMetrics = metrics; state.lastModel = model;
  if (viewport) viewport.setModel(model, state.display);
  renderDashboard(dashEl, metrics);
  paintResults(rulesEl, scoreEl, evaluation);
}
const onParam = () => recompute();
const onDisplay = () => { if (viewport) viewport.setDisplay(state.display); };
function onRulesChange(structural) { if (structural) renderRules(rulesEl, state.ruleset, onRulesChange); recompute(); }

function rebuildAll() {
  renderEnvControls(envEl, state, { param: onParam, display: onDisplay });
  renderMassingControls(massingEl, state, { param: onParam, display: onDisplay });
  renderRules(rulesEl, state.ruleset, onRulesChange);
  recompute();
}

function setStatus(msg, kind = "") { statusEl.textContent = msg; statusEl.className = "status " + kind; }

const modeBtn = $("#btn-mode");
function syncModeBtn() {
  const analysis = state.display.mode === "analysis";
  modeBtn.textContent = analysis ? "☀ Analysis mode" : "◫ Pen mode";
  modeBtn.classList.toggle("on", analysis);
}
modeBtn.addEventListener("click", () => {
  state.display.mode = state.display.mode === "pen" ? "analysis" : "pen";
  syncModeBtn();
  if (viewport) viewport.setDisplay(state.display);
  setStatus(state.display.mode === "analysis" ? "Ladybug-style: envelope coloured by yearly solar; day-arcs show the sun path." : "Pen mode: hidden-line drawing with cast shadows (use the shadow + sun-hour sliders).");
});

$("#btn-export").addEventListener("click", async () => {
  try {
    setStatus("Building export bundle (baking .3dm…)");
    const { blob, dmOk } = await buildExportZip(state, state.lastMetrics, state.lastModel);
    download(blob, "gable-studio-export.zip");
    setStatus(dmOk ? "Exported zip with native gable.3dm + params, rules, and Rhino 8 / Grasshopper python." : "Exported zip (params, rules, python). The direct .3dm needs rhino3dm — run run_rhino3dm.py to bake it.", "ok");
  } catch (e) { setStatus("Export failed: " + e.message, "bad"); }
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

// --- modals (sources/math + location map) -----------------------------------
const showModal = (id) => { $("#" + id).style.display = "flex"; };
const hideModal = (id) => { $("#" + id).style.display = "none"; };
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => hideModal(b.getAttribute("data-close"))));
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) hideModal(m.id); }));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal").forEach((m) => (m.style.display = "none")); });
$("#btn-info").addEventListener("click", () => showModal("infoModal"));

// Collapsible docks. Collapsing only shrinks a grid track (top/bottom rows or the
// right column) — a panel can never overlay the centred 3D view. The viewport's
// ResizeObserver re-fits the render whenever the centre cell changes size.
const mainEl = document.querySelector("main");
function wireDock(id) {
  const dock = document.getElementById(id);
  const toggle = dock.querySelector(".dock-toggle");
  toggle.addEventListener("click", () => {
    const collapsed = dock.classList.toggle("collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    if (id === "dock-right") mainEl.classList.toggle("right-collapsed", collapsed);
  });
}
["dock-top", "dock-bottom", "dock-right"].forEach(wireDock);

// The toolbar's "building & terrain" buttons reveal + scroll to the example
// massing controls (which now live in the top dock, not a floating window).
const topDock = document.getElementById("dock-top");
const revealMassing = () => {
  topDock.classList.remove("collapsed");
  topDock.querySelector(".dock-toggle").setAttribute("aria-expanded", "true");
  document.getElementById("massing").scrollIntoView({ behavior: "smooth", block: "nearest" });
};
$("#btn-studio").addEventListener("click", revealMassing);
$("#btn-studio-2").addEventListener("click", revealMassing);

let map = null, marker = null;
const updateMapReadout = () => { $("#map-readout").textContent = `lat ${state.site.latitude.toFixed(2)}°, lon ${state.site.longitude.toFixed(2)}°`; };
function setLatLon(lat, lng) {
  state.site.latitude = Math.round(lat * 100) / 100;
  state.site.longitude = Math.round(((lng + 540) % 360 - 180) * 100) / 100;
  if (marker) marker.setLatLng([lat, lng]);
  updateMapReadout(); rebuildAll();
  setStatus(`Location set: ${state.site.latitude.toFixed(2)}°, ${state.site.longitude.toFixed(2)}° — solar uses latitude.`, "ok");
}
$("#btn-map").addEventListener("click", () => {
  showModal("mapModal");
  if (!window.L) { setStatus("Map library didn't load (vendor/leaflet). Use the latitude slider instead.", "bad"); return; }
  if (!map) {
    map = window.L.map("map").setView([state.site.latitude, state.site.longitude], 4);
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
    marker = window.L.circleMarker([state.site.latitude, state.site.longitude], { radius: 7, color: "#b0451f", fillColor: "#b0451f", fillOpacity: 0.75, weight: 2 }).addTo(map);
    map.on("click", (e) => setLatLon(e.latlng.lat, e.latlng.lng));
  } else {
    map.setView([state.site.latitude, state.site.longitude]);
    marker.setLatLng([state.site.latitude, state.site.longitude]);
  }
  setTimeout(() => map.invalidateSize(), 60);
  updateMapReadout();
});

rebuildAll();
syncModeBtn();
setStatus("Analysis view (parallel projection): the envelope is coloured by yearly solar. Drag a control to watch the data move; encode your intent as rules; export to Rhino.");
