"use client";

import { useMemo, useState } from "react";
import {
  PATHWAY_NODES,
  LEVELS,
  LEVEL_LABEL,
  TRACK_LABEL,
  disciplinesWithNodes,
  getNode,
  trackMatches,
  type Discipline,
  type Level,
  type SkillNode,
  type TrackFilter
} from "@/lib/skills-pathways/pathways";
import { DISCIPLINES } from "@/lib/skills-coach/concepts";
import NodeModal from "./NodeModal";

const TRACK_FILTERS: { id: TrackFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "2d", label: "2D" },
  { id: "3d", label: "3D" }
];

// Single-accent progression: light at beginner → solid red → black at advanced.
const LEVEL_ACCENT: Record<Level, string> = {
  beginner: "border-l-neutral-300",
  intermediate: "border-l-[#ff3b21]",
  advanced: "border-l-neutral-900"
};
const LEVEL_DOT: Record<Level, string> = {
  beginner: "bg-neutral-300",
  intermediate: "bg-[#ff3b21]",
  advanced: "bg-neutral-900"
};

function disciplineMeta(id: Discipline) {
  return DISCIPLINES.find((d) => d.id === id);
}

export default function TrailBoard() {
  const [track, setTrack] = useState<TrackFilter>("all");
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleNodes = useMemo(
    () =>
      PATHWAY_NODES.filter(
        (n) =>
          trackMatches(n.track, track) &&
          (discipline === "all" || n.discipline === discipline)
      ),
    [track, discipline]
  );

  const sections = useMemo(() => {
    return disciplinesWithNodes()
      .filter((d) => discipline === "all" || d === discipline)
      .map((d) => ({
        discipline: d,
        nodes: visibleNodes.filter((n) => n.discipline === d)
      }))
      .filter((s) => s.nodes.length > 0);
  }, [visibleNodes, discipline]);

  const selected = selectedId ? getNode(selectedId) : undefined;

  return (
    <div>
      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500">Track</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-neutral-300">
            {TRACK_FILTERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrack(t.id)}
                className={[
                  "px-3 py-1.5 text-sm transition-colors",
                  track === t.id
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-600 hover:bg-neutral-100"
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-500">Software</span>
          <Chip active={discipline === "all"} onClick={() => setDiscipline("all")}>
            All
          </Chip>
          {DISCIPLINES.map((d) => (
            <Chip
              key={d.id}
              active={discipline === d.id}
              onClick={() => setDiscipline(d.id)}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="mt-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-neutral-400">
        {LEVELS.map((lvl, i) => (
          <span key={lvl} className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${LEVEL_DOT[lvl]}`} />
              {LEVEL_LABEL[lvl]}
            </span>
            {i < LEVELS.length - 1 && <span className="text-neutral-300">→</span>}
          </span>
        ))}
      </div>

      {/* board */}
      <div className="mt-4 space-y-10">
        {sections.map(({ discipline: d, nodes }) => {
          const meta = disciplineMeta(d);
          return (
            <section key={d}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-neutral-900 pb-3 pt-3">
                <h2 className="text-xl font-semibold uppercase tracking-tight">
                  {meta?.label ?? d}
                </h2>
                {meta?.blurb && (
                  <span className="text-sm normal-case text-neutral-500">{meta.blurb}</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {LEVELS.map((lvl) => {
                  const cards = nodes.filter((n) => n.level === lvl);
                  return (
                    <div key={lvl}>
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-neutral-400">
                        <span className={`h-2 w-2 rounded-full ${LEVEL_DOT[lvl]}`} />
                        {LEVEL_LABEL[lvl]}
                      </div>
                      <div className="space-y-3">
                        {cards.length > 0 ? (
                          cards.map((n) => (
                            <SkillCard
                              key={n.id}
                              node={n}
                              onClick={() => setSelectedId(n.id)}
                            />
                          ))
                        ) : (
                          <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-neutral-300">
                            —
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {sections.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-500">
            No skills match this filter yet.
          </p>
        )}
      </div>

      {selected && (
        <NodeModal
          node={selected}
          onClose={() => setSelectedId(null)}
          onSelect={(id) => setSelectedId(id)}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SkillCard({ node, onClick }: { node: SkillNode; onClick: () => void }) {
  const hasVideo = node.videos.length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border border-l-4 border-neutral-200 bg-white p-3 text-left transition hover:border-neutral-400 hover:shadow-sm",
        LEVEL_ACCENT[node.level]
      ].join(" ")}
    >
      <div className="text-base font-semibold leading-tight tracking-tight">{node.title}</div>
      <p className="mt-1 text-xs leading-snug text-neutral-500">{node.blurb}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="font-medium text-[#ff3b21]">Guide</span>
        {hasVideo && (
          <span className="text-neutral-500">
            ▶ {node.videos.length} video{node.videos.length > 1 ? "s" : ""}
          </span>
        )}
        {node.conceptSlugs.length > 0 && (
          <span className="text-neutral-400">
            {node.conceptSlugs.length} concept{node.conceptSlugs.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </button>
  );
}
