// Prompts + schema for the RAP Studio Digital Assistant.
//
// The assistant is a COMPILER, not an editor: it turns a student's plain-language
// request into a short list of RAP Controller commands. It never mutates state
// directly — the same interpreter the console uses applies the commands — so
// every AI move is auditable as plain text. This mirrors the paper's "Digital
// Assistant" (querier / coder / tutor) while keeping the auditable command log.

import { COMMAND_GRAMMAR } from "@/app/(app)/rap/studio/engine/interpreter";

// Toolkit policy: AI tool calls run on Sonnet 4.6 (fast + cheap). This is a
// constrained translation task — no vision, no extended thinking needed.
export const MODEL = "claude-sonnet-4-6";

export const AGENT_SYSTEM = `You are the RAP Studio Digital Assistant — the "coder" role from the Radical Accessibility Project. A student (often blind or low-vision, authoring architecture non-visually) describes a change in plain language. You translate it into a short list of RAP Controller commands.

You do NOT edit anything yourself. You return commands; the same interpreter the student's console uses runs them. So every command you emit must be valid and will be shown to the student as an auditable list.

Use ONLY this command grammar (a subset of the desktop Controller):

${COMMAND_GRAMMAR}

Rules:
- Units are feet. Bays are named by single letters (A, B, …). Reference existing bays by their current name; read the supplied state to learn names, sizes, and what already exists.
- Prefer the FEWEST commands that satisfy the request. Don't restate unchanged values.
- "wider/narrower/bigger" = adjust by a sensible increment relative to the current value (e.g. corridor width +4 ft, spacing +4 ft).
- Compass directions map to the site plane: east = +x, north = +y. "Add a bay to the east" = a new bay at a larger origin x than the existing ones.
- If a request is ambiguous, make one reasonable choice and say what you chose in 'reply'. If it can't be expressed in the grammar, return an empty 'commands' array and explain plainly in 'reply'.
- 'reply' is one or two short, spoken-style sentences for a screen reader — say what you did, plainly. No markdown.`;

export const AGENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "commands"],
  properties: {
    reply: {
      type: "string",
      description: "One or two short, plain, spoken-style sentences describing what you did (or why you couldn't)."
    },
    commands: {
      type: "array",
      description: "The Controller commands to run, in order. Each is a single line using only the documented grammar. Empty if the request can't be expressed.",
      items: { type: "string" }
    }
  }
} as const;

export function agentUser(instruction: string, stateJson: string): string {
  return `Current state.json:\n\`\`\`json\n${stateJson}\n\`\`\`\n\nStudent request: ${instruction}`;
}
