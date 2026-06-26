-- 0005_library_searches_update.sql
-- Fix: library_searches had SELECT / INSERT / DELETE policies but NO UPDATE policy
-- (0003_library.sql lines 64-79). With RLS on and no UPDATE policy, every
-- `.update()` against this table is denied and silently affects 0 rows.
--
-- The Librarian relies on UPDATE in two places (apps/toolkit/src/app/api/librarian/route.ts):
--   * enrich mode  — `.update({ enrichment }).eq('id', searchId).eq('owner', user.id)`
--   * analyze refine — `.update({ analysis }).eq('id', incomingSearchId).eq('owner', user.id)`
-- Both ran for an authenticated owner yet persisted nothing, so the two-phase
-- "fast AI read, then write back the free-archive enrichment" design never saved
-- the enrichment, and a refined re-analysis never overwrote the stored read.
--
-- This adds the missing owner-scoped UPDATE policy, mirroring the ones already on
-- library_projects and library_items in 0003. Append-only; safe to re-run.

drop policy if exists "update own library searches" on public.library_searches;
create policy "update own library searches"
  on public.library_searches for update to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);
