// ─────────────────────────────────────────────────────────────────────────────
// The command interpreter — a documented subset of the real RAP Controller's
// grammar (controller_cli.py). Each command edits a CLONE of the state and
// returns a spoken-style `OK:`/`ERROR:` confirmation, exactly like the CLI, so
// the same line can be printed to the log AND spoken to a screen-reader user.
//
// The natural-language agent (Phase 4) compiles to these same verbs, so every
// AI edit is auditable as a plain command. Keep this grammar in lockstep with
// COMMAND_GRAMMAR below (which the agent is taught).
// ─────────────────────────────────────────────────────────────────────────────

import type { ApertureType, Axis, Bay, CommandResult, Layer, LineType, Region, SchemaMode, State, TactileKind, TactilePattern, Vec2 } from "./types";
import { cloneState, defaultLayer, makeSeedState, newBay } from "./seed";
import { toBraille } from "./braille";

const LINETYPES: LineType[] = ["solid", "dashed", "dotted", "center", "hidden"];
const TACTILE_KINDS: TactileKind[] = ["none", "dots", "lines", "crosshatch", "grid"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function nextId(existing: { id: string }[], prefix: string): string {
  let i = existing.length + 1;
  while (existing.some((e) => e.id === `${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

/** Shared keyword-argument parser. After the fixed positional args, the rest of
 *  the tokens are read as `<key> <value>` pairs in any order. An unknown key is
 *  reported as an error naming the allowed keys; multi-word values use quotes
 *  (the tokenizer already handles `"`). */
function parseOpts(tokens: string[], start: number, keys: string[]): { opts: Record<string, string>; error?: string } {
  const opts: Record<string, string> = {};
  for (let i = start; i < tokens.length; i += 2) {
    const key = tokens[i];
    if (!keys.includes(key)) return { opts, error: `Unknown option "${key}". Allowed: ${keys.join(", ")}.` };
    const val = tokens[i + 1];
    if (val === undefined) return { opts, error: `Option "${key}" needs a value.` };
    opts[key] = val;
  }
  return { opts };
}

/** Build a TactilePattern from a kind plus optional spacing/angle/height opts.
 *  Returns `{ pattern: null }` for kind "none" (flat); `{ error }` on a bad kind
 *  or value. spacing default 4 mm, angle 0°, height 0.6 mm (contract A.1). */
function buildTactile(kind: string | undefined, opts: Record<string, string>): { pattern?: TactilePattern | null; error?: string } {
  if (kind === undefined) return { error: `Usage: tactile <${TACTILE_KINDS.join("|")}> [spacing <mm>] [angle <deg>] [height <mm>]` };
  if (!TACTILE_KINDS.includes(kind as TactileKind)) return { error: `Unknown tactile pattern "${kind}". One of: ${TACTILE_KINDS.join(", ")}.` };
  if (kind === "none") return { pattern: null };
  const spacing = opts.spacing !== undefined ? Number(opts.spacing) : 4;
  const angle = opts.angle !== undefined ? Number(opts.angle) : 0;
  const height = opts.height !== undefined ? Number(opts.height) : 0.6;
  if (!Number.isFinite(spacing) || spacing <= 0) return { error: "Tactile spacing must be a positive number of mm." };
  if (!Number.isFinite(angle)) return { error: "Tactile angle must be a number of degrees." };
  if (!Number.isFinite(height) || height <= 0) return { error: "Tactile height must be a positive number of mm." };
  return { pattern: { pattern: kind as TactileKind, spacing_mm: spacing, angle_deg: angle, height_mm: height } };
}

/** A one-line, spoken-style summary of a tactile pattern (or "" when flat). */
function tactileSummary(t: TactilePattern | undefined | null): string {
  if (!t || t.pattern === "none") return "";
  return `${t.pattern} ${t.spacing_mm} mm @ ${t.angle_deg}°`;
}

/** Count every piece of geometry that references a given layer name (so a layer
 *  can't be removed out from under live geometry). */
function layerRefCount(state: State, name: string): number {
  let n = 0;
  for (const r of state.regions) if ((r.layer ?? "Default") === name) n++;
  for (const w of state.walls) if ((w.layer ?? "Default") === name) n++;
  for (const c of state.columns) if ((c.layer ?? "Default") === name) n++;
  for (const b of Object.values(state.bays)) if ((b.layer ?? "Default") === name) n++;
  return n;
}

/** Scan a token slice for an optional `layer <name>` tail keyword; validate it
 *  names an existing layer. Returns no layer when the keyword is absent. */
function pickLayer(state: State, tokens: string[], start: number): { layer?: string; error?: string } {
  const idx = tokens.indexOf("layer", start);
  if (idx === -1) return {};
  const name = tokens[idx + 1];
  if (!name) return { error: "Usage: … layer <name>" };
  if (!state.layers[name]) return { error: `No layer "${name}". Create it first: layer add ${name}` };
  return { layer: name };
}

/** Split input into tokens, respecting double-quoted strings (port of the CLI). */
export function tokenize(raw: string): string[] {
  const tokens: string[] = [];
  let buf = "";
  let inQ = false;
  for (const ch of raw) {
    if (ch === '"') {
      inQ = !inQ;
    } else if (/\s/.test(ch) && !inQ) {
      if (buf) {
        tokens.push(buf);
        buf = "";
      }
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

const ok = (state: State, message: string): CommandResult => ({ state, message: `OK: ${message}`, ok: true });
const err = (state: State, message: string): CommandResult => ({ state, message: `ERROR: ${message}`, ok: false, readOnly: true });
const read = (state: State, message: string): CommandResult => ({ state, message, ok: true, readOnly: true });

function num(tok: string | undefined): number | null {
  if (tok === undefined) return null;
  const n = Number(tok);
  return Number.isFinite(n) ? n : null;
}

function requireBay(state: State, name: string): Bay | null {
  return state.bays[name] ?? null;
}

// ─── Command groups ──────────────────────────────────────────────────────────

function cmdAddBay(state: State, tokens: string[]): CommandResult {
  const name = tokens[2];
  if (!name) return err(state, "Usage: add bay <name> [at <x> <y>]");
  if (["add", "remove", "move", "thickness", "list"].includes(name))
    return err(state, `"${name}" is a reserved word and can't be a bay name. Pick another (e.g. ${name.toUpperCase()}1).`);
  if (state.bays[name]) return err(state, `Bay ${name} already exists.`);
  let origin: [number, number] = [10 + Object.keys(state.bays).length * 8, 10];
  if (tokens[3] === "at") {
    const x = num(tokens[4]);
    const y = num(tokens[5]);
    if (x === null || y === null) return err(state, "Usage: add bay <name> at <x> <y>");
    origin = [x, y];
  }
  const next = cloneState(state);
  next.bays[name] = newBay(name, origin);
  return ok(next, `Added bay ${name} at (${origin[0]}, ${origin[1]}), 2×2 grid, walls on.`);
}

function cmdRemoveBay(state: State, tokens: string[]): CommandResult {
  const name = tokens[2];
  if (!requireBay(state, name)) return err(state, `No bay named ${name}.`);
  const next = cloneState(state);
  delete next.bays[name];
  return ok(next, `Removed bay ${name}.`);
}

function cmdSetBay(state: State, tokens: string[]): CommandResult {
  // set bay <name> <field> <values...>
  const name = tokens[2];
  const field = tokens[3];
  const bay = requireBay(state, name);
  if (!bay) return err(state, `No bay named ${name}. Try: add bay ${name}`);
  const next = cloneState(state);
  const b = next.bays[name];
  switch (field) {
    case "origin": {
      const x = num(tokens[4]);
      const y = num(tokens[5]);
      if (x === null || y === null) return err(state, "Usage: set bay <name> origin <x> <y>");
      const was = b.origin;
      b.origin = [x, y];
      return ok(next, `Bay ${name} origin = (${x}, ${y}). Was (${was[0]}, ${was[1]}).`);
    }
    case "bays": {
      const nx = num(tokens[4]);
      const ny = num(tokens[5]);
      if (nx === null || ny === null || nx < 1 || ny < 1) return err(state, "Usage: set bay <name> bays <nx> <ny> (≥1)");
      b.bays = [Math.round(nx), Math.round(ny)];
      return ok(next, `Bay ${name} grid = ${Math.round(nx)}×${Math.round(ny)} modules.`);
    }
    case "spacing": {
      const sx = num(tokens[4]);
      const sy = num(tokens[5]);
      if (sx === null || sy === null || sx <= 0 || sy <= 0) return err(state, "Usage: set bay <name> spacing <sx> <sy> (ft)");
      b.spacing = [sx, sy];
      return ok(next, `Bay ${name} spacing = ${sx}×${sy} ft.`);
    }
    case "rotation": {
      const deg = num(tokens[4]);
      if (deg === null) return err(state, "Usage: set bay <name> rotation <degrees>");
      b.rotation_deg = deg;
      return ok(next, `Bay ${name} rotation = ${deg}°.`);
    }
    case "label": {
      const text = tokens.slice(4).join(" ");
      if (!text) return err(state, "Usage: set bay <name> label <text>");
      b.label = text;
      b.braille = toBraille(text);
      return ok(next, `Bay ${name} label = "${text}" (braille updated).`);
    }
    case "void_center": {
      const x = num(tokens[4]);
      const y = num(tokens[5]);
      if (x === null || y === null) return err(state, "Usage: set bay <name> void_center <x> <y> (site ft)");
      b.void_center = [x, y];
      if (!b.void_size) b.void_size = [20, 12];
      return ok(next, `Bay ${name} void centre = (${x}, ${y}).`);
    }
    case "void_size": {
      const w = num(tokens[4]);
      const h = num(tokens[5]);
      if (w === null || h === null || w <= 0 || h <= 0) return err(state, "Usage: set bay <name> void_size <w> <h> (ft)");
      b.void_size = [w, h];
      if (!b.void_center) b.void_center = [b.origin[0] + 20, b.origin[1] + 20];
      return ok(next, `Bay ${name} void size = ${w}×${h} ft.`);
    }
    case "void_shape": {
      const shape = tokens[4];
      if (shape === "none") {
        b.void_center = null;
        b.void_size = null;
        return ok(next, `Bay ${name} void removed.`);
      }
      if (shape !== "rectangle" && shape !== "rect" && shape !== "circle")
        return err(state, "Usage: set bay <name> void_shape rect|circle|none");
      b.void_shape = shape === "circle" ? "circle" : "rectangle";
      return ok(next, `Bay ${name} void shape = ${b.void_shape}.`);
    }
    default:
      return err(state, `Unknown bay field "${field}". Try: origin · bays · spacing · rotation · label · void_center · void_size · void_shape`);
  }
}

function cmdWall(state: State, tokens: string[]): CommandResult {
  const name = tokens[1];
  const arg = tokens[2];
  const bay = requireBay(state, name);
  if (!bay) return err(state, `No bay named ${name}.`);
  const next = cloneState(state);
  const b = next.bays[name];
  if (arg === "on" || arg === "off") {
    b.walls.enabled = arg === "on";
    return ok(next, `Bay ${name} walls ${arg.toUpperCase()}, ${b.walls.thickness} ft thick.`);
  }
  if (arg === "thickness") {
    const t = num(tokens[3]);
    if (t === null || t <= 0) return err(state, "Usage: wall <bay> thickness <feet>");
    b.walls.thickness = t;
    return ok(next, `Bay ${name} wall thickness = ${t} ft.`);
  }
  return err(state, "Usage: wall <bay> on|off | wall <bay> thickness <ft>");
}

function cmdCorridor(state: State, tokens: string[]): CommandResult {
  const name = tokens[1];
  const arg = tokens[2];
  const bay = requireBay(state, name);
  if (!bay) return err(state, `No bay named ${name}.`);
  const next = cloneState(state);
  const c = next.bays[name].corridor;
  if (arg === "on" || arg === "off") {
    c.enabled = arg === "on";
    return ok(next, `Bay ${name} corridor ${arg.toUpperCase()}.`);
  }
  if (arg === "axis") {
    if (tokens[3] !== "x" && tokens[3] !== "y") return err(state, "Usage: corridor <bay> axis x|y");
    c.axis = tokens[3] as Axis;
    return ok(next, `Bay ${name} corridor axis = ${c.axis}.`);
  }
  if (arg === "width") {
    const w = num(tokens[3]);
    if (w === null || w <= 0) return err(state, "Usage: corridor <bay> width <ft>");
    c.width = w;
    return ok(next, `Bay ${name} corridor width = ${w} ft.`);
  }
  if (arg === "position") {
    const p = num(tokens[3]);
    if (p === null) return err(state, "Usage: corridor <bay> position <gridline #>");
    c.position = p;
    return ok(next, `Bay ${name} corridor position = gridline ${p}.`);
  }
  return err(state, "Usage: corridor <bay> on|off|axis|width|position …");
}

function cmdAperture(state: State, tokens: string[]): CommandResult {
  const name = tokens[1];
  const sub = tokens[2];
  const bay = requireBay(state, name);
  if (!bay) return err(state, `No bay named ${name}.`);

  if (sub === "list") {
    if (bay.apertures.length === 0) return read(state, `Bay ${name} has no apertures.`);
    const lines = bay.apertures.map(
      (a) => `  ${a.id}: ${a.type} on ${a.axis}-wall gridline ${a.gridline}, ${a.width}×${a.height} ft @ ${a.corner}`
    );
    return read(state, `Bay ${name} apertures:\n${lines.join("\n")}`);
  }

  const next = cloneState(state);
  const b = next.bays[name];

  if (sub === "add") {
    // aperture <bay> add <id> <type> <axis> <gridline> <corner> <width> <height>
    const id = tokens[3];
    const type = tokens[4] as ApertureType;
    const axis = tokens[5] as Axis;
    const gridline = num(tokens[6]);
    const corner = num(tokens[7]);
    const width = num(tokens[8]);
    const height = num(tokens[9]);
    if (!id || !["door", "window", "portal"].includes(type) || (axis !== "x" && axis !== "y") || gridline === null || corner === null || width === null || height === null)
      return err(state, "Usage: aperture <bay> add <id> <door|window|portal> <x|y> <gridline> <corner> <width> <height>");
    if (width <= 0 || height <= 0) return err(state, "Aperture width and height must be > 0 ft.");
    // Apertures only render on a perimeter wall (gridline 0 or the far edge);
    // an interior gridline would store + report a door that draws nothing — a
    // renderer-parity break a non-visual user couldn't catch.
    const gl = Math.round(gridline);
    const far = axis === "x" ? bay.bays[1] : bay.bays[0];
    if (gl !== 0 && gl !== far) return err(state, `Gridline ${gl} isn't a perimeter wall of bay ${name} — use 0 or ${far} (apertures sit on the bay's outer edges).`);
    if (b.apertures.some((a) => a.id === id)) return err(state, `Aperture ${id} already exists in bay ${name}.`);
    b.apertures.push({ id, type, axis, gridline: Math.round(gridline), corner, width, height, hinge: "start", swing: "positive" });
    return ok(next, `Added ${type} ${id} to bay ${name} (${axis}-wall gridline ${Math.round(gridline)}, ${width}×${height} ft).`);
  }

  if (sub === "remove") {
    const id = tokens[3];
    const before = b.apertures.length;
    b.apertures = b.apertures.filter((a) => a.id !== id);
    if (b.apertures.length === before) return err(state, `No aperture ${id} in bay ${name}.`);
    return ok(next, `Removed aperture ${id} from bay ${name}.`);
  }

  return err(state, "Usage: aperture <bay> add|remove|list …");
}

function cmdSetSite(state: State, tokens: string[]): CommandResult {
  const field = tokens[2];
  // set site boundary <x1,y1> <x2,y2> … | clear  — the irregular infill lot
  if (field === "boundary") {
    const next = cloneState(state);
    if (tokens[3] === "clear") {
      delete next.site.boundary;
      return ok(next, "Site boundary cleared (back to a rectangle).");
    }
    const pts: Vec2[] = [];
    for (const t of tokens.slice(3)) {
      const parts = t.split(",");
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      if (parts.length !== 2 || !Number.isFinite(x) || !Number.isFinite(y))
        return err(state, "Usage: set site boundary <x1,y1> <x2,y2> <x3,y3> … (≥3 points) | clear");
      pts.push([x, y]);
    }
    if (pts.length < 3) return err(state, "A boundary needs ≥3 points: set site boundary <x1,y1> <x2,y2> <x3,y3> …");
    next.site.boundary = pts;
    return ok(next, `Site boundary set with ${pts.length} points.`);
  }
  // set site width|height <ft>
  const v = num(tokens[3]);
  if ((field !== "width" && field !== "height") || v === null || v <= 0)
    return err(state, "Usage: set site width|height <ft> | set site boundary <x,y> …");
  const next = cloneState(state);
  next.site[field] = v;
  return ok(next, `Site ${field} = ${v} ft.`);
}

// ── Free elements: interior/exterior walls, rooms, columns, openings ──────────

function cmdWallFree(state: State, tokens: string[]): CommandResult {
  const sub = tokens[1];
  if (sub === "list") {
    if (state.walls.length === 0) return read(state, "No free walls yet. Try: wall add 18 12 78 12");
    return read(state, `Free walls (${state.walls.length}):\n` + state.walls.map((w) => `  ${w.id}: (${w.a[0]},${w.a[1]})→(${w.b[0]},${w.b[1]}), ${w.thickness}ft, L${w.level}`).join("\n"));
  }
  const next = cloneState(state);
  if (sub === "add") {
    // wall add [id] <x1> <y1> <x2> <y2> [thickness] [level]
    let i = 2;
    let id: string | undefined;
    if (tokens[2] !== undefined && !Number.isFinite(Number(tokens[2]))) {
      id = tokens[2];
      i = 3;
    }
    const x1 = num(tokens[i]);
    const y1 = num(tokens[i + 1]);
    const x2 = num(tokens[i + 2]);
    const y2 = num(tokens[i + 3]);
    if (x1 === null || y1 === null || x2 === null || y2 === null)
      return err(state, "Usage: wall add [id] <x1> <y1> <x2> <y2> [thickness] [level]");
    const th = num(tokens[i + 4]) ?? 0.5;
    if (th <= 0) return err(state, "Wall thickness must be > 0 ft.");
    const level = Math.round(num(tokens[i + 5]) ?? 0);
    if (level < 0 || level >= next.levels.length) return err(state, `No level ${level} (levels are 0–${next.levels.length - 1}). Add one first: level add <name> <z>.`);
    if (!id) id = nextId(next.walls, "w");
    if (next.walls.some((w) => w.id === id)) return err(state, `Wall ${id} already exists.`);
    const pl = pickLayer(next, tokens, i + 4);
    if (pl.error) return err(state, pl.error);
    next.walls.push({ id, level, a: [x1, y1], b: [x2, y2], thickness: th, layer: pl.layer ?? "Default" });
    return ok(next, `Added wall ${id} (${x1},${y1})→(${x2},${y2}), ${th} ft thick, level ${level}, on layer ${pl.layer ?? "Default"}.`);
  }
  if (sub === "remove") {
    const id = tokens[2];
    const before = next.walls.length;
    next.walls = next.walls.filter((w) => w.id !== id);
    if (next.walls.length === before) return err(state, `No wall ${id}.`);
    next.openings = next.openings.filter((o) => o.wallId !== id);
    return ok(next, `Removed wall ${id} (and its openings).`);
  }
  if (sub === "move") {
    const id = tokens[2];
    const w = next.walls.find((wl) => wl.id === id);
    if (!w) return err(state, `No wall ${id}.`);
    const x1 = num(tokens[3]);
    const y1 = num(tokens[4]);
    const x2 = num(tokens[5]);
    const y2 = num(tokens[6]);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return err(state, "Usage: wall move <id> <x1> <y1> <x2> <y2>");
    w.a = [x1, y1];
    w.b = [x2, y2];
    return ok(next, `Moved wall ${id}.`);
  }
  if (sub === "thickness") {
    const id = tokens[2];
    const w = next.walls.find((wl) => wl.id === id);
    if (!w) return err(state, `No wall ${id}.`);
    const t = num(tokens[3]);
    if (t === null || t <= 0) return err(state, "Usage: wall thickness <id> <ft>");
    w.thickness = t;
    return ok(next, `Wall ${id} thickness = ${t} ft.`);
  }
  return err(state, "Usage: wall add|remove|move|thickness|list … (bay walls: wall <bay> on|off)");
}

// ── Rhino layers ──────────────────────────────────────────────────────────────

function cmdLayer(state: State, tokens: string[]): CommandResult {
  const sub = tokens[1];

  if (sub === "list") {
    const names = Object.keys(state.layers);
    const rows = names.map((n) => {
      const l = state.layers[n];
      const t = tactileSummary(l.tactile);
      return `  ${l.name}: ${l.lineweight_mm} mm, ${l.linetype}${t ? `, ${t}` : ""}`;
    });
    return read(state, `Layers (${names.length}):\n${rows.join("\n")}`);
  }

  if (sub === "add") {
    const name = tokens[2];
    if (!name) return err(state, "Usage: layer add <name> [linetype <…>] [lineweight <mm>] [tactile <kind> …]");
    if (["add", "set", "remove", "list"].includes(name)) return err(state, `"${name}" is a reserved word and can't be a layer name.`);
    if (state.layers[name]) return err(state, `Layer "${name}" already exists.`);
    const { opts, error } = parseOpts(tokens, 3, ["linetype", "lineweight", "tactile", "spacing", "angle", "height"]);
    if (error) return err(state, error);
    const layer: Layer = { name, lineweight_mm: 0.25, linetype: "solid" };
    if (opts.linetype !== undefined) {
      if (!LINETYPES.includes(opts.linetype as LineType)) return err(state, `Unknown linetype "${opts.linetype}". One of: ${LINETYPES.join(", ")}.`);
      layer.linetype = opts.linetype as LineType;
    }
    if (opts.lineweight !== undefined) {
      const lw = Number(opts.lineweight);
      if (!Number.isFinite(lw) || lw <= 0) return err(state, "Lineweight must be a positive number of mm.");
      layer.lineweight_mm = lw;
    }
    if (opts.tactile !== undefined) {
      const t = buildTactile(opts.tactile, opts);
      if (t.error) return err(state, t.error);
      if (t.pattern) layer.tactile = t.pattern;
    }
    const next = cloneState(state);
    next.layers[name] = layer;
    return ok(next, `Added layer "${name}" (${layer.linetype}, ${layer.lineweight_mm} mm${layer.tactile ? `, ${tactileSummary(layer.tactile)}` : ""}).`);
  }

  if (sub === "set") {
    const name = tokens[2];
    const field = tokens[3];
    if (!name || !state.layers[name]) return err(state, `No layer "${name}". Create it first: layer add ${name}`);
    const next = cloneState(state);
    const l = next.layers[name];
    if (field === "linetype") {
      const v = tokens[4];
      if (!v || !LINETYPES.includes(v as LineType)) return err(state, `Usage: layer set ${name} linetype <${LINETYPES.join("|")}>`);
      l.linetype = v as LineType;
      return ok(next, `Layer "${name}" linetype = ${v}.`);
    }
    if (field === "lineweight") {
      const lw = num(tokens[4]);
      if (lw === null || lw <= 0) return err(state, `Usage: layer set ${name} lineweight <mm>`);
      l.lineweight_mm = lw;
      return ok(next, `Layer "${name}" lineweight = ${lw} mm.`);
    }
    if (field === "tactile") {
      const { opts, error } = parseOpts(tokens, 5, ["spacing", "angle", "height"]);
      if (error) return err(state, error);
      const t = buildTactile(tokens[4], opts);
      if (t.error) return err(state, t.error);
      if (t.pattern) l.tactile = t.pattern;
      else delete l.tactile;
      return ok(next, t.pattern ? `Layer "${name}" tactile = ${tactileSummary(t.pattern)}.` : `Layer "${name}" tactile cleared (flat).`);
    }
    return err(state, "Usage: layer set <name> linetype|lineweight|tactile …");
  }

  if (sub === "remove") {
    const name = tokens[2];
    if (!name || !state.layers[name]) return err(state, `No layer "${name}".`);
    if (name === "Default") return err(state, `The "Default" layer can't be removed.`);
    const refs = layerRefCount(state, name);
    if (refs > 0) return err(state, `Layer "${name}" still has ${refs} element${refs === 1 ? "" : "s"} on it — move or delete them first.`);
    const next = cloneState(state);
    delete next.layers[name];
    return ok(next, `Removed layer "${name}".`);
  }

  return err(state, "Usage: layer add|set|remove|list …");
}

// ── Geometric regions: floor plates + extruded boxes ──────────────────────────

/** Shared `set <id> <field> …` handler for both region kinds. `orig` is the
 *  untouched state (returned on error so a half-built `next` is discarded);
 *  `next` is the clone whose region `r` is mutated in place. */
function regionSet(orig: State, next: State, r: Region, tokens: string[], kind: "plate" | "box"): CommandResult {
  const field = tokens[3];
  const id = r.id;
  switch (field) {
    case "origin": {
      const x = num(tokens[4]);
      const y = num(tokens[5]);
      if (x === null || y === null) return err(orig, `Usage: ${kind} set ${id} origin <x> <y>`);
      r.origin = [x, y];
      return ok(next, `${cap(kind)} ${id} origin = (${x}, ${y}).`);
    }
    case "size": {
      const w = num(tokens[4]);
      const h = num(tokens[5]);
      if (w === null || h === null || w <= 0 || h <= 0) return err(orig, `Usage: ${kind} set ${id} size <w> <h>`);
      r.size = [w, h];
      return ok(next, `${cap(kind)} ${id} footprint = ${w}×${h} ft.`);
    }
    case "thickness": {
      if (kind !== "plate") return err(orig, `Boxes have no thickness — set the height instead: box set ${id} height <ft>.`);
      const t = num(tokens[4]);
      if (t === null || t <= 0) return err(orig, `Usage: plate set ${id} thickness <ft>`);
      r.thickness = t;
      return ok(next, `Plate ${id} thickness = ${t} ft.`);
    }
    case "height": {
      if (kind !== "box") return err(orig, `Plates have no height — set the thickness instead: plate set ${id} thickness <ft>.`);
      const hh = num(tokens[4]);
      if (hh === null || hh <= 0) return err(orig, `Usage: box set ${id} height <ft>`);
      r.height = hh;
      return ok(next, `Box ${id} height = ${hh} ft.`);
    }
    case "layer": {
      const name = tokens[4];
      if (!name || !next.layers[name]) return err(orig, `No layer "${name}". Create it first: layer add ${name}`);
      r.layer = name;
      return ok(next, `${cap(kind)} ${id} on layer ${name}.`);
    }
    case "level": {
      const l = num(tokens[4]);
      if (l === null) return err(orig, `Usage: ${kind} set ${id} level <n>`);
      const lv = Math.round(l);
      if (lv < 0 || lv >= next.levels.length) return err(orig, `No level ${lv} (levels are 0–${next.levels.length - 1}). Add one first: level add <name> <z>.`);
      r.level = lv;
      return ok(next, `${cap(kind)} ${id} on level ${lv}.`);
    }
    case "name": {
      const nm = tokens.slice(4).join(" ");
      if (!nm) return err(orig, `Usage: ${kind} set ${id} name <text>`);
      r.name = nm;
      return ok(next, `${cap(kind)} ${id} = "${nm}".`);
    }
    case "tactile": {
      const { opts, error } = parseOpts(tokens, 5, ["spacing", "angle", "height"]);
      if (error) return err(orig, error);
      const t = buildTactile(tokens[4], opts);
      if (t.error) return err(orig, t.error);
      if (t.pattern) r.tactile = t.pattern;
      else delete r.tactile;
      return ok(next, t.pattern ? `${cap(kind)} ${id} tactile override = ${tactileSummary(t.pattern)}.` : `${cap(kind)} ${id} tactile override cleared (back to its layer).`);
    }
    default:
      return err(orig, `Unknown field "${field}". Try: origin · size · ${kind === "plate" ? "thickness" : "height"} · layer · level · name · tactile`);
  }
}

function cmdPlate(state: State, tokens: string[]): CommandResult {
  const sub = tokens[1];
  if (sub === "list") {
    const plates = state.regions.filter((r) => r.kind === "plate");
    if (plates.length === 0) return read(state, "No floor plates yet. Try: floor plate add 0 0 36 20");
    return read(state, `Floor plates (${plates.length}):\n` + plates.map((r) => `  ${r.id}: ${r.name} ${r.size[0]}×${r.size[1]}ft, ${r.thickness ?? 0}ft thick @ (${r.origin[0]},${r.origin[1]}) on ${r.layer} L${r.level ?? 0}`).join("\n"));
  }
  const next = cloneState(state);
  if (sub === "add") {
    // plate add [id] <x> <y> <w> <h> [thickness <ft>] [layer <name>] [name <text>]
    let i = 2;
    let id: string | undefined;
    if (tokens[2] !== undefined && !Number.isFinite(Number(tokens[2]))) {
      id = tokens[2];
      i = 3;
    }
    const x = num(tokens[i]);
    const y = num(tokens[i + 1]);
    const w = num(tokens[i + 2]);
    const h = num(tokens[i + 3]);
    if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0)
      return err(state, "Usage: floor plate add [id] <x> <y> <w> <h> [thickness <ft>] [layer <name>] [name <text>]");
    const { opts, error } = parseOpts(tokens, i + 4, ["thickness", "layer", "name"]);
    if (error) return err(state, error);
    const layer = opts.layer ?? "Default";
    if (!next.layers[layer]) return err(state, `No layer "${layer}". Create it first: layer add ${layer}`);
    let thickness = state.tactile3d.floor_thickness;
    if (opts.thickness !== undefined) {
      const t = Number(opts.thickness);
      if (!Number.isFinite(t) || t <= 0) return err(state, "Plate thickness must be a positive number of feet.");
      thickness = t;
    }
    if (!id) id = nextId(next.regions, "g");
    if (next.regions.some((r) => r.id === id)) return err(state, `Region ${id} already exists.`);
    const name = opts.name ?? `Plate ${next.regions.filter((r) => r.kind === "plate").length + 1}`;
    next.regions.push({ id, name, kind: "plate", origin: [x, y], size: [w, h], thickness, layer, level: 0 });
    return ok(next, `Added floor plate ${id} "${name}", ${w}×${h} ft, ${thickness} ft thick, on layer ${layer}.`);
  }
  if (sub === "remove") {
    const id = tokens[2];
    const before = next.regions.length;
    next.regions = next.regions.filter((r) => !(r.id === id && r.kind === "plate"));
    if (next.regions.length === before) return err(state, `No floor plate ${id}.`);
    return ok(next, `Removed floor plate ${id}.`);
  }
  if (sub === "set") {
    const id = tokens[2];
    const r = next.regions.find((rg) => rg.id === id && rg.kind === "plate");
    if (!r) return err(state, `No floor plate ${id}. (floor plate add … to create one · plate list)`);
    return regionSet(state, next, r, tokens, "plate");
  }
  return err(state, "Usage: floor plate add … | plate set <id> … | plate remove <id> | plate list");
}

function cmdBox(state: State, tokens: string[]): CommandResult {
  const sub = tokens[1];
  if (sub === "list") {
    const boxes = state.regions.filter((r) => r.kind === "box");
    if (boxes.length === 0) return read(state, "No extruded boxes yet. Try: extruded box add 0 0 24 24 40");
    return read(state, `Extruded boxes (${boxes.length}):\n` + boxes.map((r) => `  ${r.id}: ${r.name} ${r.size[0]}×${r.size[1]}ft × ${r.height ?? 0}ft tall @ (${r.origin[0]},${r.origin[1]}) on ${r.layer} L${r.level ?? 0}`).join("\n"));
  }
  const next = cloneState(state);
  if (sub === "add") {
    // box add [id] <x> <y> <w> <h> <height> [layer <name>] [name <text>]
    let i = 2;
    let id: string | undefined;
    if (tokens[2] !== undefined && !Number.isFinite(Number(tokens[2]))) {
      id = tokens[2];
      i = 3;
    }
    const x = num(tokens[i]);
    const y = num(tokens[i + 1]);
    const w = num(tokens[i + 2]);
    const h = num(tokens[i + 3]);
    const height = num(tokens[i + 4]);
    if (x === null || y === null || w === null || h === null || height === null || w <= 0 || h <= 0 || height <= 0)
      return err(state, "Usage: extruded box add [id] <x> <y> <w> <h> <height> [layer <name>] [name <text>]");
    const { opts, error } = parseOpts(tokens, i + 5, ["layer", "name"]);
    if (error) return err(state, error);
    const layer = opts.layer ?? "Default";
    if (!next.layers[layer]) return err(state, `No layer "${layer}". Create it first: layer add ${layer}`);
    if (!id) id = nextId(next.regions, "g");
    if (next.regions.some((r) => r.id === id)) return err(state, `Region ${id} already exists.`);
    const name = opts.name ?? `Box ${next.regions.filter((r) => r.kind === "box").length + 1}`;
    next.regions.push({ id, name, kind: "box", origin: [x, y], size: [w, h], height, layer, level: 0 });
    return ok(next, `Added extruded box ${id} "${name}", ${w}×${h} ft footprint, ${height} ft tall, on layer ${layer}.`);
  }
  if (sub === "remove") {
    const id = tokens[2];
    const before = next.regions.length;
    next.regions = next.regions.filter((r) => !(r.id === id && r.kind === "box"));
    if (next.regions.length === before) return err(state, `No extruded box ${id}.`);
    return ok(next, `Removed extruded box ${id}.`);
  }
  if (sub === "set") {
    const id = tokens[2];
    const r = next.regions.find((rg) => rg.id === id && rg.kind === "box");
    if (!r) return err(state, `No extruded box ${id}. (extruded box add … to create one · box list)`);
    return regionSet(state, next, r, tokens, "box");
  }
  return err(state, "Usage: extruded box add … | box set <id> … | box remove <id> | box list");
}

function cmdColumn(state: State, tokens: string[]): CommandResult {
  const sub = tokens[1];
  if (sub === "list") {
    if (state.columns.length === 0) return read(state, "No free columns yet. Try: column add 40 40");
    return read(state, `Free columns (${state.columns.length}):\n` + state.columns.map((c) => `  ${c.id}: (${c.at[0]},${c.at[1]}) ${c.size}ft L${c.level}`).join("\n"));
  }
  const next = cloneState(state);
  if (sub === "add") {
    let i = 2;
    let id: string | undefined;
    if (tokens[2] !== undefined && !Number.isFinite(Number(tokens[2]))) {
      id = tokens[2];
      i = 3;
    }
    const x = num(tokens[i]);
    const y = num(tokens[i + 1]);
    const size = num(tokens[i + 2]) ?? state.style.column_size;
    if (x === null || y === null) return err(state, "Usage: column add [id] <x> <y> [size]");
    if (size <= 0) return err(state, "Column size must be > 0 ft.");
    if (!id) id = nextId(next.columns, "col");
    if (next.columns.some((c) => c.id === id)) return err(state, `Column ${id} already exists.`);
    const pl = pickLayer(next, tokens, i + 2);
    if (pl.error) return err(state, pl.error);
    next.columns.push({ id, level: 0, at: [x, y], size, layer: pl.layer ?? "Default" });
    return ok(next, `Added column ${id} at (${x}, ${y}), on layer ${pl.layer ?? "Default"}.`);
  }
  if (sub === "remove") {
    const id = tokens[2];
    const before = next.columns.length;
    next.columns = next.columns.filter((c) => c.id !== id);
    if (next.columns.length === before) return err(state, `No column ${id}.`);
    return ok(next, `Removed column ${id}.`);
  }
  return err(state, "Usage: column add|remove|list …");
}

function cmdOpening(state: State, tokens: string[]): CommandResult {
  const sub = tokens[1];
  if (sub === "list") {
    if (state.openings.length === 0) return read(state, "No wall openings yet. Try: opening add <wallId> door 0.5 3");
    return read(state, `Openings (${state.openings.length}):\n` + state.openings.map((o) => `  ${o.id}: ${o.type} on wall ${o.wallId} @ ${(o.pos * 100).toFixed(0)}%, ${o.width}×${o.height}ft`).join("\n"));
  }
  const next = cloneState(state);
  if (sub === "add") {
    // opening add <wallId> <door|window|portal> <pos 0–1> <width> [height]
    const wallId = tokens[2];
    const type = tokens[3] as ApertureType;
    const pos = num(tokens[4]);
    const width = num(tokens[5]);
    const height = num(tokens[6]) ?? 7;
    if (!next.walls.some((w) => w.id === wallId)) return err(state, `No free wall ${wallId}. (openings go on free walls — see wall list)`);
    if (!["door", "window", "portal"].includes(type) || pos === null || width === null) return err(state, "Usage: opening add <wallId> <door|window|portal> <pos 0–1> <width> [height]");
    if (width <= 0) return err(state, "Opening width must be > 0 ft.");
    const id = nextId(next.openings, type[0]);
    next.openings.push({ id, wallId, type, pos: Math.max(0, Math.min(1, pos)), width, height });
    return ok(next, `Added ${type} ${id} on wall ${wallId} at ${(pos * 100).toFixed(0)}%, ${width} ft.`);
  }
  if (sub === "remove") {
    const id = tokens[2];
    const before = next.openings.length;
    next.openings = next.openings.filter((o) => o.id !== id);
    if (next.openings.length === before) return err(state, `No opening ${id}.`);
    return ok(next, `Removed opening ${id}.`);
  }
  return err(state, "Usage: opening add|remove|list …");
}

function cmdTactile3d(state: State, tokens: string[]): CommandResult {
  const arg = tokens[1];
  const next = cloneState(state);
  const t = next.tactile3d;
  if (arg === "on" || arg === "off") {
    t.enabled = arg === "on";
    return ok(next, `Tactile-3D export ${arg.toUpperCase()}.`);
  }
  if (arg === "floor") {
    if (tokens[2] !== "on" && tokens[2] !== "off") return err(state, "Usage: tactile3d floor on|off");
    t.floor = tokens[2] === "on";
    return ok(next, `Tactile-3D floor slab ${tokens[2].toUpperCase()}.`);
  }
  if (arg === "wall_height" || arg === "cut_height" || arg === "floor_thickness") {
    const v = num(tokens[2]);
    if (v === null || v <= 0) return err(state, `Usage: tactile3d ${arg} <feet>`);
    (t as unknown as Record<string, number>)[arg] = v;
    return ok(next, `Tactile-3D ${arg.replace("_", " ")} = ${v} ft.`);
  }
  return err(state, "Usage: tactile3d on|off | wall_height|cut_height|floor_thickness <ft> | floor on|off");
}

function cmdLevel(state: State, tokens: string[]): CommandResult {
  // level add <name> <z>
  if (tokens[1] !== "add") return err(state, "Usage: level add <name> <z>");
  const name = tokens[2];
  const z = num(tokens[3]);
  if (!name || z === null) return err(state, "Usage: level add <name> <z>");
  const next = cloneState(state);
  next.levels.push({ name, z, label: name });
  return ok(next, `Added level "${name}" at z = ${z} ft.`);
}

function cmdSchema(state: State, tokens: string[]): CommandResult {
  const sub = tokens[1];
  if (!sub || sub === "show") {
    return read(state, `Active schema: ${SCHEMA_LABELS[state.mode]} — ${SCHEMA_HINTS[state.mode]}. Switch with: schema set bays|massing|floorplan. (Other schemas' commands still work if you type them.)`);
  }
  if (sub === "set") {
    const m = tokens[2] as SchemaMode;
    if (m !== "bays" && m !== "massing" && m !== "floorplan") return err(state, "Usage: schema set bays|massing|floorplan");
    if (m === state.mode) return read(state, `Already in the ${SCHEMA_LABELS[m]} schema.`);
    const next = cloneState(state);
    next.mode = m;
    return ok(next, `Schema set to ${SCHEMA_LABELS[m]} — ${SCHEMA_HINTS[m]}.`);
  }
  return err(state, "Usage: schema | schema set bays|massing|floorplan");
}

// ─── Read-only verbs ─────────────────────────────────────────────────────────

function listBays(state: State): string {
  const names = Object.keys(state.bays);
  if (names.length === 0) return "No bays yet. Try: add bay A";
  const rows = names.map((n) => {
    const b = state.bays[n];
    return `  ${n}: ${b.bays[0]}×${b.bays[1]} @ ${b.spacing[0]}ft · origin (${b.origin[0]},${b.origin[1]}) · walls ${b.walls.enabled ? "on" : "off"} · ${b.apertures.length} apertures`;
  });
  return `Bays (${names.length}):\n${rows.join("\n")}`;
}

/** Resolve a region's effective tactile pattern (per contract A.7):
 *  region.tactile ?? its layer's tactile ?? none. */
function resolvedTactile(state: State, r: Region): TactilePattern | null {
  if (r.tactile) return r.tactile;
  const layer = state.layers[r.layer];
  return layer?.tactile ?? null;
}

/** A spoken-style read-back line for one region, in CAD-literal terms. */
function regionLine(state: State, r: Region): string {
  const t = resolvedTactile(state, r);
  const tNote = t && t.pattern !== "none" ? ` tactile ${t.pattern} at ${t.spacing_mm} mm, ${t.angle_deg} degrees.` : "";
  if (r.kind === "plate") {
    return `floor plate ${r.name}: ${r.size[0]} by ${r.size[1]} ft, ${r.thickness ?? 0} ft thick, on layer ${r.layer}, origin (${r.origin[0]},${r.origin[1]}).${tNote}`;
  }
  return `extruded box ${r.name}: ${r.size[0]} by ${r.size[1]} ft footprint, ${r.height ?? 0} ft tall, on layer ${r.layer}, origin (${r.origin[0]},${r.origin[1]}).${tNote}`;
}

/** Whole-to-Part (Macro/Meso/Micro) text — the paper's description schema.
 *  Reads back the full model geometrically: site, levels, layers, structural
 *  bays, geometric regions (floor plates + extruded boxes), free walls,
 *  columns, openings. No program vocabulary. */
export function describe(state: State, levelFilter: number | null = null): string {
  const names = Object.keys(state.bays);
  const siteDesc = state.site.boundary
    ? `an irregular infill lot (${state.site.boundary.length}-sided, within ${state.site.width}×${state.site.height} ft)`
    : `a ${state.site.width}×${state.site.height} ft site`;

  const plates = state.regions.filter((r) => r.kind === "plate");
  const boxes = state.regions.filter((r) => r.kind === "box");
  const layerNames = Object.keys(state.layers);

  const count = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

  // OVERVIEW — one plain sentence of what the whole model holds.
  const overview =
    `OVERVIEW — ${cap(siteDesc)}; ${count(state.levels.length, "level")}. ` +
    `Holds ${count(names.length, "structural bay")}, ${count(plates.length, "floor plate")}, ` +
    `${count(boxes.length, "extruded box", "extruded boxes")}, ${count(state.walls.length, "free wall")}, ` +
    `${count(state.columns.length, "column")}, on ${count(layerNames.length, "layer")}.`;

  // LAYERS — name, linetype, lineweight, and any tactile texture.
  const layerBlock = `LAYERS — ${layerNames
    .map((n) => {
      const l = state.layers[n];
      const t = tactileSummary(l.tactile);
      return `${l.name} (${l.linetype}, ${l.lineweight_mm} mm${t ? `, ${t}` : ""})`;
    })
    .join("; ")}.`;

  // One block per level: EVERYTHING that sits on it (regions, bays, free walls,
  // columns) in one place — no separate meso/micro tiers. Scoped when a level is active.
  const oob = (lvl: number) => lvl < 0 || lvl >= state.levels.length;
  const levelBlocks = state.levels
    .map((lvl, li) => ({ lvl, li }))
    .filter(({ li }) => levelFilter === null || li === levelFilter)
    .map(({ lvl, li }) => {
      const lines: string[] = [];
      for (const r of state.regions.filter((r) => (r.level ?? 0) === li)) lines.push(`  • ${regionLine(state, r)}`);
      for (const n of names.filter((n) => (state.bays[n].level ?? 0) === li)) {
        const b = state.bays[n];
        const walls = b.walls.enabled ? `, ${b.walls.thickness} ft perimeter walls` : "";
        const corridor = b.corridor.enabled ? `, ${b.corridor.width}-ft ${b.corridor.axis}-corridor` : "";
        const aps = b.apertures.length ? `, openings: ${b.apertures.map((a) => `${a.type} ${a.id}`).join(", ")}` : "";
        const voids = b.void_center && b.void_size ? `, atrium ${b.void_size[0]}×${b.void_size[1]} ft` : "";
        lines.push(`  • bay ${b.label}: ${b.bays[0]}×${b.bays[1]} grid @ ${b.spacing[0]}×${b.spacing[1]} ft, origin (${b.origin[0]},${b.origin[1]})${walls}${corridor}${aps}${voids}`);
      }
      for (const w of state.walls.filter((w) => w.level === li)) {
        const ops = state.openings.filter((o) => o.wallId === w.id);
        const opTxt = ops.length ? `, openings: ${ops.map((o) => `${o.type} ${o.id}`).join(", ")}` : "";
        lines.push(`  • free wall ${w.id}: (${w.a[0]},${w.a[1]})→(${w.b[0]},${w.b[1]}), ${w.thickness} ft thick${opTxt}`);
      }
      for (const c of state.columns.filter((c) => c.level === li)) lines.push(`  • column ${c.id} at (${c.at[0]},${c.at[1]}), ${c.size} ft`);
      const body = lines.length ? lines.join("\n") : "  • (nothing on this level yet)";
      return `LEVEL ${li} — ${lvl.label} (z=${lvl.z} ft):\n${body}`;
    });

  // Anything stranded on an out-of-range level still reconciles with the counts.
  const orphans = [
    ...state.regions.filter((r) => oob(r.level ?? 0)).map((r) => `${r.kind === "plate" ? "floor plate" : "extruded box"} ${r.name} (L${r.level ?? 0})`),
    ...state.walls.filter((w) => oob(w.level)).map((w) => `wall ${w.id} (L${w.level})`),
    ...state.columns.filter((c) => oob(c.level)).map((c) => `column ${c.id} (L${c.level})`)
  ];
  const orphanBlock = orphans.length ? ["", `UNPLACED — ${orphans.length} element(s) on an out-of-range level: ${orphans.join(", ")}.`] : [];

  const scope = levelFilter === null ? [] : [`SCOPE — Level ${levelFilter} only (matches the filtered PIAF / STL export).`, ""];

  return [...scope, overview, layerBlock, "", ...levelBlocks, ...orphanBlock].join("\n");
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function applyCommand(state: State, raw: string): CommandResult {
  const tokens = tokenize(raw.trim());
  if (tokens.length === 0) return read(state, "");

  // Two-word alias normalization (before the switch): `floor plate …` → `plate …`,
  // `extruded box …` → `box …`.
  if (tokens[0] === "floor" && tokens[1] === "plate") tokens.splice(0, 2, "plate");
  else if (tokens[0] === "extruded" && tokens[1] === "box") tokens.splice(0, 2, "box");

  const cmd = tokens[0].toLowerCase();

  switch (cmd) {
    case "help":
    case "h":
    case "?":
      return read(state, helpFor(state.mode));
    case "schema":
      return cmdSchema(state, tokens);
    case "describe":
    case "d":
      return read(state, describe(state));
    case "list":
      if (tokens[1] === "bays") return read(state, listBays(state));
      return err(state, "Usage: list bays");
    case "reset":
      return ok(makeSeedState(), "Model reset to the seed plan.");
    case "clear":
      return ok(
        { ...cloneState(state), bays: {}, walls: [], regions: [], columns: [], openings: [], layers: { Default: defaultLayer() } },
        "Cleared the whole model."
      );
    case "add":
      if (tokens[1] === "bay") return cmdAddBay(state, tokens);
      return err(state, "Usage: add bay <name> [at <x> <y>]");
    case "remove":
      if (tokens[1] === "bay") return cmdRemoveBay(state, tokens);
      return err(state, "Usage: remove bay <name>");
    case "set":
      if (tokens[1] === "bay") return cmdSetBay(state, tokens);
      if (tokens[1] === "site") return cmdSetSite(state, tokens);
      return err(state, "Usage: set bay … | set site …");
    case "wall":
      // `wall add|remove|move|thickness|list` = free walls; `wall <bay> …` = bay perimeter.
      if (["add", "remove", "move", "thickness", "list"].includes(tokens[1])) return cmdWallFree(state, tokens);
      return cmdWall(state, tokens);
    case "layer":
      return cmdLayer(state, tokens);
    case "plate":
      return cmdPlate(state, tokens);
    case "box":
      return cmdBox(state, tokens);
    case "room":
      return err(state, `"room" is retired — use "plate add …" (floor slab) or "box add …" (massing volume). See help.`);
    case "column":
    case "col":
      return cmdColumn(state, tokens);
    case "opening":
      return cmdOpening(state, tokens);
    case "corridor":
      return cmdCorridor(state, tokens);
    case "aperture":
      return cmdAperture(state, tokens);
    case "tactile3d":
      return cmdTactile3d(state, tokens);
    case "level":
      return cmdLevel(state, tokens);
    default:
      return err(state, `Unknown command "${cmd}". Type help for the command list.`);
  }
}

// ─── Help + grammar (shared with the UI and the agent) ───────────────────────

export const SCHEMA_LABELS: Record<SchemaMode, string> = {
  bays: "Structural bays",
  massing: "Massing",
  floorplan: "Floor-plan layout"
};
export const SCHEMA_HINTS: Record<SchemaMode, string> = {
  bays: "think in a column grid",
  massing: "think in extruded volumes",
  floorplan: "think in plates, walls and openings"
};

// Help/grammar split into blocks tagged by which schema(s) surface them. Other
// schemas' blocks are hidden in help + the assistant grammar, but every command
// still works if typed (hide-but-allow). `schema set …` switches the active set.
const HELP_BLOCKS: { schemas: SchemaMode[] | "all"; text: string }[] = [
  {
    schemas: "all",
    text: `READ
  describe                              read the model back (overview + one block per level)
  list bays · layer list · plate list · box list · wall list · column list · opening list
  undo · redo                           step backward / forward through your edits`
  },
  {
    schemas: "all",
    text: `SITE & LEVELS
  set site width|height <ft>            site extents (feet)
  set site boundary <x1,y1> <x2,y2> …   irregular infill lot (≥3 pts) · or: clear
  level add <name> <z>                  add a level (z in ft)`
  },
  {
    schemas: "all",
    text: `LAYERS (Rhino layers carry lineweight + linetype + tactile texture)
  layer add <name> [linetype solid|dashed|dotted|center|hidden] [lineweight <mm>]
                   [tactile dots|lines|crosshatch|grid] [spacing <mm>] [angle <deg>] [height <mm>]
  layer set <name> linetype|lineweight|tactile …   ·   layer remove <name>   ·   layer list`
  },
  {
    schemas: ["floorplan"],
    text: `FLOOR PLATES (slab regions on a layer, feet dimensions)
  floor plate add [id] <x> <y> <w> <h> [thickness <ft>] [layer <name>] [name <text>]
  plate set <id> origin|size|thickness|layer|level|name|tactile …   ·   plate remove <id> · plate list`
  },
  {
    schemas: ["massing"],
    text: `EXTRUDED BOXES (massing volumes on a layer, feet dimensions)
  extruded box add [id] <x> <y> <w> <h> <height> [layer <name>] [name <text>]
  box set <id> origin|size|height|layer|level|name|tactile …   ·   box remove <id> · box list`
  },
  {
    schemas: ["floorplan"],
    text: `FREE WALLS & OPENINGS (interior partitions + exterior envelope, any angle)
  wall add [id] <x1> <y1> <x2> <y2> [thickness] [level] [layer <name>]
  wall move <id> <x1> <y1> <x2> <y2> · wall thickness <id> <ft> · wall remove <id>
  opening add <wallId> <door|window|portal> <pos 0–1> <width> [height] · opening remove <id>`
  },
  {
    schemas: ["bays", "floorplan"],
    text: `COLUMNS
  column add [id] <x> <y> [size] [layer <name>] · column remove <id>`
  },
  {
    schemas: ["bays"],
    text: `STRUCTURAL BAY JIG (the column grid)
  add bay <name> [at <x> <y>] · remove bay <name>
  set bay <name> origin|bays|spacing|rotation|label|void_center|void_size|void_shape …
  wall <bay> on|off · wall <bay> thickness <ft>
  corridor <bay> on|off · axis x|y · width <ft> · position <gridline>
  aperture <bay> add <id> <door|window|portal> <x|y> <gridline> <corner> <w> <h>`
  },
  {
    schemas: "all",
    text: `OUTPUT
  tactile3d on|off · wall_height|cut_height <ft> · floor on|off
  reset                                 back to the sample model · clear  (empty model)`
  },
  {
    schemas: "all",
    text: `SCHEMA (the active way of thinking — scopes the command set above)
  schema set bays|massing|floorplan     switch · schema  (show the current one)`
  }
];

/** The command help/grammar scoped to one schema (others hidden, still typeable). */
export function helpFor(mode: SchemaMode): string {
  const head =
    `RAP Studio — schema: ${SCHEMA_LABELS[mode]} (${SCHEMA_HINTS[mode]}). ` +
    `These are this schema's commands; commands from other schemas still work if you type them. Switch with "schema set …".`;
  const blocks = HELP_BLOCKS.filter((b) => b.schemas === "all" || b.schemas.includes(mode)).map((b) => b.text);
  return [head, "", ...blocks].join("\n\n");
}
/** The grammar handed to the AI assistant — identical to the scoped help. */
export function commandGrammarFor(mode: SchemaMode): string {
  return helpFor(mode);
}
// Back-compat full-grammar constant (used where no mode is in hand).
export const HELP_TEXT = helpFor("bays");

/** Compact grammar handed to the agent so it can compile NL → commands. */
export const COMMAND_GRAMMAR = HELP_TEXT;
