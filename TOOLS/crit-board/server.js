// crit-board — server entry (Express).
//
// Wires sessions, the API routers, the authenticated image route, and the static
// front-end. All persistent data lives under DATA_DIR (see paths.js). The static
// front-end (login screen) is the only thing served without a session; every /api
// route and /img/:id is gated by requireSession (admin additionally by instructor).
//
// Routes:
//   POST /api/login · /api/pick-name · /api/logout · GET /api/session
//   GET  /api/board · /api/cell
//   POST /api/cell/images (multipart) · GET /img/:id · DELETE /api/images/:id · PUT /api/cell/images/order
//   POST /api/cell/threads · /api/threads/:id/comments
//   /api/admin/* (instructor only)
import "./loadenv.js"; // must be first: populates process.env before other modules read it
import express from "express";
import { PUBLIC_DIR } from "./paths.js";
import { sessionMiddleware } from "./auth.js";
import { MAX_UPLOAD_MB } from "./upload.js";
import authRoutes from "./routes/auth.routes.js";
import boardRoutes from "./routes/board.routes.js";
import imageRoutes from "./routes/images.routes.js";
import commentRoutes from "./routes/comments.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.set("trust proxy", 1);          // behind a TLS-terminating proxy in production
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(sessionMiddleware);

// API + authenticated image serving (each router declares full paths).
app.use(authRoutes);
app.use(boardRoutes);
app.use(imageRoutes);
app.use(commentRoutes);
app.use(adminRoutes);

// Static front-end (unauthenticated: the login screen must load). No directory
// listing; uploads live OUTSIDE PUBLIC_DIR and are never served statically.
app.use(express.static(PUBLIC_DIR, { index: "index.html" }));

// Unmatched API routes -> JSON 404 (so the SPA never gets HTML for an API call).
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
app.use("/img", (req, res) => res.status(404).json({ error: "Not found." }));

// Final error handler — turn multer limits into clean JSON, hide everything else.
app.use((err, req, res, _next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: `That image is too large (max ${MAX_UPLOAD_MB} MB).` });
  }
  if (err && err.code === "LIMIT_FILE_COUNT") {
    return res.status(413).json({ error: "Too many files in one upload." });
  }
  if (err && err.name === "MulterError") {
    return res.status(400).json({ error: "Upload error: " + err.message });
  }
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal error." });
});

app.listen(PORT, () => {
  console.log(`\n  Studio Crit Board → http://localhost:${PORT}\n`);
  if (!process.env.SESSION_SECRET) console.warn("  ⚠  SESSION_SECRET not set — using an insecure dev default.");
  if (!process.env.STUDENT_PASSCODE && !process.env.INSTRUCTOR_PASSCODE) {
    console.warn("  ⚠  No passcodes set — set STUDENT_PASSCODE / INSTRUCTOR_PASSCODE (see .env.example).");
  }
});
