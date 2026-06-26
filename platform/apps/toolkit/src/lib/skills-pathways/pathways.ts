// Skills Pathways — the curated "trail" data for the toolkit.
//
// Like the Skills Coach concept KB (`lib/skills-coach/concepts.ts`), this is
// CONTENT, so it lives in the repo, not the database ("content in files, data in
// the DB"). Each node is one teachable skill; `prereqs` wire the nodes into
// beginner → advanced trails (the GSAPP Skill-Trails idea); `conceptSlugs` link
// each node to the SAME vetted explanations + official doc links the Skills
// Coach uses; `guide` is a short, student-facing write-up that makes a node
// useful RIGHT NOW, before any video exists; `videos` is the (optional) tutorial
// library.
//
// Framing: these are workflows for UNDERGRAD + GRAD ARCHITECTURE STUDENTS —
// concept design, modeling, representation, and portfolio — NOT professional
// construction-document production. Keep guides concrete and studio-relevant.
//
// ── Adding a video (videos are optional; the guide carries each node) ─────────
//   YouTube : { kind: "youtube", id: "dQw4w9WgXcQ", title: "...", author: "..." }
//   Vimeo   : { kind: "vimeo",   id: "76979871",   title: "...", author: "..." }
//   Upload  : { kind: "file", url: "<public skills-videos URL>", title, author }

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

// A "section" is a lane on the board. It's a superset of the Skills Coach
// software `Discipline` (so nodes can still link to the shared concept KB) plus
// the broader, non-software lanes this map also teaches — design thinking,
// representation, agentic coding, and practice. Order here = order on the board.
export type Section =
  | Discipline // rhino | grasshopper | autocad | revit | adobe | general
  | "design-theory"
  | "architectural-media"
  | "agentic-coding"
  | "pro-practice";

export interface SectionMeta {
  id: Section;
  label: string;
  blurb: string;
}

export const SECTIONS: SectionMeta[] = [
  {
    id: "design-theory",
    label: "Design Concepts & Theory",
    blurb: "The ideas under the drawings — how designers order space and take a position."
  },
  {
    id: "general",
    label: "Digital Foundations",
    blurb: "Cross-cutting basics: files, units, formats, colour, and working with AI."
  },
  { id: "rhino", label: "Rhino", blurb: "NURBS modeling, surfaces, drawings, fabrication." },
  { id: "grasshopper", label: "Grasshopper", blurb: "Visual scripting and parametric design." },
  { id: "autocad", label: "AutoCAD", blurb: "Precise 2D drafting, drawings, and layouts." },
  { id: "revit", label: "Revit", blurb: "BIM for design: massing, data, and documentation." },
  { id: "adobe", label: "Adobe", blurb: "Photoshop · Illustrator · InDesign for representation." },
  {
    id: "architectural-media",
    label: "Architectural Media",
    blurb: "Ways of making the image — drawing, collage, rendering, animation, real-time."
  },
  {
    id: "agentic-coding",
    label: "Agentic Coding",
    blurb: "Vibe-coding for architects: directing AI tools to build your own software."
  },
  {
    id: "pro-practice",
    label: "Professional Practice",
    blurb: "What makes you useful in an internship and an office."
  }
];

/** A tutorial video. Either an embed (YouTube/Vimeo) or an uploaded file. */
export type VideoRef =
  | { kind: "youtube"; id: string; title: string; author: string; minutes?: number }
  | { kind: "vimeo"; id: string; title: string; author: string; minutes?: number }
  | { kind: "file"; url: string; title: string; author: string; minutes?: number };

