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
  const plinth = find("plinth"), room = find("room"), roof = find("roof");

  if (plinth && room) {
    const params = {
      Wp: r2(plinth.dx), Dp: r2(plinth.dy), Hp: r2(plinth.dz), Rp: 0, e: 0,
      Wr: r2(room.dx), Dr: r2(room.dy), Hr: r2(room.dz), Rr: 0,
      cx: r2((room.min[0] + room.max[0]) / 2 - (plinth.min[0] + plinth.max[0]) / 2),
      cy: r2((room.min[1] + room.max[1]) / 2 - (plinth.min[1] + plinth.max[1]) / 2),
      Wroof: r2(roof ? roof.dx : room.dx), Droof: r2(roof ? roof.dy : room.dy),
      Hg: r2(roof ? roof.dz : 1.5), Rg: 0,
    };
    return {
      mode: "convention", params,
      message: `Read Plinth + Room${roof ? " + Roof" : ""} layers → recovered dimensions. ` +
        `Rotations/north assumed 0 and apertures kept from the current design (bbox method).`,
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
