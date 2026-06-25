# Studio Crit Board

A self-hosted, grid-based **pinup / crit board** for an architecture design studio — a replacement
for the studio's Miro board. **Rows are students (grouped by TA section), columns are weeks.** Each **cell** (one student ×
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
- **Admin (instructor):** set the studio name; manage **TAs** (sections) and assign each student to one;
  add / rename / reorder / remove **students** (rows) and **weeks** (columns); bulk-paste a roster;
  delete any image or comment (moderation).
- **The grid:** scrollable, with a sticky header row and first column; **rows are grouped under TA
  section headers**. Each cell has **two stacked boxes** — a **work** box (thumbnail stack) on top and a
  **comments** box (thread/comment counts + the latest comment) below; click either to open that side.
  Images lazy-load.
- **Cell view:** an image gallery with a keyboard- and swipe-navigable lightbox; a drag-and-drop
  **upload** dropzone (multiple images at once, camera capture on mobile, optional per-image
  alt-text/caption, with progress); and **threaded comments** (start a thread, reply, see author +
  relative time). Students can reorder/delete images in their own row.
- **Persistence:** images on disk under `DATA_DIR/uploads/`, all metadata + comments in SQLite —
  surviving restarts and redeploys (when `DATA_DIR` is on a mounted persistent disk).

## Configuration (env)
Copy `.env.example` to `.env` and edit. (`.env` is gitignored.)

| Var | Default | Notes |
|---|---|---|
| `STUDENT_PASSCODE` | — | Shared passcode for students. |
| `INSTRUCTOR_PASSCODE` | — | Shared passcode for instructors (unlocks admin + moderation). |
| `SESSION_SECRET` | insecure dev default | Signs the session cookie. **Set a long random value in production.** |
| `DATA_DIR` | `./data` | DB + uploads live here. **Mount a persistent disk here in production.** |
| `PORT` | `3000` | Listen port (hosts usually inject this). |
| `MAX_UPLOAD_MB` | `25` | Max size per uploaded image. |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Deployment
The app is a Node web service + a SQLite file + an uploads folder. A `Dockerfile` (`node:20-slim`)
and a `render.yaml` Blueprint are included.

> ⚠️ **Ephemeral filesystem warning.** On Render / Railway / Fly the container filesystem is wiped
> on every deploy and restart. **You MUST attach a persistent disk/volume mounted at `DATA_DIR`
> (e.g. `/data`)**, or every image and the entire database vanish on the next redeploy. This is the
> single most important deployment step.

### Render (step by step)
1. Push this repo to GitHub.
2. **New → Web Service** pointed at the repo. Set **Root Directory** to `TOOLS/crit-board` so Render
   builds with this folder's Dockerfile.
3. Add a **Disk**: name `crit-data`, **mount path `/data`**, size e.g. 5 GB. (Disks require a paid
   instance type and pin the service to a single instance — exactly what this single-writer SQLite
   app wants.)
4. Set **env vars**: `DATA_DIR=/data`, `STUDENT_PASSCODE`, `INSTRUCTOR_PASSCODE`, `SESSION_SECRET`
   (long random), optionally `MAX_UPLOAD_MB`. `PORT` is injected by Render.
5. Deploy, then sign in with the instructor passcode and set up the board (or run `npm run seed`
   once via a one-off shell for sample data).

Or use the included **[`render.yaml`](render.yaml)** Blueprint (web service + disk at `/data` + env
placeholders); `SESSION_SECRET` is auto-generated and you're prompted for the passcodes.

### Railway / Fly.io (volumes)
- **Railway:** add a **Volume** mounted at `/data`; set `DATA_DIR=/data` + the passcodes + `SESSION_SECRET`.
- **Fly.io:** `fly volumes create crit_data --size 5`, then in `fly.toml` add
  `[mounts]` with `source = "crit_data"` and `destination = "/data"`; `fly secrets set …` the env.

Keep `DATA_DIR` on real block storage (Render/Railway/Fly disks are). Avoid NFS/SMB shares — SQLite
WAL locking misbehaves on some network filesystems.

## Data & backup
Everything lives under `DATA_DIR`: `board.db` (+ the `board.db-wal` / `board.db-shm` WAL sidecars)
and `uploads/`. To back up, copy the whole `DATA_DIR` (use `sqlite3 board.db ".backup backup.db"` for
a consistent DB snapshot, plus the `uploads/` tree). To restore, drop the files back and restart.
There is no external database to manage.

## Security & trust model
- **Light, soft identity.** Two shared passcodes; a student's identity is a name chosen from the
  roster, stored in a *signed* (tamper-proof) cookie. The signature stops forgery, but nothing stops
  a student from picking a different roster name — fitting for a trusted studio, **not** real
  authentication. Own-row upload enforcement is a guard rail, not a wall.
- **Hardening in place:** all user text is rendered as DOM text nodes (never `innerHTML`), so a
  comment containing `<script>` displays as literal text; uploads are image-MIME-only, size-capped,
  and renamed to random IDs stored outside the web root; images are served only through an
  auth-gated route with a path-traversal guard + `X-Content-Type-Options: nosniff`; login, uploads,
  and posts are rate-limited; the session cookie is `httpOnly`, `sameSite=lax`, and `secure` in
  production. Run behind HTTPS in production (all the PaaS options do this by default).

## Accessibility
The grid is a real `<table>` with `scope`/`headers` associations; cells, the lightbox, and modals are
keyboard-navigable (Enter/Space to open; arrows + `Esc` in the lightbox) with visible focus; alt-text
is captured on upload and rendered on every `<img>`; the palette meets contrast in light and dark.

## Stretch / future
`sharp` thumbnails, emoji reactions, mark-a-thread-resolved, a comment that references a specific
image, light notifications, per-week due dates, export a column to PDF, a formal CSV roster importer.
(Course-aligned AI hooks — flagging generic comments, per-cell crit summaries — are deliberately out
of scope for now.)

## Project layout
```
server.js  db.js  auth.js  upload.js  ratelimit.js  paths.js   # backend (ESM)
routes/*.js                                                    # auth · board · images · comments · admin
public/{index.html,app.js,styles.css}                          # vanilla-JS front-end (no build)
seed/{seed.js,assets/*.png}                                    # npm run seed + committed placeholders
lite/index.html                                                # zero-setup single-file demo
Dockerfile  .dockerignore  render.yaml  .env.example           # deploy
data/                                                          # runtime DB + uploads (gitignored)
```
