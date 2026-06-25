// Shared helpers for pulling fenced code blocks out of a tutor answer — used by
// the chat bubble (to render export cards) and the sidebar (to surface the
// latest runnable script with a big copy button).

export interface CodeBlock {
  lang: string;
  code: string;
}

// ```lang\n …code… ``` — language tag optional, must have a newline after the
// opening fence. Global; callers reset lastIndex before iterating.
export const CODE_FENCE_RE = /```([\w+-]*)[^\S\r\n]*\r?\n([\s\S]*?)```/g;

export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let m: RegExpExecArray | null;
  CODE_FENCE_RE.lastIndex = 0;
  while ((m = CODE_FENCE_RE.exec(content)) !== null) {
    blocks.push({ lang: (m[1] || "").toLowerCase(), code: m[2].replace(/\s+$/, "") });
  }
  return blocks;
}

const PYTHON_LANGS = new Set(["python", "py", "ghpython", "rhinopython"]);

// The script to surface in the sidebar: the last Python block if there is one,
// else the last code block of any language (a GH C# script still pastes into
// Rhino). Returns null when the answer has no code.
export function latestScript(content: string): CodeBlock | null {
  const blocks = extractCodeBlocks(content);
  if (blocks.length === 0) return null;
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (PYTHON_LANGS.has(blocks[i].lang)) return blocks[i];
  }
  return blocks[blocks.length - 1];
}
