// Client-side types for the Librarian (visual reference library).
import type { Enrichment, RelatedImage } from "@/lib/library/types";
export type { Enrichment, RelatedImage };

export interface Project {
  id: string;
  owner: string;
  name: string;
  brief: string | null;
  created_at: string;
}

export interface Candidate {
  building: string;
  architect: string;
  year: string;
  location: string;
  program: string;
  confidence: "high" | "medium" | "low";
  visual_evidence: string;
  verify_hint: string;
}

export interface Analysis {
  description: string;
  image_kind: string;
  candidates: Candidate[];
  vocabulary: { term: string; meaning: string }[];
  visible_text: string;
  suggested_search_terms: string[];
  suggested_tags: string[];
}

export interface AnalyzeResult {
  mode: "analyze" | "search";
  searchId: string | null;
  analysis?: Analysis;
  enrichment: Enrichment;
  query?: string;
  meta?: { model?: string; generated_at?: string };
  // client-only extras attached after the request
  _imagePath?: string | null;
  _sourceUrl?: string | null;
  _previewUrl?: string | null;
}

export interface LibraryItem {
  id: string;
  project_id: string;
  owner: string;
  source: string;
  kind: string | null;
  image_path: string | null;
  source_url: string | null;
  thumb_url: string | null;
  title: string | null;
  caption: string | null;
  notes: string | null;
  building: string | null;
  architect: string | null;
  year: string | null;
  location: string | null;
  program: string | null;
  tags: string[];
  license: string | null;
  attribution: string | null;
  confidence: string | null;
  created_at: string;
}

// The metadata "kind" vocabulary, used in dropdowns and grouping.
export const KIND_OPTIONS = [
  "plan",
  "section",
  "elevation",
  "axon",
  "perspective",
  "photo-exterior",
  "photo-interior",
  "model-photo",
  "sketch",
  "diagram",
  "detail",
  "other"
];

export function kindLabel(k?: string | null): string {
  if (!k) return "uncategorized";
  return k.replace(/-/g, " ");
}
