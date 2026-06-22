// Workshop platform — composition root.
//
// One node:http server hosts every tool. Requests are dispatched by URL slug:
//   GET  /                  → app launcher
//   GET  /rhino/ ...        → Rhino Wizard student UI (static)
//   GET  /rhino/instructor/ → Rhino Wizard instructor dashboard (static)
//   POST /api/rhino/*       → Rhino Wizard handlers
// Existing tools under TOOLS/*/web/ are unchanged; they can be mounted later by
// adding an apps/<tool>/index.js adapter and one line below.

import { createServer } from "node:http";

import * as rhino from "./apps/rhino-wizard/index.js";

const PORT = process.env.PORT || 3000;

const LAUNCHER = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Studio AI Tools</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 640px; margin: 12vh auto; padding: 0 20px; color: #1a1a1a; }
  h1 { font-size: 1.6rem; }
  a.card { display:block; border:1px solid #ddd; border-radius:10px; padding:16px 18px; margin:12px 0; text-decoration:none; color:inherit; }
  a.card:hover { border-color:#888; }
  .muted { color:#666; font-size:.92rem; }
</style>
<h1>Studio AI Tools</h1>
<p class="muted">A small set of tools for the design studio. AI is a material to interrogate — every claim is tagged; you keep the judgment.</p>
<a class="card" href="/rhino/"><strong>Rhino Wizard →</strong><div class="muted">Rhino / Grasshopper / GhPython tutor. Teaches the workflow, withholds the fish.</div></a>
<a class="card" href="/rhino/instructor/"><strong>Instructor dashboard →</strong><div class="muted">What the class is asking, where they're stuck, the sketches they upload.</div></a>
`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");

  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(LAUNCHER);
      return;
    }
    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    // Dispatch to mounted apps.
    if (await rhino.handle(req, res, url)) return;

    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Internal error" }));
    } else {
      try { res.end(); } catch {}
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  Studio AI platform → http://localhost:${PORT}\n`);
});
