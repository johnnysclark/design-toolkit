// Instructor analytics for Rhino Wizard. All endpoints are gated by the shared
// INSTRUCTOR_PASSWORD (X-Instructor-Key header, ?key= fallback for <img>). Reads
// only — never mutates student data.

import { sendJson, sendError } from "../../lib/http.js";
import { instructorOk, instructorKeyFrom, findClass } from "../../lib/identity.js";
import { query } from "../../lib/db.js";

const APP = "rhino-wizard";

async function classId(classCode) {
  const cls = await findClass(classCode);
  return cls ? cls.id : null;
}

// GET /api/rhino/instructor/overview?class_code=
async function overview(res, cid) {
  const { rows } = await query(
    `SELECT
       (SELECT count(*) FROM students s WHERE s.class_session_id = $1) AS students,
       (SELECT count(*) FROM conversations c
          JOIN students s ON s.id = c.student_id WHERE s.class_session_id = $1) AS conversations,
       (SELECT count(*) FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          JOIN students s ON s.id = c.student_id
          WHERE s.class_session_id = $1 AND m.role = 'user') AS questions,
       (SELECT count(*) FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          JOIN students s ON s.id = c.student_id
          WHERE s.class_session_id = $1 AND m.role = 'user'
            AND m.created_at::date = now()::date) AS questions_today,
       (SELECT count(*) FROM conversations c
          JOIN students s ON s.id = c.student_id
          WHERE s.class_session_id = $1 AND c.awaiting_report = true) AS open_gates`,
    [cid]
  );
  sendJson(res, 200, rows[0]);
}

// GET /api/rhino/instructor/sticking-points?class_code=
// Distinct-student counts per concept tag — "23 students hit graft/flatten".
async function stickingPoints(res, cid) {
  const { rows } = await query(
    `SELECT tag,
            count(DISTINCT c.student_id) AS students,
            count(*) AS occurrences
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN students s ON s.id = c.student_id,
            unnest(m.topic_tags) AS tag
      WHERE s.class_session_id = $1 AND m.role = 'assistant'
      GROUP BY tag
      ORDER BY students DESC, occurrences DESC`,
    [cid]
  );
  sendJson(res, 200, { tags: rows });
}

// GET /api/rhino/instructor/matrix?class_code=  — 3×3 mode×level question counts
async function matrix(res, cid) {
  const { rows } = await query(
    `SELECT m.mode, m.level, count(*) AS n
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN students s ON s.id = c.student_id
      WHERE s.class_session_id = $1 AND m.role = 'user'
      GROUP BY m.mode, m.level`,
    [cid]
  );
  sendJson(res, 200, { cells: rows });
}

// GET /api/rhino/instructor/questions?class_code=&limit=
async function questions(res, cid, limit) {
  const { rows } = await query(
    `SELECT m.id, m.question, m.mode, m.level, m.asset_id, m.created_at,
            s.display_name, s.handle, s.id AS student_id
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN students s ON s.id = c.student_id
      WHERE s.class_session_id = $1 AND m.role = 'user'
      ORDER BY m.id DESC
      LIMIT $2`,
    [cid, Math.min(Math.max(limit || 50, 1), 200)]
  );
  sendJson(res, 200, { questions: rows });
}

// GET /api/rhino/instructor/assets?class_code=
async function assets(res, cid) {
  const { rows } = await query(
    `SELECT a.id, a.kind, a.media_type, a.byte_size, a.created_at,
            s.display_name, s.handle, s.id AS student_id
       FROM assets a
       JOIN students s ON s.id = a.student_id
      WHERE s.class_session_id = $1 AND a.app = $2 AND a.kind <> 'ghx_text'
      ORDER BY a.id DESC
      LIMIT 200`,
    [cid, APP]
  );
  sendJson(res, 200, { assets: rows });
}

// GET /api/rhino/instructor/student/:id — full per-student trace
async function student(res, cid, sid) {
  const head = await query(
    `SELECT id, display_name, handle FROM students WHERE id = $1 AND class_session_id = $2`,
    [sid, cid]
  );
  if (!head.rows[0]) return sendError(res, 404, "Student not in this class.");

  const msgs = await query(
    `SELECT m.id, m.role, m.question, m.response_json, m.mode, m.level, m.asset_id,
            m.claims, m.topic_tags, m.created_at, c.id AS conversation_id
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
      WHERE c.student_id = $1
      ORDER BY m.id ASC`,
    [sid]
  );
  const traces = await query(
    `SELECT t.* FROM learning_traces t
       JOIN conversations c ON c.id = t.conversation_id
      WHERE c.student_id = $1 ORDER BY t.id ASC`,
    [sid]
  );
  sendJson(res, 200, { student: head.rows[0], messages: msgs.rows, traces: traces.rows });
}

// GET /api/rhino/instructor/class?class_code= — roster for the student picker
async function roster(res, cid) {
  const { rows } = await query(
    `SELECT s.id, s.display_name, s.handle,
            count(DISTINCT c.id) AS conversations,
            count(m.id) FILTER (WHERE m.role = 'user') AS questions
       FROM students s
       LEFT JOIN conversations c ON c.student_id = s.id
       LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE s.class_session_id = $1
      GROUP BY s.id
      ORDER BY questions DESC NULLS LAST`,
    [cid]
  );
  sendJson(res, 200, { students: rows });
}

export async function handle(req, res, url) {
  if (!process.env.INSTRUCTOR_PASSWORD) {
    return sendError(res, 503, "Instructor dashboard not configured (INSTRUCTOR_PASSWORD unset on the server).");
  }
  if (!instructorOk(instructorKeyFrom(req, url))) return sendError(res, 401, "Instructor key required.");

  const classCode = url.searchParams.get("class_code");
  const cid = await classId(classCode);
  if (!cid) return sendError(res, 400, "Unknown class_code.");

  const path = url.pathname;
  try {
    if (path.endsWith("/overview")) return overview(res, cid);
    if (path.endsWith("/sticking-points")) return stickingPoints(res, cid);
    if (path.endsWith("/matrix")) return matrix(res, cid);
    if (path.endsWith("/questions")) {
      return questions(res, cid, Number(url.searchParams.get("limit")) || 50);
    }
    if (path.endsWith("/assets")) return assets(res, cid);
    if (path.endsWith("/class")) return roster(res, cid);
    const sMatch = path.match(/\/student\/(\d+)$/);
    if (sMatch) return student(res, cid, Number(sMatch[1]));
    return sendError(res, 404, "Unknown analytics endpoint.");
  } catch (err) {
    sendError(res, 500, err.message || "Analytics error.");
  }
}
