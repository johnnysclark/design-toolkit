"use client";

// Drive Rhino — write state.json to the student's machine and talk to the
// Watcher, two ways: (1) direct folder write (File System Access, Chromium) and
// (2) the rap_bridge.py companion (cross-browser, + live Watcher status). A
// plain "Download state.json" is always there as the zero-setup fallback.

import { useEffect, useRef, useState } from "react";
import { fsSupported, pickDirectory, writeStateToDir, pingBridge, pushStateToBridge, queryWatcher, type BridgeInfo } from "../lib/rhino-bridge";

const card = "rounded-lg border-2 border-neutral-900 p-3 space-y-2";
const btn = "display-font rounded border-2 border-neutral-900 px-3 py-1.5 text-xs uppercase text-neutral-900 hover:bg-neutral-900 hover:text-white disabled:opacity-40";
const field = "rounded border-2 border-neutral-900 px-2 py-1 text-sm text-neutral-900 outline-none focus:border-[#ff3b21] focus-visible:ring-2 focus-visible:ring-[#ff3b21] focus-visible:ring-offset-1";

export default function DrivePanel({ stateText, onDownloadState, webOnly }: { stateText: string; onDownloadState: () => void; webOnly?: { walls: number; columns: number; openings: number; regions: number } }) {
  // ── Direct folder write ────────────────────────────────────────────────────
  const [dir, setDir] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirName, setDirName] = useState("");
  const [folderMsg, setFolderMsg] = useState("");
  const [autoFolder, setAutoFolder] = useState(false);
  const supported = fsSupported();

  const connectFolder = async () => {
    try {
      const handle = await pickDirectory();
      setDir(handle);
      setDirName(handle.name);
      setFolderMsg(`Connected “${handle.name}”. Push writes state.json into it.`);
    } catch {
      setFolderMsg("Folder selection was cancelled.");
    }
  };

  const pushFolder = async (text: string, silent = false) => {
    if (!dir) return;
    try {
      await writeStateToDir(dir, text);
      if (!silent) setFolderMsg(`Wrote state.json to “${dirName}” at ${stamp()}. The Watcher should rebuild.`);
    } catch (e) {
      setFolderMsg(e instanceof Error ? e.message : "Couldn't write the file (permission?).");
    }
  };

  // ── Companion bridge ───────────────────────────────────────────────────────
  const [url, setUrl] = useState("http://127.0.0.1:7799");
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<BridgeInfo | null>(null);
  const [bridgeMsg, setBridgeMsg] = useState("");
  const [autoBridge, setAutoBridge] = useState(false);

  // Load saved url/token (client only — avoid SSR localStorage access).
  useEffect(() => {
    const u = localStorage.getItem("rap-bridge-url");
    const t = localStorage.getItem("rap-bridge-token");
    if (u) setUrl(u);
    if (t) setToken(t);
  }, []);
  useEffect(() => {
    localStorage.setItem("rap-bridge-url", url);
    localStorage.setItem("rap-bridge-token", token);
  }, [url, token]);

  const testBridge = async () => {
    setBridgeMsg("Testing…");
    const r = await pingBridge(url, token);
    setInfo(r);
    // The desktop Watcher's live TCP link is off by default, so only surface it
    // when it's actually ON — a successful connection to the bridge is the signal.
    setBridgeMsg(r.ok ? `Connected to the bridge. Folder: ${r.folder ?? "?"}.${r.watcher?.reachable ? " Live link is on." : ""}` : r.error ?? "Failed.");
  };

  const pushBridge = async (text: string, silent = false) => {
    const r = await pushStateToBridge(url, token, text);
    if (!silent) setBridgeMsg(r.ok ? `Pushed ${r.bytes ?? 0} bytes at ${stamp()} — Rhino will rebuild on the file change.` : r.error ?? "Push failed.");
  };

  const pingWatcher = async () => {
    setBridgeMsg("Checking the optional live link…");
    const r = await queryWatcher(url, token, { type: "ping" });
    setBridgeMsg(r.ok ? (r.reachable ? "Live link is on — Rhino is listening on the query port." : "Live link is off — that's normal; your pushes still rebuild Rhino via the file watcher.") : r.error ?? "Check failed.");
  };

  // ── Auto-push on change (debounced) ────────────────────────────────────────
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!autoFolder && !autoBridge) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (autoFolder && dir) pushFolder(stateText, true);
      if (autoBridge) pushBridge(stateText, true);
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateText, autoFolder, autoBridge]);

  return (
    <div className="space-y-4 text-neutral-900">
      <p className="text-sm leading-relaxed text-neutral-900">
        <b>How it works:</b> your model is one <code className="font-mono">state.json</code> file. A small <b>Watcher</b> running inside Rhino
        rebuilds the geometry every time that file changes. So the whole job is getting <code className="font-mono">state.json</code> into the
        folder the Watcher is watching — three ways below, <b>simplest first</b>. (Set up the Watcher in Rhino once; see the last card.)
      </p>

      {/* Simple flow diagram — how a change here reaches Rhino (explains the live link). */}
      <figure className="my-1">
        <svg
          viewBox="0 0 728 120"
          role="img"
          aria-label="Flow diagram: this page in the browser writes state.json into your project folder; the Watcher running in Rhino watches that file and rebuilds the Rhino 3D model. Options A and B put the file in the folder by hand or by connecting it; the live link in Option C pushes it automatically as you edit."
          className="w-full max-w-3xl"
          style={{ height: "auto" }}
        >
          <defs>
            <marker id="rapArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#111" />
            </marker>
          </defs>
          {[
            { x: 10, l1: "This page", l2: "(browser)" },
            { x: 196, l1: "state.json", l2: "in your folder" },
            { x: 382, l1: "Watcher", l2: "in Rhino" },
            { x: 568, l1: "Rhino", l2: "3D model" }
          ].map((b) => (
            <g key={b.x}>
              <rect x={b.x} y={36} width={150} height={56} rx={6} fill="#fff" stroke="#111" strokeWidth={2} />
              <text x={b.x + 75} y={61} textAnchor="middle" fontSize={14} fontWeight={700} fill="#111">{b.l1}</text>
              <text x={b.x + 75} y={79} textAnchor="middle" fontSize={12} fill="#111">{b.l2}</text>
            </g>
          ))}
          {[
            { x1: 162, x2: 194, label: "writes" },
            { x1: 348, x2: 380, label: "watches" },
            { x1: 534, x2: 566, label: "rebuilds" }
          ].map((a) => (
            <g key={a.x1}>
              <line x1={a.x1} y1={64} x2={a.x2 - 3} y2={64} stroke="#111" strokeWidth={2} markerEnd="url(#rapArrow)" />
              <text x={(a.x1 + a.x2) / 2} y={26} textAnchor="middle" fontSize={11} fill="#111">{a.label}</text>
            </g>
          ))}
        </svg>
        <figcaption className="mt-1 text-xs leading-relaxed text-neutral-900">
          Options <b>A</b> and <b>B</b> put <code className="font-mono">state.json</code> into the folder by hand or by connecting it. The{" "}
          <b>live link</b> (Option <b>C</b>) pushes it straight from this page the moment you change anything — so Rhino rebuilds as you work.
        </figcaption>
      </figure>

      {/* Static visual note (NOT a live region): the embedded counts change on
          every add/remove, so role="alert" would re-speak the whole paragraph
          assertively each edit. The edit itself is already announced. */}
      {webOnly && webOnly.walls + webOnly.columns + webOnly.openings + webOnly.regions > 0 && (
        <p className="rounded-md border-2 border-[#ff3b21] bg-[#fff2f0] px-3 py-2 text-sm text-neutral-900">
          <b>Heads up:</b>{" "}
          {[
            webOnly.regions ? `${webOnly.regions} geometric region${webOnly.regions === 1 ? "" : "s"}` : "",
            webOnly.walls ? `${webOnly.walls} free wall${webOnly.walls === 1 ? "" : "s"}` : "",
            webOnly.columns ? `${webOnly.columns} free column${webOnly.columns === 1 ? "" : "s"}` : "",
            webOnly.openings ? `${webOnly.openings} wall opening${webOnly.openings === 1 ? "" : "s"}` : ""
          ]
            .filter(Boolean)
            .join(", ")}{" "}
          are studio-native and the current desktop Watcher does <b>not</b> rebuild them yet — regions and free geometry stay in the file under <code className="font-mono">web_*</code> keys. Bays, apertures and levels do round-trip; an irregular site boundary currently flattens to a rectangle in Rhino.
        </p>
      )}

      {/* Option A — download (simplest, any browser) */}
      <div className={card}>
        <h3 className="display-font text-xs uppercase tracking-tight">Option A · Download the file (any browser, no setup)</h3>
        <button type="button" className={btn} onClick={onDownloadState}>Download state.json</button>
        <p className="text-xs leading-relaxed text-neutral-900">Save it into your Rhino project folder — the one the Watcher is watching. Re-download to replace it whenever you want Rhino to rebuild.</p>
      </div>

      {/* Option B — auto folder write (Chrome / Edge) */}
      <div className={card}>
        <h3 className="display-font text-xs uppercase tracking-tight">Option B · Auto-write to that folder (Chrome or Edge)</h3>
        {supported ? (
          <>
            <p className="text-xs leading-relaxed text-neutral-900">Skip the downloads: connect your Rhino project folder once, then push <code className="font-mono">state.json</code> straight into it.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btn} onClick={connectFolder}>
                {dir ? "Reconnect folder" : "Connect Rhino folder"}
              </button>
              <button type="button" className={btn} onClick={() => pushFolder(stateText)} disabled={!dir}>
                Push state.json
              </button>
              <label className="flex items-center gap-1.5 text-xs font-semibold">
                <input type="checkbox" checked={autoFolder} onChange={(e) => setAutoFolder(e.target.checked)} disabled={!dir} aria-label="Auto-push to the connected folder on change" />
                Auto-push on every change
              </label>
            </div>
            <p className="min-h-[1rem] text-xs text-neutral-900" aria-live="polite">{folderMsg}</p>
          </>
        ) : (
          <p className="text-xs text-neutral-900">This browser can&rsquo;t write files directly — use Chrome or Edge, or use Option C below.</p>
        )}
      </div>

      {/* Option C — live bridge, set up once with numbered steps */}
      <div className={card}>
        <h3 className="display-font text-xs uppercase tracking-tight">Option C · Live bridge (any browser)</h3>
        <p className="text-xs leading-relaxed text-neutral-900">For any browser, or a live link to Rhino: a tiny helper runs on your machine and this page pushes to it. Set it up once:</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-900">
          <li>
            Download the helper and save it next to your Rhino project folder:
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <a href="/rap-bridge/rap_bridge.py" download className="display-font inline-block rounded border-2 border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs uppercase text-white hover:border-[#ff3b21] hover:bg-[#ff3b21]">Download Watcher (rap_bridge.py)</a>
              <a href="/rap-bridge/README.md" download className="text-xs underline underline-offset-2 hover:text-[#ff3b21]">readme</a>
            </div>
          </li>
          <li>
            In a terminal, run it pointed at that folder:
            <pre className="mt-1 overflow-x-auto rounded bg-[#0e0e0e] p-2 font-mono text-[11px] text-[#e8e8e8]">python3 rap_bridge.py --folder /path/to/your/rap-project</pre>
          </li>
          <li>
            It prints a <b>URL</b> and a <b>token</b> — paste them here and test:
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold">Bridge URL<input className={field} value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} /></label>
              <label className="flex flex-col gap-1 text-xs font-semibold">Token<input className={field} value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste from rap_bridge.py" spellCheck={false} /></label>
              <button type="button" className={btn} onClick={testBridge}>Test connection</button>
            </div>
          </li>
          <li>
            Push the model — now, or automatically on every change:
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button type="button" className={btn} onClick={() => pushBridge(stateText)}>Push to Rhino</button>
              <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" checked={autoBridge} onChange={(e) => setAutoBridge(e.target.checked)} aria-label="Auto-push to the bridge on change" />Auto-push on every change</label>
              <button type="button" className={btn} onClick={pingWatcher} title="Optional live query link (advanced; off by default)">Check live link</button>
            </div>
          </li>
        </ol>
        <p className="min-h-[1rem] text-xs text-neutral-900" aria-live="polite">{bridgeMsg}</p>
        {info?.watcher?.reachable && (
          <p className="text-xs text-neutral-900">Live link: <b>on</b> (Rhino is answering on port {info.watcher.port}).</p>
        )}
      </div>

      {/* In Rhino — the other half, needed for every option */}
      <div className={card}>
        <h3 className="display-font text-xs uppercase tracking-tight">In Rhino (once)</h3>
        <p className="text-xs leading-relaxed text-neutral-900">
          Open the RAP <b>Watcher</b> script in Rhino, point it at the <b>same folder</b>, and press play. It rebuilds the bay geometry,
          walls, corridors, apertures and levels whenever <code className="font-mono">state.json</code> changes. Floor plates, extruded
          boxes and free walls travel in the file under <code className="font-mono">web_*</code> keys, but the current Watcher doesn&rsquo;t
          rebuild those yet.
        </p>
      </div>
    </div>
  );
}

function stamp(): string {
  const d = new Date();
  return d.toLocaleTimeString();
}
