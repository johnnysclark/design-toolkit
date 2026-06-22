-- Workshop platform schema. Idempotent: safe to re-run (npm run migrate).
-- Studio scale (one class, dozens of students) — CREATE TABLE IF NOT EXISTS is
-- sufficient; no migration framework.

-- ── Shared, tool-agnostic ──────────────────────────────────────────────────

-- A class maps to a join code.
CREATE TABLE IF NOT EXISTS class_sessions (
  id          SERIAL PRIMARY KEY,
  class_code  TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lightweight identity: class code + handle, no password.
CREATE TABLE IF NOT EXISTS students (
  id                SERIAL PRIMARY KEY,
  class_session_id  INTEGER NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  handle            TEXT NOT NULL,
  display_name      TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_session_id, handle)
);

-- Generic analytics sink any app can write to.
CREATE TABLE IF NOT EXISTS tool_events (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
  app         TEXT NOT NULL,
  kind        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uploaded images / pasted definitions. Images stored as bytea at studio scale;
-- storage_url is reserved for a later move to object storage (column swap only).
CREATE TABLE IF NOT EXISTS assets (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  app         TEXT NOT NULL,
  kind        TEXT NOT NULL,             -- 'sketch' | 'gh_screenshot' | 'ghx_text'
  media_type  TEXT NOT NULL DEFAULT '',  -- e.g. image/png; empty for ghx_text
  bytes       BYTEA,                     -- null for ghx_text
  text_body   TEXT,                      -- for ghx_text
  byte_size   INTEGER NOT NULL DEFAULT 0,
  storage_url TEXT,                      -- future: object-store URL
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Rhino Wizard tutor ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id                SERIAL PRIMARY KEY,
  student_id        INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mode              TEXT NOT NULL DEFAULT 'grasshopper',
  level             TEXT NOT NULL DEFAULT 'beginner',
  version           TEXT NOT NULL DEFAULT 'Rhino 8',
  awaiting_report   BOOLEAN NOT NULL DEFAULT false,
  expected_symptom  TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id               SERIAL PRIMARY KEY,
  conversation_id  INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL,            -- 'user' | 'assistant'
  question         TEXT NOT NULL DEFAULT '', -- the student's prompt (role=user)
  response_json    JSONB,                    -- the structured tutor answer (role=assistant)
  mode             TEXT NOT NULL DEFAULT '',
  level            TEXT NOT NULL DEFAULT '',
  grounding        TEXT NOT NULL DEFAULT 'off',
  asset_id         INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  claims           JSONB NOT NULL DEFAULT '[]'::jsonb,
  topic_tags       TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_traces (
  id                    SERIAL PRIMARY KEY,
  conversation_id       INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id            INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  expected_symptom      TEXT NOT NULL DEFAULT '',
  reported_observation  TEXT NOT NULL DEFAULT '',
  resolved              BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes for the dashboard aggregations.
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_topic_tags   ON messages USING GIN (topic_tags);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_students_class        ON students(class_session_id);
CREATE INDEX IF NOT EXISTS idx_assets_student        ON assets(student_id);
