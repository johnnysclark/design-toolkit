// Prompts + JSON Schemas for the Design Critic ("Critic").
//
// Design intent: the Critic gives a student ADVERSARIAL, HONEST feedback on their
// own work — never flattery, never a ghostwriter. The studio's stance runs through
// every pass: AI is a material to interrogate, never an authority. Every factual
// claim the model makes is a CLAIM TO VERIFY, tagged ✓ / ? / ⚠, and the student
// stays the cognitive agent. The framing the student always sees: "use with
// caution; consult humans too."
//
// One route, many modes. Each mode is a single structured-output pass:
//   jury           — adoptable critic personas, "strongest case it fails"
//   weather        — crit weather report: forecast likely jury questions
//   rebuttal       — rehearsal: the follow-up a real critic asks after your answer
//   portfolio-draft— a disposable scaffold + thesis options (NOT a deliverable)
//   self-attack    — attacks the STUDENT'S OWN words (never the AI draft)
//   thesis         — defensible-thesis builder

// Toolkit-wide policy: AI tool calls run on Sonnet 4.6 (vision + structured output).
export { MODEL } from "./models";

// ---------------------------------------------------------------------------
// Adoptable critic personas. Each contributes a `system_fragment` that is
// concatenated into the jury system prompt for the personas the student adopts.
// The route validates incoming ids against PERSONA_IDS and drops unknowns.
// ---------------------------------------------------------------------------
export type Persona = {
  id: string;
  name: string;
  stance: string; // one-line description for the picker UI
  system_fragment: string; // injected into the jury system prompt
};

export const PERSONAS: Persona[] = [
  {
    id: "technical",
    name: "The Technical Critic",
    stance: "Structure, environmental performance, code, buildability.",
    system_fragment:
      "THE TECHNICAL CRITIC: you press on whether this can actually be built and whether it performs. Structure and load paths, environmental behaviour (sun, wind, thermal, daylight), egress and code reality, constructability, water and detailing. You distrust diagrams that ignore physics. Ask how the appealing move survives gravity, weather, and the building code."
  },
  {
    id: "theory",
    name: "The Theory Critic",
    stance: "Concept, precedent, intellectual honesty, discourse.",
    system_fragment:
      "THE THEORY / HISTORY CRITIC: you press on the idea. Is the concept rigorous or decorative? Where does it sit in architectural discourse and precedent — and does the student know? You catch borrowed moves presented as original, and concepts that the plan quietly abandons. Ask what the project is really arguing and whether the form earns the rhetoric."
  },
  {
    id: "client-pragmatist",
    name: "The Client / Pragmatist",
    stance: "Budget, program, schedule, who uses and pays for this.",
    system_fragment:
      "THE CLIENT / PRAGMATIST: you ask who pays for this, who uses it, and whether it does the job. Budget reality, program fit, square-footage efficiency, maintenance, schedule. You are unimpressed by poetry that doesn't house the brief. Ask what gets value-engineered out first and whether the client would actually sign off."
  },
  {
    id: "accessibility",
    name: "The Accessibility Advocate",
    stance: "Inclusive / universal design — who the design excludes.",
    system_fragment:
      "THE ACCESSIBILITY ADVOCATE: you ask who this design excludes. Universal and inclusive design, the non-visual and non-ambulatory experience, wayfinding, the dignity of the accessible route (not a tacked-on ramp at the back). You treat accessibility as a design generator, not a compliance afterthought. Ask how someone who can't see or can't climb experiences the project's best moment."
  },
  {
    id: "context-urbanist",
    name: "The Context / Urbanist",
    stance: "Site, public realm, neighbours, ecological & social externalities.",
    system_fragment:
      "THE CONTEXT / URBANIST: you press on the project's relationship to its site and city. The public realm, the street edge, neighbours, ecology, what the project takes from and gives back to its context, social and environmental externalities. You distrust the object that ignores its block. Ask what the project does to the ground around it and to the people already there."
  },
  {
    id: "materials-maker",
    name: "The Materials / Maker",
    stance: "Tectonics, detailing, fabrication, honesty of material.",
    system_fragment:
      "THE MATERIALS / MAKER: you press on how it is actually made. Tectonics, the joint, the detail, fabrication logic, the honest expression (or dishonest faking) of material and structure. You distrust renders where everything is a seamless white surface. Ask how two materials meet, who makes that connection, and whether the material story is true."
  }
];

export const PERSONA_IDS = PERSONAS.map((p) => p.id);

