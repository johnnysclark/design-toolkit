// crit-board — authentication & sessions (light auth for a trusted studio).
//
// Two shared passcodes (env): STUDENT_PASSCODE and INSTRUCTOR_PASSCODE. The signed
// cookie holds { ok, role, name }. Identity is a self-selected roster name — soft,
// not a security boundary; see README's trust model. Every API route and the image
// route is gated by requireSession; admin routes additionally require requireInstructor.
import cookieSession from "cookie-session";

export const sessionMiddleware = cookieSession({
  name: "critboard",
  secret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production", // secure cookie only over HTTPS (prod)
  maxAge: 30 * 24 * 60 * 60 * 1000,              // 30 days
});

// Logged in = a valid passcode was entered (cookie present, ok:true).
export function requireLoggedIn(req, res, next) {
  if (req.session && req.session.ok) return next();
  res.status(401).json({ error: "Not signed in." });
}

// Full session = logged in AND a name has been chosen (students must pick a name).
export function requireSession(req, res, next) {
  if (req.session && req.session.ok && req.session.name) return next();
  res.status(401).json({ error: "Not signed in." });
}

export function requireInstructor(req, res, next) {
  if (req.session && req.session.ok && req.session.role === "instructor") return next();
  res.status(403).json({ error: "Instructor access required." });
}
