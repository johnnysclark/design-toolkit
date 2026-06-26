// Enrichment orchestrator.
//
// Given what the image likely is (building / architect / search terms), we do
// the RELIABLE things only: confirm an identity via Wikidata, pull a Wikipedia
// summary for text context, and look up canonical vocabulary in Getty AAT. We do
// NOT fetch or rank archive images — that matching is unreliable and a wrong
// image is worse than none. Instead we hand back a curated set of LINKS to where
// related drawings/plans/photos live (Wikipedia, the Commons category, and
// pre-built image-search + archive queries) for the student to click and judge.

import * as wd from "./wikidata";
import * as wiki from "./wikipedia";
import * as getty from "./getty";
import type { Enrichment, LinkRef } from "./types";

const enc = encodeURIComponent;
const googleImages = (q: string) => `https://www.google.com/search?tbm=isch&q=${enc(q)}`;

// Drawing types worth a dedicated image search when we know what the work is.
const DRAWING_QUERIES = ["floor plan", "section", "elevation", "axonometric", "model"];

export interface EnrichInput {
  building?: string;
  architect?: string;
  searchTerms?: string[]; // model-suggested queries
  vocabularyTerms?: string[]; // terms to define
}

export async function enrich(input: EnrichInput): Promise<Enrichment> {
  const out: Enrichment = {
    identified: null,
    context: null,
    vocabulary: [],
    links: [],
    notes: []
  };
  const building = (input.building || "").trim();
  const architect = (input.architect || "").trim();
  const base = building || architect;

  const tasks: Promise<void>[] = [];

  // 1) Confirm identity (Wikidata) + text context (Wikipedia) + Commons category link.
  if (building) {
    tasks.push(
      (async () => {
        try {
          const hits = await wd.searchEntities(building, 1);
          if (!hits.length) {
            out.notes.push("No Wikidata match — links below are searches, not a confirmed identity.");
            return;
          }
          const facts = await wd.getEntity(hits[0].id);
          if (!facts) return;
          const labels = await wd.resolveLabels([...facts.architectQids, ...facts.styleQids]);
          out.identified = {
            source: "wikidata",
            qid: facts.qid,
            label: facts.label,
            description: facts.description,
            year: facts.year,
            architect:
              facts.architectQids.map((q) => labels[q]).filter(Boolean).join(", ") ||
              architect ||
              undefined,
            style: facts.styleQids.map((q) => labels[q]).filter(Boolean).join(", ") || undefined,
            coords: facts.coords,
            wikidataUrl: `https://www.wikidata.org/wiki/${facts.qid}`,
            wikipediaTitle: facts.wikipediaTitle
          };

          const title = facts.wikipediaTitle || (await wiki.searchTitle(building));
          if (title) {
            const ctx = await wiki.summary(title);
            if (ctx) out.context = ctx;
          }
          if (facts.commonsCategory) {
            out.links.push({
              label: `Wikimedia Commons — ${facts.commonsCategory}`,
              url: `https://commons.wikimedia.org/wiki/Category:${enc(facts.commonsCategory)}`,
              note: "open photos & drawings",
              kind: "images"
            });
          }
          out.links.push({
            label: "Wikidata record",
            url: out.identified.wikidataUrl,
            note: "structured facts",
            kind: "reference"
          });
        } catch (e: any) {
          out.notes.push(`Identity lookup failed: ${e?.message || e}`);
        }
      })()
    );
  } else if (architect) {
    tasks.push(
      (async () => {
        const title = await wiki.searchTitle(architect);
        if (title) {
          const ctx = await wiki.summary(title);
          if (ctx) out.context = ctx;
        }
      })()
    );
  }

  // 2) Getty AAT vocabulary (best-effort).
  const vocabTerms = (input.vocabularyTerms || []).filter(Boolean);
  if (vocabTerms.length) {
    tasks.push(
      (async () => {
        try {
          out.vocabulary = await getty.vocabulary(vocabTerms);
        } catch {
          /* best-effort */
        }
      })()
    );
  }

  await Promise.allSettled(tasks);

  // 3) Build the curated links (no network — just well-formed queries). These are
  //    leads the student follows; we never assert the results are correct.
  if (out.context) {
    out.links.unshift({
      label: `Wikipedia — ${out.context.title}`,
      url: out.context.url,
      note: "read about it",
      kind: "article"
    });
  }
  if (base) {
    for (const kw of DRAWING_QUERIES) {
      out.links.push({
        label: `Image search — ${base} ${kw}`,
        url: googleImages(`${base} ${kw}`),
        note: kw,
        kind: "images"
      });
    }
    out.links.push(
      {
        label: `ArchDaily — search "${base}"`,
        url: `https://www.archdaily.com/search/all?q=${enc(base)}`,
        note: "articles & photo sets",
        kind: "archive"
      },
      {
        label: `Dezeen — search "${base}"`,
        url: `https://www.dezeen.com/?s=${enc(base)}`,
        note: "articles & photo sets",
        kind: "archive"
      },
      {
        label: `Library of Congress (HABS) — "${base}"`,
        url:
          "https://www.loc.gov/collections/historic-american-buildings-landscapes-and-engineering-records/?q=" +
          enc(base),
        note: "measured drawings (US buildings)",
        kind: "archive"
      }
    );
  } else {
    // Unidentified: still offer searches from the model's suggested terms.
    for (const term of (input.searchTerms || []).slice(0, 4)) {
      out.links.push({
        label: `Image search — ${term}`,
        url: googleImages(term),
        note: "search",
        kind: "images"
      });
    }
    if (!out.links.length) {
      out.notes.push("Nothing to look up yet — tell the Librarian what this is.");
    }
  }

  return out;
}
