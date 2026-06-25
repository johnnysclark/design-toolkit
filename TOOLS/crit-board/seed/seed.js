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
import { db, getSetting, setSetting, addStudent, addWeek, addTa } from "../db.js";
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
    db.exec("DELETE FROM comments; DELETE FROM threads; DELETE FROM images; DELETE FROM students; DELETE FROM weeks; DELETE FROM tas;");
    db.prepare("DELETE FROM settings WHERE key IN ('studio_name','seeded')").run();
  })();
  for (const p of oldPaths) unlink(join(UPLOADS_DIR, p), () => {});
}

// ---- studio + roster (3 TAs × 12 students, 6 weeks) -----------------------
setSetting("studio_name", "Summer Studio — Crit Board");

const TA_NAMES = ["TA · Maya Lin", "TA · Paul Rudolph", "TA · Denise Scott Brown"];
const ROSTER = [
  ["Ada Okafor", "Bruno Silva", "Chen Wei", "Dara Nguyen", "Esme Robinson", "Farid Haddad",
   "Gina Alvarez", "Hugo Bauer", "Ivy Tan", "Jamal Reed", "Kira Volkov", "Liam O'Brien"],
  ["Maya Patel", "Noah Kim", "Olga Petrova", "Pedro Gomez", "Qian Liu", "Rosa Marin",
   "Sami Haddad", "Tara Singh", "Umar Farouk", "Vera Costa", "Will Hughes", "Xochitl Mora"],
  ["Yara Saleh", "Zane Miller", "Amara Diop", "Ben Carter", "Cora Lee", "Dmitri Ivanov",
   "Elena Rossi", "Femi Adeyemi", "Greta Vogel", "Hana Suzuki", "Ravi Menon", "Sofia Duarte"],
];

const tas = TA_NAMES.map(addTa);
const students = []; // flat, in TA order: [0..11]=TA1, [12..23]=TA2, [24..35]=TA3
tas.forEach((ta, gi) => ROSTER[gi].forEach((name) => students.push(addStudent(name, ta.id))));

const weeks = ["Week 1 · Site", "Week 2 · Concept", "Week 3 · Massing",
               "Week 4 · Systems", "Week 5 · Refinement", "Week 6 · Final Review"].map(addWeek);

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
  // Images spread across all three TA sections and several weeks (not every cell).
  placeImage(0, 0, pick(0), "Ada — figure-ground site plan of the block", 600, 0);
  placeImage(0, 0, pick(2), "Ada — site analysis diagram (sun + circulation)", 590, 1);
  placeImage(0, 1, pick(1), "Ada — massing concept A, three bars around a court", 410, 0);
  placeImage(1, 0, pick(0), "Bruno — chipboard site model, overhead", 520, 0);
  placeImage(2, 2, pick(2), "Chen — circulation & program diagram", 300, 0);
  placeImage(4, 3, pick(1), "Esme — foamcore massing study", 180, 0);
  placeImage(12, 0, pick(0), "Maya — context plan, 1:500", 540, 0);
  placeImage(13, 1, pick(1), "Noah — parti sketches", 360, 0);
  placeImage(24, 2, pick(2), "Yara — long section through the atrium", 240, 0);
  placeImage(25, 4, pick(1), "Zane — refined massing, study models", 90, 0);

  const t1 = thread(0, 0, "Legibility of the site plan", TA_NAMES[0], 585);
  comment(t1, TA_NAMES[0], "Strong figure-ground. Push the contrast between the public edge and the private courtyard so the threshold reads at a glance.", 583);
  comment(t1, "Ada Okafor", "Good call — I'll redraw the courtyard threshold and re-post before Thursday.", 521);

  const t2 = thread(0, 0, "Scale figures?", "Bruno Silva", 300);
  comment(t2, "Bruno Silva", "Might help to drop a few people in for scale — hard to read the arcade height right now.", 299);

  const t3 = thread(2, 2, "Circulation clarity", TA_NAMES[0], 250);
  comment(t3, TA_NAMES[0], "The diagram reads well. What happens at the core where the two flows meet?", 248);
  comment(t3, "Chen Wei", "They share a double-height landing — I'll draw that next.", 120);

  const t4 = thread(12, 0, "Site boundary", TA_NAMES[1], 360);
  comment(t4, TA_NAMES[1], "Double-check the lot line on the north edge against the survey.", 358);

  const t5 = thread(24, 2, "Section poché", TA_NAMES[2], 200);
  comment(t5, TA_NAMES[2], "Love the atrium. Now show the structure holding that span.", 198);
  comment(t5, "Yara Saleh", "Adding a structural overlay next pass.", 60);

  const t6 = thread(13, 1, "Parti legibility", "Olga Petrova", 150);
  comment(t6, "Olga Petrova", "Which of these three is the strongest organizing idea?", 149);
})();

setSetting("seeded", "1");

const n = (sql) => db.prepare(sql).get().n;
console.log("Seeded:", {
  tas: n("SELECT COUNT(*) n FROM tas"),
  students: n("SELECT COUNT(*) n FROM students"),
  weeks: n("SELECT COUNT(*) n FROM weeks"),
  images: n("SELECT COUNT(*) n FROM images"),
  threads: n("SELECT COUNT(*) n FROM threads"),
  comments: n("SELECT COUNT(*) n FROM comments"),
});
console.log("Studio:", getSetting("studio_name"));
