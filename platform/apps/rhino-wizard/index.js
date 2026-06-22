// Rhino Wizard — route handlers. Mounted by the platform server under /rhino/
// (static) and /api/rhino/* (API).
//
// The pedagogy lives in prompts.js; this file wires it to identity, persistence,
// multimodal input, SSE streaming, and the report-back gate.
//
// Authn: students authenticate with an unguessable bearer token (issued at join,
// sent as X-Student-Token). Integer ids are never trusted as credentials — every
// object is ownership-checked against the resolved student. The instructor side
// is gated by a shared key (X-Instructor-Key).

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  readJson,
  sendJson,
  sendError,
  serveStatic,
  sseInit,
  sseSend,
  sseEnd,
  sseHeartbeat
} from "../../lib/http.js";
import { client, MODEL, MAX_TOKENS, parseJson, textOf } from "../../lib/anthropic.js";
import {
  findOrCreateStudent,
  resolveStudent,
  instructorOk,
  instructorKeyFrom
} from "../../lib/identity.js";
import * as track from "../../lib/tracking.js";
import { MODES, LEVELS, buildSystem, schemaFor, gatesReportBack, expectedSymptomOf } from "./prompts.js";
import { retrieve, kbContext } from "./kb.js";
import * as instructor from "./instructor.js";

const APP = "rhino-wizard";
const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(here, "public");
const INSTRUCTOR_DIR = join(here, "instructor");

const VERSIONS = ["Rhino 8", "Rhino 7", "Rhino 6"];
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const toInt = (v) => (Number.isInteger(v) ? v : /^\d+$/.test(String(v)) ? Number(v) : null);

// --- Per-student rate limit (in-memory token bucket) -----------------------
// Protects the API budget against a student holding the enter key. Resets on
// restart, which is fine for studio scale.
const BUCKET_MAX = 8; // burst
const BUCKET_REFILL_MS = 6000; // ~1 request / 6s sustained
const buckets = new Map();
function rateLimited(key) {
  const now = Date.now();
  const b = buckets.get(key) || { tokens: BUCKET_MAX, ts: now };
  b.tokens = Math.min(BUCKET_MAX, b.tokens + (now - b.ts) / BUCKET_REFILL_MS);
  b.ts = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return true;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return false;
}

// --- Conversation context for the model ------------------------------------

// A short natural-language digest of a prior tutor answer — fed back instead of
// the full serialized schema object (cheaper, and the model reads prose, not its
// own JSON). NOTE: prior images are intentionally not re-sent on later turns
// (a deliberate cost choice); only the current turn's asset is attached.
function digestAnswer(a) {
  if (!a || typeof a !== "object") return "(previous answer)";
  const next = a.next_single_step || a.fill_this_in || a.pitfalls || "";
  const bits = [a.restatement, a.why && `Why: ${a.why}`, next && `Next: ${next}`].filter(Boolean);
  return bits.join(" ") || "(previous answer)";
}

function turnsFrom(rows) {
  const turns = [];
  for (const m of rows) {
    if (m.role === "user") {
      turns.push({ role: "user", content: m.question || "(attachment)" });
    } else if (m.response_json) {
      turns.push({ role: "assistant", content: digestAnswer(m.response_json) });
    }
  }
  return turns;
}

// Compose the current user turn, attaching an image and/or .ghx text if present.
function buildUserContent({ question, asset, ghxText, reportBack }) {
  const content = [];
  if (asset && asset.bytes) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: asset.media_type || "image/png", data: asset.bytes.toString("base64") }
    });
  }
  const ghx = ghxText || (asset && asset.kind === "ghx_text" ? asset.text_body : "");
  if (ghx) content.push({ type: "text", text: `Pasted Grasshopper definition (.ghx):\n${ghx.slice(0, 60000)}` });
  if (reportBack) content.push({ type: "text", text: `I tried it. What I observed: ${reportBack}` });
  content.push({ type: "text", text: question || "(see attached)" });
  return content;
}

// A report-back must be a real observation, not "ok" — otherwise the withholding
// gate is meaningless. Cheap structural check (the model still reads it).
function isRealObservation(s) {
  return typeof s === "string" && s.trim().length >= 8;
}

// --- POST /api/rhino/join --------------------------------------------------

async function joinClass(req, res) {
  const { class_code, handle, display_name } = await readJson(req);
  try {
    const { student, class: cls } = await findOrCreateStudent({
      classCode: class_code,
      handle,
      displayName: display_name
    });
    await track.logEvent({ studentId: student.id, app: APP, kind: "join", payload: { handle: student.handle } });
    sendJson(res, 200, {
      student_token: student.token, // the bearer secret — store and send on every request
      class_name: cls.name,
      display_name: student.display_name
    });
  } catch (err) {
    sendError(res, 400, err.message);
  }
}

// --- POST /api/rhino/upload (base64 JSON) ----------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Sniff a supported image type from magic bytes; returns null if unsupported.
function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

