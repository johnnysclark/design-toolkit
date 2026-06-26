# RAP Bridge

A tiny local companion that lets the **Radical Accessibility Project (RAP)**
website write your project's `state.json` into a folder on your own machine and
relay queries to the desktop **Rhino Watcher**, so RAP Studio on the website can
drive your local Rhino. The website runs over HTTPS in your browser; for
security, browsers can't write files to your disk directly. This bridge runs a
small server on `127.0.0.1` (your machine only) that the website calls to save
`state.json` and to ping/query the Watcher.

## Requirements

- **Python 3.8+** (already on most Macs and Linux; on Windows install from
  [python.org](https://www.python.org/)).
- **No pip installs.** It uses only the Python standard library.

## Quick start

1. Open a terminal in this folder (or anywhere) and run:

   ```bash
   python3 rap_bridge.py --folder /path/to/your/rap-project
   ```

   Replace `/path/to/your/rap-project` with the RAP project folder where your
   Rhino Watcher is looking for `state.json`.

   Optional flags:

   - `--port 7799` — the HTTP port the bridge listens on (default `7799`).
   - `--watcher-port 1998` — the TCP port the Rhino Watcher listens on
     (default `1998`).
   - `--token auto` — generate a random access token (default). Pass your own
     string to use a fixed token instead.

2. On startup the bridge prints a banner like:

   ```
   ================================================================
    RAP Bridge 1.0 -- local companion for Rhino
   ================================================================
    Writing to folder : /Users/you/rap-project
    state.json path   : /Users/you/rap-project/state.json
    Bind address      : 127.0.0.1 (localhost only)
    Port              : 7799
    Access token      : xY3k9_aB...   <- your token
    Watcher port      : 1998
    Watcher reachable : YES
   ================================================================
    Paste into RAP Studio's "Drive Rhino" panel:
      Base URL : http://127.0.0.1:7799
      Token    : xY3k9_aB...
   ================================================================
   ```

   - **Base URL** is where the website sends requests.
   - **Token** is a secret that proves the request came from *you* pasting it in
     (see Security below).

3. In RAP Studio on the website, open the **"Drive Rhino"** panel and paste in
   the **Base URL** and **Token** exactly as printed. The website will then be
   able to save `state.json` and ping your Watcher.

Leave the terminal window open while you work. Press **Ctrl+C** to stop the
bridge.

## How it fits the existing RAP flow

The bridge is just the messenger between the website and your existing setup:

1. RAP Studio (website) builds your project state and POSTs it to the bridge.
2. The bridge writes that text **atomically** to `<folder>/state.json`.
3. Your existing **Rhino Watcher** (TCP port `1998`) is already watching that
   file — when `state.json` changes, it rebuilds the model in Rhino.
4. After each write the bridge also sends a small `{"type":"ping"}` to the
   Watcher to nudge it, and RAP Studio can send richer queries (e.g.
   `{"type":"status"}`) through the bridge's `/query` endpoint.

Nothing about your Rhino Watcher needs to change. The bridge does not replace
it — it just delivers `state.json` and forwards messages.

## HTTP API (for reference)

All responses are JSON and include CORS + Private Network Access headers. Every
request except `OPTIONS` must include the token, either as the header
`X-RAP-Token: <token>` or the query string `?token=<token>`.

- `OPTIONS *` → `204` (CORS preflight; no token needed).
- `GET /ping` → bridge status + whether the Watcher is reachable.
- `POST /state` (body = full `state.json` text) → validates JSON, writes it
  atomically, nudges the Watcher.
- `GET /state` → returns the parsed `state.json` (or `null` if none yet).
- `POST /query` (body = JSON like `{"type":"status"}`) → forwards it to the
  Watcher and returns the Watcher's reply (or `reachable: false` if Rhino isn't
  listening).

## Security notes

- **Localhost only.** The bridge binds to `127.0.0.1`, never `0.0.0.0`. Other
  machines on your network cannot reach it.
- **Token required.** Every request (except the CORS preflight) must carry the
  access token. Requests with a missing or wrong token get `403`.
- **Why the token matters.** Without it, *any* web page open in your browser —
  not just RAP Studio — could POST to `http://127.0.0.1:7799` and overwrite your
  `state.json`. The token is a shared secret that you paste into RAP Studio by
  hand, so only that session can drive your Rhino.
- **Rotating the token.** Stop the bridge (Ctrl+C) and start it again. With
  `--token auto` you'll get a fresh random token each time; paste the new value
  back into RAP Studio. To pin a value, pass `--token your-secret-string`.

## Troubleshooting

### The browser blocks the request (mixed content / Private Network Access)

Browsers are cautious about an HTTPS page talking to a local (`127.0.0.1`)
server. The bridge already sends the required headers to allow this:

- Private Network Access: `Access-Control-Allow-Private-Network: true`
- CORS: `Access-Control-Allow-Origin: *`, plus the matching
  `Allow-Methods` / `Allow-Headers`, sent on **every** response including the
  preflight.

If a request is still blocked:

- **Use Chrome or Edge** — they implement Private Network Access most reliably.
- Make sure the **Base URL** and **Token** in RAP Studio match the banner
  exactly (including `http://` and the port).
- If your browser still refuses, RAP Studio offers a **"Download state.json"**
  fallback: download the file and drop it into your RAP folder by hand. The
  Watcher will pick it up the same way.

### Watcher shows "unreachable"

This just means nothing is listening on the Watcher port (default `1998`). It is
a normal state, not an error. To fix it:

- Make sure **Rhino is open**.
- Make sure the **Watcher script is running** inside Rhino and listening on port
  `1998` (or whatever you passed to `--watcher-port`).
- Re-run `GET /ping` (RAP Studio does this automatically) — once the Watcher is
  up it will report `reachable: true`.
