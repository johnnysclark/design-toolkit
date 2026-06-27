import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { resolveModel } from "@/lib/anthropic/models";
import { SOFT_TIMEOUT_MS } from "@/lib/anthropic/limits";
import {
  PERSONA_IDS,
  JURY_SCHEMA,
  WEATHER_SCHEMA,
  REBUTTAL_SCHEMA,
  PORTFOLIO_DRAFT_SCHEMA,
  SELF_ATTACK_SCHEMA,
  THESIS_SCHEMA,
  buildJurySystem,
  WEATHER_SYSTEM,
  REBUTTAL_SYSTEM,
  PORTFOLIO_DRAFT_SYSTEM,
  SELF_ATTACK_SYSTEM,
  THESIS_SYSTEM,
  juryUser,
  weatherUser,
  rebuttalUser,
  portfolioDraftUser,
  selfAttackUser,
  thesisUser
} from "@/lib/anthropic/critic-prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

const BUCKET = "critic";
const MAX_BYTES = 4_500_000; // keep base64 well under the vision API per-image limit
const MAX_IMAGES = 6; // cap images per critique to bound tokens/latency
const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

type Mode = "jury" | "weather" | "rebuttal" | "portfolio-draft" | "self-attack" | "thesis";
const MODES = new Set<Mode>(["jury", "weather", "rebuttal", "portfolio-draft", "self-attack", "thesis"]);

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
  if (!mediaType) throw new Error("Unsupported image type — use JPEG, PNG, GIF, or WebP.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("Image is too large — please use one under ~4 MB.");
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
    if (start !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("Could not parse the critic's response.");
  }
}

