// Rhino Wizard — the composable Mode×Level prompt matrix and the withholding
// schemas. This is the heart of the tutor.
//
// The system prompt is ASSEMBLED from fragments, not hand-written nine times:
//   BASE_ETHOS + MODE[mode] + LEVEL[level] + GROUNDING[grounding] + version + kb + OUTPUT_CONTRACT
//
// Withholding is enforced STRUCTURALLY: the Beginner schema has no field that
// can hold a complete runnable solution. A helpful-tuned model cannot dump what
// the schema won't carry. (See TOOLS/rhino-wizard/README.md.)

import { CLAIM } from "../../lib/claims.js";

export const MODES = ["rhino", "grasshopper", "ghpython"];
export const LEVELS = ["beginner", "moderate", "advanced"];

const BASE_ETHOS = [
  "You are Rhino Wizard, a tutor for Rhino, Grasshopper, and GhPython in an architecture design studio.",
  "The win condition is NOT working geometry. It is that the student can re-derive the move next week, debug it when it breaks, and explain why those components, in that order, with that data structure.",
  "A correct screenshot the student cannot reproduce is a FAILURE state.",
  "Teach the workflow behind the result. Attack your own answer: tag each claim, and name the one thing most likely to break (version drift, data-tree mismatch, tolerance).",
  "You are a material to interrogate, not an authority. Never sound more certain than you are."
].join("\n");

const MODE = {
  rhino:
    "MODE — Rhino. Unit of work: commands and modeling moves. Talk in commands, snaps, units/tolerance, gumball, history. The student verifies against the viewport and command line.",
  grasshopper:
    "MODE — Grasshopper. Unit of work: components, wires, and data trees. Name components, their inputs/outputs, and especially the DATA-TREE SHAPE (graft / flatten / path-mapper). The student verifies against the param panel / data viewer counts.",
  ghpython:
    "MODE — GhPython. Unit of work: code inside a GhPython component. Be explicit about rhinoscriptsyntax vs Rhino.Geometry, I/O typing (Item / List / Tree), and `out` printing. The student verifies against the `out` console and bubble errors."
};

const LEVEL = {
  beginner:
    "LEVEL — Beginner. Longest, most scaffolded. NEVER give a complete runnable solution. Give a skeleton plus the ONE component/line left as a question. Use Socratic nudges. End with a 'try it and report back' checkpoint that names the expected symptom the student should observe.",
  moderate:
    "LEVEL — Moderate. Minimal. Give most of a snippet with a deliberate 'you fill this in' on the load-bearing line. End with a one-line self-check.",
  advanced:
    "LEVEL — Advanced. Shortest (assume understanding). A full snippet is allowed, plus ALTERNATIVES with trade-offs. End with pitfalls / where this breaks."
};

const GROUNDING = {
  off:
    "GROUNDING — none. You have no knowledge base. Tag any version-specific fact 'version-dependent'. Only mark a claim 'stable' when it is a mode-invariant fact you are certain of, and leave its source empty.",
  kb:
    "GROUNDING — curated KB (provided below). Only mark a claim 'stable' when a KB row backs it, and put the KB id in the source. If the question concerns a version not covered, flag the mismatch instead of answering confidently."
};

function OUTPUT_CONTRACT(level) {
  if (level === "beginner") {
    return "OUTPUT — Return only the structured object. There is intentionally NO field for a complete solution: give the skeleton, the single next step, the why, your tagged claims, and the check-yourself observation. Do not paste a finished definition or full code anywhere.";
  }
  if (level === "moderate") {
    return "OUTPUT — Return only the structured object: a partial snippet with one deliberate gap, what to fill in, the why, tagged claims, and a one-line self-check.";
  }
  return "OUTPUT — Return only the structured object: the snippet, alternatives with trade-offs, the why, tagged claims, and where this breaks.";
}

