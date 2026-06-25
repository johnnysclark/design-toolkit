// Getty Art & Architecture Thesaurus (AAT): canonical definitions for the
// vocabulary the model surfaces — the authoritative "what does this term mean"
// layer. Queried over Getty's public SPARQL endpoint (no key). Strictly
// best-effort: the model's own vocabulary is the primary source, so any failure
// here just yields fewer terms.

import { fetchJson } from "./http";
import type { VocabTerm } from "./types";

const SPARQL = "https://vocab.getty.edu/sparql.json";

async function lookupOne(term: string): Promise<VocabTerm | null> {
  const clean = term.replace(/["\\]/g, "").trim();
  if (!clean) return null;
  // Getty's endpoint predefines the gvp/aat/skos/xl/luc/rdf prefixes.
  const q = `SELECT ?label ?note WHERE {
  ?c a gvp:Concept ; skos:inScheme aat: ; luc:term "${clean}" .
  ?c gvp:prefLabelGVP/xl:literalForm ?label .
  OPTIONAL { ?c skos:scopeNote/rdf:value ?note . FILTER(lang(?note) = "en") }
} LIMIT 1`;
  try {
    const url = `${SPARQL}?query=${encodeURIComponent(q)}`;
    const data = await fetchJson(url, {
      timeoutMs: 6000,
      headers: { Accept: "application/sparql-results+json" }
    });
    const b = data?.results?.bindings?.[0];
    if (!b?.label?.value) return null;
    return {
      term: b.label.value,
      meaning: b.note?.value || "Getty AAT term (no scope note available).",
      source: "getty-aat"
    };
  } catch {
    return null;
  }
}

export async function vocabulary(terms: string[]): Promise<VocabTerm[]> {
  const picks = Array.from(new Set(terms.filter(Boolean))).slice(0, 3);
  const results = await Promise.all(picks.map(lookupOne));
  return results.filter(Boolean) as VocabTerm[];
}
