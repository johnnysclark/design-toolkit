// Precedent Researcher — local web app server.
//
// Zero build step: `node server.js`, then open http://localhost:3000.
// Serves the static frontend from ./public and exposes POST /api/research.
//
// Requires ANTHROPIC_API_KEY in the environment.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

import {
  MODEL,
  DOSSIER_SCHEMA,
  ADVERSARIAL_SCHEMA,
  dossierSystem,
  dossierUser,
  ADVERSARIAL_SYSTEM,
  adversarialUser
} from "./prompts.js";

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n⚠  ANTHROPIC_API_KEY is not set. The UI will load, but /api/research will fail.\n" +
      "   Start with:  ANTHROPIC_API_KEY=sk-ant-… npm start\n"
  );
}

const client = new Anthropic();

// --- Model calls -----------------------------------------------------------

// Run a structured-output call. Web search (a server tool) and a forced JSON
// `output_config.format` can conflict, so in grounded mode we ask for JSON in the
// prompt and parse it from the text instead of forcing the format.
async function runStructured({ system, user, schema, grounded }) {
  const params = {
    model: MODEL,
    max_tokens: 20000,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: user }]
  };

  if (grounded) {
    params.tools = [{ type: "web_search_20260209", name: "web_search" }];
    params.messages[0].content +=
      "\n\nReturn your answer as a single JSON object matching the agreed schema, " +
      "inside a ```json code block. Do not include any other prose outside the block.";
  } else {
    params.output_config = { format: { type: "json_schema", schema } };
  }

  const stream = client.messages.stream(params);
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("The model declined this request (safety refusal).");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Output was truncated (hit max_tokens). Try fewer precedents.");
  }

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return parseJson(text);
}

function parseJson(text) {
  // Grounded mode wraps JSON in a code fence; structured mode returns bare JSON.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    // Last resort: grab the outermost {...}.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Could not parse a JSON dossier from the model response.");
  }
}

async function research({ topic, count, grounded }) {
  const dossier = await runStructured({
    system: dossierSystem(grounded),
    user: dossierUser(topic, count),
    schema: DOSSIER_SCHEMA,
    grounded
  });

  if (!Array.isArray(dossier.precedents)) {
    throw new Error("Model returned no precedents.");
  }

  // Adversarial pass is always ungrounded — it reasons over the dossier, not the web.
  const adversarial = await runStructured({
    system: ADVERSARIAL_SYSTEM,
    user: adversarialUser(topic, dossier),
    schema: ADVERSARIAL_SCHEMA,
    grounded: false
  });

  return {
    meta: {
      topic,
      count,
      grounded,
      model: MODEL,
      generated_at: new Date().toISOString()
    },
    dossier,
    adversarial
  };
}

// --- HTTP server -----------------------------------------------------------

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath === "/") urlPath = "/index.html";

  // Prevent path traversal: resolve under PUBLIC_DIR only.
  const filePath = normalize(join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] || "application/octet-stream",
      // No caching during local dev so edits always show on refresh.
      "Cache-Control": "no-store, must-revalidate"
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1_000_000) reject(new Error("Request too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/research") {
    try {
      const { topic, count, grounded } = JSON.parse((await readBody(req)) || "{}");
      if (!topic || !topic.trim()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "A research prompt is required." }));
        return;
      }
      const n = Math.min(Math.max(parseInt(count, 10) || 4, 1), 8);
      const result = await research({ topic: topic.trim(), count: n, grounded: !!grounded });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Internal error" }));
    }
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405).end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`\n  Precedent Researcher running →  http://localhost:${PORT}\n`);
});
