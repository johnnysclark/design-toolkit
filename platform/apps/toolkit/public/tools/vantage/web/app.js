// app.js — Vantage orchestrator. Owns the state, the three.js rig, and the render
// pipeline that keeps the live frame, the plan diagram, the draughtsman overlay and
// the numbers all consistent. Renders on demand (no idle animation loop).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildScene } from "./scene.js";
import { createDof } from "./dof.js";
import { drawOverlay } from "./overlay.js";
import { updateDiagram } from "./diagram.js";
import { createUI } from "./ui.js";
import {
  SENSORS, fovs, dofLimitsM, hyperfocalM, apertureDiameterMm, cropFactor,
  equivalentFocalMm, blurInCoc
} from "./optics.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  focalMm: 50, fNumber: 2.8, focusM: 4.8, sensorId: "fullFrame",
  subjectDistanceM: 4.8, lockSubjectSize: false,
  perspectiveControl: "free", shiftNudge: 0,
  dofOn: true, showDiagram: true, showOverlay: false
};

const FACADE_H = 14, EYE = 1.6;

const canvas = document.getElementById("vg-canvas");
const overlay = document.getElementById("vg-overlay");
const overlayCtx = overlay.getContext("2d");
const frameWrap = document.getElementById("vg-frame-wrap");
const frameEl = document.getElementById("vg-frame");
const captionEl = document.getElementById("vg-caption");
const liveEl = document.getElementById("vg-live");
const panel = document.getElementById("vg-panel");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (err) {
  frameWrap.innerHTML = `<p class="vg-fallback">This demo needs WebGL, which isn't available in this browser. Try a recent Chrome, Edge, Firefox or Safari.</p>`;
  throw err;
}
const dpr = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(dpr);

const S = buildScene(THREE);
const dof = createDof(THREE, renderer);

const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 2000);
camera.position.copy(S.cameraStart);
const controls = new OrbitControls(camera, canvas);
controls.target.copy(S.subjectPoint);
controls.enableDamping = false;
controls.minDistance = 1;
controls.maxDistance = 40;
controls.update();
state.subjectDistanceM = clamp(camera.position.distanceTo(controls.target), 1, 40);
state.focusM = state.subjectDistanceM;

let programmatic = false;
controls.addEventListener("change", () => {
  if (programmatic) return;
  state.subjectDistanceM = clamp(camera.position.distanceTo(controls.target), 1, 40);
  ui.sync(state);
  requestRender();
});

const ui = createUI(panel, state, { set, focusOn, reset, lesson });

// ---- sizing: the frame is the sensor's aspect ratio, letterboxed in the stage ---
const tmp = new THREE.Vector3();
function frameSize() {
  const sensor = SENSORS[state.sensorId];
  const ar = sensor.width / sensor.height;
  const cw = frameWrap.clientWidth, ch = frameWrap.clientHeight;
  let w = cw, hh = cw / ar;
  if (hh > ch) { hh = ch; w = ch * ar; }
  return { w: Math.max(120, Math.floor(w)), h: Math.max(80, Math.floor(hh)), ar };
}
function resize() {
  const { w, h } = frameSize();
  frameEl.style.width = w + "px"; frameEl.style.height = h + "px";
  renderer.setSize(w, h, false);
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  overlay.style.width = w + "px"; overlay.style.height = h + "px";
  overlay.width = Math.floor(w * dpr); overlay.height = Math.floor(h * dpr);
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dof.setSize(w, h, dpr);
  requestRender();
}
window.addEventListener("resize", resize);

// ---- state changes ---------------------------------------------------------------
function set(key, value) {
  if (key === "focalMm" && state.lockSubjectSize && state.perspectiveControl === "free") {
    const ratio = value / state.focalMm;
    state.subjectDistanceM = clamp(state.subjectDistanceM * ratio, 1, 40);
  }
  const sensorChanged = key === "sensorId" && value !== state.sensorId;
  state[key] = value;
  ui.sync(state);
  if (sensorChanged) resize(); else requestRender();
}
function focusOn(name) {
  const t = S.focusTargets.find((f) => f.name === name);
  if (t) set("focusM", clamp(camera.position.distanceTo(t.point), 0.5, 60));
}
function reset() {
  state.perspectiveControl = "free";
  state.focalMm = 50; state.fNumber = 2.8; state.shiftNudge = 0;
  camera.position.copy(S.cameraStart);
  controls.target.copy(S.subjectPoint);
  controls.update();
  state.subjectDistanceM = clamp(camera.position.distanceTo(controls.target), 1, 40);
  state.focusM = state.subjectDistanceM;
  captionEl.textContent = "";
  ui.sync(state);
  requestRender();
}

