-- 0002_skills_coach.sql
-- Persistence for the Skills Coach chat tutor: one row per conversation, one
-- row per message ("the trace" lives in tool_runs as well, one row per answer).
-- Mirrors the RLS style of 0001: owner = auth.uid(), select/insert/delete own.
-- Append-only; safe to re-run.

-- ---------------------------------------------------------------------------
-- COACH_CONVERSATIONS — one chat thread per row, private to its owner.
-- ---------------------------------------------------------------------------
create table if not exists public.coach_conversations (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  discipline text,                                  -- rhino | grasshopper | autocad | revit | adobe | general
  title      text,
  created_at timestamptz not null default now()
);

alter table public.coach_conversations enable row level security;

drop policy if exists "select own coach_conversations" on public.coach_conversations;
create policy "select own coach_conversations"
  on public.coach_conversations for select to authenticated using (auth.uid() = owner);

drop policy if exists "insert own coach_conversations" on public.coach_conversations;
create policy "insert own coach_conversations"
  on public.coach_conversations for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "update own coach_conversations" on public.coach_conversations;
create policy "update own coach_conversations"
  on public.coach_conversations for update to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete own coach_conversations" on public.coach_conversations;
create policy "delete own coach_conversations"
  on public.coach_conversations for delete to authenticated using (auth.uid() = owner);

create index if not exists coach_conversations_owner_idx
  on public.coach_conversations (owner, created_at desc);

-- ---------------------------------------------------------------------------
-- COACH_MESSAGES — every turn. `owner` is denormalized onto the row so RLS is
-- a single-column check (matches the 0001 style; no join to the parent).
-- `meta` holds the per-turn structured tail: concept slug, claim tags, the
-- report-back prompt. `attachment_path` points into the coach-uploads bucket.
-- ---------------------------------------------------------------------------
create table if not exists public.coach_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations (id) on delete cascade,
  owner           uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null default '',
  level           text,                              -- beginner | intermediate | advanced (level this turn was pitched at)
  meta            jsonb,                             -- { concept, claims, report_back }
  attachment_path text,                              -- path inside the 'coach-uploads' bucket
  created_at      timestamptz not null default now()
);

alter table public.coach_messages enable row level security;

drop policy if exists "select own coach_messages" on public.coach_messages;
create policy "select own coach_messages"
  on public.coach_messages for select to authenticated using (auth.uid() = owner);

drop policy if exists "insert own coach_messages" on public.coach_messages;
create policy "insert own coach_messages"
  on public.coach_messages for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "delete own coach_messages" on public.coach_messages;
create policy "delete own coach_messages"
  on public.coach_messages for delete to authenticated using (auth.uid() = owner);

create index if not exists coach_messages_convo_idx
  on public.coach_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- STORAGE — a private 'coach-uploads' bucket for sketches / screenshots / PDFs
-- the student uploads for analysis. Read + write + delete: only your own
-- {user_id}/ folder (same pattern as the 'pinups' bucket in 0001).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('coach-uploads', 'coach-uploads', false)
on conflict (id) do nothing;

drop policy if exists "read own coach uploads" on storage.objects;
create policy "read own coach uploads"
  on storage.objects for select to authenticated
  using (bucket_id = 'coach-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "upload to own coach folder" on storage.objects;
create policy "upload to own coach folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'coach-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own coach uploads" on storage.objects;
create policy "delete own coach uploads"
  on storage.objects for delete to authenticated
  using (bucket_id = 'coach-uploads' and owner = auth.uid());