// Inline structured-output call (the shared structured.ts is coupled to another
// tool's MODEL, so we run our own with the same soft-timeout reliability trick).
// `content` is the user-turn content — a string, or image blocks + a text block.
const TAGS = new Set(["supported", "unverified", "likely-wrong"]);
async function runStructured(opts: {
  system: string;
  content: string | any[];
  schema: unknown;
  maxTokens?: number;
  thinking?: boolean;
  tier?: unknown;
  timeoutMs?: number;
}): Promise<any> {
  const {
    system,
    content,
    schema,
    maxTokens = 4000,
    thinking = false,
    tier,
    timeoutMs = SOFT_TIMEOUT_MS
  } = opts;
  const { model, reasoning } = resolveModel(tier);
  const client = new Anthropic();
  const params: any = {
    model,
    max_tokens: maxTokens,
    // Cache the (large) persona/system prompt — reused across critiques.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content }]
  };
  // Adaptive thinking is Sonnet-only — never send it on the fast (Haiku) tier.
  if (thinking && reasoning) params.thinking = { type: "adaptive" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let message: any;
  try {
    message = await client.messages.stream(params, { signal: ctrl.signal }).finalMessage();
  } catch (err: any) {
    if (ctrl.signal.aborted) {
      throw new Error(
        "The critic took too long and was stopped before the request timed out. Try again — it usually goes through on a second pass."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (message.stop_reason === "refusal") throw new Error("The critic declined this request (safety refusal).");
  if (message.stop_reason === "max_tokens") throw new Error("The critique was truncated (hit max_tokens).");

  const text = (message.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  return parseJson(text);
}

// Walk the structured result and collect every CLAIM ({text, tag, why}) for the
// denormalized `claims` column — the trace ("grade the tape").
function flattenClaims(node: any, out: any[] = []): any[] {
  if (Array.isArray(node)) {
    for (const n of node) flattenClaims(n, out);
  } else if (node && typeof node === "object") {
    if (typeof node.text === "string" && typeof node.tag === "string" && TAGS.has(node.tag)) {
      out.push({ text: node.text, tag: node.tag, why: typeof node.why === "string" ? node.why : "" });
    }
    for (const v of Object.values(node)) flattenClaims(v, out);
  }
  return out;
}

// Build vision image blocks from bucket paths (signed) + public URLs.
async function imageBlocks(
  supabase: any,
  paths: string[],
  urls: string[]
): Promise<{ blocks: any[]; error?: string }> {
  const refUrls: string[] = [];
  for (const p of paths.slice(0, MAX_IMAGES)) {
    const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(p, 120);
    if (error || !signed?.signedUrl) return { blocks: [], error: "Could not read an uploaded image. Try re-uploading." };
    refUrls.push(signed.signedUrl);
  }
  for (const u of urls.slice(0, MAX_IMAGES)) {
    if (!isPublicHttpUrl(u)) return { blocks: [], error: "That doesn't look like a public image URL." };
    refUrls.push(u);
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
  const blocks = fetched
    .filter((f): f is { data: string; mediaType: string } => !("error" in f))
    .map((f) => ({ type: "image" as const, source: { type: "base64" as const, media_type: f.mediaType, data: f.data } }));
  if (!blocks.length && refUrls.length) {
    const firstErr = fetched.find((f) => "error" in f) as { error: string } | undefined;
    return { blocks: [], error: firstErr?.error || "Could not read the image(s)." };
  }
  return { blocks };
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && !!s).map((s) => s.trim()) : [];
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });
  }

  // Cost protection: the Toolkit shell is public, but this route spends the
  // Anthropic key, so it must never run for an anonymous caller.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the Critic." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode: Mode = body?.mode;
  if (!MODES.has(mode)) {
    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  }

  const title = body?.title ? String(body.title).trim() : "";
  const thesis = body?.thesis ? String(body.thesis).trim() : "";
  const brief = body?.brief ? String(body.brief).trim() : "";
  const paths = strArr(body?.imagePaths);
  const urls = strArr(body?.imageUrls);
  const sessionId: string | null = body?.sessionId || null;
  // Shared Fast ⇄ Deep toggle (Haiku vs Sonnet) — reported in each trace's meta.
  const { model } = resolveModel(body?.tier);

  try {
    // ── Ensure a session exists for the work (jury/weather group under it) ──
    async function ensureSession(): Promise<string | null> {
      if (sessionId) return sessionId;
      const { data } = await supabase
        .from("critic_sessions")
        .insert({ owner: user!.id, title: title || null, thesis: thesis || null, brief: brief || null, image_paths: paths })
        .select("id")
        .single();
      return data?.id ?? null;
    }

    async function logRun(input: Record<string, unknown>, output: unknown) {
      try {
        await supabase.from("tool_runs").insert({ owner: user!.id, tool: "design-critic", input: { mode, ...input }, output });
      } catch {
        /* never let trace logging break the response */
      }
    }

    // ── Mode: jury ─────────────────────────────────────────────────────────
    if (mode === "jury") {
      const personas = strArr(body?.personas).filter((p) => PERSONA_IDS.includes(p));
      if (!personas.length) {
        return NextResponse.json({ error: "Adopt at least one critic persona." }, { status: 400 });
      }
      const { blocks, error } = await imageBlocks(supabase, paths, urls);
      if (error) return NextResponse.json({ error }, { status: 400 });
      if (!blocks.length && !thesis && !brief) {
        return NextResponse.json({ error: "Upload your work or describe it before convening the jury." }, { status: 400 });
      }

      const content = [...blocks, { type: "text", text: juryUser({ title, thesis, brief, imageCount: blocks.length }) }];
      const result = await runStructured({
        system: buildJurySystem(personas),
        content,
        schema: JURY_SCHEMA,
        maxTokens: 5000,
        thinking: body?.effort === "deep",
        tier: body?.tier
      });

      const sid = await ensureSession();
      await supabase.from("critic_critiques").insert({
        owner: user.id,
        session_id: sid,
        mode: "jury",
        personas,
        result,
        claims: flattenClaims(result)
      });
      await logRun({ sessionId: sid, personas, imageCount: blocks.length }, { result });
      return NextResponse.json({ mode, sessionId: sid, result, meta: { model, generated_at: new Date().toISOString() } });
    }

    // ── Mode: weather (crit weather report) ────────────────────────────────
    if (mode === "weather") {
      const { blocks, error } = await imageBlocks(supabase, paths, urls);
      if (error) return NextResponse.json({ error }, { status: 400 });
      if (!blocks.length && !thesis && !brief) {
        return NextResponse.json({ error: "Upload your work or describe it first." }, { status: 400 });
      }
      const content = blocks.length
        ? [...blocks, { type: "text", text: weatherUser({ title, thesis, brief, imageCount: blocks.length }) }]
        : weatherUser({ title, thesis, brief });
      const result = await runStructured({ system: WEATHER_SYSTEM, content, schema: WEATHER_SCHEMA, tier: body?.tier });

      const sid = await ensureSession();
      await supabase.from("critic_critiques").insert({
        owner: user.id,
        session_id: sid,
        mode: "weather",
        result,
        claims: flattenClaims(result)
      });
      await logRun({ sessionId: sid, imageCount: blocks.length }, { result });
      return NextResponse.json({ mode, sessionId: sid, result, meta: { model, generated_at: new Date().toISOString() } });
    }

    // ── Mode: rebuttal rehearsal ───────────────────────────────────────────
    if (mode === "rebuttal") {
      const question = String(body?.question || "").trim();
      const answer = String(body?.answer || "").trim();
      if (!question || !answer) {
        return NextResponse.json({ error: "Provide both the question and your answer." }, { status: 400 });
      }
      const result = await runStructured({
        system: REBUTTAL_SYSTEM,
        content: rebuttalUser({ title, thesis, brief, question, answer }),
        schema: REBUTTAL_SCHEMA,
        tier: body?.tier
      });
      const sid = await ensureSession();
      await supabase
        .from("critic_rebuttals")
        .insert({ owner: user.id, session_id: sid, question, student_answer: answer, follow_up: result });
      await logRun({ sessionId: sid, question }, { result });
      return NextResponse.json({ mode, sessionId: sid, result, meta: { model, generated_at: new Date().toISOString() } });
    }

    // ── Mode: portfolio-draft (a disposable scaffold) ──────────────────────
    if (mode === "portfolio-draft") {
      if (!thesis && !brief && !title) {
        return NextResponse.json({ error: "Tell the critic about your project first." }, { status: 400 });
      }
      const result = await runStructured({
        system: PORTFOLIO_DRAFT_SYSTEM,
        content: portfolioDraftUser({ title, thesis, brief }),
        schema: PORTFOLIO_DRAFT_SCHEMA,
        tier: body?.tier
      });
      const sid = await ensureSession();
      const { data: row } = await supabase
        .from("critic_portfolio")
        .insert({ owner: user.id, session_id: sid, ai_draft: result?.ai_draft ?? "", student_text: "", status: "draft" })
        .select("id")
        .single();
      await logRun({ sessionId: sid, portfolioId: row?.id ?? null }, { result });
      return NextResponse.json({
        mode,
        sessionId: sid,
        portfolioId: row?.id ?? null,
        result,
        meta: { model, generated_at: new Date().toISOString() }
      });
    }

    // ── Mode: self-attack (attacks the STUDENT'S OWN words) ────────────────
    if (mode === "self-attack") {
      const studentText = String(body?.studentText || "").trim();
      // Server guard: the whole point is to attack the student's own writing.
      // Refuse if it's empty (the UI export-lock is only a nudge; this is real).
      if (!studentText) {
        return NextResponse.json({ error: "Write your statement in your own words first — there's nothing to stress-test yet." }, { status: 400 });
      }
      const result = await runStructured({
        system: SELF_ATTACK_SYSTEM,
        content: selfAttackUser({ title, thesis, brief, studentText }),
        schema: SELF_ATTACK_SCHEMA,
        thinking: true,
        tier: body?.tier
      });
      const portfolioId: string | null = body?.portfolioId || null;
      if (portfolioId) {
        await supabase
          .from("critic_portfolio")
          .update({ student_text: studentText, status: "edited", edited_at: new Date().toISOString(), self_attack: result })
          .eq("id", portfolioId)
          .eq("owner", user.id);
      }
      await logRun({ portfolioId }, { result });
      return NextResponse.json({ mode, portfolioId, result, meta: { model, generated_at: new Date().toISOString() } });
    }

    // ── Mode: thesis (defensible-thesis builder) ───────────────────────────
    if (mode === "thesis") {
      if (!thesis && !brief && !title) {
        return NextResponse.json({ error: "Tell the critic about your project first." }, { status: 400 });
      }
      const result = await runStructured({
        system: THESIS_SYSTEM,
        content: thesisUser({ title, thesis, brief }),
        schema: THESIS_SCHEMA,
        tier: body?.tier
      });
      const portfolioId: string | null = body?.portfolioId || null;
      if (portfolioId) {
        await supabase.from("critic_portfolio").update({ thesis: result }).eq("id", portfolioId).eq("owner", user.id);
      }
      await logRun({ portfolioId }, { result });
      return NextResponse.json({ mode, portfolioId, result, meta: { model, generated_at: new Date().toISOString() } });
    }

    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
