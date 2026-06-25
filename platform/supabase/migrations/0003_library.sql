-- 0003_library.sql
-- The Librarian's visual reference library.
--
-- A student finds a single image (uploaded, pasted from the web, or surfaced by
-- an AI lookup) and the Librarian gives it CONTEXT — related plans, drawings,
-- other angles, model photos, textual background, vocabulary. Every lookup is
-- logged, and anything worth keeping is catalogued (with metadata tags) into a
-- named project. Over time this becomes a shared, browsable studio reference
-- database, built up "along with the students".
--
-- RLS mirrors the pinup wall's "shared memory" stance: any signed-in member can
-- BROWSE the whole library; you can only add / edit / remove your own rows.
-- Every table has RLS on. Safe to re-run.

-- ---------------------------------------------------------------------------
-- LIBRARY_PROJECTS — named collections that scope a reference database.
-- ---------------------------------------------------------------------------
create table if not exists public.library_projects (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  brief      text,                                  -- optional one-liner: what this project is
  created_at timestamptz not null default now()
);

alter table public.library_projects enable row level security;

drop policy if exists "library projects readable by authenticated" on public.library_projects;
create policy "library projects readable by authenticated"
  on public.library_projects for select to authenticated using (true);

drop policy if exists "insert own library projects" on public.library_projects;
create policy "insert own library projects"
  on public.library_projects for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "update own library projects" on public.library_projects;
create policy "update own library projects"
  on public.library_projects for update to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete own library projects" on public.library_projects;
create policy "delete own library projects"
  on public.library_projects for delete to authenticated using (auth.uid() = owner);

create index if not exists library_projects_owner_idx
  on public.library_projects (owner, created_at desc);

-- ---------------------------------------------------------------------------
-- LIBRARY_SEARCHES — the catalogue of every image lookup. The source image (or
-- its URL), the model's structured read, and the free-archive enrichment, kept
-- so the database grows with use and a search can be revisited.
-- ---------------------------------------------------------------------------
create table if not exists public.library_searches (
  id               uuid primary key default gen_random_uuid(),
  owner            uuid not null references auth.users (id) on delete cascade,
  project_id       uuid references public.library_projects (id) on delete set null,
  input_image_path text,                            -- path in the 'library' bucket (uploaded/pasted source)
  input_url        text,                            -- source URL when the image was pasted from the web
  analysis         jsonb,                           -- Claude's structured read (description, candidates, vocabulary…)
  enrichment       jsonb,                           -- related images + textual context from free archives
  created_at       timestamptz not null default now()
);

alter table public.library_searches enable row level security;

drop policy if exists "library searches readable by authenticated" on public.library_searches;
create policy "library searches readable by authenticated"
  on public.library_searches for select to authenticated using (true);

drop policy if exists "insert own library searches" on public.library_searches;
create policy "insert own library searches"
  on public.library_searches for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "delete own library searches" on public.library_searches;
create policy "delete own library searches"
  on public.library_searches for delete to authenticated using (auth.uid() = owner);

create index if not exists library_searches_project_idx
  on public.library_searches (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- LIBRARY_ITEMS — the catalogued reference images. Each item is EITHER a stored
-- file (image_path, in the 'library' bucket) OR an external reference
-- (source_url) — found images are kept as links + attribution rather than
-- re-hosted, openly-licensed ones can be downloaded into the bucket. Everything
-- carries metadata tags and whatever identified context we have.
-- ---------------------------------------------------------------------------
create table if not exists public.library_items (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  project_id  uuid not null references public.library_projects (id) on delete cascade,
  search_id   uuid references public.library_searches (id) on delete set null,
  source      text not null default 'upload',       -- upload | paste-url | llm-found | archive
  kind        text,                                 -- plan | section | elevation | axon | perspective |
                                                     -- photo-exterior | photo-interior | model-photo |
                                                     -- sketch | diagram | detail | other
  image_path  text,                                 -- stored file in the 'library' bucket (nullable)
  source_url  text,                                 -- external image / page URL (nullable)
  thumb_url   text,                                 -- optional thumbnail URL for external refs
  title       text,
  caption     text,
  notes       text,
  building    text,
  architect   text,
  year        text,
  location    text,
  program     text,
  tags        text[] not null default '{}',
  license     text,                                 -- per-item rights for found images
  attribution text,
  confidence  text,                                 -- high | medium | low (for AI-identified context)
  created_at  timestamptz not null default now(),
  constraint library_items_has_image
    check (image_path is not null or source_url is not null)
);

alter table public.library_items enable row level security;

drop policy if exists "library items readable by authenticated" on public.library_items;
create policy "library items readable by authenticated"
  on public.library_items for select to authenticated using (true);

drop policy if exists "insert own library items" on public.library_items;
create policy "insert own library items"
  on public.library_items for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "update own library items" on public.library_items;
create policy "update own library items"
  on public.library_items for update to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete own library items" on public.library_items;
create policy "delete own library items"
  on public.library_items for delete to authenticated using (auth.uid() = owner);

create index if not exists library_items_project_idx
  on public.library_items (project_id, created_at desc);
create index if not exists library_items_tags_idx
  on public.library_items using gin (tags);

-- ---------------------------------------------------------------------------
-- STORAGE — a private 'library' bucket for source images + downloaded references.
-- Read: any signed-in user (shared library). Write/delete: only your own
-- {user_id}/ folder. (Paths are {user_id}/{project_id}/{timestamp}-{file}.)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('library', 'library', false)
on conflict (id) do nothing;

drop policy if exists "library images readable by authenticated" on storage.objects;
create policy "library images readable by authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'library');

drop policy if exists "users upload to own library folder" on storage.objects;
create policy "users upload to own library folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own library images" on storage.objects;
create policy "users delete own library images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'library' and owner = auth.uid());
