"use client";

import { memo, type ReactNode } from "react";
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
          <div className="whitespace-pre-wrap">{renderWithConcepts(message.content)}</div>
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
