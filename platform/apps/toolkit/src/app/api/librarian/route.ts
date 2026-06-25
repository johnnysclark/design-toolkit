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
// One vision pass + a fan-out of (timeout-guarded) archive calls. Hobby caps at
// 60s; raise on Vercel Pro if needed.
export const maxDuration = 60;

const BUCKET = "library";
const MAX_BYTES = 4_500_000; // keep base64 well under the vision API per-image limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

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

// Fetch an image (from a signed Storage URL or a pasted web URL) → base64.
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
  const mode = body?.mode === "search" ? "search" : "analyze";

  try {
    // ── Mode: keyword archive search (no model cost) ──────────────────────
    if (mode === "search") {
      const query = String(body?.query || "").trim();
      if (!query) {
        return NextResponse.json({ error: "Enter something to search for." }, { status: 400 });
      }
      const enrichment = await enrich({ building: query, searchTerms: [query] });

      let searchId: string | null = null;
      const { data: row } = await supabase
        .from("library_searches")
        .insert({
          owner: user.id,
          project_id: projectId,
          analysis: { query },
          enrichment
        })
        .select("id")
        .single();
      searchId = row?.id ?? null;

      return NextResponse.json({
        mode,
        searchId,
        query,
        enrichment,
        meta: { generated_at: new Date().toISOString() }
      });
    }

    // ── Mode: analyze an image ────────────────────────────────────────────
    const imagePath: string | null = body?.imagePath || null;
    const imageUrl: string | null = body?.imageUrl ? String(body.imageUrl).trim() : null;
    const note: string | null = body?.note ? String(body.note).trim() : null;

    let fetchUrl: string;
    if (imagePath) {
      const { data: signed, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(imagePath, 120);
      if (error || !signed?.signedUrl) {
        return NextResponse.json(
          { error: "Could not read the uploaded image. Try re-uploading." },
          { status: 400 }
        );
      }
      fetchUrl = signed.signedUrl;
    } else if (imageUrl) {
      if (!isPublicHttpUrl(imageUrl)) {
        return NextResponse.json(
          { error: "That doesn't look like a public image URL." },
          { status: 400 }
        );
      }
      fetchUrl = imageUrl;
    } else {
      return NextResponse.json(
        { error: "Provide an uploaded image (imagePath) or an image URL." },
        { status: 400 }
      );
    }

    const { data: b64, mediaType } = await fetchImage(fetchUrl);

    // Vision pass — structured output, no extended thinking (perception task).
    const client = new Anthropic();
    const message: any = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: IMAGE_ANALYSIS_SYSTEM,
      output_config: { format: { type: "json_schema", schema: IMAGE_ANALYSIS_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: b64 }
            },
            { type: "text", text: analysisUser({ sourceUrl: imageUrl || undefined, note: note || undefined }) }
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

    // Enrich from the best candidate (+ the model's search terms / vocabulary).
    const top = (analysis.candidates || [])[0] || {};
    const enrichment = await enrich({
      building: top.building || "",
      architect: top.architect || "",
      searchTerms: analysis.suggested_search_terms || [],
      vocabularyTerms: (analysis.vocabulary || []).map((v: any) => v.term)
    });

    // Catalogue the search (this is what grows the reference database).
    let searchId: string | null = null;
    const { data: row } = await supabase
      .from("library_searches")
      .insert({
        owner: user.id,
        project_id: projectId,
        input_image_path: imagePath,
        input_url: imageUrl,
        analysis,
        enrichment
      })
      .select("id")
      .single();
    searchId = row?.id ?? null;

    // "The trace" — generic per-tool log (best-effort).
    try {
      await supabase.from("tool_runs").insert({
        owner: user.id,
        tool: "librarian",
        input: { mode, projectId, imagePath, imageUrl, note },
        output: { analysis, enrichment }
      });
    } catch {
      /* never let trace logging break the response */
    }

    return NextResponse.json({
      mode,
      searchId,
      analysis,
      enrichment,
      meta: { model: MODEL, generated_at: new Date().toISOString() }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