async function upload(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return sendError(res, err.code === "TOO_LARGE" ? 413 : 400, err.message);
  }

  const me = await resolveStudent(req, body);
  if (!me) return sendError(res, 401, "Sign in again (missing or invalid session).");

  const { kind, data, text } = body;
  try {
    if (kind === "ghx_text") {
      if (!text || !text.trim()) return sendError(res, 400, "Empty .ghx text.");
      const asset = await track.saveAsset({ studentId: me.id, app: APP, kind: "ghx_text", textBody: text });
      return sendJson(res, 200, { asset_id: asset.id, kind: asset.kind });
    }

    if (!data) return sendError(res, 400, "No image data.");
    const buffer = Buffer.from(data, "base64");
    if (buffer.length > MAX_IMAGE_BYTES) return sendError(res, 413, "Image too large (max 5MB). Please downscale.");
    const mediaType = sniffImage(buffer);
    if (!mediaType) return sendError(res, 415, "Unsupported image type (use PNG, JPEG, GIF, or WebP).");

    const asset = await track.saveAsset({
      studentId: me.id,
      app: APP,
      kind: kind === "gh_screenshot" ? "gh_screenshot" : "sketch",
      mediaType,
      buffer
    });
    sendJson(res, 200, { asset_id: asset.id, kind: asset.kind, byte_size: asset.byte_size });
  } catch (err) {
    sendError(res, 500, err.message || "Upload failed.");
  }
}

// --- GET /api/rhino/asset/:id (instructor only) ----------------------------
// Students never fetch assets by URL (their thread shows the local file), so the
// only consumer is the instructor dashboard. Gate it by the instructor key to
// close the enumeration hole.

async function serveAsset(req, res, url, id) {
  if (!instructorOk(instructorKeyFrom(req, url))) {
    return res.writeHead(401, { "Content-Type": "text/plain" }).end("Instructor key required.");
  }
  const asset = await track.getAsset(id);
  if (!asset) return res.writeHead(404).end("Not found");
  if (asset.kind === "ghx_text") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end(asset.text_body || "");
  }
  res.writeHead(200, { "Content-Type": asset.media_type || "application/octet-stream", "Cache-Control": "private, max-age=3600" });
  res.end(asset.bytes);
}

// --- POST /api/rhino/ask (SSE) ---------------------------------------------

async function ask(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return sendError(res, err.code === "TOO_LARGE" ? 413 : 400, err.message);
  }

  const me = await resolveStudent(req, body);
  if (!me) return sendError(res, 401, "Sign in again (missing or invalid session).");
  if (rateLimited(me.token)) return sendError(res, 429, "Slow down a moment, then try again.");

  const mode = pick(body.mode, MODES, "grasshopper");
  const level = pick(body.level, LEVELS, "beginner");
  const version = pick(body.version, VERSIONS, "Rhino 8");
  const grounded = !!body.grounded;
  const question = typeof body.question === "string" ? body.question : "";
  const ghx_text = typeof body.ghx_text === "string" ? body.ghx_text : "";
  const report_back = typeof body.report_back === "string" ? body.report_back : "";
  const asset_id = toInt(body.asset_id);
  const conversation_id = toInt(body.conversation_id);

  if (!question && !asset_id && !ghx_text && !report_back) {
    return sendError(res, 400, "A question, sketch, or definition is required.");
  }

  // Resolve / create the conversation — and assert ownership.
  let conversation;
  if (conversation_id != null) {
    conversation = await track.getConversation(conversation_id);
    if (!conversation) return sendError(res, 404, "Conversation not found.");
    if (conversation.student_id !== me.id) return sendError(res, 403, "Not your conversation.");
  } else {
    conversation = await track.createConversation({ studentId: me.id, mode, level, version });
  }

  // Report-back gate. No report (or a trivial one) → no continuation.
  if (conversation.awaiting_report) {
    if (!report_back) {
      return sendJson(res, 409, {
        needs_report: true,
        conversation_id: conversation.id,
        prompt: conversation.expected_symptom || "Tell me what happened when you tried the last step."
      });
    }
    if (!isRealObservation(report_back)) {
      return sendJson(res, 409, {
        needs_report: true,
        conversation_id: conversation.id,
        prompt: "Give a concrete observation — what you actually saw or measured (e.g. the branch count, the error text) — not just 'ok'."
      });
    }
  }

  // Load + ownership-check any attached asset.
  let asset = null;
  if (asset_id != null) {
    asset = await track.getAsset(asset_id);
    if (!asset) return sendError(res, 404, "Attachment not found.");
    if (asset.student_id !== me.id) return sendError(res, 403, "Not your attachment.");
  }

  const grounding = grounded ? "kb" : "off";
  const kbRows = grounded ? retrieve({ mode, question }) : [];
  const system = buildSystem({ mode, level, grounding, version, kbContext: kbContext(kbRows) });

  // Build the model messages from history BEFORE persisting the new turn, so the
  // current question isn't sent twice. Also grab the prior assistant message id
  // for trace linkage.
  const history = await track.listMessages(conversation.id);
  const priorAssistant = [...history].reverse().find((m) => m.role === "assistant");
  const messages = [
    ...turnsFrom(history),
    { role: "user", content: buildUserContent({ question, asset, ghxText: ghx_text, reportBack: report_back }) }
  ];

  // Persist the user's turn (so the trace captures it even if the model fails).
  await track.addUserMessage({
    conversationId: conversation.id,
    question: question || "",
    mode,
    level,
    grounding,
    assetId: asset_id || null
  });

  const wasAwaiting = conversation.awaiting_report;
  const schema = schemaFor(level);

  // Stream: advisory token frames for a live feel, then the authoritative parsed
  // object as the terminal `result` frame (the client renders from `result`,
  // never assembling a "solution" from raw deltas — withholding stays intact).
  sseInit(res);
  sseSend(res, "meta", { conversation_id: conversation.id, mode, level, version, grounded });
  const heartbeat = sseHeartbeat(res);

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      system,
      messages,
      output_config: { format: { type: "json_schema", schema } }
    });

    stream.on("text", (delta) => sseSend(res, "token", { t: delta }));

    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw new Error("The model declined this request.");
    if (message.stop_reason === "max_tokens") throw new Error("Answer was truncated.");

    const answer = parseJson(textOf(message));

    const saved = await track.addAssistantMessage({
      conversationId: conversation.id,
      responseJson: answer,
      mode,
      level,
      grounding,
      claims: answer.claims || [],
      topicTags: answer.topic_tags || []
    });

    // The report-back (if any) resolved the PRIOR gate — record the trace now that
    // the turn succeeded, linked to the message that armed it.
    if (wasAwaiting && report_back) {
      await track.recordTrace({
        conversationId: conversation.id,
        messageId: priorAssistant ? priorAssistant.id : null,
        expectedSymptom: conversation.expected_symptom,
        observation: report_back,
        resolved: true
      });
    }

    // Arm/clear the gate for the new answer.
    if (gatesReportBack(level)) {
      await track.setReportGate(conversation.id, expectedSymptomOf(answer, level));
    } else {
      await track.clearReportGate(conversation.id);
    }

    sseSend(res, "result", { level, answer, message_id: saved.id, kb: kbRows.map((r) => r.id) });
  } catch (err) {
    console.error("ask error:", err.message);
    sseSend(res, "error", { message: err.message || "Model call failed." });
  } finally {
    clearInterval(heartbeat);
    sseEnd(res);
  }
}

