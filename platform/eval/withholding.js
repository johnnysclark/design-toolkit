// Withholding eval — the headline metric for a how-to tutor.
//
// For each task, ask at Beginner and assert the structured answer carries no
// paste-ready full solution. Because the Beginner schema has no solution field,
// this should be impossible BY CONSTRUCTION — this eval proves the schema is
// actually the one being enforced, and that a `why` + a single next step are
// present. Re-run after any prompt-fragment change.
//
// Usage:  ANTHROPIC_API_KEY=sk-ant-... node eval/withholding.js

import { client, MODEL, parseJson, textOf } from "../lib/anthropic.js";
import { buildSystem, BEGINNER_SCHEMA } from "../apps/rhino-wizard/prompts.js";

const TASKS = [
  { mode: "grasshopper", q: "How do I get a different window count per floor?" },
  { mode: "grasshopper", q: "My list lengths don't match and components repeat the last item. Why?" },
  { mode: "rhino", q: "My Boolean union keeps failing on two solids that clearly overlap." },
  { mode: "ghpython", q: "How do I output a tree of points from a GhPython component?" }
];

// Heuristics for a "paste-ready full solution" leaking through.
function looksLikeFullSolution(answer) {
  const blob = JSON.stringify(answer).toLowerCase();
  // Multi-line code fences or long imperative code are the tell.
  const fences = (blob.match(/```/g) || []).length;
  const hasImportChain = /import .+\n.+\n.+=/.test(JSON.stringify(answer));
  return fences >= 2 || hasImportChain;
}

async function askBeginner(task) {
  const system = buildSystem({ mode: task.mode, level: "beginner" });
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 20000,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: task.q }],
    output_config: { format: { type: "json_schema", schema: BEGINNER_SCHEMA } }
  });
  const message = await stream.finalMessage();
  return parseJson(textOf(message));
}

async function main() {
  let failures = 0;
  for (const task of TASKS) {
    try {
      const a = await askBeginner(task);
      const hasWhy = !!(a.why && a.why.trim());
      const hasNext = !!(a.next_single_step && a.next_single_step.trim());
      const leaked = looksLikeFullSolution(a) || "full_solution" in a || "snippet" in a;
      const ok = hasWhy && hasNext && !leaked;
      if (!ok) failures++;
      console.log(`${ok ? "✓" : "✗"} [${task.mode}] ${task.q}`);
      if (!ok) {
        console.log(`    why:${hasWhy} next:${hasNext} leaked:${leaked}`);
      }
    } catch (err) {
      failures++;
      console.log(`✗ [${task.mode}] ${task.q}  — ${err.message}`);
    }
  }
  const rate = ((failures / TASKS.length) * 100).toFixed(0);
  console.log(`\nwithhold-failure rate: ${rate}%  (${failures}/${TASKS.length})`);
  process.exit(failures ? 1 : 0);
}

main();
