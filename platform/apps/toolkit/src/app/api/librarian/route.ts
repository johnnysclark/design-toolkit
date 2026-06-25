import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  MODEL,
  DOSSIER_SCHEMA,
  ADVERSARIAL_SCHEMA,
  dossierSystem,
  dossierUser,
  ADVERSARIAL_SYSTEM,
  adversarialUser
} from "@/lib/anthropic/prompts";

export const runtime = "nodejs";
// Two model passes with adaptive thinking can run long. Hobby caps at 60s;
// raise this on Vercel Pro (up to 300) if you use grounded mode + more precedents.
export const maxDuration = 60;

// Run one structured-output call. Grounded mode uses the web_search tool and
// asks for JSON in the prompt (forced json_schema format conflicts with tools).
async function runStructured({
  system,
  user,
  schema,
  grounded
}: {
  system: string;
  user: string;
  schema: unknown;
  grounded: boolean;
}) {
  const client = new Anthropic();

  const params: any = {
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

  const message: any = await client.messages.stream(params).finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("The model declined this request (safety refusal).");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Output was truncated (hit max_tokens). Try fewer precedents.");
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
    throw new Error("Could not parse a JSON dossier from the model response.");
  }
}

async function research({
  topic,
  count,
  grounded
}: {
  topic: string;
  count: number;
  grounded: boolean;
}) {
  const dossier = await runStructured({
    system: dossierSystem(grounded),
    user: dossierUser(topic, count),
    schema: DOSSIER_SCHEMA,
    grounded
  });

  if (!Array.isArray(dossier.precedents)) {
    throw new Error("Model returned no precedents.");
  }

  const adversarial = await runStructured({
    system: ADVERSARIAL_SYSTEM,
    user: adversarialUser(topic, dossier),
    schema: ADVERSARIAL_SCHEMA,
    grounded: false
  });

  return {
    meta: { topic, count, grounded, model: MODEL, generated_at: new Date().toISOString() },
    dossier,
    adversarial
  };
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  // Cost protection: only signed-in studio members can spend the Anthropic key.
  // The Toolkit shell is public, but this route must never run for an anon caller.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to use the Librarian." },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = String(body?.topic || "").trim();
  if (!topic) {
    return NextResponse.json({ error: "A research prompt is required." }, { status: 400 });
  }
  const count = Math.min(Math.max(parseInt(body?.count, 10) || 4, 1), 8);
  const grounded = !!body?.grounded;

  try {
    const result = await research({ topic, count, grounded });

    // Log the run as "the trace" (the caller is guaranteed signed in above).
    try {
      await supabase.from("tool_runs").insert({
        owner: user.id,
        tool: "librarian",
        input: { topic, count, grounded },
        output: result
      });
    } catch {
      // never let trace logging break the response
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
