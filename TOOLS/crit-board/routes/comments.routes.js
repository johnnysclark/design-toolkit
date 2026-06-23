// crit-board — threaded comments.
//   POST /api/cell/threads            { student_id, week_id, title, body } new thread + first comment
//   POST /api/threads/:id/comments    { body }                            reply to a thread
//
// Anyone with a session may comment on any cell. Author names come from the session,
// never the request body. Both routes are rate-limited.
import { Router } from "express";
import { requireSession } from "../auth.js";
import { rateLimit } from "../ratelimit.js";
import { getStudent, getWeek, getThread, createThreadWithComment, insertComment } from "../db.js";

const router = Router();
const postLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 80, message: "Too many posts — slow down." });

const MAX_BODY = 5000;

router.post("/api/cell/threads", postLimiter, requireSession, (req, res) => {
  const sid = Number(req.body.student_id);
  const wid = Number(req.body.week_id);
  const title = String(req.body.title || "").trim().slice(0, 200);
  const body = String(req.body.body || "").trim().slice(0, MAX_BODY);
  if (!body) return res.status(400).json({ error: "Write something to start the thread." });
  if (!getStudent(sid) || !getWeek(wid)) return res.status(404).json({ error: "No such cell." });

  const { thread, comment } = createThreadWithComment({
    student_id: sid, week_id: wid, title, created_by: req.session.name, body,
  });
  res.json({ ok: true, thread, comment });
});

router.post("/api/threads/:id/comments", postLimiter, requireSession, (req, res) => {
  const tid = Number(req.params.id);
  const body = String(req.body.body || "").trim().slice(0, MAX_BODY);
  if (!body) return res.status(400).json({ error: "Write a reply." });
  if (!getThread(tid)) return res.status(404).json({ error: "Thread not found." });

  const comment = insertComment(tid, req.session.name, body);
  res.json({ ok: true, comment });
});

export default router;
