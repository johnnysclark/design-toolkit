// ─────────────────────────────────────────────────────────────────────────────
// RAP Studio — the canonical state model.
//
// This is a faithful TypeScript subset of the real RAP `state.json`
// (schema `rhino_controller_v4.0`). The web tool holds this state in the
// browser and renders it many ways (2D tactile plan, 3D, STL, Braille, text) —
// exactly the project's "sense-agnostic state + renderer parity" idea. The
// shape matches the real file, so the BAY-based parts round-trip to the desktop
// Rhino Watcher; the studio-native free elements (walls/rooms/columns/openings)
// are carried under `web_*` keys by exportState and are NOT yet read back by the
// desktop Watcher — see exportState.ts.
//
// We deliberately keep a *subset* of the fields the desktop controller writes
// (the ones the web renderers use); exportState.ts fills in the rest on export.
// ─────────────────────────────────────────────────────────────────────────────

export type Vec2 = [number, number];

export type ApertureType = "door" | "window" | "portal";
export type Axis = "x" | "y";

export interface Aperture {
  id: string;
  type: ApertureType;
  /** Which wall family the opening sits on: "x" = a wall running along X
   *  (the top/bottom edges); "y" = a wall running along Y (left/right edges). */
  axis: Axis;
  /** Index of the gridline the wall sits on (0 = near edge, n = far edge). */
  gridline: number;
  /** Distance in feet along that wall, measured from the bay origin. */
  corner: number;
  width: number;
  height: number;
  hinge: "start" | "end";
  swing: "positive" | "negative";
}

export interface Corridor {
  enabled: boolean;
  axis: Axis;
  /** Gridline index the corridor centre runs along. */
  position: number;
  width: number;
  loading: "single" | "double";
}

export interface Walls {
  enabled: boolean;
  thickness: number;
}

export interface Bay {
  grid_type: "rectangular" | "radial";
  z_order: number;
  origin: Vec2;
  rotation_deg: number;
  /** [nx, ny] — number of structural modules in each direction. */
  bays: [number, number];
  /** [sx, sy] — module spacing in feet. */
  spacing: [number, number];
  corridor: Corridor;
  walls: Walls;
  apertures: Aperture[];
  void_center: Vec2 | null;
  void_size: Vec2 | null;
  void_shape: "rectangle" | "circle";
  label: string;
  braille: string;
  /** Which level this bay belongs to (index into State.levels). */
  level: number;
  /** Rhino layer this bay's geometry is drawn on. Missing = "Default". */
  layer?: string;
  /** Design phase that authored this bay (index into State.phases by id). Missing = "main". */
  phase?: string;
}

export interface Level {
  name: string;
  z: number;
  label: string;
}

// ── Free elements (beyond the structural bay jig) — the "full building" model ──

/** A free-standing wall segment, interior OR exterior, independent of any bay.
 *  This is how you draw real partition layouts, party walls, and irregular
 *  exterior envelopes that the bay grid can't express. */
export interface Wall {
  id: string;
  level: number; // index into State.levels
  a: Vec2;
  b: Vec2;
  thickness: number; // ft
  height?: number; // ft; defaults to tactile3d.wall_height
  /** Rhino layer this wall is drawn on (lineweight/linetype/tactile). Missing = "Default". */
  layer?: string;
  /** Design phase that authored this wall (index into State.phases by id). Missing = "main". */
  phase?: string;
}

// ── Rhino layers + tactile patterns (drafting-literal, no program vocabulary) ──

/** Linetype as a CAD pen pattern (drives the 2D dash table + 3D hidden lines). */
export type LineType = "solid" | "dashed" | "dotted" | "center" | "hidden";

/** A tactile surface texture for PIAF swell paper + STL raised relief. */
export type TactileKind = "none" | "dots" | "lines" | "crosshatch" | "grid";

export interface TactilePattern {
  pattern: TactileKind;
  spacing_mm: number; // center-to-center of dots / pitch of lines. Default 4.
  angle_deg: number; // hatch rotation; 0 = lines run along +x. Default 0.
  height_mm: number; // raised relief height for STL + PIAF swell. Default 0.6.
}

/** A Rhino layer: carries a lineweight (mm), a linetype, and an optional default
 *  tactile pattern applied to every piece of geometry placed on the layer. */
export interface Layer {
  name: string; // key in State.layers AND the value stored here (kept in sync)
  lineweight_mm: number; // pen weight in mm (Rhino lineweight). Default 0.25.
  linetype: LineType; // Default "solid".
  tactile?: TactilePattern; // default texture for geometry on this layer; omitted/none = flat
}

/** A geometric region — the only two region kinds. A "plate" is a flat slab; a
 *  "box" is an extruded massing volume. Each is placed ON A LAYER and described
 *  purely by dimensions in feet (origin = lower-left). Replaces the old Room. */
