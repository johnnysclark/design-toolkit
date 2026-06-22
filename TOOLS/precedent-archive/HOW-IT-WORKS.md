# How the Precedent Archive works

A plain-language tour of what this tool is, what happens on disk when you use it, and how
the pieces fit together. If the [README](README.md) is the *spec*, this is the *mental
model*.

---

## 1. The one idea

**Your folder is the database. The app is a lens over it.**

There is no hidden store, no import step, no proprietary file. Everything the tool knows
lives as **plain files you can open yourself**:

- your **images** (untouched, exactly where you put them), and
- small **markdown notes** with a YAML header (the metadata) sitting *next to* them.

The app only ever **reads** your folder and **adds** alongside it. It never moves,
renames, or overwrites your originals. If you deleted the app tomorrow, your archive — and
all the work you put into it — would still be sitting there as readable files. That is the
whole design.

```
            ┌─────────────────────────────────────────────┐
            │   YOUR ARCHIVE FOLDER  (the source of truth) │
            │                                              │
   reads →  │   courtyard-house.png        (your image)    │
   writes   │   courtyard-house.png.md     (its note)      │ ← app writes notes
   beside → │   library-project/                           │   *beside* your files
            │       index.md  plan.png  interior.png       │
            └─────────────────────────────────────────────┘
                         ▲                     │
                         │ scan                │ serve / enrich
                         │                     ▼
            ┌─────────────────────────────────────────────┐
            │   THE APP  (localhost web server + browser)  │
            │   • builds a throwaway index from the folder │
            │   • shows gallery / search / entry detail    │
            │   • runs alt text, PIAF prep, image edits    │
            └─────────────────────────────────────────────┘
```

---

## 2. What an *entry* is

An **entry** is one markdown note. Its YAML "frontmatter" (the part between the `---`
lines) holds the metadata; the text below is your free-form notes. Here is a real one,
annotated:

```yaml
---
id: 11111111-1111-4111-8111-111111111111   # ← permanent, unique. THIS is the durable link.
schemaVersion: 1                            #   (lets the format evolve safely later)
created: 2026-06-20T10:00:00Z               #   four fields are mandatory:
updated: 2026-06-20T10:00:00Z               #   id · schemaVersion · created · updated
title: Courtyard house — nine-square plan   # ← everything below here is optional
type: precedent                             #   one value from an editable list
tags: [courtyard, plan, daylight]
sources:
  - { url: https://…, label: Overview }     # ← where it came from
related:
  - 33333333-3333-4333-8333-333333333333    # ← links to OTHER entries, by their id
images:
  - path: courtyard-house.png               # ← the image, relative to this note
    primary: true                           #   the one used as the thumbnail
    alt: Site plan of a square courtyard…    #   screen-reader description
    altSource: human                        #   who wrote it: ai · edited · human · empty
    caption: Nine-square parti               #   visible caption (different from alt)
    tactilePrepped: false                    #   has a PIAF version been made?
---
A clear demonstration of the nine-square parti…   ← your notes (the markdown body)
```

Two things worth internalizing:

- **The `id` is the link, not the path.** Relations between entries are stored as lists of
  `id`s. So you can rename `courtyard-house.png` to `kahn-court.png`, or drag a whole
  folder somewhere else, and the relationships still hold — the app re-finds everything by
  `id` the next time it scans.
- **Only four fields are required.** A single dropped image becomes a complete, valid entry
  with almost nothing filled in. You enrich it later, at your own pace.

---

## 3. Where things land on disk

| When you… | The app writes… | Where |
|---|---|---|
| drop / adopt a single image | a sidecar note `image.png.md` | **right next to the image** |
| build a multi-image project | one `index.md` referencing several images | **a folder** holding them |
| paste from clipboard / add a URL | the new image file (your originals are never moved) | `Inbox/` at the archive root |
| run **PIAF prep** or **edit image** | the generated PNG | `.precedent/derived/…` |
| (automatically) | the editable list of `type`s + a cache | `.precedent/config.json`, `.precedent/index.json` |

`.precedent/` is the app's private corner of your archive. `config.json` (your type
vocabulary) is meant to last; `index.json` and `derived/` are **disposable** — delete them
anytime and they rebuild. Your originals and notes live *outside* `.precedent/`, in the
open, where Obsidian or Finder can see them.

---

## 4. The index: a cache you can always throw away

When the server starts (or you click **Rescan**) it walks the folder and builds an
**index** — an in-memory map of every entry and every loose image. The index is what powers
the gallery, the filters, the search box, and the id→file lookups.

