// Curated concept knowledge base for the Skills Coach.
//
// This is the single source of truth for BOTH the inline documentation links in
// the chat and the contextual side panel. The model never writes a URL — it
// emits a concept SLUG (e.g. [[concept:gh-data-tree]] inline, and one active
// `concept` in the META tail); the client resolves the slug to a vetted title,
// explanation, and official doc URL here. A slug the model invents that isn't in
// this map renders as plain text and falls back to the provider's official
// search page — so a hallucinated deep link is structurally impossible.
//
// "Content in files, data in the DB" — this glossary is content, so it lives in
// the repo. Grow it from the slugs students actually hit (log unknown slugs).

export type Discipline =
  | "rhino"
  | "grasshopper"
  | "autocad"
  | "revit"
  | "adobe"
  | "general";

export const DISCIPLINES: { id: Discipline; label: string; blurb: string }[] = [
  { id: "rhino", label: "Rhino", blurb: "NURBS modeling, commands, drawings" },
  { id: "grasshopper", label: "Grasshopper", blurb: "Visual scripting, data trees" },
  { id: "autocad", label: "AutoCAD", blurb: "2D drafting, layouts, plotting" },
  { id: "revit", label: "Revit", blurb: "BIM, families, schedules" },
  { id: "adobe", label: "Adobe", blurb: "Photoshop · Illustrator · InDesign" },
  { id: "general", label: "General", blurb: "2D/3D concepts, not tool-specific" }
];

export type ConceptSource = "official" | "community";

export interface Concept {
  slug: string;
  discipline: Discipline;
  title: string;
  aliases: string[];
  oneLiner: string;
  /** 2–4 sentences. Shown verbatim in the concept panel; keep it accurate. */
  explanation: string;
  docUrl: string;
  source: ConceptSource;
  /** Optional note about version-specific behavior (e.g. "Rhino 7+"). */
  versionNote?: string;
}

// Provider versions live in one place — bump these on a yearly review pass
// rather than editing every row.
const RHINO_USERS_GUIDE = "https://docs.mcneel.com/rhino/8/usersguide/en-us/index.htm";
const RHINO_COMMAND_LIST =
  "https://docs.mcneel.com/rhino/8/help/en-us/commandlist/command_list.htm";
const GH_GUIDES = "https://developer.rhino3d.com/guides/grasshopper/";
const GH_DOCS = "https://grasshopperdocs.com/"; // community-maintained
const ACAD_HELP = "https://help.autodesk.com/view/ACD/2026/ENU/";
const RVT_HELP = "https://help.autodesk.com/view/RVT/2026/ENU/";
const ADOBE_SEARCH = "https://helpx.adobe.com/search.html";

const acad = (term: string) => `${ACAD_HELP}?query=${encodeURIComponent(term)}`;
const rvt = (term: string) => `${RVT_HELP}?query=${encodeURIComponent(term)}`;
const adobe = (term: string) => `${ADOBE_SEARCH}?q=${encodeURIComponent(term)}`;

// Official fallback landing pages, used when the model references a concept that
// isn't in the KB (so we still link somewhere official, never a guessed URL).
export const PROVIDER_SEARCH_ROOTS: Record<Discipline, (term: string) => string> = {
  rhino: () => RHINO_USERS_GUIDE,
  grasshopper: () => GH_GUIDES,
  autocad: (term) => acad(term),
  revit: (term) => rvt(term),
  adobe: (term) => adobe(term),
  general: () => RHINO_USERS_GUIDE
};

