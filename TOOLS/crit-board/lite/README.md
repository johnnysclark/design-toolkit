# Crit Board — lite demo (zero setup)

A single self-contained HTML file that demonstrates the **entire** crit-board experience with
**no install, no server, no build**. Open it and click around.

```bash
open "TOOLS/crit-board/lite/index.html"        # macOS
# or just double-click the file, or drag it onto any browser tab
```

It can also be dropped on any static host (GitHub Pages, Netlify drop, a USB stick) — it's one file.

## What you can do
- **Browse the grid** — students (rows, grouped under **TA section** headers) × weeks (columns), with a
  sticky header row and first column. The sample board has **3 TAs × 12 students = 36 students and 6 weeks**.
- **Two boxes per cell** — a **work** box (thumbnails) on top and a **comments** box (counts + the latest
  comment) below; click either to open that side.
- **Open a cell** → see the image gallery, a drag-and-drop **upload** zone (with per-image captions),
  and the **threaded comment** discussions.
- **Lightbox** — click any image to enlarge; arrow keys / on-screen arrows / swipe to move; `Esc` closes.
- **Post feedback** — start a new thread, reply to existing ones (author + relative timestamp shown).
- **Switch identity** — use the top bar to act as any student, or flip to **Instructor (TA)** to unlock
  the **Admin** panel (rename the studio; add/rename/remove/reorder students and weeks; bulk-paste a
  roster) and **moderation** (delete any image or comment).
- **Manage your own work** — reorder or delete images in your own row.
- **Dark mode** toggle; responsive layout that works on a phone (including camera capture on upload).

## What it is *not*
This demo runs **entirely in your browser**. State is saved to **`localStorage`**, so:

- It is **single-user and single-browser** — nothing is shared; another person (or another device)
  sees their own copy, not yours.
- Uploaded images are downscaled and stored in `localStorage` (a few MB budget). It's for *showing the
  experience*, not for real studio use.
- There are **no real passcodes / accounts** — the role toggle is just a demo switch.

Use **"Reset demo"** (top bar) to restore the original sample board at any time.

## For real studio use
Run the **full server app** in the parent folder ([`../`](../)) — Node + Express + SQLite + real file
uploads + signed-cookie sessions + shared, persistent storage that survives restarts and redeploys.
See [`../README.md`](../README.md).

## Notes for the curious
- All user-supplied text (names, captions, comments, titles) is rendered through `document.createTextNode`
  (never `innerHTML`) — so a comment containing `<script>` shows up as literal text, not executable
  markup. The server front-end follows the same rule.
- The grid is a real `<table>` with `scope`/`headers` associations, cells are keyboard-activatable,
  focus is visible, and images carry the alt-text captured on upload.
