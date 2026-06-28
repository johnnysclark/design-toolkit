// Binarisation: RGBA → grayscale → a 1-bit ink mask, plus Otsu auto-threshold
// and a connected-component despeckle. Same integer luma weights as the Drawing
// Cleaner so the two tools "see" ink the same way.

import type { RGBA } from "./types";

// Luma 0..255, compositing over white via alpha so transparent PNGs read as a
// white (background) page rather than black.
export function toGray(img: RGBA): Uint8Array {
  const { data, width, height } = img;
  const n = width * height;
  const g = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    const a = data[o + 3];
    if (a === 255) {
      g[i] = (data[o] * 77 + data[o + 1] * 150 + data[o + 2] * 29) >> 8;
    } else {
      const af = a / 255;
      const ib = 1 - af;
      const r = data[o] * af + 255 * ib;
      const gg = data[o + 1] * af + 255 * ib;
      const b = data[o + 2] * af + 255 * ib;
      g[i] = (r * 77 + gg * 150 + b * 29) >> 8;
    }
  }
  return g;
}

// Otsu's method — the threshold (0..255) that maximises between-class variance.
export function otsu(gray: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      thr = t;
    }
  }
  return thr;
}

// 1 = ink (foreground). By default ink is darker than the threshold; `invert`
// flips that for white-on-black source.
export function binarize(gray: Uint8Array, threshold: number, invert: boolean): Uint8Array {
  const n = gray.length;
  const bin = new Uint8Array(n);
  // Otsu's returned t means class0 = [0..t], so "dark is ink" uses <=; invert is
  // its exact complement (every pixel is ink in exactly one of the two modes).
  if (invert) {
    for (let i = 0; i < n; i++) bin[i] = gray[i] > threshold ? 1 : 0;
  } else {
    for (let i = 0; i < n; i++) bin[i] = gray[i] <= threshold ? 1 : 0;
  }
  return bin;
}

// Remove ink specks: drop 8-connected components with area < minArea, and report
// how many components survive (the "regions" stat). Returns a fresh mask.
export function despeckle(
  bin: Uint8Array,
  w: number,
  h: number,
  minArea: number
): { bin: Uint8Array; regions: number } {
  const n = w * h;
  const out = bin.slice();
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const comp = new Int32Array(n);
  let regions = 0;
  for (let s = 0; s < n; s++) {
    if (out[s] !== 1 || seen[s]) continue;
    let sp = 0;
    let cp = 0;
    stack[sp++] = s;
    seen[s] = 1;
    while (sp > 0) {
      const p = stack[--sp];
      comp[cp++] = p;
      const x = p % w;
      const y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        const row = ny * w;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const q = row + nx;
          if (out[q] === 1 && !seen[q]) {
            seen[q] = 1;
            stack[sp++] = q;
          }
        }
      }
    }
    if (cp < minArea) {
      for (let i = 0; i < cp; i++) out[comp[i]] = 0;
    } else {
      regions++;
    }
  }
  return { bin: out, regions };
}
