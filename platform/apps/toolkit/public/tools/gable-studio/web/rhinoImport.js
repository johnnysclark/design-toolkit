// rhinoImport.js — read an uploaded .3dm in-browser (rhino3dm WASM) and bring it
// back into the loop. Two modes:
//   CONVENTION: layers named Plinth / Room / Roof (what our own Rhino exports
//     bake) -> measure bounding boxes -> recover params -> re-test in the app.
//   GENERIC:   no convention -> report a quick read (object + layer + bbox
//     summary) so the student still gets a measured response.
// Rotations/north of imported geometry are assumed 0 (documented limitation of
// the bbox method); the point is the round-trip, not a full reverse-engineer.
// rhino3dm is loaded LAZILY (dynamic import) the first time you import a .3dm,
// so if its CDN is blocked the rest of the app is unaffected.
let _rhino = null;
async function getRhino() {
  if (!_rhino) {
    const mod = await import("rhino3dm");
    _rhino = await (mod.default || mod)();
  }
  return _rhino;
}

function bbox(geo) {
  try {
    const bb = geo.getBoundingBox();
    const min = bb.min, max = bb.max;
    return { min, max, dx: max[0] - min[0], dy: max[1] - min[1], dz: max[2] - min[2] };
  } catch { return null; }
}

export async function importThreeDM(arrayBuffer) {
  const rhino = await getRhino();
  const doc = rhino.File3dm.fromByteArray(new Uint8Array(arrayBuffer));
  if (!doc) throw new Error("not a readable .3dm file");

  const layers = doc.layers();
  const layerName = (idx) => { try { return layers.get(idx).name; } catch { return ""; } };

  const objs = doc.objects();
  const byLayer = {}; const summary = [];
  for (let i = 0; i < objs.count; i++) {
    const o = objs.get(i);
    const geo = o.geometry();
    const ln = (layerName(o.attributes().layerIndex) || "default").toLowerCase();
    const bb = geo ? bbox(geo) : null;
    if (bb) {
      (byLayer[ln] ||= []).push(bb);
      summary.push({ layer: ln, dx: +bb.dx.toFixed(2), dy: +bb.dy.toFixed(2), dz: +bb.dz.toFixed(2) });
    }
  }

  const unionBox = (boxes) => {
    if (!boxes || !boxes.length) return null;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const b of boxes) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], b.min[k]); max[k] = Math.max(max[k], b.max[k]); }
    return { min, max, dx: max[0] - min[0], dy: max[1] - min[1], dz: max[2] - min[2] };
  };

  const find = (name) => unionBox(byLayer[name]);
  const plinth = find("plinth"), roof = find("roof");

  const room = find("walls") || find("room");
  if (plinth && room) {
    const ctr = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
    const [pcx, pcy] = ctr(plinth), [wcx, wcy] = ctr(room), [rcx, rcy] = roof ? ctr(roof) : [wcx, wcy];
    const params = {
      plinth: { cx: r2(pcx), cy: r2(pcy), W: r2(plinth.dx), L: r2(plinth.dy), t: r2(plinth.dz), R: 0 },
      walls: { cx: r2(wcx), cy: r2(wcy), W: r2(room.dx), L: r2(room.dy), h: r2(room.dz), R: 0 },
      roof: { cx: r2(rcx), cy: r2(rcy), W: r2(roof ? roof.dx : room.dx), L: r2(roof ? roof.dy : room.dy), ridgeRise: r2(roof ? roof.dz : 1.5), R: 0 },
    };
    return {
      mode: "convention", params,
      message: `Read Plinth + Walls${roof ? " + Roof" : ""} layers → recovered footprints + heights. ` +
        `Rotations/pitches/north assumed 0 and apertures kept from the current design (bbox method).`,
      summary,
    };
  }

  return {
    mode: "generic",
    message: `No Plinth/Room/Roof layers found (found: ${Object.keys(byLayer).join(", ") || "none"}). ` +
      `Showing a measured read; use the layer convention (or this tool's Rhino export) to recover full parameters.`,
    summary,
  };
}

const r2 = (x) => Math.round(x * 100) / 100;
