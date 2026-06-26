#!/usr/bin/env python3
"""
RAP Bridge -- Local Companion Bridge for the Radical Accessibility Project (RAP).

A tiny, self-contained HTTP server that lets a website served over HTTPS write
the project's ``state.json`` into a folder on the student's machine and relay
queries to the desktop Rhino "Watcher" (a TCP listener, default port 1998).

Stdlib only. No pip installs. Binds to 127.0.0.1 ONLY.

Run:
    python3 rap_bridge.py --folder /path/to/rap-project [--port 7799] \
        [--watcher-port 1998] [--token auto]
"""

import argparse
import json
import os
import secrets
import socket
import socketserver
import tempfile
import threading
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

NAME = "rap-bridge"
VERSION = "1.0"

# ---------------------------------------------------------------------------
# Configuration (populated in main(), read by the request handler).
# ---------------------------------------------------------------------------


class Config:
    folder = "."
    state_path = "state.json"
    port = 7799
    watcher_port = 1998
    token = ""


CONFIG = Config()


# ---------------------------------------------------------------------------
# Watcher (Rhino) helpers -- talk to the desktop TCP listener.
# ---------------------------------------------------------------------------


def watcher_reachable(port, timeout=0.5):
    """Return True if something is listening on 127.0.0.1:<port> right now."""
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def watcher_send_ping(port, timeout=0.5):
    """Best-effort nudge: open a socket, send {"type":"ping"}\\n, ignore result."""
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout) as sock:
            sock.sendall(b'{"type":"ping"}\n')
        return True
    except OSError:
        return False


def watcher_query(payload, port, timeout=2.0):
    """
    Send a JSON object + newline to the watcher and read one newline-terminated
    JSON response. Returns (reachable, parsed_response).
    Unreachable is a NORMAL state -- callers should not treat it as an error.
    """
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout) as sock:
            sock.settimeout(timeout)
            data = (json.dumps(payload) + "\n").encode("utf-8")
            sock.sendall(data)

            buf = bytearray()
            while b"\n" not in buf:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                buf.extend(chunk)

            if not buf:
                # Connected but no reply -- still "reachable", just no response.
                return True, None

            line = bytes(buf).split(b"\n", 1)[0]
            try:
                parsed = json.loads(line.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                parsed = None
            return True, parsed
    except OSError:
        return False, None


# ---------------------------------------------------------------------------
# State file helpers -- atomic write + safe read.
# ---------------------------------------------------------------------------


def write_state_atomic(folder, text):
    """
    Write ``text`` to <folder>/state.json atomically: write to a temp file in
    the SAME directory, then os.replace() onto the final path. Returns the
    number of bytes written.
    """
    encoded = text.encode("utf-8")
    os.makedirs(folder, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=".state-", suffix=".tmp", dir=folder)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_path, os.path.join(folder, "state.json"))
    except BaseException:
        # Clean up the temp file on any failure, then re-raise.
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
    return len(encoded)


