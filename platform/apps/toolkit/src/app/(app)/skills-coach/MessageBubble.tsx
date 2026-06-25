"use client";

import { memo, useState, type ReactNode } from "react";
import { getConcept } from "@/lib/skills-coach/concepts";
import type { CoachMeta, ClaimTag } from "@/lib/anthropic/skills-coach-prompts";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: CoachMeta;
  attachment?: { name: string; kind: "image" | "pdf"; url?: string } | null;
}

const TAG_STYLE: Record<ClaimTag, { glyph: string; label: string; cls: string }> = {
  stable: { glyph: "✓", label: "stable", cls: "border-green-300 bg-green-50 text-green-800" },
  version: { glyph: "?", label: "version-dependent", cls: "border-amber-300 bg-amber-50 text-amber-800" },
  check: { glyph: "⚠", label: "check this yourself", cls: "border-red-300 bg-red-50 text-red-800" }
};

const CONCEPT_RE = /\[\[concept:([a-z0-9-]+)\]\]/g;

// Resolve [[concept:slug]] tokens to trusted links (never a model-written URL).
// Unknown slugs render as plain text; whitespace-pre-wrap preserves line breaks.
function renderWithConcepts(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  CONCEPT_RE.lastIndex = 0;
  while ((m = CONCEPT_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const concept = getConcept(m[1]);
    if (concept) {
      out.push(
        <a
          key={`c-${key++}`}
          href={concept.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`${concept.oneLiner}  ·  opens ${concept.source === "community" ? "community" : "official"} docs`}
          className="font-medium text-[#ff3b21] underline decoration-[#ff3b21]/40 underline-offset-2 hover:decoration-[#ff3b21]"
        >
          {concept.title}
        </a>
      );
    } else {
      out.push(m[1]); // unknown slug — show the bare text, no link
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Fenced ```lang code blocks become an export card. The tutor is instructed to
// wrap runnable Grasshopper/Rhino Python in a fence, and students get Copy + a
// clear Export (download) button so they can drop the script into a component.
const CODE_RE = /```([\w+-]*)[^\S\r\n]*\r?\n([\s\S]*?)```/g;

function CodeCard({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const language = (lang || "code").toLowerCase();
  const ext =
    language === "python" || language === "py" || language === "ghpython"
      ? "py"
      : language === "cs" || language === "csharp"
        ? "cs"
        : "txt";

  function copy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  function download() {
    const blob = new Blob([code + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skills-coach-script.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
          {language}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            type="button"
            onClick={download}
            className="rounded-md bg-[#ff3b21] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#e22d15]"
          >
            ↓ Export .{ext}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-[13px] leading-relaxed text-neutral-800">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

// Split assistant prose into text + fenced-code segments: each code block
// renders as an export card, each text run keeps its concept links.
function renderBody(content: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  CODE_RE.lastIndex = 0;
  while ((m = CODE_RE.exec(content)) !== null) {
    const before = content.slice(last, m.index).replace(/^\n+|\n+$/g, "");
    if (before) {
      out.push(
        <div key={`t-${key++}`} className="whitespace-pre-wrap">
          {renderWithConcepts(before)}
        </div>
      );
    }
    out.push(<CodeCard key={`code-${key++}`} lang={m[1]} code={m[2].replace(/\s+$/, "")} />);
    last = m.index + m[0].length;
  }
  const rest = content.slice(last).replace(/^\n+/, "");
  if (rest) {
    out.push(
      <div key={`t-${key++}`} className="whitespace-pre-wrap">
        {renderWithConcepts(rest)}
      </div>
    );
  }
  if (out.length === 0) {
    out.push(
      <div key="t-0" className="whitespace-pre-wrap">
        {renderWithConcepts(content)}
      </div>
    );
  }
  return out;
}

function MessageBubbleImpl({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-neutral-900 px-4 py-2.5 text-sm text-white">
          {message.attachment && (
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-xs">
              <span>{message.attachment.kind === "pdf" ? "📄" : "🖼"}</span>
              <span className="max-w-[14rem] truncate">{message.attachment.name}</span>
            </div>
          )}
          {message.content && (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          )}
        </div>
      </div>
    );
  }

  const meta = message.meta;
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-3">
        <div className="rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-800">
          <div className="space-y-3">{renderBody(message.content)}</div>
        </div>

        {meta?.claims && meta.claims.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {meta.claims.map((c, i) => {
              const t = TAG_STYLE[c.tag] ?? TAG_STYLE.check;
              return (
                <span
                  key={i}
                  title={t.label}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${t.cls}`}
                >
                  <span aria-hidden>{t.glyph}</span>
                  {c.text}
                </span>
              );
            })}
          </div>
        )}

        {meta?.report_back && (
          <div className="rounded-xl border border-[#ff3b21]/30 bg-[#ff3b21]/[0.04] px-3 py-2.5 text-sm text-neutral-800">
            <span className="mr-1 font-semibold uppercase tracking-wide text-[11px] text-[#ff3b21]">
              ▸ Try it, then tell me
            </span>
            <span className="block pt-0.5">{meta.report_back}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Committed bubbles never change, so memoizing keeps the thread from
// re-rendering while new tokens stream into the live bubble below it.
const MessageBubble = memo(MessageBubbleImpl);
export default MessageBubble;