// ---------------------------------------------------------------------------
// The shared CLAIM primitive. Every factual assertion the model makes is a
// claim the student must verify, carrying a tag and a reason. Embedded in
// every schema below.  supported → ✓ · unverified → ? · likely-wrong → ⚠
// ---------------------------------------------------------------------------
const CLAIM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string", description: "The factual claim, stated plainly." },
    tag: {
      type: "string",
      enum: ["supported", "unverified", "likely-wrong"],
      description:
        "supported = you can point to evidence in the work itself; unverified = plausible but you'd be guessing, the student must check; likely-wrong = a blind spot or probable error the student should confront."
    },
    why: {
      type: "string",
      description:
        "Why this tag — what in the work supports it, or what makes it a guess / a likely error."
    }
  },
  required: ["text", "tag", "why"]
} as const;

const CLAIM_ARRAY = {
  type: "array",
  description: "Factual claims, each tagged ✓/?/⚠. Prefer few, honest claims over many confident ones.",
  items: CLAIM_SCHEMA
} as const;

// ---------------------------------------------------------------------------
// JURY — one critique per adopted persona.
// ---------------------------------------------------------------------------
export const JURY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall_note: {
      type: "string",
      description:
        "One or two plain sentences to the student framing what follows: these are claims to verify, not verdicts — consult humans too."
    },
    critiques: {
      type: "array",
      description: "Exactly one critique per persona the student adopted, in the same order.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          persona_id: { type: "string" },
          persona_name: { type: "string" },
          strongest_case_it_fails: {
            type: "string",
            description:
              "This persona's single strongest, most defensible argument that the project FAILS on its own terms. Be specific and grounded in what you can see; do not soften it into encouragement."
          },
          lines_of_attack: {
            type: "array",
            description: "2–4 concrete lines of attack, each grounded in the work and its claims.",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                point: { type: "string", description: "The specific weakness, in this persona's voice." },
                claims: CLAIM_ARRAY
              },
              required: ["point", "claims"]
            }
          },
          questions_it_would_ask: {
            type: "array",
            description: "2–4 hard questions this persona would ask at the review.",
            items: { type: "string" }
          },
          what_would_change_my_mind: {
            type: "string",
            description:
              "An honest path to defend the project: what evidence or move would make this persona withdraw the critique. Gives the student something to fight back with."
          }
        },
        required: [
          "persona_id",
          "persona_name",
          "strongest_case_it_fails",
          "lines_of_attack",
          "questions_it_would_ask",
          "what_would_change_my_mind"
        ]
      }
    },
    blind_spots: {
      ...CLAIM_ARRAY,
      description:
        "Cross-cutting blind spots the student is likely NOT seeing — mostly ⚠ (likely-wrong) and ? (unverified) claims."
    }
  },
  required: ["overall_note", "critiques", "blind_spots"]
} as const;

// ---------------------------------------------------------------------------
// WEATHER — crit weather report: 5–8 forecasted jury questions.
// ---------------------------------------------------------------------------
export const WEATHER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    forecast: {
      type: "array",
      description: "5 to 8 questions a real review jury is likely to ask, hardest first.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          category: {
            type: "string",
            enum: ["fair", "loaded", "out-of-scope"],
            description:
              "fair = a legitimate question the work must answer; loaded = carries a hidden assumption or agenda, triage it; out-of-scope = beyond this brief, you may decline it politely."
          },
          why: {
            type: "string",
            description: "Why this question is likely, and why it falls in that category."
          },
          what_it_probes: {
            type: "string",
            description: "The underlying weakness or decision the question is really testing."
          },
          claims: CLAIM_ARRAY
        },
        required: ["question", "category", "why", "what_it_probes", "claims"]
      }
    },
    prep_note: {
      type: "string",
      description:
        "One short paragraph on how to triage these: defend the fair, reframe the loaded, decline the out-of-scope. Reminds the student these are forecasts to prepare for, not certainties."
    }
  },
  required: ["forecast", "prep_note"]
} as const;

// ---------------------------------------------------------------------------
// REBUTTAL — the follow-up a real critic asks AFTER the student's answer.
// ---------------------------------------------------------------------------
export const REBUTTAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    acknowledged: {
      type: "string",
      description: "A brief, fair reflection of what the student's answer actually said."
    },
    follow_up: {
      type: "string",
      description:
        "The next question a sharp critic would ask, given that answer. Push where the answer is weakest; do not let them off the hook, but stay fair."
    },
    pressure_point: {
      type: "string",
      description: "The single weakest seam in the student's answer that the follow-up targets."
    },
    claims: {
      ...CLAIM_ARRAY,
      description: "Factual claims embedded in the STUDENT'S answer, tagged ✓/?/⚠ so they can check their own assertions."
    },
    fair_or_loaded: {
      type: "string",
      enum: ["fair", "loaded"],
      description: "Whether your own follow-up is a fair question or a deliberately loaded one (label it honestly)."
    }
  },
  required: ["acknowledged", "follow_up", "pressure_point", "claims", "fair_or_loaded"]
} as const;

