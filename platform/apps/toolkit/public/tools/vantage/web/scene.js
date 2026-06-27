// scene.js — builds the architectural scene Vantage photographs. A colonnade
// receding in depth (great for compression + DoF falloff), a figure for scale, a
// tall façade for the verticals lesson, depth markers at known distances, and a
// few bright spheres that bloom into bokeh when defocused. World units are METRES;
// depth runs into -Z, eye height ~1.6 m.

export function buildScene(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbcd0e0);
  scene.fog = new THREE.Fog(0xbcd0e0, 22, 95);

  // --- lighting ---------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7480, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
  sun.position.set(-8, 16, 6);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  // --- ground -----------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x8d8f86, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new THREE.GridHelper(200, 100, 0x55585a, 0x6f7274);
  grid.position.y = 0.002;
  if (grid.material) grid.material.opacity = 0.5, (grid.material.transparent = true);
  scene.add(grid);

  // --- colonnade: two rows of columns receding into -Z ------------------------
  const stone = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.85 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.9 });
  const colH = 5;
  const colGeo = new THREE.CylinderGeometry(0.28, 0.32, colH, 24);
  const capGeo = new THREE.BoxGeometry(0.9, 0.4, 0.9);
  const baseGeo = new THREE.BoxGeometry(0.85, 0.3, 0.85);
  const beamGeo = new THREE.BoxGeometry(0.7, 0.7, 40);
  for (const x of [-3.2, 3.2]) {
    for (let i = 0; i < 14; i++) {
      const z = -2 - i * 3;
      const col = new THREE.Mesh(colGeo, stone);
      col.position.set(x, colH / 2 + 0.3, z);
      scene.add(col);
      const cap = new THREE.Mesh(capGeo, trim);
      cap.position.set(x, colH + 0.3 + 0.2, z);
      scene.add(cap);
      const base = new THREE.Mesh(baseGeo, trim);
      base.position.set(x, 0.15, z);
      scene.add(base);
    }
    // entablature beam along the top of each row
    const beam = new THREE.Mesh(beamGeo, trim);
    beam.position.set(x, colH + 0.9, -2 - 13 * 3 / 2 - 2);
    scene.add(beam);
  }

  // --- figure (the subject), ~1.8 m, slightly off-centre ----------------------
  const figure = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc24d3a, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.95, 6, 14), skin);
  body.position.y = 1.0;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), skin);
  head.position.y = 1.72;
  figure.add(body, head);
  figure.position.set(0.7, 0, -4.5);
  scene.add(figure);
  const subjectPoint = new THREE.Vector3(0.7, 1.2, -4.5);

  // --- façade at the end (verticals / tilt-shift lesson) ----------------------
  const facade = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xcbb89a, roughness: 0.95 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a55, roughness: 0.25, metalness: 0.1, emissive: 0x223038, emissiveIntensity: 0.4
  });
  const fW = 18, fH = 14, fZ = -44;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(fW, fH, 0.6), wallMat);
  wall.position.set(0, fH / 2, fZ);
  facade.add(wall);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 0.2), glassMat);
      win.position.set(-7.2 + c * 3.6, 2.4 + r * 3.0, fZ + 0.35);
      facade.add(win);
    }
  }
  scene.add(facade);
  const facadePoint = new THREE.Vector3(0, fH / 2, fZ);

  // --- bokeh highlights: small bright spheres behind the subject ---------------
  const dots = new THREE.Group();
  const dotColors = [0xffe08a, 0xfff4d6, 0xa8d8ff, 0xffd0c0, 0xfff0b0];
  const rng = mulberry32(20260626);
  for (let i = 0; i < 18; i++) {
    const z = -9 - rng() * 30;
    const x = (rng() - 0.5) * 5.2;
    const y = 0.4 + rng() * 4.2;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 + rng() * 0.06, 12, 10),
      new THREE.MeshBasicMaterial({ color: dotColors[i % dotColors.length], fog: false })
    );
    dot.position.set(x, y, z);
    dots.add(dot);
  }
  scene.add(dots);

  // --- depth markers at known distances down the centre-line ------------------
  // Returned so the UI can offer "focus on 1 / 3 / 10 / 30 m" and the schematic
  // can label them. Distance is along -Z from the camera's start (z≈0.3).
  const markers = [1, 3, 10, 30].map((d) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    const z = 0.3 - d;
    post.position.set(-1.6, 0.3, z);
    scene.add(post);
    return { distance: d, point: new THREE.Vector3(-1.6, 0.3, z) };
  });

  // Things a click/preset can focus on, with their world points.
  const focusTargets = [
    { name: "Figure", point: subjectPoint.clone() },
    { name: "Façade", point: facadePoint.clone() }
  ];

  return {
    scene,
    subjectPoint,        // default orbit target + default focus
    facadePoint,
    cameraStart: new THREE.Vector3(0.7, 1.6, 0.3),
    focusTargets,
    markers
  };
}

// Small deterministic PRNG so the bokeh layout is stable across reloads.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
