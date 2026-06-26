"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  getConcept,
  getNode,
  unlocks,
  sectionMeta,
  LEVEL_LABEL,
  TRACK_LABEL,
  type SkillNode
} from "@/lib/skills-pathways/pathways";
import { getPractice } from "@/lib/skills-pathways/practice";
import LazyVideo from "./LazyVideo";

function disciplineLabel(id: SkillNode["discipline"]): string {
  return sectionMeta(id)?.label ?? id;
}

// A lightweight, accessible lightbox for one skill node: its tutorial video(s),
// the shared concept explanations + official doc links (from the Skills Coach
// KB), what it builds on / leads to, and a hand-off to the Coach. Esc or a click
// on the backdrop closes it; the prereq / "next" chips navigate the trail.
export default function NodeModal({
  node,
  onClose,
  onSelect
}: {
  node: SkillNode;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const next = unlocks(node.id);
  const practice = getPractice(node.id);

  // Focus the close button on open; restore body scroll AND focus on close; Esc
  // to close; Tab/Shift+Tab trapped inside the dialog (honors aria-modal).
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button, a[href], video, iframe, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.(); // return focus to the card that opened the modal
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={node.title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-900/60 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-900">
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-white">
                {disciplineLabel(node.discipline)}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5">
                {TRACK_LABEL[node.track]}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5">
                {LEVEL_LABEL[node.level]}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{node.title}</h2>
            <p className="mt-1 max-w-lg text-sm text-neutral-900">{node.blurb}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-current" fill="none" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div
          className="space-y-6 p-5"
          style={{
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          }}
        >
          {/* the basics — the written guide, the primary content for now */}
          {node.guide.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
                The basics
              </h3>
              <div className="space-y-3 text-[15px] leading-relaxed text-neutral-900">
                {node.guide.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}

          {/* key moves — quick command / tool cheat-sheet */}
          {practice?.keyMoves && practice.keyMoves.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
                Key moves
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {practice.keyMoves.map((m, i) => (
                  <code
                    key={i}
                    className="rounded-md bg-neutral-100 px-2 py-1 font-mono text-[12.5px] text-neutral-900"
                  >
                    {m}
                  </code>
                ))}
              </div>
            </section>
          )}

          {/* try this — a concrete studio exercise */}
          {practice?.tryThis && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
                Try this in studio
              </h3>
              <p className="rounded-xl border border-l-4 border-neutral-200 border-l-[#ff3b21] bg-neutral-50 p-3 text-[15px] leading-relaxed text-neutral-900">
                {practice.tryThis}
              </p>
            </section>
          )}

          {/* watch out — the common pitfall + fix */}
          {practice?.watchOut && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
                Watch out for
              </h3>
              <p className="rounded-xl border border-l-4 border-amber-200 border-l-amber-400 bg-amber-50 p-3 text-[15px] leading-relaxed text-neutral-900">
                {practice.watchOut}
              </p>
            </section>
          )}

          {/* videos — optional; the guide carries the node until one's recorded */}
          {node.videos.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
                Video walkthrough
              </h3>
              <div className="space-y-3">
                {node.videos.map((v, i) => (
                  <LazyVideo key={i} video={v} />
                ))}
              </div>
            </section>
          )}

          {/* concepts — reused from the Skills Coach KB */}
          {node.conceptSlugs.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
                Key concepts
              </h3>
              <ul className="space-y-2">
                {node.conceptSlugs.map((slug) => {
                  const c = getConcept(slug);
                  if (!c) return null;
                  return (
                    <li
                      key={slug}
                      className="rounded-xl border border-neutral-200 bg-white p-3 text-sm"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-neutral-900">{c.title}</span>
                        <a
                          href={c.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs font-medium text-[#ff3b21] hover:underline"
                        >
                          Docs →
                        </a>
                      </div>
                      <p className="mt-0.5 text-neutral-900">{c.oneLiner}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* trail links */}
          {(node.prereqs.length > 0 || next.length > 0) && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TrailLinks
                label="Builds on"
                ids={node.prereqs}
                onSelect={onSelect}
                empty="Starting point — no prerequisites."
              />
              <TrailLinks
                label="Leads to"
                nodes={next}
                onSelect={onSelect}
                empty="End of this trail (for now)."
              />
            </section>
          )}

          {/* coach hand-off */}
          <div className="border-t border-neutral-200 pt-4">
            <Link
              href="/skills-coach"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#ff3b21] hover:underline"
            >
              Stuck? Practice this with Coach →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrailLinks({
  label,
  ids,
  nodes,
  onSelect,
  empty
}: {
  label: string;
  ids?: string[];
  nodes?: SkillNode[];
  onSelect: (id: string) => void;
  empty: string;
}) {
  const items: SkillNode[] =
    nodes ??
    (ids ?? []).map((id) => getNode(id)).filter((n): n is SkillNode => Boolean(n));

  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h3>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelect(n.id)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50"
            >
              {n.title}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-900">{empty}</p>
      )}
    </div>
  );
}