// ---------------------------------------------------------------------------
// PORTFOLIO_DRAFT — a disposable scaffold the student rewrites + thesis options.
// ---------------------------------------------------------------------------
export const PORTFOLIO_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ai_draft: {
      type: "string",
      description:
        "A deliberately rough, GENERIC scaffold the student will demolish and rewrite in their own voice — NOT a polished finished statement. Keep it plain and a little flat on purpose; never invent project facts. 120–180 words."
    },
    thesis_options: {
      type: "array",
      description: "2–3 candidate one-sentence theses the project could defend.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          statement: { type: "string" },
          defensibility: { type: "string", description: "What makes this thesis defensible — or fragile." },
          claims: CLAIM_ARRAY
        },
        required: ["statement", "defensibility", "claims"]
      }
    },
    voice_prompts: {
      type: "array",
      description:
        "3–5 pointed questions that pull the student's OWN words out — the move they're proudest of, the thing they're nervous about, the decision only they can explain.",
      items: { type: "string" }
    }
  },
  required: ["ai_draft", "thesis_options", "voice_prompts"]
} as const;

// ---------------------------------------------------------------------------
// SELF_ATTACK — attacks the STUDENT'S OWN words, never the AI draft.
// ---------------------------------------------------------------------------
export const SELF_ATTACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    target: {
      type: "string",
      enum: ["student_text"],
      description: "Always 'student_text' — you attack the student's own writing, never an AI draft."
    },
    attacks: {
      type: "array",
      description: "2–5 attacks on specific sentences in the student's own writing.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          quote: { type: "string", description: "The student's own phrase or sentence, quoted." },
          problem: { type: "string", description: "What's vague, unsupported, clichéd, or overclaimed about it." },
          claims: CLAIM_ARRAY,
          stronger_version_hint: {
            type: "string",
            description:
              "A HINT toward a stronger version — a question or direction, NEVER a rewritten sentence. Do not hand back finished prose; the student must rewrite it themselves."
          }
        },
        required: ["quote", "problem", "claims", "stronger_version_hint"]
      }
    },
    unsupported_assertions: {
      ...CLAIM_ARRAY,
      description: "Claims in the student's text presented as fact without support — mostly ? and ⚠."
    },
    what_holds_up: {
      type: "array",
      description: "1–3 things in the student's writing that genuinely work — honest credit, so it isn't pure demolition.",
      items: { type: "string" }
    }
  },
  required: ["target", "attacks", "unsupported_assertions", "what_holds_up"]
} as const;

// ---------------------------------------------------------------------------
// THESIS — defensible-thesis builder.
// ---------------------------------------------------------------------------
export const THESIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      description: "3 candidate theses for the project, strongest-supported first.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", description: "A short stable id, e.g. 't1'." },
          thesis: { type: "string", description: "A single defensible sentence." },
          why_defensible: { type: "string" },
          likely_attacks: {
            type: "array",
            description: "The attacks a jury would aim at this thesis.",
            items: { type: "string" }
          },
          claims: CLAIM_ARRAY
        },
        required: ["id", "thesis", "why_defensible", "likely_attacks", "claims"]
      }
    },
    strongest_id: { type: "string", description: "The id of the candidate you judge most defensible." }
  },
  required: ["candidates", "strongest_id"]
} as const;

// ---------------------------------------------------------------------------
// System prompts.
// ---------------------------------------------------------------------------
const BASE_ETHOS = [
  "You are a design critic for an architecture design studio.",
  "This studio treats AI as a material to be interrogated, never as an authority. Everything you assert is a CLAIM FOR THE STUDENT TO VERIFY, not a fact — tag claims honestly (✓ supported / ? unverified / ⚠ likely-wrong) and prefer few honest claims over many confident ones.",
  "Your value is adversarial honesty. Do NOT flatter, hedge into vagueness, or pad with encouragement. Make the strongest defensible case, then give the student an honest path to fight back.",
  "Never invent project facts you cannot see or were not told. If you are guessing, tag it ? and say so.",
  "The student stays the author and the decision-maker. You provoke and pressure; they decide and speak.",
  "Return only the structured object."
].join("\n");

export function buildJurySystem(adoptedIds: string[]): string {
  const adopted = PERSONAS.filter((p) => adoptedIds.includes(p.id));
  const fragments = adopted.map((p) => `- ${p.system_fragment}`).join("\n");
  return [
    BASE_ETHOS,
    "",
    "You will speak as a JURY of distinct critics. Produce exactly one critique per persona below, in order, each unmistakably in that persona's voice and concerns. Do not blur them together.",
    "",
    "The adopted personas:",
    fragments
  ].join("\n");
}

