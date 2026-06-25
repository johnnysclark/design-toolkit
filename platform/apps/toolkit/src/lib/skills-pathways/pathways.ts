// Skills Pathways — the curated "trail" data for the toolkit.
//
// Like the Skills Coach concept KB (`lib/skills-coach/concepts.ts`), this is
// CONTENT, so it lives in the repo, not the database ("content in files, data in
// the DB"). Each node is one teachable skill; `prereqs` wire the nodes into
// beginner → advanced trails (the GSAPP Skill-Trails idea); `conceptSlugs` link
// each node to the SAME vetted explanations + official doc links the Skills
// Coach uses — one source of truth. `videos` is the tutorial library: each entry
// is a YouTube/Vimeo link or an uploaded file in the public `skills-videos`
// Supabase bucket. To grow the trail, add a node or paste a video link here.
//
// ── Adding a video (v1 is curated-in-code) ───────────────────────────────────
//   YouTube : { kind: "youtube", id: "dQw4w9WgXcQ", title: "...", author: "..." }
//             (the id is the part after watch?v= or youtu.be/)
//   Vimeo   : { kind: "vimeo",   id: "76979871",   title: "...", author: "..." }
//   Upload  : { kind: "file", url: "<public skills-videos URL>", title, author }
//             (upload the .mp4 in the Supabase dashboard → Storage →
//              skills-videos, copy its public URL, paste it here. Keep uploads
//              short — the free tier is ~1 GB; prefer YouTube/Vimeo for long ones.)

import { DISCIPLINES, getConcept, type Discipline } from "@/lib/skills-coach/concepts";

export { DISCIPLINES, getConcept, type Discipline };

export type Track = "2d" | "3d" | "both";
export type Level = "beginner" | "intermediate" | "advanced";

export const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced"
};

export const TRACK_LABEL: Record<Track, string> = {
  "2d": "2D",
  "3d": "3D",
  both: "2D · 3D"
};

/** A tutorial video. Either an embed (YouTube/Vimeo) or an uploaded file. */
export type VideoRef =
  | { kind: "youtube"; id: string; title: string; author: string; minutes?: number }
  | { kind: "vimeo"; id: string; title: string; author: string; minutes?: number }
  | { kind: "file"; url: string; title: string; author: string; minutes?: number };

