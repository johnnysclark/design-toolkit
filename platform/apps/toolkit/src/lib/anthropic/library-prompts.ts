// Prompts + JSON Schema for the Librarian's image-context pass.
//
// Design intent: the Librarian's job is to give a student CONTEXT and VOCABULARY
// for a single image they found — not to be an authority. The one thread we keep
// from the studio's "interrogate the AI" stance: an identification is a CLAIM TO
// VERIFY, never a fact. The model is told to hedge or abstain rather than invent
// a confident name — interiors, models, and sketches are the high-risk cases.

// Toolkit-wide policy: AI tool calls run on Sonnet 4.6 (faster + cheaper). Supports
// vision + structured output, which is all this perception pass needs.
export const MODEL = "claude-sonnet-4-6";

export const IMAGE_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    identification_confidence: {
      type: "string",
      enum: ["high", "medium", "low", "none"],
      description:
        "Your overall confidence that you know WHAT this image is and WHO made it. Use 'high' only when it is unmistakable OR when the student has told you. Use 'low'/'none' whenever you would be guessing."
    },
    reply: {
      type: "string",
      description:
        "A short, plain, conversational message to the student (one or two sentences). When you can't identify the image, this is where you say so plainly and ask for help. When the student has given you facts, acknowledge them and say what you did with them."
    },
    questions: {
      type: "array",
      description:
        "When identification_confidence is low/none AND the student hasn't supplied the identity, the specific things that would help you catalog it (e.g. 'Who is the architect or designer?', 'What's the project name or location?', 'Roughly what year?', 'Where did you find it?'). Empty array when you don't need anything.",
      items: { type: "string" }
    },
    description: {
      type: "string",
      description:
        "A specific, observation-grounded description of what is shown (typology, era, style, materials, structure, spatial qualities, scale, light). LEAVE THIS AN EMPTY STRING when identification_confidence is low/none and the student has not told you what it is — do not write a confident description of something you cannot place."
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
    "identification_confidence",
    "reply",
    "questions",
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
  "A student has found one or more images — often saved from somewhere like Pinterest, with no caption (and possibly several views of the same work, or a related set) — and wants to understand them better: what they are, how to describe them, and what to look for next.",
  "",
  "Your job is to give them CONTEXT and VOCABULARY, and to propose what the image might be.",
  "This studio treats AI as a material to be interrogated, never as an authority. Any identification you give is a CLAIM FOR THE STUDENT TO VERIFY, not a fact.",
  "",
  "This is a CONVERSATION. The student may follow up to tell you who designed it, what it is, or other facts. Treat anything the student tells you as AUTHORITATIVE GROUND TRUTH: adopt it as the primary identification at high confidence, catalog from it, and use it to search for related material. Do not contradict or hedge the student's stated facts — you may gently note if the image looks inconsistent, but defer to them.",
  "",
  "Rules:",
  "- The single most important rule: DO NOT GUESS. If identification_confidence is 'low' or 'none' AND the student has not told you what it is, write NO description and NO assumptions — leave `description` empty, return an EMPTY candidates array, and DO NOT fill in assumed tags, architect, year, or location. Instead put a short honest note in `reply` ('I can't confidently place this one…') and list what would help in `questions`. A confident wrong identification is the worst possible outcome.",
  "- When you ARE confident, or the student has supplied the identity: describe what you see in specific architectural terms (typology, era, style, materials, structure, spatial qualities, scale, light), give candidates (each with visual evidence + one thing to verify), vocabulary, and tags.",
  "- Be especially conservative with interiors, models, sketches, and recent buildings — they are easy to misattribute. Calibrate identification_confidence accordingly.",
  "- Give the student real vocabulary they can use to describe and search for this kind of architecture (this is useful even when you can't identify the work).",
  "- Transcribe any visible text — it often reveals the project.",
  "- Suggest concrete search terms for finding related drawings, plans, and other views (only once you know, or the student tells you, what it is).",
  "",
  "Polish is not proof. Return only the structured object."
].join("\n");

// The user turn carries the image (added by the route) plus any context the
// student gave — a source URL, a one-off note, and (in a follow-up turn) the
// authoritative facts they've typed in the conversation.
export function analysisUser(ctx: {
  sourceUrl?: string;
  note?: string;
  userContext?: string;
  imageCount?: number;
}): string {
  const n = ctx.imageCount && ctx.imageCount > 1 ? ctx.imageCount : 1;
  const subject =
    n > 1 ? `these ${n} images (likely several views of the same work, or a related set)` : "the image";
  const them = n > 1 ? "them" : "it";
  const are = n > 1 ? "are" : "is";
  const lines: string[] = [];
  if (ctx.userContext && ctx.userContext.trim()) {
    lines.push(
      `Here ${are} ${subject}. The student has told you the following — treat it as AUTHORITATIVE and catalog ${them} accordingly (adopt it as the primary identification at high confidence):`,
      "",
      ctx.userContext.trim()
    );
  } else {
    lines.push(
      `Here ${are} ${subject} the student found. Give context, vocabulary, and any honest identification (as leads to verify). If you cannot confidently identify ${them}, do not guess — say so in \`reply\` and ask for what would help in \`questions\`.`
    );
  }
  if (ctx.sourceUrl) lines.push(`\nSource URL / link the student gave: ${ctx.sourceUrl}`);
  if (ctx.note) lines.push(`\nStudent's note / context: ${ctx.note}`);
  return lines.join("\n");
}
