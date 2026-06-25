// Precedent Archive — local web app server.
//
// Zero build step: `node server.js`, then open http://localhost:3000.
// Serves the static frontend from ./public and a small JSON API over the archive.
//
// The archive folder (ARCHIVE_DIR, default ../sample-archive) is the source of
// truth. This server only ever: reads it, writes entry notes *alongside* images,
// writes net-new files into Inbox/, and writes derived artifacts into
// .precedent/derived/. It never moves, renames, or overwrites your originals.

import { createServer } from "node:http";
import { readFile, writeFile, access } from "node:fs/promises";
import { extname, join, normalize, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ARCHIVE_ROOT, INBOX_DIR, mimeFor, isImage,
  resolveInArchive, toArchiveRel, ensureDir
} from "./lib/archive.js";
import {
  createSidecarEntry, patchNote, setAlt, recordDerived,
  mutateRelation, buildEntry, writeNote
} from "./lib/entries.js";
import { buildIndex, allTags, resolveRelated, searchEntries } from "./lib/index.js";
import { loadConfig, setTypes } from "./lib/config.js";
import { generateAltText, hasApiKey, ALT_MODEL } from "./lib/alt.js";
import { toAltBuffer, piafPrep, editImage, writeDerived, metadata } from "./lib/images.js";
import { fetchUrlMeta, downloadImage } from "./lib/fetchurl.js";

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const MAX_BODY = 30 * 1024 * 1024; // 30 MB — image uploads come through as base64 JSON

if (!hasApiKey()) {
  console.warn(
    "\n⚠  ANTHROPIC_API_KEY is not set. Browse / add / PIAF / edit all work,\n" +
      "   but AI alt text will be disabled until you set a key. e.g.\n" +
      "   ANTHROPIC_API_KEY=sk-ant-… npm start\n"
  );
}

// --- Index cache (rebuilt from disk; never the source of truth) -------------

let INDEX = null;
async function ensureIndex() { return (INDEX ||= await buildIndex()); }
async function rebuild() { INDEX = await buildIndex(); return INDEX; }
const invalidate = () => { INDEX = null; };

// --- Shaping for the wire ---------------------------------------------------

const fileUrl = (archivePath, download) =>
  `/api/file?path=${encodeURIComponent(archivePath)}${download ? "&download=1" : ""}`;

function summary(e) {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    tags: e.tags,
    imageCount: e.images.length,
    altMissing: e.images.filter((i) => !i.alt).length,
    tactileCount: e.images.filter((i) => i.tactilePrepped).length,
    relatedCount: e.related.length,
    primaryImage: e.primary && !e.primary.missing ? fileUrl(e.primary.archivePath) : null,
    primaryAlt: e.primary ? e.primary.alt : "",
    warnings: e.warnings,
    updated: e.updated
  };
}

function detail(index, e) {
  return {
    id: e.id,
    notePath: e.notePath,
    title: e.title,
    type: e.type,
    tags: e.tags,
    sources: e.sources,
    notes: e.bodyText,
    created: e.created,
    updated: e.updated,
    warnings: e.warnings,
    related: resolveRelated(index, e.related),
    images: e.images.map((i) => ({
      path: i.path,
      url: i.missing ? null : fileUrl(i.archivePath),
      alt: i.alt,
      altSource: i.altSource,
      caption: i.caption,
      primary: i.primary,
      tactilePrepped: i.tactilePrepped,
      missing: i.missing,
      derived: i.derived
        ? {
            piaf: i.derived.piaf ? fileUrl(i.derived.piaf, true) : null,
            edits: (i.derived.edits || []).map((p) => fileUrl(p, true))
          }
        : null
    }))
  };
}

// --- Helpers ----------------------------------------------------------------

function noteAbsById(index, id) {
  const rel = index.idToNote[id];
  if (!rel) throw new Error("Entry not found.");
  return resolveInArchive(rel);
}

// Resolve an entry image's note-relative path to an absolute path inside the archive.
function entryImageAbs(noteAbs, imagePath) {
  const abs = resolve(dirname(noteAbs), imagePath);
  const rel = toArchiveRel(abs);
  if (rel.startsWith("..")) throw new Error("Image path escapes the archive.");
  return abs;
}