// double-click to focus where you click (free orbit only)
canvas.addEventListener("dblclick", (e) => {
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(S.scene.children, true)[0];
  if (hit) set("focusM", clamp(hit.distance, 0.5, 60));
});

// ---- camera rig ------------------------------------------------------------------
function applyCameraRig() {
  const mode = state.perspectiveControl;
  programmatic = true;
  if (mode === "free") {
    controls.enabled = true;
    controls.target.copy(S.subjectPoint);
    const dir = tmp.copy(camera.position).sub(controls.target);
    const len = dir.length() || 1;
    dir.multiplyScalar(state.subjectDistanceM / len);
    camera.position.copy(controls.target).add(dir);
    controls.update();
  } else {
    controls.enabled = false;
    const sensor = SENSORS[state.sensorId];
    const vHalf = THREE.MathUtils.degToRad(fovs(state.focalMm, sensor).v) / 2;
    const Dfac = clamp((FACADE_H / 2) / Math.tan(vHalf) * 1.15, 8, 80);
    camera.position.set(0, EYE, S.facadePoint.z + Dfac);
    camera.up.set(0, 1, 0);
    if (mode === "tilt") camera.lookAt(0, FACADE_H / 2, S.facadePoint.z);
    else camera.lookAt(0, EYE, S.facadePoint.z); // level — shift will frame the top
  }
  camera.updateMatrixWorld(true);
  programmatic = false;
}

function configureProjection() {
  const sensor = SENSORS[state.sensorId];
  camera.filmGauge = sensor.width;
  camera.aspect = sensor.width / sensor.height;
  camera.setFocalLength(state.focalMm); // sets fov + rebuilds a symmetric projection
  if (state.perspectiveControl === "shift") {
    const vHalf = THREE.MathUtils.degToRad(fovs(state.focalMm, sensor).v) / 2;
    const Dfac = Math.max(0.5, camera.position.z - S.facadePoint.z);
    const thetaTop = Math.atan((FACADE_H - EYE) / Dfac);
    const ndcTop = Math.tan(thetaTop) / Math.tan(vHalf);
    const m12 = clamp((ndcTop - 0.9) + state.shiftNudge, -1.2, 1.8);
    camera.projectionMatrix.elements[9] = m12; // off-axis lens shift: verticals stay parallel
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
}

// ---- the render pipeline ---------------------------------------------------------
let raf = 0;
function requestRender() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }

function render() {
  const sensor = SENSORS[state.sensorId];
  applyCameraRig();
  configureProjection();
  camera.updateMatrixWorld(true);

  dof.render(S.scene, camera, {
    focalMm: state.focalMm,
    fNumber: state.fNumber,
    focusM: state.focusM,
    sensorHmm: sensor.height,
    enabled: state.dofOn
  });

  const { w, h } = frameSize();
  if (state.showOverlay) drawOverlay(overlayCtx, THREE, camera, w, h);
  else overlayCtx.clearRect(0, 0, w, h);

  const fov = fovs(state.focalMm, sensor);
  const d = dofLimitsM(state.focalMm, state.fNumber, state.focusM, sensor.coc);
  ui.setReadouts({
    fov, dof: d,
    equivFocal: equivalentFocalMm(state.focalMm, sensor),
    crop: cropFactor(sensor),
    apertureMm: apertureDiameterMm(state.focalMm, state.fNumber),
    subjectDistanceM: state.subjectDistanceM
  });
  if (state.showDiagram) {
    updateDiagram(ui.diagramSvg, {
      focalMm: state.focalMm, fNumber: state.fNumber, focusM: state.focusM,
      subjectDistanceM: state.subjectDistanceM, hfovDeg: fov.h,
      dofNear: d.near, dofFar: d.far, markers: S.markers, picturePlaneM: 0.5
    });
  }
  liveEl.textContent = composeLive(sensor, fov, d);
}

