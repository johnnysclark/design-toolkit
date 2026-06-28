// rhinoExport.js — build a real .3dm IN THE BROWSER (rhino3dm WASM) so the export
// bundle ships native Rhino geometry, not just python that makes it. Geometry +
// layers mirror python/run_rhino3dm.py exactly (Plinth slab / Walls tube / Roof
// slopes / Apertures), so the file re-imports cleanly. Lazy-loaded; returns null
// if rhino3dm can't load (the python in the bundle still rebuilds everything).
import { rotZ, scale, add, clippedWallQuads } from "./core.js";

let _rhino = null;
async function getRhino() {
  if (!_rhino) { const mod = await import("rhino3dm"); _rhino = await (mod.default || mod)(); }
  return _rhino;
}

const D2R = Math.PI / 180;
const w = (lx, ly, lz, R, cx, cy, north) => { const p = rotZ([lx, ly, 0], R); const q = rotZ([p[0] + cx, p[1] + cy, 0], north); return [q[0], q[1], lz]; };

export async function buildThreeDM(model) {
  let rhino;
  try { rhino = await getRhino(); } catch (e) { return null; }
  const P = model.P, n = model.north, G = model.roofGeom;
  const doc = new rhino.File3dm();

  const layer = (name, c) => { const l = new rhino.Layer(); l.name = name; l.color = { r: c[0], g: c[1], b: c[2], a: 255 }; return doc.layers().add(l); };
  const li = {
    Plinth: layer("Plinth", [138, 127, 109]), Walls: layer("Walls", [210, 205, 190]),
    Roof: layer("Roof", [201, 183, 156]), Apertures: layer("Apertures", [47, 109, 122]),
  };
  const attr = (idx) => { const a = new rhino.ObjectAttributes(); a.layerIndex = idx; return a; };

  const boxMesh = (bottom, top) => {
    const m = new rhino.Mesh();
    for (const p of [...bottom, ...top]) m.vertices().add(p[0], p[1], p[2]);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) m.faces().addQuadFace(f[0], f[1], f[2], f[3]);
    return m;
  };
  // mesh from a list of world-space quads (gable-clipped wall slabs)
  const quadMesh = (quads) => {
    const m = new rhino.Mesh();
    let b = 0;
    for (const q of quads) { for (const p of q) m.vertices().add(p[0], p[1], p[2]); m.faces().addQuadFace(b, b + 1, b + 2, b + 3); b += 4; }
    return m;
  };
  const addBox = (W, L, zb, zt, R, cx, cy, lname) => {
    const c = [[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]];
    doc.objects().addMesh(boxMesh(c.map(([x, y]) => w(x, y, zb, R, cx, cy, n)), c.map(([x, y]) => w(x, y, zt, R, cx, cy, n))), attr(li[lname]));
  };

  const Pl = P.plinth, Wl = P.walls, Rf = P.roof;
  addBox(Pl.W, Pl.L, -Pl.t, 0, Pl.R, Pl.cx, Pl.cy, "Plinth");

  // walls: gable-clipped slabs (match the browser); one mesh PER wall so the
  // re-import can recover the wall height from the shortest (eave) wall.
  const hw = Wl.W / 2, hl = Wl.L / 2, tw = Wl.wt;
  for (const [x0, x1, y0, y1] of [[hw - tw, hw, -hl, hl], [-hw, -hw + tw, -hl, hl], [-hw, hw, hl - tw, hl], [-hw, hw, -hl, -hl + tw]])
    doc.objects().addMesh(quadMesh(clippedWallQuads(x0, x1, y0, y1, Wl, Rf, G, n)), attr(li.Walls));

  const slope = (eaveX, ridgeX, eaveZ, nx) => {
    const k = Math.hypot(nx, 1) || 1, nl = [nx / k, 0, 1 / k];
    const top = [[eaveX, -Rf.L / 2, eaveZ], [ridgeX, -Rf.L / 2, G.zRidge], [ridgeX, Rf.L / 2, G.zRidge], [eaveX, Rf.L / 2, eaveZ]];
    const bot = top.map((p) => [p[0] - nl[0] * Rf.t, p[1], p[2] - nl[2] * Rf.t]);
    const TW = (p) => w(p[0], p[1], p[2], Rf.R, Rf.cx, Rf.cy, n);
    doc.objects().addMesh(boxMesh(bot.map(TW), top.map(TW)), attr(li.Roof));
  };
  slope(-Rf.W / 2, G.ridgeX, G.eaveZL, -Math.tan(Rf.pitchL * D2R));
  slope(Rf.W / 2, G.ridgeX, G.eaveZR, Math.tan(Rf.pitchR * D2R));

  for (const ap of model.apertures) {
    const f = model.frames[ap.host]; if (!f) continue;
    const hu = scale(f.uAxis, ap.w / 2), hv = scale(f.vAxis, ap.h / 2), c0 = add(ap.c, scale(f.n, 0.03));
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => [c0[0] + hu[0] * su + hv[0] * sv, c0[1] + hu[1] * su + hv[1] * sv, c0[2] + hu[2] * su + hv[2] * sv]);
    const pl = new rhino.Point3dList();
    for (const p of [...cs, cs[0]]) pl.add(p[0], p[1], p[2]);
    doc.objects().addPolyline(pl, attr(li.Apertures));
  }

  const bytes = doc.toByteArray();
  doc.delete();
  return bytes;
}
