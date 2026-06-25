"use client";

// Client-side image prep: downscale large images before upload so they stay
// small and comfortably under the vision API's per-image limit. Returns the
// original untouched when it's already modest.

function extFor(type: string, name: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "jpg";
}

export async function prepareImage(
  file: File,
  maxDim = 1568
): Promise<{ blob: Blob; ext: string }> {
  const raster = /^image\/(jpeg|png|webp)$/.test(file.type);
  if (raster && file.size <= 3_500_000) {
    return { blob: file, ext: extFor(file.type, file.name) };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && raster && file.size <= 4_000_000) {
      return { blob: file, ext: extFor(file.type, file.name) };
    }
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, ext: extFor(file.type, file.name) };
    ctx.drawImage(bitmap, 0, 0, w, h);
    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, outType, 0.9)
    );
    if (!blob) return { blob: file, ext: extFor(file.type, file.name) };
    return { blob, ext: outType === "image/png" ? "png" : "jpg" };
  } catch {
    return { blob: file, ext: extFor(file.type, file.name) };
  }
}