// --- GET /api/rhino/conversation/:id (owner only) --------------------------

async function getConversationTranscript(req, res, id) {
  const me = await resolveStudent(req, {});
  if (!me) return sendError(res, 401, "Sign in again (missing or invalid session).");
  const conversation = await track.getConversation(id);
  if (!conversation) return sendError(res, 404, "Conversation not found.");
  if (conversation.student_id !== me.id) return sendError(res, 403, "Not your conversation.");
  const messages = await track.listMessages(id);
  sendJson(res, 200, { conversation, messages });
}

// --- Router ----------------------------------------------------------------

export async function handle(req, res, url) {
  const path = url.pathname;

  // Static UI.
  if (req.method === "GET" && (path === "/rhino" || path === "/rhino/")) {
    await serveStatic(res, PUBLIC_DIR, "/index.html");
    return true;
  }
  if (req.method === "GET" && (path === "/rhino/instructor" || path === "/rhino/instructor/")) {
    await serveStatic(res, INSTRUCTOR_DIR, "/index.html");
    return true;
  }
  if (req.method === "GET" && path.startsWith("/rhino/instructor/")) {
    await serveStatic(res, INSTRUCTOR_DIR, path.slice("/rhino/instructor".length));
    return true;
  }
  if (req.method === "GET" && path.startsWith("/rhino/")) {
    await serveStatic(res, PUBLIC_DIR, path.slice("/rhino".length));
    return true;
  }

  // Student API.
  if (req.method === "POST" && path === "/api/rhino/join") return joinClass(req, res), true;
  if (req.method === "POST" && path === "/api/rhino/upload") return upload(req, res), true;
  if (req.method === "POST" && path === "/api/rhino/ask") return ask(req, res), true;

  const assetMatch = path.match(/^\/api\/rhino\/asset\/(\d+)$/);
  if (req.method === "GET" && assetMatch) {
    await serveAsset(req, res, url, Number(assetMatch[1]));
    return true;
  }
  const convMatch = path.match(/^\/api\/rhino\/conversation\/(\d+)$/);
  if (req.method === "GET" && convMatch) {
    await getConversationTranscript(req, res, Number(convMatch[1]));
    return true;
  }

  // Instructor analytics (auth-gated inside).
  if (req.method === "GET" && path.startsWith("/api/rhino/instructor/")) {
    return instructor.handle(req, res, url), true;
  }

  return false;
}
