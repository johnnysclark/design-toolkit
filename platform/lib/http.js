// Shared HTTP helpers for the platform server.
//
// readBody + serveStatic + MIME are lifted from TOOLS/precedent-librarian/web/server.js
// so the platform keeps the same zero-build, vanilla-node ethos. SSE helpers are new:
// the tutor streams tokens to the browser for a live "typing" affordance.

import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

export const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

// Read a request body with a hard, BYTE-accurate size cap so a runaway upload
// can't OOM us. A 5MB image is ~6.7MB of base64; 12MB covers it + JSON overhead.
// On overflow we destroy the socket and reject with a TOO_LARGE error so callers
// can map it to a 413.
export function readBody(req, limit = 12_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length; // c is a Buffer — real bytes, not string length
      if (size > limit) {
        const err = new Error("Request too large");
        err.code = "TOO_LARGE";
        req.destroy();
        reject(err);
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export async function readJson(req) {
  const raw = (await readBody(req)) || "{}";
  return JSON.parse(raw);
}

export function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

export function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

// Serve a static file from `dir`, mapping a URL path to a file. Prevents path
// traversal by resolving under `dir` only (same guard as the precedent server).
export async function serveStatic(res, dir, urlPath) {
  let p = decodeURIComponent(urlPath);
  if (p === "" || p === "/") p = "/index.html";
  const filePath = normalize(join(dir, p));
  // Resolve strictly under `dir` (exact dir or a child) — not a loose string
  // prefix that `${dir}-secrets` would satisfy.
  if (filePath !== dir && !filePath.startsWith(dir + sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store, must-revalidate"
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

// --- Server-Sent Events ----------------------------------------------------

export function sseInit(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no" // disable proxy buffering so frames flush promptly
  });
}

export function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sseEnd(res) {
  res.end();
}

// A comment frame (ignored by EventSource/clients) used as a heartbeat so proxies
// don't time out long adaptive-thinking gaps before the first token. Returns a
// timer the caller must clear when the stream ends.
export function sseHeartbeat(res, ms = 15000) {
  return setInterval(() => {
    try {
      res.write(`: keepalive\n\n`);
    } catch {
      /* socket gone — caller's clear() will fire */
    }
  }, ms);
}
