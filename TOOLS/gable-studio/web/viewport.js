// viewport.js (v2) — two looks, both driven by the analytic model from core.js:
//   PEN: white-paper hidden-line drawing (white faces occlude rear black edges)
//        with crisp cast shadows on a ravine-edge topography (contour lines).
//   ANALYSIS: Ladybug-style spectral colouring of the envelope by yearly solar,
//        with a legend and day-arc sun paths.
// World coords: +X East, +Y North, +Z Up; three.js is Y-up so map (x,y,z)->(x,z,y).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { overlayField, sunDirection, terrainHeight, rotZ, dirAz } from "./core.js";

const v3 = (p) => new THREE.Vector3(p[0], p[2], p[1]);
const tf = (lx, ly, lz, R, cx, cy, north) => { const p = rotZ([lx, ly, 0], R); const w = rotZ([p[0] + cx, p[1] + cy, 0], north); return [w[0], w[1], lz]; };

// Ladybug-ish spectral ramp (blue->cyan->green->yellow->orange->red).
const RAMP = [[0, [25, 70, 160]], [0.2, [0, 160, 205]], [0.4, [0, 172, 92]], [0.6, [232, 222, 52]], [0.8, [242, 140, 28]], [1, [200, 30, 30]]];
function spectral(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) {
    const [t0, c0] = RAMP[i - 1], [t1, c1] = RAMP[i], f = (t - t0) / (t1 - t0 || 1);
    return (Math.round(c0[0] + (c1[0] - c0[0]) * f) << 16) | (Math.round(c0[1] + (c1[1] - c0[1]) * f) << 8) | Math.round(c0[2] + (c1[2] - c0[2]) * f);
  }
  return 0xc81e1e;
}

