// Enrichment orchestrator. Given what the model thinks the image is (a building
// name / architect / search terms / vocabulary), fan out across the free
// archives IN PARALLEL and assemble related images + textual context + canonical
// vocabulary. Every external call is timeout-guarded and fail-soft, so a slow or
// down source degrades the result instead of breaking the route.

import * as wd from "./wikidata";
import * as commons from "./commons";
import * as wiki from "./wikipedia";
import * as getty from "./getty";
import * as loc from "./loc";
import type { Enrichment, RelatedImage } from "./types";

// Targeted Commons searches — this is how we surface plans/sections/etc. without
// a paid image API: query the building name plus a drawing-type keyword.
const KIND_SEARCHES: { kw: string; kind: string }[] = [
  { kw: "floor plan", kind: "plan" },
  { kw: "section", kind: "section" },
  { kw: "elevation", kind: "elevation" },
  { kw: "interior", kind: "photo-interior" },
  { kw: "model", kind: "model-photo" }
];

export interface EnrichInput {
  building?: string;
  architect?: string;
  searchTerms?: string[]; // model-suggested queries (e.g. "Maison Dom-Ino diagram")
  vocabularyTerms?: string[]; // terms to look up canonical definitions for
}

export async function enrich(input: EnrichInput): Promise<Enrichment> {
  const out: Enrichment = {
    identified: null,
    context: null,
    relatedImages: [],
    vocabulary: [],
    sources: [],
    notes: []
  };
  const building = (input.building || "").trim();
  const architect = (input.architect || "").trim();
  const base = building || architect;
  const images: RelatedImage[] = [];
  const tasks: Promise<void>[] = [];

  // 1) Wikidata identity → P18 lead images + architect/style labels + Wikipedia.
  if (building) {
    tasks.push(
      (async () => {
        try {
          const hits = await wd.searchEntities(building, 1);
          if (!hits.length) {
            out.notes.push("No Wikidata match for the building name.");
          } else {
            const facts = await wd.getEntity(hits[0].id);
            if (facts) {
              const labels = await wd.resolveLabels([
                ...facts.architectQids,
                ...facts.styleQids
              ]);
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
                style:
                  facts.styleQids.map((q) => labels[q]).filter(Boolean).join(", ") ||
                  undefined,
                coords: facts.coords,
                wikidataUrl: `https://www.wikidata.org/wiki/${facts.qid}`,
                wikipediaTitle: facts.wikipediaTitle
              };
              out.sources.push({ label: "Wikidata", url: out.identified.wikidataUrl });

              if (facts.imageFilenames.length) {
                images.push(...(await commons.imageInfo(facts.imageFilenames.slice(0, 4))));
              }
              // The building's Commons category is the richest free image source.
              if (facts.commonsCategory) {
                images.push(...(await commons.categoryImages(facts.commonsCategory, 24)));
                out.sources.push({
                  label: "Commons category",
                  url: `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(
                    facts.commonsCategory
                  )}`
                });
              }
              const title = facts.wikipediaTitle || (await wiki.searchTitle(building));
              if (title) {
                const ctx = await wiki.summary(title);
                if (ctx) {
                  out.context = ctx;
                  out.sources.push({ label: "Wikipedia", url: ctx.url });
                }
              }
            }
          }
        } catch (e: any) {
          out.notes.push(`Wikidata/Wikipedia lookup failed: ${e?.message || e}`);
        }
      })()
    );
  } else if (architect) {
    tasks.push(
      (async () => {
        const title = await wiki.searchTitle(architect);
        if (title) {
          const ctx = await wiki.summary(title);
          if (ctx) {
            out.context = ctx;
            out.sources.push({ label: "Wikipedia", url: ctx.url });
          }
        }
      })()
    );
  }

  // 2) Targeted Commons searches for drawings/photos + a general pass.
  if (base) {
    for (const { kw, kind } of KIND_SEARCHES) {
      tasks.push(
        (async () => {
          try {
            images.push(...(await commons.searchImages(`${base} ${kw}`, 3, kind)));
          } catch {
            /* fail soft */
          }
        })()
      );
    }
    tasks.push(
      (async () => {
        try {
          images.push(...(await commons.searchImages(base, 4)));
        } catch {
          /* fail soft */
        }
      })()
    );
    out.sources.push({
      label: "Wikimedia Commons",
      url: `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(
        base
      )}&title=Special:MediaSearch&type=image`
    });
  }

  // 3) Extra model-suggested search terms (e.g. specific drawing types).
  for (const term of (input.searchTerms || []).slice(0, 3)) {
    tasks.push(
      (async () => {
        try {
          images.push(...(await commons.searchImages(term, 3)));
        } catch {
          /* fail soft */
        }
      })()
    );
  }

  // 4) Library of Congress HABS — measured drawings + photos (US buildings).
  if (building) {
    tasks.push(
      (async () => {
        images.push(...(await loc.habs(building, 6)));
      })()
    );
  }

  // 5) Getty AAT — canonical definitions for the vocabulary (best-effort).
  const vocabTerms = (input.vocabularyTerms || []).filter(Boolean);
  if (vocabTerms.length) {
    tasks.push(
      (async () => {
        try {
          out.vocabulary = await getty.vocabulary(vocabTerms);
        } catch {
          /* fail soft */
        }
      })()
    );
  }

  await Promise.allSettled(tasks);

  // Dedupe by URL, cap the count.
  const seen = new Set<string>();
  out.relatedImages = images
    .filter((i) => i?.url && !seen.has(i.url) && (seen.add(i.url), true))
    .slice(0, 36);

  if (!out.relatedImages.length && !out.identified && !out.context) {
    out.notes.push(
      "No free-archive matches — likely a lesser-known or recent building. " +
        "Try a manual archive search, or enable reverse-image search (a later upgrade)."
    );
  }
  return out;
}
