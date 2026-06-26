"use client";

// Accessible form controls — an ALTERNATIVE authoring channel for users who
// prefer widgets to typed commands. Every control emits the same Controller
// command string the console uses, so all three channels (forms, console, AI)
// converge on one grammar and one auditable log. Fully labelled for keyboard +
// screen-reader use.

import { useEffect, useReducer, useState } from "react";
import type { State } from "../engine/types";

const fieldCls = "rounded border-2 border-neutral-900 px-2 py-1 text-sm text-neutral-900 outline-none focus:border-[#ff3b21] focus-visible:ring-2 focus-visible:ring-[#ff3b21] focus-visible:ring-offset-1";
const labelCls = "flex flex-col gap-1 text-xs font-semibold text-neutral-900";

// A numeric field that commits ONCE — on blur or Enter — not on every keystroke.
// Uncontrolled (defaultValue + key) so it resyncs when the value changes via
// another channel; empty/invalid input reverts to the current value.
function NumField({ label, value, min, step, onCommit }: { label: string; value: number; min?: number; step?: number; onCommit: (n: number) => void }) {
  // Bump on every commit so the field always remounts to the current model
  // value — even when the committed value clamps to the value it already had
  // (otherwise the stale typed text would linger, misreading to a screen reader).
  const [gen, bump] = useReducer((x: number) => x + 1, 0);
  const commit = (el: HTMLInputElement) => {
    const raw = el.value.trim();
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) {
      el.value = String(value);
      return;
    }
    // No change → no command, no announcement (Enter then blur would otherwise
    // commit the same value twice and double-speak the confirmation).
    if (n === value) {
      bump();
      return;
    }
    onCommit(n);
    bump();
  };
  return (
    <label className={labelCls}>
      {label}
      <input
        type="number"
        min={min}
        step={step}
        defaultValue={value}
        key={`${value}:${gen}`}
        className={fieldCls}
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(e.currentTarget);
          }
        }}
      />
    </label>
  );
}

