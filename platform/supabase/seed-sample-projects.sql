-- seed-sample-projects.sql
-- A few starter reference projects for the Librarian, built from open data
-- (Wikidata + Wikimedia Commons + Wikipedia). Run ONCE in the Supabase SQL editor.
-- Images are openly-licensed Commons photos referenced by URL (not re-hosted),
-- with per-image attribution. Owned by the project owner (edit the email below).
-- Safe to re-run: it skips projects whose name already exists for that owner.

-- ── Modern Houses ──────────────────────────────────────────────────────
with me as (
  select id as uid from auth.users where email = 'jsclark2@gmail.com'
),
proj as (
  insert into public.library_projects (owner, name, brief)
  select uid, 'Modern Houses', 'Canonical twentieth-century houses — how a handful of architects reinvented the single-family dwelling. A starter reference set; add your own finds.' from me
  where not exists (
    select 1 from public.library_projects p, me
    where p.owner = me.uid and p.name = 'Modern Houses'
  )
  returning id
)
insert into public.library_items
  (owner, project_id, source, kind, source_url, title, building, architect, year, caption, tags, license, attribution, confidence)
select me.uid, proj.id, 'archive', 'photo-exterior', v.url, v.label, v.label, v.architect, v.year, v.caption,
       array['precedent']::text[], v.license, v.artist, 'high'
from me, proj, (values
    ('Fallingwater', 'Frank Lloyd Wright', '1936', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Fallingwater_2007.jpg/1280px-Fallingwater_2007.jpg', 'house designed by architect Frank Lloyd Wright in Pennsylvania', 'Public domain', 'Carol M. Highsmith'),
    ('Farnsworth House', 'Ludwig Mies van der Rohe', '1951', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Farnsworth_House_by_Mies_Van_Der_Rohe_-_exterior-8.jpg/1280px-Farnsworth_House_by_Mies_Van_Der_Rohe_-_exterior-8.jpg', 'house designed by Mies van der Rohe', 'CC BY-SA 3.0', 'Victor Grigas'),
    ('Robie House', 'Frank Lloyd Wright', '', 'https://upload.wikimedia.org/wikipedia/commons/8/88/La_prairie_house_de_-franklloydwright_-chicago_-robiehouse_%2833934116221%29.jpg', 'U.S. National Historic Landmark in Chicago, designed by Frank Lloyd Wright', 'CC BY 2.0', 'grego1402')
  ) as v(label, architect, year, url, caption, license, artist);

-- ── Light & Concrete ──────────────────────────────────────────────────────
with me as (
  select id as uid from auth.users where email = 'jsclark2@gmail.com'
),
proj as (
  insert into public.library_projects (owner, name, brief)
  select uid, 'Light & Concrete', 'Buildings where concrete and daylight do the work — mass, aperture, and the quality of light. Reference precedents to build on.' from me
  where not exists (
    select 1 from public.library_projects p, me
    where p.owner = me.uid and p.name = 'Light & Concrete'
  )
  returning id
)
insert into public.library_items
  (owner, project_id, source, kind, source_url, title, building, architect, year, caption, tags, license, attribution, confidence)
select me.uid, proj.id, 'archive', 'photo-exterior', v.url, v.label, v.label, v.architect, v.year, v.caption,
       array['precedent']::text[], v.license, v.artist, 'high'
from me, proj, (values
    ('Church of the Light', 'Tadao Ando', '1989', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Church_of_Light.JPG/1280px-Church_of_Light.JPG', 'chapel in Ibaraki, Osaka Prefecture designed by Tadao Ando', 'CC BY-SA 2.5', 'The original uploader was Bujatt at English Wikipedia .'),
    ('Notre Dame du Haut', 'Le Corbusier', '1956', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/RonchampsBruxelles.jpg', 'chapel in Ronchamp, France', 'CC BY-SA 3.0', 'Immanuel Giel'),
    ('Kimbell Art Museum', 'Louis Kahn, Renzo Piano', '1972', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Kimbell_Art_Museum_Highsmith.jpg/1280px-Kimbell_Art_Museum_Highsmith.jpg', 'art museum in Fort Worth, Texas', 'Public domain', 'Carol M. Highsmith')
  ) as v(label, architect, year, url, caption, license, artist);

-- ── Civic Monuments ──────────────────────────────────────────────────────
with me as (
  select id as uid from auth.users where email = 'jsclark2@gmail.com'
),
proj as (
  insert into public.library_projects (owner, name, brief)
  select uid, 'Civic Monuments', 'Large public buildings that became civic symbols — structure, silhouette, and the public realm.' from me
  where not exists (
    select 1 from public.library_projects p, me
    where p.owner = me.uid and p.name = 'Civic Monuments'
  )
  returning id
)
insert into public.library_items
  (owner, project_id, source, kind, source_url, title, building, architect, year, caption, tags, license, attribution, confidence)
select me.uid, proj.id, 'archive', 'photo-exterior', v.url, v.label, v.label, v.architect, v.year, v.caption,
       array['precedent']::text[], v.license, v.artist, 'high'
from me, proj, (values
    ('Sydney Opera House', 'Jørn Utzon, Peter Hall', '1973', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/00_1375_Sydney_Opera_House_%28Australia%29.jpg/1280px-00_1375_Sydney_Opera_House_%28Australia%29.jpg', 'multi-venue performing arts centre in Sydney, New South Wales, Australia', 'CC BY-SA 4.0', 'W. Bulach'),
    ('Seagram Building', 'Ludwig Mies van der Rohe, Philip Johnson', '1958', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Seagrambuilding.JPG/1280px-Seagrambuilding.JPG', 'Office skyscraper in Manhattan, New York', 'Public domain', 'Max Hermus at Dutch Wikipedia'),
    ('Salk Institute for Biological Studies', '', '1960', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Salk_Institute_%284%29.jpg/1280px-Salk_Institute_%284%29.jpg', 'life sciences research institute', 'CC BY-SA 2.0', 'Jason Taellious from Olympia, USA'),
    ('Guggenheim Museum Bilbao', 'Frank Gehry', '1997', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Museo_Guggenheim%2C_Bilbao_%2831273245344%29.jpg/1280px-Museo_Guggenheim%2C_Bilbao_%2831273245344%29.jpg', 'Museum of modern and contemporary art in Bilbao, Spain', 'CC BY 2.0', 'Naotake Murayama')
  ) as v(label, architect, year, url, caption, license, artist);

