"use client";

// The canonical state, shown as a navigable tree — the "source of truth" panel.
// Uses native <details>/<summary> so it's keyboard-operable and announced as a
// disclosure by screen readers with no custom ARIA. Recently-changed paths get
// an accent. Disclosure state is user-owned (auto-opens on a change, never
// auto-collapses out from under someone reading), and highlight lookup is O(1)
// via a precomputed ancestor-prefix set.

import { memo, useEffect, useMemo, useState } from "react";

type Json = unknown;

function isObj(v: Json): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function leafText(v: Json): string {
  if (typeof v === "string") return `"${v}"`;
  if (v === null) return "null";
  return String(v);
}

function Node({ name, value, path, exact, onPath, depth }: { name: string; value: Json; path: string; exact: Set<string>; onPath: Set<string>; depth: number }) {
  if (isObj(value) || Array.isArray(value)) {
    return <Branch name={name} value={value} path={path} exact={exact} onPath={onPath} depth={depth} />;
  }
  const accent = exact.has(path);
  return (
    <div
      style={{
        marginLeft: 12 + depth * 12,
        padding: "1px 4px",
        color: "#111",
        borderLeft: accent ? "2px solid #ff3b21" : "2px solid transparent",
        background: accent ? "#fff2f0" : "transparent"
      }}
    >
      <span style={{ fontWeight: 600 }}>{name}:</span> {leafText(value)}
    </div>
  );
}

function Branch({ name, value, path, exact, onPath, depth }: { name: string; value: Record<string, Json> | Json[]; path: string; exact: Set<string>; onPath: Set<string>; depth: number }) {
  const accent = exact.has(path);
  const hit = onPath.has(path); // this node or a descendant changed
  const [open, setOpen] = useState(depth < 2 || hit);
  // Auto-open when a change lands here; never auto-close (user stays in control).
  useEffect(() => {
    if (hit) setOpen(true);
  }, [hit]);

  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      style={{ marginLeft: depth ? 12 : 0 }}
    >
      <summary
        style={{
          cursor: "pointer",
          color: "#111",
          fontWeight: 600,
          padding: "1px 4px",
          borderLeft: accent ? "2px solid #ff3b21" : "2px solid transparent",
          background: accent ? "#fff2f0" : "transparent"
        }}
      >
        {name} <span style={{ fontWeight: 400, color: "#111" }}>{Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}</span>
      </summary>
      <div>
        {entries.map(([k, v]) => (
          <Node key={k} name={k} value={v} path={`${path}.${k}`} exact={exact} onPath={onPath} depth={depth + 1} />
        ))}
      </div>
    </details>
  );
}

function JsonTree({ data, changed }: { data: Json; changed?: Set<string> }) {
  // Expand the changed-paths set to include every ancestor prefix, so each node
  // can test membership in O(1) instead of scanning the whole set.
  const { exact, onPath } = useMemo(() => {
    const exact = changed ?? new Set<string>();
    const onPath = new Set<string>();
    for (const p of exact) {
      let acc = "";
      for (const part of p.split(".")) {
        acc = acc ? `${acc}.${part}` : part;
        onPath.add(acc);
      }
    }
    return { exact, onPath };
  }, [changed]);

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.55, color: "#111" }}>
      <Node name="state" value={data} path="state" exact={exact} onPath={onPath} depth={0} />
    </div>
  );
}

export default memo(JsonTree);
