// Binary morphology — square-kernel dilate / erode (O(1)/pixel via the integral
// image of the mask), composed into open / close. One signed "clean up" knob:
//   > 0  → CLOSE (dilate then erode): bridge hairline gaps, join broken strokes,
//          fill pinholes — the classic fix for a faint or dashed scan.
//   < 0  → OPEN  (erode then dilate): drop specks and shave fuzz off edges.

import { boxSum, integral } from "./integral";

export function dilate(bin: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return bin;
  const I = integral(bin, w, h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = y - r < 0 ? 0 : y - r;
    const y1 = y + r >= h ? h - 1 : y + r;
    for (let x = 0; x < w; x++) {
      const x0 = x - r < 0 ? 0 : x - r;
      const x1 = x + r >= w ? w - 1 : x + r;
      out[y * w + x] = boxSum(I, w, x0, y0, x1, y1) > 0 ? 1 : 0; // any neighbour set
    }
  }
  return out;
}

export function erode(bin: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return bin;
  const I = integral(bin, w, h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = y - r < 0 ? 0 : y - r;
    const y1 = y + r >= h ? h - 1 : y + r;
    for (let x = 0; x < w; x++) {
      const x0 = x - r < 0 ? 0 : x - r;
      const x1 = x + r >= w ? w - 1 : x + r;
      const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
      out[y * w + x] = boxSum(I, w, x0, y0, x1, y1) >= cnt ? 1 : 0; // whole window set
    }
  }
  return out;
}

export function morph(bin: Uint8Array, w: number, h: number, signed: number): Uint8Array {
  const r = Math.abs(Math.round(signed));
  if (r === 0) return bin;
  if (signed > 0) return erode(dilate(bin, w, h, r), w, h, r); // close
  return dilate(erode(bin, w, h, r), w, h, r); // open
}