export interface SkillNode {
  id: string;
  title: string;
  discipline: Section;
  track: Track;
  level: Level;
  /** One line: what the student can do after this node. */
  blurb: string;
  /** A few short paragraphs covering the basics — useful before any video. */
  guide: string[];
  /** Node ids this builds on (drawn as "builds on" in the detail view). */
  prereqs: string[];
  /** Slugs into the Skills Coach concept KB — shared explanations + doc links. */
  conceptSlugs: string[];
  /** Tutorial videos for this skill (optional; the guide carries the node). */
  videos: VideoRef[];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE TRAIL. Each discipline has ≥3 steps per level, studio-framed, every step
// with a written guide. Grow freely; add videos as they're recorded.
// ─────────────────────────────────────────────────────────────────────────────
export const PATHWAY_NODES: SkillNode[] = [
  // ══ FOUNDATIONS (tool-agnostic) ══════════════════════════════════════════
  {
    id: "gen-files",
    title: "Project files & naming",
    discipline: "general",
    track: "both",
    level: "beginner",
    blurb: "Set up a folder structure and naming habit that survives a whole semester.",
    guide: [
      "Before you open any software, decide where the project lives. Make one project folder with predictable subfolders — e.g. /model, /drawings, /images, /references, /portfolio — and keep everything for the project inside it. The single biggest time-sink in studio is hunting for 'the good version' of a file the night before review; a tidy folder prevents it.",
      "Name files so they sort themselves. Lead with the project, then a short description, then a version or date: house_plan_v03.dwg, tower_massing_2026-03-12.3dm. Avoid spaces and 'final', 'final2', 'reallyfinal' — use zero-padded versions (v01, v02) so they line up in order.",
      "Save as you go and save milestones. Keep working in one file, but at the end of a real work session (or before a risky change) Save As a new version. Back the folder up to the cloud or a drive — losing a week of modeling to a corrupt file is a rite of passage you can skip."
    ],
    prereqs: [],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "gen-units",
    title: "Units & scale",
    discipline: "general",
    track: "both",
    level: "beginner",
    blurb: "Always model at real-world size, and know why imports arrive tiny or huge.",
    guide: [
      "Model everything at full, real-world size — a door is 0.9 m (or 36 in) wide in the file, not 'a few units.' 'Scale' is something that happens when you put a drawing on a sheet, not something you build into the geometry. Set your document units before you start, and match them to how you think about the project (metres for buildings, millimetres for details).",
      "Most import disasters are unit mismatches. A model authored in millimetres dropped into a metres file shows up 1000× too small (or too big the other way). When something imports as a speck or a giant, suspect units first — check the source file's units and scale by the right factor.",
      "Pick a convention and stick to it across your tools. If your Rhino model is in metres, keep Illustrator and InDesign thinking in the scale you'll print at, and decide your drawing scales (1:50, 1:100, 1:200) early so text and line weights stay legible."
    ],
    prereqs: ["gen-files"],
    conceptSlugs: ["gen-units-scale"],
    videos: []
  },
  {
    id: "gen-raster-vector",
    title: "Raster vs. vector",
    discipline: "general",
    track: "both",
    level: "beginner",
    blurb: "Know when you're working with pixels and when you're working with lines.",
    guide: [
      "There are two fundamentally different kinds of digital image, and choosing wrong is why work looks blurry or won't scale. Raster images (photographs, renders, anything from Photoshop) are grids of coloured pixels — perfect for continuous tone, but they blur or pixelate when you enlarge them past their resolution. Vector images (linework, diagrams, type from Illustrator, CAD drawings) are math-defined paths that stay razor-sharp at any size.",
      "In architecture you constantly mix both: a crisp vector plan with a raster render or collage dropped in. The rule of thumb — drawings and diagrams want to be vector; photos, renders, and textures are raster. Keep them on separate layers/files so you can edit each in its right tool.",
      "When you export, the format tells you which you've got: PDF, SVG, AI, DWG carry vectors; JPG, PNG, TIFF are raster. A PDF can hold both, which is why it's the safe currency for handing drawings around."
    ],
    prereqs: ["gen-files"],
    conceptSlugs: ["ps-vector-raster"],
    videos: []
  },
  {
    id: "gen-color-output",
    title: "Colour & resolution for output",
    discipline: "general",
    track: "both",
    level: "intermediate",
    blurb: "Make boards that look as good printed as they do on screen.",
    guide: [
      "Screens make colour with light (RGB) and printers make it with ink (CMYK), and the two don't cover the same range. Vivid blues and greens that glow on your laptop can print muddy. If a board is going to a printer, work toward CMYK and preview it (soft-proof) so there are no surprises at the plotter at 2 a.m.",
      "Resolution is about pixels at the printed size, not the number your file claims. Aim for roughly 300 ppi at final print size for images that need to look crisp; a small web JPG blown up to fill a board will look soft and blocky. Plan image sizes backward from how big they'll sit on the sheet.",
      "Keep a consistent, limited palette across a project — a couple of neutrals plus one or two accents reads as intentional, where many bright colours read as noise. Save your palette somewhere (swatches, a reference square) so every board and the portfolio agree."
    ],
    prereqs: ["gen-raster-vector"],
    conceptSlugs: ["ps-cmyk-rgb", "ps-resolution"],
    videos: []
  },
  {
    id: "gen-mesh-nurbs",
    title: "Mesh vs. NURBS vs. solid",
    discipline: "general",
    track: "both",
    level: "intermediate",
    blurb: "Tell what kind of 3D geometry you have, and what you can do with it.",
    guide: [
      "Not all 3D geometry is the same. A mesh is a net of flat triangles or quads — light and great for rendering, 3D printing, and scans, but only as smooth as its facet count. NURBS surfaces and solids are exact mathematical surfaces — heavier, but precise and editable, the right thing for fabrication drawings and clean curves.",
      "Knowing which you have tells you what's possible. You can't reliably boolean or dimension a rough mesh; you can't easily sculpt organic blobs out of trimmed NURBS. Rhino models in NURBS/solids, SketchUp and most game/visualization tools think in meshes, and many downloaded models arrive as meshes.",
      "Convert deliberately, not by accident. Going NURBS → mesh (for render/print) is routine; going mesh → NURBS is lossy and fiddly. When a file behaves strangely — won't join, won't boolean, exports huge — check whether you're fighting the wrong geometry type."
    ],
    prereqs: ["gen-units"],
    conceptSlugs: ["gen-mesh-vs-nurbs"],
    videos: []
  },
  {
    id: "gen-interop",
    title: "Moving work between programs",
    discipline: "general",
    track: "both",
    level: "intermediate",
    blurb: "Hand geometry and drawings between Rhino, CAD, Illustrator, and Revit cleanly.",
    guide: [
      "No single program does everything, so the real skill is moving work between them without losing quality. Learn the small set of exchange formats: DWG/DXF for 2D linework (Rhino ↔ AutoCAD ↔ Illustrator), OBJ/STL for meshes, IGES/STEP for NURBS solids, SVG/PDF/AI for vector drawings into layout, and PNG/TIFF for images.",
      "Set up the export, don't just hit save. Match units, decide what's selected vs. the whole file, and keep your layers — a Make2D from Rhino exported as DWG arrives in Illustrator with its layers intact if you set it up right, which saves hours of re-sorting linework.",
      "Plan the hand-offs at the start of a project. A typical studio pipeline is: model in Rhino → Make2D linework → DWG into Illustrator for line weights and poché → place into InDesign for the board. Knowing the chain ahead of time stops you from over-finishing something in the wrong tool."
    ],
    prereqs: ["gen-mesh-nurbs", "gen-raster-vector"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "gen-pipeline",
    title: "Build a representation pipeline",
    discipline: "general",
    track: "both",
    level: "advanced",
    blurb: "Design a repeatable model → drawing → layout workflow you can iterate fast.",
    guide: [
      "By upper-level studio, speed comes from having a pipeline, not from raw software skill. A pipeline is a deliberate chain — model → export → post-process → lay out — set up so that when the design changes (and it will, the night before review) you can regenerate the whole board set quickly instead of redrawing by hand.",
      "Make each stage non-destructive and re-runnable. Keep the model as the single source of truth; generate drawings from it (Make2D, sections, schedules) rather than drawing over screenshots; keep line-weight and poché work in styles you can re-apply; place — don't paste — images into layout so updating the source updates the board.",
      "Document your own pipeline. A short note in the project folder ('linework lives on these layers, export with this preset, board template is here') means future-you, and teammates, can pick the project back up without reverse-engineering it. This is exactly the 'trust but verify, keep the trace' habit the toolkit is built around."
    ],
    prereqs: ["gen-interop", "gen-color-output"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "gen-version",
    title: "Versioning & iteration",
    discipline: "general",
    track: "both",
    level: "advanced",
    blurb: "Keep design iterations legible so you can show — and defend — your process.",
    guide: [
      "Studios grade the process, not just the final image, so keeping your iterations is both insurance and an asset. Save named milestones at real decision points (scheme-A, scheme-B-after-crit, final-massing) rather than a soup of 'final' files, and keep the dead ends — the option you killed is often the clearest way to explain why the final one is better.",
      "Photograph the process as you go. Screenshot key model states, keep the rough study diagrams, snapshot the board at each crit. At portfolio time this saved trail becomes the 'how I got here' story that distinguishes a strong portfolio from a folder of pretty finals.",
      "Treat big moves like checkpoints. Before a risky change — re-massing, re-laying-out a whole board — duplicate the file. It costs a few seconds and a little disk, and it means you can always walk an idea back instead of reconstructing it from memory."
    ],
    prereqs: ["gen-pipeline"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "gen-ai",
    title: "Using AI tools in studio",
    discipline: "general",
    track: "both",
    level: "advanced",
    blurb: "Bring AI into design work as an instrument to verify, not an oracle to obey.",
    guide: [
      "AI tools — image generators, chat assistants, and the agentic tools in this very toolkit — are now part of studio production. The useful stance is the one this platform is built on: treat them as instruments that supply logics, language, and data, while the judgement stays yours. They are fast, confident, and often wrong, so their output is a first draft to be checked, never a final answer.",
      "Use them where they genuinely help: brainstorming options, explaining a concept or a software step you're stuck on, drafting text for a board, generating reference imagery to react against. Then verify — does the precedent it cited actually exist, does the dimension it gave make sense, does the generated image describe a buildable idea or just a vibe?",
      "Be honest about authorship and data. Know what a tool does with your work when you upload it, credit AI-generated content, and don't let a fluent-sounding answer substitute for the slow, analog repetition that actually builds skill. Knowing when to offload thinking — and when not to — is itself a design judgement."
    ],
    prereqs: ["gen-version"],
    conceptSlugs: [],
    videos: []
  },

  // ══ RHINO (3D modeling) ═══════════════════════════════════════════════════
  {
    id: "rhino-interface",
    title: "Navigate & transform",
    discipline: "rhino",
    track: "3d",
    level: "beginner",
    blurb: "Move around the viewports and edit confidently with the Gumball and CPlanes.",
    guide: [
      "Rhino's four viewports (Top, Front, Right, Perspective) are all windows onto the same model — drawing in one updates all of them. Orbit the Perspective view by dragging with the right mouse button, pan with Shift+right-drag, and zoom with the scroll wheel. Getting fluid at moving the camera is the first thing that makes Rhino feel less intimidating.",
      "The Gumball is your everyday move/rotate/scale tool: select an object and its coloured arrows (move), arcs (rotate), and squares (scale) appear. Drag a handle and type a number for an exact distance or angle. Holding and dragging a surface's arrow extrudes it — the fastest way to push and pull simple massing.",
      "The construction plane (CPlane) is the invisible 'ground' you draw onto. New points land on it unless you snap to existing geometry, and you can set the CPlane onto an angled face to draw flat on a slope or facade. Type commands into the command line at the top — Rhino is driven by typing command names as much as by clicking buttons."
    ],
    prereqs: ["gen-units"],
    conceptSlugs: ["rh-gumball", "rh-cplane"],
    videos: []
  },
  {
    id: "rhino-curves",
    title: "Curves & control points",
    discipline: "rhino",
    track: "3d",
    level: "beginner",
    blurb: "Draw clean NURBS curves and reshape them by control point.",
    guide: [
      "Almost everything in Rhino starts as a curve. Learn the core few: Line and Polyline for straight runs, Circle/Rectangle for primitives, and most importantly Curve (the control-point curve) and InterpCrv (which passes through points you click). Use Osnaps (End, Mid, Cen, Int) so curves actually connect instead of nearly touching.",
      "Turn on control points with F10 (PointsOn) and you'll see the 'cage' that shapes a curve — drag a point and the curve flexes toward it. Fewer, well-placed control points give cleaner, more editable curves than many crowded ones; if a curve looks lumpy, it usually has too many points.",
      "Curve degree controls smoothness: degree 1 is straight segments, degree 3 is the typical smooth curve. This matters because surfaces inherit the quality of the curves you build them from — time spent getting clean curves pays off the moment you start lofting and sweeping."
    ],
    prereqs: ["rhino-interface"],
    conceptSlugs: ["rh-nurbs", "rh-control-point", "rh-degree"],
    videos: []
  },
  {
    id: "rhino-layers",
    title: "Layers & a clean file",
    discipline: "rhino",
    track: "3d",
    level: "beginner",
    blurb: "Organize objects so modeling, drawings, and exports stay manageable.",
    guide: [
      "Layers are the backbone of a workable Rhino file. Group objects by what they are — Walls, Floors, Site, Furniture, Scratch — and give each layer a colour. You can hide, lock, and recolour whole layers at once, which is the difference between a file you can navigate at week 10 and one you dread opening.",
      "Set your model tolerance early (Document Properties → Units). Tolerance is how close two things must be for Rhino to treat them as touching; if it's wildly off your model's scale, joins and booleans quietly fail. For a building in metres, something like 0.001 is sensible.",
      "Layer discipline pays off downstream: clean layers make Make2D drawings come out sorted, make exports to Illustrator land on the right layers, and make it possible to turn whole systems on and off while you work. Build the habit now, before the model is a thousand objects."
    ],
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
    blurb: "Build surfaces from curves with continuity you can actually control.",
    guide: [
      "Surfaces are how curves become form. The everyday commands are ExtrudeCrv (push a curve into a wall or slab), Loft (skin a series of section curves), Sweep1/Sweep2 (run a profile along rails), and Revolve (spin a profile around an axis). Most studio massing is some combination of these four.",
      "Quality comes from the input curves. A loft is only as clean as the curves it spans, and curves with matching point counts and directions loft far more predictably — watch the seam arrows when you loft and flip them if the surface twists. Build the section curves deliberately rather than lofting whatever you happen to have.",
      "Continuity is the advanced idea worth meeting early: where two surfaces meet they can simply touch (G0), be tangent (G1), or match curvature (G2). For smooth, reflective forms you'll use Match or BlendSrf to get tangency across a seam so the surface flows instead of kinking."
    ],
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
    guide: [
      "A solid is just a closed (watertight) set of surfaces — a box, a cylinder, an extrusion that's capped. Rhino's Boolean commands (BooleanUnion, BooleanDifference, BooleanIntersection) add, subtract, and intersect solids, which is how you carve openings, join volumes, and make poché-able masses.",
      "Booleans fail constantly, and almost always for the same reasons: a solid isn't actually closed (run ShowEdges to find naked edges), surfaces are exactly coincident, or your tolerance doesn't match the model scale. When one fails, don't just retry — check for naked edges and fix the geometry.",
      "For early design, booleans let you work additively and subtractively at massing scale: union your volumes, difference a courtyard or a window reveal, intersect to find where two forms overlap. Keep copies of the un-booleaned parts on a hidden layer so you can re-do a move when the design shifts."
    ],
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
    blurb: "Sculpt smooth, freeform massing and convert to NURBS when you need precision.",
    guide: [
      "SubD (subdivision surfaces, Rhino 7+) is a separate geometry type for smooth, organic forms that stay easy to push and pull — ideal for furniture, terrain, sculpted massing, and anything blob-like that would be painful in trimmed NURBS. You edit a low-poly 'cage' and Rhino smooths it automatically.",
      "Work the cage, not the smooth result. Start from a primitive (SubD box, sphere), then select faces, edges, and points and move/extrude them with the Gumball. Adding edge loops (InsertEdge) gives you more control where you need a crease or a tighter curve; fewer control points keep the form clean.",
      "When you need precise documentation or fabrication, convert with ToNURBS — but model in SubD while the form is still soft and exploratory. It's the fastest way in Rhino to chase a freeform idea without fighting surface continuity."
    ],
    prereqs: ["rhino-surfaces"],
    conceptSlugs: ["rh-subd"],
    videos: []
  },
  {
    id: "rhino-blocks",
    title: "Blocks & reusable components",
    discipline: "rhino",
    track: "3d",
    level: "intermediate",
    blurb: "Reuse repeated elements — trees, furniture, modules — without bloating the file.",
    guide: [
      "A block is a named definition you can place many times as lightweight instances. Define a tree, a chair, a structural bay, or a facade module once, and every placed instance updates when you edit the definition. For anything that repeats, blocks keep the file small and edits consistent.",
      "Use BlockEdit to change a definition everywhere at once — swap your generic tree for a better one and the whole site updates. Linked blocks can even reference an external file, so a shared component library can live in one place across several project files.",
      "Blocks are also how you bring in entourage (people, cars, planting) without turning your model into molasses. Keep entourage blocks on their own layer so you can hide them for clean modeling and turn them on for renders and presentation views."
    ],
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
    blurb: "Turn the 3D model into clean plans, sections, and elevations.",
    guide: [
      "Make2D projects your 3D model into flat 2D linework from the current view, separating visible and hidden lines onto their own layers — it's how a model becomes drawings. Set up a named view or an orthographic viewport first (Front for an elevation, a clipped Top for a plan), then run Make2D.",
      "Results are only as clean as your model and layers. Organized layers in, organized linework out; messy geometry gives you a tangle to clean by hand. For plans and sections, use a Clipping Plane or Section to cut the model first, then Make2D the result.",
      "Make2D output is the start of the drawing, not the end. Export it as DWG into Illustrator (or keep it in Rhino's layout) to assign line weights, add poché, dimensions, and notes. This Rhino → Make2D → Illustrator chain is the most common way studio drawings get made."
    ],
    prereqs: ["rhino-solids", "rhino-layers"],
    conceptSlugs: ["rh-make2d", "rh-named-view"],
    videos: []
  },
  {
    id: "rhino-render",
    title: "Views, materials & quick renders",
    discipline: "rhino",
    track: "3d",
    level: "advanced",
    blurb: "Get presentable images straight out of Rhino without a render farm.",
    guide: [
      "You don't always need a heavy render engine for a strong studio image. Rhino's display modes (Shaded, Ghosted, Arctic, Technical, Pen) already produce clean, diagrammatic views — Arctic gives a soft white-model look that reads beautifully on a board, and Technical/Pen give a linework look.",
      "For colour and light, assign simple materials by layer, set a sun (Rendering → Sun or the Lighting panel) for real shadows, and use Rhino Render or the raytraced display to get a quick lit image. Keep materials restrained — a couple of greys, glass, and one accent usually beats a noisy palette.",
      "Frame the shot deliberately: set up Named Views so you can return to the exact camera for consistent series of images, and capture with ViewCaptureToFile at 2–3× your screen size so the image is sharp on a printed board. A consistent set of views across schemes makes a project legible."
    ],
    prereqs: ["rhino-make2d"],
    conceptSlugs: ["rh-named-view"],
    videos: []
  },
  {
    id: "rhino-fabrication",
    title: "Modeling for laser cut & 3D print",
    discipline: "rhino",
    track: "3d",
    level: "advanced",
    blurb: "Prep clean geometry for the laser cutter, 3D printer, and CNC.",
    guide: [
      "Fabrication is unforgiving about geometry, so the model has to be clean. For a 3D print you need a closed, watertight mesh (no naked edges, normals facing out) exported as STL — check with ShowEdges and the Mesh Repair tools before you send it, and account for the printer's minimum wall thickness.",
      "For laser cutting you're producing 2D linework at full scale: unroll developable surfaces (UnrollSrf) or take Make2D/contours of your form, lay the parts flat on the CPlane, and organize layers by operation — cut vs. score vs. engrave — usually by line colour, since that's how the cutter reads them. Export DWG/DXF at 1:1.",
      "Think about assembly, not just the cut. Add tabs, slots, and labels in the model; nest parts to save material; and always cut a small test piece first to check kerf and fit. The contour/waffle and unroll workflows are the studio staples for turning a 3D model into a physical model."
    ],
    prereqs: ["rhino-solids"],
    conceptSlugs: ["gen-mesh-vs-nurbs"],
    videos: []
  },

  // ══ GRASSHOPPER (visual scripting) ════════════════════════════════════════
  {
    id: "gh-intro",
    title: "Your first definition",
    discipline: "grasshopper",
    track: "3d",
    level: "beginner",
    blurb: "Wire components together and drive geometry live with a slider.",
    guide: [
      "Grasshopper is a visual programming canvas that runs on top of Rhino: instead of typing commands, you drop components (boxes) and wire their outputs to inputs, and geometry previews live in the Rhino viewport. Open it by typing Grasshopper in Rhino's command line.",
      "Start tiny. Drag a Number Slider, a Point, and a Circle onto the canvas; wire the slider to the circle's radius and watch the circle resize as you drag. That loop — change an input, see the geometry update — is the whole point of parametric modeling, and it's worth feeling it on something trivial first.",
      "Two habits from day one: hover over a component's inputs/outputs to read what they expect, and keep your canvas tidy left-to-right (inputs on the left, results on the right) with the occasional group and label. A readable definition is one you can still understand a week later."
    ],
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
    blurb: "Generate and address many things at once with numbers.",
    guide: [
      "Grasshopper's power is doing something to many items at once, and a list is how it holds 'many.' Series (start, step, count) and Range (a domain divided into steps) generate evenly spaced numbers; feed those into points, and you've placed a row of columns or a set of floor levels with two components.",
      "List Item pulls one element out by index (counting from 0), and you'll constantly use it to grab 'the first curve' or 'the top point.' Panel and the param viewer let you actually see what's in a list — keep one wired in while you learn, so the data isn't a mystery.",
      "Once you can make and read lists, repetition stops being manual. A façade of 40 louvres, a stair of 18 treads, a row of structure — all become one slider you can change, instead of 40 copies you have to redo when the design shifts."
    ],
    prereqs: ["gh-intro"],
    conceptSlugs: ["gh-series-range", "gh-list-item"],
    videos: []
  },
  {
    id: "gh-geometry",
    title: "Points, curves & surfaces from data",
    discipline: "grasshopper",
    track: "3d",
    level: "beginner",
    blurb: "Turn numbers and referenced geometry into real form.",
    guide: [
      "Geometry in Grasshopper usually starts from points: Construct Point (from x,y,z numbers) or points along a curve (Divide Curve, Evaluate Curve). From points you build curves (Polyline, Interpolate, Line), and from curves you build surfaces (Extrude, Loft, the same operations as Rhino, now driven by data).",
      "You can also reference geometry you drew in Rhino: right-click a Curve or Surface parameter and 'Set' it to a Rhino object, then let Grasshopper operate on it. This mix — hand-draw the tricky bits in Rhino, let Grasshopper handle the repetition — is how most studio definitions actually work.",
      "Remember the preview is live but not yet 'real' Rhino geometry. When you're happy, Bake it (right-click a component) to create editable Rhino objects on a chosen layer. Until you bake, changing a slider just regenerates the preview."
    ],
    prereqs: ["gh-lists"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "gh-trees",
    title: "Data trees",
    discipline: "grasshopper",
    track: "3d",
    level: "intermediate",
    blurb: "Understand branches and reshape data with Graft and Flatten.",
    guide: [
      "A data tree is Grasshopper's nested list: instead of one flat list, data sits in branches addressed by paths like {0;1}. This is the single concept that trips up every beginner, because most 'why did I get the wrong number of results?' bugs are really tree-shape mismatches, not broken logic.",
      "Three tools reshape trees. Graft pushes each item into its own branch (use it to make operations happen 'one per item'); Flatten collapses everything back into a single list (the quick fix when you have too many results); and the param viewer shows you the tree structure so you can see what's actually happening.",
      "The mental model: components match data branch-by-branch across their inputs. When two inputs have different tree shapes, results multiply or repeat in confusing ways. Learn to read the tree, graft and flatten deliberately, and most of Grasshopper's mystery evaporates."
    ],
    prereqs: ["gh-lists"],
    conceptSlugs: ["gh-data-tree", "gh-graft", "gh-flatten"],
    videos: []
  },
  {
    id: "gh-matching",
    title: "Matching, sorting & filtering",
    discipline: "grasshopper",
    track: "3d",
    level: "intermediate",
    blurb: "Pair lists predictably and split them by rules.",
    guide: [
      "When two lists have different lengths, Grasshopper pairs them by a matching rule — by default it reuses the last item of the shorter list. Mismatched counts producing 'too many' or repeated results are almost always a data-matching question; Shortest List, Longest List, and Cross Reference let you choose how the pairing happens.",
      "Dispatch splits a list into two by a true/false pattern, and Cull Pattern keeps or drops items by a repeating mask — together they let you separate 'every other one,' inside vs. outside, or pass vs. fail, then treat each group differently. Sort List orders items (and can carry a second list along by the same order).",
      "These are the components that turn raw geometry into designed variation: dispatch your façade panels into solid and glazed by a rule, cull every third column, sort openings by size. This is where a definition starts to express a design idea rather than just repeat one."
    ],
    prereqs: ["gh-trees"],
    conceptSlugs: ["gh-data-matching", "gh-dispatch", "gh-cull"],
    videos: []
  },
  {
    id: "gh-attractors",
    title: "Attractors & parametric patterns",
    discipline: "grasshopper",
    track: "3d",
    level: "intermediate",
    blurb: "Drive variation across a field — the classic facade/screen workflow.",
    guide: [
      "An 'attractor' is just a point or curve whose distance to each element drives a parameter — panel size, rotation, opening, height. Measure the distance from every panel to the attractor, remap that distance into a useful range (Remap Number), and feed it into the thing you want to vary. It's the most reusable trick in parametric design.",
      "The pattern is always the same three moves: a field of elements, a distance measurement, and a remap into the parameter's domain. Move the attractor and the whole field responds — a façade that opens up toward a view, louvres that twist toward the sun, a perforation that thins near an entrance.",
      "Keep it meaningful. An attractor pattern is only as good as the reason behind it: tie the variation to a real driver — sun, view, program, structure — so the gradient reads as a design argument and not just a cool effect. Graphs (Graph Mapper) let you shape how the variation falls off."
    ],
    prereqs: ["gh-matching"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "gh-clusters",
    title: "Clusters & keeping it readable",
    discipline: "grasshopper",
    track: "3d",
    level: "advanced",
    blurb: "Package working logic into reusable, legible blocks.",
    guide: [
      "As definitions grow they become spaghetti. A Cluster bundles a working group of components behind named inputs and outputs, like a function — it declutters the canvas and lets you reuse the same logic in several places, editing it once. Build a cluster only once a sub-graph is stable.",
      "Discipline keeps a big definition usable: group and colour related parts, label groups with what they do, and keep the flow left-to-right. Internalise data you don't need to keep editing, and delete dead branches. A definition you'll hand to a teammate (or your future self before review) has to be legible.",
      "Path Mapper and Mass Addition show up in advanced definitions — Path Mapper rewrites tree paths explicitly when Graft and Flatten aren't enough, and Mass Addition gives running totals for placing things end-to-end. Reach for them deliberately; they're powerful but brittle if the input shape changes."
    ],
    prereqs: ["gh-matching"],
    conceptSlugs: ["gh-cluster", "gh-path-mapper", "gh-mass-addition"],
    videos: []
  },
  {
    id: "gh-fields",
    title: "Meshes & simple form-finding",
    discipline: "grasshopper",
    track: "3d",
    level: "advanced",
    blurb: "Meet meshes, relaxation, and simulation as design drivers.",
    guide: [
      "Beyond placing geometry, Grasshopper can let form emerge from rules. Meshes (lighter, faceted geometry) underpin most of this — you'll generate, colour, and analyze meshes for things like surface curvature or solar exposure, mapping data onto geometry as colour gradients.",
      "Physics plugins like Kangaroo do 'form-finding': set up goals (keep edges this length, anchor these points, pull toward a target) and let the system relax into an equilibrium shape — the digital equivalent of hanging-chain and soap-film models. It's how tensile, gridshell, and minimal-surface forms get explored.",
      "Treat simulation as a sketching tool, not a truth machine. The point is to explore a family of forms driven by a clear logic, then read and edit the result — the same trust-but-verify stance as the rest of the toolkit. Bake the version you want and refine it in Rhino."
    ],
    prereqs: ["gh-clusters"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "gh-export",
    title: "From Grasshopper to drawings & fabrication",
    discipline: "grasshopper",
    track: "3d",
    level: "advanced",
    blurb: "Get parametric results out as baked geometry, drawings, and cut files.",
    guide: [
      "A definition isn't finished until you can get clean output. Bake to named layers (some components let you set the bake layer, or use a 'Bake' helper) so your parametric panels, structure, and lines land sorted and ready to draw or fabricate — don't bake everything onto one layer and sort it by hand.",
      "For drawings, you can Make2D the baked geometry, or use Grasshopper to generate the linework directly (sections, unrolled panels, labels) and bake that. For fabrication, generate nested, flat, labelled parts — Grasshopper is excellent at numbering hundreds of unique pieces, which is exactly what hand-laying-out a parametric model would make miserable.",
      "Plan the hand-off back to the rest of your pipeline: baked DWG into Illustrator for line weights, baked STL/DXF to the printer or laser. The value of a definition at review time is partly the form and partly that you can regenerate every drawing of it in minutes when the design changes."
    ],
    prereqs: ["gh-clusters"],
    conceptSlugs: ["rh-make2d"],
    videos: []
  },

  // ══ AutoCAD (2D drafting for design) ══════════════════════════════════════
  {
    id: "acad-draw",
    title: "Draw with precision",
    discipline: "autocad",
    track: "2d",
    level: "beginner",
    blurb: "Make accurate linework with snaps, coordinates, and the core draw tools.",
    guide: [
      "AutoCAD is about precise 2D linework. Draw at full real-world scale (1:1 in model space) using Line, Polyline, Circle, Arc, and Rectangle, and type exact lengths and angles as you go rather than eyeballing — AutoCAD is happiest when you tell it numbers.",
      "Object Snaps (Osnap) lock the cursor to exact points — endpoints, midpoints, centres, intersections — so geometry actually connects. Turn on running snaps for the ones you use constantly, and use Ortho/Polar tracking to keep lines straight or at set angles. Accurate drawings come from snapping, never from zooming in and nudging.",
      "Favour the Polyline over single lines for anything that's really one thing — a wall outline, a room boundary, a contour — because a polyline is one connected object you can offset, fillet, and read the length/area of as a whole. Join converts a set of connected lines into one polyline."
    ],
    prereqs: ["gen-units"],
    conceptSlugs: ["acad-osnap", "acad-polyline"],
    videos: []
  },
  {
    id: "acad-layers",
    title: "Layers & drawing structure",
    discipline: "autocad",
    track: "2d",
    level: "beginner",
    blurb: "Organize a drawing by layer so it stays legible and editable.",
    guide: [
      "Layers organize a CAD drawing the way they organize a Rhino model: group objects (Walls, Doors, Furniture, Grid, Text, Hatch) and control their colour, on/off, and lock state together. A disciplined layer scheme is what lets you turn systems on and off and keep a complex drawing readable.",
      "In AutoCAD, layer colour traditionally drives printed line weight through a plot style — so 'which layer' often decides 'how heavy it prints.' Even for studio work, putting different elements on different layers/colours is what later lets you assign a clear line-weight hierarchy instead of a flat, weightless drawing.",
      "Set up a small, consistent set of layers and reuse it across drawings. Name them clearly, and resist the urge to draw 'just this one thing' on whatever layer is current — a few seconds of layer discipline now saves a sorting nightmare before review."
    ],
    prereqs: ["acad-draw"],
    conceptSlugs: ["acad-layers"],
    videos: []
  },
  {
    id: "acad-modify",
    title: "Edit & modify efficiently",
    discipline: "autocad",
    track: "2d",
    level: "beginner",
    blurb: "Use the editing toolkit — offset, trim, fillet, array, mirror — fluently.",
    guide: [
      "Most CAD work is editing, not drawing from scratch. The core modify commands repay memorizing: Offset (parallel copy at a distance — walls, setbacks, contours), Trim/Extend (clean up to other lines), Fillet (round or square-join corners), and Move/Copy/Rotate/Mirror for everything else.",
      "Array (rectangular or polar) repeats an object on a grid or around a centre — a row of columns, a ring of seats, a louvre field — as one editable operation. Stretch moves part of a drawing while keeping connections, which is how you push a wall without redrawing everything attached to it.",
      "Learn the keyboard aliases (L for Line, O for Offset, TR for Trim, CO for Copy) — typing them is far faster than hunting toolbars, and fluency here is the difference between CAD feeling slow and feeling like a sketch tool. Watch the command line; it's prompting you for the next input at every step."
    ],
    prereqs: ["acad-draw"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "acad-blocks",
    title: "Blocks & reusable symbols",
    discipline: "autocad",
    track: "2d",
    level: "intermediate",
    blurb: "Build a library of furniture, trees, and fixtures you can drop in.",
    guide: [
      "A block is a named, reusable symbol — a chair, a tree, a door, a north arrow — that you insert as a single object and can place many times. Redefine the block once and every insertion updates, so a furniture or planting library stays consistent and your file stays small.",
      "Make blocks for anything you'll use more than a couple of times, and keep a personal library of them across projects. Attributes can attach editable text to a block (a room name, a tag number), useful for plans where the same symbol carries different labels.",
      "External References (Xrefs) extend the idea to whole drawings: link a site plan or a structural grid into your drawing so it stays a live reference and updates when the source changes. For studio, Xrefs are handy for sharing a common base (the site, the grid) across plan, section, and detail drawings."
    ],
    prereqs: ["acad-draw"],
    conceptSlugs: ["acad-blocks", "acad-xref"],
    videos: []
  },
  {
    id: "acad-annotate",
    title: "Text, dimensions & hatch",
    discipline: "autocad",
    track: "2d",
    level: "intermediate",
    blurb: "Label, dimension, and poché drawings so they read clearly.",
    guide: [
      "Annotation is what turns linework into a communicating drawing. Text (single or multiline) labels spaces and notes; Dimensions measure directly off the geometry and update if it changes; and Hatch fills closed areas with a pattern or solid for poché — concrete, brick, or a solid cut-fill that makes a plan read.",
      "Use styles so everything is consistent: a Dimension Style sets arrowheads, text size, and units once for all dimensions; a Text Style sets the font. Because annotation has to be legible at the printed scale, make it annotative (or tie it to the plot scale) so text and dimensions size themselves correctly per viewport.",
      "Hatch needs a closed boundary, so 'no valid boundary' almost always means a gap in the outline — close the polyline. Keep hatches on their own layer and lighten their colour/weight so the poché supports the drawing rather than overpowering the lines."
    ],
    prereqs: ["acad-layers"],
    conceptSlugs: ["acad-dimension-styles", "acad-hatch", "acad-annotation-scale"],
    videos: []
  },
  {
    id: "acad-linework",
    title: "Line weights & drawing hierarchy",
    discipline: "autocad",
    track: "2d",
    level: "intermediate",
    blurb: "Give drawings depth with a deliberate hierarchy of line weights.",
    guide: [
      "A great architectural drawing reads in layers of importance through line weight: what's cut (poché, walls in section) is heaviest, what's seen beyond is medium, and texture, hatching, and dimensions are lightest. A drawing where every line is the same weight reads flat and amateurish, no matter how accurate.",
      "In AutoCAD you usually control weight by layer colour mapped to a plot style (CTB), or by setting layer line weights directly. Decide a hierarchy — say four weights from heavy cut to fine texture — and assign your layers to it. This is the move that makes student drawings suddenly look professional.",
      "Many students do final line-weight work in Illustrator instead, exporting Make2D/CAD linework and assigning weights there with more visual control. Either way, the thinking is the same: line weight is a design decision about what the viewer should notice first."
    ],
    prereqs: ["acad-layers"],
    conceptSlugs: ["acad-layers", "acad-plot"],
    videos: []
  },
  {
    id: "acad-layouts",
    title: "Layouts & exporting sheets",
    discipline: "autocad",
    track: "2d",
    level: "advanced",
    blurb: "Compose drawings onto a sheet at scale and export clean PDFs.",
    guide: [
      "Model space is where you draw at 1:1; a Layout (paper space) is the sheet you actually present. On a layout you place viewports — scaled windows into your model-space drawing — set each to a real scale (1:50, 1:100), then lock it so panning doesn't change the scale. One layout can hold several drawings at different scales.",
      "Add your title block, drawing titles, scale bars, and north arrow in paper space, around the viewports. Per-viewport layer overrides let one sheet show different layers than another — handy for showing the same plan with and without furniture or structure.",
      "Export to PDF via Plot/Publish using a page setup: sheet size, the plot area (the layout), and a plot style (CTB/STB) that maps your colours to printed line weights. Save a named page setup so consistent output is one click. Most 'all my lines print the same weight' problems trace back to the plot style."
    ],
    prereqs: ["acad-annotate", "acad-linework"],
    conceptSlugs: ["acad-model-paper-space", "acad-viewport", "acad-plot"],
    videos: []
  },
  {
    id: "acad-rhino",
    title: "Round-tripping with Rhino & Illustrator",
    discipline: "autocad",
    track: "2d",
    level: "advanced",
    blurb: "Move linework between 3D, CAD, and layout without losing scale or layers.",
    guide: [
      "Studio drawings rarely stay in one program. A common chain is: model in Rhino → Make2D → export DWG → open or import in AutoCAD (or place in Illustrator) for refinement. The two things that go wrong are scale and layers — export and import at matching units, and keep your layer structure so the linework arrives sorted.",
      "Going the other way, you'll import a CAD site plan or survey (DWG/DXF) into Rhino as an accurate base to model on top of. Check units on import (a metres-vs-millimetres mismatch makes it arrive 1000× off), and put the reference on its own locked layer.",
      "Into Illustrator, DWG/DXF linework comes in as editable vector paths on its layers, where you assign final line weights, colour, and poché. Decide early how 'finished' you take a drawing in CAD versus Illustrator, so you're not redoing line weights in two places."
    ],
    prereqs: ["acad-layouts"],
    conceptSlugs: ["rh-make2d"],
    videos: []
  },
  {
    id: "acad-diagrams",
    title: "Site plans & analytical diagrams",
    discipline: "autocad",
    track: "2d",
    level: "advanced",
    blurb: "Build figure-ground, circulation, and site diagrams from a CAD base.",
    guide: [
      "CAD's precision makes it a strong base for analytical drawings. From an accurate site plan you can build figure-ground (buildings solid, ground void — or the reverse), circulation and access diagrams, zoning and program overlays, and site-section profiles. The accuracy is the argument: these read as evidence, not sketches.",
      "Work in layers of information so a base drawing yields many diagrams: keep the site base on one set of layers and build each analytical overlay (movement, green space, density) on its own, toggling them to produce a clean series. Hatch and solid fills carry most of the diagrammatic reading.",
      "Keep diagrams reductive. The point is to isolate one idea per drawing — strip away everything that isn't making the argument, and use a consistent graphic language (the same fill for 'building,' the same line for 'path') across the set so they read as a family. Finish them in Illustrator for colour and labels."
    ],
    prereqs: ["acad-annotate"],
    conceptSlugs: ["acad-hatch", "acad-polyline"],
    videos: []
  },

  // ══ REVIT (BIM for design studio) ═════════════════════════════════════════
  {
    id: "rvt-intro",
    title: "Families, categories & types",
    discipline: "revit",
    track: "3d",
    level: "beginner",
    blurb: "Understand the parametric building blocks before you place anything.",
    guide: [
      "Revit is a model of a building made of smart, parametric objects — not lines, but walls, doors, floors that know what they are. Every element belongs to a Category (Walls, Doors, Furniture), is defined by a Family (a kind of element with parameters), and exists as a Type within that family (a specific size/configuration). Almost everything you place is an instance of a family type.",
      "The crucial distinction is Type vs. Instance parameters. A Type parameter (a wall's thickness, a door's width) changes every element of that type at once; an Instance parameter (a window's sill height, an element's mark) changes only the one you selected. Knowing which is which tells you whether an edit ripples through the model or stays local.",
      "Work top-down: place generic family types early and refine them later. Don't get lost choosing the perfect door at the massing stage — Revit lets you swap a type and the whole model updates, so set up the structure first and detail it as the design firms up."
    ],
    prereqs: ["gen-units"],
    conceptSlugs: ["rvt-family", "rvt-category", "rvt-type-instance"],
    videos: []
  },
  {
    id: "rvt-levels",
    title: "Levels & datums",
    discipline: "revit",
    track: "3d",
    level: "beginner",
    blurb: "Set up the storeys that host and organize everything.",
    guide: [
      "Levels are horizontal datums — Level 1, Level 2, Roof — that define floor-to-floor heights and host your elements. Set them up early in a section or elevation view, because most elements attach to a level: move a level and the walls, floors, and furniture constrained to it move with it.",
      "Creating a level in a section also generates the associated plan views you'll work in, so your levels and your drawing set are linked from the start. Name them meaningfully (Ground, First, Roof) rather than leaving Level 1/2/3 if the project has a clear storey logic.",
      "Grids are the vertical companion to levels — a structural grid of lettered and numbered lines that locates columns and organizes the plan. Together, levels and grids are the coordinate scaffold the rest of the model hangs on, so getting them right early saves re-hosting later."
    ],
    prereqs: ["rvt-intro"],
    conceptSlugs: ["rvt-levels"],
    videos: []
  },
  {
    id: "rvt-walls",
    title: "Walls, floors & roofs",
    discipline: "revit",
    track: "3d",
    level: "beginner",
    blurb: "Build basic enclosure and watch plans, sections, and 3D update together.",
    guide: [
      "The core of a Revit model is its enclosure: Walls, Floors, and Roofs. You draw a wall in plan and it appears in 3D, in section, and in elevation simultaneously — that's the BIM payoff, one model generating every view. Pick a wall type, set its height to a level, and sketch its line; floors and roofs are drawn as a closed sketch boundary.",
      "Walls have a base and top constraint (this level to that level) and a type that carries thickness and layers. Early on, generic types are fine — you're describing space and massing, not detailing construction. Use the Modify tools (Trim, Join, Align) to make walls meet cleanly at corners.",
      "Because everything is linked, editing is fast and consistent: change a wall and every drawing of it updates, move a level and the storey follows. This is why Revit shines for iterating a design that has real rooms — but it also means sloppy early decisions propagate, so keep types and levels tidy."
    ],
    prereqs: ["rvt-levels"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "rvt-massing",
    title: "Conceptual massing",
    discipline: "revit",
    track: "3d",
    level: "intermediate",
    blurb: "Explore form early with masses and design options, before committing to walls.",
    guide: [
      "Revit isn't only for detailed buildings — it has a conceptual massing environment for early form-finding. Create an in-place mass or a mass family to push and pull simple volumes, study floor area and how the form sits on the site, then apply walls, floors, and curtain systems to the mass faces once the shape is settled.",
      "Mass Floors slice your massing at each level and report area automatically, which makes massing-stage decisions quantitative: you can see how much floor area a scheme yields as you change its shape. That links form to program early, while the design is still soft.",
      "Design Options let you carry several alternatives in one model — keep scheme A and scheme B of a roof or a wing side by side, switch views between them, and resolve later. It's a clean way to study variations without saving a dozen separate files."
    ],
    prereqs: ["rvt-walls"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "rvt-data",
    title: "Rooms, areas & schedules",
    discipline: "revit",
    track: "3d",
    level: "intermediate",
    blurb: "Turn the model into live program and area data.",
    guide: [
      "A schedule is a live table generated from the model's data — place Rooms in your plan and a room schedule reports their names and areas automatically, updating as you push walls around. For studio, this turns program from a static spreadsheet into something the model checks for you: is the gallery actually 200 m²?",
      "Rooms and Areas measure enclosed space; Color Fill plans then shade those rooms by department, program, or area for a clear program diagram straight out of the model. Because it's all the same data, editing a value in a schedule can edit the element, and changing the model updates the schedule.",
      "Shared and project parameters let you attach your own data fields (program group, occupancy, a custom tag) so schedules report exactly what your project argues about. This is BIM's real value in studio: the model is also a database you can interrogate, not just a drawing."
    ],
    prereqs: ["rvt-intro"],
    conceptSlugs: ["rvt-schedules", "rvt-shared-parameters"],
    videos: []
  },
  {
    id: "rvt-views",
    title: "Views, sections & the 3D model",
    discipline: "revit",
    track: "3d",
    level: "intermediate",
    blurb: "Generate plans, sections, elevations, and perspectives from the one model.",
    guide: [
      "Every drawing in Revit is a live view of the model. Cut a Section by drawing its line in plan; place an Elevation marker for facades; create perspective or isometric 3D views from the camera tool. Each view updates automatically when the model changes — you never redraw a section because a wall moved.",
      "The Project Browser is your map of all these views; keep it organized. View properties control what each view shows: scale, detail level, and the crop region that frames it. A View Range in plans sets the cut height — useful when a plan is missing something because it's above or below the cut.",
      "Section boxes (in a 3D view) let you cut away part of the model for a cutaway axon or a worm's-eye — strong presentation drawings that would be laborious by hand. Because views are cheap to make, generate the drawings the design needs and prune the ones it doesn't."
    ],
    prereqs: ["rvt-walls"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "rvt-docs",
    title: "Sheets & presentation views",
    discipline: "revit",
    track: "3d",
    level: "advanced",
    blurb: "Compose views onto sheets and control how they read graphically.",
    guide: [
      "A Sheet is a presentation page with a title block; drag views onto it and they keep their scale and update live. Sheet numbers and names drive the drawing set and the Project Browser. Placing a view on a sheet is what makes it part of your issued set — for studio, that's your pin-up or your final board layout.",
      "View Templates bundle scale, detail level, and visibility/graphics settings so many views share one consistent look and update together — apply a template and those properties become controlled across every view that uses it. This is how you enforce a graphic standard across a whole set instead of styling each view by hand.",
      "Even if you'll finish boards in InDesign, sheets are useful for laying out a coordinated set quickly and exporting clean PDFs. Many students export individual Revit views as image/PDF and compose in InDesign for finer graphic control — decide which, so you're not fighting Revit's layout for things Illustrator/InDesign do better."
    ],
    prereqs: ["rvt-data"],
    conceptSlugs: ["rvt-sheets", "rvt-view-templates"],
    videos: []
  },
  {
    id: "rvt-graphics",
    title: "Presentation graphics from Revit",
    discipline: "revit",
    track: "3d",
    level: "advanced",
    blurb: "Get drawings out of Revit that look designed, not default.",
    guide: [
      "Default Revit output looks like default Revit output, and reviewers notice. The fixes are mostly graphic: set a clear line-weight hierarchy (Visibility/Graphics and object styles), turn on shadows and sketchy/realistic display for depth, and use solid cut-fills (poché) so sections read. Override individual element graphics where a drawing needs emphasis.",
      "Colour Fill plans (by room, program, or area) and analytical overlays make Revit's data legible as diagrams. Keep a restrained palette and consistent fills across the set, the same as any other representation work — the model gives you the data; you still make the graphic decisions.",
      "Export for post-production: send views to Illustrator/Photoshop as vector PDFs (linework you can re-weight) or high-res images (to collage and add entourage, sky, and atmosphere). The strongest Revit presentations usually get a pass of hand-graphic love in the Adobe suite before they hit the board."
    ],
    prereqs: ["rvt-docs"],
    conceptSlugs: ["rvt-view-templates"],
    videos: []
  },
  {
    id: "rvt-phases",
    title: "Phasing for adaptive reuse",
    discipline: "revit",
    track: "3d",
    level: "advanced",
    blurb: "Model existing, demolished, and new construction over time.",
    guide: [
      "Phasing tags every element as existing, demolished, or new, and each view shows a phase with a phase filter controlling how each appears (existing in grey, demo dashed, new solid). One model then produces existing-condition, demolition, and proposed drawings — essential for renovation and adaptive-reuse studios, which live or die by correct phase settings.",
      "Set an element's phase when you create it (Phase Created / Phase Demolished in its properties), and set each view's Phase and Phase Filter to control the story it tells. A 'new construction' view hides the demolished bits; an 'existing' view shows the building as found.",
      "Constraints pair naturally with this work: locked dimensions, alignments, and pins hold relationships so that as you edit the existing fabric, the new intervention stays put relative to it. Over-constraining causes the classic 'can't move, constraints not satisfied' error — use them deliberately to encode design intent, not to lock everything down."
    ],
    prereqs: ["rvt-views"],
    conceptSlugs: ["rvt-phases", "rvt-constraints"],
    videos: []
  },

  // ══ ADOBE (representation & portfolio) ════════════════════════════════════
  {
    id: "adobe-foundations",
    title: "Vector, raster, resolution & colour",
    discipline: "adobe",
    track: "2d",
    level: "beginner",
    blurb: "Know which Adobe app to reach for, and set documents up right.",
    guide: [
      "The Adobe suite splits by the kind of work: Photoshop for raster (photos, renders, collage, textures), Illustrator for vector (diagrams, linework, logos, type-heavy graphics), and InDesign for multi-page layout (portfolios, booklets, board sets). Using the right one for each task is half the battle — don't draw diagrams in Photoshop or lay out a portfolio in Illustrator.",
      "Set documents up correctly from the start: the right size and units, RGB for screen / CMYK for print, and enough resolution (around 300 ppi at print size) for raster work. Fixing colour mode or resolution after the fact is painful, so decide the output first.",
      "These three apps are designed to hand work to each other — a vector diagram from Illustrator placed into an InDesign board, a render from Photoshop linked in too. Learn to place (link) rather than paste, so updating a source file updates everywhere it appears."
    ],
    prereqs: ["gen-raster-vector"],
    conceptSlugs: ["ps-vector-raster", "ps-resolution", "ps-cmyk-rgb"],
    videos: []
  },
  {
    id: "ps-basics",
    title: "Photoshop essentials",
    discipline: "adobe",
    track: "2d",
    level: "beginner",
    blurb: "Layers, selections, and masks — the foundation of every render and collage.",
    guide: [
      "Photoshop works in layers stacked on top of each other, and almost everything good you do depends on keeping work on separate layers rather than flattening. Name your layers and group them; a 20-layer file you can navigate beats a 3-layer file you've painted yourself into a corner with.",
      "Selections define where an edit applies — Marquee, Lasso, and the Quick Selection / Object Selection tools isolate part of an image. The key move is to turn a selection into a layer mask rather than deleting pixels: white reveals, black hides, so you can always paint the edit back. This 'non-destructive' habit is the single most important Photoshop skill.",
      "For architecture, your first real tasks are usually adjusting and compositing: fix the exposure and colour of a render, cut out an entourage figure and drop it into a scene, or assemble a simple collage. Do each of these on its own layer with masks, and you can keep refining instead of starting over."
    ],
    prereqs: ["adobe-foundations"],
    conceptSlugs: ["ps-layer-mask"],
    videos: []
  },
  {
    id: "ai-basics",
    title: "Illustrator essentials",
    discipline: "adobe",
    track: "2d",
    level: "beginner",
    blurb: "Artboards, shapes, and the pen tool for crisp diagrams and linework.",
    guide: [
      "Illustrator draws with vectors — paths that stay sharp at any size — which makes it the home for diagrams, refined linework, and anything type-heavy. Documents are organized into Artboards (your canvases/pages); set them to your real output sizes so export is clean, and you can hold several boards in one file.",
      "Build from simple shapes (rectangle, ellipse, polygon) and the Pen tool, which places anchor points connected by paths — click for corners, click-drag for curves. The Pen takes practice but it's how you draw exact, scalable outlines: site boundaries, custom diagrams, clean curves.",
      "The everyday studio job is taking CAD or Make2D linework into Illustrator and giving it line weights, colour, and poché — turning flat exported lines into a drawing with hierarchy. Keep elements on layers, use the Stroke panel for weights, and Object > Arrange to control what sits in front."
    ],
    prereqs: ["adobe-foundations"],
    conceptSlugs: ["ai-artboard", "ai-pen-tool"],
    videos: []
  },
  {
    id: "ps-nondestructive",
    title: "Non-destructive Photoshop",
    discipline: "adobe",
    track: "2d",
    level: "intermediate",
    blurb: "Edit reversibly with masks, smart objects, adjustment layers, and blend modes.",
    guide: [
      "Non-destructive editing means you can always change your mind — and it's what separates fluent Photoshop from frustrating Photoshop. Layer masks hide instead of delete; Adjustment Layers (Curves, Levels, Hue/Saturation) change colour and tone on a separate, re-editable layer; and Smart Objects wrap content so transforms and filters stay editable.",
      "Blend modes change how a layer mixes with those below: Multiply darkens (perfect for dropping a white-background diagram or a shadow onto a coloured board), Screen lightens, Overlay boosts contrast. They're non-destructive and pair beautifully with masks for compositing.",
      "Put together, these give you a render/collage workflow you can keep tuning right up to the deadline: adjust exposure with a Curves layer, mask a sky in, multiply a hand-drawn texture over the whole thing, and change any of it later. Flatten only at the very end, to a copy."
    ],
    prereqs: ["ps-basics"],
    conceptSlugs: ["ps-layer-mask", "ps-clipping-mask", "ps-smart-object", "ps-adjustment-layer", "ps-blend-modes"],
    videos: []
  },
  {
    id: "ai-vector",
    title: "Vector drawing & line weights",
    discipline: "adobe",
    track: "2d",
    level: "intermediate",
    blurb: "Build refined diagrams and assign a clear line-weight hierarchy.",
    guide: [
      "This is where studio drawings get their polish. Bring in CAD/Make2D linework and assign a deliberate line-weight hierarchy — heaviest for what's cut, medium for what's seen, lightest for texture and dimensions. The Stroke panel and a handful of consistent weights are what make a drawing read as designed.",
      "Pathfinder combines shapes like booleans (Unite, Minus Front, Intersect) — the fast way to build figure-ground, icons, and complex diagrams from simple parts. The Pen tool and anchor-point editing let you draw or correct exact paths; keep anchor points few for clean curves.",
      "Work with Layers and consistent Swatches so a set of diagrams reads as a family, and use type styles for labels. Because it's all vector, the drawing scales to any board size without losing crispness, and exports cleanly to PDF/SVG for InDesign."
    ],
    prereqs: ["ai-basics"],
    conceptSlugs: ["ai-pen-tool", "ai-pathfinder", "ai-artboard"],
    videos: []
  },
  {
    id: "ps-collage",
    title: "Architectural collage & post-production",
    discipline: "adobe",
    track: "2d",
    level: "intermediate",
    blurb: "Composite renders, entourage, and atmosphere into a compelling image.",
    guide: [
      "The architectural collage — part render, part cut-out photography, part texture and atmosphere — is a signature representation mode, and it's pure Photoshop compositing. Build it in layers: the base (a render or model view), then entourage (people, planting, vehicles), then sky and background, then atmosphere (haze, light, grain) on top.",
      "Sell the image with consistency of light and colour. Match the direction and warmth of light across cut-out elements, add contact shadows where things meet the ground, and unify everything with a Curves or Color Balance adjustment layer over the whole stack. Multiply and Screen blend modes do a lot of the atmospheric work.",
      "Collect a personal library of high-quality entourage (cut-out people, trees, skies) and reuse it. Keep elements as Smart Objects so you can scale and reposition without losing quality, and keep the file layered so you can restage the scene — the collage is never really 'done,' just due."
    ],
    prereqs: ["ps-nondestructive"],
    conceptSlugs: ["ps-blend-modes", "ps-layer-mask", "ps-smart-object"],
    videos: []
  },
  {
    id: "id-layout",
    title: "Multi-page layout in InDesign",
    discipline: "adobe",
    track: "2d",
    level: "advanced",
    blurb: "Lay out a portfolio or booklet with grids, parent pages, and styles.",
    guide: [
      "InDesign is built for multi-page documents — portfolios, booklets, report sets — and it's where a pile of drawings becomes a designed object. Set up a margin and column grid first; consistent grids are the invisible structure that makes a portfolio feel considered rather than thrown together.",
      "Parent (master) pages hold elements that repeat across pages — margins, page numbers, running headers — so they appear and update everywhere automatically. Paragraph and Character Styles do the same for text: define your heading and body styles once, and restyle the whole document by editing the style.",
      "Place — don't paste — your images and drawings, so each stays linked to its source file and updates when you re-export it from Rhino/Illustrator/Photoshop. This is the payoff of the whole pipeline: change a drawing upstream, and the portfolio page refreshes instead of needing a manual swap."
    ],
    prereqs: ["ai-vector"],
    conceptSlugs: ["id-master-pages", "id-paragraph-styles"],
    videos: []
  },
  {
    id: "id-print",
    title: "Print-ready boards & books",
    discipline: "adobe",
    track: "2d",
    level: "advanced",
    blurb: "Export boards and portfolios that come back from the printer clean.",
    guide: [
      "Getting to print is its own skill, and it's where deadlines are won or lost. Set up Bleed (artwork extended ~3 mm past the trim) so cut edges never show a white sliver, and push edge-to-edge images into the bleed. Confirm the document size matches the board/printer exactly.",
      "Before you export, run Preflight to catch missing or low-res linked images, missing fonts, and overset text, then Package to gather the InDesign file, fonts, and links into one folder — the cure for the classic 'fonts missing at the print shop' disaster. Export to PDF with the right preset (press-quality for print, with marks and bleed).",
      "Check the output before you commit to a plot: open the exported PDF at 100%, look for low-res images and colour shifts (soft-proof CMYK), and ideally print one tile at size. A five-minute check beats discovering a pixelated render after the whole board is plotted."
    ],
    prereqs: ["id-layout"],
    conceptSlugs: ["id-bleed-slug", "id-preflight"],
    videos: []
  },
  {
    id: "portfolio-systems",
    title: "Portfolio & board systems",
    discipline: "adobe",
    track: "2d",
    level: "advanced",
    blurb: "Design a consistent visual system that carries across every board and page.",
    guide: [
      "A strong portfolio reads as one designed system, not a collection of one-off pages. Decide the system up front: a grid, one or two typefaces with a clear hierarchy, a limited colour palette, and consistent rules for captions, page numbers, and image framing. Then every project plugs into the same chassis.",
      "Let the work breathe and lead with hierarchy — one hero image per spread, supporting drawings sized by importance, generous margins, and white space that signals confidence. Sequence each project as an argument (question → site → move → proof) rather than a data dump of every drawing you made.",
      "Build it to be maintainable: parent pages and styles so a change to the system updates everywhere, linked images so upstream edits flow through, and a master file you can re-cut into print boards, a PDF portfolio, and screen versions. The system is the thing you reuse across studio, applications, and your first job."
    ],
    prereqs: ["id-layout"],
    conceptSlugs: ["id-paragraph-styles", "id-master-pages"],
    videos: []
  },

  // ══ DESIGN CONCEPTS & THEORY (the ideas under the drawings) ════════════════
  {
    id: "dt-elements",
    title: "Elements of architecture",
    discipline: "design-theory",
    track: "both",
    level: "beginner",
    blurb: "See space as built from point, line, plane, and volume — solid and void.",
    guide: [
      "Before any software, architecture is made from a small vocabulary of formal elements: the point (a focus, a column), the line (an edge, a beam, a path), the plane (a wall, a floor, a roof), and the volume (a room, a mass). Everything you model is an arrangement of these.",
      "Crucially, architecture is as much about the void as the solid — the space between and within elements is the real material. A plan is a cut through solids that reveals the shape of the space they define; learning to see figure (solid) and ground (void) flip back and forth is a core skill.",
      "Train your eye by naming these elements in buildings you admire: what holds space, what edges it, what sits as a figure in the void. This vocabulary (drawn from Ching's Architecture: Form, Space and Order) is the language you will use to describe your own and others' designs."
    ],
    prereqs: [],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "dt-ordering",
    title: "Ordering principles",
    discipline: "design-theory",
    track: "both",
    level: "beginner",
    blurb: "Organize a composition with axis, hierarchy, rhythm, and datum.",
    guide: [
      "Designs feel coherent because they are ordered. The classic ordering principles — axis (a line organizing elements), symmetry, hierarchy (some things more important than others), rhythm (repetition and pattern), and datum (a line, plane, or volume tying parts together) — are the moves that turn a pile of rooms into a composition.",
      "These are not rules to obey but tools to deploy and break deliberately. A strong scheme usually has one clear primary order — an axis, a grid, a hierarchy — that you can read instantly, with secondary moves playing against it.",
      "Diagram the ordering of plans you admire: where is the axis, what is the hierarchy, where does rhythm appear? Then check your own scheme — if you cannot name its organizing principle, the design probably does not have one yet."
    ],
    prereqs: ["dt-elements"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "dt-precedent",
    title: "Reading precedent",
    discipline: "design-theory",
    track: "both",
    level: "beginner",
    blurb: "Analyze an existing building to learn moves you can borrow.",
    guide: [
      "Precedent study is how architects learn — you analyze how a successful building solves problems and borrow the moves, not the look. Pick a building related to your project's program, site, or idea, and take it apart through drawing: redraw its plan, section, and parti diagram yourself.",
      "Ask structured questions: what is the big idea (parti)? How does it meet the ground and the sky? How does it organize circulation and program? How does structure shape space? Drawing the building yourself — rather than only looking at photos — is what reveals the decisions.",
      "Build a habit of keeping a precedent library (the toolkit's Librarian tool is built for exactly this). The goal is a vocabulary of strategies you can recombine, with attribution — borrowing a sectional move from one building and a massing strategy from another is how design knowledge compounds."
    ],
    prereqs: ["dt-elements"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "dt-parti",
    title: "Parti & the big idea",
    discipline: "design-theory",
    track: "both",
    level: "intermediate",
    blurb: "Reduce a scheme to one clear, generating concept.",
    guide: [
      "A parti is the central organizing idea of a project, reducible to a simple diagram — a bar split by a slot, a wrapped courtyard, a stack of differentiated floors, a path that becomes the building. The parti is what you can explain in one sentence and one sketch, and it is what holds every other decision together.",
      "A strong parti does work: it resolves the program, responds to the site, and gives you a rule for making decisions ('does this move reinforce the slot, or fight it?'). Schemes without a parti tend to feel arbitrary — every choice is up for grabs because nothing organizes them.",
      "Test your scheme by trying to draw its parti in ten seconds. If you cannot, the idea is not clear yet. If you can, use it as a filter: keep moves that strengthen the parti, cut moves that blur it. The parti is also the spine of how you will present and defend the project."
    ],
    prereqs: ["dt-precedent", "dt-ordering"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "dt-scale-body",
    title: "Scale, proportion & the body",
    discipline: "design-theory",
    track: "both",
    level: "intermediate",
    blurb: "Design space that fits the human body and reads at the right scale.",
    guide: [
      "Architecture is measured against the human body. Knowing rough dimensions by heart — a comfortable stair (about 150–180 mm riser), a door (about 900 mm), a corridor, a ceiling that feels generous versus oppressive — lets you design spaces that actually work, and spot when a drawing is lying about scale.",
      "Proportion is the relationship between dimensions, and it is a design tool: systems like the golden section, a module, or a structural grid give a composition internal consistency. Scale is how big something feels relative to us — the same room reads intimate or monumental depending on its proportions and how the body enters it.",
      "Always populate drawings with human figures and furniture at true scale — it is both a check (does this fit a person?) and a communication tool (it tells the viewer how big the space is). When a space feels off in the model, measure it against a standing figure before anything else."
    ],
    prereqs: ["dt-elements"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "dt-site-context",
    title: "Site, context & place",
    discipline: "design-theory",
    track: "both",
    level: "intermediate",
    blurb: "Make the design respond to where it actually is.",
    guide: [
      "No building is an object alone — it sits in a place with a climate, a history, neighbours, topography, light, and views. Strong design reads the site as a set of forces and opportunities and lets them shape the scheme, so the building could only be here. (The toolkit's Site Analysis tool turns a real parcel into citable evidence for exactly this.)",
      "Work at two scales: the figure-ground of the wider context (how your mass relates to neighbours and streets) and the immediate site (sun, wind, slope, access, the good view, the thing to hide). A response can be contextual (fitting in) or contrarian (a deliberate foil) — but it should be a position, not an accident.",
      "Diagram the site's forces before you design, then test every massing move against them: does rotating the building improve light and views, does this edge engage the street or turn its back? Designing with the site is what separates a sited building from a generic object dropped onto a plot."
    ],
    prereqs: ["dt-ordering"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "dt-tectonics",
    title: "Tectonics & materiality",
    discipline: "design-theory",
    track: "both",
    level: "advanced",
    blurb: "Treat how a building is built — and how it shows it — as design.",
    guide: [
      "Tectonics is the art of construction — how a building is made, and how that making is expressed. Materials, joints, structure, and detail are not an afterthought added to a form; in strong architecture they are where the idea becomes physical and legible. A concrete building and a timber-framed one of the same shape are different buildings.",
      "Think about how loads travel (what holds this up, and is that expressed or hidden?), how materials meet (the joint is where craft and meaning concentrate), and how the building weathers and ages. Even at concept stage, choosing a structural and material logic gives the design discipline and richness.",
      "Develop a tectonic position alongside the form: draw a wall section that shows ground, structure, envelope, and roof meeting, and let it inform the bigger moves. A scheme that knows how it is built reads as resolved; one that is only a shape reads as unfinished."
    ],
    prereqs: ["dt-scale-body"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "dt-program-type",
    title: "Program & type",
    discipline: "design-theory",
    track: "both",
    level: "advanced",
    blurb: "Use program and building type as generators, not constraints.",
    guide: [
      "Program is what a building does — the activities, their sizes, and their relationships. Beginners treat program as a checklist of rooms to fit; designers treat it as a generator: the way you organize and connect programs (stacked, woven, separated, blended) is a primary design idea.",
      "Building types — the courtyard house, the gallery enfilade, the loft, the tower — are accumulated knowledge about how a program can be organized, diagrams refined over centuries. Knowing the type gives you a starting position to adopt, adapt, or subvert, rather than reinventing organization from zero.",
      "Make an adjacency diagram of your program early (what needs to be near what, public versus private, served versus servant), then test organizational types against it. The interesting design questions live in the relationships — where two programs touch, overlap, or are deliberately kept apart."
    ],
    prereqs: ["dt-parti"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "dt-position",
    title: "Developing a design position",
    discipline: "design-theory",
    track: "both",
    level: "advanced",
    blurb: "Move from solving a brief to arguing a point of view.",
    guide: [
      "Upper-level work asks for more than a building that works — it asks for a position: a point of view about architecture that the project argues. This is where theory enters, not as quotation but as a stance — about how people should live, how a building should meet its city, what beauty or sustainability or justice means here.",
      "A position makes a project criticisable in a good way: it can be agreed with or argued against, which is what makes a review a real conversation. It also gives you a rule for the hard decisions and a thesis for your portfolio and your talk.",
      "Find your position by asking what you are really arguing for, then pressure-test it: does every major move serve it? Read widely — theory, criticism, other disciplines — to sharpen the terms. The strongest designers can say, in a sentence, what their project believes, and then show it in the drawings."
    ],
    prereqs: ["dt-parti", "dt-site-context"],
    conceptSlugs: [],
    videos: []
  },

  // ══ ARCHITECTURAL MEDIA (ways of making the image) ════════════════════════
  {
    id: "am-orthographic",
    title: "Orthographic drawing",
    discipline: "architectural-media",
    track: "2d",
    level: "beginner",
    blurb: "Communicate with the plan, section, and elevation.",
    guide: [
      "The plan, section, and elevation are architecture's primary language — flat, scaled, measurable projections that let anyone read and build a design. A plan is a horizontal cut (usually about 1.2 m up) looking down; a section is a vertical cut; an elevation is a straight-on face. Mastering these is non-negotiable, whatever software you use.",
      "Conventions carry meaning: what is cut is drawn heaviest (poché), what is seen beyond is lighter, and line weight does most of the communicating. Include a scale, a north arrow on plans, and human figures so the drawing is legible and honest about size.",
      "These drawings are generated from your model (Rhino Make2D, Revit views, or drawn in CAD/Illustrator), but the thinking is the same everywhere. A set that is coordinated — the section cut shown on the plan, consistent line weights — reads as professional; one that is not reads as student work."
    ],
    prereqs: [],
    conceptSlugs: ["rh-make2d"],
    videos: []
  },
  {
    id: "am-hand",
    title: "Hand drawing & sketching",
    discipline: "architectural-media",
    track: "2d",
    level: "beginner",
    blurb: "Think with a pen — the fastest design tool you own.",
    guide: [
      "Drawing by hand is still the fastest way to think. A loose sketch externalizes an idea in seconds, and the slight imprecision keeps a scheme open and exploratory in a way that crisp CAD lines shut down too early. The point is not pretty drawings; it is thinking made visible on paper.",
      "Build a few core skills: quick freehand plans and sections to test ideas, one- and two-point perspective to imagine a space from inside, and fast diagrams. Trace, overlay, and iterate — sketch over a printout of your model, then bring the best moves back in.",
      "Keep a sketchbook and draw constantly, including from observation (buildings, spaces you are in) — it trains your eye and stocks your memory with moves. Hybrid workflows are common: sketch to think, model to test, then sometimes hand-draw over a render for a warmer final image."
    ],
    prereqs: [],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "am-diagram",
    title: "The diagram",
    discipline: "architectural-media",
    track: "2d",
    level: "beginner",
    blurb: "Explain an idea by stripping it to its essence.",
    guide: [
      "A diagram is a drawing that explains one idea by leaving everything else out — circulation, program, structure, massing logic, site forces. It is both a design tool (diagramming forces you to clarify the idea) and a communication tool (a good diagram makes a jury understand your project in a glance).",
      "The discipline is reduction: decide the single thing the diagram says, then remove everything that is not saying it. Use a consistent graphic language — the same colour for 'public', the same arrow for 'movement' — across a series so they read as a family that builds an argument.",
      "Diagrams are usually vector (Illustrator) built over a simplified plan or axon. Make the parti diagram first — if you cannot diagram your big idea simply, it is not clear yet — then a small set of supporting diagrams that each carry one point."
    ],
    prereqs: ["am-orthographic"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "am-collage",
    title: "Collage & the post-digital image",
    discipline: "architectural-media",
    track: "2d",
    level: "intermediate",
    blurb: "Make atmospheric, flat, texture-rich images by compositing.",
    guide: [
      "The architectural collage — flat, frontal, full of texture, cut-out figures, and atmosphere — is a dominant contemporary representation mode (the 'post-digital' look). It deliberately rejects photorealism for something closer to a painting or a graphic: a curated image that says how a space feels, not just how it looks.",
      "It is built in Photoshop by compositing layers: a base (a flat model view or elevation), textures and materials, cut-out people and plants, sky, and a unifying atmosphere (haze, grain, a colour wash over everything). Blend modes, masks, and a consistent light direction tie it together.",
      "Curate hard: a limited palette, a clear focal point, and restraint separate a strong collage from a busy mess. Collect a personal library of cut-out entourage and textures, keep everything layered and non-destructive, and decide the mood before you start placing elements."
    ],
    prereqs: ["am-diagram"],
    conceptSlugs: ["ps-blend-modes", "ps-layer-mask"],
    videos: []
  },
  {
    id: "am-rendering",
    title: "Rendering basics",
    discipline: "architectural-media",
    track: "3d",
    level: "intermediate",
    blurb: "Light, material, and frame a 3D model into a clean image.",
    guide: [
      "Rendering turns a 3D model into a lit image. The fundamentals are the same across engines (Enscape, V-Ray, Twinmotion, Blender, Rhino Render): set up a camera, assign materials, light the scene (usually a sun plus sky, sometimes interior lights), and render. Most of the quality is in lighting and composition, not the engine.",
      "Frame the shot like a photographer: a considered camera height and angle (eye-level for inhabited space, not a random orbit), a clear subject, and good light (raking, late-day sun reads better than flat noon). Keep materials simple and believable — restraint beats a noisy material library.",
      "A raw render is a starting point; a pass of post-production (exposure, contrast, sky, entourage, atmosphere in Photoshop) is what makes it sing. Set up a few consistent views across your scheme so the images read as a coherent series rather than one-offs."
    ],
    prereqs: ["am-orthographic"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "am-axon",
    title: "Axonometric & exploded views",
    discipline: "architectural-media",
    track: "both",
    level: "intermediate",
    blurb: "Show object, assembly, and system in one legible 3D drawing.",
    guide: [
      "The axonometric (and its cousins the isometric and the worm's-eye) is a 3D drawing with no perspective distortion — parallel lines stay parallel and it is measurable, which makes it perfect for explaining objects, assemblies, and systems clearly. The worm's-eye axon, looking up through the plan, is an architectural signature.",
      "The exploded axon pulls a building apart along an axis to reveal its layers — structure, envelope, floors, program — and is one of the most powerful ways to explain how a project is put together. It is an analytical drawing as much as a beautiful one.",
      "Generate axons from your model (a parallel-projection view in Rhino/Revit, then Make2D or render) and refine in Illustrator with line weights and colour, or render directly. Keep the projection consistent across a series, and use the explosion or cutaway to reveal exactly the idea you want to explain."
    ],
    prereqs: ["am-orthographic"],
    conceptSlugs: ["rh-make2d"],
    videos: []
  },
  {
    id: "am-photoreal",
    title: "Photorealistic visualization",
    discipline: "architectural-media",
    track: "3d",
    level: "advanced",
    blurb: "Push a render toward convincing realism — and know when to.",
    guide: [
      "Photorealism aims for an image hard to tell from a photograph, using path-traced engines (V-Ray, Corona, Lumion, Blender Cycles) and careful material, lighting, and post work. It is the language of competitions and client presentations — persuasive, but slow and seductive, so use it when convincing realism is the goal, not as a default.",
      "Realism lives in the details that signal 'real': physically based materials with the right roughness and reflection, realistic lighting (HDRI skies, soft shadows, global illumination), imperfection (wear, dirt, slight asymmetry), and depth of field. Reference real photographs constantly — the eye knows when light is wrong.",
      "Post-production is half the work: colour grading, bloom, lens effects, and compositing entourage in Photoshop. Be honest, too — a hyper-real render can oversell an unresolved design, and reviewers notice when the image is doing the work the architecture is not."
    ],
    prereqs: ["am-rendering"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "am-animation",
    title: "Animation & walkthroughs",
    discipline: "architectural-media",
    track: "3d",
    level: "advanced",
    blurb: "Move through and over a project in time-based media.",
    guide: [
      "Animation adds time — a walkthrough that moves through your spaces, a fly-over of the massing, an animated diagram that builds an idea step by step, or a sequence showing change over a day. Motion can explain spatial and temporal experience that a still never can.",
      "The core skills are camera paths (a smooth, motivated move — enter, reveal, arrive — not a dizzy orbit), keyframing, and editing. Tools range from Rhino/Grasshopper and Twinmotion/Lumion for arch-viz to After Effects for animated diagrams and editors (Premiere, DaVinci, CapCut) for cutting it together with sound.",
      "Keep it short and purposeful — 30 to 90 seconds, every shot earning its place — and storyboard before you render hours of frames. Sound and pacing matter as much as the imagery. An animated parti diagram is often more useful (and cheaper) than a long photoreal walkthrough."
    ],
    prereqs: ["am-rendering"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "am-realtime",
    title: "Real-time & interactive 3D",
    discipline: "architectural-media",
    track: "3d",
    level: "advanced",
    blurb: "Explore and present a model live — game engines, VR, and the web.",
    guide: [
      "Real-time engines render your model instantly as you move, instead of waiting minutes per frame. Tools like Twinmotion, Enscape, and Unreal Engine give immediate lit walkthroughs; web tools (Three.js, the toolkit's own viewer) put an explorable model in a browser; and VR/AR puts you at 1:1 scale inside the design.",
      "The trade-off is setup versus immediacy: real-time engines need clean, optimized geometry and materials, but then let you explore, present interactively, and iterate lighting live — invaluable for testing spatial experience and for reviews where you walk a critic through the project.",
      "Match the medium to the audience: a quick Enscape walkthrough for studio, a web 3D model for a portfolio site, VR for testing scale and immersion. Keep models light (real-time punishes heavy geometry), and remember interactivity is the point — let people look where they want, which a video cannot."
    ],
    prereqs: ["am-rendering"],
    conceptSlugs: [],
    videos: []
  },

  // ══ AGENTIC CODING (vibe-coding for architects) ═══════════════════════════
  {
    id: "ac-mindset",
    title: "The vibe-coding mindset",
    discipline: "agentic-coding",
    track: "both",
    level: "beginner",
    blurb: "Direct an AI to build software — you are the author, not the typist.",
    guide: [
      "Agentic coding (or 'vibe-coding') means building software by directing an AI agent in plain language, rather than typing code yourself. The agent reads files, writes code, runs it, sees the errors, and fixes them in a loop — you stay the author and editor, describing what you want and judging the result. This whole toolkit was built this way, by an architect, not a programmer.",
      "The mindset shift is from 'I must know how to code' to 'I must know how to direct, specify, and verify.' You bring the design judgement and the problem; the agent brings the syntax. That maps neatly onto how designers already work — ask, gather, propose, iterate.",
      "The core stance is trust but verify: the agent is fast, confident, and often wrong, so treat its output as a first draft to test and break, hunting for edge cases. Get something running, then deliberately try the weird input. It is the same skeptical iteration you bring to a design, applied to software."
    ],
    prereqs: [],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "ac-setup",
    title: "Your first agentic setup",
    discipline: "agentic-coding",
    track: "both",
    level: "beginner",
    blurb: "Get an agent running and make a tiny thing work.",
    guide: [
      "You need three things: an agentic coding tool (Claude Code in the terminal, or Cursor/Codex), a place to put files (a folder, ideally version-controlled with git), and a small first goal. Do not start with 'build my portfolio site' — start with 'make a single web page that says hello and changes colour on click.'",
      "Get comfortable with the basics around the agent: a terminal (where you type commands and run the tool), a project folder, and saving and running what it makes. The agent handles the code; you handle steering it and looking at the result. A little terminal literacy goes a long way.",
      "The goal of the first session is the loop, not the product: ask for something small, run it, see it work or break, ask for a fix, repeat. Once that loop feels natural on something trivial, you can point it at real tools. Keep your asks small and testable at first."
    ],
    prereqs: ["ac-mindset"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "ac-prompting",
    title: "Prompting & specifying",
    discipline: "agentic-coding",
    track: "both",
    level: "beginner",
    blurb: "Get better results by asking clearly and iterating.",
    guide: [
      "The quality of what an agent builds depends heavily on how you specify it. Be concrete about the goal, the inputs and outputs, and any constraints ('a single HTML file, no frameworks, works offline'). Vague asks get vague software; a clear spec gets something you can actually evaluate.",
      "Work iteratively rather than expecting one perfect shot: get a rough version, then refine it in small, specific steps ('make the button bigger', 'now handle an empty input'). Show the agent the actual error or a screenshot — concrete feedback beats 'it is broken.'",
      "Tell it your stance, too: ask it to flag assumptions, to keep things simple, and to point out edge cases. Save the prompts and specs that worked — over time you build a personal library of how to ask, which is its own skill."
    ],
    prereqs: ["ac-mindset"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "ac-webapp",
    title: "Build a simple web app",
    discipline: "agentic-coding",
    track: "both",
    level: "intermediate",
    blurb: "Make a small, useful, browser-based tool.",
    guide: [
      "A huge amount of useful software is just a web page with some logic — a calculator, a small interactive diagram, a converter, a drawing tool. These are static web apps (HTML, CSS, JavaScript): they run entirely in the browser, store no secrets, and can be hosted free. They are the perfect first real build.",
      "Direct the agent to keep it self-contained and simple, then run it locally and test it hard — empty inputs, weird values, small screens. Because it is all client-side, you can read what it made, and there is nothing to break server-side. Iterate until it does one job well.",
      "Scope tightly: one tool, one job. 'A tool that converts a Rhino dimension list into a cut sheet' is a great brief; 'build a design platform' is not. Ship the small thing, use it, then grow it — exactly how the tools in this toolkit started."
    ],
    prereqs: ["ac-setup", "ac-prompting"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "ac-data",
    title: "Data, APIs & the key trap",
    discipline: "agentic-coding",
    track: "both",
    level: "intermediate",
    blurb: "Connect to data and AI models without leaking your keys or money.",
    guide: [
      "Tools get powerful when they talk to data and AI models through APIs. But the moment a tool calls a paid model (like Claude), it has an API key — and that key is money. The cardinal rule: a key can never sit in code running in a browser, or someone will find it and run up your bill in a weekend.",
      "The fix is a thin server function (a 'serverless function') that sits between the user and the model, holds the key, and proxies the calls — with rate limits and a hard spend cap. This is exactly how the AI tools in this toolkit protect the Anthropic key and refuse anonymous callers.",
      "Have the agent set this up for you, but understand the shape: public browser code → your server function (holds the secret) → the model. The same layer is where privacy lives — be honest about where student or user data goes the moment it leaves the browser."
    ],
    prereqs: ["ac-webapp"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "ac-harness",
    title: "Agent harnesses & context",
    discipline: "agentic-coding",
    track: "both",
    level: "intermediate",
    blurb: "Make an agent reliable by giving it memory, tools, and rules.",
    guide: [
      "Once you outgrow the chat box, the key concept is the agent harness: the scaffolding you wrap around a model to make its behaviour predictable instead of improvised. It is the difference between a clever assistant and a dependable one — and it is mostly about context and constraints, not cleverness.",
      "A harness includes persistent instructions and project knowledge (a rules file the agent reads every session), memory (facts it carries between sessions), the specific tools it is allowed to call, and guardrails (what it must never do — e.g. push to production without asking). This very repository runs on exactly such a harness.",
      "Treat the harness as a design problem: when the agent keeps making the same mistake, do not just correct it again — encode the correction as a rule. Good harness design is what lets non-programmers run sophisticated agents reliably, which is the whole premise of this toolkit."
    ],
    prereqs: ["ac-prompting"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "ac-deploy",
    title: "Deploying & hosting",
    discipline: "agentic-coding",
    track: "both",
    level: "advanced",
    blurb: "Get your tool onto the internet — and know where things run.",
    guide: [
      "A tool is not useful until others can reach it. The most important thing to understand is that different tools run in different places: a static web page can live on any free host (Vercel, Netlify, GitHub Pages); an AI-backed tool needs a host that also runs server functions; a tool with accounts and saved data needs a backend (like Supabase); a tool that drives Rhino runs on your own machine.",
      "For most web tools, the modern path is: push your code to GitHub, connect it to Vercel, and it auto-deploys on every change — which is exactly how this toolkit ships. Add a database, auth, and storage layer (Supabase) only when you actually need accounts or to save data.",
      "Have the agent walk you through it click-by-click, and learn the few real gotchas: environment variables for secrets (never commit keys), custom domains and DNS, and free-tier limits. Deployment is where 'a thing I made' becomes 'a thing my studio uses.'"
    ],
    prereqs: ["ac-webapp"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "ac-design-tools",
    title: "Tools that touch design software",
    discipline: "agentic-coding",
    track: "both",
    level: "advanced",
    blurb: "Automate Rhino, Grasshopper, and your workflow with code.",
    guide: [
      "The highest-leverage agentic coding for architects connects to the design software you already use. Rhino and Grasshopper run Python; you can have an agent write scripts that automate tedious modeling, generate geometry from rules, batch-process files, or pull data out of a model — turning a one-hour chore into a button.",
      "An MCP server (Model Context Protocol) can bridge an agent directly to an application like Rhino, so the agent can drive the software, see the result, and adjust — the pattern behind the toolkit's accessibility (RAP) work, which drives Rhino from the command line. This is where coding stops being 'making websites' and starts reshaping how you design.",
      "Start with a real annoyance in your own workflow — 'rename these 200 layers', 'export every view as a numbered image', 'lay out these panels for the laser' — and have the agent script it. Verify the output carefully (trust but verify), and you have built a custom tool nobody else has."
    ],
    prereqs: ["ac-data"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "ac-judgment",
    title: "Judgment, ethics & authorship",
    discipline: "agentic-coding",
    track: "both",
    level: "advanced",
    blurb: "Decide when to use AI, and use it responsibly.",
    guide: [
      "The hardest skill in agentic coding is not technical — it is judgement about when to offload thinking to a tool and when to build the skill the slow way. AI can give you the logics, language, and data behind a decision while leaving the decision to you; the danger is letting a fluent answer replace the analog repetition that actually builds expertise.",
      "Be deliberate about authorship and credit: you are the author and editor of what an agent builds, and AI-generated content should be acknowledged. Do not present work as more finished or more yours than it is, and keep the trace of how something was made — process is part of the work.",
      "And take data and equity seriously: know what a tool does with anything you upload, owe people honesty about where their data goes (especially student work, under FERPA), and notice the equity edge of who can afford which tools. Using these tools well is itself a design and ethical judgement, not just a technical one."
    ],
    prereqs: ["ac-harness"],
    conceptSlugs: [],
    videos: []
  },

  // ══ PROFESSIONAL PRACTICE (being useful in an internship) ═════════════════
  {
    id: "pp-portfolio",
    title: "The internship portfolio",
    discipline: "pro-practice",
    track: "both",
    level: "beginner",
    blurb: "Build a tight portfolio that gets you the interview.",
    guide: [
      "Your portfolio is the single most important thing for landing an internship — more than your résumé. A firm spends a couple of minutes on it, so it has to communicate fast: a tight selection of your best three to five projects, each shown with one strong hero image, a clear parti, and a few drawings that prove you can think and produce.",
      "Curate ruthlessly and lead with strength — quality over quantity, your best work first and last. Show range (a hand drawing, a diagram, a model, a render) and basic software fluency, because firms want to know what you can produce on day one. Keep it consistent: one grid, one or two typefaces, a calm palette.",
      "Make versions: a polished PDF (and/or a web portfolio), plus a one-page sample to attach to applications. Have it critiqued, proofread it (typos read as carelessness), and tailor the selection slightly to each firm's work. Build it as a maintainable system so updating it each year is easy, not a rebuild."
    ],
    prereqs: [],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "pp-readiness",
    title: "Office software readiness",
    discipline: "pro-practice",
    track: "both",
    level: "beginner",
    blurb: "Know what firms actually expect you to operate.",
    guide: [
      "Internships expect you to be useful with the office's tools quickly. In most architecture offices that means real fluency in a BIM/CAD platform (commonly Revit, sometimes ArchiCAD or AutoCAD), Rhino and Grasshopper for design and complex geometry, and the Adobe suite for graphics and presentation. Knowing which a firm uses — check their work, or ask — tells you what to brush up.",
      "You do not need to be an expert in everything — you need to be competent and fast to learn. Being solid in one BIM tool, one modeler, and the Adobe basics covers most internships; the trail lanes here map directly onto that. Honesty helps: claim what you can actually do.",
      "Round it out with the unglamorous essentials firms assume: organized file management and naming, comfort with PDFs and plotting, basic spreadsheet skills, and email. These 'boring' skills are exactly what make an intern low-friction to work with."
    ],
    prereqs: [],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "pp-communication",
    title: "Studio-to-office communication",
    discipline: "pro-practice",
    track: "both",
    level: "beginner",
    blurb: "Work the way an office expects, not the way studio does.",
    guide: [
      "Studio and office communicate differently, and adjusting fast makes you valuable. Offices run on clear, concise, written communication: professional email, short status updates, and — crucially — asking good questions. When given a task, confirm you understand the goal and the deadline before disappearing for a day.",
      "Learn to take direction and feedback without defensiveness: markups and redlines are normal and not personal. Take notes in meetings, write down instructions, and follow up in writing so nothing is lost. 'I will have a first version by end of day for you to check' is music to a manager.",
      "Know when to ask versus when to try: spend a reasonable amount of effort, then ask rather than burning a day stuck or guessing. Show your work-in-progress early for a quick gut-check instead of polishing the wrong thing. Reliability and clarity matter more than brilliance in your first job."
    ],
    prereqs: [],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "pp-drawing-sets",
    title: "Reading a drawing set",
    discipline: "pro-practice",
    track: "both",
    level: "intermediate",
    blurb: "Understand the documents a project is actually built from.",
    guide: [
      "Offices produce coordinated drawing sets, and as an intern you will read and contribute to them. Learn how a set is organized: sheet numbering, the title block, the relationship between plans, sections, elevations, details, and schedules, and how a detail callout on one sheet points to a detail on another. You do not need to master construction documentation — you need to navigate it.",
      "Understand scale and detail hierarchy — the same wall appears at 1:100 on a plan and 1:5 in a detail — and how notes, dimensions, and references coordinate across sheets. Knowing how the set fits together lets you find information and place your piece correctly.",
      "Your studio skills transfer: clean drawings, clear line weights, and coordination are exactly what a set needs, just at a larger and more rigorous scale. Approach it as learning the conventions of a new, very organized kind of drawing, and ask which standards the office follows."
    ],
    prereqs: ["pp-readiness"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "pp-teamwork",
    title: "Teamwork & file standards",
    discipline: "pro-practice",
    track: "both",
    level: "intermediate",
    blurb: "Work cleanly inside a shared, multi-person project.",
    guide: [
      "In an office you are one of many people in the same files, so standards stop being optional. Follow the office's conventions for file naming, folder structure, layer and line standards, and (in Revit) worksets and shared models. The goal is that anyone can open your file and understand it — your tidy-studio-file habits, scaled up to a team.",
      "Coordinate before you work: know who owns what, do not overwrite someone's work, and communicate changes. In BIM, learn to borrow and sync rather than clash; in CAD, respect the layer and xref structure. A small mistake in a shared model can cost the whole team time.",
      "Treat the project file as shared infrastructure: leave it cleaner than you found it, document non-obvious decisions, and ask before doing something irreversible. Being the intern who is careful and communicative in shared files is how you earn bigger responsibilities."
    ],
    prereqs: ["pp-readiness"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "pp-redlines",
    title: "Redlines, markups & revisions",
    discipline: "pro-practice",
    track: "both",
    level: "intermediate",
    blurb: "Take markup and issue revisions the way an office does.",
    guide: [
      "A redline is a marked-up drawing telling you what to change — the everyday currency of office work. Your job is to read the markup accurately, make exactly those changes (not more, not less, unless you flag a question), and turn it around cleanly. Doing redlines well and quickly is how interns become trusted.",
      "Track what you did: check off each markup as you address it, and keep the marked-up version. When something on the redline is unclear or seems wrong, ask rather than guess — a two-minute question beats a day of rework. Revisions get logged and dated, because a set evolves and people need to know what changed.",
      "Treat it as a tight version of the studio iterate-and-verify loop: make the change, check it against the markup, and have it reviewed. Accuracy and speed on redlines, plus catching the occasional real error in them, makes you the person work gets handed to."
    ],
    prereqs: ["pp-drawing-sets"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "pp-consultants",
    title: "The project team & consultants",
    discipline: "pro-practice",
    track: "both",
    level: "advanced",
    blurb: "Know who does what on a real building.",
    guide: [
      "A building is designed by a team, not just architects. Structural engineers make it stand up, MEP engineers handle mechanical, electrical, and plumbing, civil engineers handle site and drainage, landscape architects the grounds, and others (lighting, façade, acoustics, code) as needed. Knowing who does what — and that you coordinate with them — is core professional literacy.",
      "The architect typically leads and coordinates this team, which means your drawings have to align with everyone else's. As an intern you will see coordination in action: clashes between structure and ducts, a façade detail that needs the engineer's input. Understanding the cast of characters helps you know whose information you need and when.",
      "You do not need to do the engineers' jobs, but you should grasp enough to talk to them and design buildable schemes — roughly how structure spans, where services run, how a wall is built. Designing with awareness of the whole team makes your work realistic and your coordination useful."
    ],
    prereqs: ["pp-drawing-sets"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "pp-deliverables",
    title: "Deliverables, deadlines & QA",
    discipline: "pro-practice",
    track: "both",
    level: "advanced",
    blurb: "Own a task end-to-end and deliver it clean and on time.",
    guide: [
      "Offices run on deliverables and deadlines — a set of drawings for a deadline, a presentation for a client, a study by Friday. The skill is managing a task from brief to finished product: understand exactly what is wanted, estimate the time, work back from the deadline, and flag early if it is slipping rather than at the last minute.",
      "Quality-assure your own work before handing it over: check it against the brief, proof the drawings, make sure it is coordinated and the file is clean. The intern whose work does not need redoing is worth far more than the fast one whose work does. Build in time to check, not just to produce.",
      "Communicate status proactively — a quick 'on track, first draft by 3pm' or an early 'this will take longer because X' — and deliver in the expected format. Owning a deliverable reliably, start to finish, is exactly the trait that turns an internship into a job offer."
    ],
    prereqs: ["pp-teamwork"],
    conceptSlugs: [],
    videos: []
  },
  {
    id: "pp-career",
    title: "Licensure & career path",
    discipline: "pro-practice",
    track: "both",
    level: "advanced",
    blurb: "Understand the road from intern to licensed architect.",
    guide: [
      "It helps to see where an internship leads. In the US, becoming a licensed architect generally means an accredited degree, a period of documented experience (the AXP — logging hours across areas of practice), and passing the licensing exams (the ARE) — a multi-year path that internships are the first step of. Other countries have parallel routes worth knowing if you will work abroad.",
      "Early jobs are about building breadth: get exposure to different project types, phases (concept through construction), and roles, and find mentors who will invest in you. Keep learning software and skills, keep your portfolio current, and track your experience as you go, since it counts toward licensure.",
      "Architecture is also a wide field — not everyone follows the same path, and skills transfer to adjacent careers (computational design, visualization, urbanism, real estate, tech, fabrication). Be intentional: notice what you are drawn to, seek that work, and treat each role as building toward the practice you actually want."
    ],
    prereqs: [],
    conceptSlugs: [],
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

/** Metadata (label, blurb) for a section. */
export function sectionMeta(id: Section): SectionMeta | undefined {
  return SECTIONS.find((s) => s.id === id);
}

/** Sections that have at least one node, in board order. */
export function sectionsWithNodes(): Section[] {
  return SECTIONS.map((s) => s.id).filter((id) =>
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
