import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  MODEL,
  IMAGE_ANALYSIS_SCHEMA,
  IMAGE_ANALYSIS_SYSTEM,
  analysisUser
} from "@/lib/anthropic/library-prompts";
import { enrich } from "@/lib/library/enrich";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "library";
const MAX_BYTES = 4_500_000; // keep base64 well under the vision API per-image limit
const MAX_IMAGES = 6; // cap images per analysis to bound tokens/latency
const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const EFFORTS = new Set(["low", "medium", "high"]);

// Only fetch public http(s) URLs — block internal hosts (basic SSRF guard).
function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".local") ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    h.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  ) {
    return false;
  }
  return true;
}

function mediaTypeFor(contentType: string | null, url: string): string | null {
  const ct = (contentType || "").split(";")[0].trim().toLowerCase();
  if (ALLOWED.has(ct)) return ct;
  if (/\.jpe?g($|\?)/i.test(url)) return "image/jpeg";
  if (/\.png($|\?)/i.test(url)) return "image/png";
  if (/\.gif($|\?)/i.test(url)) return "image/gif";
  if (/\.webp($|\?)/i.test(url)) return "image/webp";
  return null;
}

async function fetchImage(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Could not fetch the image (HTTP ${res.status}).`);
  const mediaType = mediaTypeFor(res.headers.get("content-type"), url);
  if (!mediaType) {
    throw new Error("Unsupported image type — use JPEG, PNG, GIF, or WebP.");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    throw new Error("Image is too large — please use one under ~4 MB.");
  }
  return { data: buf.toString("base64"), mediaType };
}

function parseJson(text: string): any {
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
    throw new Error("Could not parse the model's analysis.");
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  // Cost protection: the Toolkit shell is public, but this route spends the
  // Anthropic key + hits external APIs, so it must never run for an anon caller.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the Librarian." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const projectId: string | null = body?.projectId || null;
  const mode: "search" | "enrich" | "analyze" =
    body?.mode === "search" ? "search" : body?.mode === "enrich" ? "enrich" : "analyze";

  try {
    // ── Mode: keyword archive search (no model cost) ──────────────────────
    if (mode === "search") {
      const query = String(body?.query || "").trim();
      if (!query) {
        return NextResponse.json({ error: "Enter something to search for." }, { status: 400 });
      }
      const enrichment = await enrich({ building: query, searchTerms: [query] });
      const { data: row } = await supabase
        .from("library_searches")
        .insert({ owner: user.id, project_id: projectId, analysis: { query }, enrichment })
        .select("id")
        .single();
      return NextResponse.json({
        mode,
        searchId: row?.id ?? null,
        query,
        enrichment,
        meta: { generated_at: new Date().toISOString() }
      });
    }

    // ── Mode: enrich (phase 2 — the free-archive lookups, no model cost) ───
    // Split out from analyze so the AI read can return first ("quick answer").
    if (mode === "enrich") {
      const enrichment = await enrich({
        building: String(body?.building || "").trim(),
        architect: String(body?.architect || "").trim(),
        searchTerms: Array.isArray(body?.searchTerms) ? body.searchTerms : [],
        vocabularyTerms: Array.isArray(body?.vocabularyTerms) ? body.vocabularyTerms : []
      });
      const searchId: string | null = body?.searchId || null;
      if (searchId) {
        await supabase
          .from("library_searches")
          .update({ enrichment })
          .eq("id", searchId)
          .eq("owner", user.id);
      }
      return NextResponse.json({
        mode,
        searchId,
        enrichment,
        meta: { generated_at: new Date().toISOString() }
      });
    }

    // ── Mode: analyze image(s) (phase 1 — the vision read; fast) ──────────
    const note: string | null = body?.note ? String(body.note).trim() : null;
    const userContext: string | null = body?.userContext ? String(body.userContext).trim() : null;
    const incomingSearchId: string | null = body?.searchId || null;
    // Effort tunes speed vs. depth of the vision pass (the "quick answer" slider).
    const effort: string | undefined = EFFORTS.has(body?.effort) ? body.effort : undefined;

    const paths: string[] = Array.isArray(body?.imagePaths)
      ? body.imagePaths.filter((p: unknown): p is string => typeof p === "string" && !!p)
      : body?.imagePath
        ? [String(body.imagePath)]
        : [];
    const urls: string[] = (
      Array.isArray(body?.imageUrls) ? body.imageUrls : body?.imageUrl ? [body.imageUrl] : []
    )
      .filter((u: unknown): u is string => typeof u === "string" && !!u)
      .map((u: string) => u.trim());
    const primaryPath = paths[0] || null;
    const primaryUrl = urls[0] || null;

    const refUrls: string[] = [];
    for (const p of paths.slice(0, MAX_IMAGES)) {
      const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(p, 120);
      if (error || !signed?.signedUrl) {
        return NextResponse.json(
          { error: "Could not read an uploaded image. Try re-uploading." },
          { status: 400 }
        );
      }
      refUrls.push(signed.signedUrl);
    }
    for (const u of urls.slice(0, MAX_IMAGES)) {
      if (!isPublicHttpUrl(u)) {
        return NextResponse.json(
          { error: "That doesn't look like a public image URL." },
          { status: 400 }
        );
      }
      refUrls.push(u);
    }
    if (!refUrls.length) {
      return NextResponse.json(
        { error: "Provide at least one image (upload or URL)." },
        { status: 400 }
      );
    }

    const fetched = await Promise.all(
      refUrls.slice(0, MAX_IMAGES).map(async (u) => {
        try {
          return await fetchImage(u);
        } catch (e: any) {
          return { error: e?.message || "fetch failed" } as { error: string };
        }
      })
    );
    const imageBlocks = fetched
      .filter((f): f is { data: string; mediaType: string } => !("error" in f))
      .map((f) => ({
        type: "image" as const,
        source: { type: "base64" as const, media_type: f.mediaType, data: f.data }
      }));
    if (!imageBlocks.length) {
      const firstErr = fetched.find((f) => "error" in f) as { error: string } | undefined;
      return NextResponse.json(
        { error: firstErr?.error || "Could not read the image(s)." },
        { status: 400 }
      );
    }

    // Vision pass — structured output; effort tunes depth (lives inside output_config).
    const outputConfig: any = {
      format: { type: "json_schema", schema: IMAGE_ANALYSIS_SCHEMA }
    };
    if (effort) outputConfig.effort = effort;

    const client = new Anthropic();
    const message: any = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: IMAGE_ANALYSIS_SYSTEM,
      output_config: outputConfig,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: analysisUser({
                sourceUrl: primaryUrl || undefined,
                note: note || undefined,
                userContext: userContext || undefined,
                imageCount: imageBlocks.length
              })
            }
          ]
        }
      ]
    } as any);

    if (message.stop_reason === "refusal") {
      throw new Error("The model declined to analyze this image (safety refusal).");
    }
    const text = (message.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    const analysis = parseJson(text);

    // Catalogue the read now (enrichment fills in on the follow-up enrich call).
    const analysisToStore = userContext ? { ...analysis, user_context: userContext } : analysis;
    let searchId: string | null = incomingSearchId;
    if (incomingSearchId) {
      await supabase
        .from("library_searches")
        .update({ analysis: analysisToStore })
        .eq("id", incomingSearchId)
        .eq("owner", user.id);
    } else {
      const { data: row } = await supabase
        .from("library_searches")
        .insert({
          owner: user.id,
          project_id: projectId,
          input_image_path: primaryPath,
          input_url: primaryUrl,
          analysis: analysisToStore
        })
        .select("id")
        .single();
      searchId = row?.id ?? null;
    }

    try {
      await supabase.from("tool_runs").insert({
        owner: user.id,
        tool: "librarian",
        input: {
          mode,
          projectId,
          imageCount: imageBlocks.length,
          paths,
          urls,
          note,
          userContext,
          effort,
          refine: !!incomingSearchId
        },
        output: { analysis }
      });
    } catch {
      /* never let trace logging break the response */
    }

    return NextResponse.json({
      mode,
      searchId,
      analysis,
      meta: { model: MODEL, generated_at: new Date().toISOString() }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
