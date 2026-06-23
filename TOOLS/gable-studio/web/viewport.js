// viewport.js — Three.js render of the massing, driven entirely by the analytic
// model from core.js (so what you see matches what the metrics measure). World
// coords: +X East, +Y North, +Z Up. Apertures are drawn as inset panels (a
// visual proxy — no CSG boolean is needed because the metrics use aperture
// area/orientation analytically).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { perFaceSolar } from "./core.js";

const D2R = Math.PI / 180;
// our vectors are [x,y,z] with +Z up; three is Y-up, so map (x,y,z)->(x,z,y).
const toV3 = (p) => new THREE.Vector3(p[0], p[2], p[1]);

const COL = {
  plinth: 0x8a7f6d, room: 0xece7dd, roof: 0xc9b79c,
  gable: 0xe2dccf, glass: 0x2f6d7a, edge: 0x3a352c, ground: 0xcfc8b8,
};

export function createViewport(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f1ea);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(16, 14, 20);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 3, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x6b6450, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3df, 1.1);
  sun.position.set(12, 20, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  scene.add(sun);

  const grid = new THREE.GridHelper(60, 30, 0xb9b1a0, 0xd8d2c4);
  grid.position.y = 0; scene.add(grid);

  // north arrow (world +Y)
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.02, -14), 4, 0xb0451f, 1.2, 0.8);
  scene.add(arrow);

  const group = new THREE.Group();      // all building meshes
  scene.add(group);
  const soil = makeSoil();
  scene.add(soil);

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();

  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();

  let heatmap = false;
  function setModel(model) {
    group.clear();
    const solar = heatmap ? perFaceSolar(model) : null;
    buildBuilding(group, model, solar);
    // soil plane to grade height e
    soil.position.y = (model.P.e || 0);
  }
  function setHeatmap(on, model) { heatmap = on; if (model) setModel(model); }

  return { setModel, setHeatmap, scene, camera, controls };
}

function makeSoil() {
  const geo = new THREE.PlaneGeometry(60, 60);
  const mat = new THREE.MeshStandardMaterial({ color: COL.ground, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

// vector helpers on [x,y,z]
const rotZ = ([x, y, z], deg) => { const r = deg * D2R, c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c, z]; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

function quadMesh(a, b, c, d, color, opts = {}) {
  const g = new THREE.BufferGeometry();
  const v = [a, b, c, a, c, d].flatMap(toV3map);
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color, side: THREE.DoubleSide, roughness: 0.85, metalness: 0.0,
    transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
  });
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const toV3map = (p) => [p[0], p[2], p[1]];

function edges(points, color) {
  const g = new THREE.BufferGeometry().setFromPoints(points.map(toV3));
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color }));
}

// heat colour: blue(cool)->yellow->red(hot)
function heat(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [[0, [60, 110, 160]], [0.5, [225, 205, 90]], [1, [200, 70, 45]]];
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
    const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], f = (t - t0) / (t1 - t0 || 1);
    return (c0[0] + (c1[0] - c0[0]) * f << 16) | (c0[1] + (c1[1] - c0[1]) * f << 8) | (c0[2] + (c1[2] - c0[2]) * f);
  }
  return 0xc8462d;
}

function faceCorners(f) {
  const hu = scl(f.uAxis, f.faceWidth / 2), hv = scl(f.vAxis, f.faceHeight / 2);
  return [add(add(f.c, scl(hu, -1)), scl(hv, -1)), add(add(f.c, hu), scl(hv, -1)), add(add(f.c, hu), hv), add(add(f.c, scl(hu, -1)), hv)];
}

function buildBuilding(group, model, solar) {
  const P = model.P, north = model.north;
  // ---- plinth (box, 5 faces) ----
  const wp = P.Wp / 2, dp = P.Dp / 2;
  const pc = (sx, sy, sz) => { const r = rotZ([sx, sy, 0], P.Rp + north); return [r[0], r[1], sz]; };
  const pTop = [pc(-wp, -dp, P.Hp), pc(wp, -dp, P.Hp), pc(wp, dp, P.Hp), pc(-wp, dp, P.Hp)];
  const pBot = [pc(-wp, -dp, 0), pc(wp, -dp, 0), pc(wp, dp, 0), pc(-wp, dp, 0)];
  group.add(quadMesh(...pTop, COL.plinth));
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    group.add(quadMesh(pBot[i], pBot[j], pTop[j], pTop[i], COL.plinth));
  }
  group.add(edges(pTop, COL.edge));

  // ---- room walls (from frames; coloured by solar if heatmap) ----
  for (const f of model.walls) {
    const c = faceCorners(f);
    const col = solar ? heat(solar[f.name] ?? 0) : COL.room;
    group.add(quadMesh(...c, col));
    group.add(edges(c, COL.edge));
  }

  // ---- roof planes + gable end triangles ----
  for (const f of model.roofs) {
    const c = faceCorners(f);
    const col = solar ? heat(solar[f.name] ?? 0) : COL.roof;
    group.add(quadMesh(...c, col));
    group.add(edges(c, COL.edge));
  }
  const eaveZ = P.Hp + P.Hr, ridgeZ = eaveZ + P.Hg, wr = P.Wroof / 2, dr2 = P.Droof / 2;
  const rc = (sx, sy, sz) => { const r = rotZ([sx + 0, sy + 0, 0], P.Rg + north); return [r[0] + rotZ([P.cx, P.cy, 0], north)[0], r[1] + rotZ([P.cx, P.cy, 0], north)[1], sz]; };
  for (const sy of [dr2, -dr2]) {
    const tri = [rc(-wr, sy, eaveZ), rc(wr, sy, eaveZ), rc(0, sy, ridgeZ)];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(tri.flatMap(toV3map), 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: COL.gable, side: THREE.DoubleSide, roughness: 0.9 }));
    m.castShadow = true; group.add(m);
  }

  // ---- apertures (inset glass panels) ----
  for (const ap of model.apertures) {
    const f = model.frames[ap.host]; if (!f) continue;
    const hu = scl(f.uAxis, ap.w / 2), hv = scl(f.vAxis, ap.h / 2);
    const off = scl(ap.n, 0.03);
    const c0 = add(ap.c, off);
    const corners = [add(add(c0, scl(hu, -1)), scl(hv, -1)), add(add(c0, hu), scl(hv, -1)), add(add(c0, hu), hv), add(add(c0, scl(hu, -1)), hv)];
    group.add(quadMesh(...corners, COL.glass, { transparent: true, opacity: 0.55 }));
    group.add(edges(corners, 0x14323a));
  }
}
