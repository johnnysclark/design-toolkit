// crit-board — seed a sample board so the app can be demoed instantly.
//
//   npm run seed              populate (no-op if already seeded)
//   npm run seed -- --force   wipe existing data and reseed
//
// Inserts ~6 students, 4 weeks, a few images (copied from the committed
// seed/assets/*.png into DATA_DIR/uploads), and a few threaded discussions
// with staggered timestamps so relative times look real.
import "../loadenv.js"; // must be first: populates process.env before db/paths load
import crypto from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, unlink } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, getSetting, setSetting, addStudent, addWeek } from "../db.js";
import { UPLOADS_DIR } from "../paths.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "assets");
const FORCE = process.argv.includes("--force");

if (getSetting("seeded") === "1" && !FORCE) {
  console.log("Board already seeded. Re-run with:  npm run seed -- --force   to wipe and reseed.");
  process.exit(0);
}

// Past timestamp in SQLite's datetime('now') text format ("YYYY-MM-DD HH:MM:SS", UTC).
const stamp = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString().slice(0, 19).replace("T", " ");

// ---- wipe (only with --force) ---------------------------------------------
if (FORCE) {
  const oldPaths = db.prepare("SELECT stored_path FROM images").all().map((r) => r.stored_path);
  db.transaction(() => {
    db.exec("DELETE FROM comments; DELETE FROM threads; DELETE FROM images; DELETE FROM students; DELETE FROM weeks;");
    db.prepare("DELETE FROM settings WHERE key IN ('studio_name','seeded')").run();
  })();
  for (const p of oldPaths) unlink(join(UPLOADS_DIR, p), () => {});
}

// ---- studio + roster ------------------------------------------------------
setSetting("studio_name", "Summer Studio — Crit Board");
const students = ["Ada Okafor", "Bruno Silva", "Chen Wei", "Dara Nguyen", "Esme Robinson", "Farid Haddad"].map(addStudent);
const weeks = ["Week 1 · Site", "Week 2 · Concept", "Week 3 · Massing", "Week 4 · Pinup"].map(addWeek);

// ---- images (copy committed assets into uploads under the shard scheme) ---
const assets = readdirSync(ASSETS).filter((f) => f.toLowerCase().endsWith(".png"));
const pick = (i) => assets[i % assets.length];
const insImage = db.prepare(`INSERT INTO images
  (student_id, week_id, uploader_name, stored_path, original_name, alt_text, width, height, created_at, sort_order)
  VALUES (@student_id, @week_id, @uploader_name, @stored_path, @original_name, @alt_text, @width, @height, @created_at, @sort_order)`);

function placeImage(sIdx, wIdx, assetFile, alt, minsAgo, order) {
  const id = crypto.randomBytes(8).toString("hex");
  const shard = id.slice(0, 2);
  mkdirSync(join(UPLOADS_DIR, shard), { recursive: true });
  const rel = `${shard}/${id}.png`;
  copyFileSync(join(ASSETS, assetFile), join(UPLOADS_DIR, rel));
  insImage.run({
    student_id: students[sIdx].id, week_id: weeks[wIdx].id, uploader_name: students[sIdx].name,
    stored_path: rel, original_name: assetFile, alt_text: alt, width: 640, height: 480,
    created_at: stamp(minsAgo), sort_order: order,
  });
}

const insThread = db.prepare("INSERT INTO threads(student_id, week_id, title, created_by, created_at) VALUES(?, ?, ?, ?, ?)");
const insComment = db.prepare("INSERT INTO comments(thread_id, author_name, body, created_at) VALUES(?, ?, ?, ?)");
const thread = (sIdx, wIdx, title, by, minsAgo) => insThread.run(students[sIdx].id, weeks[wIdx].id, title, by, stamp(minsAgo)).lastInsertRowid;
const comment = (tid, author, body, minsAgo) => insComment.run(tid, author, body, stamp(minsAgo));

db.transaction(() => {
  placeImage(0, 0, pick(0), "Ada — figure-ground site plan of the block", 600, 0);
  placeImage(0, 0, pick(2), "Ada — site analysis diagram (sun + circulation)", 590, 1);
  placeImage(0, 1, pick(1), "Ada — massing concept A, three bars around a court", 410, 0);
  placeImage(1, 0, pick(0), "Bruno — chipboard site model, overhead", 520, 0);
  placeImage(2, 1, pick(2), "Chen — circulation & program diagram", 300, 0);
  placeImage(4, 2, pick(1), "Esme — foamcore massing study, first pass", 180, 0);

  const t1 = thread(0, 0, "Legibility of the site plan", "Prof. Lang", 585);
  comment(t1, "Prof. Lang", "Strong figure-ground. Push the contrast between the public edge and the private courtyard so the threshold reads at a glance.", 583);
  comment(t1, "Ada Okafor", "Good call — I'll redraw the courtyard threshold and re-post before Thursday.", 521);

  const t2 = thread(0, 0, "Scale figures?", "Bruno Silva", 300);
  comment(t2, "Bruno Silva", "Might help to drop a few people in for scale — hard to read the arcade height right now.", 299);

  const t3 = thread(2, 1, "Circulation clarity", "Prof. Lang", 250);
  comment(t3, "Prof. Lang", "The diagram reads well. What happens at the core where the two flows meet?", 248);
  comment(t3, "Chen Wei", "They share a double-height landing — I'll draw that next.", 120);
})();

setSetting("seeded", "1");

const n = (sql) => db.prepare(sql).get().n;
console.log("Seeded:", {
  students: n("SELECT COUNT(*) n FROM students"),
  weeks: n("SELECT COUNT(*) n FROM weeks"),
  images: n("SELECT COUNT(*) n FROM images"),
  threads: n("SELECT COUNT(*) n FROM threads"),
  comments: n("SELECT COUNT(*) n FROM comments"),
});
console.log("Studio:", getSetting("studio_name"));
