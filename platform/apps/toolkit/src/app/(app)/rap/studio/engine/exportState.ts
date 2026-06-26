// ─────────────────────────────────────────────────────────────────────────────
// Full-state exporter — turns RAP Studio's working state into a COMPLETE
// `rhino_controller_v4.0` file that the desktop Rhino Watcher can load.
//
// The studio holds a focused subset; the desktop tool writes many more top-level
// keys. Here we fill every key with safe defaults so the file loads cleanly, and
// we ALSO preserve the studio's richer building elements (free walls / rooms /
// columns / openings) under `web_*` keys so a round-trip is lossless. The same
// string feeds the "Download state.json" button and the Drive-Rhino push.
// ─────────────────────────────────────────────────────────────────────────────

import type { State } from "./types";

export function toFullStateJson(state: State): Record<string, unknown> {
  const blocks = {
    door: { symbol: "arc_swing", label_prefix: "D", show_label: true, label_height: 0.3, tactile_weight_mm: 0.5 },
    window: { symbol: "double_line", label_prefix: "W", show_label: true, label_height: 0.3, tactile_weight_mm: 0.5 },
    portal: { symbol: "open", label_prefix: "P", show_label: true, label_height: 0.3, tactile_weight_mm: 0.5 },
    room: { symbol: "label", label_prefix: "R", show_label: true, label_height: 0.3, tactile_weight_mm: 0.5 }
  };

  // Project the studio's rooms into the desktop `rooms` dict (keyed by id),
  // carrying our extra fields so nothing is lost.
  const rooms: Record<string, unknown> = {};
  for (const r of state.rooms) {
    rooms[r.id] = {
      type: "room",
      source_bay: null,
      label: r.name,
      braille: r.braille,
      use: r.use,
      origin: r.origin,
      size: r.size,
      level: r.level,
      hatch_image: "",
      hatch_scale: 1.0,
      hatch_rotation: 0.0
    };
  }

  // Ensure every bay carries the full v4.0 field set.
  const bays: Record<string, unknown> = {};
  for (const [k, b] of Object.entries(state.bays)) {
    bays[k] = {
      grid_type: b.grid_type,
      z_order: b.z_order,
      origin: b.origin,
      rotation_deg: b.rotation_deg,
      bays: b.bays,
      spacing: b.spacing,
      spacing_x: null,
      spacing_y: null,
      rings: 4,
      ring_spacing: 20.0,
      arms: 8,
      arc_deg: 360.0,
      arc_start_deg: 0.0,
      corridor: b.corridor,
      walls: b.walls,
      apertures: b.apertures,
      void_center: b.void_center,
      void_size: b.void_size,
      void_shape: b.void_shape,
      label: b.label,
      braille: b.braille,
      level: b.level ?? 0,
      cells: {}
    };
  }

  const site = {
    origin: state.site.origin,
    width: state.site.width,
    height: state.site.height,
    corners: state.site.boundary ?? [
      [state.site.origin[0], state.site.origin[1]],
      [state.site.origin[0] + state.site.width, state.site.origin[1]],
      [state.site.origin[0] + state.site.width, state.site.origin[1] + state.site.height],
      [state.site.origin[0], state.site.origin[1] + state.site.height]
    ]
  };

  return {
    schema: "rhino_controller_v4.0",
    meta: state.meta,
    site,
    zones: {},
    grid: null,
    style: { ...state.style, label_offset: 3.0, background_pad: 2.0, arc_segments: 16 },
    bays,
    blocks,
    rooms,
    legend: {
      enabled: true,
      position: "bottom-right",
      width: 30,
      title: "Legend",
      title_braille: "",
      swatch_size: 3,
      row_height: 4,
      text_height: 0.3,
      braille_height: 0.5,
      padding: 1,
      border_weight_mm: 0.5,
      show_braille: true,
      show_hatches: true,
      show_apertures: true
    },
    tactile3d: state.tactile3d,
    hatch_library_path: "./hatches/",
    print: { dpi: 300, paper_size: "letter", margin_in: 0.5 },
    bambu: { ip: "", access_code: "", serial: "", printer_model: "p1s", print_scale: 1.0, stl_path: "", slicer_path: "" },
    levels: state.levels,
    slabs: [],
    tts: { enabled: false, rate: 2 },
    section: { axis: "x", offset: 0 },

    // ── Studio-native building elements (lossless round-trip) ──
    web_walls: state.walls,
    web_rooms: state.rooms,
    web_columns: state.columns,
    web_openings: state.openings
  };
}

export function fullStateString(state: State): string {
  return JSON.stringify(toFullStateJson(state), null, 2);
}
