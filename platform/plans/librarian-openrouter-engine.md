# Gameplan — cheaper Librarian engine (Qwen3-VL via OpenRouter), A/B vs Claude

**Status:** Planned, not started (written 2026-06-26). **Scope: Librarian only.**
**Owner decision pending** before build — see [Open decisions](#open-decisions).

One-paragraph summary: add a second, opt-in model engine to the Librarian's image-analysis
pass — **Qwen3-VL-235B** served through **OpenRouter** (OpenAI-compatible) — so we can A/B it
against the current Claude (Sonnet/Haiku) read on real student images. Claude stays the default;
Qwen is behind an env flag + per-request override; rollback is a one-line env change.

---

## Why (the cost case)

Three of the five AI tools live on vision (Librarian, Critic, Coach). Open-weight vision models
hosted on cheap inference are now both **cheaper than Haiku and smarter than Haiku**, which is
exactly the gap we hit ("Haiku wasn't cutting it"). The Librarian is the lowest-risk place to
prove it: one non-streaming call, a forgiving JSON parser already in place, and a perception
task (identify + hedge + give vocabulary) that an open VLM should handle well.

Per-1M-token prices (Jun 2026):

| Model | Input | Output | Notes |
|---|---|---|---|
| Claude Sonnet 4.6 (current Deep default) | $3.00 | $15.00 | |
| Claude Haiku 4.5 (current Fast) | $1.00 | $5.00 | |
| **Qwen3-VL-235B-A22B-Instruct (OpenRouter)** | **$0.20** | **$0.88** | vision-native |

Illustrative Librarian call (~4,000 input incl. images + ~800 output): **Sonnet ≈ $0.024,
Qwen3-VL ≈ $0.0015 → ~16× cheaper.** Per 10,000 analyses: ~$240 (Sonnet) vs ~$15 (Qwen).
Full research + per-tool strategy: memory note `open-model-cost-strategy`.

---

## Guardrails (do not violate)

- **Librarian only.** Do not touch the other four tools.
- **Do NOT edit the shared registry `src/lib/anthropic/models.ts`.** All five tools import
  `resolveModel`/`MODEL` from it — changing it leaks into every tool. The new engine lives in a
  new Librarian-local file.
- **No new npm dependency.** OpenRouter is OpenAI-compatible REST — call it with `fetch`. This
  also avoids touching `package.json` (a "hot/shared" file per `CLAUDE.md`).
- **Claude stays the default.** Students see no change until the env flag is flipped.
- **Reversible.** `LIBRARIAN_ENGINE=claude` (or unset) restores Claude instantly, no redeploy of code.
- **Privacy (minors):** student images must only go to no-logging/no-training providers — enforce
  per request *and* in the OpenRouter account settings.

---

## Files to change

1. **NEW `src/lib/ai/openrouter-vision.ts`** — one exported function:
   ```ts
   analyzeImagesOpenRouter({ system, userText, images, schema, model }): Promise<any>
   //   images: { mediaType: string; data: string /* base64 */ }[]
   ```
   Responsibilities:
   - Build an OpenAI-style body and POST to `https://openrouter.ai/api/v1/chat/completions`
     with `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}` (optional attribution
     headers `HTTP-Referer: https://toolkit.allmeans.works`, `X-Title: Librarian`).
   - Convert each image to a data-URI: `{ type: "image_url", image_url: { url:
     "data:${mediaType};base64,${data}" } }`.
   - System turn = `IMAGE_ANALYSIS_SYSTEM` **plus** a "return a single JSON object matching this
     schema" instruction with the schema inlined (Anthropic's top-level `system` + `cache_control`
     don't exist here — fold the system text into a `{role:"system"}` message).
   - Ask for JSON: try `response_format: { type: "json_schema", json_schema: { name:
     "image_analysis", strict: false, schema } }`; if the provider rejects it, fall back to
     `response_format: { type: "json_object" }`. Either way, **reuse the route's forgiving
     `parseJson`** as the safety net (it already strips ```json fences / brace-matches).
   - Privacy: include `provider: { data_collection: "deny" }` in the body.
   - Read `json.choices[0].message.content`, parse, return the object. Map a hard error / empty
     content to a thrown `Error` with a friendly message (mirrors the Claude path).

   Request shape (reference):
   ```jsonc
   {
     "model": "qwen/qwen3-vl-235b-a22b-instruct",
     "max_tokens": 4000,
     "response_format": { "type": "json_object" },
     "provider": { "data_collection": "deny" },
     "messages": [
       { "role": "system", "content": "<IMAGE_ANALYSIS_SYSTEM>\n\nReturn ONE JSON object matching this schema:\n<schema>" },
       { "role": "user", "content": [ { "type": "image_url", "image_url": { "url": "data:image/png;base64,…" } }, { "type": "text", "text": "<analysisUser(...)>" } ] }
     ]
   }
   ```

2. **EDIT `src/app/api/librarian/route.ts`** — only the `analyze` branch (currently ~L264–304).
   Everything above it (auth/401, SSRF guard, image fetch, schema, Supabase storage) is unchanged.
   - Resolve engine: `const engine = (body?.engine ?? process.env.LIBRARIAN_ENGINE ?? "claude")`.
     Only honor a request-level `engine` override for a signed-in user (it already requires auth).
   - If `engine === "qwen"`: build the `{ mediaType, data }[]` array (already on hand from
     `fetched`) and call `analyzeImagesOpenRouter(...)`; else run the existing Claude call.
   - Add `engine` + the resolved model id to the `tool_runs` log `input` and to the response
     `meta` (so A/B is queryable: `select input->>'engine', count(*) from tool_runs where tool='librarian' group by 1`).
   - Keep `parseJson` shared (export it from the route or move to the new helper; do not duplicate a third copy).

3. **EDIT `apps/toolkit/.env.example`** — document the new vars (see below).

4. **OPTIONAL, thin — `src/app/(app)/librarian/librarian-tool.tsx`** — a small "Engine: Claude ⇄
   Qwen (test)" toggle that sends `engine` on the analyze request, for side-by-side comparison on
   the same image. Gate it to signed-in users (or a `?engine=qwen` query flag). Can ship in a
   second pass — the env flag alone is enough to start.

### Anthropic → OpenRouter mapping (the actual port)

| Piece | Claude (now) | Qwen via OpenRouter |
|---|---|---|
| Image block | `{type:"image", source:{type:"base64", media_type, data}}` | `{type:"image_url", image_url:{url:"data:<mt>;base64,<data>"}}` |
| System prompt | top-level `system` + `cache_control` | `{role:"system", content}` (drop `cache_control`) |
| Structured output | `output_config.format.json_schema` | `response_format` (json_schema→json_object fallback) + `parseJson` |
| Refusal | `stop_reason === "refusal"` | check `finish_reason`; Qwen rarely refuses |
| `effort` (Sonnet-only) | inside `output_config` | N/A — omit |
| Auth/SSRF/storage/logging | unchanged | unchanged |

---

## Environment + OpenRouter account setup (one-time, ~5 min)

Click-by-click (you're newer to infra — these are the exact steps):

1. **OpenRouter account + key:** sign up at https://openrouter.ai → **Keys** → *Create Key* →
   copy it. **Add credit** (Settings → Credits; a few dollars = thousands of analyses).
2. **Privacy:** OpenRouter → Settings → **Privacy** → disable "model training" / enable the
   no-logging routing. (The code also sends `data_collection: "deny"` per request as a backstop.)
3. **Vercel env var:** Vercel → project **`toolkit`** → **Settings → Environment Variables** →
   add `OPENROUTER_API_KEY` = your key, scope **Production + Preview** → Save → redeploy.
   Leave `LIBRARIAN_ENGINE` **unset** (= Claude) until you've tested.
4. **Local:** add `OPENROUTER_API_KEY=…` to `apps/toolkit/.env.local`.

Env vars introduced:

| Var | Default | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | (none) | Server-side key. If missing and engine=qwen → 503, like the Anthropic guard. |
| `LIBRARIAN_ENGINE` | `claude` | Cohort default engine. Set to `qwen` to flip everyone. |
| `OPENROUTER_VISION_MODEL` | `qwen/qwen3-vl-235b-a22b-instruct` | Lets you swap models without code. |

Keep the key server-side only (never `NEXT_PUBLIC_*`), same rule as `ANTHROPIC_API_KEY`.

---

## How to A/B

- Default stays Claude. To compare without redeploying: a signed-in tester passes `engine:"qwen"`
  (via the optional UI toggle or `?engine=qwen`). Run the **same** image through both, eyeball.
- Both runs log to `tool_runs` with `engine` + `model`, so you can compare after the fact.
- **What to judge** (this is the real decision, only John can make it on real images): does Qwen
  keep the Librarian's *honest hedging* — empty `candidates` + a plain "I can't place this" on
  interiors / models / sketches / recent buildings — rather than inventing a confident wrong
  architect? That behavior is the whole point of the tool; benchmark scores won't tell you.
- Test set: one iconic exterior, one interior, one model photo, one sketch, one image with
  visible text/signage. Confirm JSON parses and the vocabulary/tags are useful.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Qwen doesn't honor `json_schema` strictly | json_schema→json_object fallback + existing forgiving `parseJson`; test empty-array + hedged cases |
| Confident wrong IDs (loses the hedging that defines the tool) | The core A/B judgment; keep Claude default until Qwen passes the hard cases |
| Vision token cost differs with 6 images | Check the OpenRouter dashboard after ~12 runs; confirm real per-call cost |
| Student data to a logging provider | `provider:{data_collection:"deny"}` + account privacy setting |
| Latency | Non-streaming; `maxDuration = 300` (Vercel Pro) gives ample headroom |

---

## Verify

- `npm run dev:toolkit`, sign in, run the 5-image test set through **both** engines.
- JSON parses for all; hedging behaves on the hard cases; `tool_runs` shows both with `engine`/`model`.
- `npm run build:toolkit` (types) stays green.
- OpenRouter dashboard shows the expected (tiny) cost.

## Rollback

`LIBRARIAN_ENGINE=claude` (or unset) → instant return to Claude. No code change.

---

## Open decisions

1. **Branch.** `CLAUDE.md`: never touch `main`; one folder = one branch. The canonical worktree
   (`design-toolkit`) is on `feat/ai-assistants-unified`. Either build here (additive, Librarian-only)
   or spin a fresh worktree/branch (`tool/librarian-openrouter`) per the multi-agent recipe.
2. **UI toggle now or later.** Env flag is enough to start; the in-tool Claude⇄Qwen toggle can be a
   second, thin pass once the engine is sanity-checked.

## References

- OpenRouter model: `qwen/qwen3-vl-235b-a22b-instruct` — https://openrouter.ai/qwen/qwen3-vl-235b-a22b-instruct (vision ✅, $0.20/$0.88 per 1M).
- Current Librarian call site: `apps/toolkit/src/app/api/librarian/route.ts` (analyze branch).
- Schema + prompts: `apps/toolkit/src/lib/anthropic/library-prompts.ts` (`IMAGE_ANALYSIS_SCHEMA`, `IMAGE_ANALYSIS_SYSTEM`, `analysisUser`).
- Shared registry (do **not** edit): `apps/toolkit/src/lib/anthropic/models.ts`.
- Full cost research + per-tool plan: memory note `open-model-cost-strategy` (Critic/Surveyor stay on Claude).