function composeLive(sensor, fov, d) {
  const lensWord = state.focalMm <= 24 ? "wide" : state.focalMm >= 100 ? "telephoto" : "normal";
  const depth = d.total === Infinity ? "front-to-back sharp" :
    d.total < 0.5 ? "very shallow" : d.total < 2 ? "shallow" : d.total < 6 ? "moderate" : "deep";
  const bg = blurInCoc(30, state.focalMm, state.fNumber, state.focusM, sensor.coc);
  const bgWord = bg < 1.2 ? "stays fairly sharp" : bg < 4 ? "is softly blurred" : "melts into bokeh";
  const dofTxt = d.total === Infinity ? "everything from " + d.near.toFixed(1) + " m to infinity is sharp"
    : `${d.total.toFixed(2)} m of depth is in focus (${d.near.toFixed(1)}–${d.far === Infinity ? "∞" : d.far.toFixed(1)} m)`;
  return `${Math.round(state.focalMm)} mm ${lensWord} lens at f/${state.fNumber} on ${sensor.label.split(" ")[0]} ` +
    `${sensor.label.split(" ")[1] || ""}, focused at ${state.focusM.toFixed(1)} m: a ${fov.h.toFixed(0)}° field of view, ` +
    `${depth} depth of field — ${dofTxt}; the background ${bgWord}.`;
}

// ---- guided lessons --------------------------------------------------------------
let lessonRaf = 0;
function animateFocal(from, to, dur, onTick) {
  cancelAnimationFrame(lessonRaf);
  if (reducedMotion) { state.focalMm = to; onTick && onTick(); ui.sync(state); requestRender(); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    set("focalMm", Math.round(from + (to - from) * e));
    onTick && onTick(k);
    if (k < 1) lessonRaf = requestAnimationFrame(step);
  };
  lessonRaf = requestAnimationFrame(step);
}

function lesson(id) {
  cancelAnimationFrame(lessonRaf);
  state.perspectiveControl = "free";
  state.showOverlay = false;
  if (id === "lens") {
    Object.assign(state, { lockSubjectSize: false, dofOn: false, fNumber: 8, subjectDistanceM: 6 });
    state.focusM = state.subjectDistanceM; ui.sync(state);
    captionEl.textContent = "Lesson 1 — same spot, different lenses. The camera stays put; longer focal length = narrower field of view, so the subject fills more of the frame.";
    animateFocal(20, 135, 4200);
  } else if (id === "dolly") {
    Object.assign(state, { lockSubjectSize: true, dofOn: false, subjectDistanceM: 3 });
    state.focusM = state.subjectDistanceM; ui.sync(state);
    captionEl.textContent = "Lesson 2 — the dolly zoom. Subject size is locked, so the camera moves as the lens changes. The subject stays the same; watch the background compress with a longer lens. Perspective comes from where you stand, not the lens.";
    animateFocal(24, 120, 5000, () => { state.focusM = state.subjectDistanceM; });
  } else if (id === "dof") {
    Object.assign(state, { lockSubjectSize: false, dofOn: true, focalMm: 85, fNumber: 1.4, subjectDistanceM: 4 });
    state.focusM = state.subjectDistanceM; ui.sync(state);
    captionEl.textContent = "Lesson 3 — depth of field. An 85 mm lens at f/1.4 throws the colonnade and the lights behind the figure far out of focus. Step the aperture down toward f/16 and watch the in-focus band deepen.";
    requestRender();
  } else if (id === "verticals") {
    Object.assign(state, { perspectiveControl: "tilt", showOverlay: true, dofOn: false, focalMm: 24, shiftNudge: 0 });
    ui.sync(state);
    captionEl.textContent = "Lesson 4 — keeping buildings straight. ‘Tilt up’ points the camera up at the façade and the verticals converge (3-point perspective). Switch to ‘Shift (keep vertical)’ — the camera stays level and the lens slides up, so the verticals stay parallel (2-point).";
    requestRender();
  }
}

// ---- go --------------------------------------------------------------------------
resize();
ui.sync(state);
render();

// Deep-link straight into a guided lesson, e.g. ?lesson=dof — handy for sharing.
const params = new URLSearchParams(location.search);
const startLesson = params.get("lesson");
if (startLesson && ["lens", "dolly", "dof", "verticals"].includes(startLesson)) lesson(startLesson);
const startPc = params.get("pc");
if (startPc && ["free", "tilt", "shift"].includes(startPc)) {
  state.perspectiveControl = startPc;
  ui.sync(state);
  requestRender();
}
