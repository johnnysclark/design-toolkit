// structured.ts — one structured-output model call, shared by the Site Analysis
// API routes. Same shape as the Librarian's inlined runStructured: grounded mode
// uses the web_search tool and asks for JSON in the prompt (a forced json_schema
// format conflicts with tools), ungrounded mode uses output_config json_schema.

import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "./site-analysis-prompts";

export async function runStructured({
  system,
  user,
  schema,
  grounded,
  maxTokens = 16000
}: {
  system: string;
  user: string;
  schema: unknown;
  grounded: boolean;
  maxTokens?: number;
}) {
  const client = new Anthropic();

  const params: any = {
    model: MODEL,
    max_tokens: maxTokens,
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

  const message: any = await client.messages.stream(params).finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("The model declined this request (safety refusal).");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Output was truncated (hit max_tokens).");
  }

  const text = message.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  return parseJson(text);
}

function parseJson(text: string) {
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
