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

export default function DrivePanel({ stateText, onDownloadState, webOnly }: { stateText: string; onDownloadState: () => void; webOnly?: { walls: number; columns: number; openings: number; rooms: number } }) {
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
        Send this model to your desktop Rhino. The studio emits a complete{" "}
        <code className="font-mono">state.json</code>; the existing Watcher rebuilds the <b>bay-based</b> geometry (grids, walls, corridors, apertures) and levels when that file changes.
      </p>

      {/* Static visual note (NOT a live region): the embedded counts change on
          every add/remove, so role="alert" would re-speak the whole paragraph
          assertively each edit. The edit itself is already announced. */}
      {webOnly && webOnly.walls + webOnly.columns + webOnly.openings + webOnly.rooms > 0 && (
        <p className="rounded-md border-2 border-[#ff3b21] bg-[#fff2f0] px-3 py-2 text-sm text-neutral-900">
          <b>Heads up:</b>{" "}
          {[
            webOnly.rooms ? `${webOnly.rooms} program room${webOnly.rooms === 1 ? "" : "s"}` : "",
            webOnly.walls ? `${webOnly.walls} free wall${webOnly.walls === 1 ? "" : "s"}` : "",
            webOnly.columns ? `${webOnly.columns} free column${webOnly.columns === 1 ? "" : "s"}` : "",
            webOnly.openings ? `${webOnly.openings} wall opening${webOnly.openings === 1 ? "" : "s"}` : ""
          ]
            .filter(Boolean)
            .join(", ")}{" "}
          are studio-native and the current desktop Watcher does <b>not</b> rebuild them yet — they stay in the file (rooms in the native <code className="font-mono">rooms</code> key, the rest under <code className="font-mono">web_*</code>). Bays, apertures and levels do round-trip; an irregular site boundary currently flattens to a rectangle in Rhino.
        </p>
      )}

      {/* 1 — Direct folder write */}
      <div className={card}>
        <h3 className="display-font text-xs uppercase tracking-tight">1 · Write to a folder (Chrome / Edge)</h3>
        {supported ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btn} onClick={connectFolder}>
                {dir ? "Reconnect folder" : "Connect Rhino folder"}
              </button>
              <button type="button" className={btn} onClick={() => pushFolder(stateText)} disabled={!dir}>
                Push state.json
              </button>
              <label className="flex items-center gap-1.5 text-xs font-semibold">
                <input type="checkbox" checked={autoFolder} onChange={(e) => setAutoFolder(e.target.checked)} disabled={!dir} aria-label="Auto-push to the connected folder on change" />
                Auto-push on change
              </label>
            </div>
            <p className="min-h-[1rem] text-xs text-neutral-900" aria-live="polite">{folderMsg}</p>
          </>
        ) : (
          <p className="text-xs text-neutral-900">This browser can&rsquo;t write files directly. Use Chrome or Edge, or use the companion bridge below.</p>
        )}
      </div>

      {/* 2 — Companion bridge */}
      <div className={card}>
        <h3 className="display-font text-xs uppercase tracking-tight">2 · Companion bridge (any browser, + live Watcher)</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Bridge URL
            <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Token
            <input className={field} value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste from rap_bridge.py" spellCheck={false} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btn} onClick={testBridge}>Test connection</button>
          <button type="button" className={btn} onClick={() => pushBridge(stateText)}>Push to Rhino</button>
          <button type="button" className={btn} onClick={pingWatcher} title="Optional live query link (advanced; off by default)">Check live link</button>
          <label className="flex items-center gap-1.5 text-xs font-semibold">
            <input type="checkbox" checked={autoBridge} onChange={(e) => setAutoBridge(e.target.checked)} aria-label="Auto-push to the bridge on change" />
            Auto-push on change
          </label>
        </div>
        <p className="min-h-[1rem] text-xs text-neutral-900" aria-live="polite">{bridgeMsg}</p>
        {info?.watcher?.reachable && (
          <p className="text-xs text-neutral-900">
            Optional live link: <b>on</b> (Rhino is answering on port {info.watcher.port}).
          </p>
        )}
        <p className="text-xs leading-relaxed text-neutral-900">
          Run the bridge:{" "}
          <a href="/rap-bridge/rap_bridge.py" download className="font-semibold underline underline-offset-2 hover:text-[#ff3b21]">download rap_bridge.py</a>{" "}
          (<a href="/rap-bridge/README.md" download className="underline underline-offset-2 hover:text-[#ff3b21]">readme</a>), then:
        </p>
        <pre className="overflow-x-auto rounded bg-[#0e0e0e] p-2 font-mono text-[11px] text-[#e8e8e8]">python3 rap_bridge.py --folder /path/to/your/rap-project</pre>
        <p className="text-xs text-neutral-900">It prints a URL and token — paste them above.</p>
      </div>

      {/* 3 — Always-available fallback */}
      <div className={card}>
        <h3 className="display-font text-xs uppercase tracking-tight">3 · Manual (works everywhere)</h3>
        <button type="button" className={btn} onClick={onDownloadState}>Download state.json</button>
        <p className="text-xs text-neutral-900">Save it into your RAP project folder by hand; the Watcher rebuilds on the file change.</p>
      </div>
    </div>
  );
}

function stamp(): string {
  const d = new Date();
  return d.toLocaleTimeString();
}
