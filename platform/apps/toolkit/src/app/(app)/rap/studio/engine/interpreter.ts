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

import type { ApertureType, Axis, Bay, CommandResult, State } from "./types";
import { cloneState, makeSeedState, newBay } from "./seed";
import { toBraille } from "./braille";

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
    return ok(next, `Bay ${name} walls ${arg.toUpperCase()}, ${(b.walls.thickness * 12).toFixed(0)}-inch thick.`);
  }
  if (arg === "thickness") {
    const t = num(tokens[3]);
    if (t === null || t <= 0) return err(state, "Usage: wall <bay> thickness <feet>");
    b.walls.thickness = t;
    return ok(next, `Bay ${name} wall thickness = ${t} ft (${(t * 12).toFixed(0)} in).`);
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
  // set site width|height <ft>
  const field = tokens[2];
  const v = num(tokens[3]);
  if ((field !== "width" && field !== "height") || v === null || v <= 0)
    return err(state, "Usage: set site width|height <ft>");
  const next = cloneState(state);
  next.site[field] = v;
  return ok(next, `Site ${field} = ${v} ft.`);
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

/** Whole-to-Part (Macro/Meso/Micro) text — the paper's description schema. */
export function describe(state: State): string {
  const names = Object.keys(state.bays);
  const totalCols = names.reduce((acc, n) => {
    const b = state.bays[n];
    return acc + (b.bays[0] + 1) * (b.bays[1] + 1);
  }, 0);
  const macro = `MACRO — A ${state.site.width}×${state.site.height} ft site with ${names.length} structural bay${names.length === 1 ? "" : "s"} across ${state.levels.length} level${state.levels.length === 1 ? "" : "s"}. ${totalCols} columns total.`;

  const meso = names
    .map((n) => {
      const b = state.bays[n];
      const corridor = b.corridor.enabled ? `, a ${b.corridor.width}-ft ${b.corridor.axis}-corridor` : "";
      const walls = b.walls.enabled ? `${(b.walls.thickness * 12).toFixed(0)}-inch perimeter walls` : "no walls";
      return `MESO — ${b.label}: a ${b.bays[0]}×${b.bays[1]} grid at ${b.spacing[0]}×${b.spacing[1]} ft, origin (${b.origin[0]}, ${b.origin[1]})${b.rotation_deg ? `, rotated ${b.rotation_deg}°` : ""}, with ${walls}${corridor}.`;
    })
    .join("\n");

  const micro = names
    .map((n) => {
      const b = state.bays[n];
      const aps = b.apertures.length
        ? b.apertures.map((a) => `${a.type} ${a.id} (${a.width}×${a.height} ft, ${a.axis}-wall gridline ${a.gridline})`).join("; ")
        : "no openings";
      const v = b.void_center ? ` Atrium void ${b.void_size?.[0]}×${b.void_size?.[1]} ft at (${b.void_center[0]}, ${b.void_center[1]}).` : "";
      return `MICRO — ${b.label}: ${aps}.${v}`;
    })
    .join("\n");

  return [macro, "", meso, "", micro].join("\n");
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function applyCommand(state: State, raw: string): CommandResult {
  const tokens = tokenize(raw.trim());
  if (tokens.length === 0) return read(state, "");
  const cmd = tokens[0].toLowerCase();

  switch (cmd) {
    case "help":
    case "h":
    case "?":
      return read(state, HELP_TEXT);
    case "describe":
    case "d":
      return read(state, describe(state));
    case "list":
      if (tokens[1] === "bays") return read(state, listBays(state));
      return err(state, "Usage: list bays");
    case "reset":
      return ok(makeSeedState(), "Model reset to the seed plan.");
    case "clear":
      return ok({ ...cloneState(state), bays: {} }, "Cleared all bays.");
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
      return cmdWall(state, tokens);
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

export const HELP_TEXT = `RAP Studio commands (a subset of the desktop Controller):

  describe                              read the model back (Macro / Meso / Micro)
  list bays                             table of every bay
  add bay <name> [at <x> <y>]           create a new structural bay
  remove bay <name>                     delete a bay
  set bay <name> origin <x> <y>         move a bay
  set bay <name> bays <nx> <ny>         grid module count
  set bay <name> spacing <sx> <sy>      module spacing (ft)
  set bay <name> rotation <deg>         rotate the bay
  set bay <name> label <text>           rename (braille auto-updates)
  set bay <name> void_center <x> <y>    atrium centre (site ft)
  set bay <name> void_size <w> <h>      atrium size · void_shape rect|circle|none
  wall <bay> on|off                     toggle perimeter walls
  wall <bay> thickness <ft>             wall thickness
  corridor <bay> on|off                 toggle a corridor
  corridor <bay> axis x|y · width <ft> · position <gridline>
  aperture <bay> add <id> <door|window|portal> <x|y> <gridline> <corner> <w> <h>
  aperture <bay> remove <id> · aperture <bay> list
  set site width|height <ft>            resize the site
  level add <name> <z>                  add a floor level
  tactile3d on|off · wall_height|cut_height <ft> · floor on|off
  reset                                 back to the seed plan`;

/** Compact grammar handed to the agent so it can compile NL → commands. */
export const COMMAND_GRAMMAR = HELP_TEXT;
