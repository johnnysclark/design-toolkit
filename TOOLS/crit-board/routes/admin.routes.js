// crit-board — instructor admin + moderation (all routes require instructor).
//   PUT    /api/admin/studio-name        { name }
//   POST   /api/admin/students           { name }            add one
//   POST   /api/admin/students/bulk      { text }            paste/CSV bulk add
//   PATCH  /api/admin/students/:id        { name }           rename
//   DELETE /api/admin/students/:id                            remove (cascade + unlink files)
//   PUT    /api/admin/students/order     { order:[id,...] }  reorder
//   (weeks: same shape with { label })
//   DELETE /api/admin/images/:id                              moderation: delete any image
//   DELETE /api/admin/comments/:id                            moderation: delete any comment
import { Router } from "express";
import { requireInstructor } from "../auth.js";
import { unlinkImageFile } from "../upload.js";
import * as db from "../db.js";

const router = Router();
router.use("/api/admin", requireInstructor); // gate everything under /api/admin

router.put("/api/admin/studio-name", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 120) || "Studio Crit Board";
  db.setSetting("studio_name", name);
  res.json({ ok: true, studioName: name });
});

// ---- TAs ------------------------------------------------------------------
router.post("/api/admin/tas", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "TA name required." });
  res.json({ ok: true, ta: db.addTa(name) });
});
router.patch("/api/admin/tas/:id", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "TA name required." });
  db.renameTa(Number(req.params.id), name);
  res.json({ ok: true });
});
router.delete("/api/admin/tas/:id", (req, res) => {
  db.deleteTa(Number(req.params.id)); // unassigns its students (ta_id -> NULL)
  res.json({ ok: true });
});
router.put("/api/admin/tas/order", (req, res) => {
  const order = (Array.isArray(req.body.order) ? req.body.order : []).map(Number).filter(Number.isFinite);
  db.reorderTas(order);
  res.json({ ok: true });
});

// Validate an optional ta_id from the body: returns {ok, taId} or sends a 400.
function readTaId(req, res) {
  if (!("ta_id" in req.body) || req.body.ta_id == null || req.body.ta_id === "") return { ok: true, taId: null };
  const taId = Number(req.body.ta_id);
  if (!Number.isFinite(taId) || !db.getTa(taId)) { res.status(400).json({ error: "No such TA." }); return { ok: false }; }
  return { ok: true, taId };
}

// ---- students -------------------------------------------------------------
router.post("/api/admin/students", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Name required." });
  const ta = readTaId(req, res); if (!ta.ok) return;
  res.json({ ok: true, student: db.addStudent(name, ta.taId) });
});
router.post("/api/admin/students/bulk", (req, res) => {
  const names = String(req.body.text || "").split(/[\n,]+/).map((s) => s.trim().slice(0, 80)).filter(Boolean);
  const ta = readTaId(req, res); if (!ta.ok) return;
  res.json({ ok: true, students: db.bulkAddStudents(names, ta.taId) });
});
router.patch("/api/admin/students/:id", (req, res) => {
  const id = Number(req.params.id);
  if ("name" in req.body) {
    const name = String(req.body.name || "").trim().slice(0, 80);
    if (!name) return res.status(400).json({ error: "Name required." });
    db.renameStudent(id, name);
  }
  if ("ta_id" in req.body) {
    const ta = readTaId(req, res); if (!ta.ok) return;
    db.setStudentTa(id, ta.taId);
  }
  res.json({ ok: true });
});
router.delete("/api/admin/students/:id", (req, res) => {
  db.deleteStudent(Number(req.params.id)).forEach(unlinkImageFile);
  res.json({ ok: true });
});
router.put("/api/admin/students/order", (req, res) => {
  const order = (Array.isArray(req.body.order) ? req.body.order : []).map(Number).filter(Number.isFinite);
  db.reorderStudents(order);
  res.json({ ok: true });
});

// ---- weeks ----------------------------------------------------------------
router.post("/api/admin/weeks", (req, res) => {
  const label = String(req.body.label || "").trim().slice(0, 120);
  if (!label) return res.status(400).json({ error: "Label required." });
  res.json({ ok: true, week: db.addWeek(label) });
});
router.patch("/api/admin/weeks/:id", (req, res) => {
  const label = String(req.body.label || "").trim().slice(0, 120);
  if (!label) return res.status(400).json({ error: "Label required." });
  db.renameWeek(Number(req.params.id), label);
  res.json({ ok: true });
});
router.delete("/api/admin/weeks/:id", (req, res) => {
  db.deleteWeek(Number(req.params.id)).forEach(unlinkImageFile);
  res.json({ ok: true });
});
router.put("/api/admin/weeks/order", (req, res) => {
  const order = (Array.isArray(req.body.order) ? req.body.order : []).map(Number).filter(Number.isFinite);
  db.reorderWeeks(order);
  res.json({ ok: true });
});

// ---- moderation -----------------------------------------------------------
router.delete("/api/admin/images/:id", (req, res) => {
  const row = db.getImage(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found." });
  db.deleteImage(row.id);
  unlinkImageFile(row.stored_path);
  res.json({ ok: true });
});
router.delete("/api/admin/comments/:id", (req, res) => {
  db.deleteComment(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
