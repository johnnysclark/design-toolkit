// ui.js — builds the control panel (lenses, aperture, focus, sensor, perspective
// control), the guided-lesson buttons, the live plan-diagram slot, and the numbers
// readout. It owns no physics and no rendering: every change calls back into app.js
// via handlers, and app.js pushes computed numbers back through setReadouts().

import { SENSORS } from "./optics.js";

export const F_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
export const FOCAL_PRESETS = [16, 24, 35, 50, 85, 135, 200];

const h = (html) => html; // tag-free helper for readability

export function createUI(panel, state, handlers) {
  const sensorOptions = Object.values(SENSORS)
    .map((s) => `<option value="${s.id}" ${s.id === state.sensorId ? "selected" : ""}>${s.label}</option>`)
    .join("");

  panel.innerHTML = h(`
    <section class="vg-block">
      <h2 class="vg-h">Guided lessons</h2>
      <div class="vg-lessons">
        <button class="vg-lesson" data-lesson="lens">1 · What a lens does</button>
        <button class="vg-lesson" data-lesson="dolly">2 · Perspective is distance, not lens</button>
        <button class="vg-lesson" data-lesson="dof">3 · Depth of field</button>
        <button class="vg-lesson" data-lesson="verticals">4 · Keeping buildings straight</button>
      </div>
    </section>

    <section class="vg-block">
      <h2 class="vg-h">Lens</h2>
      <label class="vg-ctl">
        <span class="vg-lab">Focal length <output id="vg-focal-out">${state.focalMm} mm</output></span>
        <input id="vg-focal" type="range" min="14" max="300" step="1" value="${state.focalMm}" aria-label="Focal length in millimetres">
      </label>
      <div class="vg-presets" id="vg-focal-presets">
        ${FOCAL_PRESETS.map((f) => `<button data-focal="${f}">${f}</button>`).join("")}
      </div>

      <label class="vg-ctl">
        <span class="vg-lab">Aperture <output id="vg-ap-out">f/${state.fNumber}</output></span>
        <input id="vg-ap" type="range" min="0" max="${F_STOPS.length - 1}" step="1"
               value="${F_STOPS.indexOf(state.fNumber)}" aria-label="Aperture f-number">
      </label>
      <p class="vg-hint">Smaller f-number = wider aperture = shallower depth of field + more bokeh.</p>

      <label class="vg-ctl">
        <span class="vg-lab">Sensor</span>
        <select id="vg-sensor" aria-label="Sensor size">${sensorOptions}</select>
      </label>
    </section>

    <section class="vg-block">
      <h2 class="vg-h">Framing &amp; focus</h2>
      <label class="vg-ctl">
        <span class="vg-lab">Subject distance <output id="vg-dist-out">${state.subjectDistanceM.toFixed(1)} m</output></span>
        <input id="vg-dist" type="range" min="1" max="40" step="0.5" value="${state.subjectDistanceM}" aria-label="Camera-to-subject distance in metres">
      </label>
      <label class="vg-ctl">
        <span class="vg-lab">Focus distance <output id="vg-focus-out">${state.focusM.toFixed(1)} m</output></span>
        <input id="vg-focus" type="range" min="0.5" max="60" step="0.1" value="${state.focusM}" aria-label="Focus distance in metres">
      </label>
      <div class="vg-presets" id="vg-focus-presets">
        <button data-focustarget="Figure">Focus: figure</button>
        <button data-focustarget="Façade">Focus: façade</button>
        <button data-focusval="1">1 m</button>
        <button data-focusval="3">3 m</button>
        <button data-focusval="10">10 m</button>
      </div>
      <label class="vg-check">
        <input id="vg-lock" type="checkbox" ${state.lockSubjectSize ? "checked" : ""}>
        <span>Lock subject size (dolly zoom)</span>
      </label>
    </section>

    <section class="vg-block">
      <h2 class="vg-h">Perspective control</h2>
      <div class="vg-seg" role="radiogroup" aria-label="Perspective control">
        <button data-pc="free" class="${state.perspectiveControl === "free" ? "on" : ""}" role="radio" aria-checked="${state.perspectiveControl === "free"}">Free orbit</button>
        <button data-pc="tilt" class="${state.perspectiveControl === "tilt" ? "on" : ""}" role="radio" aria-checked="${state.perspectiveControl === "tilt"}">Tilt up</button>
        <button data-pc="shift" class="${state.perspectiveControl === "shift" ? "on" : ""}" role="radio" aria-checked="${state.perspectiveControl === "shift"}">Shift (keep vertical)</button>
      </div>
      <label class="vg-ctl" id="vg-shift-ctl" ${state.perspectiveControl === "shift" ? "" : "hidden"}>
        <span class="vg-lab">Shift amount <output id="vg-shift-out">${state.shiftNudge.toFixed(2)}</output></span>
        <input id="vg-shift" type="range" min="-0.6" max="0.6" step="0.02" value="${state.shiftNudge}" aria-label="Lens shift amount">
      </label>
      <p class="vg-hint">Tilt up makes verticals converge (3-point). Shift keeps the camera level and slides the lens — verticals stay parallel (2-point).</p>
    </section>

    <section class="vg-block">
      <h2 class="vg-h">Overlays</h2>
      <label class="vg-check"><input id="vg-dof" type="checkbox" ${state.dofOn ? "checked" : ""}><span>Depth-of-field blur</span></label>
      <label class="vg-check"><input id="vg-plan" type="checkbox" ${state.showDiagram ? "checked" : ""}><span>Side &amp; plan rig (frustum + in-focus zone)</span></label>
      <label class="vg-check"><input id="vg-draw" type="checkbox" ${state.showOverlay ? "checked" : ""}><span>Draughtsman overlay (horizon + vanishing points)</span></label>
      <button id="vg-reset" class="vg-reset">Reset view</button>
    </section>

    <section class="vg-block">
      <h2 class="vg-h">Numbers</h2>
      <dl class="vg-num" id="vg-numbers"></dl>
      <p class="vg-note">Thin-lens teaching model (full-frame circle of confusion ≈ 0.029 mm). Bokeh shape is stylised; real lenses add aberrations and focus breathing.</p>
    </section>
  `);

  const $ = (id) => panel.querySelector(id);
  const on = (id, ev, fn) => $(id).addEventListener(ev, fn);

  // sliders
  on("#vg-focal", "input", (e) => handlers.set("focalMm", +e.target.value));
  on("#vg-ap", "input", (e) => handlers.set("fNumber", F_STOPS[+e.target.value]));
  on("#vg-sensor", "change", (e) => handlers.set("sensorId", e.target.value));
  on("#vg-dist", "input", (e) => handlers.set("subjectDistanceM", +e.target.value));
  on("#vg-focus", "input", (e) => handlers.set("focusM", +e.target.value));
  on("#vg-shift", "input", (e) => handlers.set("shiftNudge", +e.target.value));

  // checkboxes
  on("#vg-lock", "change", (e) => handlers.set("lockSubjectSize", e.target.checked));
  on("#vg-dof", "change", (e) => handlers.set("dofOn", e.target.checked));
  on("#vg-plan", "change", (e) => handlers.set("showDiagram", e.target.checked));
  on("#vg-draw", "change", (e) => handlers.set("showOverlay", e.target.checked));
  on("#vg-reset", "click", () => handlers.reset());

  // preset buttons
  $("#vg-focal-presets").addEventListener("click", (e) => {
    const f = e.target.dataset.focal; if (f) handlers.set("focalMm", +f);
  });
  $("#vg-focus-presets").addEventListener("click", (e) => {
    const t = e.target.dataset.focustarget, v = e.target.dataset.focusval;
    if (t) handlers.focusOn(t); else if (v) handlers.set("focusM", +v);
  });
  panel.querySelector(".vg-seg").addEventListener("click", (e) => {
    const pc = e.target.dataset.pc;
    if (!pc) return;
    handlers.set("perspectiveControl", pc);
    panel.querySelectorAll(".vg-seg button").forEach((b) => {
      const onb = b.dataset.pc === pc;
      b.classList.toggle("on", onb);
      b.setAttribute("aria-checked", String(onb));
    });
    $("#vg-shift-ctl").hidden = pc !== "shift";
  });
  panel.querySelector(".vg-lessons").addEventListener("click", (e) => {
    const l = e.target.dataset.lesson; if (l) handlers.lesson(l);
  });

  const numbersEl = $("#vg-numbers");

  // Push computed numbers into the readout panel.
  function setReadouts(n) {
    numbersEl.innerHTML = [
      ["Field of view", `${n.fov.h.toFixed(0)}° × ${n.fov.v.toFixed(0)}° (${n.fov.d.toFixed(0)}° diag)`],
      ["Equivalent focal", `${n.equivFocal.toFixed(0)} mm (${n.crop.toFixed(2)}× crop)`],
      ["Depth of field", n.dof.total === Infinity ? "∞" : `${n.dof.total.toFixed(2)} m`],
      ["Near / far limit", `${n.dof.near.toFixed(2)} m / ${n.dof.far === Infinity ? "∞" : n.dof.far.toFixed(2) + " m"}`],
      ["Hyperfocal", `${n.dof.hyperfocal.toFixed(1)} m`],
      ["Aperture diameter", `${n.apertureMm.toFixed(1)} mm`],
      ["Subject distance", `${n.subjectDistanceM.toFixed(1)} m`]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  }

  // Re-sync control widgets to state (after a lesson or dolly-zoom changes values).
  function sync(s) {
    $("#vg-focal").value = s.focalMm; $("#vg-focal-out").textContent = `${Math.round(s.focalMm)} mm`;
    $("#vg-ap").value = F_STOPS.indexOf(s.fNumber); $("#vg-ap-out").textContent = `f/${s.fNumber}`;
    $("#vg-dist").value = s.subjectDistanceM; $("#vg-dist-out").textContent = `${s.subjectDistanceM.toFixed(1)} m`;
    $("#vg-focus").value = s.focusM; $("#vg-focus-out").textContent = `${s.focusM.toFixed(1)} m`;
    $("#vg-sensor").value = s.sensorId;
    $("#vg-lock").checked = s.lockSubjectSize;
    $("#vg-dof").checked = s.dofOn;
    $("#vg-draw").checked = s.showOverlay;
    $("#vg-plan").checked = s.showDiagram;
    $("#vg-shift").value = s.shiftNudge; $("#vg-shift-out").textContent = s.shiftNudge.toFixed(2);
    panel.querySelectorAll(".vg-seg button").forEach((b) => {
      const onb = b.dataset.pc === s.perspectiveControl;
      b.classList.toggle("on", onb); b.setAttribute("aria-checked", String(onb));
    });
    $("#vg-shift-ctl").hidden = s.perspectiveControl !== "shift";
  }

  return { setReadouts, sync };
}
