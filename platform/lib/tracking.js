// Generic writers any app can reuse to persist conversations, messages, assets,
// and events. Tool-agnostic: the `app` column namespaces rows so multiple tools
// share the same tables.

import { one, query } from "./db.js";

export async function createConversation({ studentId, mode, level, version }) {
  return one(
    `INSERT INTO conversations (student_id, mode, level, version)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [studentId, mode, level, version]
  );
}

export async function getConversation(id) {
  return one(`SELECT * FROM conversations WHERE id = $1`, [id]);
}

export async function setReportGate(conversationId, expectedSymptom) {
  await query(
    `UPDATE conversations
       SET awaiting_report = true, expected_symptom = $2, updated_at = now()
     WHERE id = $1`,
    [conversationId, expectedSymptom || ""]
  );
}

export async function clearReportGate(conversationId) {
  await query(
    `UPDATE conversations
       SET awaiting_report = false, expected_symptom = '', updated_at = now()
     WHERE id = $1`,
    [conversationId]
  );
}

export async function addUserMessage({ conversationId, question, mode, level, grounding, assetId }) {
  return one(
    `INSERT INTO messages (conversation_id, role, question, mode, level, grounding, asset_id)
     VALUES ($1, 'user', $2, $3, $4, $5, $6) RETURNING *`,
    [conversationId, question || "", mode, level, grounding, assetId || null]
  );
}

export async function addAssistantMessage({ conversationId, responseJson, mode, level, grounding, claims, topicTags }) {
  // node-pg serialization is type-driven, so the three "JSON-ish" columns each
  // need a different shape — do NOT "normalize" them:
  //   response_json (jsonb): a plain object → pg JSON-encodes it. Pass raw.
  //   claims        (jsonb): an array → pg would emit a Postgres array literal,
  //                          which is invalid for jsonb. Must JSON.stringify.
  //   topic_tags    (text[]): an array → pg emits an array literal. Pass raw.
  return one(
    `INSERT INTO messages (conversation_id, role, response_json, mode, level, grounding, claims, topic_tags)
     VALUES ($1, 'assistant', $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      conversationId,
      responseJson,
      mode,
      level,
      grounding,
      JSON.stringify(claims || []),
      topicTags || []
    ]
  );
}

export async function listMessages(conversationId) {
  const { rows } = await query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id ASC`,
    [conversationId]
  );
  return rows;
}

// Store an uploaded image (bytea) or pasted .ghx text.
export async function saveAsset({ studentId, app, kind, mediaType, buffer, textBody }) {
  return one(
    `INSERT INTO assets (student_id, app, kind, media_type, bytes, text_body, byte_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, kind, media_type, byte_size, created_at`,
    [
      studentId,
      app,
      kind,
      mediaType || "",
      buffer || null,
      textBody || null,
      buffer ? buffer.length : (textBody ? Buffer.byteLength(textBody) : 0)
    ]
  );
}

export async function getAsset(id) {
  return one(`SELECT * FROM assets WHERE id = $1`, [id]);
}

export async function recordTrace({ conversationId, messageId, expectedSymptom, observation, resolved }) {
  return one(
    `INSERT INTO learning_traces (conversation_id, message_id, expected_symptom, reported_observation, resolved)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [conversationId, messageId || null, expectedSymptom || "", observation || "", !!resolved]
  );
}

export async function logEvent({ studentId, app, kind, payload }) {
  await query(
    `INSERT INTO tool_events (student_id, app, kind, payload)
     VALUES ($1, $2, $3, $4)`,
    [studentId || null, app, kind, JSON.stringify(payload || {})]
  );
}