The index is **derived, never authoritative.** It is rebuilt entirely from your files. This
is why the tool survives being edited on two machines, synced over Dropbox/iCloud, or
reorganized by hand: there is nothing to keep in sync except the files themselves.

The scan also notices **images that have no note yet** and lists them as **un-cataloged**.
That is the migration on-ramp: point the tool at a pile of old screenshots and start
turning them into entries one click at a time.

```
  files on disk  ──scan──▶  index (RAM + .precedent/index.json)  ──▶  what you see
       ▲                                                                  │
       └──────────────── every action writes a file, then re-scans ◀──────┘
```

---

## 5. What happens, step by step, for each action

- **Add an image.** The browser sends the file to the server → the server writes it (or
  uses the one already there) → writes a sidecar note with a fresh `id` → re-scans → if a
  key is set, it asks the AI for alt text and saves that into the note.
- **AI alt text.** The server hands the image to Claude (`claude-sonnet-4-6`) with a prompt
  tuned for architecture — describe spatial organization, materials, light; written to be
  read aloud; never "an image of." The result is saved as `alt` with `altSource: ai`.
  **If you've edited an alt by hand, regenerating it asks first** — your words are never
  silently overwritten. There's also a bulk "generate all missing" for migration.
- **Prep for PIAF (tactile / swell paper).** Swell paper raises *black* regions under heat,
  so the server reduces the image to bold black-on-white: greyscale → threshold → 1-bit
  PNG (with an optional edge-detect mode for outlines). You download the PNG to print; the
  entry is flagged `tactilePrepped`.
- **Edit image.** Basic crop / rotate / resize / contrast, server-side, downloadable. (Not
  a full editor — just the common touch-ups.)
- **Relate two entries.** Adding a relation writes each entry's `id` into the *other's*
  `related` list, so the link is real in both directions, on disk.

Every one of these ends by re-scanning, so the screen always reflects the files.

---

## 6. Why there are *two* "precedent" tools

This repo has two tools with similar names but opposite jobs:

| | `precedent-librarian` | `precedent-archive` (this one) |
|---|---|---|
| Input | a research *prompt* | your *folder* of files |
| Output | a generated dossier to interrogate | an organized, enriched library |
| State | none (stateless) | your archive on disk |
| Question it answers | "what might exist, and is it real?" | "what have *I* collected, and how is it connected?" |

The librarian helps you *not trust* a machine's research; the archive helps you *keep* your
own.

---

## 7. Obsidian, if you want it

Because entries are just markdown, you can open the same folder as an
[Obsidian](https://obsidian.md) vault. Obsidian gives you graph view, backlinks, and its
own search "for free"; this app handles the things Obsidian can't — image intake, alt text,
PIAF prep, and the image edits. Use whichever frontend fits the moment. (The app does *not*
try to rebuild a graph view — that's Obsidian's job.)

---

## 8. Accessibility is built in, not bolted on

This tool is built by and for non-visual design research, so the interface itself is a
reference example: semantic headings and landmarks, every control reachable and labeled by
keyboard, visible focus outlines, the **stored alt text actually present in the page** (the
"Show alt text" toggle reveals the exact saved string), and status shown with words +
icons, never color alone.

---

## 9. Running it (and fixing the obvious things)

```bash
cd TOOLS/precedent-archive/web
npm install
npm run seed                 # first run only: makes the sample images
cp .env.example .env         # add ANTHROPIC_API_KEY for alt text (optional)
npm start                    # → http://localhost:3000
ARCHIVE_DIR=/path/to/folder npm start    # …or point at your own archive
```

- **"AI alt text off"** in the header → no API key. Set `ANTHROPIC_API_KEY` in `.env`.
  Everything else still works.
- **A thumbnail says "no image" / a ⚠ warning** → a note points at an image that isn't
  there (often a manual rename). Fix the `path:` in the note, or move the image back.
- **Something looks stale** → click **Rescan**, or delete `.precedent/index.json`. The
  index always rebuilds from your files.

---

## 10. Where it's meant to grow

Deliberately left as hooks for later, not built in v1: model/MCP-backed *vectorization* for
crisper PIAF output, a full image editor, duplicate-image detection on import, a custom
graph view (use Obsidian), any hosting/multi-user/publishing, a packaged desktop app, and a
database-backed index if an archive ever gets huge. The architecture leaves room for each
without changing what's already on disk.
