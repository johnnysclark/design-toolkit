// Shared HTTP helpers for the platform server.
//
// readBody + serveStatic + MIME are lifted from TOOLS/precedent-librarian/web/server.js
// so the platform keeps the same zero-build, vanilla-node ethos. SSE helpers are new:
// the tutor streams tokens to the browser for a live "typing" affordance.

import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

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

// Read a request body with a hard size cap so a runaway upload can't OOM us.
// Images go through /upload as base64 JSON, so 12MB covers a 5MB image + overhead.
export function readBody(req, limit = 12_000_000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > limit) reject(new Error("Request too large"));
    });
    req.on("end", () => resolve(data));
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
  if (!filePath.startsWith(dir)) {
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
    Connection: "keep-alive"
  });
}

export function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sseEnd(res) {
  res.end();
}
