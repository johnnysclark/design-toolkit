// ─────────────────────────────────────────────────────────────────────────────
// RAP Studio — the canonical state model.
//
// This is a faithful TypeScript subset of the real RAP `state.json`
// (schema `rhino_controller_v4.0`). The web tool holds this state in the
// browser and renders it many ways (2D tactile plan, 3D, STL, Braille, text) —
// exactly the project's "sense-agnostic state + renderer parity" idea. Because
// the shape matches the real file, anything the tool emits round-trips to the
// desktop Rhino Watcher.
//
// We deliberately keep a *subset* of the fields the desktop controller writes
// (the ones the web renderers use). Unknown fields on a loaded file are
// preserved verbatim via `extra` so a round-tripped file isn't lossy.
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
  level?: number;
}

export interface Level {
  name: string;
  z: number;
  label: string;
}

export interface Site {
  origin: Vec2;
  width: number;
  height: number;
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

export interface State {
  schema: "rhino_controller_v4.0";
  meta: { created: string; last_saved: string; notes: string };
  site: Site;
  style: Style;
  bays: Record<string, Bay>;
  levels: Level[];
  tactile3d: Tactile3D;
  /** Unknown top-level keys from a loaded file, preserved for lossless export. */
  extra?: Record<string, unknown>;
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
