# Skills Pathways — spec & maintainer guide

**What it is.** A public, no-cost section of the Toolkit: a GSAPP-Skill-Trails-style
**trail map** of 2D and 3D digital skills (beginner → advanced) where each step
holds the **tutorial video(s)** John and other teachers make. It's the map +
video library that complements the interactive **Skills Coach** (the tutor).

**Status:** LIVE (v1, curated-in-code). Public — no sign-in, spends no API key.

## How it's built

- **Data (content in files):** `src/lib/skills-pathways/pathways.ts` — the trail.
  Each `SkillNode` has a `discipline`, `track` (`2d`/`3d`/`both`), `level`,
  `prereqs` (wires the trail), `conceptSlugs` (link into the **Skills Coach concept
  KB** — one source of truth for explanations + official doc links), and `videos`.
- **UI:** `src/app/(app)/skills-pathways/`
  - `page.tsx` — public server page (header + board).
  - `TrailBoard.tsx` — track/software filters + a 3-column (Beginner·Intermediate·
    Advanced) grid per software; click a step → modal.
  - `NodeModal.tsx` — the step detail: video(s), key concepts (+ Docs links),
    "Builds on" / "Leads to" navigation, and a Skills Coach hand-off.
  - `LazyVideo.tsx` — click-to-play embed (YouTube/Vimeo `nocookie` iframe) or a
    native `<video>` for uploaded files; nothing loads until clicked.
- **Storage:** `supabase/migrations/0004_skills_pathways.sql` — a **public**
  `skills-videos` bucket, only for the upload path. ⚠️ Apply it in the Supabase
  SQL editor (most videos are embeds and need nothing here).
- **Nav:** added to `src/lib/toolkit-nav.ts` (status `live`, public).

## Adding content (the everyday task)

Edit `pathways.ts` and open a PR. To add a video to a step, add to its `videos: []`:

```ts
{ kind: "youtube", id: "VIDEO_ID", title: "Loft a surface", author: "John Clark", minutes: 6 }
{ kind: "vimeo",   id: "76979871", title: "...",            author: "..." }
{ kind: "file",    url: "<public skills-videos URL>", title: "...", author: "..." }
```

- **YouTube/Vimeo** (preferred, esp. for long videos): upload there (unlisted is
  fine), paste the id (the part after `watch?v=` / `youtu.be/` / `vimeo.com/`).
- **Upload** (short owned clips): Supabase dashboard → Storage → `skills-videos` →
  upload the `.mp4`, copy its public URL, paste as a `file` ref. Keep it small —
  the free tier is ~1 GB.

To add a **step**, append a `SkillNode` and set its `prereqs` to the step(s) it
follows — that's what positions it on the trail.

## Deferred (v2 ideas)

- **Interactive node-graph** view (pan/zoom) reading the same `pathways.ts`.
- **Teacher self-submission**: a `pathway_videos` table + RLS + an approval screen
  and an authenticated INSERT policy on the bucket (sketched at the bottom of the
  migration), so co-teachers submit through the site instead of via a PR.
- **Coach deep-link**: have `/skills-coach` read a `?discipline=` param so the
  hand-off preselects the tool.
