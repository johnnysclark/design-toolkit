// Colour posterisation — median-cut quantisation into a small palette, so the
// colour-trace mode can fill each band as its own layer (Illustrator-style image
// trace). Pixels are composited over white first so transparency reads as page.

import type { RGBA } from "./types";

export interface Quantized {
  palette: [number, number, number][];
  labels: Uint8Array; // per-pixel palette index
}

export function quantize(img: RGBA, k: number): Quantized {
  const { data, width, height } = img;
  const n = width * height;
  const R = new Uint8Array(n);
  const G = new Uint8Array(n);
  const Bc = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    const a = data[o + 3] / 255;
    const ib = 1 - a;
    R[i] = data[o] * a + 255 * ib;
    G[i] = data[o + 1] * a + 255 * ib;
    Bc[i] = data[o + 2] * a + 255 * ib;
  }

  let boxes: number[][] = [[]];
  const all = boxes[0];
  for (let i = 0; i < n; i++) all.push(i);

  const widest = (ids: number[]): { ch: number; range: number } => {
    let rmin = 255;
    let rmax = 0;
    let gmin = 255;
    let gmax = 0;
    let bmin = 255;
    let bmax = 0;
    for (const i of ids) {
      const r = R[i];
      const g = G[i];
      const b = Bc[i];
      if (r < rmin) rmin = r;
      if (r > rmax) rmax = r;
      if (g < gmin) gmin = g;
      if (g > gmax) gmax = g;
      if (b < bmin) bmin = b;
      if (b > bmax) bmax = b;
    }
    const dr = rmax - rmin;
    const dg = gmax - gmin;
    const db = bmax - bmin;
    if (dr >= dg && dr >= db) return { ch: 0, range: dr };
    if (dg >= db) return { ch: 1, range: dg };
    return { ch: 2, range: db };
  };

  while (boxes.length < k) {
    let bi = -1;
    let bestRange = -1;
    let bestCh = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const wch = widest(boxes[i]);
      if (wch.range > bestRange) {
        bestRange = wch.range;
        bi = i;
        bestCh = wch.ch;
      }
    }
    if (bi < 0) break; // nothing left to split
    const box = boxes[bi];
    const arr = bestCh === 0 ? R : bestCh === 1 ? G : Bc;
    box.sort((a, b) => arr[a] - arr[b]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }

  const palette: [number, number, number][] = boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const i of box) {
      r += R[i];
      g += G[i];
      b += Bc[i];
    }
    const m = box.length || 1;
    return [Math.round(r / m), Math.round(g / m), Math.round(b / m)];
  });

  const labels = new Uint8Array(n);
  for (let bi = 0; bi < boxes.length; bi++) {
    for (const i of boxes[bi]) labels[i] = bi;
  }
  return { palette, labels };
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const h = (v: number) => v.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
