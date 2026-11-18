#!/usr/bin/env python3
"""Interactive 3-legged login for local/CLI use.

Starts a tiny HTTP server on the callback port, opens the Autodesk login page,
exchanges the returned code (with PKCE) for tokens and stores them in
~/.aps_tokens.json (override with --token-file).

Importable: run_login(scope) pops up the browser and returns the token payload.

Example:
  python login.py --scope "data:read data:write data:create offline_access"
"""
import argparse
import base64
import hashlib
import http.server
import json
import os
import secrets
import sys
import threading
import webbrowser
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import ApsError, base_url, die, exchange_code_for_token, print_json, require_env  # noqa: E402

DEFAULT_TOKEN_FILE = Path.home() / ".aps_tokens.json"


def pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)[:128]
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    return verifier, challenge


def run_login(scope: str, redirect_uri: str = "http://localhost:8080/callback",
              open_browser: bool = True, timeout: int = 300) -> dict:
    """Show the Autodesk sign-in page in the browser, catch the callback, return the token payload."""
    try:
        require_env("APS_CLIENT_ID")
    except ApsError as e:
        die(str(e))

    verifier, challenge = pkce_pair()
    state = secrets.token_urlsafe(16)
    auth_url = f"{base_url()}/authentication/v2/authorize?" + urlencode({
        "response_type": "code",
        "client_id": os.environ["APS_CLIENT_ID"],
        "redirect_uri": redirect_uri,
        "scope": scope,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    })

    u = urlparse(redirect_uri)
    result: dict = {}
    done = threading.Event()

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            q = parse_qs(urlparse(self.path).query)
            if urlparse(self.path).path != u.path:
                self.send_response(404); self.end_headers(); return
            result.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h3>APS login complete. You can close this tab.</h3>")
            done.set()

        def log_message(self, *_):  # silence
            pass

    try:
        srv = http.server.HTTPServer((u.hostname or "localhost", u.port or 80), Handler)
    except OSError as e:
        die(f"cannot listen on {u.hostname}:{u.port} ({e}) — is another login running?")
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    print(f"Sign in to Autodesk in your browser. If it did not open, use this URL:\n{auth_url}\n", file=sys.stderr)
    if open_browser and not webbrowser.open(auth_url):
        print("(could not launch a browser automatically)", file=sys.stderr)
    finished = done.wait(timeout)
    srv.shutdown()

    if not finished:
        die(f"no login within {timeout}s — run again")
    if result.get("state") != state:
        die("state mismatch — possible CSRF, aborting")
    if "code" not in result:
        die(f"authorization failed: {result}")

    try:
        tok = exchange_code_for_token(result["code"], redirect_uri, verifier)
    except ApsError as e:
        die(str(e))
    return {"access_token": tok.access_token, "refresh_token": tok.refresh_token,
            "expires_at": int(tok.expires_at), "scope": scope}


def save_tokens(payload: dict, token_file: Path = DEFAULT_TOKEN_FILE) -> None:
    token_file.write_text(json.dumps(payload, indent=2))
    os.chmod(token_file, 0o600)
    print(f"saved tokens -> {token_file}", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--scope", default="data:read data:write data:create offline_access")
    ap.add_argument("--redirect-uri", default="http://localhost:8080/callback")
    ap.add_argument("--token-file", type=Path, default=DEFAULT_TOKEN_FILE)
    ap.add_argument("--no-browser", action="store_true", help="print the URL instead of opening a browser")
    ap.add_argument("--timeout", type=int, default=300, help="seconds to wait for the sign-in")
    a = ap.parse_args()

    payload = run_login(a.scope, a.redirect_uri, not a.no_browser, a.timeout)
    save_tokens(payload, a.token_file)
    print_json(payload)


if __name__ == "__main__":
    main()
