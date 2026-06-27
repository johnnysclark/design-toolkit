import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runStructured } from "@/lib/anthropic/structured";
import { PROFILE_SCHEMA, profileSystem, profileUser } from "@/lib/anthropic/site-analysis-prompts";
import { resolveModel } from "@/lib/anthropic/models";

// The hallucination lesson (D2): run the SAME place-profile prompt twice — once
// blind (no tools, from memory) and once grounded (web search) — and return both
// so the student can see, side by side, what the model invents without grounding
// vs. what it cites with it. Auth-gated; the two passes run in parallel.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to run the AI analysis." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const place = body?.place;
  if (!place || typeof place !== "object" || !place?.name) {
    return NextResponse.json({ error: "A place is required." }, { status: 400 });
  }
  const { model, tier } = resolveModel(body?.tier);

  try {
    const [blind, grounded] = await Promise.all([
      runStructured({
        system: profileSystem(false),
        user: profileUser(place),
        schema: PROFILE_SCHEMA,
        grounded: false,
        tier
      }).catch((e) => ({ error: e?.message || "blind pass failed" })),
      runStructured({
        system: profileSystem(true),
        user: profileUser(place),
        schema: PROFILE_SCHEMA,
        grounded: true,
        tier,
        maxUses: 5
      }).catch((e) => ({ error: e?.message || "grounded pass failed" }))
    ]);

    const result = { meta: { model, generatedAt: new Date().toISOString() }, blind, grounded };

    try {
      await supabase.from("tool_runs").insert({
        owner: user.id,
        tool: "site-analysis:blind-vs-grounded",
        input: { place: place?.name },
        output: result
      });
    } catch {
      // never let trace logging break the response
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("site-analysis/blind-vs-grounded:", err);
    return NextResponse.json({ error: err?.message || "The comparison failed." }, { status: 500 });
  }
}
