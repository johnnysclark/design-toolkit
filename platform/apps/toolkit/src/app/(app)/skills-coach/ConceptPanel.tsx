"use client";

import { getConcept } from "@/lib/skills-coach/concepts";

// The contextual side panel: explains whatever 3D/2D concept the tutor is
// currently discussing, sourced entirely from the curated KB (so the
// explanation and the "learn more" link are as trustworthy as the KB).
export default function ConceptPanel({ slug }: { slug: string | null }) {
  const concept = slug ? getConcept(slug) : undefined;

  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        In context
      </p>

      {!concept ? (
        <p className="text-neutral-400">
          As you and the coach discuss a 3D or graphic concept — a data tree, a
          NURBS surface, a layer mask — its explanation appears here.
        </p>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-tight text-neutral-900">
              {concept.title}
            </h3>
            {concept.source === "community" && (
              <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
                community
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] italic text-neutral-500">{concept.oneLiner}</p>
          <p className="mt-3 leading-relaxed text-neutral-700">{concept.explanation}</p>
          {concept.versionNote && (
            <p className="mt-2 text-xs text-neutral-400">Note: {concept.versionNote}</p>
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
    </aside>
  );
}
