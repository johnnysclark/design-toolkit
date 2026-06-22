// Shared Anthropic client + structured-output helpers.
//
// runStructured / parseJson are lifted from TOOLS/precedent-librarian/web/server.js.
// Ungrounded calls force a JSON schema via output_config.format. Grounded calls
// (web_search) can't force a format, so they ask for fenced JSON and parse it.
// The tutor's KB grounding is prompt-injected text (not the web_search tool), so
// the tutor keeps the forced schema even when grounded — preserving the
// withholding-by-schema guarantee.

import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n⚠  ANTHROPIC_API_KEY is not set. The UI loads, but model calls will fail.\n" +
      "   Start with:  ANTHROPIC_API_KEY=sk-ant-… npm start\n"
  );
}

export const client = new Anthropic();

// Parse a JSON object from model text. Handles bare JSON and ```json fences.
export function parseJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Could not parse a JSON object from the model response.");
  }
}

// Collect text blocks from a finished message.
export function textOf(message) {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// One structured call. `messages` are full Anthropic message objects (so callers
// can include image content blocks). Returns the parsed object.
export async function runStructured({ system, messages, schema, webSearch = false }) {
  const params = {
    model: MODEL,
    max_tokens: 20000,
    thinking: { type: "adaptive" },
    system,
    messages
  };

  if (webSearch) {
    params.tools = [{ type: "web_search_20260209", name: "web_search" }];
  } else {
    params.output_config = { format: { type: "json_schema", schema } };
  }

  const stream = client.messages.stream(params);
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("The model declined this request (safety refusal).");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Output was truncated (hit max_tokens).");
  }
  return parseJson(textOf(message));
}
