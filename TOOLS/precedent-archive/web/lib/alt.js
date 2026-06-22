// AI alt text — one pluggable async function, called on image add and on demand.
// Tuned for architectural precedents: spatial organization, materials, composition;
// dense but concise; written to be read aloud by a screen reader. Never "an image of."
//
// The API key comes from the environment (ANTHROPIC_API_KEY), never hardcoded.
// Callers pass a normalized PNG/JPEG buffer (see images.toAltBuffer) so every
// format works and tokens stay small.

import Anthropic from "@anthropic-ai/sdk";

export const ALT_MODEL = "claude-sonnet-4-6";

export const ALT_SYSTEM = [
  "You write alt text for an architecture precedent archive. Each image is a building, drawing, model, or spatial detail saved as a design reference. Your description is read aloud by a screen reader to a blind or low-vision architect, so it must stand in for seeing the image.",
  "",
  "Describe, in this priority order, only what is visibly present:",
  "1. What it is — interior view, site plan, section, physical model, facade elevation, construction detail — as a noun, not \"an image of.\"",
  "2. Spatial organization — massing, circulation, proportion, how parts relate (\"a double-height nave flanked by low aisles\"; \"an L-shaped plan wrapping a courtyard\").",
  "3. Materials and light — structure and finish you can actually see (board-formed concrete, exposed steel trusses, brick coursing, glazing, timber); light direction, quality, where it falls.",
  "4. Composition — vantage and framing only insofar as they carry spatial information (eye-level, aerial, worm's-eye; foreground vs. background).",
  "",
  "Rules:",
  "- Lead with the most spatially important fact; front-load meaning for a listener.",
  "- Concise but dense: roughly 1–3 sentences, about 30–60 words. No filler.",
  "- Never start with \"an image of,\" \"a photo of,\" \"this shows,\" or \"depicting.\"",
  "- Describe only what is visible. Do not guess the architect, building name, location, year, or style unless it is legibly captioned in the image. Do not invent measurements.",
  "- Plain prose for the ear: no markdown, no lists, no line breaks, no meta-commentary about confidence.",
  "- For a drawing or diagram, say so and convey what it communicates (plan relationships, section heights, what is cut vs. seen).",
  "- Output only the alt text, nothing else."
].join("\n");

let client;
const getClient = () => (client ||= new Anthropic());

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}

// buffer: image bytes; mediaType: "image/png" | "image/jpeg". context is an optional
// hint (existing title/type/tags) that the prompt treats as a hint, not as fact.
export async function generateAltText(buffer, { mediaType = "image/png", title, type, tags } = {}) {
  if (!hasApiKey()) throw new Error("ANTHROPIC_API_KEY is not set — alt text needs a key.");

  const hintParts = [
    title && `title: ${title}`,
    type && `type: ${type}`,
    tags && tags.length && `tags: ${tags.join(", ")}`
  ].filter(Boolean);
  const hint = hintParts.length ? `: ${hintParts.join("; ")}` : ".";

  const msg = await getClient().messages.create({
    model: ALT_MODEL,
    max_tokens: 400,
    system: ALT_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: buffer.toString("base64") } },
          {
            type: "text",
            text:
              `Context (may be empty; treat only as a hint, describe only what you can see)${hint}\n\n` +
              "Write the alt text."
          }
        ]
      }
    ]
  });

  if (msg.stop_reason === "refusal") throw new Error("Alt-text generation was declined by the model.");
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}
