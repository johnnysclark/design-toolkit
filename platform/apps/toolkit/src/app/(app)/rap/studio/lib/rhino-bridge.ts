// ─────────────────────────────────────────────────────────────────────────────
// Client for talking to a state.json + the Rhino Watcher from the browser.
//
// Two transports:
//  1. Direct folder write — the File System Access API lets the page write
//     state.json straight into the student's RAP folder (Chromium only, with a
//     one-time permission). The desktop Watcher's mtime poll then rebuilds Rhino.
//  2. Companion bridge — a tiny localhost server (rap_bridge.py) that writes the
//     file AND relays Watcher (TCP 1998) queries. Works cross-browser; solves the
//     HTTPS→localhost issue with CORS + Private-Network-Access headers + a token.
// ─────────────────────────────────────────────────────────────────────────────

// ── Direct folder write (File System Access API) ─────────────────────────────

export function fsSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Prompt for a directory; returns a handle (or throws/aborts). */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  // showDirectoryPicker isn't in the default DOM lib types yet.
  const w = window as unknown as { showDirectoryPicker: (o?: unknown) => Promise<FileSystemDirectoryHandle> };
  return await w.showDirectoryPicker({ mode: "readwrite", id: "rap-folder" });
}

/** Write state.json into a previously-picked directory handle. */
export async function writeStateToDir(dir: FileSystemDirectoryHandle, text: string): Promise<void> {
  const handle = (dir as unknown as { getFileHandle: (n: string, o: { create: boolean }) => Promise<FileSystemFileHandle> });
  const fh = await handle.getFileHandle("state.json", { create: true });
  const writable = await (fh as unknown as { createWritable: () => Promise<{ write: (s: string) => Promise<void>; close: () => Promise<void> }> }).createWritable();
  await writable.write(text);
  await writable.close();
}

// ── Companion bridge (rap_bridge.py) ─────────────────────────────────────────

export interface BridgeInfo {
  ok: boolean;
  folder?: string;
  statePath?: string;
  watcher?: { reachable: boolean; port: number };
  error?: string;
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

function bridgeError(e: unknown): string {
  // A failed fetch to localhost is almost always "not running" or a browser
  // blocking the cross-origin/private-network request.
  if (e instanceof TypeError) {
    return "Couldn't reach the bridge. Make sure rap_bridge.py is running, and use Chrome or Edge (an HTTPS page can only reach a localhost bridge in Chromium browsers).";
  }
  return e instanceof Error ? e.message : "Bridge request failed.";
}

export async function pingBridge(baseUrl: string, token: string): Promise<BridgeInfo> {
  try {
    const r = await fetch(joinUrl(baseUrl, "/ping"), { headers: { "X-RAP-Token": token } });
    if (r.status === 403) return { ok: false, error: "The bridge rejected the token. Copy the token printed by rap_bridge.py." };
    if (!r.ok) return { ok: false, error: `Bridge returned HTTP ${r.status}.` };
    return (await r.json()) as BridgeInfo;
  } catch (e) {
    return { ok: false, error: bridgeError(e) };
  }
}

export async function pushStateToBridge(baseUrl: string, token: string, stateText: string): Promise<{ ok: boolean; bytes?: number; watcherPinged?: boolean; error?: string }> {
  try {
    const r = await fetch(joinUrl(baseUrl, "/state"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RAP-Token": token },
      body: stateText
    });
    if (r.status === 403) return { ok: false, error: "The bridge rejected the token." };
    if (!r.ok) return { ok: false, error: `Bridge returned HTTP ${r.status}.` };
    return await r.json();
  } catch (e) {
    return { ok: false, error: bridgeError(e) };
  }
}

export async function queryWatcher(baseUrl: string, token: string, req: Record<string, unknown> = { type: "ping" }): Promise<{ ok: boolean; reachable?: boolean; response?: unknown; error?: string }> {
  try {
    const r = await fetch(joinUrl(baseUrl, "/query"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RAP-Token": token },
      body: JSON.stringify(req)
    });
    if (!r.ok) return { ok: false, error: `Bridge returned HTTP ${r.status}.` };
    return await r.json();
  } catch (e) {
    return { ok: false, error: bridgeError(e) };
  }
}
