// structured.ts — one structured-output model call, shared by the Site Analysis
// API routes. Same shape as the Librarian's inlined runStructured: grounded mode
// uses the web_search tool and asks for JSON in the prompt (a forced json_schema
// format conflicts with tools), ungrounded mode uses output_config json_schema.
//
// Reliability: every pass runs on Vercel Hobby's 60s function cap. Two things keep
// us under it: (1) adaptive thinking is OFF by default — it was the main latency
// balloon and the synthesis read doesn't need it; (2) a server-side soft-timeout
// aborts the model stream a few seconds early and throws a CLEAN error, so a slow
// pass returns friendly JSON instead of letting Vercel hard-kill the function
// (which ships a non-JSON error page → the "Unexpected token 'A'" crash).

import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "./site-analysis-prompts";

export async function runStructured({
  system,
  user,
  schema,
  grounded,
  maxTokens = 6000,
  thinking = false,
  maxUses = 5,
  timeoutMs = 54000
}: {
  system: string;
  user: string;
  schema: unknown;
  grounded: boolean;
  maxTokens?: number;
  thinking?: boolean;
  maxUses?: number;
  timeoutMs?: number;
}) {
  const client = new Anthropic();

  const params: any = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }]
  };

  if (thinking) params.thinking = { type: "adaptive" };

  if (grounded) {
    // Cap searches so a grounded pass can't spiral past the function budget.
    params.tools = [{ type: "web_search_20260209", name: "web_search", max_uses: maxUses }];
    params.messages[0].content +=
      "\n\nReturn your answer as a single JSON object matching the agreed schema, " +
      "inside a ```json code block. Do not include any other prose outside the block.";
  } else {
    params.output_config = { format: { type: "json_schema", schema } };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let message: any;
  try {
    message = await client.messages.stream(params, { signal: ctrl.signal }).finalMessage();
  } catch (err: any) {
    if (ctrl.signal.aborted) {
      throw new Error(
        "The AI reading took too long and was stopped before the request timed out. " +
          "Try again — it usually goes through on a second pass."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

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
