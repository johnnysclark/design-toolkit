// crit-board — auth routes.
//   POST /api/login        { passcode } -> sets cookie { ok, role, name? }
//   POST /api/pick-name    { name }     -> student picks a roster name
//   POST /api/logout                    -> clears the cookie
//   GET  /api/session                   -> current session (or { ok:false })
import { Router } from "express";
import { getStudents } from "../db.js";
import { requireLoggedIn } from "../auth.js";
import { rateLimit } from "../ratelimit.js";

const router = Router();
const loginLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, message: "Too many attempts — wait a few minutes." });

router.post("/api/login", loginLimiter, (req, res) => {
  const passcode = String((req.body && req.body.passcode) || "").trim();
  if (!passcode) return res.status(400).json({ error: "Enter the passcode." });

  const instructor = process.env.INSTRUCTOR_PASSCODE || "";
  const student = process.env.STUDENT_PASSCODE || "";

  if (instructor && passcode === instructor) {
    req.session = { ok: true, role: "instructor", name: "Instructor" };
    return res.json({ ok: true, role: "instructor", name: "Instructor", needsName: false });
  }
  if (student && passcode === student) {
    req.session = { ok: true, role: "student" };
    return res.json({ ok: true, role: "student", needsName: true });
  }
  res.status(401).json({ error: "That passcode didn't match." });
});

router.post("/api/pick-name", requireLoggedIn, (req, res) => {
  const name = String((req.body && req.body.name) || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Pick a name." });
  if (req.session.role === "student" && !getStudents().some((s) => s.name === name)) {
    return res.status(400).json({ error: "That name isn't on the roster." });
  }
  req.session.name = name;
  res.json({ ok: true, name });
});

router.post("/api/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

router.get("/api/session", (req, res) => {
  if (req.session && req.session.ok) {
    return res.json({
      ok: true,
      role: req.session.role,
      name: req.session.name || null,
      needsName: !req.session.name,
    });
  }
  res.json({ ok: false });
});

export default router;
