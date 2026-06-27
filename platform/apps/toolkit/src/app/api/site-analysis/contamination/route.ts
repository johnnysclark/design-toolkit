import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSite } from "@/lib/site-analysis/datasources";
import { runStructured } from "@/lib/anthropic/structured";
import {
  CONTAMINATION_SCHEMA,
  contaminationSystem,
  contaminationUser
} from "@/lib/anthropic/site-analysis-prompts";
import { resolveModel } from "@/lib/anthropic/models";

// Cost pass #1 (D2): the grounded, web-searched contamination brief. Auth-gated —
// the Anthropic key must never be reachable anonymously. Its own request so the
// single grounded pass has the full 60s budget.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  // Cost protection: only signed-in studio members can spend the key.
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

  const epaId = String(body?.epaId || "").trim();
  if (!epaId) {
    return NextResponse.json({ error: "An EPA ID is required." }, { status: 400 });
  }
  const grounded = body?.grounded !== false; // default ON (this pass is meant to cite)
  const { model, tier } = resolveModel(body?.tier);

  try {
    // Re-fetch the site server-side rather than trusting client-sent metadata.
    const site = await getSite(epaId);
    if (!site) {
      return NextResponse.json({ error: `No NPL site found for EPA ID ${epaId}.` }, { status: 404 });
    }

    const contamination = await runStructured({
      system: contaminationSystem(grounded),
      user: contaminationUser(site),
      schema: CONTAMINATION_SCHEMA,
      grounded,
      tier
    });

    const result = {
      meta: { epaId, grounded, model, generatedAt: new Date().toISOString() },
      contamination
    };

    try {
      await supabase.from("tool_runs").insert({
        owner: user.id,
        tool: "site-analysis:contamination",
        input: { epaId, grounded },
        output: result
      });
    } catch {
      // never let trace logging break the response
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("site-analysis/contamination:", err);
    return NextResponse.json({ error: err?.message || "Contamination pass failed." }, {
      status: 500
    });
  }
}