def read_state(folder):
    """Read and parse <folder>/state.json. Returns parsed JSON or None if absent."""
    path = os.path.join(folder, "state.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


# ---------------------------------------------------------------------------
# HTTP request handler.
# ---------------------------------------------------------------------------


class RapBridgeHandler(BaseHTTPRequestHandler):
    server_version = "%s/%s" % (NAME, VERSION)
    protocol_version = "HTTP/1.1"

    # -- low-level response helpers ----------------------------------------

    def _cors_headers(self):
        """CORS + Private Network Access headers sent on EVERY response."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-RAP-Token")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "86400")

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _send_no_content(self):
        self.send_response(204)
        self._cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    # -- auth ---------------------------------------------------------------

    def _token_ok(self, query):
        """Token via header X-RAP-Token or ?token=. Returns True if it matches."""
        supplied = self.headers.get("X-RAP-Token")
        if not supplied:
            values = query.get("token")
            if values:
                supplied = values[0]
        return bool(supplied) and secrets.compare_digest(supplied, CONFIG.token)

    # -- body helper --------------------------------------------------------

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return ""
        return self.rfile.read(length).decode("utf-8")

    # -- quiet, single-line logging ----------------------------------------

    def log_message(self, fmt, *args):
        try:
            line = fmt % args
        except Exception:
            line = fmt
        print("[%s] %s" % (NAME, line))

    # -- HTTP verbs ---------------------------------------------------------

    def do_OPTIONS(self):
        # Preflight: no token required.
        self._send_no_content()

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    # -- dispatcher ---------------------------------------------------------

    def _dispatch(self, method):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query = parse_qs(parsed.query)

        try:
            # Every non-OPTIONS request requires a valid token.
            if not self._token_ok(query):
                self._send_json(403, {"ok": False, "error": "forbidden: bad or missing token"})
                return

            if method == "GET" and path == "/ping":
                self._handle_ping()
            elif method == "POST" and path == "/state":
                self._handle_post_state()
            elif method == "GET" and path == "/state":
                self._handle_get_state()
            elif method == "POST" and path == "/query":
                self._handle_query()
            else:
                self._send_json(404, {"ok": False, "error": "not found"})
        except Exception as exc:  # noqa: BLE001 -- never let a request crash the server.
            try:
                self._send_json(500, {"ok": False, "error": str(exc)})
            except Exception:
                pass

    # -- endpoint handlers --------------------------------------------------

    def _handle_ping(self):
        reachable = watcher_reachable(CONFIG.watcher_port)
        self._send_json(200, {
            "ok": True,
            "name": NAME,
            "version": VERSION,
            "folder": CONFIG.folder,
            "statePath": CONFIG.state_path,
            "watcher": {"reachable": reachable, "port": CONFIG.watcher_port},
        })

    def _handle_post_state(self):
        text = self._read_body()
        # Validate that the body parses as JSON before touching disk.
        try:
            json.loads(text)
        except ValueError as exc:
            self._send_json(400, {"ok": False, "error": "invalid JSON: %s" % exc})
            return

        nbytes = write_state_atomic(CONFIG.folder, text)
        # Best-effort nudge to the watcher after a successful write.
        pinged = watcher_send_ping(CONFIG.watcher_port)

        self._send_json(200, {
            "ok": True,
            "bytes": nbytes,
            "statePath": CONFIG.state_path,
            "watcherPinged": pinged,
        })

    def _handle_get_state(self):
        try:
            state = read_state(CONFIG.folder)
        except ValueError:
            # File exists but is not valid JSON -- report it rather than crash.
            self._send_json(200, {"ok": True, "state": None})
            return
        self._send_json(200, {"ok": True, "state": state})

    def _handle_query(self):
        text = self._read_body()
        try:
            payload = json.loads(text) if text else {}
        except ValueError as exc:
            self._send_json(400, {"ok": False, "error": "invalid JSON: %s" % exc})
            return

        reachable, response = watcher_query(payload, CONFIG.watcher_port)
        self._send_json(200, {
            "ok": True,
            "reachable": reachable,
            "response": response if reachable else None,
        })


# ---------------------------------------------------------------------------
# Threading HTTP server bound to localhost only.
# ---------------------------------------------------------------------------


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


# ---------------------------------------------------------------------------
# Entry point.
# ---------------------------------------------------------------------------


def parse_args():
    parser = argparse.ArgumentParser(
        prog="rap_bridge.py",
        description="Local companion bridge for the Radical Accessibility Project (RAP).",
    )
    parser.add_argument(
        "--folder",
        required=True,
        help="The RAP project folder to write state.json into.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=7799,
        help="HTTP port for this bridge (default: 7799).",
    )
    parser.add_argument(
        "--watcher-port",
        type=int,
        default=1998,
        help="TCP port of the Rhino Watcher (default: 1998).",
    )
    parser.add_argument(
        "--token",
        default="auto",
        help="Access token. Use 'auto' (default) to generate a random one.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    folder = os.path.abspath(os.path.expanduser(args.folder))
    os.makedirs(folder, exist_ok=True)
    state_path = os.path.join(folder, "state.json")

    if args.token == "auto":
        token = secrets.token_urlsafe(24)
    else:
        token = args.token

    CONFIG.folder = folder
    CONFIG.state_path = state_path
    CONFIG.port = args.port
    CONFIG.watcher_port = args.watcher_port
    CONFIG.token = token

    reachable = watcher_reachable(args.watcher_port)
    base_url = "http://127.0.0.1:%d" % args.port

    bar = "=" * 64
    print(bar)
    print(" RAP Bridge %s -- local companion for Rhino" % VERSION)
    print(bar)
    print(" Writing to folder : %s" % folder)
    print(" state.json path   : %s" % state_path)
    print(" Bind address      : 127.0.0.1 (localhost only)")
    print(" Port              : %d" % args.port)
    print(" Access token      : %s" % token)
    print(" Watcher port      : %d" % args.watcher_port)
    print(" Watcher reachable : %s" % ("YES" if reachable else "no (is Rhino + Watcher running?)"))
    print(bar)
    print(" Paste into RAP Studio's \"Drive Rhino\" panel:")
    print("   Base URL : %s" % base_url)
    print("   Token    : %s" % token)
    print(bar)
    print(" Press Ctrl+C to stop.")
    print(bar)

    server = ThreadingHTTPServer(("127.0.0.1", args.port), RapBridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[%s] shutting down." % NAME)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
