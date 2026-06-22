// Server-side raster processing via sharp (libvips). Two user-facing jobs —
// PIAF/tactile prep and basic edits — plus helpers used by the alt-text pipeline.
// Outputs are written under .precedent/derived/ so originals are never touched.

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { DERIVED_DIR, resolveInArchive, ensureDir } from "./archive.js";

export async function metadata(absPath) {
  const m = await sharp(absPath, { failOn: "none" }).metadata();
  return { width: m.width || null, height: m.height || null, format: m.format || null };
}

// A small, format-normalized PNG for the vision model: auto-oriented, downscaled,
// so any input format (webp/gif/tiff/svg…) works and token cost stays low.
export async function toAltBuffer(absPath) {
  return sharp(absPath, { failOn: "none" })
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
}

// PIAF (swell paper) raises black regions on heating, so the target is bold,
// high-contrast black-on-white with minimal mid-tones.
//   - default: greyscale -> threshold (dark areas become black/raised)
//   - edge:    greyscale -> Laplacian edges -> threshold -> invert (outlines black on white)
// threshold is 0–255 (UI sends a percentage; the server converts).
export async function piafPrep(absPath, { threshold = 128, edge = false } = {}) {
  const t = Math.max(1, Math.min(254, Math.round(threshold)));
  let pipe = sharp(absPath, { failOn: "none" }).rotate().greyscale();

  if (edge) {
    pipe = pipe
      .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
      .threshold(t)
      .negate();
  } else {
    pipe = pipe.threshold(t);
  }

  return pipe.toColourspace("b-w").png({ colours: 2, compressionLevel: 9 }).toBuffer();
}

// Basic edits: crop / rotate / resize / contrast. A full editor is out of scope.
export async function editImage(absPath, { crop, rotate, resize, contrast } = {}) {
  let pipe = sharp(absPath, { failOn: "none" }).rotate(); // auto-orient first

  if (crop && crop.width > 0 && crop.height > 0) {
    pipe = pipe.extract({
      left: Math.max(0, Math.round(crop.left || 0)),
      top: Math.max(0, Math.round(crop.top || 0)),
      width: Math.round(crop.width),
      height: Math.round(crop.height)
    });
  }
  if (rotate) pipe = pipe.rotate(Math.round(rotate), { background: "#ffffff" });
  if (resize && (resize.width || resize.height)) {
    pipe = pipe.resize({
      width: resize.width ? Math.round(resize.width) : null,
      height: resize.height ? Math.round(resize.height) : null,
      fit: "inside"
    });
  }
  if (contrast && Number(contrast) !== 1) {
    const a = Number(contrast);
    pipe = pipe.linear(a, 128 * (1 - a)); // contrast around mid-grey
  }
  return pipe.png().toBuffer();
}

// Write a derived artifact and return its archive-relative path.
export async function writeDerived(entryId, srcAbsPath, suffix, buffer) {
  const stem = basename(srcAbsPath).replace(/\.[^.]+$/, "");
  const rel = `${DERIVED_DIR}/${entryId}/${stem}.${suffix}.png`;
  const abs = resolveInArchive(rel);
  await ensureDir(dirname(abs));
  await writeFile(abs, buffer);
  return rel;
}