export function createViewport(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 4000);
  camera.position.set(20, 16, 24);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.target.set(0, 2, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 0.5; sc.far = 160;
  sun.shadow.bias = -0.0004;
  scene.add(sun); scene.add(sun.target);

  const buildingGroup = new THREE.Group(); scene.add(buildingGroup);
  const terrainGroup = new THREE.Group(); scene.add(terrainGroup);
  const sunpathGroup = new THREE.Group(); scene.add(sunpathGroup);
  const windGroup = new THREE.Group(); scene.add(windGroup);
  const northArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.05, -16), 4, 0x333333, 1.2, 0.8);
  scene.add(northArrow);

  // legend overlay (analysis mode)
  const legend = document.createElement("div");
  legend.className = "lblegend"; legend.style.display = "none";
  legend.innerHTML = `<span class="lbtitle">yearly sun</span><span class="lbmax">–</span><div class="lbbar"></div><span class="lbmin">–</span>`;
  legend.querySelector(".lbbar").style.background = "linear-gradient(to top,#1946a0,#00a0cd,#00ac5c,#e8de34,#f28c1c,#c81e1e)";
  canvas.parentElement.appendChild(legend);

  function resize() {
    const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas.parentElement); resize();
  (function loop() { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();

  let model = null, display = { mode: "pen", shadowIntensity: 0.6, sunHour: 15, analysisField: "solarNow" };
  let terrainKey = null;
  const faceMeshes = [];   // {mesh, edges, name}
  const apMeshes = [];     // {mesh, id} aperture glass panels

  function setModel(m, d) {
    model = m; if (d) display = Object.assign(display, d);
    buildBuilding();
    const tk = JSON.stringify(m.site.terrain);
    if (tk !== terrainKey) { terrainKey = tk; buildTerrain(); }
    applyDisplay();
  }
  function setDisplay(d) { display = Object.assign(display, d); applyDisplay(); }

  // ---- geometry ----
  function solid(quads, name) {
    const pos = [];
    for (const q of quads) { const [a, b, c, e] = q.map(v3); pos.push(a, b, c, a, c, e); }
    const g = new THREE.BufferGeometry().setFromPoints(pos); g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 18), new THREE.LineBasicMaterial({ color: 0x111111 }));
    buildingGroup.add(mesh, edges);
    faceMeshes.push({ mesh, edges, name });
  }
  const boxQuads = (b) => [[b[0], b[1], b[2], b[3]], [b[4], b[7], b[6], b[5]], [b[0], b[4], b[5], b[1]], [b[1], b[5], b[6], b[2]], [b[2], b[6], b[7], b[3]], [b[3], b[7], b[4], b[0]]];
  function box(W, L, zb, zt, R, cx, cy, north, name) {
    const c = [[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]];
    const b = [...c.map(([x, y]) => tf(x, y, zb, R, cx, cy, north)), ...c.map(([x, y]) => tf(x, y, zt, R, cx, cy, north))];
    solid(boxQuads(b), name);
  }

  function buildBuilding() {
    buildingGroup.clear(); faceMeshes.length = 0; apMeshes.length = 0;
    const P = model.P, n = model.north;

    // plinth slab
    const Pl = P.plinth; box(Pl.W, Pl.L, -Pl.t, 0, Pl.R, Pl.cx, Pl.cy, n, "plinth");

    // walls: 4 slabs (tube, no floor/ceiling)
    const W = P.walls;
    const wallSlab = (x0, x1, y0, y1, name) => {
      const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const b = [...c.map(([x, y]) => tf(x, y, 0, W.R, W.cx, W.cy, n)), ...c.map(([x, y]) => tf(x, y, W.h, W.R, W.cx, W.cy, n))];
      solid(boxQuads(b), name);
    };
    const hw = W.W / 2, hl = W.L / 2, t = W.wt;
    wallSlab(hw - t, hw, -hl, hl, "wall_px");
    wallSlab(-hw, -hw + t, -hl, hl, "wall_nx");
    wallSlab(-hw, hw, hl - t, hl, "wall_py");
    wallSlab(-hw, hw, -hl, -hl + t, "wall_ny");

    // roof: two slope slabs with independent pitch + thickness
    const Rf = P.roof, G = model.roofGeom;
    const slope = (eaveX, ridgeX, eaveZ, nLocal, name) => {
      const top = [[eaveX, -Rf.L / 2, eaveZ], [ridgeX, -Rf.L / 2, G.zRidge], [ridgeX, Rf.L / 2, G.zRidge], [eaveX, Rf.L / 2, eaveZ]];
      const off = [nLocal[0] * Rf.t, 0, nLocal[2] * Rf.t];
      const bot = top.map((p) => [p[0] - off[0], p[1] - off[1], p[2] - off[2]]);
      const TW = (p) => tf(p[0], p[1], p[2], Rf.R, Rf.cx, Rf.cy, n);
      const T = top.map(TW), B = bot.map(TW);
      solid([T, [B[3], B[2], B[1], B[0]], [T[0], B[0], B[1], T[1]], [T[1], B[1], B[2], T[2]], [T[2], B[2], B[3], T[3]], [T[3], B[3], B[0], T[0]]], name);
    };
    const nl = (s) => { const k = Math.hypot(s, 0, 1) || 1; return [s / k, 0, 1 / k]; };
    slope(-Rf.W / 2, G.ridgeX, G.eaveZL, nl(-Math.tan(Rf.pitchL * Math.PI / 180)), "roof_l");
    slope(Rf.W / 2, G.ridgeX, G.eaveZR, nl(Math.tan(Rf.pitchR * Math.PI / 180)), "roof_r");

    // apertures: outline + faint glass on the host face
    for (const ap of model.apertures) {
      const f = model.frames[ap.host]; if (!f) continue;
      const hu = [f.uAxis[0] * ap.w / 2, f.uAxis[1] * ap.w / 2, f.uAxis[2] * ap.w / 2];
      const hv = [f.vAxis[0] * ap.h / 2, f.vAxis[1] * ap.h / 2, f.vAxis[2] * ap.h / 2];
      const o = [f.n[0] * 0.04, f.n[1] * 0.04, f.n[2] * 0.04];
      const c0 = [ap.c[0] + o[0], ap.c[1] + o[1], ap.c[2] + o[2]];
      const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => [c0[0] + hu[0] * su + hv[0] * sv, c0[1] + hu[1] * su + hv[1] * sv, c0[2] + hu[2] * su + hv[2] * sv]);
      const g = new THREE.BufferGeometry().setFromPoints([...cs, cs[0]].map(v3));
      buildingGroup.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x111111 })));
      const gg = new THREE.BufferGeometry().setFromPoints([cs[0], cs[1], cs[2], cs[0], cs[2], cs[3]].map(v3));
      const glass = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ color: 0x6f8d96, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
      buildingGroup.add(glass);
      apMeshes.push({ mesh: glass, id: ap.id });
    }
  }

  function buildTerrain() {
    terrainGroup.clear();
    const T = model.site.terrain, S = 60, N = 56, h2 = S / 2;
    const geo = new THREE.PlaneGeometry(S, S, N, N);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = -pos.getY(i); // plane local -> world x,y
      pos.setZ(i, terrainHeight(x, y, T));
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0xf6f4ef, roughness: 1, metalness: 0, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true; mesh.castShadow = true;
    terrainGroup.add(mesh);

    // contour lines via marching squares
    const sample = (gx, gy) => terrainHeight(-h2 + (gx / N) * S, -h2 + (gy / N) * S, T);
    let zmin = Infinity, zmax = -Infinity;
    for (let gy = 0; gy <= N; gy++) for (let gx = 0; gx <= N; gx++) { const z = sample(gx, gy); if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
    const pts = [];
    const interval = 1.0;
    for (let lvl = Math.ceil(zmin / interval) * interval; lvl < zmax; lvl += interval) {
      for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
        const x0 = -h2 + (gx / N) * S, x1 = -h2 + ((gx + 1) / N) * S, y0 = -h2 + (gy / N) * S, y1 = -h2 + ((gy + 1) / N) * S;
        const a = sample(gx, gy), b = sample(gx + 1, gy), c = sample(gx + 1, gy + 1), d = sample(gx, gy + 1);
        const lerp = (p, q, va, vb) => { const tt = (lvl - va) / (vb - va || 1e-9); return [p[0] + (q[0] - p[0]) * tt, p[1] + (q[1] - p[1]) * tt]; };
        const corners = [[x0, y0, a], [x1, y0, b], [x1, y1, c], [x0, y1, d]];
        const e = [];
        for (let k = 0; k < 4; k++) { const p = corners[k], q = corners[(k + 1) % 4]; if ((p[2] - lvl) * (q[2] - lvl) < 0) { const xy = lerp(p, q, p[2], q[2]); e.push([xy[0], xy[1], lvl]); } }
        if (e.length === 2) { pts.push(v3(e[0]), v3(e[1])); }
      }
    }
    if (pts.length) terrainGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xb9b2a6 })));
  }

  function buildSunPath() {
    sunpathGroup.clear();
    if (display.mode !== "analysis" || !model) return;
    const lat = model.site.latitude, R = 22, cz = 0;
    const decls = [[23.45, 0xe07a2a], [0, 0xc9a23a], [-23.45, 0x4a7bb0]];
    for (const [d, col] of decls) {
      const pts = [];
      for (let h = 4; h <= 20; h += 0.4) { const s = sunDirection(lat, h, d); if (s) pts.push(v3([s[0] * R, s[1] * R, cz + s[2] * R])); }
      if (pts.length > 1) sunpathGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col })));
    }
  }

  function buildWindArrows() {
    windGroup.clear();
    if (!model || display.mode !== "analysis" || (display.analysisField || "") !== "wind") return;
    const f = dirAz(model.site.windFromAz, 0);   // points toward where wind comes FROM
    const t = [-f[0], -f[1], 0];                  // travel direction
    const u = rotZ(f, 90);
    const speed = model.site.windSpeed || 0;
    const len = 2.5 + speed * 0.5;
    const dir = new THREE.Vector3(t[0], 0, t[1]).normalize();
    for (const off of [-8, -4, 0, 4, 8]) for (const zc of [2.2, 5.2]) {
      const origin = new THREE.Vector3(f[0] * 16 + u[0] * off, zc, f[1] * 16 + u[1] * off);
      windGroup.add(new THREE.ArrowHelper(dir, origin, len, 0x2f6db0, Math.min(1.4, 0.5 + speed * 0.06), 0.55));
    }
  }

  // ---- look ----
  function applyDisplay() {
    const s = display.shadowIntensity;
    ambient.intensity = 0.95 - 0.62 * s;
    sun.intensity = 0.18 + 0.95 * s;
    sun.shadow.radius = 3.2 - 2.6 * s;
    const sd = sunDirection(model ? model.site.latitude : 42, display.sunHour, 0) || [0.4, -0.5, 0.85];
    sun.position.set(sd[0] * 60, sd[2] * 60, sd[1] * 60);
    sun.target.position.set(0, 0, 0);

    const analysis = display.mode === "analysis";
    const field = analysis && model ? overlayField(model, display.analysisField || "solarNow", display.sunHour) : null;
    const norm = (v) => field.max > 1e-9 ? (v - field.min) / (field.max - field.min) : 0;
    for (const fm of faceMeshes) {
      if (analysis) {
        const val = field.faces[fm.name];
        fm.mesh.material.color.setHex(val === undefined ? 0xd7d2c8 : spectral(norm(val)));
        fm.edges.visible = false;
      } else {
        fm.mesh.material.color.setHex(0xffffff);
        fm.edges.visible = true;
      }
    }
    if (analysis) {
      const byId = Object.fromEntries(field.apertures.map((a) => [a.id, a.val]));
      for (const am of apMeshes) { am.mesh.material.color.setHex(spectral(norm(byId[am.id] ?? field.min))); am.mesh.material.opacity = 0.92; }
      legend.querySelector(".lbtitle").textContent = field.label;
      legend.querySelector(".lbmax").textContent = field.max.toFixed(2);
      legend.querySelector(".lbmin").textContent = field.min.toFixed(2);
    } else {
      for (const am of apMeshes) { am.mesh.material.color.setHex(0x6f8d96); am.mesh.material.opacity = 0.25; }
    }
    legend.style.display = analysis ? "flex" : "none";
    northArrow.setColor(new THREE.Color(analysis ? 0x888888 : 0x333333));
    buildSunPath();
    buildWindArrows();
  }

  return { setModel, setDisplay };
}
