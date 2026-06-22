// Lightweight identity: a shared class code + a student handle, no passwords.
// Each student also gets an unguessable bearer token (returned at join, required
// on every student request) so integer ids are never treated as credentials.
// The instructor side is gated by one shared password (sent as a header).

import { randomUUID, timingSafeEqual } from "node:crypto";
import { one } from "./db.js";

// Look up a class by its join code.
export async function findClass(classCode) {
  if (!classCode || !classCode.trim()) return null;
  return one(`SELECT * FROM class_sessions WHERE class_code = $1`, [classCode.trim()]);
}

// Find or create a student within a class. Handle is unique per class; a token is
// minted on first creation. Returns { student, class } where student.token is set.
export async function findOrCreateStudent({ classCode, handle, displayName }) {
  const cls = await findClass(classCode);
  if (!cls) throw new Error("Unknown class code.");
  if (!handle || !handle.trim()) throw new Error("A handle is required.");

  const h = handle.trim();
  const existing = await one(
    `SELECT * FROM students WHERE class_session_id = $1 AND handle = $2`,
    [cls.id, h]
  );
  if (existing) {
    // Backfill a token for rows created before tokens existed.
    if (!existing.token) {
      const updated = await one(`UPDATE students SET token = $2 WHERE id = $1 RETURNING *`, [
        existing.id,
        randomUUID()
      ]);
      return { student: updated, class: cls };
    }
    return { student: existing, class: cls };
  }

  const student = await one(
    `INSERT INTO students (class_session_id, handle, display_name, token)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [cls.id, h, (displayName || h).trim(), randomUUID()]
  );
  return { student, class: cls };
}

// Resolve the caller's student from their bearer token (header or body fallback).
// Returns the student row or null. This is the student-side authn boundary.
export async function resolveStudent(req, body = {}) {
  const token =
    req.headers["x-student-token"] || body.student_token || null;
  if (!token || typeof token !== "string") return null;
  return one(`SELECT * FROM students WHERE token = $1`, [token]);
}

// Verify a student belongs to a class.
export async function studentInClass(studentId, classId) {
  const row = await one(
    `SELECT 1 FROM students WHERE id = $1 AND class_session_id = $2`,
    [studentId, classId]
  );
  return !!row;
}

// Constant-time string compare that won't throw on length mismatch.
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Instructor auth: a single shared password from the environment. Pass the value
// from the X-Instructor-Key header (or ?key= fallback for <img> contexts).
export function instructorOk(provided) {
  const expected = process.env.INSTRUCTOR_PASSWORD;
  if (!expected) return false; // unset == locked (a clear boot warning is logged)
  return typeof provided === "string" && safeEqual(provided, expected);
}

// Read the instructor key from a request (header preferred, query fallback).
export function instructorKeyFrom(req, url) {
  return req.headers["x-instructor-key"] || url.searchParams.get("key") || null;
}