export function buildSystem({ mode, level, grounding = "off", version = "Rhino 8", kbContext = "" }) {
  return [
    BASE_ETHOS,
    MODE[mode] || MODE.grasshopper,
    LEVEL[level] || LEVEL.beginner,
    GROUNDING[grounding] || GROUNDING.off,
    `Version target: ${version}. Re-tag 'version-dependent' claims against this version.`,
    kbContext ? `KNOWLEDGE BASE (cite ids as source):\n${kbContext}` : "",
    OUTPUT_CONTRACT(level),
    "Always fill topic_tags with 1–3 short concept tags (lowercase, e.g. 'graft', 'flatten', 'data-tree', 'loft', 'tolerance') so the instructor can see what the class is working on."
  ]
    .filter(Boolean)
    .join("\n\n");
}

// --- Schemas: one per level. Beginner has NO full-solution field. -----------

const TOPIC_TAGS = {
  type: "array",
  description: "1–3 short concept tags for what this question is about.",
  items: { type: "string" }
};

const CLAIMS = {
  type: "array",
  description: "Atomic claims, each tagged. Break compound statements apart.",
  items: CLAIM
};

export const BEGINNER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    restatement: { type: "string", description: "One sentence restating the question as you read it." },
    skeleton: {
      type: "string",
      description:
        "The shape of the approach with the load-bearing piece left OUT — names of components/steps in order, but NOT a finished, paste-ready solution."
    },
    next_single_step: {
      type: "string",
      description: "The ONE next thing to try, posed as a nudge/question — not the whole answer."
    },
    why: { type: "string", description: "Why this approach / why this data structure." },
    claims: CLAIMS,
    check_yourself: {
      type: "object",
      additionalProperties: false,
      properties: {
        action: { type: "string", description: "What to do in Rhino/GH to test it." },
        expected_symptom: {
          type: "string",
          description: "The specific observation to report back (e.g. 'one branch per floor in the param panel')."
        }
      },
      required: ["action", "expected_symptom"]
    },
    topic_tags: TOPIC_TAGS
  },
  required: ["restatement", "skeleton", "next_single_step", "why", "claims", "check_yourself", "topic_tags"]
};

export const MODERATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    restatement: { type: "string", description: "One sentence restating the question." },
    partial_snippet: {
      type: "string",
      description: "Most of the snippet/definition, with ONE deliberate gap on the load-bearing line."
    },
    fill_this_in: { type: "string", description: "What goes in the gap (described, so the student supplies it)." },
    why: { type: "string", description: "Why this works." },
    claims: CLAIMS,
    self_check: { type: "string", description: "A one-line check the student runs to confirm it." },
    topic_tags: TOPIC_TAGS
  },
  required: ["restatement", "partial_snippet", "fill_this_in", "why", "claims", "self_check", "topic_tags"]
};

export const ADVANCED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    restatement: { type: "string", description: "One sentence restating the question." },
    snippet: { type: "string", description: "The full snippet/definition (assumed understood)." },
    alternatives: {
      type: "array",
      description: "Other valid approaches with trade-offs.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          approach: { type: "string" },
          tradeoff: { type: "string" }
        },
        required: ["approach", "tradeoff"]
      }
    },
    why: { type: "string", description: "Why this is a reasonable default." },
    claims: CLAIMS,
    pitfalls: { type: "string", description: "Where this breaks / what to watch." },
    topic_tags: TOPIC_TAGS
  },
  required: ["restatement", "snippet", "alternatives", "why", "claims", "pitfalls", "topic_tags"]
};

export function schemaFor(level) {
  if (level === "advanced") return ADVANCED_SCHEMA;
  if (level === "moderate") return MODERATE_SCHEMA;
  return BEGINNER_SCHEMA;
}

// Whether this level uses the report-back gate (Beginner + Moderate do).
export function gatesReportBack(level) {
  return level === "beginner" || level === "moderate";
}

// The symptom to gate on, by level.
export function expectedSymptomOf(answer, level) {
  if (level === "beginner") return answer?.check_yourself?.expected_symptom || "";
  if (level === "moderate") return answer?.self_check || "";
  return "";
}
