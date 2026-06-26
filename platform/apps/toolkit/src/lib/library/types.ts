// Shared types for the free-archive enrichment layer (no API keys required).
//
// IMPORTANT: we do NOT auto-embed archive images. Free image search/category
// matching is unreliable (tangential shots, wrong building), and a wrong image
// is worse than none. Instead we return reliable TEXT context for a *confirmed*
// identity plus a curated set of LINKS to where related material actually lives
// (the student clicks through and judges relevance). The only images ever shown
// are the student's own — dropped in or added to a project.

export interface LinkRef {
  label: string;
  url: string;
  note?: string; // short hint: "article", "drawings", "image search"…
  kind?: string; // 'article' | 'reference' | 'images' | 'archive'
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
}

export interface Enrichment {
  identified: IdentifiedContext | null;
  context: TextContext | null;
  vocabulary: VocabTerm[];
  links: LinkRef[];
  notes: string[]; // soft diagnostics (which lookups failed / were skipped)
}
