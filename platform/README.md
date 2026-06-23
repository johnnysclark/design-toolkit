# Workshop Platform

A single Node web service that hosts the studio's AI tools under one domain, with
shared class-code identity, Postgres persistence, and an instructor dashboard.
The first mounted tool is **Rhino Wizard** — a Rhino / Grasshopper / GhPython
tutor that teaches the *workflow* and withholds the full answer at Beginner.

This keeps the existing zero-build ethos (vanilla Node `http`, vanilla-JS frontend,
`@anthropic-ai/sdk`, model `claude-opus-4-8`). It adds one dependency: `pg`.
The standalone tools under `../TOOLS/*/web/` are unchanged and still run on their own.

## What it does

- **Tutor** (`/rhino/`) — Mode (Rhino/Grasshopper/GhPython) × Level (Beginner/Moderate/
  Advanced) toggles. Withholding is enforced **by schema**: the Beginner response has
  no field that can hold a complete solution. Every claim is tagged ✓/?/⚠. Beginner/
  Moderate answers end with a **report-back gate** — the next answer is withheld until
  the student reports what they observed (this also captures the learning trace).
- **Sketch input** — students upload a photo of a hand-drawn sketch or a Grasshopper
  screenshot (read via Claude vision), and/or paste `.ghx`/`.gh` text for critique.
- **Tracking** — every question, response, claim, sketch, and report-back is persisted.
- **Instructor dashboard** (`/rhino/instructor/`) — KPIs, a sticking-points ranking
  ("23 students hit graft/flatten"), a Mode×Level activity grid, the class roster,
  a recent-questions feed with sketch thumbnails, a sketch gallery, and a full
  per-student trace. Gated by a shared instructor key.

## Architecture

```
platform/
  server.js            composition root: one http server, dispatch by URL slug
  lib/                 shared, tool-agnostic: http, db, anthropic, claims, identity, tracking
    schema.sql         all tables (idempotent)
    migrate.js         applies schema.sql + seeds a class from CLASS_CODE
  apps/rhino-wizard/   the tutor: prompts (the 9-cell matrix), routes, KB, instructor analytics
    public/            student UI
    instructor/        dashboard
  render.yaml          deploy blueprint
```

Routing: `/` launcher · `/rhino/` student UI · `/rhino/instructor/` dashboard ·
`POST /api/rhino/*` API · `GET /api/rhino/asset/:id` serves a stored image.
Adding another tool later = an `apps/<tool>/index.js` adapter (it can import the
existing `../TOOLS/<tool>/web/prompts.js`) plus one mount line in `server.js`. One
service, one Postgres, one domain — the `app` column namespaces shared rows.

## Security model (studio scale)

No passwords, but not trust-everything either:
- **Students** get an unguessable bearer **token** at join (returned by `/join`,
  stored in `localStorage`, sent as `X-Student-Token`). Integer ids are never
  credentials — every conversation/asset is ownership-checked against the token,
  so one student can't read or append to another's data.
- **Images** (`GET /api/rhino/asset/:id`) are gated by the instructor key — only
  the dashboard fetches them (the student thread shows the local file). This
  closes the "enumerate every sketch by counting ids" hole.
- **Instructor** endpoints require `INSTRUCTOR_PASSWORD` via the
  `X-Instructor-Key` header (constant-time compared); unset == locked, with a
  clear boot warning.
- A per-student **rate limit** (in-memory token bucket) protects the API budget.
- The **model** is `claude-opus-4-8` by default; set `RHINO_MODEL` to a cheaper
  model — withholding is enforced by the response schema, not the model.

## Run locally

Needs Node ≥18 and a Postgres you can reach.

```bash
cd platform
npm install

# point at a local postgres and seed a class
export DATABASE_URL=postgres://localhost:5432/workshop
export ANTHROPIC_API_KEY=sk-ant-...
export CLASS_CODE=STUDIO1 CLASS_NAME="Fall Studio"
export INSTRUCTOR_PASSWORD=some-long-string

npm run migrate     # creates tables, seeds the class
npm start           # → http://localhost:3000
```

Open `http://localhost:3000/rhino/`, join with `STUDIO1` + any handle, and ask a
question. Open `http://localhost:3000/rhino/instructor/` and log in with the class
code + instructor key.

Add more class sections: `node lib/seed.js SECTION2 "Tuesday section"`.

## Deploy

**See [`DEPLOY.md`](DEPLOY.md) for the full step-by-step recipe** — a local demo
(run on your laptop in ~10 min), Render (managed, recommended for a term), and
UIUC web services (campus cPanel or an Engineering IT VM). The Render quick
version follows.

### Deploy (Render)

1. Push the repo. In Render → **New → Blueprint**, select `platform/render.yaml`.
   It provisions the web service + a managed Postgres and wires `DATABASE_URL`.
2. Set the `sync:false` secrets in the dashboard: `ANTHROPIC_API_KEY`,
   `INSTRUCTOR_PASSWORD`, `CLASS_CODE` (and optional `CLASS_NAME`).
3. The start command runs `npm run migrate` (idempotent) on every deploy, so the
   schema and the seeded class are created automatically on first boot.
4. Custom domain: Render → Settings → Custom Domains → add a CNAME. The slug
   routing means one domain serves every tool.

**Why Render + Postgres over Fly + SQLite:** managed backups, no volume to babysit,
the connection string is injected, and the free/starter tier covers a studio. Fly +
SQLite is cheaper but you own backups, the volume is a single point of failure, and
a second instance breaks SQLite's single-writer model. `lib/db.js` is thin enough
that a later SQLite port touches one file.

## Verify

- **Tutor + tracking:** join, ask a Grasshopper *Beginner* question → the answer has a
  skeleton + single next step + a "try it & report back" check, and **no full
  solution**. The next question is blocked until you send an observation. Rows land in
  `conversations` / `messages` / `learning_traces`.
- **Multimodal:** attach a sketch photo or a GH screenshot, or paste `.ghx` → the tutor
  responds to the image; the asset shows in the dashboard.
- **Withholding eval (headline metric):** `node eval/withholding.js` runs sample tasks at
  all three levels and asserts Beginner never emits a paste-ready solution. Re-run on any
  prompt-fragment change.
- **Dashboard:** drive a graft/flatten conversation from two handles → the sticking-points
  panel shows the distinct-student count; the per-student trace shows the report-back loop.