const ROWS: Concept[] = [
  // ---- Rhino -------------------------------------------------------------
  {
    slug: "rh-nurbs",
    discipline: "rhino",
    title: "NURBS",
    aliases: ["nurbs surface", "nurbs curve", "freeform"],
    oneLiner: "The smooth, math-defined curves and surfaces Rhino is built on.",
    explanation:
      "NURBS (Non-Uniform Rational B-Splines) describe smooth geometry from a set of control points, weights, a degree, and a knot vector. Almost everything you draw in Rhino is a NURBS curve or surface, which is why edits behave like reshaping a smooth sheet rather than moving polygons. Understanding control points and degree is the key to predictable curves.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },
  {
    slug: "rh-control-point",
    discipline: "rhino",
    title: "Control points",
    aliases: ["control point", "points on", "edit points", "cv"],
    oneLiner: "The handles that pull a NURBS curve or surface into shape.",
    explanation:
      "Control points are the cage of points that influence a curve or surface — moving one tugs the geometry toward it without the curve necessarily passing through it. Turn them on with PointsOn (F10) and off with PointsOff (F11). Fewer, well-placed control points give cleaner, more editable shapes than many crowded ones.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },
  {
    slug: "rh-degree",
    discipline: "rhino",
    title: "Degree & continuity",
    aliases: ["degree", "continuity", "g0", "g1", "g2", "curvature"],
    oneLiner: "How smooth a curve is, and how smoothly two pieces meet.",
    explanation:
      "Curve degree controls flexibility: degree 1 is straight segments, degree 3 is the typical smooth curve. Continuity describes how two curves or surfaces join — G0 touches, G1 is tangent, G2 matches curvature. Matching continuity (e.g. with Match or BlendSrf) is what makes reflections flow across a seam instead of kinking.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },
  {
    slug: "rh-tolerance",
    discipline: "rhino",
    title: "Tolerance",
    aliases: ["absolute tolerance", "model tolerance", "units tolerance"],
    oneLiner: "How close 'close enough' is — and why booleans fail without it.",
    explanation:
      "Absolute tolerance (set in DocumentProperties → Units) is how near two things must be for Rhino to treat them as meeting. Operations like Join, BooleanUnion, and intersections rely on it: if your tolerance is far looser or tighter than your model's scale, edges won't join and booleans fail. Set tolerance to suit your units before modeling, not after.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },
  {
    slug: "rh-layers",
    discipline: "rhino",
    title: "Layers",
    aliases: ["layer", "layer panel"],
    oneLiner: "Organize objects by color, visibility, and lock state.",
    explanation:
      "Layers group objects so you can show, hide, lock, and color them together — the backbone of a tidy Rhino file and clean Make2D output. Each layer carries a default color and print width that drawings inherit. Sublayers let you nest structure (e.g. Walls → Interior).",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },
  {
    slug: "rh-boolean",
    discipline: "rhino",
    title: "Boolean operations",
    aliases: ["booleanunion", "booleandifference", "boolean", "solid union"],
    oneLiner: "Add, subtract, or intersect closed solids.",
    explanation:
      "BooleanUnion, BooleanDifference, and BooleanIntersection combine closed (watertight) solids. They fail most often because a solid isn't actually closed, surfaces are coincident, or the model tolerance doesn't match the geometry's scale. When a boolean fails, check for naked edges and tolerance before retrying.",
    docUrl: RHINO_COMMAND_LIST,
    source: "official"
  },
  {
    slug: "rh-make2d",
    discipline: "rhino",
    title: "Make2D",
    aliases: ["make 2d", "2d drawing", "line drawing"],
    oneLiner: "Project 3D geometry into clean 2D linework for drawings.",
    explanation:
      "Make2D flattens your 3D model to 2D curves from the current view or a named view, separating visible and hidden lines onto layers. It's how you turn a model into plans, sections, and elevations for layout. Results are cleanest when the source geometry is on well-organized layers and the view is set first.",
    docUrl: RHINO_COMMAND_LIST,
    source: "official"
  },
  {
    slug: "rh-named-view",
    discipline: "rhino",
    title: "Named views",
    aliases: ["named view", "save view", "camera"],
    oneLiner: "Save and restore camera positions.",
    explanation:
      "A named view stores a camera position and projection so you can return to the exact same shot — useful for consistent renders, repeatable Make2D output, and presentation angles. Save with the NamedView panel and restore by double-clicking.",
    docUrl: RHINO_COMMAND_LIST,
    source: "official"
  },
  {
    slug: "rh-cplane",
    discipline: "rhino",
    title: "Construction plane (CPlane)",
    aliases: ["cplane", "construction plane", "working plane"],
    oneLiner: "The active plane your drawing and snapping happen on.",
    explanation:
      "The CPlane is the local ground plane Rhino draws onto — new points land on it unless you snap elsewhere. Setting a CPlane to a surface or object face (CPlane command) lets you draw 'flat' on an angled or vertical surface, which is essential for modeling onto sloped roofs or facades.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },
  {
    slug: "rh-gumball",
    discipline: "rhino",
    title: "Gumball",
    aliases: ["gumball", "transform widget", "move handle"],
    oneLiner: "The on-screen move / rotate / scale widget.",
    explanation:
      "The Gumball is the colored arrows, arcs, and squares on a selected object: drag an arrow to move, an arc to rotate, a square to scale. Typing a number while dragging sets an exact distance or angle, and holding it lets you extrude surfaces. It's the fastest way to make precise transforms without separate commands.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },
  {
    slug: "rh-subd",
    discipline: "rhino",
    title: "SubD",
    aliases: ["subd", "subdivision surface", "organic modeling"],
    oneLiner: "Subdivision surfaces for smooth, organic forms.",
    explanation:
      "SubD is a separate geometry type for smooth, freeform shapes that stay easy to push and pull — ideal for furniture, terrain, and sculpted massing. You edit a low-poly cage and Rhino smooths it; convert to NURBS (ToNURBS) when you need precise documentation. SubD arrived in Rhino 7.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official",
    versionNote: "SubD is Rhino 7 and later."
  },
  {
    slug: "rh-block",
    discipline: "rhino",
    title: "Blocks",
    aliases: ["block", "block instance", "block definition"],
    oneLiner: "Reusable instances of a piece of geometry.",
    explanation:
      "A block is a named definition you can place many times as lightweight instances; edit the definition once and every instance updates. Use blocks for repeated components (windows, furniture, trees) to keep files small and edits consistent. Linked blocks can even reference an external file.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },

  // ---- Grasshopper -------------------------------------------------------
  {
    slug: "gh-data-tree",
    discipline: "grasshopper",
    title: "Data tree",
    aliases: ["data trees", "tree", "branches", "paths", "tree structure"],
    oneLiner: "Grasshopper's nested data structure, addressed by branch paths.",
    explanation:
      "A data tree stores data in branches addressed by paths like {0;1} instead of a single flat list. Components match data across inputs branch-by-branch, so most 'why did I get the wrong number of results' bugs are really tree-shape mismatches. Graft, Flatten, and Path Mapper are the tools you use to reshape trees so things pair up the way you intend.",
    docUrl: "https://developer.rhino3d.com/guides/grasshopper/grasshopper-data-types/",
    source: "official",
    versionNote: "Concept is stable across Rhino 7–8."
  },
  {
    slug: "gh-list-item",
    discipline: "grasshopper",
    title: "List Item",
    aliases: ["list item", "item index", "pick from list"],
    oneLiner: "Pull one (or several) items out of a list by index.",
    explanation:
      "List Item returns the element at a given index (0-based) from a list. Feed it a list of indices to extract several at once. It's the everyday way to grab 'the first curve' or 'the top face' once you know its position.",
    docUrl: GH_DOCS,
    source: "community"
  },
  {
    slug: "gh-graft",
    discipline: "grasshopper",
    title: "Graft",
    aliases: ["graft", "graft tree", "one per branch"],
    oneLiner: "Push each item into its own branch (adds a path level).",
    explanation:
      "Graft wraps every item in its own branch, turning a flat list into a deeper tree. You graft when you want operations to happen 'one per item' against another grafted list — for example matching a list of counts to a list of curves so each curve gets its own count. Watch the param panel: after grafting you should see one item per branch.",
    docUrl: GH_DOCS,
    source: "community"
  },
  {
    slug: "gh-flatten",
    discipline: "grasshopper",
    title: "Flatten",
    aliases: ["flatten", "flatten tree", "single list"],
    oneLiner: "Collapse all branches into one flat list.",
    explanation:
      "Flatten throws away tree structure and merges everything into a single list on one branch. It's the quick fix when a component is mysteriously producing too many or too few results because of leftover branches — but flattening too early also destroys grouping you may need later, so use it deliberately.",
    docUrl: GH_DOCS,
    source: "community"
  },
  {
    slug: "gh-dispatch",
    discipline: "grasshopper",
    title: "Dispatch",
    aliases: ["dispatch", "split list", "true false split"],
    oneLiner: "Split one list into two by a true/false pattern.",
    explanation:
      "Dispatch sends list items to output A or B according to a boolean pattern, repeating the pattern as needed. Use it to separate items — odd vs. even, inside vs. outside, pass vs. fail — before treating each group differently. Pair it with Cull Pattern when you only need to keep one side.",
    docUrl: GH_DOCS,
    source: "community"
  },
  {
    slug: "gh-path-mapper",
    discipline: "grasshopper",
    title: "Path Mapper",
    aliases: ["path mapper", "remap paths", "tree surgery"],
    oneLiner: "Rewrite tree paths explicitly with a from/to rule.",
    explanation:
      "Path Mapper rewrites branch paths using a lexical rule (e.g. {A;B} → {A}), giving you precise control over tree shape when Graft and Flatten aren't enough. It's powerful but brittle — a rule that assumes a certain depth breaks when the input shape changes — so reach for it only when simpler reshaping fails.",
    docUrl: GH_DOCS,
    source: "community"
  },
  {
    slug: "gh-mass-addition",
    discipline: "grasshopper",
    title: "Mass Addition",
    aliases: ["mass addition", "sum", "running total", "partial results"],
    oneLiner: "Add up a list — total and running subtotals.",
    explanation:
      "Mass Addition sums a list of numbers; its Result output is the total and Partial Results gives the running cumulative sum. Use the total for things like overall length or area, and the partial results to place items end-to-end at accumulating distances.",
    docUrl: GH_DOCS,
    source: "community"
  },
  {
    slug: "gh-series-range",
    discipline: "grasshopper",
    title: "Series & Range",
    aliases: ["series", "range", "number sequence", "divide domain"],
    oneLiner: "Generate evenly spaced numbers two different ways.",
    explanation:
      "Series builds a sequence from a start, a step size, and a count — you control the spacing. Range divides a domain into a number of equal steps — you control the endpoints and how many. Choosing the right one (step-driven vs. count-driven) avoids off-by-one and spacing surprises.",
    docUrl: GH_DOCS,
    source: "community"
  },
  {
    slug: "gh-cull",
    discipline: "grasshopper",
    title: "Cull Pattern",
    aliases: ["cull", "cull pattern", "remove items", "filter"],
    oneLiner: "Keep or drop list items by a repeating true/false pattern.",
    explanation:
      "Cull Pattern removes items where the boolean pattern is false, repeating the pattern across the list — handy for 'every other one' or masking results from a test. Cull Index removes specific positions instead. It's the keep-one-side counterpart to Dispatch.",
    docUrl: GH_DOCS,
    source: "community"
  },
  {
    slug: "gh-cluster",
    discipline: "grasshopper",
    title: "Cluster",
    aliases: ["cluster", "group components", "reusable definition"],
    oneLiner: "Bundle components into a reusable, tidy container.",
    explanation:
      "A cluster packages a group of components behind named inputs and outputs, like a function. It declutters a definition and lets you reuse the same logic in several places — edit inside the cluster once and every copy updates. Use it once a working sub-graph is stable.",
    docUrl: GH_GUIDES,
    source: "official"
  },
  {
    slug: "gh-number-slider",
    discipline: "grasshopper",
    title: "Number Slider",
    aliases: ["number slider", "slider", "parameter input"],
    oneLiner: "An interactive numeric input you drag to change the model.",
    explanation:
      "A Number Slider feeds a value you can drag live, with an editable range and rounding (integer, even, etc.). It's the main handle for making a definition parametric. Double-click it to set min/max and precision — a slider whose range is wrong is a common cause of 'nothing happens when I drag.'",
    docUrl: GH_GUIDES,
    source: "official"
  },
  {
    slug: "gh-data-matching",
    discipline: "grasshopper",
    title: "Data matching",
    aliases: ["data matching", "longest list", "shortest list", "cross reference"],
    oneLiner: "How a component pairs up lists of different lengths.",
    explanation:
      "When inputs have different counts, Grasshopper pairs them by its matching rule: by default it reuses the last item of the shorter list (longest-list behavior). Shortest List trims to the smaller count; Cross Reference pairs every item with every other. Mismatched counts producing 'too many' or 'repeated' results are almost always a data-matching question.",
    docUrl: GH_GUIDES,
    source: "official"
  },

  // ---- AutoCAD -----------------------------------------------------------
  {
    slug: "acad-layers",
    discipline: "autocad",
    title: "Layers",
    aliases: ["layer", "layer properties", "layer manager"],
    oneLiner: "Group objects to control color, linetype, and lineweight.",
    explanation:
      "Layers organize a drawing so color, linetype, lineweight, and on/off/freeze/lock state apply to whole groups at once. In AutoCAD they also drive plotting — line color usually maps to print weight via a plot style. A disciplined layer scheme is the difference between a drawing that plots cleanly and one that doesn't.",
    docUrl: acad("Layers"),
    source: "official"
  },
  {
    slug: "acad-blocks",
    discipline: "autocad",
    title: "Blocks",
    aliases: ["block", "block reference", "attributes", "insert"],
    oneLiner: "Reusable named symbols you insert many times.",
    explanation:
      "A block is a named collection of objects you insert as a single reference; redefine the block and every insertion updates. Attributes attach editable text (door numbers, tags) to each insertion. Blocks keep symbol libraries consistent and files small.",
    docUrl: acad("Blocks"),
    source: "official"
  },
  {
    slug: "acad-model-paper-space",
    discipline: "autocad",
    title: "Model space vs. paper space",
    aliases: ["model space", "paper space", "layout tab"],
    oneLiner: "Draw at full scale in model; compose the sheet in paper.",
    explanation:
      "Model space is where you draw at real-world scale (1:1). Paper space (a Layout tab) is the sheet you plot, where viewports show scaled windows into model space and you add the title block, notes, and dimensions. Keeping geometry in model and presentation in paper is the core AutoCAD workflow.",
    docUrl: acad("Model space and paper space"),
    source: "official"
  },
  {
    slug: "acad-viewport",
    discipline: "autocad",
    title: "Layout viewport",
    aliases: ["viewport", "layout viewport", "scale viewport"],
    oneLiner: "A scaled window from a layout into model space.",
    explanation:
      "A layout viewport is a frame on a paper-space sheet that shows model-space geometry at a set scale (e.g. 1:100). You set the scale, then lock the viewport so panning doesn't change it. Per-viewport layer overrides let one sheet show different layers than another.",
    docUrl: acad("Layout viewports"),
    source: "official"
  },
  {
    slug: "acad-dimension-styles",
    discipline: "autocad",
    title: "Dimension styles",
    aliases: ["dimension style", "dimstyle", "annotation style"],
    oneLiner: "Saved settings that control how dimensions look.",
    explanation:
      "A dimension style stores arrowheads, text size, units, and tolerances so all dimensions read consistently. Because dimensions must look right on the plotted sheet, styles are usually annotative or tied to a plot scale. Set the style before dimensioning rather than fixing each one later.",
    docUrl: acad("Dimension styles"),
    source: "official"
  },
  {
    slug: "acad-xref",
    discipline: "autocad",
    title: "External references (Xrefs)",
    aliases: ["xref", "external reference", "attach drawing"],
    oneLiner: "Link another drawing into yours without merging it.",
    explanation:
      "An Xref attaches a separate DWG (a site plan, a structural grid) so it appears in your drawing but stays a live link — update the source and your drawing reflects it. Xrefs keep large projects coordinated across files and people. Detaching or pathing them wrong is a common cause of missing geometry.",
    docUrl: acad("External references xref"),
    source: "official"
  },
  {
    slug: "acad-polyline",
    discipline: "autocad",
    title: "Polyline",
    aliases: ["polyline", "pline", "lwpolyline"],
    oneLiner: "A single connected object of line and arc segments.",
    explanation:
      "A polyline is one object made of joined straight and curved segments, with an optional width. Unlike separate lines it can be offset, filleted, and have its area/length read as a whole — which is why boundaries, contours, and profiles are usually polylines. Join converts connected lines into one.",
    docUrl: acad("Polylines"),
    source: "official"
  },
  {
    slug: "acad-osnap",
    discipline: "autocad",
    title: "Object snaps (Osnap)",
    aliases: ["osnap", "object snap", "snap to endpoint", "running snap"],
    oneLiner: "Snap the cursor to exact points on existing geometry.",
    explanation:
      "Object snaps lock the cursor to precise points — endpoints, midpoints, centers, intersections — so geometry actually connects instead of nearly touching. Running osnaps stay on; a one-time override (Shift+right-click) grabs a single point. Accurate drawings depend on snapping rather than eyeballing.",
    docUrl: acad("Object snaps"),
    source: "official"
  },
  {
    slug: "acad-annotation-scale",
    discipline: "autocad",
    title: "Annotation scale",
    aliases: ["annotative", "annotation scale", "annotative text"],
    oneLiner: "Make text and dimensions size themselves to the plot scale.",
    explanation:
      "Annotative objects (text, dimensions, hatches) carry their own scale so they print at the right height no matter which viewport scale shows them. You set the annotation scale to match the viewport, and the object resizes automatically. It replaces the old habit of hand-calculating text heights per scale.",
    docUrl: acad("Annotative objects"),
    source: "official"
  },
  {
    slug: "acad-plot",
    discipline: "autocad",
    title: "Plot & page setup",
    aliases: ["plot", "page setup", "print", "plot style", "ctb"],
    oneLiner: "Turn a layout into a printed or PDF sheet.",
    explanation:
      "Plotting sends a layout to paper or PDF using a page setup: sheet size, plot area, scale, and a plot style table (CTB/STB) that maps screen colors to printed lineweights. Saving a named page setup makes consistent output one click. Most 'my lines are all the same weight' problems trace to the plot style.",
    docUrl: acad("Plot drawings"),
    source: "official"
  },
  {
    slug: "acad-ucs",
    discipline: "autocad",
    title: "User coordinate system (UCS)",
    aliases: ["ucs", "user coordinate system", "working plane"],
    oneLiner: "Reposition the drawing axes to draw on a custom plane.",
    explanation:
      "The UCS sets where the X/Y origin and axes are, so you can draw aligned to an angled wall or, in 3D, onto a vertical face. Move or rotate the UCS, draw, then return to World (WCS). It's AutoCAD's equivalent of Rhino's construction plane.",
    docUrl: acad("User coordinate system UCS"),
    source: "official"
  },
  {
    slug: "acad-hatch",
    discipline: "autocad",
    title: "Hatch",
    aliases: ["hatch", "fill", "pattern", "poché"],
    oneLiner: "Fill a closed area with a pattern or solid.",
    explanation:
      "Hatch fills a bounded region with a pattern (brick, concrete, solid) for poché and material indication. It needs a closed boundary, so 'no valid boundary' usually means a gap in the outline. Associative hatches update when the boundary changes.",
    docUrl: acad("Hatches and fills"),
    source: "official"
  },

  // ---- Revit -------------------------------------------------------------
  {
    slug: "rvt-family",
    discipline: "revit",
    title: "Family",
    aliases: ["family", "loadable family", "system family", "rfa"],
    oneLiner: "The parametric building block of every Revit element.",
    explanation:
      "A family defines a kind of element — a window, a door, a wall — along with the parameters that drive its geometry. Loadable families live in .rfa files you load into a project; system families (walls, floors) are built in. Almost everything you place in Revit is an instance of a family.",
    docUrl: rvt("Families"),
    source: "official"
  },
  {
    slug: "rvt-type-instance",
    discipline: "revit",
    title: "Type vs. instance",
    aliases: ["type parameter", "instance parameter", "type vs instance"],
    oneLiner: "Settings shared by all of a type vs. settings per placed element.",
    explanation:
      "Type parameters belong to a type and change every element of that type at once (e.g. a door's width). Instance parameters belong to a single placed element and change only it (e.g. its sill height or mark). Knowing which is which tells you whether an edit ripples across the model or stays local.",
    docUrl: rvt("Type and instance properties"),
    source: "official"
  },
  {
    slug: "rvt-category",
    discipline: "revit",
    title: "Category",
    aliases: ["category", "object category", "model category"],
    oneLiner: "The built-in class an element belongs to (Walls, Doors…).",
    explanation:
      "Every Revit element belongs to a category — Walls, Doors, Furniture, Rooms — and categories drive visibility, scheduling, tagging, and graphics. Visibility/Graphics overrides and view templates work category-by-category. You can't change an element's category, only its family and type within it.",
    docUrl: rvt("Categories"),
    source: "official"
  },
  {
    slug: "rvt-levels",
    discipline: "revit",
    title: "Levels",
    aliases: ["level", "levels", "datum", "storey"],
    oneLiner: "Horizontal datums that host elements and define storeys.",
    explanation:
      "Levels are horizontal reference planes (Level 1, Level 2) that host walls, floors, and components and define floor-to-floor heights. Most elements are constrained to a level, so moving a level moves what's attached. Levels created in a section also generate the plan views you work in.",
    docUrl: rvt("Levels"),
    source: "official"
  },
  {
    slug: "rvt-worksets",
    discipline: "revit",
    title: "Worksets",
    aliases: ["workset", "worksharing", "central model"],
    oneLiner: "How multiple people edit one Revit model at once.",
    explanation:
      "Worksets divide a worksharing-enabled model so several people can edit a central model from local copies without clashing. You borrow or own elements, then synchronize to publish changes. Worksets also let you load or hide big chunks (e.g. a linked structure) for performance.",
    docUrl: rvt("Worksets"),
    source: "official"
  },
  {
    slug: "rvt-schedules",
    discipline: "revit",
    title: "Schedules",
    aliases: ["schedule", "door schedule", "quantity takeoff"],
    oneLiner: "Live tables generated from the model's data.",
    explanation:
      "A schedule is a table that reads element parameters directly from the model — door schedules, room areas, material takeoffs — and updates automatically as the model changes. Because it's the same data, editing a value in a schedule can edit the element. Schedules are how Revit turns geometry into documentation and quantities.",
    docUrl: rvt("Schedules"),
    source: "official"
  },
  {
    slug: "rvt-view-templates",
    discipline: "revit",
    title: "View templates",
    aliases: ["view template", "graphics standards", "vg overrides"],
    oneLiner: "Saved graphic settings applied consistently across views.",
    explanation:
      "A view template bundles scale, detail level, and visibility/graphics settings so many views share one look and update together. Apply a template to a view and those properties become controlled (greyed out) by the template. They're the way to enforce drawing standards across a set.",
    docUrl: rvt("View templates"),
    source: "official"
  },
  {
    slug: "rvt-phases",
    discipline: "revit",
    title: "Phases",
    aliases: ["phase", "phasing", "existing demolished new"],
    oneLiner: "Model existing, demolished, and new construction over time.",
    explanation:
      "Phasing tags elements as existing, demolished, or new, and each view shows a phase with a phase filter controlling how each appears (e.g. existing in grey, demo dashed). It lets one model produce existing, demolition, and proposed drawings. Renovation and adaptive-reuse projects live or die by correct phase settings.",
    docUrl: rvt("Phases"),
    source: "official"
  },
  {
    slug: "rvt-constraints",
    discipline: "revit",
    title: "Constraints",
    aliases: ["constraint", "lock", "pin", "alignment"],
    oneLiner: "Locks and dimensions that fix relationships between elements.",
    explanation:
      "Constraints (locked dimensions, alignments, pins) hold relationships so that when one element moves, related ones follow or stay put. They make intent explicit — a window centered in a wall stays centered as the wall changes. Over-constraining causes the classic 'can't move, constraints not satisfied' error.",
    docUrl: rvt("Constraints"),
    source: "official"
  },
  {
    slug: "rvt-shared-parameters",
    discipline: "revit",
    title: "Shared parameters",
    aliases: ["shared parameter", "project parameter", "custom parameter"],
    oneLiner: "Custom parameters that can schedule and tag across families.",
    explanation:
      "Shared parameters are custom fields defined in an external file so they can appear in schedules, tags, and multiple families consistently — essential for project data that isn't built in. Unlike family parameters, they can be tagged and exported. They're the backbone of structured BIM data.",
    docUrl: rvt("Shared parameters"),
    source: "official"
  },
  {
    slug: "rvt-sheets",
    discipline: "revit",
    title: "Sheets & title blocks",
    aliases: ["sheet", "title block", "drawing sheet"],
    oneLiner: "The plotted pages that hold your views.",
    explanation:
      "A sheet is a plotted page with a title block; you drag views onto it and they keep their scale. Sheet number and name drive the drawing set and are read by schedules and the project browser. Placing a view on a sheet is what makes it part of the issued documents.",
    docUrl: rvt("Sheets"),
    source: "official"
  },

  // ---- Adobe (Photoshop / Illustrator / InDesign) ------------------------
  {
    slug: "ps-layer-mask",
    discipline: "adobe",
    title: "Layer mask",
    aliases: ["layer mask", "mask", "non-destructive hide"],
    oneLiner: "Hide parts of a layer without deleting pixels.",
    explanation:
      "A layer mask is a grayscale channel attached to a layer: white reveals, black hides, grey is partial. Because you paint the mask instead of erasing, the original pixels stay intact and editable — the foundation of non-destructive editing in Photoshop. Use soft brushes on a mask for seamless blends.",
    docUrl: adobe("layer mask"),
    source: "official"
  },
  {
    slug: "ps-clipping-mask",
    discipline: "adobe",
    title: "Clipping mask",
    aliases: ["clipping mask", "clip to layer", "clip"],
    oneLiner: "Use one layer's shape to bound the layer above it.",
    explanation:
      "A clipping mask makes the upper layer show only where the layer directly below has pixels — like pouring an image into a shape or text. It's reversible and keeps both layers editable. Different from a layer mask, which uses a painted grayscale channel rather than another layer's shape.",
    docUrl: adobe("clipping mask"),
    source: "official"
  },
  {
    slug: "ps-smart-object",
    discipline: "adobe",
    title: "Smart object",
    aliases: ["smart object", "non-destructive", "linked smart object"],
    oneLiner: "A container that preserves the source for non-destructive edits.",
    explanation:
      "A smart object wraps content (a photo, vector art, even a raw file) so transforms, filters, and scaling are non-destructive — scale it down and back up without losing quality. Filters applied to it become re-editable smart filters. Use it whenever you'll resize or re-edit a placed element.",
    docUrl: adobe("smart objects"),
    source: "official"
  },
  {
    slug: "ps-adjustment-layer",
    discipline: "adobe",
    title: "Adjustment layer",
    aliases: ["adjustment layer", "curves layer", "levels layer", "non-destructive color"],
    oneLiner: "Apply color/tone changes on a separate, editable layer.",
    explanation:
      "An adjustment layer (Curves, Levels, Hue/Saturation) changes the look of layers below it without touching their pixels, and comes with its own mask to limit where it applies. Because it's a layer, you can re-edit, reduce opacity, or delete it at any time. It's the non-destructive way to color-correct.",
    docUrl: adobe("adjustment layers"),
    source: "official"
  },
  {
    slug: "ps-vector-raster",
    discipline: "adobe",
    title: "Vector vs. raster",
    aliases: ["vector", "raster", "bitmap", "pixels vs paths"],
    oneLiner: "Resolution-independent paths vs. fixed pixel grids.",
    explanation:
      "Raster images (Photoshop) are grids of pixels — great for photos but they blur or pixelate when enlarged past their resolution. Vector art (Illustrator) is math-defined paths that scale to any size crisply, ideal for logos, diagrams, and type. Choosing the right one per element keeps a portfolio sharp at every size.",
    docUrl: adobe("vector and raster graphics"),
    source: "official"
  },
  {
    slug: "ps-cmyk-rgb",
    discipline: "adobe",
    title: "CMYK vs. RGB",
    aliases: ["cmyk", "rgb", "color mode", "print color"],
    oneLiner: "Print ink color vs. screen light color.",
    explanation:
      "RGB mixes red/green/blue light for screens and has a wider, brighter gamut; CMYK mixes cyan/magenta/yellow/black inks for print and can't reproduce some bright RGB colors. Set the document to the mode of its final output and soft-proof, or vivid on-screen colors will print dull. Architecture boards bound for a printer are usually CMYK.",
    docUrl: adobe("color modes CMYK RGB"),
    source: "official"
  },
  {
    slug: "ps-resolution",
    discipline: "adobe",
    title: "Resolution / DPI",
    aliases: ["resolution", "dpi", "ppi", "image size"],
    oneLiner: "How many pixels per inch — and whether prints look sharp.",
    explanation:
      "Resolution (PPI/DPI) is pixel density: roughly 300 ppi at final print size looks crisp, while a low-res image enlarged on a board looks soft or blocky. The key number is pixels at the printed size, not the file's nominal DPI. Plan image sizes from the board scale backward so photos hold up.",
    docUrl: adobe("image size and resolution"),
    source: "official"
  },
  {
    slug: "ps-blend-modes",
    discipline: "adobe",
    title: "Blend modes",
    aliases: ["blend mode", "multiply", "screen", "overlay"],
    oneLiner: "Rules for how a layer's pixels mix with those below.",
    explanation:
      "Blend modes change how a layer combines with the layers under it: Multiply darkens (great for shadows and ink-on-paper looks), Screen lightens, Overlay boosts contrast. They're non-destructive and pair well with masks. Reach for Multiply to drop a white-background diagram onto a colored sheet.",
    docUrl: adobe("blending modes"),
    source: "official"
  },
  {
    slug: "ai-artboard",
    discipline: "adobe",
    title: "Artboard",
    aliases: ["artboard", "canvas", "page", "multiple artboards"],
    oneLiner: "A defined canvas area you design on and export.",
    explanation:
      "Artboards are the bounded canvases in Illustrator (and the equivalent of pages); a document can hold several at different sizes for boards, sheets, or icon sets. You export per-artboard, so setting them to your real output sizes makes export clean. Think of them as the trimmed extent of each design.",
    docUrl: adobe("artboards illustrator"),
    source: "official"
  },
  {
    slug: "ai-pen-tool",
    discipline: "adobe",
    title: "Pen tool & anchor points",
    aliases: ["pen tool", "anchor point", "bezier", "paths"],
    oneLiner: "Draw precise vector paths with anchor points and handles.",
    explanation:
      "The Pen tool places anchor points connected by paths; dragging creates Bézier handles that curve the segment. Mastering it is how you draw exact, scalable outlines — site boundaries, custom diagrams, logos. Click for corners, click-drag for curves, and keep anchor points few for clean curves.",
    docUrl: adobe("pen tool illustrator"),
    source: "official"
  },
  {
    slug: "ai-pathfinder",
    discipline: "adobe",
    title: "Pathfinder",
    aliases: ["pathfinder", "unite", "minus front", "shape operations"],
    oneLiner: "Boolean-style operations to combine vector shapes.",
    explanation:
      "Pathfinder combines overlapping vector shapes — Unite merges, Minus Front subtracts, Intersect keeps the overlap — much like solid booleans in 3D. It's the fast way to build complex icons and figure-ground diagrams from simple shapes. Use Shape Modes for editable, non-destructive results.",
    docUrl: adobe("pathfinder illustrator"),
    source: "official"
  },
  {
    slug: "id-master-pages",
    discipline: "adobe",
    title: "Parent (master) pages",
    aliases: ["master page", "parent page", "template page", "running header"],
    oneLiner: "Reusable page templates that repeat across a document.",
    explanation:
      "A parent page (formerly 'master') holds elements that should appear on many pages — margins, page numbers, running headers, grids. Apply it to document pages and they inherit those elements automatically, updating everywhere when you edit the parent. It's how a multi-page portfolio or report stays consistent.",
    docUrl: adobe("parent pages indesign"),
    source: "official"
  },
  {
    slug: "id-paragraph-styles",
    discipline: "adobe",
    title: "Paragraph & character styles",
    aliases: ["paragraph style", "character style", "text styles"],
    oneLiner: "Saved text formatting you apply and update in one place.",
    explanation:
      "Paragraph styles store formatting for whole paragraphs (font, size, spacing, indents); character styles handle runs within a paragraph. Applying styles instead of manual formatting means you restyle an entire document by editing the style once. They're essential for clean, consistent typography in a layout.",
    docUrl: adobe("paragraph styles indesign"),
    source: "official"
  },
  {
    slug: "id-bleed-slug",
    discipline: "adobe",
    title: "Bleed & slug",
    aliases: ["bleed", "slug", "trim", "print margins"],
    oneLiner: "Extra ink past the trim so cut edges have no white slivers.",
    explanation:
      "Bleed is artwork extended beyond the trim line (commonly 3 mm / 0.125 in) so that imprecise cutting never leaves a white edge; the slug is an area outside that for notes and marks. Set bleed when you create the document and push edge-to-edge images into it. It's the difference between a board that prints clean and one with white slivers.",
    docUrl: adobe("bleed and slug indesign"),
    source: "official"
  },
  {
    slug: "id-preflight",
    discipline: "adobe",
    title: "Preflight & packaging",
    aliases: ["preflight", "package", "links", "missing fonts"],
    oneLiner: "Catch missing links/fonts and gather everything for print.",
    explanation:
      "Preflight live-checks a document for problems — missing or low-res linked images, missing fonts, overset text — before output. Package then collects the InDesign file, fonts, and links into one folder so a printer (or another computer) has everything. Running both before a deadline avoids the classic 'fonts missing at the print shop' disaster.",
    docUrl: adobe("preflight package indesign"),
    source: "official"
  },

  // ---- General 2D/3D concepts (tool-agnostic) ----------------------------
  {
    slug: "gen-mesh-vs-nurbs",
    discipline: "general",
    title: "Mesh vs. NURBS / solid",
    aliases: ["mesh", "polygon", "nurbs vs mesh", "brep"],
    oneLiner: "Faceted polygon geometry vs. smooth math surfaces.",
    explanation:
      "A mesh is a net of flat triangles/quads — light, great for rendering, 3D printing, and scans, but only as smooth as its facet count. NURBS/solids are exact mathematical surfaces — heavier but precise and editable, the right choice for fabrication drawings. Knowing which a file is tells you what you can reliably do with it.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  },
  {
    slug: "gen-units-scale",
    discipline: "general",
    title: "Units & scale",
    aliases: ["units", "scale", "model units", "real-world size"],
    oneLiner: "Model at real-world size; mismatched units break everything.",
    explanation:
      "Always model at full real-world size in consistent units; 'scale' belongs to the drawing/viewport, not the geometry. Importing a file authored in different units (mm into a meters file) is the usual reason geometry arrives tiny or enormous. Check and set document units before importing or starting.",
    docUrl: RHINO_USERS_GUIDE,
    source: "official"
  }
];

export const CONCEPTS: Record<string, Concept> = Object.fromEntries(
  ROWS.map((c) => [c.slug, c])
);

export function getConcept(slug: string): Concept | undefined {
  return CONCEPTS[slug];
}

/** Official fallback link for a concept the model named but we don't have. */
export function searchFallbackUrl(discipline: Discipline, term: string): string {
  const builder = PROVIDER_SEARCH_ROOTS[discipline] ?? PROVIDER_SEARCH_ROOTS.general;
  return builder(term);
}

/**
 * A compact slug index for the system prompt, scoped to the active discipline
 * (plus the tool-agnostic `general` concepts). The model is told to wrap these
 * slugs as [[concept:slug]] and never invent new ones.
 */
export function conceptIndexForPrompt(discipline: Discipline): string {
  const rows = ROWS.filter(
    (c) => c.discipline === discipline || c.discipline === "general"
  );
  return rows
    .map((c) => `${c.slug} — ${c.title} (${[c.title, ...c.aliases].join(", ")})`)
    .join("\n");
}
