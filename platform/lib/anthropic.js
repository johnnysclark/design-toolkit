// Shared Anthropic client + JSON parsing helpers.
//
// The tutor streams a single forced-schema call (see apps/rhino-wizard/index.js);
// parseJson/textOf are the only shared helpers it needs. The model is an env
// override so an instructor can drop to a cheaper model (e.g. claude-sonnet-4-6)
// for cost — withholding is enforced structurally by the schema, not by the
// model's capability, so the guarantee holds on a cheaper model.

import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.RHINO_MODEL || "claude-opus-4-8";

// Ceiling for a tutor answer. These schemas are short (a skeleton + a step + a
// few claims); 4000 is comfortably above what they need without inviting runaway
// output. Override with RHINO_MAX_TOKENS if a future schema grows.
export const MAX_TOKENS = Number(process.env.RHINO_MAX_TOKENS) || 4000;

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
