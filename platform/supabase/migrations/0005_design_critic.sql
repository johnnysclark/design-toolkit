-- 0005_design_critic.sql
-- The Design Critic ("Critic").
--
-- A student brings a piece of work to an adversarial, honest critic: adoptable
-- critic personas make "the strongest case it fails" (jury), a crit weather
-- report forecasts review questions, a rebuttal rehearsal plays the follow-up a
-- real critic would ask, and a voice-preserving portfolio editor scaffolds a
-- draft the student rewrites in their own words (then the tool attacks THEIR
-- words). Every factual claim is tagged ✓/?/⚠.
--
-- Unlike the shared library/pinup wall, crit drafts and in-progress portfolio
-- prose are PERSONAL. RLS here is OWNER-ONLY for select (mirrors the Skills Coach
-- conversations), not shared-studio-readable. Every table has RLS on. Safe to re-run.

-- ---------------------------------------------------------------------------
-- CRITIC_SESSIONS — one row per piece of work brought to the critic. Shared
-- parent the other tables hang off (so a student can revisit a critique).
-- ---------------------------------------------------------------------------
create table if not exists public.critic_sessions (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  title       text,                                   -- project title (also the alt-text source)
  thesis      text,                                   -- the student's stated thesis / claim
  brief       text,                                   -- longer context the student typed
  image_paths text[] not null default '{}',           -- paths in the 'critic' bucket
  created_at  timestamptz not null default now()
);

alter table public.critic_sessions enable row level security;

drop policy if exists "select own critic sessions" on public.critic_sessions;
create policy "select own critic sessions"
  on public.critic_sessions for select to authenticated using (auth.uid() = owner);

drop policy if exists "insert own critic sessions" on public.critic_sessions;
create policy "insert own critic sessions"
  on public.critic_sessions for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "update own critic sessions" on public.critic_sessions;
create policy "update own critic sessions"
  on public.critic_sessions for update to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete own critic sessions" on public.critic_sessions;
create policy "delete own critic sessions"
  on public.critic_sessions for delete to authenticated using (auth.uid() = owner);

create index if not exists critic_sessions_owner_idx
  on public.critic_sessions (owner, created_at desc);

-- ---------------------------------------------------------------------------
-- CRITIC_CRITIQUES — jury + weather outputs. `claims` flattens every tagged
-- claim for the trace ("grade the tape") and future analytics.
-- ---------------------------------------------------------------------------
create table if not exists public.critic_critiques (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.critic_sessions (id) on delete cascade,
  mode       text not null check (mode in ('jury', 'weather')),
  personas   text[] not null default '{}',            -- persona ids adopted (jury)
  result     jsonb,                                   -- the full structured model output
  claims     jsonb,                                   -- denormalized flat array of tagged claims
  created_at timestamptz not null default now()
);

alter table public.critic_critiques enable row level security;

drop policy if exists "select own critic critiques" on public.critic_critiques;
create policy "select own critic critiques"
  on public.critic_critiques for select to authenticated using (auth.uid() = owner);

drop policy if exists "insert own critic critiques" on public.critic_critiques;
create policy "insert own critic critiques"
  on public.critic_critiques for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "delete own critic critiques" on public.critic_critiques;
create policy "delete own critic critiques"
  on public.critic_critiques for delete to authenticated using (auth.uid() = owner);

create index if not exists critic_critiques_owner_idx
  on public.critic_critiques (owner, created_at desc);
create index if not exists critic_critiques_session_idx
  on public.critic_critiques (session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- CRITIC_PORTFOLIO — the voice-preserving two-pane record. ai_draft is the
-- read-only scaffold; student_text is what the student writes; status tracks
-- the anti-ghostwriting lifecycle. (Export-lock is enforced in the UI — this
-- record is the trace of how much is actually in the student's voice.)
-- ---------------------------------------------------------------------------
create table if not exists public.critic_portfolio (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null references auth.users (id) on delete cascade,
  session_id   uuid references public.critic_sessions (id) on delete set null,
  ai_draft     text,                                  -- the read-only scaffold (NOT a deliverable)
  student_text text not null default '',              -- the student's own writing (starts empty)
  status       text not null default 'draft' check (status in ('draft', 'edited', 'exported')),
  edited_at    timestamptz,                           -- set when the student first writes
  self_attack  jsonb,                                 -- the attack on the student's OWN words
  thesis       jsonb,                                 -- defensible-thesis builder output
  created_at   timestamptz not null default now()
);

alter table public.critic_portfolio enable row level security;

drop policy if exists "select own critic portfolio" on public.critic_portfolio;
create policy "select own critic portfolio"
  on public.critic_portfolio for select to authenticated using (auth.uid() = owner);

drop policy if exists "insert own critic portfolio" on public.critic_portfolio;
create policy "insert own critic portfolio"
  on public.critic_portfolio for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "update own critic portfolio" on public.critic_portfolio;
create policy "update own critic portfolio"
  on public.critic_portfolio for update to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete own critic portfolio" on public.critic_portfolio;
create policy "delete own critic portfolio"
  on public.critic_portfolio for delete to authenticated using (auth.uid() = owner);

create index if not exists critic_portfolio_owner_idx
  on public.critic_portfolio (owner, created_at desc);

-- ---------------------------------------------------------------------------
-- CRITIC_REBUTTALS — rebuttal rehearsal turns (answer → critic follow-up),
-- append-only.
-- ---------------------------------------------------------------------------
create table if not exists public.critic_rebuttals (
  id             uuid primary key default gen_random_uuid(),
  owner          uuid not null references auth.users (id) on delete cascade,
  session_id     uuid references public.critic_sessions (id) on delete cascade,
  question       text not null,                        -- the forecasted question being rehearsed
  student_answer text not null,                        -- the student's answer
  follow_up      jsonb,                                -- the follow-up the critic asks + claim tags
  created_at     timestamptz not null default now()
);

alter table public.critic_rebuttals enable row level security;

drop policy if exists "select own critic rebuttals" on public.critic_rebuttals;
create policy "select own critic rebuttals"
  on public.critic_rebuttals for select to authenticated using (auth.uid() = owner);

drop policy if exists "insert own critic rebuttals" on public.critic_rebuttals;
create policy "insert own critic rebuttals"
  on public.critic_rebuttals for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "delete own critic rebuttals" on public.critic_rebuttals;
create policy "delete own critic rebuttals"
  on public.critic_rebuttals for delete to authenticated using (auth.uid() = owner);

create index if not exists critic_rebuttals_session_idx
  on public.critic_rebuttals (session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- STORAGE — a private 'critic' bucket for uploaded work images. Read: any
-- signed-in user (so the route can createSignedUrl). Write/delete: only your
-- own {user_id}/ folder. (Paths are {user_id}/{session_or_ts}/{timestamp}-{file}.)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('critic', 'critic', false)
on conflict (id) do nothing;

drop policy if exists "critic images readable by authenticated" on storage.objects;
create policy "critic images readable by authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'critic');

drop policy if exists "users upload to own critic folder" on storage.objects;
create policy "users upload to own critic folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'critic' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own critic images" on storage.objects;
create policy "users delete own critic images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'critic' and owner = auth.uid());
