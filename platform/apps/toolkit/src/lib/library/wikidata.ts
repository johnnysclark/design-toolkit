// Wikidata: the structured-facts backbone. Search a building name → an entity,
// then pull architect (P84), inception (P571), style (P149), coordinates (P625),
// lead image filenames (P18), and the English Wikipedia title. No API key.

import { fetchJson } from "./http";

const API = "https://www.wikidata.org/w/api.php";

export interface WdHit {
  id: string;
  label: string;
  description?: string;
}

export async function searchEntities(query: string, limit = 5): Promise<WdHit[]> {
  const url =
    `${API}?action=wbsearchentities&format=json&type=item&language=en&uselang=en` +
    `&limit=${limit}&search=${encodeURIComponent(query)}`;
  const data = await fetchJson(url, { timeoutMs: 7000 });
  return (data?.search || []).map((s: any) => ({
    id: s.id,
    label: s.label,
    description: s.description
  }));
}

export interface WdFacts {
  qid: string;
  label: string;
  description?: string;
  imageFilenames: string[]; // P18 (stored as bare filenames)
  commonsCategory?: string; // P373 — the building's Commons category (best image source)
  year?: string; // from P571
  architectQids: string[]; // P84
  styleQids: string[]; // P149
  coords?: { lat: number; lon: number }; // P625
  wikipediaTitle?: string; // enwiki sitelink
}

export async function getEntity(qid: string): Promise<WdFacts | null> {
  const url =
    `${API}?action=wbgetentities&format=json&languages=en` +
    `&props=labels|descriptions|claims|sitelinks&ids=${encodeURIComponent(qid)}`;
  const data = await fetchJson(url, { timeoutMs: 7000 });
  const ent = data?.entities?.[qid];
  if (!ent || ent.missing !== undefined) return null;

  const claims = ent.claims || {};
  const strings = (p: string): string[] =>
    (claims[p] || [])
      .map((c: any) => c?.mainsnak?.datavalue?.value)
      .filter((v: any) => typeof v === "string");
  const entityIds = (p: string): string[] =>
    (claims[p] || [])
      .map((c: any) => c?.mainsnak?.datavalue?.value?.id)
      .filter(Boolean);

  let year: string | undefined;
  const inception = (claims.P571 || [])[0]?.mainsnak?.datavalue?.value?.time;
  if (inception) {
    const m = String(inception).match(/^([+-]?\d{1,})-/);
    if (m) year = String(parseInt(m[1], 10));
  }

  let coords: { lat: number; lon: number } | undefined;
  const c = (claims.P625 || [])[0]?.mainsnak?.datavalue?.value;
  if (c && typeof c.latitude === "number") {
    coords = { lat: c.latitude, lon: c.longitude };
  }

  return {
    qid,
    label: ent.labels?.en?.value || qid,
    description: ent.descriptions?.en?.value,
    imageFilenames: strings("P18"),
    commonsCategory: strings("P373")[0],
    year,
    architectQids: entityIds("P84"),
    styleQids: entityIds("P149"),
    coords,
    wikipediaTitle: ent.sitelinks?.enwiki?.title
  };
}

// Resolve a batch of QIDs (architects, styles) to English labels in one call.
export async function resolveLabels(qids: string[]): Promise<Record<string, string>> {
  const ids = qids.filter(Boolean).slice(0, 20);
  if (!ids.length) return {};
  const url =
    `${API}?action=wbgetentities&format=json&languages=en&props=labels` +
    `&ids=${ids.join("|")}`;
  const data = await fetchJson(url, { timeoutMs: 7000 });
  const out: Record<string, string> = {};
  for (const qid of Object.keys(data?.entities || {})) {
    const label = data.entities[qid]?.labels?.en?.value;
    if (label) out[qid] = label;
  }
  return out;
}
