// Prompts + JSON Schemas for the Librarian (Precedent Researcher) pipeline.
// Ported verbatim from TOOLS/precedent-librarian/web/prompts.js.
//
// Design intent ("grain of the machine"):
//   - The model is asked to expose its own uncertainty: every atomic claim
//     carries a confidence tag and a one-line reason.
//   - Polish is not evidence. "likely-hallucination" is a first-class output.
//   - Verification is external: the model marks what it cannot verify; the
//     student checks it.

export const MODEL = "claude-opus-4-8";

// ---------------------------------------------------------------------------
// Pass 1 — Dossier
// ---------------------------------------------------------------------------

export const DOSSIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    topic_restatement: {
      type: "string",
      description:
        "One sentence restating the research prompt as you interpreted it, so the user can catch a misread."
    },
    precedents: {
      type: "array",
      description: "The candidate architectural precedents.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Building / project name." },
          architect: { type: "string", description: "Architect or firm." },
          year: {
            type: "string",
            description: "Year or range (string, e.g. '1972' or 'c. 1300')."
          },
          location: { type: "string", description: "City, country." },
          program: { type: "string", description: "Building type / program." },
          why_relevant: {
            type: "string",
            description:
              "Why this precedent bears on the research prompt — the design lesson."
          },
          existence_confidence: {
            type: "string",
            enum: ["certain", "likely", "uncertain"],
            description:
              "How confident you are this building actually exists as described. Use 'uncertain' freely — a confident paragraph about a building that does not exist reads exactly like one about a building that does."
          },
          claims: {
            type: "array",
            description:
              "Atomic factual claims about this precedent, each independently checkable. Break apart compound statements.",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                claim: {
                  type: "string",
                  description: "A single, atomic factual assertion."
                },
                status: {
                  type: "string",
                  enum: ["verified", "plausible-unverified", "likely-hallucination"],
                  description:
                    "verified = backed by a cited source in this response; plausible-unverified = consistent with what you know but you have no source here; likely-hallucination = invented quotes, suspiciously precise numbers, or details you cannot stand behind."
                },
                reason: {
                  type: "string",
                  description:
                    "One line: why this status. For likely-hallucination, name the tell."
                },
                source: {
                  type: "string",
                  description:
                    "A citation URL or reference if you have one, else empty string. Only a real, specific source counts — do not invent."
                }
              },
              required: ["claim", "status", "reason", "source"]
            }
          }
        },
        required: [
          "name",
          "architect",
          "year",
          "location",
          "program",
          "why_relevant",
          "existence_confidence",
          "claims"
        ]
      }
    },
    gaps: {
      type: "string",
      description:
        "What's missing from this set — kinds of precedent, geographies, periods, or counter-examples a rigorous researcher would still want."
    }
  },
  required: ["topic_restatement", "precedents", "gaps"]
} as const;

export function dossierSystem(grounded: boolean): string {
  return [
    "You are a precedent researcher for an architecture design studio.",
    "This studio treats AI as a material to be interrogated, never as an authority. Your job is not to sound authoritative — it is to be honest about what you do and do not know, so a student can verify the rest.",
    "",
    "Rules:",
    "- Break every precedent into ATOMIC claims. Compound sentences hide unverifiable details inside verifiable ones.",
    "- Tag each claim honestly. Use 'likely-hallucination' for anything you'd be embarrassed to be quoted on: invented quotations, suspiciously precise dates/dimensions/costs, awards or publications you can't pin down.",
    "- Polish is not evidence. Do not smooth over uncertainty with fluent prose.",
    "- If you are not sure a building exists, set existence_confidence to 'uncertain' and say so — do not fabricate a plausible-sounding precedent to fill the count.",
    grounded
      ? "- You have a web_search tool. Use it to confirm each building exists and to attach REAL citation URLs. Only mark a claim 'verified' when a source you actually found supports it."
      : "- You have NO search tool. You cannot verify anything against an external source, so NO claim may be marked 'verified'. Use 'plausible-unverified' or 'likely-hallucination' only. Leave the source field empty.",
    "",
    "Return only the structured object."
  ].join("\n");
}

export function dossierUser(topic: string, count: number): string {
  return [
    `Research prompt: ${topic}`,
    `Assemble ${count} architectural precedents that bear on this prompt.`,
    "Prefer genuinely relevant precedents over famous ones. It is better to return fewer honest precedents than to pad the list with ones you cannot stand behind."
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Pass 2 — Adversarial ("Devil's-advocate precedent killer")
// ---------------------------------------------------------------------------

export const ADVERSARIAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    critiques: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            description: "Precedent name (must match a name from the dossier)."
          },
          strongest_case_against: {
            type: "string",
            description:
              "The strongest case that this precedent is wrong, irrelevant to the prompt, or over-claimed. Argue it seriously."
          },
          relevance_verdict: {
            type: "string",
            enum: ["keep", "keep-with-caveats", "drop"],
            description: "Your recommendation after making the case against."
          }
        },
        required: ["name", "strongest_case_against", "relevance_verdict"]
      }
    },
    what_an_expert_would_notice: {
      type: "string",
      description:
        "One paragraph: what a domain expert would immediately flag as missing, naive, or wrong about this whole dossier."
    }
  },
  required: ["critiques", "what_an_expert_would_notice"]
} as const;

export const ADVERSARIAL_SYSTEM = [
  "You are a hostile design critic. You have just been handed a precedent dossier produced by an AI.",
  "Your only job is to attack it. For each precedent, make the STRONGEST possible case that it is wrong, irrelevant to the research prompt, or that the dossier over-claims its relevance.",
  "Do not be polite and do not hedge into agreement. 'Make the strongest case that this is wrong' is the highest-value move in a crit.",
  "Then step back and say what a domain expert would notice is missing or naive about the whole set.",
  "Return only the structured object."
].join("\n");

export function adversarialUser(topic: string, dossier: any): string {
  return [
    `Research prompt: ${topic}`,
    "",
    "Dossier to attack (JSON):",
    JSON.stringify(
      {
        precedents: (dossier.precedents || []).map((p: any) => ({
          name: p.name,
          architect: p.architect,
          why_relevant: p.why_relevant
        }))
      },
      null,
      2
    )
  ].join("\n");
}
