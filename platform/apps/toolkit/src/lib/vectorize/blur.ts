// Pre-blur — a box blur (O(1)/pixel via the integral image) applied before
// thresholding. Knocks back paper grain, JPEG mosquito noise and antialias
// fringe so the trace doesn't chase every speckle. Works on a single channel or
// a whole RGBA image (each channel composited over white).

import { boxSum, integral } from "./integral";
import type { RGBA } from "./types";

export function blurChannel(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const r = Math.round(radius);
  if (r <= 0) return src;
  const I = integral(src, w, h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = y - r < 0 ? 0 : y - r;
    const y1 = y + r >= h ? h - 1 : y + r;
    for (let x = 0; x < w; x++) {
      const x0 = x - r < 0 ? 0 : x - r;
      const x1 = x + r >= w ? w - 1 : x + r;
      const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
      out[y * w + x] = (boxSum(I, w, x0, y0, x1, y1) / cnt + 0.5) | 0;
    }
  }
  return out;
}

// Blur an RGBA image (for the colour-fill path, where we quantise RGB rather
// than threshold a single channel). Returns a fresh RGBA; alpha is flattened to
// white so transparency reads as page.
export function blurRGBA(img: RGBA, radius: number): RGBA {
  const r = Math.round(radius);
  const { data, width: w, height: h } = img;
  const n = w * h;
  const R = new Uint8Array(n);
  const G = new Uint8Array(n);
  const B = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    const a = data[o + 3] / 255;
    const ib = 1 - a;
    R[i] = data[o] * a + 255 * ib;
    G[i] = data[o + 1] * a + 255 * ib;
    B[i] = data[o + 2] * a + 255 * ib;
  }
  const Rb = r > 0 ? blurChannel(R, w, h, r) : R;
  const Gb = r > 0 ? blurChannel(G, w, h, r) : G;
  const Bb = r > 0 ? blurChannel(B, w, h, r) : B;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    out[o] = Rb[i];
    out[o + 1] = Gb[i];
    out[o + 2] = Bb[i];
    out[o + 3] = 255;
  }
  return { data: out, width: w, height: h };
}
