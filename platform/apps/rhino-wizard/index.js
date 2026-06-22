// Rhino Wizard — route handlers. Mounted by the platform server under /rhino/
// (static) and /api/rhino/* (API).
//
// The pedagogy lives in prompts.js; this file wires it to identity, persistence,
// multimodal input, SSE streaming, and the report-back gate.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { readJson, sendJson, sendError, serveStatic, sseInit, sseSend, sseEnd } from "../../lib/http.js";
import { client, MODEL, parseJson, textOf } from "../../lib/anthropic.js";
import { findOrCreateStudent, instructorOk, studentInClass } from "../../lib/identity.js";
import * as track from "../../lib/tracking.js";
import { query, one } from "../../lib/db.js";
import {
  buildSystem,
  schemaFor,
  gatesReportBack,
  expectedSymptomOf
} from "./prompts.js";
import { retrieve, kbContext } from "./kb.js";
import * as instructor from "./instructor.js";

const APP = "rhino-wizard";
const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(here, "public");
const INSTRUCTOR_DIR = join(here, "instructor");

// --- Multimodal message construction ---------------------------------------

// Build the prior conversation turns for the model from stored messages.
async function priorTurns(conversationId) {
  const rows = await track.listMessages(conversationId);
  const turns = [];
  for (const m of rows) {
    if (m.role === "user") {
      turns.push({ role: "user", content: m.question || "(no text)" });
    } else if (m.response_json) {
      // Feed back a compact summary so the model has context without re-streaming.
      turns.push({ role: "assistant", content: JSON.stringify(m.response_json) });
    }
  }
  return turns;
}

// Compose the current user turn, attaching an image and/or .ghx text if present.
async function buildUserContent({ question, asset, ghxText, reportBack }) {
  const content = [];
  if (asset && asset.bytes) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: asset.media_type || "image/png",
        data: asset.bytes.toString("base64")
      }
    });
  }
  const ghx = ghxText || (asset && asset.kind === "ghx_text" ? asset.text_body : "");
  if (ghx) {
    content.push({ type: "text", text: `Pasted Grasshopper definition (.ghx):\n${ghx.slice(0, 60000)}` });
  }
  if (reportBack) {
    content.push({ type: "text", text: `I tried it. What I observed: ${reportBack}` });
  }
  content.push({ type: "text", text: question || "(see attached)" });
  return content;
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
      student_id: student.id,
      class_id: cls.id,
      class_name: cls.name,
      display_name: student.display_name
    });
  } catch (err) {
    sendError(res, 400, err.message);
  }
}

// --- POST /api/rhino/upload (base64 JSON) ----------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function upload(req, res) {
  const body = await readJson(req);
  const { student_id, kind, media_type, data, text } = body;
  if (!student_id) return sendError(res, 400, "student_id is required.");

  try {
    if (kind === "ghx_text") {
      if (!text || !text.trim()) return sendError(res, 400, "Empty .ghx text.");
      const asset = await track.saveAsset({
        studentId: student_id,
        app: APP,
        kind: "ghx_text",
        textBody: text
      });
      return sendJson(res, 200, { asset_id: asset.id, kind: asset.kind });
    }

    // Image kinds: 'sketch' or 'gh_screenshot'.
    if (!data) return sendError(res, 400, "No image data.");
    const buffer = Buffer.from(data, "base64");
    if (buffer.length > MAX_IMAGE_BYTES) {
      return sendError(res, 413, "Image too large (max 5MB). Please downscale.");
    }
    const asset = await track.saveAsset({
      studentId: student_id,
      app: APP,
      kind: kind === "gh_screenshot" ? "gh_screenshot" : "sketch",
      mediaType: media_type || "image/png",
      buffer
    });
    sendJson(res, 200, { asset_id: asset.id, kind: asset.kind, byte_size: asset.byte_size });
  } catch (err) {
    sendError(res, 500, err.message || "Upload failed.");
  }
}

// --- GET /api/rhino/asset/:id ----------------------------------------------

async function serveAsset(res, id) {
  const asset = await track.getAsset(id);
  if (!asset) return res.writeHead(404).end("Not found");
  if (asset.kind === "ghx_text") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end(asset.text_body || "");
  }
  res.writeHead(200, {
    "Content-Type": asset.media_type || "application/octet-stream",
    "Cache-Control": "private, max-age=3600"
  });
  res.end(asset.bytes);
}

// --- POST /api/rhino/ask (SSE) ---------------------------------------------

