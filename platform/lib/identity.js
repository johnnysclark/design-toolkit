// Lightweight identity: a shared class code + a student handle, no passwords.
// Also the one instructor gate (a shared password) for the dashboard endpoints.

import { one, query } from "./db.js";

// Look up a class by its join code.
export async function findClass(classCode) {
  if (!classCode || !classCode.trim()) return null;
  return one(`SELECT * FROM class_sessions WHERE class_code = $1`, [classCode.trim()]);
}

// Find or create a student within a class. Handle is unique per class.
export async function findOrCreateStudent({ classCode, handle, displayName }) {
  const cls = await findClass(classCode);
  if (!cls) throw new Error("Unknown class code.");
  if (!handle || !handle.trim()) throw new Error("A handle is required.");

  const h = handle.trim();
  const existing = await one(
    `SELECT * FROM students WHERE class_session_id = $1 AND handle = $2`,
    [cls.id, h]
  );
  if (existing) return { student: existing, class: cls };

  const student = await one(
    `INSERT INTO students (class_session_id, handle, display_name)
     VALUES ($1, $2, $3) RETURNING *`,
    [cls.id, h, (displayName || h).trim()]
  );
  return { student, class: cls };
}

// Verify a student belongs to a class (cheap guard on student-facing writes).
export async function studentInClass(studentId, classId) {
  const row = await one(
    `SELECT 1 FROM students WHERE id = $1 AND class_session_id = $2`,
    [studentId, classId]
  );
  return !!row;
}

// Instructor auth: a single shared password from the environment. Returns true
// when it matches. If INSTRUCTOR_PASSWORD is unset, the dashboard is locked.
export function instructorOk(provided) {
  const expected = process.env.INSTRUCTOR_PASSWORD;
  if (!expected) return false;
  return typeof provided === "string" && provided === expected;
}

export { query };
