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

import type { ApertureType, Axis, Bay, CommandResult, ProgramUse, State, Vec2 } from "./types";
import { cloneState, makeSeedState, newBay } from "./seed";
import { toBraille } from "./braille";

const USES: ProgramUse[] = ["residential", "retail", "office", "lobby", "circulation", "parking", "amenity", "core", "mechanical", "open", "other"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function nextId(existing: { id: string }[], prefix: string): string {
  let i = existing.length + 1;
  while (existing.some((e) => e.id === `${prefix}${i}`)) i++;
  return `${prefix}${i}`;
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
    if (width <= 0 || height <= 0) return err(state, "Aperture width and height must be > 0 ft.");
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
    if (!id) id = nextId(next.walls, "w");
    if (next.walls.some((w) => w.id === id)) return err(state, `Wall ${id} already exists.`);
    next.walls.push({ id, level, a: [x1, y1], b: [x2, y2], thickness: th });
    return ok(next, `Added wall ${id} (${x1},${y1})→(${x2},${y2}), ${(th * 12).toFixed(0)}-inch, level ${level}.`);
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

function cmdRoom(state: State, tokens: string[]): CommandResult {
  const sub = tokens[1];
  if (sub === "list") {
    if (state.rooms.length === 0) return read(state, "No rooms yet. Try: room add 18 12 36 20 retail");
    return read(state, `Rooms (${state.rooms.length}):\n` + state.rooms.map((r) => `  ${r.id}: ${r.name} [${r.use}] ${r.size[0]}×${r.size[1]}ft @ (${r.origin[0]},${r.origin[1]}) L${r.level} = ${(r.size[0] * r.size[1]).toFixed(0)} sf`).join("\n"));
  }
  const next = cloneState(state);
  if (sub === "add") {
    // room add [id] <x> <y> <w> <h> <use> [name…]
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
    const use = (tokens[i + 4] || "other") as ProgramUse;
    const name = tokens.slice(i + 5).join(" ") || cap(use);
    if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) return err(state, "Usage: room add [id] <x> <y> <w> <h> <use> [name]");
    if (!USES.includes(use)) return err(state, `Unknown use "${use}". One of: ${USES.join(", ")}.`);
    if (!id) id = nextId(next.rooms, "rm");
    if (next.rooms.some((r) => r.id === id)) return err(state, `Room ${id} already exists.`);
    next.rooms.push({ id, level: 0, origin: [x, y], size: [w, h], name, use, braille: toBraille(name) });
    return ok(next, `Added ${use} room ${id} "${name}", ${w}×${h} ft (${(w * h).toFixed(0)} sf).`);
  }
  if (sub === "remove") {
    const id = tokens[2];
    const before = next.rooms.length;
    next.rooms = next.rooms.filter((r) => r.id !== id);
    if (next.rooms.length === before) return err(state, `No room ${id}.`);
    return ok(next, `Removed room ${id}.`);
  }
  // room <id> <field> …
  const id = sub;
  const r = next.rooms.find((rm) => rm.id === id);
  if (!r) return err(state, `No room ${id}. (room add … to create one · room list)`);
  const field = tokens[2];
  if (field === "use") {
    const u = tokens[3] as ProgramUse;
    if (!USES.includes(u)) return err(state, `Unknown use. One of: ${USES.join(", ")}.`);
    r.use = u;
    return ok(next, `Room ${id} use = ${u}.`);
  }
  if (field === "name") {
    const nm = tokens.slice(3).join(" ");
    if (!nm) return err(state, "Usage: room <id> name <text>");
    r.name = nm;
    r.braille = toBraille(nm);
    return ok(next, `Room ${id} = "${nm}" (braille updated).`);
  }
  if (field === "move") {
    const x = num(tokens[3]);
    const y = num(tokens[4]);
    if (x === null || y === null) return err(state, "Usage: room <id> move <x> <y>");
    r.origin = [x, y];
    return ok(next, `Moved room ${id} to (${x}, ${y}).`);
  }
  if (field === "size") {
    const w = num(tokens[3]);
    const h = num(tokens[4]);
    if (w === null || h === null || w <= 0 || h <= 0) return err(state, "Usage: room <id> size <w> <h>");
    r.size = [w, h];
    return ok(next, `Room ${id} = ${w}×${h} ft.`);
  }
  if (field === "level") {
    const l = num(tokens[3]);
    if (l === null) return err(state, "Usage: room <id> level <n>");
    const lv = Math.round(l);
    if (lv < 0 || lv >= next.levels.length) return err(state, `No level ${lv} (levels are 0–${next.levels.length - 1}). Add one first: level add <name> <z>.`);
    r.level = lv;
    return ok(next, `Room ${id} on level ${lv}.`);
  }
  return err(state, "Usage: room add … | room remove <id> | room <id> use|name|move|size|level …");
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
    next.columns.push({ id, level: 0, at: [x, y], size });
    return ok(next, `Added column ${id} at (${x}, ${y}).`);
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

/** Whole-to-Part (Macro/Meso/Micro) text — the paper's description schema.
 *  Now reads back the full building: site, levels + program mix, bays, free
 *  walls, rooms, columns, openings. */
export function describe(state: State, levelFilter: number | null = null): string {
  const names = Object.keys(state.bays);
  const siteDesc = state.site.boundary
    ? `an irregular infill lot (${state.site.boundary.length}-sided, within ${state.site.width}×${state.site.height} ft)`
    : `a ${state.site.width}×${state.site.height} ft site`;

  // Program mix across all rooms.
  const useTotals = new Map<string, number>();
  for (const r of state.rooms) useTotals.set(r.use, (useTotals.get(r.use) ?? 0) + r.size[0] * r.size[1]);
  const programMix = useTotals.size ? [...useTotals.entries()].map(([u, a]) => `${u} ${a.toFixed(0)} sf`).join(", ") : "no program assigned yet";

  const macro =
    `MACRO — ${cap(siteDesc)}. ` +
    `${state.levels.length} level${state.levels.length === 1 ? "" : "s"}, ` +
    `${names.length} structural bay${names.length === 1 ? "" : "s"}, ${state.rooms.length} room${state.rooms.length === 1 ? "" : "s"}, ` +
    `${state.walls.length} free wall${state.walls.length === 1 ? "" : "s"}. Program: ${programMix}.`;

  // Meso — one block per level, listing its rooms (scoped if a level is active).
  const meso = state.levels
    .map((lvl, li) => ({ lvl, li }))
    .filter(({ li }) => levelFilter === null || li === levelFilter)
    .map(({ lvl, li }) => {
      const rooms = state.rooms.filter((r) => r.level === li);
      const roomTxt = rooms.length ? rooms.map((r) => `${r.name} [${r.use}, ${(r.size[0] * r.size[1]).toFixed(0)} sf]`).join("; ") : "no rooms";
      return `MESO — Level ${li} (${lvl.label}, z=${lvl.z} ft): ${roomTxt}.`;
    })
    .join("\n");

  // Rooms on an out-of-range level still count in MACRO — surface them so the
  // spoken read-back always reconciles with the count (e.g. after an import).
  const orphans = state.rooms.filter((r) => r.level < 0 || r.level >= state.levels.length);
  const orphanBlock = orphans.length
    ? [`UNPLACED — ${orphans.length} room(s) on an out-of-range level: ${orphans.map((r) => `${r.name} (L${r.level})`).join(", ")}.`]
    : [];

  // Micro — bay detail + free walls + openings.
  const bayMicro = names.map((n) => {
    const b = state.bays[n];
    const corridor = b.corridor.enabled ? `a ${b.corridor.width}-ft ${b.corridor.axis}-corridor; ` : "";
    const walls = b.walls.enabled ? `${(b.walls.thickness * 12).toFixed(0)}-inch perimeter walls; ` : "";
    const aps = b.apertures.length ? b.apertures.map((a) => `${a.type} ${a.id}`).join(", ") : "no openings";
    return `MICRO — ${b.label}: ${b.bays[0]}×${b.bays[1]} grid @ ${b.spacing[0]}×${b.spacing[1]} ft, origin (${b.origin[0]},${b.origin[1]}); ${walls}${corridor}${aps}.`;
  });
  const wallMicro = state.walls.length
    ? [`MICRO — Free walls: ${state.walls.map((w) => `${w.id} (${w.a[0]},${w.a[1]})→(${w.b[0]},${w.b[1]})`).join(", ")}.`]
    : [];
  const openMicro = state.openings.length
    ? [`MICRO — Wall openings: ${state.openings.map((o) => `${o.type} ${o.id} on ${o.wallId}`).join(", ")}.`]
    : [];
  // Atria/voids exist in the 2D plan — surface them in the read-back too.
  const atria = Object.values(state.bays).filter((b) => b.void_center && b.void_size);
  const voidMicro = atria.length
    ? [`MICRO — Atria/voids: ${atria.map((b) => `${b.void_size![0]}×${b.void_size![1]} ft at (${b.void_center![0]}, ${b.void_center![1]})`).join(", ")}.`]
    : [];
  const scope = levelFilter === null ? [] : [`SCOPE — Level ${levelFilter} only (matches the filtered PIAF / STL export).`, ""];

  return [...scope, macro, "", meso, ...orphanBlock, "", ...bayMicro, ...wallMicro, ...openMicro, ...voidMicro].join("\n");
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
      return ok({ ...cloneState(state), bays: {}, walls: [], rooms: [], columns: [], openings: [] }, "Cleared the whole model.");
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
    case "room":
      return cmdRoom(state, tokens);
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

export const HELP_TEXT = `RAP Studio commands — build a full building, inside and out.

READ
  describe                              read the model back (Macro / Meso / Micro)
  list bays · room list · wall list · column list · opening list
  undo · redo                           step backward / forward through your edits

SITE & LEVELS
  set site width|height <ft>            site extents
  set site boundary <x1,y1> <x2,y2> …   irregular infill lot (≥3 pts) · or: clear
  level add <name> <z>                  add a floor level (z in ft) for mixed-use

ROOMS (program: residential·retail·office·lobby·circulation·parking·amenity·core·mechanical·open·other)
  room add [id] <x> <y> <w> <h> <use> [name]    place a program space
  room <id> use <use> · name <text> · move <x> <y> · size <w> <h> · level <n>
  room remove <id>

FREE WALLS (interior partitions AND exterior envelope, any angle)
  wall add [id] <x1> <y1> <x2> <y2> [thickness] [level]
  wall move <id> <x1> <y1> <x2> <y2> · wall thickness <id> <ft> · wall remove <id>
  opening add <wallId> <door|window|portal> <pos 0–1> <width> [height]
  opening remove <id>

COLUMNS
  column add [id] <x> <y> [size] · column remove <id>

STRUCTURAL BAY JIG (the original grid)
  add bay <name> [at <x> <y>] · remove bay <name>
  set bay <name> origin|bays|spacing|rotation|label|void_center|void_size|void_shape …
  wall <bay> on|off · wall <bay> thickness <ft>
  corridor <bay> on|off · axis x|y · width <ft> · position <gridline>
  aperture <bay> add <id> <door|window|portal> <x|y> <gridline> <corner> <w> <h>

OUTPUT
  tactile3d on|off · wall_height|cut_height <ft> · floor on|off
  reset                                 back to the seed plan · clear  (empty model)`;

/** Compact grammar handed to the agent so it can compile NL → commands. */
export const COMMAND_GRAMMAR = HELP_TEXT;
