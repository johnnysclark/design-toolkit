// Entry notes: read/write markdown + YAML frontmatter (the source of truth).
// A note is "ours" when its frontmatter carries an `id` and a `schemaVersion`;
// plain markdown the user keeps in the same folder is left untouched.

import matter from "gray-matter";
import { readFile, writeFile, access } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, basename } from "node:path";
import { SCHEMA_VERSION, ensureDir } from "./archive.js";

// ISO-8601 UTC, trimmed of milliseconds for clean, diff-friendly frontmatter.
export const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

// Canonical key order so frontmatter stays stable and readable across writes.
const FIELD_ORDER = ["id", "schemaVersion", "created", "updated", "title", "type", "tags", "sources", "related", "images"];
const IMAGE_FIELD_ORDER = ["path", "primary", "alt", "altSource", "altModel", "caption", "tactilePrepped", "derived", "width", "height"];

function ordered(obj, order) {
  const out = {};
  for (const k of order) if (obj[k] !== undefined) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!order.includes(k)) out[k] = obj[k]; // forward-compat
  return out;
}

export const isOurNote = (data) =>
  data && typeof data.id === "string" && data.id.length > 0 && data.schemaVersion !== undefined;

export function sidecarPathFor(imageAbs) {
  return imageAbs + ".md"; // e.g. kitchen.png -> kitchen.png.md, beside the image
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

export async function readNote(absPath) {
  const raw = await readFile(absPath, "utf8");
  const { data, content } = matter(raw);
  return { data, body: content };
}

export async function writeNote(absPath, data, body) {
  const out = ordered({ ...data, updated: nowIso() }, FIELD_ORDER);
  if (Array.isArray(out.images)) {
    out.images = out.images.map((im) => ordered(im, IMAGE_FIELD_ORDER));
  }
  await ensureDir(dirname(absPath));
  await writeFile(absPath, matter.stringify(body || "", out));
  return { data: out, body: body || "" };
}

export function newImageRef({ path, primary = false, alt, altSource, altModel, caption, width, height }) {
  const img = { path, primary, tactilePrepped: false };
  if (alt) {
    img.alt = alt;
    img.altSource = altSource || "human";
    if (altModel) img.altModel = altModel;
  } else {
    img.altSource = "empty";
  }
  if (caption) img.caption = caption;
  if (width) img.width = width;
  if (height) img.height = height;
  return img;
}

// Build a fresh entry object. The four mandatory fields are always present;
// everything else is included only when supplied (a single image is enough).
export function buildEntry({ title, type, tags, images, sources, related, notes }) {
  const ts = nowIso();
  const data = {
    id: randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    created: ts,
    updated: ts
  };
  if (title) data.title = title;
  if (type) data.type = type;
  if (tags && tags.length) data.tags = tags;
  if (sources && sources.length) data.sources = sources;
  if (related && related.length) data.related = related;
  if (images && images.length) data.images = images.map((im) => newImageRef(im));
  return { data, body: notes || "" };
}

// Create a sidecar note next to an image already on disk. Refuses to clobber
// an existing note (additive principle).
export async function createSidecarEntry(imageAbs, opts = {}) {
  const notePath = sidecarPathFor(imageAbs);
  if (await exists(notePath)) {
    const { data } = await readNote(notePath);
    if (isOurNote(data)) return { notePath, data, body: "", existed: true };
  }
  const image = { path: basename(imageAbs), primary: true, ...opts.image };
  const { data, body } = buildEntry({
    title: opts.title,
    type: opts.type,
    tags: opts.tags,
    sources: opts.sources,
    notes: opts.notes,
    images: [image]
  });
  const written = await writeNote(notePath, data, body);
  return { notePath, data: written.data, body: written.body, existed: false };
}

// Apply an allowed-field patch to an entry note on disk.
export async function patchNote(absPath, patch) {
  const { data, body } = await readNote(absPath);
  const next = { ...data };
  let nextBody = body;

  if (patch.title !== undefined) next.title = patch.title || undefined;
  if (patch.type !== undefined) next.type = patch.type || undefined;
  if (patch.tags !== undefined) {
    next.tags = (patch.tags || []).map((t) => String(t).trim()).filter(Boolean);
    if (!next.tags.length) delete next.tags;
  }
  if (patch.sources !== undefined) {
    next.sources = (patch.sources || [])
      .map((s) => ({ url: String(s.url || "").trim(), label: String(s.label || "").trim() }))
      .filter((s) => s.url);
    if (!next.sources.length) delete next.sources;
  }
  if (patch.notes !== undefined) nextBody = patch.notes;

  // Per-image updates, keyed by the image's relative path.
  if (Array.isArray(patch.images) && Array.isArray(next.images)) {
    for (const upd of patch.images) {
      const img = next.images.find((i) => i.path === upd.path);
      if (!img) continue;
      if (upd.caption !== undefined) {
        img.caption = upd.caption || undefined;
        if (!img.caption) delete img.caption;
      }
      if (upd.primary === true) next.images.forEach((i) => { i.primary = i.path === upd.path; });
      if (upd.alt !== undefined) {
        // A human edit through the UI is durable provenance: never silently re-generated.
        // Changing an AI draft -> "edited"; typing into an empty field -> "human". Both protected.
        const wasAi = img.altSource === "ai";
        img.alt = upd.alt;
        img.altSource = img.alt ? (wasAi ? "edited" : "human") : "empty";
        delete img.altModel;
      }
    }
  }

  return writeNote(absPath, next, nextBody);
}

// Set/replace one image's alt text, recording provenance.
export async function setAlt(absPath, imagePath, alt, { source = "ai", model } = {}) {
  const { data, body } = await readNote(absPath);
  const img = (data.images || []).find((i) => i.path === imagePath);
  if (!img) throw new Error("Image not found on this entry.");
  img.alt = alt;
  img.altSource = source;
  if (source === "ai" && model) img.altModel = model; else delete img.altModel;
  return writeNote(absPath, data, body);
}

// Record a derived artifact (PIAF / edit) on an image, optionally flag tactile.
export async function recordDerived(absPath, imagePath, kind, derivedRel, { tactilePrepped } = {}) {
  const { data, body } = await readNote(absPath);
  const img = (data.images || []).find((i) => i.path === imagePath);
  if (!img) throw new Error("Image not found on this entry.");
  img.derived = img.derived || {};
  if (kind === "edit") {
    img.derived.edits = [...(img.derived.edits || []), derivedRel];
  } else {
    img.derived[kind] = derivedRel;
  }
  if (tactilePrepped) img.tactilePrepped = true;
  return writeNote(absPath, data, body);
}

// Add or remove a relation id on a single note (the server applies both directions).
export async function mutateRelation(absPath, otherId, op) {
  const { data, body } = await readNote(absPath);
  const set = new Set(data.related || []);
  if (op === "remove") set.delete(otherId); else set.add(otherId);
  data.related = [...set];
  if (!data.related.length) delete data.related;
  return writeNote(absPath, data, body);
}

export async function appendImage(absPath, image) {
  const { data, body } = await readNote(absPath);
  data.images = data.images || [];
  if (!data.images.some((i) => i.path === image.path)) {
    data.images.push(newImageRef(image));
  }
  return writeNote(absPath, data, body);
}
