// crit-board — image upload handling (multer disk storage).
//
// Files are renamed to generated random IDs (never the client filename), stored under
// DATA_DIR/uploads/<2-hex-shard>/<id><ext>, and only image MIME types are accepted.
// The on-disk path is recorded RELATIVE to UPLOADS_DIR and is the only thing used to
// build a real path later — client input never touches the filesystem path.
import multer from "multer";
import crypto from "node:crypto";
import { mkdirSync, unlink } from "node:fs";
import { join, sep } from "node:path";
import { UPLOADS_DIR } from "./paths.js";

export const MAX_UPLOAD_MB = Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 25);
export const MAX_FILES = 20;

const EXT_BY_MIME = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "image/gif": ".gif", "image/avif": ".avif",
};
export const MIME_BY_EXT = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const id = crypto.randomBytes(8).toString("hex");
    const shard = id.slice(0, 2);
    const dir = join(UPLOADS_DIR, shard);
    try { mkdirSync(dir, { recursive: true }); } catch (e) { return cb(e); }
    file._id = id;
    cb(null, dir);
  },
  filename(req, file, cb) {
    cb(null, file._id + (EXT_BY_MIME[file.mimetype] || ".bin"));
  },
});

function fileFilter(req, file, cb) {
  cb(null, Boolean(EXT_BY_MIME[file.mimetype])); // silently drop non-images
}

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: MAX_FILES },
}).array("images", MAX_FILES);

// stored_path relative to UPLOADS_DIR, normalized to forward slashes.
export const relPathFromAbs = (absPath) =>
  absPath.slice(UPLOADS_DIR.length + 1).split(sep).join("/");

// Best-effort file removal (used on delete + on aborted uploads).
export function unlinkImageFile(relPath) {
  if (!relPath) return;
  unlink(join(UPLOADS_DIR, relPath), () => {});
}