export interface SkillNode {
  id: string;
  title: string;
  discipline: Discipline;
  track: Track;
  level: Level;
  /** One line: what the student can do after this node. */
  blurb: string;
  /** Node ids this builds on (drawn as "builds on" in the detail view). */
  prereqs: string[];
  /** Slugs into the Skills Coach concept KB — shared explanations + doc links. */
  conceptSlugs: string[];
  /** Tutorial videos for this skill (empty = slot ready for a link). */
  videos: VideoRef[];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE TRAIL. Seeded from the concept KB so every node already links to a vetted
// explanation; videos start empty (add yours + colleagues'). Grow freely.
// ─────────────────────────────────────────────────────────────────────────────
export const PATHWAY_NODES: SkillNode[] = [
  // ── General foundations (tool-agnostic) ──────────────────────────────────
  {
    id: "gen-units",
    title: "Units & scale",
    discipline: "general",
    track: "both",
    level: "beginner",
    blurb: "Model at real-world size and avoid the tiny/giant-import trap.",
    prereqs: [],
    conceptSlugs: ["gen-units-scale"],
    videos: []
  },
  {
    id: "gen-mesh-nurbs",
    title: "Mesh vs. NURBS vs. solid",
    discipline: "general",
    track: "both",
    level: "intermediate",
    blurb: "Know which geometry you have, and what you can reliably do with it.",
    prereqs: ["gen-units"],
    conceptSlugs: ["gen-mesh-vs-nurbs"],
    videos: []
  },

  // ── Rhino (3D) ───────────────────────────────────────────────────────────
  {
    id: "rhino-interface",
    title: "Navigate & transform",
    discipline: "rhino",
    track: "3d",
    level: "beginner",
    blurb: "Move around the viewports and edit with the Gumball and CPlanes.",
    prereqs: [],
    conceptSlugs: ["rh-gumball", "rh-cplane"],
    videos: []
  },
  {
    id: "rhino-curves",
    title: "Curves & control points",
    discipline: "rhino",
    track: "3d",
    level: "beginner",
    blurb: "Draw clean NURBS curves and shape them by control point.",
    prereqs: ["rhino-interface"],
    conceptSlugs: ["rh-nurbs", "rh-control-point", "rh-degree"],
    videos: []
  },
  {
    id: "rhino-layers",
    title: "Layers & organization",
    discipline: "rhino",
    track: "3d",
    level: "beginner",
    blurb: "Keep a tidy file so drawings and exports come out clean.",
    prereqs: ["rhino-interface"],
    conceptSlugs: ["rh-layers", "rh-tolerance"],
    videos: []
  },
  {
    id: "rhino-surfaces",
    title: "Surfaces & lofting",
    discipline: "rhino",
    track: "3d",
    level: "intermediate",
    blurb: "Build surfaces from curves with continuity you can control.",
    prereqs: ["rhino-curves"],
    conceptSlugs: ["rh-nurbs", "rh-degree"],
    videos: []
  },
  {
    id: "rhino-solids",
    title: "Solids & booleans",
    discipline: "rhino",
    track: "3d",
    level: "intermediate",
    blurb: "Combine watertight solids — and debug the booleans that fail.",
    prereqs: ["rhino-surfaces"],
    conceptSlugs: ["rh-boolean", "rh-tolerance"],
    videos: []
  },
  {
    id: "rhino-subd",
    title: "SubD organic modeling",
    discipline: "rhino",
    track: "3d",
    level: "intermediate",
    blurb: "Sculpt smooth, freeform massing and convert to NURBS when needed.",
    prereqs: ["rhino-surfaces"],
    conceptSlugs: ["rh-subd"],
    videos: []
  },
  {
    id: "rhino-blocks",
    title: "Blocks & reuse",
    discipline: "rhino",
    track: "3d",
    level: "intermediate",
    blurb: "Reuse repeated components and keep files light and consistent.",
    prereqs: ["rhino-layers"],
    conceptSlugs: ["rh-block"],
    videos: []
  },
  {
    id: "rhino-make2d",
    title: "Drawings with Make2D",
    discipline: "rhino",
    track: "3d",
    level: "advanced",
    blurb: "Turn the model into clean plans, sections, and elevations.",
    prereqs: ["rhino-solids", "rhino-layers"],
    conceptSlugs: ["rh-make2d", "rh-named-view"],
    videos: []
  },

  // ── Grasshopper (3D) ─────────────────────────────────────────────────────
  {
    id: "gh-intro",
    title: "Your first definition",
    discipline: "grasshopper",
    track: "3d",
    level: "beginner",
    blurb: "Wire components and drive geometry live with a Number Slider.",
    prereqs: ["rhino-interface"],
    conceptSlugs: ["gh-number-slider"],
    videos: []
  },
  {
    id: "gh-lists",
    title: "Lists & sequences",
    discipline: "grasshopper",
    track: "3d",
    level: "beginner",
    blurb: "Generate and index lists with Series, Range, and List Item.",
    prereqs: ["gh-intro"],
    conceptSlugs: ["gh-series-range", "gh-list-item"],
    videos: []
  },
  {
    id: "gh-trees",
    title: "Data trees",
    discipline: "grasshopper",
    track: "3d",
    level: "intermediate",
    blurb: "Read branch paths and reshape trees with Graft and Flatten.",
    prereqs: ["gh-lists"],
    conceptSlugs: ["gh-data-tree", "gh-graft", "gh-flatten"],
    videos: []
  },
  {
    id: "gh-matching",
    title: "Matching & filtering",
    discipline: "grasshopper",
    track: "3d",
    level: "intermediate",
    blurb: "Pair lists predictably and split/cull them with patterns.",
    prereqs: ["gh-trees"],
    conceptSlugs: ["gh-data-matching", "gh-dispatch", "gh-cull"],
    videos: []
  },
  {
    id: "gh-clusters",
    title: "Clusters & path surgery",
    discipline: "grasshopper",
    track: "3d",
    level: "advanced",
    blurb: "Package logic into reusable clusters and rewrite paths deliberately.",
    prereqs: ["gh-matching"],
    conceptSlugs: ["gh-cluster", "gh-path-mapper", "gh-mass-addition"],
    videos: []
  },

  // ── AutoCAD (2D) ─────────────────────────────────────────────────────────
  {
    id: "acad-draw",
    title: "Draw with precision",
    discipline: "autocad",
    track: "2d",
    level: "beginner",
    blurb: "Snap to exact points and build boundaries as polylines.",
    prereqs: [],
    conceptSlugs: ["acad-osnap", "acad-polyline"],
    videos: []
  },
  {
    id: "acad-layers",
    title: "Layers",
    discipline: "autocad",
    track: "2d",
    level: "beginner",
    blurb: "Organize a drawing so it plots cleanly by layer.",
    prereqs: [],
    conceptSlugs: ["acad-layers"],
    videos: []
  },
  {
    id: "acad-blocks",
    title: "Blocks & xrefs",
    discipline: "autocad",
    track: "2d",
    level: "intermediate",
    blurb: "Reuse symbols and coordinate drawings across files.",
    prereqs: ["acad-draw"],
    conceptSlugs: ["acad-blocks", "acad-xref"],
    videos: []
  },
  {
    id: "acad-annotate",
    title: "Dimensions & annotation",
    discipline: "autocad",
    track: "2d",
    level: "intermediate",
    blurb: "Dimension, hatch, and size annotation to the plot scale.",
    prereqs: ["acad-layers"],
    conceptSlugs: ["acad-dimension-styles", "acad-annotation-scale", "acad-hatch"],
    videos: []
  },
  {
    id: "acad-layouts",
    title: "Layouts & plotting",
    discipline: "autocad",
    track: "2d",
    level: "advanced",
    blurb: "Compose sheets in paper space and plot to PDF with weights.",
    prereqs: ["acad-annotate"],
    conceptSlugs: ["acad-model-paper-space", "acad-viewport", "acad-plot"],
    videos: []
  },

  // ── Revit (3D / BIM) ─────────────────────────────────────────────────────
  {
    id: "rvt-intro",
    title: "Families, categories, types",
    discipline: "revit",
    track: "3d",
    level: "beginner",
    blurb: "Understand the parametric building blocks of every Revit element.",
    prereqs: [],
    conceptSlugs: ["rvt-family", "rvt-category", "rvt-type-instance"],
    videos: []
  },
  {
    id: "rvt-levels",
    title: "Levels & datums",
    discipline: "revit",
    track: "3d",
    level: "beginner",
    blurb: "Host elements on levels and define floor-to-floor heights.",
    prereqs: ["rvt-intro"],
    conceptSlugs: ["rvt-levels"],
    videos: []
  },
  {
    id: "rvt-data",
    title: "Schedules & parameters",
    discipline: "revit",
    track: "3d",
    level: "intermediate",
    blurb: "Turn the model into live tables with shared, schedulable data.",
    prereqs: ["rvt-intro"],
    conceptSlugs: ["rvt-schedules", "rvt-shared-parameters"],
    videos: []
  },
  {
    id: "rvt-phases",
    title: "Phasing & constraints",
    discipline: "revit",
    track: "3d",
    level: "intermediate",
    blurb: "Model existing/new over time and lock relationships that hold.",
    prereqs: ["rvt-levels"],
    conceptSlugs: ["rvt-phases", "rvt-constraints"],
    videos: []
  },
  {
    id: "rvt-docs",
    title: "Sheets, views & templates",
    discipline: "revit",
    track: "3d",
    level: "advanced",
    blurb: "Issue a coordinated drawing set with consistent graphics.",
    prereqs: ["rvt-data"],
    conceptSlugs: ["rvt-sheets", "rvt-view-templates"],
    videos: []
  },
  {
    id: "rvt-collab",
    title: "Worksets & collaboration",
    discipline: "revit",
    track: "3d",
    level: "advanced",
    blurb: "Share one model across a team without clashing.",
    prereqs: ["rvt-docs"],
    conceptSlugs: ["rvt-worksets"],
    videos: []
  },

  // ── Adobe (2D / graphic) ─────────────────────────────────────────────────
  {
    id: "adobe-foundations",
    title: "Vector, raster, resolution & color",
    discipline: "adobe",
    track: "2d",
    level: "beginner",
    blurb: "Pick the right format and mode so boards stay sharp and print true.",
    prereqs: [],
    conceptSlugs: ["ps-vector-raster", "ps-resolution", "ps-cmyk-rgb"],
    videos: []
  },
  {
    id: "ps-nondestructive",
    title: "Non-destructive Photoshop",
    discipline: "adobe",
    track: "2d",
    level: "intermediate",
    blurb: "Edit reversibly with masks, smart objects, and blend modes.",
    prereqs: ["adobe-foundations"],
    conceptSlugs: [
      "ps-layer-mask",
      "ps-clipping-mask",
      "ps-smart-object",
      "ps-adjustment-layer",
      "ps-blend-modes"
    ],
    videos: []
  },
  {
    id: "ai-vector",
    title: "Vector drawing in Illustrator",
    discipline: "adobe",
    track: "2d",
    level: "intermediate",
    blurb: "Draw precise paths and combine shapes for diagrams and logos.",
    prereqs: ["adobe-foundations"],
    conceptSlugs: ["ai-pen-tool", "ai-pathfinder", "ai-artboard"],
    videos: []
  },
  {
    id: "id-layout",
    title: "Multi-page layout in InDesign",
    discipline: "adobe",
    track: "2d",
    level: "advanced",
    blurb: "Build a consistent portfolio or report with styles and parents.",
    prereqs: ["ai-vector"],
    conceptSlugs: ["id-master-pages", "id-paragraph-styles"],
    videos: []
  },
  {
    id: "id-print",
    title: "Print-ready output",
    discipline: "adobe",
    track: "2d",
    level: "advanced",
    blurb: "Set bleed and preflight/package so the print shop has everything.",
    prereqs: ["id-layout"],
    conceptSlugs: ["id-bleed-slug", "id-preflight"],
    videos: []
  }
];

// ── Indexes + helpers ────────────────────────────────────────────────────────
const NODE_INDEX: Record<string, SkillNode> = Object.fromEntries(
  PATHWAY_NODES.map((n) => [n.id, n])
);

export function getNode(id: string): SkillNode | undefined {
  return NODE_INDEX[id];
}

/** Nodes that list `id` as a prerequisite — i.e. where this skill leads next. */
export function unlocks(id: string): SkillNode[] {
  return PATHWAY_NODES.filter((n) => n.prereqs.includes(id));
}

export type TrackFilter = "all" | "2d" | "3d";

export function trackMatches(track: Track, filter: TrackFilter): boolean {
  if (filter === "all") return true;
  return track === filter || track === "both";
}

/** Disciplines that have at least one node, in the canonical KB order. */
export function disciplinesWithNodes(): Discipline[] {
  return DISCIPLINES.map((d) => d.id).filter((id) =>
    PATHWAY_NODES.some((n) => n.discipline === id)
  );
}

/** The embed URL for an iframe (YouTube/Vimeo). Privacy-friendly nocookie host. */
export function videoEmbedUrl(v: VideoRef): string {
  if (v.kind === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`;
  }
  if (v.kind === "vimeo") {
    return `https://player.vimeo.com/video/${v.id}?autoplay=1`;
  }
  return v.url; // file — used as a <video src>, not an iframe
}

/** A poster thumbnail to show before play (YouTube only; others get a gradient). */
export function videoPoster(v: VideoRef): string | null {
  if (v.kind === "youtube") return `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
  return null;
}
