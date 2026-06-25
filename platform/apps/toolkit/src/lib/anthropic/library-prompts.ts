// Prompts + JSON Schema for the Librarian's image-context pass.
//
// Design intent: the Librarian's job is to give a student CONTEXT and VOCABULARY
// for a single image they found — not to be an authority. The one thread we keep
// from the studio's "interrogate the AI" stance: an identification is a CLAIM TO
// VERIFY, never a fact. The model is told to hedge or abstain rather than invent
// a confident name — interiors, models, and sketches are the high-risk cases.

export const MODEL = "claude-opus-4-8";

export const IMAGE_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    description: {
      type: "string",
      description:
        "A specific, observation-grounded paragraph describing what is shown: building type/program, era and likely style, materials and structure, spatial qualities, formal moves, scale, light. Describe what you actually see — do not pad with generic praise."
    },
    image_kind: {
      type: "string",
      enum: [
        "photo-exterior",
        "photo-interior",
        "model-photo",
        "drawing",
        "sketch",
        "diagram",
        "mixed",
        "other"
      ],
      description: "What kind of image this is."
    },
    candidates: {
      type: "array",
      description:
        "Ranked possible identifications, most likely first. If you cannot identify it, return an EMPTY array rather than guessing. It is far better to say 'I don't know' than to invent a plausible-sounding architect or project. Interiors, models, sketches, and recent buildings are especially hard — be conservative.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          building: { type: "string", description: "Building / project name, or '' if unknown." },
          architect: { type: "string", description: "Architect or firm, or '' if unknown." },
          year: { type: "string", description: "Year or range as a string, or '' if unknown." },
          location: { type: "string", description: "City, country, or '' if unknown." },
          program: { type: "string", description: "Building type / program, or '' if unknown." },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description:
              "Your honest confidence in THIS identification. Reserve 'high' for unmistakable, iconic cases."
          },
          visual_evidence: {
            type: "string",
            description:
              "What specifically in the image supports this identification (a recognizable feature, signage, a known detail)."
          },
          verify_hint: {
            type: "string",
            description:
              "One concrete thing the student should check to confirm or rule this out (e.g. 'compare the window proportions to published photos')."
          }
        },
        required: [
          "building",
          "architect",
          "year",
          "location",
          "program",
          "confidence",
          "visual_evidence",
          "verify_hint"
        ]
      }
    },
    vocabulary: {
      type: "array",
      description:
        "4–8 precise architectural terms a student could use to DESCRIBE and SEARCH for this kind of work (e.g. 'piloti', 'brise-soleil', 'enfilade', 'poché'). Prefer specific discipline terms over generic adjectives.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          term: { type: "string" },
          meaning: { type: "string", description: "One-line plain-language meaning, in context." }
        },
        required: ["term", "meaning"]
      }
    },
    visible_text: {
      type: "string",
      description:
        "Transcribe any text visible in the image — signage, plaques, drawing titles, scale bars, labels. This often reveals the project. Empty string if none."
    },
    suggested_search_terms: {
      type: "array",
      description:
        "Concrete search queries to find related material — floor plans, sections, other angles, model photos (e.g. '<building> floor plan', '<architect> <project> section', '<building> axonometric').",
      items: { type: "string" }
    },
    suggested_tags: {
      type: "array",
      description:
        "Short metadata tags for cataloguing this image (style, typology, material, element, theme). Lowercase, 1–2 words each.",
      items: { type: "string" }
    }
  },
  required: [
    "description",
    "image_kind",
    "candidates",
    "vocabulary",
    "visible_text",
    "suggested_search_terms",
    "suggested_tags"
  ]
} as const;

export const IMAGE_ANALYSIS_SYSTEM = [
  "You are a visual research librarian for an architecture design studio.",
  "A student has found a single image — often saved from somewhere like Pinterest, with no caption — and wants to understand it better: what it is, how to describe it, and what to look for next.",
  "",
  "Your job is to give them CONTEXT and VOCABULARY, and to propose what the image might be.",
  "This studio treats AI as a material to be interrogated, never as an authority. Any identification you give is a CLAIM FOR THE STUDENT TO VERIFY, not a fact.",
  "",
  "Rules:",
  "- Describe what you actually see, in specific architectural terms — typology, era, style, materials, structure, spatial qualities, formal moves, scale, light.",
  "- Identify honestly. If you do not recognize the building, return an empty candidates array. NEVER invent a plausible-sounding architect, project, or date to seem helpful — a confident wrong name is the worst outcome here.",
  "- Be especially conservative with interiors, models, sketches, and recent buildings; these are easy to misattribute. Calibrate 'confidence' accordingly.",
  "- For every candidate, state the visual evidence and one concrete thing to verify.",
  "- Give the student real vocabulary they can use to describe and search for this kind of architecture.",
  "- Transcribe any visible text — it often reveals the project.",
  "- Suggest concrete search terms for finding related drawings, plans, and other views.",
  "",
  "Polish is not proof. Return only the structured object."
].join("\n");

// The user turn carries the image (added by the route) plus any context the
// student gave — a source URL, a note, EXIF, etc.
export function analysisUser(ctx: { sourceUrl?: string; note?: string }): string {
  const lines = [
    "Here is the image the student found. Give it context, vocabulary, and any honest identification (as leads to verify)."
  ];
  if (ctx.sourceUrl) lines.push(`\nSource URL the student pasted: ${ctx.sourceUrl}`);
  if (ctx.note) lines.push(`\nStudent's note: ${ctx.note}`);
  return lines.join("\n");
}
