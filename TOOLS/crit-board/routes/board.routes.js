// crit-board — board + cell reads.
//   GET /api/board                      -> studio name, students, weeks, per-cell counts
//   GET /api/cell?student=ID&week=ID    -> one cell's images + threads (with comments)
import { Router } from "express";
import { requireSession, requireLoggedIn } from "../auth.js";
import {
  getStudents, getWeeks, getTas, getSetting, getCellCounts,
  getStudent, getWeek, getCellImages, getCellThreads, getThreadComments, toPublicImage,
} from "../db.js";

const router = Router();

// Roster for the name-picker screen: available after login but BEFORE a name is
// chosen (so it can't use requireSession, which requires a chosen name).
router.get("/api/roster", requireLoggedIn, (req, res) => {
  res.json({
    studioName: getSetting("studio_name") || "Studio Crit Board",
    students: getStudents().map((s) => ({ id: s.id, name: s.name })),
  });
});

router.get("/api/board", requireSession, (req, res) => {
  res.json({
    studioName: getSetting("studio_name") || "Studio Crit Board",
    role: req.session.role,
    me: req.session.name,
    tas: getTas(),
    students: getStudents(),
    weeks: getWeeks(),
    counts: getCellCounts(),
  });
});

router.get("/api/cell", requireSession, (req, res) => {
  const sid = Number(req.query.student);
  const wid = Number(req.query.week);
  const student = getStudent(sid);
  const week = getWeek(wid);
  if (!student || !week) return res.status(404).json({ error: "No such cell." });

  const threads = getCellThreads(sid, wid).map((t) => ({ ...t, comments: getThreadComments(t.id) }));
  const images = getCellImages(sid, wid).map(toPublicImage);
  res.json({ student, week, images, threads });
});

export default router;
