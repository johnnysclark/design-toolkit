// crit-board — database layer (better-sqlite3, synchronous).
//
// Opens the single-file DB under DATA_DIR, sets pragmas, creates the schema
// (idempotent — safe to run every boot), and exposes prepared-statement helpers.
// Routes call these helpers and never write raw SQL.
//
// Tables: students, weeks, images, threads, comments, settings.
// A "cell" = a (student_id, week_id) pair → its images + its threads;
// each thread → many comments. FK cascades clean up rows on delete; disk files
// are unlinked explicitly by the route layer (cascade doesn't touch the filesystem).
import Database from "better-sqlite3";
import { DB_PATH } from "./paths.js";

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");   // concurrent readers + one writer
db.pragma("foreign_keys = ON");    // enforce FKs (off by default in SQLite)
db.pragma("synchronous = NORMAL"); // safe under WAL, fewer fsyncs
db.pragma("busy_timeout = 5000");  // wait briefly on a write lock instead of throwing

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS weeks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS images (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_id       INTEGER NOT NULL REFERENCES weeks(id)    ON DELETE CASCADE,
  uploader_name TEXT    NOT NULL,
  stored_path   TEXT    NOT NULL,
  original_name TEXT,
  alt_text      TEXT,
  width         INTEGER,
  height        INTEGER,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS threads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_id     INTEGER NOT NULL REFERENCES weeks(id)    ON DELETE CASCADE,
  title       TEXT,
  created_by  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id   INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_name TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
CREATE INDEX IF NOT EXISTS idx_images_cell   ON images(student_id, week_id);
CREATE INDEX IF NOT EXISTS idx_threads_cell  ON threads(student_id, week_id);
CREATE INDEX IF NOT EXISTS idx_comments_thr  ON comments(thread_id);
`);

// ---- prepared statements --------------------------------------------------
const S = {
  students:        db.prepare("SELECT id, name, sort_order FROM students ORDER BY sort_order, id"),
  weeks:           db.prepare("SELECT id, label, sort_order FROM weeks ORDER BY sort_order, id"),
  getSetting:      db.prepare("SELECT value FROM settings WHERE key = ?"),
  setSetting:      db.prepare("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"),

  cellImages:      db.prepare("SELECT * FROM images WHERE student_id = ? AND week_id = ? ORDER BY sort_order, id"),
  cellThreads:     db.prepare("SELECT id, student_id, week_id, title, created_by, created_at FROM threads WHERE student_id = ? AND week_id = ? ORDER BY created_at, id"),
  threadComments:  db.prepare("SELECT id, thread_id, author_name, body, created_at FROM comments WHERE thread_id = ? ORDER BY created_at, id"),

  countImages:     db.prepare("SELECT student_id, week_id, COUNT(*) AS n FROM images GROUP BY student_id, week_id"),
  countThreads:    db.prepare("SELECT student_id, week_id, COUNT(*) AS n FROM threads GROUP BY student_id, week_id"),
  countComments:   db.prepare("SELECT t.student_id AS student_id, t.week_id AS week_id, COUNT(c.id) AS n FROM threads t JOIN comments c ON c.thread_id = t.id GROUP BY t.student_id, t.week_id"),
  thumbIds:        db.prepare("SELECT id, student_id, week_id FROM images ORDER BY student_id, week_id, sort_order, id"),

  insertImage:     db.prepare("INSERT INTO images(student_id, week_id, uploader_name, stored_path, original_name, alt_text, width, height, sort_order) VALUES(@student_id, @week_id, @uploader_name, @stored_path, @original_name, @alt_text, @width, @height, @sort_order)"),
  getImage:        db.prepare("SELECT * FROM images WHERE id = ?"),
  deleteImage:     db.prepare("DELETE FROM images WHERE id = ?"),
  maxImageOrder:   db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM images WHERE student_id = ? AND week_id = ?"),
  setImageOrder:   db.prepare("UPDATE images SET sort_order = ? WHERE id = ? AND student_id = ? AND week_id = ?"),
  imagePathsForStudent: db.prepare("SELECT stored_path FROM images WHERE student_id = ?"),
  imagePathsForWeek:    db.prepare("SELECT stored_path FROM images WHERE week_id = ?"),

  insertThread:    db.prepare("INSERT INTO threads(student_id, week_id, title, created_by) VALUES(@student_id, @week_id, @title, @created_by)"),
  getThread:       db.prepare("SELECT id, student_id, week_id, title, created_by, created_at FROM threads WHERE id = ?"),
  insertComment:   db.prepare("INSERT INTO comments(thread_id, author_name, body) VALUES(?, ?, ?)"),
  getComment:      db.prepare("SELECT id, thread_id, author_name, body, created_at FROM comments WHERE id = ?"),
  deleteComment:   db.prepare("DELETE FROM comments WHERE id = ?"),

  addStudent:      db.prepare("INSERT INTO students(name, sort_order) VALUES(?, ?)"),
  renameStudent:   db.prepare("UPDATE students SET name = ? WHERE id = ?"),
  deleteStudent:   db.prepare("DELETE FROM students WHERE id = ?"),
  setStudentOrder: db.prepare("UPDATE students SET sort_order = ? WHERE id = ?"),
  maxStudentOrder: db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM students"),

  addWeek:         db.prepare("INSERT INTO weeks(label, sort_order) VALUES(?, ?)"),
  getWeek:         db.prepare("SELECT id, label, sort_order FROM weeks WHERE id = ?"),
  getStudent:      db.prepare("SELECT id, name, sort_order FROM students WHERE id = ?"),
  renameWeek:      db.prepare("UPDATE weeks SET label = ? WHERE id = ?"),
  deleteWeek:      db.prepare("DELETE FROM weeks WHERE id = ?"),
  setWeekOrder:    db.prepare("UPDATE weeks SET sort_order = ? WHERE id = ?"),
  maxWeekOrder:    db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM weeks"),
};

// ---- reads ----------------------------------------------------------------
export const getStudents = () => S.students.all();
export const getWeeks = () => S.weeks.all();
export const getStudent = (id) => S.getStudent.get(id);
export const getWeek = (id) => S.getWeek.get(id);
export const getSetting = (key) => { const r = S.getSetting.get(key); return r ? r.value : null; };
export const setSetting = (key, value) => { S.setSetting.run(key, value); };

export const getCellImages = (sid, wid) => S.cellImages.all(sid, wid);
export const getCellThreads = (sid, wid) => S.cellThreads.all(sid, wid);
export const getThreadComments = (tid) => S.threadComments.all(tid);
export const getThread = (id) => S.getThread.get(id);
export const getImage = (id) => S.getImage.get(id);

// Per-cell badge data for the grid:
//   { "s<sid>_w<wid>": { images, threads, comments, thumbs:[imageId,...] (up to 4) } }
export function getCellCounts() {
  const out = {};
  const entry = (sid, wid) => {
    const k = `s${sid}_w${wid}`;
    return out[k] || (out[k] = { images: 0, threads: 0, comments: 0, thumbs: [] });
  };
  for (const r of S.countImages.all()) entry(r.student_id, r.week_id).images = r.n;
  for (const r of S.countThreads.all()) entry(r.student_id, r.week_id).threads = r.n;
  for (const r of S.countComments.all()) entry(r.student_id, r.week_id).comments = r.n;
  for (const r of S.thumbIds.all()) { const e = entry(r.student_id, r.week_id); if (e.thumbs.length < 4) e.thumbs.push(r.id); }
  return out;
}

// Strip the internal stored_path before sending an image row to the client.
export const toPublicImage = (row) => ({
  id: row.id, student_id: row.student_id, week_id: row.week_id,
  uploader_name: row.uploader_name, alt_text: row.alt_text,
  width: row.width, height: row.height, created_at: row.created_at,
  original_name: row.original_name, sort_order: row.sort_order,
});

// ---- images ---------------------------------------------------------------
export function insertImage(img) {
  const sort_order = S.maxImageOrder.get(img.student_id, img.week_id).m + 1;
  const info = S.insertImage.run({ ...img, sort_order });
  return S.getImage.get(info.lastInsertRowid);
}
export const deleteImage = (id) => S.deleteImage.run(id);

export const reorderCellImages = db.transaction((sid, wid, orderedIds) => {
  orderedIds.forEach((id, i) => S.setImageOrder.run(i, id, sid, wid));
});

// ---- threads & comments ---------------------------------------------------
export const createThreadWithComment = db.transaction(({ student_id, week_id, title, created_by, body }) => {
  const info = S.insertThread.run({ student_id, week_id, title: title || null, created_by });
  const thread = S.getThread.get(info.lastInsertRowid);
  const cInfo = S.insertComment.run(thread.id, created_by, body);
  const comment = S.getComment.get(cInfo.lastInsertRowid);
  return { thread, comment };
});
export function insertComment(threadId, author, body) {
  const info = S.insertComment.run(threadId, author, body);
  return S.getComment.get(info.lastInsertRowid);
}
export const deleteComment = (id) => S.deleteComment.run(id);

// ---- admin: students ------------------------------------------------------
export function addStudent(name) {
  const order = S.maxStudentOrder.get().m + 1;
  const info = S.addStudent.run(name, order);
  return S.getStudent.get(info.lastInsertRowid);
}
export const bulkAddStudents = db.transaction((names) => {
  let order = S.maxStudentOrder.get().m;
  const existing = new Set(getStudents().map((s) => s.name.toLowerCase()));
  const added = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (existing.has(key)) continue;
    existing.add(key);
    const info = S.addStudent.run(name, ++order);
    added.push(S.getStudent.get(info.lastInsertRowid));
  }
  return added;
});
export const renameStudent = (id, name) => S.renameStudent.run(name, id);
export const reorderStudents = db.transaction((orderedIds) => {
  orderedIds.forEach((id, i) => S.setStudentOrder.run(i, id));
});
// Returns the deleted student's image paths so the caller can unlink the files.
export const deleteStudent = db.transaction((id) => {
  const paths = S.imagePathsForStudent.all(id).map((r) => r.stored_path);
  S.deleteStudent.run(id); // cascade removes images/threads/comments rows
  return paths;
});

// ---- admin: weeks ---------------------------------------------------------
export function addWeek(label) {
  const order = S.maxWeekOrder.get().m + 1;
  const info = S.addWeek.run(label, order);
  return S.getWeek.get(info.lastInsertRowid);
}
export const renameWeek = (id, label) => S.renameWeek.run(label, id);
export const reorderWeeks = db.transaction((orderedIds) => {
  orderedIds.forEach((id, i) => S.setWeekOrder.run(i, id));
});
export const deleteWeek = db.transaction((id) => {
  const paths = S.imagePathsForWeek.all(id).map((r) => r.stored_path);
  S.deleteWeek.run(id); // cascade
  return paths;
});
