// Archive roots, paths, and the one non-negotiable invariant: every path the app
// touches must resolve *inside* the archive folder. The archive is the source of
// truth; this module is how the rest of the code stays additive and contained.

import { resolve, relative, isAbsolute, sep, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

export const SCHEMA_VERSION = 1;

// App-managed locations *inside* the archive. `.precedent/` holds disposable,
// inspectable machine data; Inbox/ is where net-new (pasted/fetched) files land
// so we never have to relocate anything the user already organized.
export const PRECEDENT_DIR = ".precedent";
export const INBOX_DIR = "Inbox";
export const CONFIG_FILE = `${PRECEDENT_DIR}/config.json`;
export const INDEX_FILE = `${PRECEDENT_DIR}/index.json`;
export const DERIVED_DIR = `${PRECEDENT_DIR}/derived`;

// Default to the bundled sample archive (a sibling of web/), so `npm start` just runs.
const DEFAULT_ARCHIVE = fileURLToPath(new URL("../../sample-archive", import.meta.url));

export const ARCHIVE_ROOT = resolve(
  process.env.ARCHIVE_DIR && process.env.ARCHIVE_DIR.trim()
    ? process.env.ARCHIVE_DIR.trim()
    : DEFAULT_ARCHIVE
);

const IMAGE_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".heic", ".heif", ".avif", ".tif", ".tiff", ".bmp", ".svg"
]);

export const isImage = (name) => IMAGE_EXT.has(extname(name).toLowerCase());

const MIME = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".heic": "image/heic",
  ".heif": "image/heif", ".avif": "image/avif", ".tif": "image/tiff",
  ".tiff": "image/tiff", ".bmp": "image/bmp", ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

export const mimeFor = (p) => MIME[extname(p).toLowerCase()] || "application/octet-stream";

// Archive-relative paths are stored POSIX-style so they survive moving between
// machines/OSes (the archive may live in iCloud/Dropbox/git).
const toPosix = (p) => p.split(sep).join("/");
const fromPosix = (p) => p.split("/").join(sep);

export const toArchiveRel = (abs) => toPosix(relative(ARCHIVE_ROOT, abs));

// Resolve an archive-relative path to absolute, refusing anything that escapes root.
export function resolveInArchive(relPath) {
  const abs = resolve(ARCHIVE_ROOT, fromPosix(String(relPath || "")));
  const rel = relative(ARCHIVE_ROOT, abs);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path escapes the archive: ${relPath}`);
  }
  return abs;
}

export async function ensureDir(absDir) {
  await mkdir(absDir, { recursive: true });
}

export { dirname };
