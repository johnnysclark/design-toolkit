// DXF export — flatten every path to a polyline and emit one LWPOLYLINE per
// subpath, in millimetres (INSUNITS = 4), Y flipped so drawings land right-way-up
// in CAD. Same minimal-DXF idiom the Surveyor exporter uses. R12-friendly, so it
// imports cleanly into Rhino / AutoCAD / Illustrator and laser software.

import { flattenCmds } from "./fit";
import type { TraceResult } from "./types";

// `mmPerPx` maps original-image px → mm (set from the output-size control).
export function toDXF(res: TraceResult, mmPerPx: number, curveSteps = 10): string {
  const H = res.height;
  const ents: string[] = [];
  let layerIdx = 0;
  for (const layer of res.layers) {
    const name = `VEC_${layerIdx++}`;
    for (const sp of layer.subpaths) {
      const pts = flattenCmds(sp.cmds, curveSteps);
      if (pts.length < 2) continue;
      // A closed loop's flattened points don't repeat the start; the closed flag
      // (70 = 1) tells CAD to bridge last→first.
      let ent = `0\nLWPOLYLINE\n8\n${name}\n90\n${pts.length}\n70\n${sp.closed ? 1 : 0}`;
      for (const p of pts) {
        const x = p.x * mmPerPx;
        const y = (H - p.y) * mmPerPx;
        ent += `\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}`;
      }
      ents.push(ent);
    }
  }
  return (
    "0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n" +
    "0\nSECTION\n2\nENTITIES\n" +
    ents.join("\n") +
    (ents.length ? "\n" : "") +
    "0\nENDSEC\n0\nEOF\n"
  );
}
