// ─────────────────────────────────────────────────────────────────────────────
// Seed state + factory helpers. Values are ported from the real RAP
// `state.json` (schema rhino_controller_v4.0) so the starting model is
// recognisably the desktop tool's, just tidied for a first read.
// ─────────────────────────────────────────────────────────────────────────────

import type { Bay, Layer, Phase, Region, SchemaMode, State, Style, Tactile3D } from "./types";
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

/** The reserved "Default" layer — always present, solid 0.25 mm pen, no tactile.
 *  Geometry with no explicit layer resolves to this. Lives here (the State
 *  factory home) so interpreter.ts and the renderers can share one definition. */
export function defaultLayer(): Layer {
  return { name: "Default", lineweight_mm: 0.25, linetype: "solid" };
}

/** One phase (id "main") wearing a given schema lens — for single-resolution
 *  starters and the base state. Coarsest order, shown, no derivation. */
export function singlePhase(name: string, schema: SchemaMode): Phase {
  return { id: "main", name, schema, order: 0, derivedFrom: null, basis: null, visible: "auto" };
}

/** A bare, valid State with one level and only the Default layer — the common
 *  base every starter builds on. */
export function baseState(notes = "Authored in RAP Studio (web)"): State {
  return {
    schema: "rhino_controller_v4.0",
    mode: "bays",
    phases: [singlePhase("Model", "bays")],
    focus: "main",
    meta: { created: "web-studio", last_saved: "web-studio", notes },
    site: { origin: [0, 0], width: 100, height: 100 },
    style: { ...DEFAULT_STYLE },
    layers: { Default: defaultLayer() },
    bays: {},
    walls: [],
    regions: [],
    columns: [],
    openings: [],
    levels: [{ name: "ground", z: 0, label: "Ground" }],
    tactile3d: { ...DEFAULT_TACTILE3D }
  };
}

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

/** The original sample, re-described in CAD-literal terms: one structural bay
 *  with walls/corridor/door/window, a free partition wall, and two floor plates
 *  (a 36×20 slab and a 24×20 slab) on a "slab" layer — enough to read in every
 *  channel. id "sample". */
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
      { id: "win1", type: "window", axis: "y", gridline: 0, corner: 8, width: 6, height: 4, hinge: "start", swing: "positive" }
    ],
    void_center: null,
    void_size: null,
    void_shape: "rectangle",
    label: "Bay A",
    braille: toBraille("Bay A"),
    level: 0,
    layer: "structure",
    phase: "structure"
  };

  return {
    schema: "rhino_controller_v4.0",
    mode: "bays",
    // The sample is a 3-phase ladder of ONE building: an (initially empty) Massing
    // phase, a Structure phase (Bay A), and a Plan phase (the partition wall + plates).
    // Opens in the composite (whole-building) view.
    phases: [
      { id: "massing", name: "Massing", schema: "massing", order: 0, derivedFrom: null, basis: null, visible: "auto" },
      { id: "structure", name: "Structure", schema: "bays", order: 1, derivedFrom: null, basis: null, visible: "auto" },
      { id: "plan", name: "Plan", schema: "floorplan", order: 2, derivedFrom: null, basis: null, visible: "auto" }
    ],
    focus: "structure",
    meta: {
      created: "web-studio",
      last_saved: "web-studio",
      notes: "Authored in RAP Studio (web)"
    },
    // An irregular urban-infill lot (not a plain rectangle).
    site: {
      origin: [0, 0],
      width: 100,
      height: 100,
      boundary: [
        [8, 6],
        [92, 6],
        [92, 78],
        [60, 94],
        [8, 78]
      ]
    },
    style: { ...DEFAULT_STYLE },
    layers: {
      Default: defaultLayer(),
      massing: { name: "massing", lineweight_mm: 0.35, linetype: "solid" },
      structure: { name: "structure", lineweight_mm: 0.35, linetype: "solid" },
      slab: { name: "slab", lineweight_mm: 0.25, linetype: "solid" }
    },
    bays: { A: bayA },
    // The building beyond the grid: two floor plates + an interior partition wall.
    walls: [{ id: "iw1", level: 0, a: [18, 32], b: [78, 32], thickness: 0.5, layer: "Default", phase: "plan" }],
    regions: [
      // Massing phase — the overall envelope the structure + plan sit inside.
      { id: "g_mass1", level: 0, kind: "box", origin: [18, 12], size: [60, 40], height: 36, name: "Envelope", layer: "massing", phase: "massing" },
      { id: "g_slab1", level: 0, kind: "plate", origin: [18, 12], size: [36, 20], thickness: 0.5, name: "Plate 1", layer: "slab", phase: "plan" },
      { id: "g_slab2", level: 0, kind: "plate", origin: [54, 12], size: [24, 20], thickness: 0.5, name: "Plate 2", layer: "slab", phase: "plan" }
    ],
    columns: [],
    openings: [],
    levels: [
      { name: "ground", z: 0, label: "Ground" },
      { name: "level2", z: 12, label: "Level 2" }
    ],
    tactile3d: { ...DEFAULT_TACTILE3D }
  };
}

