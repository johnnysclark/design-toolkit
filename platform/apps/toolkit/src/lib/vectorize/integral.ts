// Summed-area table (integral image) — shared infrastructure for the box blur
// and the adaptive threshold, both of which need an O(1) average over an
// arbitrary rectangle regardless of window size.

export function integral(src: Uint8Array, w: number, h: number): Float64Array {
  const W = w + 1;
  const I = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    const o = y * w;
    const dst = (y + 1) * W;
    const up = y * W;
    for (let x = 0; x < w; x++) {
      rowSum += src[o + x];
      I[dst + x + 1] = I[up + x + 1] + rowSum;
    }
  }
  return I;
}

// Inclusive-rectangle sum [x0..x1] × [y0..y1] from a summed-area table.
export function boxSum(I: Float64Array, w: number, x0: number, y0: number, x1: number, y1: number): number {
  const W = w + 1;
  return I[(y1 + 1) * W + (x1 + 1)] - I[y0 * W + (x1 + 1)] - I[(y1 + 1) * W + x0] + I[y0 * W + x0];
}
