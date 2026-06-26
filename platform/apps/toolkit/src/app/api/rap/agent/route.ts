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

/** Keep commands that apply cleanly against the supplied state; capture the
 *  rest with their error so the spoken reply can't silently over-claim. */
function validateCommands(state: State, commands: string[]): { kept: string[]; dropped: { command: string; error: string }[] } {
  const kept: string[] = [];
  const dropped: { command: string; error: string }[] = [];
  let cur = state;
  for (const raw of commands) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const cmd = raw.trim();
    try {
      const res = applyCommand(cur, cmd);
      if (res.ok) {
        kept.push(cmd);
        cur = res.state;
      } else {
        dropped.push({ command: cmd, error: res.message });
      }
    } catch (e) {
      dropped.push({ command: cmd, error: e instanceof Error ? e.message : "failed" });
    }
  }
  return { kept, dropped };
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

  // Cheap abuse guards — both are billed per call.
  if (instruction.length > 4000) return NextResponse.json({ error: "That request is too long — please shorten it." }, { status: 413 });
  const stateJson = JSON.stringify(state);
  if (stateJson.length > 200_000) return NextResponse.json({ error: "The model is too large to send to the assistant." }, { status: 413 });

  try {
    const client = new Anthropic();
    const message: any = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: AGENT_SYSTEM,
      output_config: { format: { type: "json_schema", schema: AGENT_SCHEMA } },
      messages: [{ role: "user", content: agentUser(instruction, stateJson) }]
    } as any);

    if (message.stop_reason === "refusal") {
      // Use the {reply, commands} shape (NOT {error} at 200) so the client speaks
      // the refusal as the assistant's message instead of a false "Done.".
      return NextResponse.json({ reply: "The assistant declined this request.", commands: [] }, { status: 200 });
    }
    if (message.stop_reason === "max_tokens") {
      return NextResponse.json({ reply: "That request was too large to plan in one go — try splitting it into smaller steps.", commands: [] }, { status: 200 });
    }

    const text = (message.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    const parsed = parseJson(text);
    const { kept: commands, dropped } = validateCommands(state, Array.isArray(parsed.commands) ? parsed.commands : []);
    // Append a parity note so a spoken reply never claims edits that didn't apply.
    const baseReply = typeof parsed.reply === "string" ? parsed.reply : "Done.";
    const reply = dropped.length ? `${baseReply} (Note: ${dropped.length} command${dropped.length === 1 ? "" : "s"} could not be applied.)` : baseReply;

    // "The trace" — best-effort per-run log.
    try {
      await supabase.from("tool_runs").insert({
        owner: user.id,
        tool: "rap-agent",
        input: { instruction },
        output: { reply, commands, dropped }
      });
    } catch {
      /* never let logging break the response */
    }

    return NextResponse.json({ reply, commands, dropped, meta: { model: MODEL, generated_at: new Date().toISOString() } });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
