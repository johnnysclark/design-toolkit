// The index: a disposable, rebuildable cache derived entirely by scanning the
// archive. Never the source of truth. It discovers our entry notes and every
// image, resolves note-relative image paths to archive-relative ones, flags
// missing images / dangling relations, and lists orphan images (no entry yet).

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import {
  ARCHIVE_ROOT, PRECEDENT_DIR, INDEX_FILE, SCHEMA_VERSION,
  isImage, toArchiveRel, resolveInArchive, ensureDir
} from "./archive.js";
import { readNote, isOurNote } from "./entries.js";
import { loadConfig } from "./config.js";

const SKIP_DIRS = new Set([".git", "node_modules", PRECEDENT_DIR]);

async function* walk(absDir) {
  let items;
  try { items = await readdir(absDir, { withFileTypes: true }); }
  catch { return; }
  for (const it of items) {
    const abs = join(absDir, it.name);
    if (it.isDirectory()) {
      if (SKIP_DIRS.has(it.name) || it.name.startsWith(".")) continue;
      yield* walk(abs);
    } else if (it.isFile()) {
      yield abs;
    }
  }
}

export async function buildIndex() {
  const config = await loadConfig();
  const noteFiles = [];
  const imageFiles = [];

  for await (const abs of walk(ARCHIVE_ROOT)) {
    if (abs.toLowerCase().endsWith(".md")) noteFiles.push(abs);
    else if (isImage(abs)) imageFiles.push(abs);
  }

  const existing = new Set(imageFiles.map(toArchiveRel));
  const referenced = new Set();
  const idToNote = {};
  const entries = [];

  for (const noteAbs of noteFiles) {
    let note;
    try { note = await readNote(noteAbs); } catch { continue; }
    if (!isOurNote(note.data)) continue;

    const noteRel = toArchiveRel(noteAbs);
    const noteDir = dirname(noteAbs);
    const warnings = [];

    const images = (note.data.images || []).map((im) => {
      const archivePath = toArchiveRel(resolve(noteDir, im.path));
      referenced.add(archivePath);
      const missing = !existing.has(archivePath);
      if (missing) warnings.push(`Missing image: ${im.path}`);
      return {
        path: im.path,
        archivePath,
        primary: !!im.primary,
        alt: im.alt || "",
        altSource: im.altSource || (im.alt ? "human" : "empty"),
        caption: im.caption || "",
        tactilePrepped: !!im.tactilePrepped,
        derived: im.derived || null,
        missing
      };
    });

    const primary = images.find((i) => i.primary) || images[0] || null;
    idToNote[note.data.id] = noteRel;

    entries.push({
      id: note.data.id,
      notePath: noteRel,
      title: note.data.title || "",
      type: note.data.type || "",
      tags: Array.isArray(note.data.tags) ? note.data.tags : [],
      sources: Array.isArray(note.data.sources) ? note.data.sources : [],
      related: Array.isArray(note.data.related) ? note.data.related : [],
      created: note.data.created || "",
      updated: note.data.updated || "",
      images,
      primary,
      bodyText: note.body || "",
      warnings
    });
  }

  // Second pass: flag relations that point at ids we never found.
  for (const e of entries) {
    for (const rid of e.related) {
      if (!idToNote[rid]) e.warnings.push(`Dangling relation: ${rid}`);
    }
  }

  // Orphans = images on disk not referenced by any entry (the migration backlog).
  const orphans = [];
  for (const abs of imageFiles) {
    const rel = toArchiveRel(abs);
    if (referenced.has(rel)) continue;
    let size = 0, mtime = "";
    try { const s = await stat(abs); size = s.size; mtime = s.mtime.toISOString(); } catch { /* ignore */ }
    orphans.push({ path: rel, size, mtime });
  }
  orphans.sort((a, b) => (a.path < b.path ? -1 : 1));

  const index = {
    schemaVersion: SCHEMA_VERSION,
    archiveRoot: ARCHIVE_ROOT,
    builtAt: new Date().toISOString(),
    types: config.types,
    entries,
    orphans,
    idToNote
  };

  // Persist the cache for warm starts. Safe to delete; rebuilt from disk.
  try {
    await ensureDir(resolveInArchive(PRECEDENT_DIR));
    await writeFile(resolveInArchive(INDEX_FILE), JSON.stringify(index));
  } catch { /* cache write is best-effort */ }

  return index;
}

// All tags present, for building filter controls.
export function allTags(index) {
  const set = new Set();
  for (const e of index.entries) for (const t of e.tags) set.add(t);
  return [...set].sort();
}

// Resolve related ids to lightweight {id, title} for display.
export function resolveRelated(index, ids) {
  return (ids || []).map((id) => {
    const e = index.entries.find((x) => x.id === id);
    return { id, title: e ? (e.title || "(untitled)") : null, missing: !e };
  });
}

// Filter + full-text search over the in-memory index. Returns entry summaries.
export function searchEntries(index, { q = "", type = "", tag = "" } = {}) {
  const needle = q.trim().toLowerCase();
  return index.entries.filter((e) => {
    if (type && e.type !== type) return false;
    if (tag && !e.tags.includes(tag)) return false;
    if (!needle) return true;
    const hay = [
      e.title, e.type, e.tags.join(" "), e.bodyText,
      e.images.map((i) => `${i.alt} ${i.caption}`).join(" ")
    ].join(" ").toLowerCase();
    return hay.includes(needle);
  });
}
