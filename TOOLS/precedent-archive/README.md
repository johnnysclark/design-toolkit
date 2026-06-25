# Precedent Archive

**A non-destructive lens over your own folder of architectural precedents.** Point it
at a directory of images, screenshots, and notes; it builds a rebuildable index and lets
you enrich each item — AI alt text, tactile (PIAF) prep, basic edits, sources, tags, and
relations — while **writing metadata _alongside_ your files and never moving, renaming,
or overwriting your originals.** The filesystem is the source of truth; this app is
additive. Because truth is markdown + image files on disk, the archive *is* the export,
and you can point Obsidian at the same folder for graph/links/search.

**Status:** 🟡 v1 built. Distinct from [`precedent-librarian`](../precedent-librarian)
(which generates research dossiers) — this one is a personal database over files you keep.

---

## What it does (v1)
- **Index + browse** — scans the archive into a disposable index; gallery/list views,
  filter by type/tag, full-text search (title, tags, notes, alt text). Entry detail shows
  images with a visible **alt-text toggle**, sources, notes, tags, and related entries as
  links. Adding a relation updates **both** entries.
- **Un-cataloged images are first-class** — loose images with no note yet are surfaced
  with one-click "Create entry," so a pile of random screenshots is useful on day one.
- **Local add** — drag-and-drop, paste from the clipboard, or adopt an image already in
  the archive. Each becomes a complete, valid entry immediately.
- **Internet add** — paste a URL; the backend pulls Open Graph / oEmbed metadata + the
  primary image and stores the canonical URL as a source. Login-walled sites (e.g.
  Instagram) fall back to an honest manual-screenshot stub.
- **AI alt text** — one pluggable call to the Anthropic Messages API
  (`claude-sonnet-4-6`), tuned for architectural precedents (spatial organization,
  materials, composition; written to be read aloud). Always editable; a human edit is
  **never silently regenerated**. Includes a bulk "generate all missing" action.
- **Prep for PIAF (tactile / swell paper)** — server-side `grayscale → threshold → 1-bit
  PNG`, with an optional edge-detect mode. Download the result; the entry is flagged
  tactile-prepped.
- **Edit image** — basic crop / rotate / resize / contrast, downloadable. (A full editor
  is out of scope.)

Built **screen-reader-first**: semantic landmarks, labeled keyboard-reachable controls,
visible focus, stored alt text actually present in the DOM, and status conveyed by text +
icon — never color alone.

## How it stores things (additive, inspectable)
- **One entry = one markdown note** with YAML frontmatter that references its image(s) by
  relative path. A single dropped image gets a sidecar note next to it
  (`kitchen.png.md`); a project is a folder with an `index.md` referencing several images.
- **Stable `id` (uuid) is the durable link.** Relations are stored as lists of ids; the
  index resolves ids → current paths, so reorganizing your folder never breaks a relation.
- **`.precedent/`** at the archive root holds app data: `config.json` (the editable
  `type` vocabulary, travels with the archive), a disposable `index.json` cache, and
  `derived/` (PIAF/edit outputs, kept away from your originals).
- **`Inbox/`** is where net-new pasted/fetched files land — nothing you already organized
  is ever relocated.

See the frontmatter schema and full design rationale in the planning doc that produced
this tool.

## Run it
```bash
cd TOOLS/precedent-archive/web
npm install
npm run seed                 # generate the bundled sample images (first run only)
cp .env.example .env         # add ANTHROPIC_API_KEY (only needed for alt text)

# Use the bundled sample archive:
npm start
# …or point at your own folder (never reorganized, only enriched):
ARCHIVE_DIR=/path/to/your/precedents npm start

# open http://localhost:3000  ·  "Rescan" rebuilds the index from disk anytime
```
Everything except AI alt text works without an API key.

## Stack
Node ≥18, a zero-framework `node:http` server, and a vanilla-JS frontend — matching the
other tools in this repo. Dependencies: `@anthropic-ai/sdk` (alt text), `sharp` (image
processing), `gray-matter` (frontmatter). No build step.

## Deferred (hooks, not v1)
Model/MCP-backed vectorization for PIAF (e.g. Adobe `image_vectorize` / potrace); a full
image editor; dedupe-by-image-hash on import; a custom graph view (use Obsidian);
hosting / publishing / multi-user; Tauri/Electron packaging; a SQLite index at scale;
`fs.watch` live re-indexing.