async function ask(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendError(res, 400, "Bad request body.");
  }

  const {
    student_id,
    conversation_id,
    mode = "grasshopper",
    level = "beginner",
    version = "Rhino 8",
    grounded = false,
    question,
    asset_id,
    ghx_text,
    report_back
  } = body;

  if (!student_id) return sendError(res, 400, "student_id is required.");
  if (!question && !asset_id && !ghx_text) {
    return sendError(res, 400, "A question, sketch, or definition is required.");
  }

  // Resolve / create the conversation.
  let conversation;
  if (conversation_id) {
    conversation = await track.getConversation(conversation_id);
    if (!conversation) return sendError(res, 404, "Conversation not found.");
  } else {
    conversation = await track.createConversation({ studentId: student_id, mode, level, version });
  }

  // The report-back gate: if the last answer is awaiting a report and the
  // student supplied none, refuse to continue (no report, no continuation).
  if (conversation.awaiting_report && !report_back) {
    return sendJson(res, 409, {
      needs_report: true,
      conversation_id: conversation.id,
      prompt: conversation.expected_symptom || "Tell me what happened when you tried the last step."
    });
  }

  // Load any attached asset.
  const asset = asset_id ? await track.getAsset(asset_id) : null;

  // Grounding: prompt-inject KB rows (keeps the forced schema intact).
  const grounding = grounded ? "kb" : "off";
  const kbRows = grounded ? retrieve({ mode, question }) : [];
  const system = buildSystem({ mode, level, grounding, version, kbContext: kbContext(kbRows) });

  // Persist the user's turn first (so the trace captures it even on failure).
  await track.addUserMessage({
    conversationId: conversation.id,
    question: question || "",
    mode,
    level,
    grounding,
    assetId: asset_id || null
  });

  // If this turn carries a report-back, record the trace and clear the gate.
  if (report_back && conversation.awaiting_report) {
    await track.recordTrace({
      conversationId: conversation.id,
      expectedSymptom: conversation.expected_symptom,
      observation: report_back,
      resolved: true
    });
    await track.clearReportGate(conversation.id);
  }

  const messages = [
    ...(await priorTurns(conversation.id)),
    { role: "user", content: await buildUserContent({ question, asset, ghxText: ghx_text, reportBack: report_back }) }
  ];

  const schema = schemaFor(level);

  // Stream: advisory token frames for a live feel, then the authoritative parsed
  // object as the terminal `result` frame (the client renders from `result`,
  // never assembling a "solution" from raw deltas — withholding stays intact).
  sseInit(res);
  sseSend(res, "meta", { conversation_id: conversation.id, mode, level, version, grounded });

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 20000,
      thinking: { type: "adaptive" },
      system,
      messages,
      output_config: { format: { type: "json_schema", schema } }
    });

    stream.on("text", (delta) => {
      // Advisory only — a typing shimmer. Not assembled into a solution client-side.
      sseSend(res, "token", { t: delta });
    });

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

    // Arm the report-back gate for Beginner/Moderate.
    if (gatesReportBack(level)) {
      const symptom = expectedSymptomOf(answer, level);
      await track.setReportGate(conversation.id, symptom);
    } else {
      await track.clearReportGate(conversation.id);
    }

    sseSend(res, "result", { level, answer, message_id: saved.id, kb: kbRows.map((r) => r.id) });
    sseEnd(res);
  } catch (err) {
    sseSend(res, "error", { message: err.message || "Model call failed." });
    sseEnd(res);
  }
}

// --- POST /api/rhino/report-back -------------------------------------------

async function reportBack(req, res) {
  const { conversation_id, message_id, observation } = await readJson(req);
  if (!conversation_id || !observation) {
    return sendError(res, 400, "conversation_id and observation are required.");
  }
  const conversation = await track.getConversation(conversation_id);
  if (!conversation) return sendError(res, 404, "Conversation not found.");
  await track.recordTrace({
    conversationId: conversation_id,
    messageId: message_id,
    expectedSymptom: conversation.expected_symptom,
    observation,
    resolved: true
  });
  await track.clearReportGate(conversation_id);
  sendJson(res, 200, { ok: true });
}

// --- GET /api/rhino/conversation/:id ---------------------------------------

async function getConversationTranscript(res, id) {
  const conversation = await track.getConversation(id);
  if (!conversation) return sendError(res, 404, "Conversation not found.");
  const messages = await track.listMessages(id);
  sendJson(res, 200, { conversation, messages });
}

// --- Router ----------------------------------------------------------------

// Returns true if it handled the request.
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
  if (req.method === "POST" && path === "/api/rhino/report-back") return reportBack(req, res), true;

  const assetMatch = path.match(/^\/api\/rhino\/asset\/(\d+)$/);
  if (req.method === "GET" && assetMatch) {
    await serveAsset(res, Number(assetMatch[1]));
    return true;
  }
  const convMatch = path.match(/^\/api\/rhino\/conversation\/(\d+)$/);
  if (req.method === "GET" && convMatch) {
    await getConversationTranscript(res, Number(convMatch[1]));
    return true;
  }

  // Instructor analytics (auth-gated inside).
  if (req.method === "GET" && path.startsWith("/api/rhino/instructor/")) {
    return instructor.handle(req, res, url), true;
  }

  return false;
}

export { instructorOk, studentInClass, query, one };
