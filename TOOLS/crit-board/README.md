# Studio Crit Board

A self-hosted, grid-based **pinup / crit board** for an architecture design studio — a replacement
for the studio's Miro board. **Rows are students, columns are weeks.** Each **cell** (one student ×
one week) holds **many uploaded images** (process + final work) and **multiple threaded comment
discussions**. It's meant to be the studio's primary place to post work and to give and receive
**public** feedback.

> Maps to `TOOL CATALOG IDEAS.md` §16 (Studio Operations & Pedagogy Infrastructure) + §13 (Critique).
> Unlike the repo's single-user demo tools, this one is **multi-user, persistent, and deployable**, so
> it uses a small proven server stack (Express + SQLite) while keeping the front-end dependency-free.

## Two ways to run

| Variant | Setup | Use it for |
|---|---|---|
| **[`lite/`](lite/) — zero-setup demo** | none — open the HTML file | Showing the whole experience instantly; runs in one browser via `localStorage`. **Not** multi-user. |
| **Server app** (this folder) | `npm install` → `npm run seed` → `npm start` | The real studio board: shared uploads, public feedback, accounts, persistent storage. |

### Try the demo right now
```bash
open "TOOLS/crit-board/lite/index.html"
```
See [`lite/README.md`](lite/README.md) for what it does and its limits.

### Run the server app (local)
```bash
cd TOOLS/crit-board
npm install
cp .env.example .env          # then edit the passcodes + SESSION_SECRET
npm run seed                  # populate a sample board (~6 students, ~4 weeks, sample images)
npm start                     # → http://localhost:3000
```

## What it does (server app)
- **Entry:** a shared **student passcode** (then pick your name from the roster) or an **instructor
  passcode** (unlocks admin). Identity is a self-selected name — light auth for a trusted studio.
- **Admin (instructor):** set the studio name; add / rename / reorder / remove **students** (rows) and
  **weeks** (columns); bulk-paste a roster; delete any image or comment (moderation).
- **The grid:** scrollable, with a sticky header row and first column; each cell shows a thumbnail
  stack and a "*N* threads · *M* comments" badge; images lazy-load.
- **Cell view:** an image gallery with a keyboard- and swipe-navigable lightbox; a drag-and-drop
  **upload** dropzone (multiple images at once, camera capture on mobile, optional per-image
  alt-text/caption, with progress); and **threaded comments** (start a thread, reply, see author +
  relative time). Students can reorder/delete images in their own row.
- **Persistence:** images on disk under `DATA_DIR/uploads/`, all metadata + comments in SQLite —
  surviving restarts and redeploys (when `DATA_DIR` is on a mounted persistent disk).

## Stretch / future
`sharp` thumbnails, emoji reactions, mark-a-thread-resolved, a comment that references a specific
image, light notifications, per-week due dates, export a column to PDF, CSV roster import. (Course-
aligned AI hooks — flagging generic comments, per-cell crit summaries — are deliberately out of scope
for now.)

---

*The server app (`server.js`, `db.js`, `auth.js`, uploads, routes, `public/`, seed, Dockerfile, deploy
docs) is built incrementally in this folder. Full run/env/deploy/backup documentation lands with the
deployment step. For now, the **[lite demo](lite/)** is fully working.*