export default function Forms({ state, onCommand }: { state: State; onCommand: (raw: string) => void }) {
  const bayNames = Object.keys(state.bays);
  const [sel, setSel] = useState(bayNames[0] ?? "");

  useEffect(() => {
    if (!state.bays[sel] && bayNames.length) setSel(bayNames[0]);
  }, [state, sel, bayNames]);

  const bay = state.bays[sel];

  // Rotation shows a live local value while dragging but only commits a command
  // on release, so a drag doesn't flood the log / speech / Rhino auto-push.
  const [rotDisplay, setRotDisplay] = useState(0);
  useEffect(() => {
    if (bay) setRotDisplay(bay.rotation_deg);
  }, [bay?.rotation_deg, sel]);

  const addBay = () => {
    // next free single-letter name
    const used = new Set(bayNames);
    let name = "B";
    for (const ch of "BCDEFGHIJKLMNOPQRSTUVWXYZ") if (!used.has(ch)) { name = ch; break; }
    onCommand(`add bay ${name}`);
    setSel(name);
  };

  return (
    <div className="space-y-4 text-neutral-900">
      {/* Bay picker */}
      <div className="flex flex-wrap items-end gap-2">
        <label className={labelCls}>
          Bay
          <select className={fieldCls} value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Select bay to edit">
            {bayNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={addBay} className="display-font rounded border-2 border-neutral-900 px-3 py-1.5 text-xs uppercase hover:bg-neutral-900 hover:text-white">
          + Add bay
        </button>
        {bay && (
          <button type="button" onClick={() => onCommand(`remove bay ${sel}`)} className="display-font rounded border-2 border-neutral-900 px-3 py-1.5 text-xs uppercase hover:bg-[#ff3b21] hover:border-[#ff3b21] hover:text-white">
            − Remove
          </button>
        )}
      </div>

      {!bay && <p className="text-sm">No bay selected. Add one to begin.</p>}

      {bay && (
        <>
          {/* Grid + spacing */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumField label="Modules X" value={bay.bays[0]} min={1} onCommit={(n) => onCommand(`set bay ${sel} bays ${Math.max(1, Math.round(n))} ${bay.bays[1]}`)} />
            <NumField label="Modules Y" value={bay.bays[1]} min={1} onCommit={(n) => onCommand(`set bay ${sel} bays ${bay.bays[0]} ${Math.max(1, Math.round(n))}`)} />
            <NumField label="Spacing X (ft)" value={bay.spacing[0]} min={1} onCommit={(n) => onCommand(`set bay ${sel} spacing ${Math.max(1, n)} ${bay.spacing[1]}`)} />
            <NumField label="Spacing Y (ft)" value={bay.spacing[1]} min={1} onCommit={(n) => onCommand(`set bay ${sel} spacing ${bay.spacing[0]} ${Math.max(1, n)}`)} />
          </div>

          {/* Origin + rotation */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumField label="Origin X" value={bay.origin[0]} onCommit={(n) => onCommand(`set bay ${sel} origin ${n} ${bay.origin[1]}`)} />
            <NumField label="Origin Y" value={bay.origin[1]} onCommit={(n) => onCommand(`set bay ${sel} origin ${bay.origin[0]} ${n}`)} />
            <label className={`${labelCls} col-span-2`}>
              Rotation {rotDisplay}°
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={rotDisplay}
                onChange={(e) => setRotDisplay(+e.target.value)}
                onPointerUp={() => { if (rotDisplay !== bay.rotation_deg) onCommand(`set bay ${sel} rotation ${rotDisplay}`); }}
                onKeyUp={() => { if (rotDisplay !== bay.rotation_deg) onCommand(`set bay ${sel} rotation ${rotDisplay}`); }}
                aria-label="Bay rotation in degrees"
              />
            </label>
          </div>

          {/* Toggles */}
          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <legend className="sr-only">Walls and corridor</legend>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={bay.walls.enabled} onChange={(e) => onCommand(`wall ${sel} ${e.target.checked ? "on" : "off"}`)} />
              Walls
            </label>
            <NumField label="Wall thickness (ft)" value={bay.walls.thickness} min={0.1} step={0.1} onCommit={(n) => onCommand(`wall ${sel} thickness ${Math.max(0.1, n)}`)} />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={bay.corridor.enabled} onChange={(e) => onCommand(`corridor ${sel} ${e.target.checked ? "on" : "off"}`)} />
              Corridor
            </label>
            {bay.corridor.enabled && (
              <>
                <label className={labelCls}>
                  Corridor axis
                  <select className={fieldCls} value={bay.corridor.axis} onChange={(e) => onCommand(`corridor ${sel} axis ${e.target.value}`)}>
                    <option value="x">x</option>
                    <option value="y">y</option>
                  </select>
                </label>
                <NumField label="Corridor width (ft)" value={bay.corridor.width} min={1} onCommit={(n) => onCommand(`corridor ${sel} width ${Math.max(1, n)}`)} />
              </>
            )}
          </fieldset>

          {/* Label */}
          <label className={labelCls}>
            Label (braille auto-updates)
            <input className={fieldCls} defaultValue={bay.label} key={bay.label} onBlur={(e) => { const v = e.target.value.trim(); if (v) onCommand(`set bay ${sel} label "${v}"`); else e.target.value = bay.label; }} />
          </label>

          {/* Quick aperture add */}
          <ApertureAdd sel={sel} onCommand={onCommand} count={bay.apertures.length} />
        </>
      )}

      {/* Building elements — rooms, interior walls, columns (not tied to a bay) */}
      <BuildingAdd onCommand={onCommand} />
    </div>
  );
}

const USES = ["residential", "retail", "office", "lobby", "circulation", "parking", "amenity", "core", "mechanical", "open", "other"];

function BuildingAdd({ onCommand }: { onCommand: (raw: string) => void }) {
  // Room
  const [rx, setRx] = useState(18);
  const [ry, setRy] = useState(12);
  const [rw, setRw] = useState(24);
  const [rh, setRh] = useState(18);
  const [use, setUse] = useState("retail");
  const [rname, setRname] = useState("");
  // Wall
  const [x1, setX1] = useState(18);
  const [y1, setY1] = useState(32);
  const [x2, setX2] = useState(78);
  const [y2, setY2] = useState(32);
  const [wt, setWt] = useState(0.5);
  // Column
  const [cx, setCx] = useState(40);
  const [cy, setCy] = useState(40);

  return (
    <div className="space-y-3 rounded-lg border-2 border-neutral-900 p-3">
      <h3 className="display-font text-xs uppercase tracking-tight text-neutral-900">Building — rooms, walls, columns</h3>

      <fieldset className="rounded border border-neutral-300 p-3">
        <legend className="px-1 text-xs font-bold uppercase text-neutral-900">Add room (program)</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <label className={labelCls}>X<input type="number" className={fieldCls} value={rx} onChange={(e) => setRx(+e.target.value)} /></label>
          <label className={labelCls}>Y<input type="number" className={fieldCls} value={ry} onChange={(e) => setRy(+e.target.value)} /></label>
          <label className={labelCls}>W<input type="number" className={fieldCls} value={rw} onChange={(e) => setRw(+e.target.value)} /></label>
          <label className={labelCls}>H<input type="number" className={fieldCls} value={rh} onChange={(e) => setRh(+e.target.value)} /></label>
          <label className={labelCls}>Use
            <select className={fieldCls} value={use} onChange={(e) => setUse(e.target.value)}>
              {USES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </label>
          <label className={labelCls}>Name<input className={fieldCls} value={rname} onChange={(e) => setRname(e.target.value)} placeholder="(optional)" /></label>
        </div>
        <button type="button" onClick={() => onCommand(`room add ${rx} ${ry} ${rw} ${rh} ${use}${rname.trim() ? ` "${rname.trim()}"` : ""}`)} className="display-font mt-2 rounded border-2 border-neutral-900 px-3 py-1.5 text-xs uppercase hover:bg-neutral-900 hover:text-white">
          + Place room
        </button>
      </fieldset>

      <fieldset className="rounded border border-neutral-300 p-3">
        <legend className="px-1 text-xs font-bold uppercase text-neutral-900">Add wall (interior / exterior)</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <label className={labelCls}>X1<input type="number" className={fieldCls} value={x1} onChange={(e) => setX1(+e.target.value)} /></label>
          <label className={labelCls}>Y1<input type="number" className={fieldCls} value={y1} onChange={(e) => setY1(+e.target.value)} /></label>
          <label className={labelCls}>X2<input type="number" className={fieldCls} value={x2} onChange={(e) => setX2(+e.target.value)} /></label>
          <label className={labelCls}>Y2<input type="number" className={fieldCls} value={y2} onChange={(e) => setY2(+e.target.value)} /></label>
          <label className={labelCls}>Thick<input type="number" step={0.1} className={fieldCls} value={wt} onChange={(e) => setWt(+e.target.value)} /></label>
        </div>
        <button type="button" onClick={() => onCommand(`wall add ${x1} ${y1} ${x2} ${y2} ${wt}`)} className="display-font mt-2 rounded border-2 border-neutral-900 px-3 py-1.5 text-xs uppercase hover:bg-neutral-900 hover:text-white">
          + Draw wall
        </button>
      </fieldset>

      <fieldset className="rounded border border-neutral-300 p-3">
        <legend className="px-1 text-xs font-bold uppercase text-neutral-900">Add column</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className={labelCls}>X<input type="number" className={fieldCls} value={cx} onChange={(e) => setCx(+e.target.value)} /></label>
          <label className={labelCls}>Y<input type="number" className={fieldCls} value={cy} onChange={(e) => setCy(+e.target.value)} /></label>
        </div>
        <button type="button" onClick={() => onCommand(`column add ${cx} ${cy}`)} className="display-font mt-2 rounded border-2 border-neutral-900 px-3 py-1.5 text-xs uppercase hover:bg-neutral-900 hover:text-white">
          + Place column
        </button>
      </fieldset>
    </div>
  );
}

function ApertureAdd({ sel, onCommand, count }: { sel: string; onCommand: (raw: string) => void; count: number }) {
  const [type, setType] = useState("door");
  const [axis, setAxis] = useState("x");
  const [gridline, setGridline] = useState(0);
  const [corner, setCorner] = useState(8);
  const [w, setW] = useState(3);
  const [h, setH] = useState(7);

  return (
    <fieldset className="rounded border border-neutral-300 p-3">
      <legend className="px-1 text-xs font-bold uppercase text-neutral-900">Add aperture</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <label className={labelCls}>
          Type
          <select className={fieldCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option>door</option>
            <option>window</option>
            <option>portal</option>
          </select>
        </label>
        <label className={labelCls}>
          Wall
          <select className={fieldCls} value={axis} onChange={(e) => setAxis(e.target.value)}>
            <option value="x">x</option>
            <option value="y">y</option>
          </select>
        </label>
        <label className={labelCls}>
          Gridline
          <input type="number" min={0} className={fieldCls} value={gridline} onChange={(e) => setGridline(+e.target.value)} />
        </label>
        <label className={labelCls}>
          Offset
          <input type="number" min={0} className={fieldCls} value={corner} onChange={(e) => setCorner(+e.target.value)} />
        </label>
        <label className={labelCls}>
          Width
          <input type="number" min={1} className={fieldCls} value={w} onChange={(e) => setW(+e.target.value)} />
        </label>
        <label className={labelCls}>
          Height
          <input type="number" min={1} className={fieldCls} value={h} onChange={(e) => setH(+e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        onClick={() => onCommand(`aperture ${sel} add ${type[0]}${count + 1} ${type} ${axis} ${gridline} ${corner} ${w} ${h}`)}
        className="display-font mt-2 rounded border-2 border-neutral-900 px-3 py-1.5 text-xs uppercase hover:bg-neutral-900 hover:text-white"
      >
        + Place {type}
      </button>
    </fieldset>
  );
}
