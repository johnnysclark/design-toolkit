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
