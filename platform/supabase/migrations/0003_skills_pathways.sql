-- 0003_skills_pathways.sql
-- Storage for the Skills Pathways video library. The trail STRUCTURE + the video
-- catalog live in code (`lib/skills-pathways/pathways.ts`) — "content in files".
-- This migration only creates a place to host UPLOADED tutorial clips (the
-- { kind: "file" } video refs); most videos are YouTube/Vimeo embeds and need
-- nothing here. Apply in the Supabase SQL editor. Append-only; safe to re-run.
--
-- The bucket is PUBLIC because tutorials are public content (the Toolkit's
-- Skills Pathways page needs no sign-in). Public buckets serve objects over a
-- public URL; a permissive SELECT policy makes that explicit. For v1, uploads
-- are done by the maintainer through the Supabase dashboard (service role), so
-- no INSERT policy is needed yet — a contributor flow can add one later.

insert into storage.buckets (id, name, public)
values ('skills-videos', 'skills-videos', true)
on conflict (id) do nothing;

drop policy if exists "skills videos are public" on storage.objects;
create policy "skills videos are public"
  on storage.objects for select
  using (bucket_id = 'skills-videos');

-- ── (deferred) teacher self-submission ──────────────────────────────────────
-- If/when other teachers upload through the site instead of via the dashboard,
-- add an authenticated INSERT policy scoped to a per-user folder, e.g.:
--
--   create policy "teachers upload to own skills folder"
--     on storage.objects for insert to authenticated
--     with check (bucket_id = 'skills-videos'
--                 and (storage.foldername(name))[1] = auth.uid()::text);
--
-- plus a `pathway_videos` table (owner, node_id, kind, ref, title, approved) with
-- RLS so submissions are moderated before they appear on the trail.
