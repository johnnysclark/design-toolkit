"use client";

// The canonical state, shown as a navigable tree — the "source of truth" panel.
// Uses native <details>/<summary> so it's keyboard-operable and announced as a
// disclosure by screen readers with no custom ARIA. Recently-changed paths get
// an accent so you can watch the JSON build up as you author.

type Json = unknown;

function isObj(v: Json): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function leafText(v: Json): string {
  if (typeof v === "string") return `"${v}"`;
  if (v === null) return "null";
  return String(v);
}

function Node({ name, value, path, changed, depth }: { name: string; value: Json; path: string; changed: Set<string>; depth: number }) {
  const hit = changed.has(path) || [...changed].some((c) => c.startsWith(path + "."));
  const accent = changed.has(path);

  if (isObj(value) || Array.isArray(value)) {
    const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
    const count = entries.length;
    return (
      <details open={depth < 2 || hit} style={{ marginLeft: depth ? 12 : 0 }}>
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
          {name} <span style={{ fontWeight: 400, color: "#111" }}>{Array.isArray(value) ? `[${count}]` : `{${count}}`}</span>
        </summary>
        <div>
          {entries.map(([k, v]) => (
            <Node key={k} name={k} value={v} path={`${path}.${k}`} changed={changed} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }

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

export default function JsonTree({ data, changed }: { data: Json; changed?: Set<string> }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.55, color: "#111" }}>
      <Node name="state" value={data} path="state" changed={changed ?? new Set()} depth={0} />
    </div>
  );
}
