// crit-board — image upload, authenticated serving, self-manage (delete/reorder).
//   POST   /api/cell/images        multipart upload (many at once) to a cell
//   GET    /img/:id                stream the original image (auth-gated, never static)
//   DELETE /api/images/:id         uploader or instructor deletes an image
//   PUT    /api/cell/images/order  uploader or instructor reorders a cell's images
//
// Middleware order on upload: rateLimit -> requireSession -> multer -> handler, so we
// reject anonymous/abusive requests before spending disk I/O parsing a large body.
import { Router } from "express";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { requireSession } from "../auth.js";
import { rateLimit } from "../ratelimit.js";
import { uploadImages, unlinkImageFile, relPathFromAbs, MIME_BY_EXT } from "../upload.js";
import { UPLOADS_DIR } from "../paths.js";
import { getStudent, insertImage, getImage, deleteImage, reorderCellImages, toPublicImage } from "../db.js";

const router = Router();
const uploadLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 40, message: "Too many uploads — slow down." });

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

router.post("/api/cell/images", uploadLimiter, requireSession, uploadImages, (req, res) => {
  const files = req.files || [];
  const cleanup = () => files.forEach((f) => unlinkImageFile(relPathFromAbs(f.path)));

  const sid = Number(req.body.student_id);
  const wid = Number(req.body.week_id);
  const student = getStudent(sid);
  if (!student) { cleanup(); return res.status(404).json({ error: "No such student." }); }

  // Soft own-row enforcement: students upload only to their own row; instructors anywhere.
  if (req.session.role !== "instructor" && student.name !== req.session.name) {
    cleanup();
    return res.status(403).json({ error: "You can only upload to your own row." });
  }
  if (!files.length) return res.status(400).json({ error: "No images received (only image files are accepted)." });

  const alts = asArray(req.body.alt_text);
  const widths = asArray(req.body.width);
  const heights = asArray(req.body.height);

  const images = files.map((f, i) => {
    const row = insertImage({
      student_id: sid, week_id: wid, uploader_name: req.session.name,
      stored_path: relPathFromAbs(f.path),
      original_name: String(f.originalname || "").slice(0, 200),
      alt_text: String(alts[i] || "").slice(0, 500),
      width: Number(widths[i]) || null,
      height: Number(heights[i]) || null,
    });
    return toPublicImage(row);
  });
  res.json({ ok: true, images });
});

router.get("/img/:id", requireSession, async (req, res) => {
  const row = getImage(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found." });

  const abs = normalize(join(UPLOADS_DIR, row.stored_path));
  if (abs !== UPLOADS_DIR && !abs.startsWith(UPLOADS_DIR + "/")) {
    return res.status(403).json({ error: "Forbidden." });
  }
  try { await stat(abs); } catch { return res.status(404).json({ error: "File missing." }); }

  res.setHeader("Content-Type", MIME_BY_EXT[extname(abs).toLowerCase()] || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  createReadStream(abs).on("error", () => res.destroy()).pipe(res);
});

router.delete("/api/images/:id", requireSession, (req, res) => {
  const row = getImage(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found." });
  if (req.session.role !== "instructor" && row.uploader_name !== req.session.name) {
    return res.status(403).json({ error: "You can only delete your own images." });
  }
  deleteImage(row.id);
  unlinkImageFile(row.stored_path);
  res.json({ ok: true });
});

router.put("/api/cell/images/order", requireSession, (req, res) => {
  const sid = Number(req.body.student_id);
  const wid = Number(req.body.week_id);
  const order = asArray(req.body.order).map(Number).filter((n) => Number.isFinite(n));
  const student = getStudent(sid);
  if (!student) return res.status(404).json({ error: "No such student." });
  if (req.session.role !== "instructor" && student.name !== req.session.name) {
    return res.status(403).json({ error: "You can only reorder your own row." });
  }
  reorderCellImages(sid, wid, order);
  res.json({ ok: true });
});

export default router;
