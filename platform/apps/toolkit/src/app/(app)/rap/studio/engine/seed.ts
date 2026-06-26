// ─────────────────────────────────────────────────────────────────────────────
// Seed state + factory helpers. Values are ported from the real RAP
// `state.json` (schema rhino_controller_v4.0) so the starting model is
// recognisably the desktop tool's, just tidied for a first read.
// ─────────────────────────────────────────────────────────────────────────────

import type { Bay, State, Style, Tactile3D } from "./types";
import { toBraille } from "./braille";

export const DEFAULT_STYLE: Style = {
  column_size: 1.5,
  heavy_lineweight_mm: 1.4,
  light_lineweight_mm: 0.08,
  corridor_lineweight_mm: 0.35,
  wall_lineweight_mm: 0.25,
  label_text_height: 0.3,
  braille_text_height: 0.5,
  corridor_dash_len: 3.0,
  corridor_gap_len: 2.0
};

export const DEFAULT_TACTILE3D: Tactile3D = {
  enabled: true,
  wall_height: 9.0,
  cut_height: 4.0,
  floor: true,
  floor_thickness: 0.5,
  scale_factor: 1.0
};

/** A fresh, empty rectangular bay at the given origin. Used by `add bay`. */
export function newBay(name: string, origin: [number, number] = [10, 10]): Bay {
  return {
    grid_type: "rectangular",
    z_order: 0,
    origin,
    rotation_deg: 0,
    bays: [2, 2],
    spacing: [20, 20],
    corridor: { enabled: false, axis: "x", position: 1, width: 8, loading: "double" },
    walls: { enabled: true, thickness: 0.5 },
    apertures: [],
    void_center: null,
    void_size: null,
    void_shape: "rectangle",
    label: `Bay ${name}`,
    braille: toBraille(`Bay ${name}`),
    level: 0
  };
}

/** A clean, legible starting model: one bay with walls, a corridor, a door and
 *  a window, plus a small atrium void — enough to read in every channel. */
export function makeSeedState(): State {
  const bayA: Bay = {
    grid_type: "rectangular",
    z_order: 0,
    origin: [18, 12],
    rotation_deg: 0,
    bays: [3, 2],
    spacing: [20, 20],
    corridor: { enabled: true, axis: "x", position: 1, width: 8, loading: "double" },
    walls: { enabled: true, thickness: 0.5 },
    apertures: [
      { id: "d1", type: "door", axis: "x", gridline: 0, corner: 28, width: 3, height: 7, hinge: "start", swing: "positive" },
      { id: "w1", type: "window", axis: "y", gridline: 0, corner: 8, width: 6, height: 4, hinge: "start", swing: "positive" }
    ],
    void_center: null,
    void_size: null,
    void_shape: "rectangle",
    label: "Bay A",
    braille: toBraille("Bay A"),
    level: 0
  };

  return {
    schema: "rhino_controller_v4.0",
    meta: {
      created: "web-studio",
      last_saved: "web-studio",
      notes: "Authored in RAP Studio (web)"
    },
    site: { origin: [0, 0], width: 100, height: 100 },
    style: { ...DEFAULT_STYLE },
    bays: { A: bayA },
    levels: [{ name: "ground", z: 0, label: "Ground floor" }],
    tactile3d: { ...DEFAULT_TACTILE3D }
  };
}

/** Deep clone — the reducers never mutate the incoming state. */
export function cloneState(s: State): State {
  return JSON.parse(JSON.stringify(s));
}
