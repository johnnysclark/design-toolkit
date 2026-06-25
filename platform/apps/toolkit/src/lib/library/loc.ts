// Library of Congress — Historic American Buildings Survey (HABS). The best free
// source of actual MEASURED DRAWINGS and large-format photographs of (US)
// buildings: plans, sections, elevations. JSON API, no key. Best-effort.

import { fetchJson } from "./http";
import type { RelatedImage } from "./types";

// The combined HABS / HAER / HALS collection. (A `fa=partof:` facet on /search/
// silently returns nothing — the collection endpoint is the reliable path.)
const COLLECTION =
  "https://www.loc.gov/collections/historic-american-buildings-landscapes-and-engineering-records/";

function abs(u: string): string {
  return u.startsWith("http") ? u : `https:${u}`;
}

export async function habs(query: string, limit = 6): Promise<RelatedImage[]> {
  try {
    const url = `${COLLECTION}?q=${encodeURIComponent(query)}&fo=json&c=${limit}`;
    const data = await fetchJson(url, { timeoutMs: 8000 });
    const results: any[] = data?.results || [];
    const out: RelatedImage[] = [];
    for (const r of results) {
      const imgs: string[] = Array.isArray(r.image_url) ? r.image_url : r.image_url ? [r.image_url] : [];
      if (!imgs.length) continue;
      out.push({
        url: abs(imgs[imgs.length - 1]), // last is usually largest
        thumbUrl: abs(imgs[0]),
        title: typeof r.title === "string" ? r.title : undefined,
        kind: "archive",
        source: "loc",
        sourceUrl: r.id || r.url,
        license: "Library of Congress — check item record for rights",
        attribution: "Historic American Buildings Survey (HABS), Library of Congress"
      });
    }
    return out;
  } catch {
    return [];
  }
}
