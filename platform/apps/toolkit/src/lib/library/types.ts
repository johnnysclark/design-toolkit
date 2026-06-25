// Shared types for the free-archive enrichment layer (no API keys required).
// Everything here is "best-effort context" — leads for a student to follow and
// verify, never authoritative fact.

export interface RelatedImage {
  url: string; // direct image URL
  thumbUrl?: string; // smaller preview
  title?: string;
  kind?: string; // best-guess category (plan, section, photo-interior, model-photo…)
  source: string; // where it came from: 'wikimedia-commons' | 'loc' | 'wikidata'
  sourceUrl?: string; // human-readable page / description URL
  license?: string; // per-item rights, when known
  attribution?: string;
}

export interface VocabTerm {
  term: string;
  meaning: string;
  source?: string; // 'getty-aat' | 'model'
}

export interface IdentifiedContext {
  source: "wikidata";
  qid: string;
  label: string;
  description?: string;
  year?: string;
  architect?: string;
  style?: string;
  coords?: { lat: number; lon: number };
  wikidataUrl: string;
  wikipediaTitle?: string;
}

export interface TextContext {
  source: "wikipedia";
  title: string;
  summary: string;
  url: string;
  thumbUrl?: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface Enrichment {
  identified: IdentifiedContext | null;
  context: TextContext | null;
  relatedImages: RelatedImage[];
  vocabulary: VocabTerm[];
  sources: SourceLink[];
  notes: string[]; // soft diagnostics (which lookups failed / were skipped)
}
