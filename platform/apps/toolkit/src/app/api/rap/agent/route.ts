import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { MODEL, AGENT_SYSTEM, AGENT_SCHEMA, agentUser } from "@/lib/anthropic/rap-agent-prompts";
import { applyCommand } from "@/app/(app)/rap/studio/engine/interpreter";
import type { State } from "@/app/(app)/rap/studio/engine/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseJson(text: string): { reply?: string; commands?: string[] } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("Could not parse the assistant's reply.");
  }
}

/** Keep only commands that actually apply cleanly against the supplied state. */
function validateCommands(state: State, commands: string[]): string[] {
  const kept: string[] = [];
  let cur = state;
  for (const raw of commands) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const res = applyCommand(cur, raw.trim());
      if (res.ok) {
        kept.push(raw.trim());
        cur = res.state;
      }
    } catch {
      /* drop a command that throws */
    }
  }
  return kept;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "The assistant isn't configured on the server." }, { status: 503 });
  }

  // Cost protection: this route spends the Anthropic key, so anon callers get 401.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the assistant." }, { status: 401 });
  }

  let body: { instruction?: string; state?: State };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const instruction = String(body?.instruction || "").trim();
  const state = body?.state;
  if (!instruction) return NextResponse.json({ error: "Type a request first." }, { status: 400 });
  if (!state || typeof state !== "object") return NextResponse.json({ error: "Missing model state." }, { status: 400 });

  try {
    const client = new Anthropic();
    const message: any = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: AGENT_SYSTEM,
      output_config: { format: { type: "json_schema", schema: AGENT_SCHEMA } },
      messages: [{ role: "user", content: agentUser(instruction, JSON.stringify(state)) }]
    } as any);

    if (message.stop_reason === "refusal") {
      return NextResponse.json({ error: "The assistant declined this request." }, { status: 200 });
    }

    const text = (message.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    const parsed = parseJson(text);
    const reply = typeof parsed.reply === "string" ? parsed.reply : "Done.";
    const commands = validateCommands(state, Array.isArray(parsed.commands) ? parsed.commands : []);

    // "The trace" — best-effort per-run log.
    try {
      await supabase.from("tool_runs").insert({
        owner: user.id,
        tool: "rap-agent",
        input: { instruction },
        output: { reply, commands }
      });
    } catch {
      /* never let logging break the response */
    }

    return NextResponse.json({ reply, commands, meta: { model: MODEL, generated_at: new Date().toISOString() } });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
