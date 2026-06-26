"use client";

import { useState } from "react";
import { getConcept } from "@/lib/skills-coach/concepts";
import type { CodeBlock } from "@/lib/skills-coach/code";

// Three stacked, collapsible panels next to the chat:
//   In context  — the concept being discussed (from the curated KB)
//   Script      — the latest Python the tutor wrote, with a big Copy button
//   Further ideas — other commands / workflows / resources to get the job done
// Each is a native <details> so it collapses with no extra state.

function Chevron() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-neutral-900 transition-transform group-open:rotate-90"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 2l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CARD = "group rounded-2xl border border-neutral-200 bg-white";
const SUMMARY =
  "flex cursor-pointer list-none select-none items-center gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-900 [&::-webkit-details-marker]:hidden";

function ConceptSection({ slug }: { slug: string | null }) {
  const concept = slug ? getConcept(slug) : undefined;
  return (
    <details open className={CARD}>
      <summary className={SUMMARY}>
        <Chevron /> In context
      </summary>
      <div className="px-4 pb-4 text-sm">
        {!concept ? (
          <p className="text-neutral-900">
            As you and the coach discuss a 3D or graphic concept — a data tree, a NURBS surface, a
            layer mask — its explanation appears here.
          </p>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold leading-tight text-neutral-900">
                {concept.title}
              </h3>
              {concept.source === "community" && (
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-900">
                  community
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] italic text-neutral-900">{concept.oneLiner}</p>
            <p className="mt-3 leading-relaxed text-neutral-900">{concept.explanation}</p>
            {concept.versionNote && (
              <p className="mt-2 text-xs text-neutral-900">Note: {concept.versionNote}</p>
            )}
            <a
              href={concept.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#ff3b21] hover:underline"
            >
              Learn more →
            </a>
          </div>
        )}
      </div>
    </details>
  );
}

function ScriptSection({ script }: { script: CodeBlock | null }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (!script) return;
    navigator.clipboard?.writeText(script.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }
  return (
    <details open={!!script} className={CARD}>
      <summary className={SUMMARY}>
        <Chevron /> Script{script ? ` · ${script.lang || "code"}` : ""}
      </summary>
      <div className="px-4 pb-4">
        {!script ? (
          <p className="text-sm text-neutral-900">
            When the coach writes a Python script for Rhino or Grasshopper, it lands here — ready to
            copy straight into a GhPython / Script component.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={copy}
              className="mb-2.5 w-full rounded-lg bg-[#ff3b21] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e22d15]"
            >
              {copied ? "Copied ✓ — paste into Rhino" : "⧉ Copy script"}
            </button>
            <pre className="max-h-72 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-900">
              <code className="font-mono">{script.code}</code>
            </pre>
          </>
        )}
      </div>
    </details>
  );
}

function IdeasSection({ ideas }: { ideas: string[] }) {
  return (
    <details open={ideas.length > 0} className={CARD}>
      <summary className={SUMMARY}>
        <Chevron /> Further ideas
      </summary>
      <div className="px-4 pb-4 text-sm">
        {ideas.length === 0 ? (
          <p className="text-neutral-900">
            Other commands, workflows, or resources that could get the job done will show up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {ideas.map((idea, i) => (
              <li key={i} className="flex gap-2 leading-relaxed text-neutral-900">
                <span className="mt-0.5 text-[#ff3b21]">→</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export default function CoachSidebar({
  concept,
  script,
  ideas
}: {
  concept: string | null;
  script: CodeBlock | null;
  ideas: string[];
}) {
  return (
    <div className="space-y-3">
      <ConceptSection slug={concept} />
      <ScriptSection script={script} />
      <IdeasSection ideas={ideas} />
    </div>
  );
}
