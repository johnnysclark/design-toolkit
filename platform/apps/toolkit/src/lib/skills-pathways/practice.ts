// Skills Pathways — the practical layer on top of each node's written `guide`.
//
// Kept SEPARATE from pathways.ts (keyed by node id) so the trail structure and
// the long guides stay untouched while we add the hands-on parts that make a
// step useful at the software *right now*:
//   - keyMoves: a quick cheat-sheet of the actual commands / tools / steps.
//   - tryThis:  one concrete studio exercise to practise the skill.
//   - watchOut: the single most common mistake, with the fix.
//
// Keep it studio-framed (design, representation, portfolio) and accurate — these
// teach students. Every node id in pathways.ts should have an entry here.

export interface Practice {
  /** Quick reference: the commands/tools/steps that matter for this step. */
  keyMoves?: string[];
  /** A concrete thing to go do in studio to practise this. */
  tryThis: string;
  /** The most common mistake here — and how to get out of it. */
  watchOut: string;
}

export const PRACTICE: Record<string, Practice> = {
  // ── Foundations ──────────────────────────────────────────────────────────
  "gen-files": {
    keyMoves: [
      "/model  /drawings  /images  /references  /portfolio",
      "name: project_thing_v03.ext",
      "Save As at each milestone",
      "back up to cloud + a drive"
    ],
    tryThis:
      "Set up this semester's studio folder right now: make the five subfolders, move your current files in, and rename them in the project_thing_v01 pattern. Do it before your next work session so the habit sticks.",
    watchOut:
      "‘final', ‘final2', ‘final-REAL' is how you lose the right version the night before review — use zero-padded versions (v01, v02…) so they sort in order."
  },
  "gen-units": {
    keyMoves: [
      "set document units before modeling",
      "model at 1:1, real-world size",
      "on import, check the source file's units",
      "m ↔ mm = scale by 1000 / 0.001"
    ],
    tryThis:
      "Open a fresh file set to metres, draw a 0.9 m door and a 3 × 4 m room, then import a model from a classmate and check whether it lands at the right size next to your room.",
    watchOut:
      "A model that imports as a dot or a giant is almost always a millimetres-vs-metres mismatch — scale it by 1000 (or 0.001), don't redraw it."
  },
  "gen-raster-vector": {
    keyMoves: [
      "vector → diagrams, linework, type",
      "raster → photos, renders, textures",
      "vector files: PDF · SVG · AI · DWG",
      "raster files: JPG · PNG · TIFF"
    ],
    tryThis:
      "Take one diagram you made and one render/photo, and identify which is which. Zoom each to 400% — the vector stays crisp, the raster shows pixels. That's the test you'll use forever.",
    watchOut:
      "Enlarging a small web JPG to fill a board is the classic blur — get raster images at the size you'll print, and rebuild diagrams as vectors."
  },
  "gen-color-output": {
    keyMoves: [
      "RGB for screen · CMYK for print",
      "~300 ppi at final print size",
      "soft-proof CMYK before plotting",
      "limit the palette: 2 neutrals + 1–2 accents"
    ],
    tryThis:
      "Take a board-in-progress, switch its colour mode to CMYK (or soft-proof it), and note which bright blues/greens shift — then pick a small fixed palette and save it as swatches.",
    watchOut:
      "Vivid on-screen colours can print muddy; if it's going to a plotter, design in/preview CMYK rather than trusting the laptop screen."
  },
  "gen-mesh-nurbs": {
    keyMoves: [
      "mesh = faceted (render, print, scans)",
      "NURBS/solid = exact (fabrication, clean curves)",
      "NURBS → mesh: routine",
      "mesh → NURBS: lossy, avoid"
    ],
    tryThis:
      "Pick a downloaded 3D model and figure out whether it's a mesh or NURBS (selection + object info). Then try to boolean or dimension it — if it fights you, you've learned why the type matters.",
    watchOut:
      "When geometry won't join, boolean, or exports enormous, suspect you're fighting the wrong type — check mesh vs. NURBS before blaming the command."
  },
  "gen-interop": {
    keyMoves: [
      "2D linework: DWG / DXF",
      "meshes: OBJ / STL · NURBS solids: STEP / IGES",
      "vector to layout: PDF / SVG / AI",
      "match units + keep layers on export"
    ],
    tryThis:
      "Make a Make2D (or any linework) in Rhino/CAD, export it as DWG, and open it in Illustrator. Check that it arrived at the right scale and kept its layers — fix the export settings until it does.",
    watchOut:
      "Exports silently drop layers or rescale if you don't set them up — never just hit ‘Save As'; open the export options and check units + layers first."
  },
  "gen-pipeline": {
    keyMoves: [
      "model = single source of truth",
      "generate drawings, don't redraw screenshots",
      "place (link) images, don't paste",
      "keep line-weight/poché as re-applicable styles"
    ],
    tryThis:
      "Write a three-line ‘how this project is made' note in your project folder: where linework lives, the export preset, and the board template. Then test it by regenerating one board from the model.",
    watchOut:
      "If a design change means redrawing boards by hand, your pipeline is broken — wire each stage so it re-runs, or you'll dread every revision."
  },
  "gen-version": {
    keyMoves: [
      "name milestones: schemeA, after-crit, final",
      "keep the dead ends",
      "screenshot key states as you go",
      "duplicate before a risky move"
    ],
    tryThis:
      "Go back through your current project and save 3–4 named milestone files at real decision points, including one scheme you abandoned. You'll use them to tell the story in your portfolio.",
    watchOut:
      "Working in one ever-overwritten file erases your process — and the process is half the grade; snapshot decisions instead of painting over them."
  },
  "gen-ai": {
    keyMoves: [
      "use AI to brainstorm, explain, draft, reference",
      "then verify every claim/number/precedent",
      "credit AI-generated content",
      "know what a tool does with your uploads"
    ],
    tryThis:
      "Ask an AI tool to critique your current scheme or explain a software step, then fact-check one thing it told you against the real docs or a measurement. Notice where it was confidently wrong.",
    watchOut:
      "A fluent answer isn't a correct one — treat AI output as a first draft to check, and don't let it replace the analog repetition that actually builds skill."
  },

  // ── Rhino ────────────────────────────────────────────────────────────────
  "rhino-interface": {
    keyMoves: [
      "orbit: RMB-drag · pan: Shift+RMB · zoom: scroll",
      "Gumball: arrows move, arcs rotate, squares scale",
      "type a number while dragging for exact values",
      "CPlane to draw on a face"
    ],
    tryThis:
      "Make a box, then use only the Gumball to move it 3 m, rotate it 30°, and scale one face — typing each number. Then set a CPlane onto an angled face and draw a rectangle flat on it.",
    watchOut:
      "If new geometry lands in mid-air or the wrong spot, your CPlane or a snap is off — check the construction plane before assuming the command failed."
  },
  "rhino-curves": {
    keyMoves: [
      "Curve (control-point) · InterpCrv (through points)",
      "Polyline · Line · Rectangle",
      "F10 PointsOn / F11 PointsOff",
      "Rebuild to reduce points · Osnaps on"
    ],
    tryThis:
      "Drop a reference image (PictureFrame) of a plan you like, then retrace its straight walls as polylines and one sweeping element as a control-point curve — turn points on and clean it to 6–8 points.",
    watchOut:
      "A lumpy curve usually has too many control points — Rebuild it with fewer rather than nudging points one by one."
  },
  "rhino-layers": {
    keyMoves: [
      "Layers panel: colour, on/off, lock",
      "set Absolute Tolerance in DocumentProperties › Units",
      "sublayers for structure (Walls › Interior)",
      "current layer before you draw"
    ],
    tryThis:
      "Set up a small layer scheme (Site, Walls, Floors, Furniture, Scratch) with distinct colours, then sort an existing model onto them and try hiding/locking whole systems to navigate.",
    watchOut:
      "If joins and booleans quietly fail, your tolerance is probably wrong for the model scale — set it sensibly (e.g. 0.001 for metres) before modeling, not after."
  },
  "rhino-surfaces": {
    keyMoves: [
      "ExtrudeCrv · Loft · Sweep1 · Sweep2 · Revolve",
      "watch + flip the seam arrows when lofting",
      "Match / BlendSrf for tangency (G1/G2)",
      "build clean section curves first"
    ],
    tryThis:
      "Draw three section curves at different heights and Loft them into a tower skin; then deliberately mismatch one curve's seam to see the twist, and fix it by aligning seam directions.",
    watchOut:
      "A twisted or pinched loft is a seam/direction problem, not a Loft bug — align the section curves' seams and point counts before lofting."
  },
  "rhino-solids": {
    keyMoves: [
      "BooleanUnion · BooleanDifference · BooleanIntersection",
      "Cap to close an open extrusion",
      "ShowEdges to find naked edges",
      "keep un-booleaned parts on a hidden layer"
    ],
    tryThis:
      "Mass three volumes, BooleanUnion them, then BooleanDifference a courtyard and a few window reveals — keep copies of the originals hidden so you can re-run the moves when the design shifts.",
    watchOut:
      "A failed boolean almost always means a solid isn't closed — run ShowEdges, cap the naked edges (or fix tolerance), then retry instead of re-clicking."
  },
  "rhino-subd": {
    keyMoves: [
      "start from a SubD box/sphere",
      "edit the cage: faces, edges, points + Gumball",
      "InsertEdge for creases/control",
      "ToNURBS when you need precision"
    ],
    tryThis:
      "Make a SubD box and push/extrude faces into a piece of lounge furniture or a sculpted canopy; add an edge loop where you want a crease, then ToNURBS a copy to see the difference.",
    watchOut:
      "Cramming in lots of control points makes a SubD lumpy and hard to edit — work with few points and add edge loops only where the form needs them."
  },
  "rhino-blocks": {
    keyMoves: [
      "Block to define · Insert to place",
      "BlockEdit to update every instance",
      "keep entourage blocks on their own layer",
      "linked blocks reference an external file"
    ],
    tryThis:
      "Turn a tree (or chair) into a Block, scatter a dozen instances across your site, then BlockEdit it into a better one and watch them all update at once.",
    watchOut:
      "Exploding a block to ‘just tweak this one' breaks the link and bloats the file — BlockEdit the definition instead, or make a new block."
  },
  "rhino-make2d": {
    keyMoves: [
      "set a NamedView / ortho viewport first",
      "Make2D → visible + hidden on separate layers",
      "Clipping Plane or Section for plans/sections",
      "export DWG to Illustrator for line weights"
    ],
    tryThis:
      "Set a front orthographic view of your model and run Make2D for an elevation; then add a clipping plane at 1.2 m and Make2D a plan. Export both as DWG and open them in Illustrator.",
    watchOut:
      "Make2D output is only as clean as your layers and view — tidy the model and set the view first, or you'll spend longer cleaning linework by hand."
  },
  "rhino-render": {
    keyMoves: [
      "display modes: Arctic · Technical · Pen · Ghosted",
      "assign materials by layer + set the Sun",
      "NamedView for repeatable shots",
      "ViewCaptureToFile at 2–3× screen size"
    ],
    tryThis:
      "Set up one NamedView of your model, switch to Arctic display, turn on the Sun for real shadows, and ViewCaptureToFile at large size — then do the same view in Technical for a line version.",
    watchOut:
      "Capturing at screen resolution gives a soft, pixelated board image — use ViewCaptureToFile at 2–3× (not a screenshot) so it's sharp at print size."
  },
  "rhino-fabrication": {
    keyMoves: [
      "3D print: closed mesh → STL, normals out, check Min wall",
      "ShowEdges / mesh-repair before export",
      "laser: UnrollSrf or contours, lay flat, DWG/DXF at 1:1",
      "layers/colours = cut vs. score vs. engrave"
    ],
    tryThis:
      "Take a simple massing model, Mesh it, run ShowEdges to confirm it's closed, and export an STL; separately, unroll one surface and lay the parts flat with tabs for a laser-cut test piece.",
    watchOut:
      "Printers reject open meshes and lasers ignore your intent if cut/score/engrave aren't separated by colour — close the mesh and organise cut layers before sending."
  },

  // ── Grasshopper ──────────────────────────────────────────────────────────
  "gh-intro": {
    keyMoves: [
      "type Grasshopper in Rhino to open",
      "wire output → input, left to right",
      "Number Slider drives a value live",
      "hover ports to read what they expect"
    ],
    tryThis:
      "Wire a Number Slider into a Circle's radius and drag it; then add a Move with a second slider. Feel the loop — change an input, watch Rhino update — on something trivial before anything complex.",
    watchOut:
      "‘Nothing happens when I drag' usually means the slider's range or rounding is wrong (or it's not wired) — double-click it to set min/max and check the wire."
  },
  "gh-lists": {
    keyMoves: [
      "Series (start, step, count)",
      "Range (domain ÷ steps)",
      "List Item (index, 0-based)",
      "Panel to see the data"
    ],
    tryThis:
      "Use Series to place 18 stair treads at an accumulating height, then use List Item to pull out just the top one. Keep a Panel wired in so you can see the numbers the whole time.",
    watchOut:
      "Series is step-driven and Range is count-driven — picking the wrong one gives off-by-one and spacing surprises; check the endpoints in a Panel."
  },
  "gh-geometry": {
    keyMoves: [
      "Construct Point · Divide Curve · Evaluate Curve",
      "Interpolate / Polyline / Line for curves",
      "right-click param → Set one Rhino object",
      "Bake (right-click) to make real geometry"
    ],
    tryThis:
      "Reference a curve you drew in Rhino, Divide it into 20 points, and put a vertical column at each. Change the division count with a slider, then Bake the columns onto a named layer.",
    watchOut:
      "The live preview isn't real Rhino geometry yet — if you can't select it in Rhino, you forgot to Bake; and re-baking makes duplicates, so delete the old bake first."
  },
  "gh-trees": {
    keyMoves: [
      "paths look like {0;1}",
      "Graft = one item per branch",
      "Flatten = one flat list",
      "Param Viewer to read the tree"
    ],
    tryThis:
      "Make a grid of points, then Graft and Flatten the same list into a downstream component and watch the result count change. Keep a Param Viewer on the output so you can see the branches.",
    watchOut:
      "Most ‘wrong number of results' bugs are tree-shape mismatches, not broken logic — read the tree in a Param Viewer and graft/flatten deliberately rather than guessing."
  },
  "gh-matching": {
    keyMoves: [
      "Longest / Shortest List · Cross Reference",
      "Dispatch (split by true/false)",
      "Cull Pattern (keep/drop by mask)",
      "Sort List (carry a second list along)"
    ],
    tryThis:
      "Dispatch a row of façade panels into ‘solid' and ‘glazed' by an alternating pattern and give each group a different colour or depth; then Cull every third one to make an opening.",
    watchOut:
      "Two lists of different lengths get padded by the default match rule, repeating the last item — set Shortest/Longest/Cross Reference on purpose to control the pairing."
  },
  "gh-attractors": {
    keyMoves: [
      "measure Distance (point/curve → each element)",
      "Remap Number into the parameter's domain",
      "Graph Mapper to shape the falloff",
      "feed it into size / rotation / opening"
    ],
    tryThis:
      "Build a grid of panels, pick an attractor point, measure each panel's distance to it, remap that into a rotation range, and drive the panels — then move the attractor and watch the field respond.",
    watchOut:
      "An attractor pattern with no reason behind it reads as a gimmick — tie the variation to a real driver (sun, view, entrance) so the gradient is an argument, not an effect."
  },
  "gh-clusters": {
    keyMoves: [
      "select components → Cluster",
      "name the cluster's inputs/outputs",
      "group + colour + label regions",
      "Path Mapper / Mass Addition when needed"
    ],
    tryThis:
      "Take a working sub-graph (say your attractor logic), turn it into a named Cluster, and reuse it twice in the same definition. Then group and label the rest so a teammate could read it.",
    watchOut:
      "Cluster only once a sub-graph is stable — clustering half-finished logic just hides bugs; and Path Mapper breaks if the input tree depth changes, so reach for it last."
  },
  "gh-fields": {
    keyMoves: [
      "generate/colour meshes; map data → colour",
      "Kangaroo: Goals + Solver for form-finding",
      "anchors + length/target goals",
      "Bake the version you want, refine in Rhino"
    ],
    tryThis:
      "Set up a simple Kangaroo relaxation — a grid of springs with a few anchored corners pulled down by gravity — and watch it settle into a catenary/tensile shape. Bake one result and edit it in Rhino.",
    watchOut:
      "Simulation is a sketching tool, not a truth machine — explore the family of forms then read and verify the result; don't present a relaxed mesh as if it's structurally proven."
  },
  "gh-export": {
    keyMoves: [
      "Bake to named layers (set the bake layer)",
      "Make2D the baked geometry for drawings",
      "number/nest parts for fabrication",
      "DWG → Illustrator · STL/DXF → machine"
    ],
    tryThis:
      "Take a parametric panel system, bake it onto sorted layers, Make2D one elevation of it, and export a numbered, nested set of the panels flat — the thing that would be miserable to lay out by hand.",
    watchOut:
      "Baking everything onto one layer throws away the structure your definition just built — set bake layers so drawings and cut files arrive sorted."
  },

  // ── AutoCAD ──────────────────────────────────────────────────────────────
  "acad-draw": {
    keyMoves: [
      "L Line · PL Polyline · C Circle · REC Rectangle",
      "type exact lengths/angles as you draw",
      "F3 Osnap · F8 Ortho · running snaps on",
      "J Join lines into one polyline"
    ],
    tryThis:
      "Draw a small room at exact dimensions by typing each length, using Osnap to close it perfectly, then Join the walls into one polyline and read its area.",
    watchOut:
      "Eyeballing instead of snapping leaves tiny gaps that break hatches and area reads later — keep Osnap on and let it lock to real points."
  },
  "acad-layers": {
    keyMoves: [
      "LA Layer Properties Manager",
      "set layer colour, on/off, freeze, lock",
      "colour → printed weight (via plot style)",
      "set current layer before drawing"
    ],
    tryThis:
      "Build a reusable layer set (Walls, Doors, Furniture, Grid, Text, Hatch) with distinct colours, then re-sort an existing drawing onto it and toggle layers to see the drawing simplify.",
    watchOut:
      "Drawing ‘just this one thing' on whatever layer is current creates a sorting nightmare — set the right current layer first, every time."
  },
  "acad-modify": {
    keyMoves: [
      "O Offset · TR Trim · EX Extend · F Fillet",
      "CO Copy · M Move · RO Rotate · MI Mirror",
      "AR Array (rectangular / polar)",
      "S Stretch (keeps connections)"
    ],
    tryThis:
      "From one wall line, Offset to make a cavity, Trim the corners clean, Fillet a rounded corner, then Array a row of columns down it — using the keyboard aliases, watching the command line.",
    watchOut:
      "Fighting toolbars is what makes CAD feel slow — learn the two-letter aliases and read the command line's prompts, which tell you the next input at every step."
  },
  "acad-blocks": {
    keyMoves: [
      "B Block (define) · I Insert (place)",
      "attributes = editable text per insertion",
      "redefine block → all update",
      "XR / XREF to link a whole drawing"
    ],
    tryThis:
      "Make blocks for a chair and a tree, build a small furniture/planting library, and place them across a plan; then redefine the chair and watch every copy update.",
    watchOut:
      "Exploding a block to edit one instance breaks the link — redefine the block (or make a new one) so the library stays consistent."
  },
  "acad-annotate": {
    keyMoves: [
      "DIM dimensions · MT MText · H Hatch",
      "Dimension Style + Text Style (set once)",
      "make annotation annotative (scale-aware)",
      "hatch needs a CLOSED boundary"
    ],
    tryThis:
      "Dimension your room, label it with MText, and poché the walls with a solid hatch on its own light-coloured layer — set a Dimension Style first so it's consistent.",
    watchOut:
      "‘No valid hatch boundary' means a gap in the outline — close the polyline; and set annotation annotative (or to the plot scale) or text prints the wrong size."
  },
  "acad-linework": {
    keyMoves: [
      "decide ~4 weights: cut → seen → texture → dims",
      "weight by layer colour → plot style (CTB)",
      "or set layer lineweights directly",
      "LWT toggles lineweight display"
    ],
    tryThis:
      "Take a plan and assign a four-level line-weight hierarchy by layer — heaviest on cut walls, lightest on hatch and dimensions — then plot a test PDF and check the hierarchy reads.",
    watchOut:
      "A drawing where every line is the same weight reads flat — assign a deliberate hierarchy (cut heaviest), which is the move that makes student drawings look professional."
  },
  "acad-layouts": {
    keyMoves: [
      "Layout tab = paper space",
      "MV Mview viewport · set scale · LOCK it",
      "title block + scale bar in paper space",
      "PLOT / PAGESETUP → PDF with a plot style"
    ],
    tryThis:
      "Make a layout, drop in a viewport set to 1:100, lock it, add a title block and scale bar, then Plot to PDF using a page setup — and save that page setup for next time.",
    watchOut:
      "‘All my lines print the same weight' is a plot-style (CTB) problem, not your drawing — fix the page setup's plot style; and lock viewports so panning doesn't change the scale."
  },
  "acad-rhino": {
    keyMoves: [
      "Rhino Make2D → export DWG → AutoCAD/Illustrator",
      "import survey/site DWG → Rhino base",
      "match units on every hand-off",
      "reference imports on a locked layer"
    ],
    tryThis:
      "Export a Make2D from Rhino as DWG and import it into AutoCAD; check it's at the right scale and on sensible layers. Then import a site DWG back into Rhino on a locked layer to model on.",
    watchOut:
      "Units mismatches on import make geometry arrive 1000× off, and unkept layers arrive as a tangle — set units and preserve layers on both ends of the round-trip."
  },
  "acad-diagrams": {
    keyMoves: [
      "figure-ground: solid buildings / void ground",
      "build each overlay on its own layer set",
      "Hatch + solid fills carry the reading",
      "finish colour + labels in Illustrator"
    ],
    tryThis:
      "From an accurate site plan, make a figure-ground (buildings solid black) and one circulation diagram on separate layers, stripping everything that isn't making each argument.",
    watchOut:
      "A diagram trying to say everything says nothing — isolate one idea per drawing and use a consistent graphic language (same fill for ‘building') across the set."
  },

  // ── Revit ────────────────────────────────────────────────────────────────
  "rvt-intro": {
    keyMoves: [
      "Category › Family › Type › Instance",
      "Type param = changes all of that type",
      "Instance param = changes only that one",
      "swap a type and the model updates"
    ],
    tryThis:
      "Place a few walls and doors, then change a Type parameter (a door width) and watch every door of that type change; change an Instance parameter (its mark) and watch only one change.",
    watchOut:
      "Don't agonise over the ‘perfect' family at the massing stage — place generic types and swap them later; the whole point is that types update across the model."
  },
  "rvt-levels": {
    keyMoves: [
      "LL Level (draw in a section/elevation)",
      "GR Grid for columns",
      "name levels: Ground, First, Roof",
      "levels host elements — move one, they follow"
    ],
    tryThis:
      "In a section view, set up four named levels at real floor-to-floor heights and a simple lettered/numbered grid; then move a level and watch the hosted walls follow.",
    watchOut:
      "Re-hosting elements after the fact is painful — get levels and grids right early, because most elements constrain to them and inherit their moves."
  },
  "rvt-walls": {
    keyMoves: [
      "WA Wall · set base/top to levels",
      "Floor / Roof = a closed sketch boundary",
      "Trim / Join / Align to clean corners",
      "generic types are fine for design"
    ],
    tryThis:
      "Build a single-room enclosure: draw walls constrained base-to-top between two levels, add a floor and roof by sketch, and clean the corners with Trim — then open a section and a 3D view to see it all update.",
    watchOut:
      "Sloppy early types and constraints propagate everywhere — keep wall types and level constraints tidy now, because one model feeds every drawing."
  },
  "rvt-massing": {
    keyMoves: [
      "in-place Mass or mass family",
      "Mass Floors → area per level, automatically",
      "apply walls/floors/curtain to mass faces",
      "Design Options for A/B schemes"
    ],
    tryThis:
      "Make an in-place mass, push/pull it into a scheme, add Mass Floors at each level and read the floor areas; then set up a second massing as a Design Option and compare.",
    watchOut:
      "Don't jump to detailed walls while the form is still moving — study it as a mass first (with mass-floor areas), then apply building elements once it's settled."
  },
  "rvt-data": {
    keyMoves: [
      "RM Room · Area plans",
      "Schedule (live table from the model)",
      "Color Fill by room/program/area",
      "shared/project parameters for custom data"
    ],
    tryThis:
      "Place Rooms throughout a plan, make a room schedule that reports their areas, and add a Color Fill that shades rooms by program — then push a wall and watch the schedule update.",
    watchOut:
      "Rooms need fully enclosed boundaries to compute area — a gap gives a ‘not enclosed' warning; close the room or add a room-bounding line."
  },
  "rvt-views": {
    keyMoves: [
      "Section tool · Elevation marker · Camera (3D)",
      "Project Browser organises every view",
      "View Range sets the plan cut height",
      "Section Box for cutaways"
    ],
    tryThis:
      "Cut a section through your model, place a perspective camera for an interior view, and use a Section Box in a 3D view to make a cutaway axon — then change a wall and watch all three update.",
    watchOut:
      "If something's missing from a plan, it's usually above or below the View Range cut — adjust the cut height instead of assuming the element is gone."
  },
  "rvt-docs": {
    keyMoves: [
      "Sheet + title block; drag views on",
      "sheet number/name drive the set",
      "View Template = consistent graphics across views",
      "export PDF (or images for InDesign)"
    ],
    tryThis:
      "Make a sheet, place a plan and a section on it at scale, apply a View Template to standardise their look, and export a clean PDF — or export the views as images to compose in InDesign.",
    watchOut:
      "Styling each view by hand doesn't scale — apply a View Template so a graphic change updates every view at once and the set stays consistent."
  },
  "rvt-graphics": {
    keyMoves: [
      "VG/VV Visibility-Graphics overrides",
      "set object styles / line weights",
      "shadows + a sketchy/realistic display",
      "solid cut-fills (poché); export vector PDF"
    ],
    tryThis:
      "Take a plain Revit plan, set a clear line-weight hierarchy, turn on solid cut poché and shadows, add a program Color Fill, then export it to Illustrator/Photoshop to add entourage and atmosphere.",
    watchOut:
      "Default Revit output looks like default Revit output — reviewers notice; fix line weights, poché, and palette, and post-process in the Adobe suite before the board."
  },
  "rvt-phases": {
    keyMoves: [
      "set Phase Created / Demolished per element",
      "set each view's Phase + Phase Filter",
      "existing grey · demo dashed · new solid",
      "Constraints (lock/pin/align) hold intent"
    ],
    tryThis:
      "Model an existing room, demolish one wall, and add a new insertion; then make two views — one ‘existing', one ‘new construction' — with the right phase filters so each tells its story.",
    watchOut:
      "If new and existing look identical (or new work vanishes), the view's Phase/Phase Filter is wrong — set those, not the geometry; and beware over-constraining ('constraints not satisfied')."
  },

  // ── Adobe ────────────────────────────────────────────────────────────────
  "adobe-foundations": {
    keyMoves: [
      "Photoshop = raster · Illustrator = vector · InDesign = layout",
      "set size/units + RGB-or-CMYK at New",
      "raster ~300 ppi at print size",
      "Place (link), don't paste, between apps"
    ],
    tryThis:
      "Start the right document in each app for one task: a render edit in Photoshop, a diagram in Illustrator, a two-page spread in InDesign — setting size, colour mode, and resolution correctly at creation.",
    watchOut:
      "Drawing diagrams in Photoshop or laying out a portfolio in Illustrator fights the tool — match the app to the task, and fixing colour mode/resolution later is painful."
  },
  "ps-basics": {
    keyMoves: [
      "work in layers; name + group them",
      "selections: Object Select / Quick Select / Lasso",
      "selection → Layer Mask (don't delete pixels)",
      "Cmd/Ctrl+J duplicate · [ ] brush size"
    ],
    tryThis:
      "Cut an entourage figure out of a photo using a selection turned into a layer mask, drop it onto a render on its own layer, and refine the mask edge with a soft brush — keep everything non-destructive.",
    watchOut:
      "Erasing or flattening to ‘fix' something paints you into a corner — mask instead of delete, and keep elements on separate named layers so you can keep editing."
  },
  "ai-basics": {
    keyMoves: [
      "Artboards = your pages; set real output sizes",
      "P Pen (click=corner, drag=curve)",
      "Stroke panel for weights · Layers panel",
      "shapes + Shift to constrain"
    ],
    tryThis:
      "Set an artboard to your board size, place a CAD/Make2D linework, and redraw or trace one element with the Pen tool — then assign it a heavier stroke weight than the surrounding lines.",
    watchOut:
      "Too many anchor points make messy curves — click for corners, click-drag for curves, and keep points few; use the Pen deliberately rather than over-clicking."
  },
  "ps-nondestructive": {
    keyMoves: [
      "Layer Masks · Clipping Masks",
      "Adjustment Layers (Curves, Levels, Hue/Sat)",
      "Smart Objects (re-editable transforms/filters)",
      "Blend modes: Multiply darkens, Screen lightens"
    ],
    tryThis:
      "Composite a board: adjust a render's exposure with a Curves adjustment layer, mask a new sky in, and Multiply a hand-drawn texture over the whole thing — then change each one to prove it's all still editable.",
    watchOut:
      "Baking edits into the pixels means you can't revise at 2 a.m. — use adjustment layers, masks, and smart objects, and only flatten a final copy at the very end."
  },
  "ai-vector": {
    keyMoves: [
      "assign a line-weight hierarchy (Stroke panel)",
      "Pathfinder: Unite / Minus Front / Intersect",
      "Pen + anchor editing for exact paths",
      "Layers + Swatches keep diagrams a family"
    ],
    tryThis:
      "Bring in a Make2D plan, assign a clear line-weight hierarchy (cut heaviest), and build a small figure-ground from the same base using Pathfinder — keeping consistent swatches across both.",
    watchOut:
      "Inconsistent weights and colours make a drawing set look random — fix a hierarchy and a swatch palette and reuse them so every diagram reads as a family."
  },
  "ps-collage": {
    keyMoves: [
      "layer order: base → entourage → sky → atmosphere",
      "match light direction + add contact shadows",
      "unify with a Curves/Color Balance layer on top",
      "keep elements as Smart Objects"
    ],
    tryThis:
      "Build an architectural collage from a model view: add cut-out people and trees, drop in a sky, then unify everything with one Curves adjustment layer and a touch of haze — keep it all layered.",
    watchOut:
      "Mismatched light and missing ground-shadows make cut-outs look pasted on — match light direction across elements and add contact shadows where things meet the ground."
  },
  "id-layout": {
    keyMoves: [
      "set a margin + column grid first",
      "Parent (master) pages for repeating elements",
      "Paragraph + Character Styles",
      "Cmd/Ctrl+D Place (link) images"
    ],
    tryThis:
      "Set up a portfolio spread on a column grid, put page numbers on a parent page, define a heading and body paragraph style, and Place (not paste) one drawing — then re-export the drawing and watch the page update.",
    watchOut:
      "Pasting images instead of Placing them breaks the link to the source — Place them so an upstream edit flows through, and style with paragraph styles, not manual formatting."
  },
  "id-print": {
    keyMoves: [
      "set Bleed (~3 mm) at New; push images into it",
      "Preflight (catches links/fonts/overset)",
      "File › Package (gathers file+fonts+links)",
      "Export PDF (press quality, marks + bleed)"
    ],
    tryThis:
      "Take a board, add bleed and push the edge images into it, run Preflight to catch any low-res links or missing fonts, Package it, and export a print-quality PDF — then open the PDF at 100% to check.",
    watchOut:
      "Missing fonts/links surface at the print shop, not on your screen — Preflight and Package before the deadline, and set bleed so cut edges don't show white slivers."
  },
  "portfolio-systems": {
    keyMoves: [
      "decide the system: grid, type, palette, caption rules",
      "one hero image per spread; size by importance",
      "sequence each project: question → site → move → proof",
      "parent pages + styles + linked images"
    ],
    tryThis:
      "Define your portfolio system on one spread (grid, two type styles, a palette, caption placement), then lay out a second project into the exact same chassis to test that the system holds.",
    watchOut:
      "A portfolio that restyles every page reads as a pile of one-offs — commit to one system and let consistency + white space do the work; build it from parent pages and styles so changes propagate."
  },

  // ── Design Concepts & Theory ─────────────────────────────────────────────
  "dt-elements": {
    keyMoves: ["point · line · plane · volume", "solid vs. void (figure-ground)", "Ching: Form, Space & Order"],
    tryThis:
      "Take a plan you admire and trace it twice: once filling the solids black (figure), once filling the void black (ground). Notice how differently the space reads each way.",
    watchOut:
      "Designing only the solids and ignoring the leftover space is the classic trap — design the void as deliberately as the walls."
  },
  "dt-ordering": {
    keyMoves: ["axis", "symmetry", "hierarchy", "rhythm", "datum"],
    tryThis:
      "Diagram the organizing principle of three buildings you like — one overlay each: draw the axis, mark the hierarchy, show the rhythm.",
    watchOut:
      "If you can't name your scheme's primary order, it reads as arbitrary — establish one clear organizing move before adding secondary ones."
  },
  "dt-precedent": {
    keyMoves: ["redraw plan + section yourself", "extract the parti", "tag the borrowable move", "keep it in the Librarian"],
    tryThis:
      "Choose one precedent near your project and redraw its plan, section, and parti by hand — then write the one move you'll borrow and why.",
    watchOut:
      "Copying the look instead of the logic gives a knock-off — borrow the strategy (a sectional move, an organization), not the style."
  },
  "dt-parti": {
    keyMoves: ["one sentence + one sketch", "use it as a decision filter", "must diagram in 10 seconds"],
    tryThis:
      "Try to draw your current scheme's parti in ten seconds on a sticky note. If you can't, keep simplifying the idea until you can.",
    watchOut:
      "A parti that needs a paragraph isn't a parti yet — if every move is negotiable, the scheme has no organizing idea."
  },
  "dt-scale-body": {
    keyMoves: ["stair ~150–180mm riser", "door ~900mm", "populate drawings with figures", "proportion = relationships"],
    tryThis:
      "Drop true-scale human figures and furniture into your current model or plan, and walk through whether each space actually fits its use.",
    watchOut:
      "A space that looks fine zoomed-in may be enormous or cramped — check it against a standing figure before trusting the model."
  },
  "dt-site-context": {
    keyMoves: ["figure-ground of the context", "sun · wind · slope · access · view", "contextual or contrarian — but a position"],
    tryThis:
      "Make a forces diagram of your site (sun, views, noise, access, the thing to hide), then test whether rotating or shifting your massing responds to it.",
    watchOut:
      "An object that ignores its site could be anywhere — make at least one major move that only makes sense on this site."
  },
  "dt-tectonics": {
    keyMoves: ["draw a wall section: ground → structure → envelope → roof", "how do loads travel?", "the joint carries meaning"],
    tryThis:
      "Draw a quick wall section through your scheme showing how it meets the ground, holds up, and meets the sky — then let it adjust the big moves.",
    watchOut:
      "A great shape that can't explain how it's built reads as unresolved — give the scheme a structural and material logic early."
  },
  "dt-program-type": {
    keyMoves: ["adjacency / bubble diagram", "public vs. private · served vs. servant", "adopt or subvert a known type"],
    tryThis:
      "Make an adjacency diagram of your program (what's near what), then sketch the same program organized as two different building types and compare.",
    watchOut:
      "Treating program as a room checklist misses the design — the relationships between programs are where the ideas live."
  },
  "dt-position": {
    keyMoves: ["what am I arguing for?", "make it criticisable", "every move serves the thesis"],
    tryThis:
      "Write your project's position as one sentence ('this project argues that…'), then check whether each major move actually supports it.",
    watchOut:
      "A project with no position can't be argued with — and a review with nothing to argue about is a weak review."
  },

  // ── Architectural Media ──────────────────────────────────────────────────
  "am-orthographic": {
    keyMoves: ["plan = horizontal cut ~1.2m", "section = vertical cut", "cut drawn heaviest (poché)", "scale + north + figures"],
    tryThis:
      "Produce a coordinated plan + section for one project where the section line is marked on the plan and the cut poché matches between them.",
    watchOut:
      "Flat, single-weight orthographic drawings read as unfinished — establish a line-weight hierarchy with the cut heaviest."
  },
  "am-hand": {
    keyMoves: ["freehand plan/section to think", "1- & 2-point perspective", "trace + overlay + iterate", "sketchbook always"],
    tryThis:
      "Set a 10-minute timer and sketch five quick variations of one space by hand — no erasing — then pick the strongest to develop.",
    watchOut:
      "Jumping straight to crisp CAD lines closes a design too early — sketch loosely to keep options open first."
  },
  "am-diagram": {
    keyMoves: ["one idea per diagram", "remove everything else", "consistent graphic language", "parti diagram first"],
    tryThis:
      "Make a single parti diagram, then three supporting ones (circulation, program, structure) using one consistent colour/arrow language.",
    watchOut:
      "A diagram trying to show everything shows nothing — strip it to the single idea it's making."
  },
  "am-collage": {
    keyMoves: ["layers: base → texture → entourage → sky → atmosphere", "Multiply/Screen + masks", "consistent light direction", "limited palette"],
    tryThis:
      "Build a collage from a flat model view: add two textures, cut-out people, a sky, and one atmosphere wash — keep it to a tight palette.",
    watchOut:
      "Too many elements and clashing light make a busy mess — curate hard and unify everything with one colour wash on top."
  },
  "am-rendering": {
    keyMoves: ["camera at eye level", "sun + sky; simple materials", "late-day raking light", "post-process after"],
    tryThis:
      "Render one eye-level view with a low sun, then take it into Photoshop for exposure, a sky, and a couple of entourage figures.",
    watchOut:
      "A random orbit camera and flat noon light kill a render — frame it like a photographer and light it with intent."
  },
  "am-axon": {
    keyMoves: ["parallel projection (no perspective)", "worm's-eye = up through the plan", "exploded = pull apart on an axis"],
    tryThis:
      "Make an exploded axon that separates structure, floors, and envelope along a vertical axis to show how the project is assembled.",
    watchOut:
      "Inconsistent projection across a series breaks the read — lock one axon angle and reuse it."
  },
  "am-photoreal": {
    keyMoves: ["PBR materials (roughness/reflection)", "HDRI sky + soft shadows + GI", "imperfection + depth of field", "colour-grade in post"],
    tryThis:
      "Reference one real photo of a similar space, then match its light direction, material roughness, and depth of field in a render.",
    watchOut:
      "Hyper-realism can oversell an unresolved design — and the eye instantly catches wrong light; reference real photos constantly."
  },
  "am-animation": {
    keyMoves: ["motivated path: enter → reveal → arrive", "keyframes", "storyboard first", "30–90s; sound + pacing"],
    tryThis:
      "Storyboard a 30-second walkthrough as six frames, then animate just one smooth camera move before rendering the whole thing.",
    watchOut:
      "A dizzy orbit and an over-long clip lose the viewer — keep it short, motivated, and storyboarded before rendering hours of frames."
  },
  "am-realtime": {
    keyMoves: ["Twinmotion / Enscape / Unreal", "Three.js / web viewer", "VR/AR at 1:1", "optimize the geometry"],
    tryThis:
      "Drop your model into a real-time tool and walk it at eye level, adjusting light live — note what the live walk reveals that stills didn't.",
    watchOut:
      "Real-time engines choke on heavy, messy geometry — clean and lighten the model first or it'll crawl."
  },

  // ── Agentic Coding ───────────────────────────────────────────────────────
  "ac-mindset": {
    keyMoves: ["direct, don't type", "you = author + editor", "trust but verify", "try the weird input"],
    tryThis:
      "Pick one small annoyance in your workflow and write a one-paragraph spec for a tool that fixes it — practising describing, not coding.",
    watchOut:
      "Treating the agent's confident output as correct is the trap — assume it's a first draft and try to break it."
  },
  "ac-setup": {
    keyMoves: ["Claude Code / Cursor / Codex", "a folder + git", "a terminal", "start tiny"],
    tryThis:
      "Install an agentic tool and have it make a single HTML page that changes colour on a button click — run it and confirm the loop works.",
    watchOut:
      "Starting with a huge first project stalls you — make something trivial run end-to-end before anything ambitious."
  },
  "ac-prompting": {
    keyMoves: ["state goal + inputs + outputs + constraints", "iterate in small steps", "show the real error/screenshot"],
    tryThis:
      "Take a vague ask ('make it nicer') and rewrite it as a concrete spec with inputs, outputs, and one constraint — then give it to the agent.",
    watchOut:
      "Vague prompts get vague software — and 'it's broken' wastes a turn; paste the actual error or a screenshot."
  },
  "ac-webapp": {
    keyMoves: ["HTML + CSS + JS, self-contained", "runs in the browser, no secrets", "test empty/weird inputs", "one tool, one job"],
    tryThis:
      "Build a single-purpose browser tool you'd actually use (a unit converter, a cut-sheet generator) and test it with empty and silly inputs.",
    watchOut:
      "Scope creep kills first builds — ship the one-job version, use it, then grow it."
  },
  "ac-data": {
    keyMoves: ["key = money; never in browser code", "a serverless function holds the key", "rate-limit + spend cap", "browser → your function → model"],
    tryThis:
      "Sketch (with the agent) the three-box flow for an AI tool — browser, your server function, the model — and mark exactly where the key lives.",
    watchOut:
      "An API key in client-side code will get scraped and run up your bill in a weekend — it must live server-side, always."
  },
  "ac-harness": {
    keyMoves: ["a rules file read each session", "memory between sessions", "the allowed tools", "guardrails (never do X)"],
    tryThis:
      "Write a short rules file for an agent on a real project (what it should know, what it must never do) and watch its behaviour steady.",
    watchOut:
      "Re-correcting the same mistake every session is wasted effort — encode the fix as a rule in the harness instead."
  },
  "ac-deploy": {
    keyMoves: ["static → any free host", "AI tool → host + server functions", "accounts/data → Supabase", "GitHub → Vercel auto-deploys"],
    tryThis:
      "Deploy your simple web app: push to GitHub, connect Vercel, watch it go live — then make an edit and see it auto-redeploy.",
    watchOut:
      "Committing a secret key to GitHub exposes it forever — use environment variables for anything secret from the start."
  },
  "ac-design-tools": {
    keyMoves: ["Rhino/GH run Python", "script the tedious bits", "MCP bridges an agent to an app", "verify the output"],
    tryThis:
      "Have an agent write a short Rhino/Grasshopper Python script for a real chore — rename layers, batch-export views — and verify it on a copy.",
    watchOut:
      "Auto-generated scripts can quietly mangle a file — run them on a copy and check the result before trusting them."
  },
  "ac-judgment": {
    keyMoves: ["offload vs. build-the-skill — choose", "credit AI; keep the trace", "know where uploads go (FERPA)", "mind the equity edge"],
    tryThis:
      "For one task this week, decide deliberately whether to use AI or do it by hand, and write one line on why — practising the judgement itself.",
    watchOut:
      "Letting a fluent AI answer replace the slow practice that builds skill is the real risk — and unacknowledged AI work is an authorship problem."
  },

  // ── Professional Practice ────────────────────────────────────────────────
  "pp-portfolio": {
    keyMoves: ["3–5 best projects", "hero image + parti + key drawings each", "show range + software", "PDF + web + 1-page sample"],
    tryThis:
      "Cut your portfolio to your five strongest projects, one spread each with a single hero image — then have someone time how fast they 'get' each.",
    watchOut:
      "Including everything dilutes your best work — a firm sees the weakest page; curate ruthlessly and proofread for typos."
  },
  "pp-readiness": {
    keyMoves: ["one BIM tool (often Revit)", "Rhino + Grasshopper", "Adobe basics", "files, PDFs, plotting, email"],
    tryThis:
      "Look up two firms you'd want to intern at, identify the software in their posts or work, and honestly rate yourself 1–5 on each.",
    watchOut:
      "Claiming software you can't actually operate backfires on day one — list what you can really do and be ready to learn the rest fast."
  },
  "pp-communication": {
    keyMoves: ["confirm goal + deadline first", "concise written updates", "ask good questions", "show WIP early"],
    tryThis:
      "Next time you get a studio task, practise the office reply: restate the goal, give a deadline for a first version, and list one question.",
    watchOut:
      "Disappearing for a day then returning with the wrong thing is the intern classic — confirm the ask and show work-in-progress early."
  },
  "pp-drawing-sets": {
    keyMoves: ["sheet numbers + title block", "plan → detail callouts", "scale & detail hierarchy", "follow office standards"],
    tryThis:
      "Find a real (public) drawing set and trace how one wall appears across plan, section, and a 1:5 detail, following the callouts.",
    watchOut:
      "Treating a set like a studio board misses the coordination — every sheet references others, so find the standards and follow them."
  },
  "pp-teamwork": {
    keyMoves: ["office naming + folders", "Revit worksets / borrow + sync", "respect xrefs + layers", "leave it cleaner"],
    tryThis:
      "On any shared file (even a group studio project), set up and follow a naming + layer convention everyone agrees on, and sync without clobbering.",
    watchOut:
      "One careless edit in a shared model can cost the whole team hours — coordinate ownership and communicate changes before you work."
  },
  "pp-redlines": {
    keyMoves: ["do exactly what's marked", "check off each markup", "ask when unclear", "log + date revisions"],
    tryThis:
      "Have someone mark up one of your drawings, then execute every redline exactly, checking each off — flag anything that seems wrong instead of guessing.",
    watchOut:
      "Doing more (or less) than the markup, or guessing on an unclear note, creates rework — make exactly the changes and ask about the rest."
  },
  "pp-consultants": {
    keyMoves: ["structural · MEP · civil · landscape", "architect coordinates the team", "design buildable schemes"],
    tryThis:
      "For your current project, list which consultants a real version would need and one thing each would tell you to change.",
    watchOut:
      "Designing with zero awareness of structure and services produces unbuildable schemes — know roughly how it stands up and where the ducts go."
  },
  "pp-deliverables": {
    keyMoves: ["understand the ask exactly", "work back from the deadline", "QA against the brief", "flag slips early"],
    tryThis:
      "Run a studio deadline like an office deliverable: define 'done', schedule backward, build in a QA pass, and give a mid-point status.",
    watchOut:
      "Fast work that needs redoing is worth less than careful work — leave time to check, and flag a slipping deadline early, not at the last minute."
  },
  "pp-career": {
    keyMoves: ["degree → AXP hours → ARE exams", "build breadth + find mentors", "track experience", "skills transfer widely"],
    tryThis:
      "Spend ten minutes reading the AXP/ARE (or your country's path) and note which experience areas an internship could start filling.",
    watchOut:
      "Drifting through early jobs wastes them — be intentional about the exposure and mentors you seek, and track hours toward licensure as you go."
  }
};

export function getPractice(id: string): Practice | undefined {
  return PRACTICE[id];
}