async function fileExists(p) { try { await access(p); return true; } catch { return false; } }

// Generate alt for one image and persist it (source = ai).
async function generateAndStoreAlt(noteAbs, image, ctx) {
  const imgAbs = entryImageAbs(noteAbs, image.path);
  const buffer = await toAltBuffer(imgAbs);
  const alt = await generateAltText(buffer, { mediaType: "image/png", ...ctx });
  await setAlt(noteAbs, image.path, alt, { source: "ai", model: ALT_MODEL });
  return alt;
}

// --- API handlers -----------------------------------------------------------

async function apiIndex() {
  const index = await ensureIndex();
  return {
    archiveRoot: index.archiveRoot,
    builtAt: index.builtAt,
    types: index.types,
    tags: allTags(index),
    hasApiKey: hasApiKey(),
    counts: { entries: index.entries.length, orphans: index.orphans.length },
    entries: index.entries.map(summary),
    orphans: index.orphans.map((o) => ({ ...o, url: fileUrl(o.path) }))
  };
}

async function apiSearch(query) {
  const index = await ensureIndex();
  const entries = searchEntries(index, {
    q: query.get("q") || "",
    type: query.get("type") || "",
    tag: query.get("tag") || ""
  });
  return { entries: entries.map(summary) };
}

async function apiEntry(query) {
  const index = await ensureIndex();
  const e = index.entries.find((x) => x.id === query.get("id"));
  if (!e) throw httpError(404, "Entry not found.");
  return detail(index, e);
}

async function apiCreate(body) {
  let imageAbs;
  if (body.kind === "existing") {
    imageAbs = resolveInArchive(body.path);
    if (!isImage(imageAbs) || !(await fileExists(imageAbs))) {
      throw httpError(400, "That file is not an image in the archive.");
    }
  } else if (body.kind === "upload") {
    if (!body.dataBase64) throw httpError(400, "No file data.");
    const safe = String(body.filename || "image.png").replace(/^.*[\\/]/, "").replace(/[^\w.\-]+/g, "_");
    const named = /\.[a-z0-9]+$/i.test(safe) ? safe : safe + ".png";
    const rel = `${INBOX_DIR}/${Date.now()}-${named}`;
    imageAbs = resolveInArchive(rel);
    await ensureDir(dirname(imageAbs));
    await writeFile(imageAbs, Buffer.from(body.dataBase64, "base64"));
  } else {
    throw httpError(400, "Unknown add kind.");
  }

  let dims = {};
  try { dims = await metadata(imageAbs); } catch { /* non-fatal */ }

  const { data } = await createSidecarEntry(imageAbs, {
    type: body.type || "precedent",
    title: body.title || "",
    tags: body.tags || [],
    image: { primary: true, width: dims.width || undefined, height: dims.height || undefined }
  });

  await rebuild();
  return { id: data.id };
}

async function apiPatch(query, body) {
  const index = await ensureIndex();
  const noteAbs = noteAbsById(index, query.get("id"));
  await patchNote(noteAbs, body);
  const fresh = await rebuild();
  const e = fresh.entries.find((x) => x.id === query.get("id"));
  return detail(fresh, e);
}

async function apiRelate(body) {
  const index = await ensureIndex();
  const a = noteAbsById(index, body.id);
  const b = noteAbsById(index, body.otherId);
  if (body.id === body.otherId) throw httpError(400, "An entry cannot relate to itself.");
  await mutateRelation(a, body.otherId, body.op === "remove" ? "remove" : "add");
  await mutateRelation(b, body.id, body.op === "remove" ? "remove" : "add"); // both directions
  const fresh = await rebuild();
  const e = fresh.entries.find((x) => x.id === body.id);
  return detail(fresh, e);
}

