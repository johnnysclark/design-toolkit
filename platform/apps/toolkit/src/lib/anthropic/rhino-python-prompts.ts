// Prompt for the Rhino / Grasshopper Python gallery's "Edit with AI" chat.
//
// Each snippet card can open a small chat that edits THAT snippet with LLM help.
// The route is stateless (the static gallery holds the thread client-side) — it
// just gets the original snippet as stable context plus the running conversation.
// Design stance matches the rest of the toolkit: the student stays the agent;
// the model is a material to interrogate, and every snippet must stay runnable.

export { MODEL } from "./models";

export type SnippetEnv = "rhino" | "gh";

export function envLabel(env: SnippetEnv): string {
  return env === "rhino"
    ? "RhinoPython (run in Rhino's EditPythonScript editor)"
    : "GhPython (a GhPython component in Grasshopper)";
}

// Stable, cacheable system prompt. Includes the original snippet so the whole
// conversation shares one cached prefix (cheap after the first turn).
export function buildSystem(opts: { title: string; env: SnippetEnv; code: string }): string {
  const { title, env, code } = opts;
  const envRules =
    env === "rhino"
      ? `This snippet runs in Rhino's EditPythonScript editor (RhinoPython). Use rhinoscriptsyntax (import rhinoscriptsyntax as rs) and/or scriptcontext / Rhino. It should prompt for input with rs.GetObject / rs.GetObjects / rs.GetReal where appropriate and print a result. Do NOT turn it into a GhPython component.`
      : `This snippet is a GhPython component in Grasshopper. Use Rhino.Geometry as rg (and Grasshopper.Kernel only if truly needed). Read the named inputs and assign the named outputs. Do NOT use rs.Get* (there is no command-line prompt in a component).`;

  return [
    `You are an expert Rhino 7/8 + Grasshopper Python assistant, helping an architecture student modify one snippet from the All Means Works design toolkit's copy-paste snippet gallery.`,
    ``,
    `RULES:`,
    `- ${envRules}`,
    `- NO third-party plugins (no Kangaroo, LunchBox, Pufferfish, Weaverbird, Anemone). Standard RhinoCommon / rhinoscriptsyntax / Grasshopper.Kernel ONLY.`,
    `- Every method/property you use MUST exist in RhinoCommon / rhinoscriptsyntax with the correct signature. If unsure a method exists, use a more basic one you are certain of. Never invent API.`,
    `- When you change the code, return the COMPLETE updated script in ONE \`\`\`python fenced code block (the student copies the whole thing), then 1–3 short sentences on what changed and why. If they only ask a question, answer briefly and include code only if it helps.`,
    `- Keep it runnable and focused. Explain like a patient studio TA. Plain language; the student stays the one making decisions.`,
    ``,
    `ORIGINAL SNIPPET — "${title}" · ${envLabel(env)}:`,
    "```python",
    code,
    "```"
  ].join("\n");
}