/** Empty model — nothing placed, one "Ground" level, only the Default layer. id "empty". */
export function makeEmptyState(): State {
  return baseState("Empty model — start from scratch.");
}

/** A single structural bay (4×3 modules @ 24 ft) with perimeter walls on, drawn
 *  on a "structure" layer. id "bay-grid". */
export function makeBayGridStarter(): State {
  const s = baseState("Structural bay grid starter.");
  s.phases[0] = singlePhase("Structure", "bays");
  s.layers.structure = { name: "structure", lineweight_mm: 0.35, linetype: "solid" };
  s.bays = {
    A: {
      grid_type: "rectangular",
      z_order: 0,
      origin: [12, 12],
      rotation_deg: 0,
      bays: [4, 3],
      spacing: [24, 24],
      corridor: { enabled: false, axis: "x", position: 1, width: 8, loading: "double" },
      walls: { enabled: true, thickness: 0.5 },
      apertures: [],
      void_center: null,
      void_size: null,
      void_shape: "rectangle",
      label: "Bay A",
      braille: toBraille("Bay A"),
      level: 0,
      layer: "structure"
    }
  };
  return s;
}

/** A massing diagram — three extruded boxes of varied height/footprint on a
 *  "massing" layer, one level. id "massing". */
export function makeMassingStarter(): State {
  const s = baseState("Massing-diagram starter — three extruded boxes.");
  s.layers.massing = { name: "massing", lineweight_mm: 0.35, linetype: "solid" };
  const regions: Region[] = [
    { id: "g1", level: 0, kind: "box", origin: [10, 10], size: [40, 30], height: 24, name: "Box 1", layer: "massing" },
    { id: "g2", level: 0, kind: "box", origin: [56, 10], size: [24, 24], height: 60, name: "Box 2", layer: "massing" },
    { id: "g3", level: 0, kind: "box", origin: [10, 46], size: [70, 18], height: 12, name: "Box 3", layer: "massing" }
  ];
  s.regions = regions;
  s.mode = "massing";
  s.phases[0] = singlePhase("Massing", "massing");
  return s;
}

/** A single floor plate — a 60×40 ft, 0.5 ft slab on a "slab" layer, one level. id "floor-plate". */
export function makeFloorPlateStarter(): State {
  const s = baseState("Single floor-plate starter.");
  s.layers.slab = { name: "slab", lineweight_mm: 0.25, linetype: "solid" };
  s.regions = [{ id: "g1", level: 0, kind: "plate", origin: [10, 10], size: [60, 40], thickness: 0.5, name: "Plate 1", layer: "slab" }];
  s.mode = "floorplan";
  s.phases[0] = singlePhase("Floor plan", "floorplan");
  return s;
}

/** A loadable starter model for the studio toolbar. */
export interface Starter {
  id: string;
  label: string;
  description: string;
  make: () => State;
}

export const STARTERS: Starter[] = [
  { id: "sample", label: "Sample model", description: "A bay, a partition wall, and two floor plates — reads in every channel.", make: makeSeedState },
  { id: "empty", label: "Empty", description: "Nothing placed — one level, the Default layer only.", make: makeEmptyState },
  { id: "bay-grid", label: "Structural bay grid", description: "One 4×3 structural bay @ 24 ft with perimeter walls, on a structure layer.", make: makeBayGridStarter },
  { id: "massing", label: "Massing diagram", description: "Three extruded boxes of varied height on a massing layer.", make: makeMassingStarter },
  { id: "floor-plate", label: "Single floor plate", description: "One 60×40 ft, 0.5 ft slab on a slab layer.", make: makeFloorPlateStarter }
];

/** Deep clone — the reducers never mutate the incoming state. */
export function cloneState(s: State): State {
  return JSON.parse(JSON.stringify(s));
}
