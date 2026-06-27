import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runStructured } from "@/lib/anthropic/structured";
import {
  SYNTHESIS_SCHEMA,
  synthesisSystem,
  synthesisUser
} from "@/lib/anthropic/site-analysis-prompts";
import { resolveModel } from "@/lib/anthropic/models";

// Cost pass #2 (D2): the design synthesis. Ungrounded — it only reasons over the
// hard-data bundle the client already has (from /analyze) plus the contamination
// brief, so the client posts that bundle here. Auth-gated; its own 60s request.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
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

  const bundle = body?.bundle;
  if (!bundle || typeof bundle !== "object") {
    return NextResponse.json(
      { error: "A data bundle is required (run the site analysis first)." },
      { status: 400 }
    );
  }

  const { model, tier } = resolveModel(body?.tier);

  try {
    const synthesis = await runStructured({
      system: synthesisSystem(!!bundle?.contamination),
      user: synthesisUser(bundle),
      schema: SYNTHESIS_SCHEMA,
      grounded: false,
      tier
    });

    const result = {
      meta: {
        epaId: bundle?.site?.epaId ?? null,
        model,
        generatedAt: new Date().toISOString()
      },
      synthesis
    };

    try {
      await supabase.from("tool_runs").insert({
        owner: user.id,
        tool: "site-analysis:synthesis",
        input: { bundle },
        output: result
      });
    } catch {
      // never let trace logging break the response
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("site-analysis/synthesis:", err);
    return NextResponse.json({ error: err?.message || "Synthesis pass failed." }, { status: 500 });
  }
}
