-- 0001_init.sql
-- Foundation schema for the Toolkit app: user profiles, the pinup wall
-- (studio memory + metadata), and "the trace" (a provenance log of tool runs).
-- Every table is protected by Row-Level Security. Safe to re-run.

-- ---------------------------------------------------------------------------
-- PROFILES — one row per auth user, auto-created on signup.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- PINUPS — the digital / pinup wall. Shared studio memory: any signed-in user
-- can SEE the wall, but you can only add/edit/remove your own pins.
-- ---------------------------------------------------------------------------
create table if not exists public.pinups (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  project    text,
  tags       text[] not null default '{}',
  notes      text,
  image_path text not null,                       -- path inside the 'pinups' storage bucket
  created_at timestamptz not null default now()
);

alter table public.pinups enable row level security;

drop policy if exists "pinups readable by authenticated" on public.pinups;
create policy "pinups readable by authenticated"
  on public.pinups for select to authenticated using (true);

drop policy if exists "insert own pinups" on public.pinups;
create policy "insert own pinups"
  on public.pinups for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "update own pinups" on public.pinups;
create policy "update own pinups"
  on public.pinups for update to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete own pinups" on public.pinups;
create policy "delete own pinups"
  on public.pinups for delete to authenticated using (auth.uid() = owner);

create index if not exists pinups_created_idx on public.pinups (created_at desc);

-- ---------------------------------------------------------------------------
-- TOOL_RUNS — "the trace". Every tool run is logged with its inputs + output,
-- turning the studio's "grade the trace, not the output" stance into a feature.
-- Private to each user.
-- ---------------------------------------------------------------------------
create table if not exists public.tool_runs (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  tool       text not null,
  input      jsonb not null default '{}'::jsonb,
  output     jsonb,
  created_at timestamptz not null default now()
);

alter table public.tool_runs enable row level security;

drop policy if exists "select own tool_runs" on public.tool_runs;
create policy "select own tool_runs"
  on public.tool_runs for select to authenticated using (auth.uid() = owner);

drop policy if exists "insert own tool_runs" on public.tool_runs;
create policy "insert own tool_runs"
  on public.tool_runs for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "delete own tool_runs" on public.tool_runs;
create policy "delete own tool_runs"
  on public.tool_runs for delete to authenticated using (auth.uid() = owner);

create index if not exists tool_runs_owner_idx on public.tool_runs (owner, created_at desc);

-- ---------------------------------------------------------------------------
-- STORAGE — a private 'pinups' bucket for the wall's images.
-- Read: any signed-in user. Write/delete: only into your own {user_id}/ folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pinups', 'pinups', false)
on conflict (id) do nothing;

drop policy if exists "pinup images readable by authenticated" on storage.objects;
create policy "pinup images readable by authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'pinups');

drop policy if exists "users upload to own folder" on storage.objects;
create policy "users upload to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pinups' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own pinup images" on storage.objects;
create policy "users delete own pinup images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pinups' and owner = auth.uid());
