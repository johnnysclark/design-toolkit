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

// ---- students -------------------------------------------------------------
router.post("/api/admin/students", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Name required." });
  res.json({ ok: true, student: db.addStudent(name) });
});
router.post("/api/admin/students/bulk", (req, res) => {
  const names = String(req.body.text || "").split(/[\n,]+/).map((s) => s.trim().slice(0, 80)).filter(Boolean);
  res.json({ ok: true, students: db.bulkAddStudents(names) });
});
router.patch("/api/admin/students/:id", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Name required." });
  db.renameStudent(Number(req.params.id), name);
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