export interface Region {
  id: string;
  name: string;
  kind: "plate" | "box";
  origin: Vec2; // lower-left, world ft
  size: Vec2; // [w, d] ft footprint
  height?: number; // box only: extrusion height ft (required for box, ignored for plate)
  thickness?: number; // plate only: slab thickness ft (required for plate, ignored for box)
  layer: string; // REQUIRED — must be a key in State.layers
  level?: number; // index into State.levels; default 0
  tactile?: TactilePattern; // OPTIONAL per-region override of the layer's tactile
  phase?: string; // design phase that authored this region (index into State.phases by id). Missing = "main".
}

/** A free-standing column, anywhere (not tied to a bay grid). */
export interface Column {
  id: string;
  level: number;
  at: Vec2;
  size: number; // ft (square)
  /** Rhino layer this column is drawn on. Missing = "Default". */
  layer?: string;
  /** Design phase that authored this column (index into State.phases by id). Missing = "main". */
  phase?: string;
}

/** A door/window/portal placed on a free Wall, positioned along it. */
export interface Opening {
  id: string;
  wallId: string;
  type: ApertureType;
  /** 0..1 along the wall from a→b (centre of the opening). */
  pos: number;
  width: number;
  height: number;
}

export interface Site {
  origin: Vec2;
  width: number;
  height: number;
  /** Optional irregular lot polygon (urban infill). When present, renderers
   *  draw this instead of the width×height rectangle. World ft. */
  boundary?: Vec2[];
}

export interface Style {
  column_size: number;
  heavy_lineweight_mm: number;
  light_lineweight_mm: number;
  corridor_lineweight_mm: number;
  wall_lineweight_mm: number;
  label_text_height: number;
  braille_text_height: number;
  corridor_dash_len: number;
  corridor_gap_len: number;
}

export interface Tactile3D {
  enabled: boolean;
  /** Feet. Full wall height for the visual model. */
  wall_height: number;
  /** Feet. Walls are clipped at this height for the tactile cut model. */
  cut_height: number;
  floor: boolean;
  floor_thickness: number;
  /** Overall print scale (model feet → represented size). */
  scale_factor: number;
}

// The modeling schema — a "way of thinking" that scopes which commands the console
// help, the assistant grammar, and the Forms surface. Every command still works if
// typed (hide-but-allow); the schema just shapes what's shown. A schema is no longer
// a property of the document — it is the LENS a single phase wears (see Phase.schema).
export type SchemaMode = "bays" | "massing" | "floorplan";

/** A design phase — one RESOLUTION at which the single building is authored
 *  (e.g. Massing → Structure → Plan). Phases are free-form: add as many as you
 *  like, each wearing one of the three schema lenses. `phase` is a grouping axis
 *  on geometry exactly parallel to `level` and `layer`; FOCUSING a phase scopes the
 *  canvas to it (others shown as reference), and the COMPOSITE view shows every
 *  phase solid as one whole building. Composition is subtractive, never a merge. */
export interface Phase {
  id: string;
  name: string;
  /** The vocabulary lens this phase wears (scopes console help / agent grammar / Forms). */
  schema: SchemaMode;
  /** Coarse→fine ordering (0 = coarsest). Drives the phase rail + read-back order. */
  order: number;
  /** Phase id this phase was one-shot derived from (provenance), or null. */
  derivedFrom: string | null;
  /** Footprint signature of `derivedFrom` captured at derive time (for drift checks), or null. */
  basis: string | null;
  /** "auto" = drawn (focus or reference per the active view); "hidden" = never drawn. */
  visible: "auto" | "hidden";
}

/** Reserved `State.focus` value meaning "show the whole building" (every visible
 *  phase rendered solid) — the composite view. Any other value is a phase id. */
export const COMPOSITE_FOCUS = "composite";

export interface State {
  schema: "rhino_controller_v4.0";
  /** Derived MIRROR of the focused phase's schema — kept in sync so the console
   *  help, agent grammar, Forms, and SchemaBar keep reading one scalar. Authoritative
   *  source is `phases[focus].schema`; never set this without updating `focus`. */
  mode: SchemaMode;
  /** Ordered design phases (coarse→fine), always ≥1. The building is authored through
   *  these lenses. A legacy/single-phase file has one phase, id "main". */
  phases: Phase[];
  /** The focused phase id, or COMPOSITE_FOCUS for the whole-building view. */
  focus: string;
  meta: { created: string; last_saved: string; notes: string };
  site: Site;
  style: Style;
  /** Rhino layers — always contains "Default". Geometry references these by name. */
  layers: Record<string, Layer>;
  bays: Record<string, Bay>;
  /** Free elements — the full building beyond the structural bay jig. */
  walls: Wall[];
  /** Geometric regions (floor plates + extruded boxes). Replaces program rooms. */
  regions: Region[];
  columns: Column[];
  openings: Opening[];
  levels: Level[];
  tactile3d: Tactile3D;
}

/** Result of applying one command to the state. */
export interface CommandResult {
  state: State;
  /** Spoken-style confirmation, prefixed `OK:` or `ERROR:` (matches the CLI). */
  message: string;
  ok: boolean;
  /** True when the command only reads (describe/list/help) — no state change. */
  readOnly?: boolean;
}
