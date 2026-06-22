# Precedent Archive — user guide

A hands-on, click-by-click walkthrough of the interface, using the bundled sample archive.
For the *why* and *what-happens-on-disk* picture, read [HOW-IT-WORKS.md](HOW-IT-WORKS.md);
this doc is the *how-do-I* picture.

---

## Start here (5 minutes)

```bash
cd TOOLS/precedent-archive/web
npm install
npm run seed                 # first run only — creates the sample images
cp .env.example .env         # add ANTHROPIC_API_KEY to enable alt text (optional)
npm start                    # → open http://localhost:3000
```

You'll land on a page with three sample entries, one un-cataloged image, and a header line
telling you which folder you're looking at and whether AI alt text is on. To use your own
archive instead of the sample, stop the server and start it with:

```bash
ARCHIVE_DIR=/path/to/your/precedents npm start
```

Your files are never moved or modified — the app only reads them and writes notes alongside.

---

## The screen, at a glance

| Region | What it's for |
|---|---|
| **Add to the archive** (top) | Drop/paste images, or fetch a page by URL. |
| **Filter bar** | Search box, Type and Tag dropdowns, Gallery/List toggle, **Rescan**, **Generate all missing alt text**. |
| **Un-cataloged images** | Images on disk with no entry yet — each has a **Create entry** button. (Hidden when there are none.) |
| **Entries** | Your library. Click any card to open its detail view. |
| **Entry detail** | Opens in place; edit metadata, work on each image, manage relations, then **← Back to all entries**. |

---

## Walkthroughs (with the sample archive)

### A. Browse, search, filter
1. Toggle **Gallery / List** to change layout.
2. Type `courtyard` in **Search** — it matches titles, tags, notes, *and* alt text, so both
   the courtyard plan and the library project (whose notes mention it) appear.
3. Pick a **Type** (e.g. `project`) or **Tag** to narrow the list. Clear them to see all.

### B. Read an image's stored alt text
1. Open **Courtyard house — nine-square plan**.
2. Under its image, click **Show alt text**. The exact saved description is revealed (it's
   also already on the image for screen readers). The label flips to **Hide alt text**.

### C. Fill in missing alt text
The **Three-storey section study** ships with no alt text on purpose.
- **One image:** open it, type a description into the **Alt text** box, click **Save alt**
  (it's now marked *human* and protected). *Or*, with an API key set, click **Regenerate
  alt** to have Claude draft one.
- **Everything at once:** from the main screen click **Generate all missing alt text**. It
  fills only the blanks and **skips anything a human has edited** — your words are safe. A
  status line reports how many were generated/skipped.

### D. Adopt an un-cataloged image
1. In **Un-cataloged images**, find `facade-grid.png` and click **Create entry**.
2. A note is created next to the image and its detail opens. With a key set, alt text is
   drafted automatically. Give it a title/type/tags and **Save entry**.

### E. Add your own images
- **Drag & drop** files onto the **Drop images here** zone (or click **choose files**).
- **Paste** an image from your clipboard anywhere on the page.
- Each new file lands in `Inbox/`, becomes an entry immediately, and (with a key) gets alt
  text. A single add opens straight into its detail so you can enrich it.
- **From a URL:** paste a link into **Add from a URL** and click **Fetch**. It pulls the
  page's preview image + title. Login-walled pages (e.g. Instagram) instead create an
  honest stub note telling you to drop in a screenshot — not an error.

### F. Prep an image for PIAF (tactile / swell paper)
1. In an entry, expand **Prep for PIAF (tactile / swell paper)**.
2. Slide **Threshold** (how much becomes black) and optionally tick **Edge-detect** for
   outlines instead of filled darks.
3. Click **Generate**, then **Download 1-bit PNG** to print on swell paper. The entry is
   flagged *tactile-prepped*. Your original is untouched — the result lives in
   `.precedent/derived/`.

### G. Make a basic edit
Expand **Edit image (crop · rotate · resize · contrast)**, set any of rotate / resize width
/ contrast / crop, click **Generate**, then **Download edited PNG**. (This is for quick
touch-ups, not a full editor.)

### H. Link two entries
1. Open an entry and scroll to **Related entries**.
2. Choose another entry from the dropdown and click **Add relation**. The link is written
   into *both* entries — open the other one and you'll see it there too. Click the **✕**
   next to a relation to remove it (also both ways).

### I. Edit metadata
In detail, edit **Title**, **Type** (from your list), **Tags** (comma-separated),
**Sources** (URL + label; **Add source** for more), and **Notes**, then **Save entry**.
To grow the type list, edit `.precedent/config.json` in your archive (it travels with the
folder).

---

## Two everyday workflows

**Migrate a pile of screenshots.** Point the tool at the folder → every loose image shows
under **Un-cataloged images** → **Create entry** on each (or just run **Generate all missing
alt text** once the entries exist) → tag and relate over time. Nothing is moved; you're
labeling in place.

**Document a project.** Put the project's images in their own folder, **Create entry** /
add them, set one as primary, fill notes + sources, and relate it to the precedents that
informed it.

---

## Keyboard & screen-reader use
Everything is operable without a mouse: **Tab** to the drop zone and press **Enter/Space**
to pick files; all fields and buttons are labeled; focus is always visible; **Esc** closes
an open entry. Status messages announce politely; warnings (missing image, dangling link)
are spoken as text, never signaled by color alone. The "Show alt text" toggle exposes the
real saved description, and every image carries its alt in the page.

---

## Where your data is (quick map)
- **Your images** — wherever you put them, untouched.
- **`name.png.md`** beside an image, or **`index.md`** in a project folder — the entry notes.
- **`Inbox/`** — net-new pasted/fetched files.
- **`.precedent/`** — app data: `config.json` (your type list), `index.json` (disposable
  cache), `derived/` (PIAF + edit outputs).

Delete `.precedent/index.json` or click **Rescan** anytime — the index always rebuilds from
your files.

---

## FAQ / troubleshooting
- **"AI alt text off" in the header.** No API key — add `ANTHROPIC_API_KEY` to `.env`.
  Everything else still works without it.
- **A card says "no image" or shows a ⚠ warning.** A note points at an image that isn't
  there (usually a manual rename). Fix the `path:` in the note, or move the image back, then
  **Rescan**.
- **I reorganized my folder and nothing broke — why?** Relations are stored by permanent
  `id`, not by path, so moving files around is safe. Just **Rescan**.
- **Can I use Obsidian on the same folder?** Yes — the notes are plain markdown. Obsidian
  gives you graph/backlinks/search; this app handles intake, alt text, and the image work.