async function apiAlt(body) {
  if (!hasApiKey()) throw httpError(400, "Set ANTHROPIC_API_KEY to generate alt text.");
  const index = await ensureIndex();
  const e = index.entries.find((x) => x.id === body.id);
  if (!e) throw httpError(404, "Entry not found.");
  const image = e.images.find((i) => i.path === body.path);
  if (!image) throw httpError(404, "Image not found on this entry.");

  // Never overwrite a human edit without explicit confirmation (force).
  if (!body.force && (image.altSource === "human" || image.altSource === "edited")) {
    return { skipped: true, reason: "human-edited", alt: image.alt };
  }
  const noteAbs = noteAbsById(index, body.id);
  const alt = await generateAndStoreAlt(noteAbs, image, { title: e.title, type: e.type, tags: e.tags });
  invalidate();
  return { alt, altSource: "ai" };
}

async function apiAltBulk() {
  if (!hasApiKey()) throw httpError(400, "Set ANTHROPIC_API_KEY to generate alt text.");
  const index = await ensureIndex();
  let generated = 0, skipped = 0, failed = 0;
  for (const e of index.entries) {
    const noteAbs = noteAbsById(index, e.id);
    for (const image of e.images) {
      if (image.missing) { skipped++; continue; }
      if (image.alt && (image.altSource === "human" || image.altSource === "edited")) { skipped++; continue; }
      if (image.alt) { skipped++; continue; } // only fill the truly missing
      try {
        await generateAndStoreAlt(noteAbs, image, { title: e.title, type: e.type, tags: e.tags });
        generated++;
      } catch { failed++; }
    }
  }
  await rebuild();
  return { generated, skipped, failed };
}

async function apiUrl(body) {
  const url = String(body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) throw httpError(400, "Provide an http(s) URL.");

  let meta;
  try { meta = await fetchUrlMeta(url); }
  catch { meta = { title: "", imageUrl: "", canonical: url, description: "" }; }

  const sources = [{ url: meta.canonical || url, label: meta.title || "Source" }];

  // Try to bring the primary image local (additive: it lands in Inbox/).
  if (meta.imageUrl) {
    try {
      const { buffer, ext } = await downloadImage(meta.imageUrl);
      const rel = `${INBOX_DIR}/${Date.now()}-web${ext}`;
      const imageAbs = resolveInArchive(rel);
      await ensureDir(dirname(imageAbs));
      await writeFile(imageAbs, buffer);
      let dims = {};
      try { dims = await metadata(imageAbs); } catch { /* non-fatal */ }
      const { data } = await createSidecarEntry(imageAbs, {
        type: "reference",
        title: meta.title || "",
        notes: meta.description ? `${meta.description}\n` : "",
        sources,
        image: { primary: true, width: dims.width || undefined, height: dims.height || undefined }
      });
      await rebuild();
      return { id: data.id, fetched: true };
    } catch { /* fall through to a note-only stub */ }
  }

  // No reachable image (login wall, no OG tags): honest manual stub, not a failure.
  const rel = `${INBOX_DIR}/${Date.now()}-link.md`;
  const noteAbs = resolveInArchive(rel);
  await ensureDir(dirname(noteAbs));
  const { data, body: stubBody } = buildEntry({
    type: "reference",
    title: meta.title || url,
    sources,
    notes:
      (meta.description ? `${meta.description}\n\n` : "") +
      "_No image could be fetched automatically (login wall or no preview tags). " +
      "Save a screenshot into the archive and attach it to this entry._\n"
  });
  await writeNote(noteAbs, data, stubBody);
  await rebuild();
  return { id: data.id, fetched: false, manual: true };
}

async function apiPiaf(body) {
  const index = await ensureIndex();
  const noteAbs = noteAbsById(index, body.id);
  const e = index.entries.find((x) => x.id === body.id);
  const image = e.images.find((i) => i.path === body.path);
  if (!image) throw httpError(404, "Image not found on this entry.");
  const imgAbs = entryImageAbs(noteAbs, image.path);

  const pct = Math.max(1, Math.min(99, Number(body.threshold) || 50));
  const buffer = await piafPrep(imgAbs, { threshold: Math.round((pct / 100) * 255), edge: !!body.edge });
  const rel = await writeDerived(e.id, imgAbs, body.edge ? "piaf-edge" : "piaf", buffer);
  await recordDerived(noteAbs, image.path, "piaf", rel, { tactilePrepped: true });
  invalidate();
  return { url: fileUrl(rel, true), path: rel };
}

