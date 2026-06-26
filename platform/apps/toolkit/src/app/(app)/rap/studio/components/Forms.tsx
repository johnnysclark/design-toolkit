"use client";

// Accessible form controls — an ALTERNATIVE authoring channel for users who
// prefer widgets to typed commands. Every control emits the same Controller
// command string the console uses, so all three channels (forms, console, AI)
// converge on one grammar and one auditable log. Fully labelled for keyboard +
// screen-reader use.

import { useEffect, useState } from "react";
import type { State } from "../engine/types";

const fieldCls = "rounded border-2 border-neutral-900 px-2 py-1 text-sm text-neutral-900 outline-none focus:border-[#ff3b21]";
const labelCls = "flex flex-col gap-1 text-xs font-semibold text-neutral-900";

// A number field that commits ONCE, on blur or Enter — not on every keystroke.
// (A controlled onChange emitted a Controller command per character: typing "20"
// fired `… 2` then `… 20`, and clearing a field fired `… 0` / NaN mid-edit,
// flooding the screen-reader announcer with values the user never committed.)
// `key={value}` resets the field when the state changes from elsewhere.
function NumField({
  label,
  value,
  min,
  step,
  commit
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  commit: (n: number) => void;
}) {
  return (
    <label className={labelCls}>
      {label}
      <input
        type="number"
        min={min}
        step={step}
        className={fieldCls}
        defaultValue={value}
        key={value}
        onBlur={(e) => {
          if (e.target.value === "") return;
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          commit(min != null ? Math.max(min, n) : n);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
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
            <NumField label="Modules X" value={bay.bays[0]} min={1} commit={(n) => onCommand(`set bay ${sel} bays ${n} ${bay.bays[1]}`)} />
            <NumField label="Modules Y" value={bay.bays[1]} min={1} commit={(n) => onCommand(`set bay ${sel} bays ${bay.bays[0]} ${n}`)} />
            <NumField label="Spacing X (ft)" value={bay.spacing[0]} min={1} commit={(n) => onCommand(`set bay ${sel} spacing ${n} ${bay.spacing[1]}`)} />
            <NumField label="Spacing Y (ft)" value={bay.spacing[1]} min={1} commit={(n) => onCommand(`set bay ${sel} spacing ${bay.spacing[0]} ${n}`)} />
          </div>

          {/* Origin + rotation */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumField label="Origin X" value={bay.origin[0]} commit={(n) => onCommand(`set bay ${sel} origin ${n} ${bay.origin[1]}`)} />
            <NumField label="Origin Y" value={bay.origin[1]} commit={(n) => onCommand(`set bay ${sel} origin ${bay.origin[0]} ${n}`)} />
            <label className={`${labelCls} col-span-2`}>
              Rotation {bay.rotation_deg}°
              <input type="range" min={0} max={90} step={5} value={bay.rotation_deg} onChange={(e) => onCommand(`set bay ${sel} rotation ${+e.target.value}`)} aria-label="Bay rotation in degrees" />
            </label>
          </div>

          {/* Toggles */}
          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <legend className="sr-only">Walls and corridor</legend>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={bay.walls.enabled} onChange={(e) => onCommand(`wall ${sel} ${e.target.checked ? "on" : "off"}`)} />
              Walls
            </label>
            <NumField label="Wall thickness (ft)" value={bay.walls.thickness} min={0.1} step={0.1} commit={(n) => onCommand(`wall ${sel} thickness ${n}`)} />
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
                <NumField label="Corridor width (ft)" value={bay.corridor.width} min={1} commit={(n) => onCommand(`corridor ${sel} width ${n}`)} />
              </>
            )}
          </fieldset>

          {/* Label */}
          <label className={labelCls}>
            Label (braille auto-updates)
            <input className={fieldCls} defaultValue={bay.label} key={bay.label} onBlur={(e) => e.target.value.trim() && onCommand(`set bay ${sel} label "${e.target.value.trim()}"`)} />
          </label>

          {/* Quick aperture add */}
          <ApertureAdd sel={sel} onCommand={onCommand} count={bay.apertures.length} />
        </>
      )}
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
