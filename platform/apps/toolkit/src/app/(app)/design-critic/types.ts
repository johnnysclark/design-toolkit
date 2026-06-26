// Shared client types + style tokens + the "% in your words" measure for the
// Design Critic. (Pure module — no client-only imports — safe to import anywhere.)

export type ClaimTagKind = "supported" | "unverified" | "likely-wrong";
export type Claim = { text: string; tag: ClaimTagKind; why: string };

export type JuryCritique = {
  persona_id: string;
  persona_name: string;
  strongest_case_it_fails: string;
  lines_of_attack: { point: string; claims: Claim[] }[];
  questions_it_would_ask: string[];
  what_would_change_my_mind: string;
};
export type JuryResult = { overall_note: string; critiques: JuryCritique[]; blind_spots: Claim[] };

export type WeatherCategory = "fair" | "loaded" | "out-of-scope";
export type WeatherQuestion = {
  question: string;
  category: WeatherCategory;
  why: string;
  what_it_probes: string;
  claims: Claim[];
};
export type WeatherResult = { forecast: WeatherQuestion[]; prep_note: string };

export type RebuttalResult = {
  acknowledged: string;
  follow_up: string;
  pressure_point: string;
  claims: Claim[];
  fair_or_loaded: "fair" | "loaded";
};

export type ThesisOption = { statement: string; defensibility: string; claims: Claim[] };
export type PortfolioDraftResult = {
  ai_draft: string;
  thesis_options: ThesisOption[];
  voice_prompts: string[];
};

export type SelfAttackItem = { quote: string; problem: string; claims: Claim[]; stronger_version_hint: string };
export type SelfAttackResult = {
  target: string;
  attacks: SelfAttackItem[];
  unsupported_assertions: Claim[];
  what_holds_up: string[];
};

export type ThesisCandidate = {
  id: string;
  thesis: string;
  why_defensible: string;
  likely_attacks: string[];
  claims: Claim[];
};
export type ThesisResult = { candidates: ThesisCandidate[]; strongest_id: string };

// An uploaded piece of work: its stored path (in the 'critic' bucket), a local
// preview URL, and the alt text we render on the thumbnail.
export type WorkImage = { path: string; previewUrl: string; alt: string };

// The intake the student fills in for any mode.
export type WorkInput = { title: string; thesis: string; brief: string; images: WorkImage[] };

// Shared Tailwind tokens (match the Librarian / Pinup tools). All text neutral-900.
export const card = "rounded-xl border border-neutral-200 bg-white p-5";
export const primaryBtn =
  "rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50";
export const ghostBtn =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50";
export const field =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900";

// "% in your words": how far the student's text diverges from the AI scaffold.
// 0 = pasted the draft verbatim (bad); ~100 = wholly their own. A nudge, not a
// grade — Levenshtein on the lowercased strings, cheap for statement-length text.
export function inYourWordsPct(studentText: string, aiDraft: string): number {
  const a = (studentText || "").trim().toLowerCase();
  const b = (aiDraft || "").trim().toLowerCase();
  if (!a) return 0;
  if (!b) return 100;
  const dist = levenshtein(a, b);
  const sim = 1 - dist / Math.max(a.length, b.length);
  return Math.max(0, Math.min(100, Math.round((1 - sim) * 100)));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