async function apiEdit(body) {
  const index = await ensureIndex();
  const noteAbs = noteAbsById(index, body.id);
  const e = index.entries.find((x) => x.id === body.id);
  const image = e.images.find((i) => i.path === body.path);
  if (!image) throw httpError(404, "Image not found on this entry.");
  const imgAbs = entryImageAbs(noteAbs, image.path);

  const buffer = await editImage(imgAbs, {
    crop: body.crop, rotate: body.rotate, resize: body.resize, contrast: body.contrast
  });
  const rel = await writeDerived(e.id, imgAbs, `edit-${Date.now()}`, buffer);
  await recordDerived(noteAbs, image.path, "edit", rel);
  invalidate();
  return { url: fileUrl(rel, true), path: rel };
}

// --- File serving from the archive (guarded) --------------------------------

async function serveArchiveFile(req, res, query) {
  let abs;
  try { abs = resolveInArchive(query.get("path") || ""); }
  catch { return send(res, 403, "text/plain", "Forbidden"); }
  try {
    const body = await readFile(abs);
    const headers = { "Content-Type": mimeFor(abs), "Cache-Control": "no-store" };
    if (query.get("download")) {
      headers["Content-Disposition"] = `attachment; filename="${basename(abs)}"`;
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    send(res, 404, "text/plain", "Not found");
  }
}

async function serveStatic(req, res, pathname) {
  let urlPath = decodeURIComponent(pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = normalize(join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, "text/plain", "Forbidden");
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeFor(filePath), "Cache-Control": "no-store, must-revalidate" });
    res.end(body);
  } catch {
    send(res, 404, "text/plain", "Not found");
  }
}

// --- Plumbing ---------------------------------------------------------------

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}
function json(res, code, obj) {
  send(res, code, "application/json", JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > MAX_BODY) reject(httpError(413, "Upload too large (30 MB max)."));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Route table: method + pathname -> handler(query, body)
const ROUTES = {
  "GET /api/index": () => apiIndex(),
  "POST /api/rescan": async () => { await rebuild(); return apiIndex(); },
  "GET /api/search": (q) => apiSearch(q),
  "GET /api/entry": (q) => apiEntry(q),
  "POST /api/entry": (q, b) => apiCreate(b),
  "PATCH /api/entry": (q, b) => apiPatch(q, b),
  "POST /api/relate": (q, b) => apiRelate(b),
  "POST /api/alt": (q, b) => apiAlt(b),
  "POST /api/alt/bulk": () => apiAltBulk(),
  "POST /api/url": (q, b) => apiUrl(b),
  "POST /api/image/piaf": (q, b) => apiPiaf(b),
  "POST /api/image/edit": (q, b) => apiEdit(b),
  "GET /api/config": async () => ({ types: (await loadConfig()).types }),
  "POST /api/config/types": async (q, b) => ({ types: await setTypes(b.types) })
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const pathname = url.pathname;

  if (pathname === "/api/file" && req.method === "GET") {
    return serveArchiveFile(req, res, url.searchParams);
  }

  const key = `${req.method} ${pathname}`;
  const handler = ROUTES[key];
  if (handler) {
    try {
      const body = req.method === "GET" ? null : JSON.parse((await readBody(req)) || "{}");
      const result = await handler(url.searchParams, body);
      json(res, 200, result);
    } catch (err) {
      if (!err.status) console.error(err);
      json(res, err.status || 500, { error: err.message || "Internal error" });
    }
    return;
  }

  if (req.method === "GET") return serveStatic(req, res, pathname);
  send(res, 405, "text/plain", "Method not allowed");
});

server.listen(PORT, () => {
  console.log(`\n  Precedent Archive →  http://localhost:${PORT}`);
  console.log(`  Archive folder    →  ${ARCHIVE_ROOT}`);
  console.log(`  AI alt text       →  ${hasApiKey() ? "enabled (" + ALT_MODEL + ")" : "disabled (no API key)"}\n`);
});