export const WEATHER_SYSTEM = [
  BASE_ETHOS,
  "",
  "MODE: Crit Weather Report. Forecast the questions a real review jury is most likely to ask this project, so the student can prepare instead of panicking equally about everything. Triage each as fair / loaded / out-of-scope and explain what it really probes."
].join("\n");

export const REBUTTAL_SYSTEM = [
  BASE_ETHOS,
  "",
  "MODE: Rebuttal Rehearsal. The student is rehearsing for a review. They have answered a forecasted question. Play the follow-up a sharp, fair critic would ask next — pressing the weakest seam in their answer. Also tag any factual claims the student made in their own answer."
].join("\n");

export const PORTFOLIO_DRAFT_SYSTEM = [
  BASE_ETHOS,
  "",
  "MODE: Portfolio Scaffold. This tool is a rehearsal room, NEVER a ghostwriter. Produce a deliberately rough, generic scaffold the student will demolish and rewrite in their own voice — the student's EDITS are the deliverable, not your draft. Keep it plain and a little flat on purpose so it is obvious it must be rewritten. Offer candidate theses and questions that pull the student's own words out. Never invent project facts."
].join("\n");

export const SELF_ATTACK_SYSTEM = [
  BASE_ETHOS,
  "",
  "MODE: Stress-test the student's OWN writing. You are given text the STUDENT wrote (not an AI draft). Attack it: quote their own sentences and show what is vague, unsupported, clichéd, or overclaimed. Give hints toward stronger versions but NEVER rewrite the sentences for them — they must do that themselves. Give honest credit for what holds up. The loop ends with the student defending their own voice."
].join("\n");

export const THESIS_SYSTEM = [
  BASE_ETHOS,
  "",
  "MODE: Defensible-Thesis Builder. Offer candidate one-sentence theses the project could actually defend, each with why it's defensible and the attacks a jury would aim at it. Do not pick a 'best' for the student to adopt blindly — name the most defensible and let them choose."
].join("\n");

// ---------------------------------------------------------------------------
// User-prompt builders. Image blocks (jury) are added by the route; these carry
// the typed context.
// ---------------------------------------------------------------------------
type WorkContext = { title?: string; thesis?: string; brief?: string; imageCount?: number };

function workLines(ctx: WorkContext): string[] {
  const lines: string[] = [];
  if (ctx.imageCount && ctx.imageCount > 0) {
    lines.push(
      ctx.imageCount > 1
        ? `The student has uploaded ${ctx.imageCount} images of their work (drawings, boards, models, or renders).`
        : "The student has uploaded an image of their work."
    );
  }
  if (ctx.title?.trim()) lines.push(`Project title: ${ctx.title.trim()}`);
  if (ctx.thesis?.trim()) lines.push(`The student's stated thesis / claim: ${ctx.thesis.trim()}`);
  if (ctx.brief?.trim()) lines.push(`Brief / context the student gave:\n${ctx.brief.trim()}`);
  return lines;
}

export function juryUser(ctx: WorkContext): string {
  return [
    "Convene the jury on the student's work below. Each adopted persona gives its strongest defensible case that the project fails, grounded in what you can actually see, plus hard questions and an honest path to defend.",
    "",
    ...workLines(ctx),
    "",
    "If the images are unclear or context is thin, say what you cannot assess rather than inventing it (tag those gaps ?)."
  ].join("\n");
}

export function weatherUser(ctx: WorkContext): string {
  return ["Forecast the review questions for the work below.", "", ...workLines(ctx)].join("\n");
}

export function rebuttalUser(ctx: WorkContext & { question: string; answer: string }): string {
  return [
    "The student is rehearsing. Here is the work, the forecasted question, and the student's answer.",
    "",
    ...workLines(ctx),
    "",
    `Forecasted question: ${ctx.question}`,
    `The student's answer: ${ctx.answer}`,
    "",
    "Play the follow-up a sharp, fair critic asks next, and tag the claims in the student's own answer."
  ].join("\n");
}

export function portfolioDraftUser(ctx: WorkContext): string {
  return [
    "Produce a rough scaffold the student will rewrite, plus thesis options and voice-pulling questions, for the work below.",
    "",
    ...workLines(ctx)
  ].join("\n");
}

export function selfAttackUser(ctx: WorkContext & { studentText: string }): string {
  return [
    "Stress-test the STUDENT'S OWN writing below. Quote their sentences and attack them; hint, never rewrite.",
    "",
    ...workLines(ctx),
    "",
    "The student's own writing:",
    ctx.studentText.trim()
  ].join("\n");
}

export function thesisUser(ctx: WorkContext): string {
  return ["Offer defensible thesis candidates for the work below.", "", ...workLines(ctx)].join("\n");
}
