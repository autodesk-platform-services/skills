#!/usr/bin/env python3
"""Get a usable 3-legged access token, signing the user in via the browser if needed.

Order: stored token still valid -> refresh it -> pop up the Autodesk login page.

Examples:
  python ensure_token.py --scope "data:read" --raw
  export APS_ACCESS_TOKEN=$(python ensure_token.py --scope "data:read" --raw)

Importable:
  from ensure_token import ensure_token
  access_token = ensure_token("data:read")
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import ApsError, refresh_3legged_token  # noqa: E402
from login import DEFAULT_TOKEN_FILE, run_login, save_tokens  # noqa: E402


def ensure_token(scope: str = "data:read", token_file: Path = DEFAULT_TOKEN_FILE,
                 redirect_uri: str = "http://localhost:8080/callback", open_browser: bool = True) -> str:
    stored = json.loads(token_file.read_text()) if token_file.exists() else {}
    has_scope = set(scope.split()) <= set(stored.get("scope", "").split())

    if stored and has_scope:
        if time.time() < stored.get("expires_at", 0) - 60:
            return stored["access_token"]
        if stored.get("refresh_token"):
            try:
                tok = refresh_3legged_token(stored["refresh_token"], stored["scope"])
                stored.update({"access_token": tok.access_token,
                               "refresh_token": tok.refresh_token or stored["refresh_token"],
                               "expires_at": int(tok.expires_at)})
                save_tokens(stored, token_file)
                return stored["access_token"]
            except ApsError:
                print("refresh failed — signing in again", file=sys.stderr)

    # Always request offline_access so the next call can refresh silently.
    full_scope = scope if "offline_access" in scope.split() else f"{scope} offline_access"
    payload = run_login(full_scope, redirect_uri, open_browser)
    save_tokens(payload, token_file)
    return payload["access_token"]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--scope", default="data:read")
    ap.add_argument("--redirect-uri", default="http://localhost:8080/callback")
    ap.add_argument("--token-file", type=Path, default=DEFAULT_TOKEN_FILE)
    ap.add_argument("--no-browser", action="store_true", help="print the login URL instead of opening a browser")
    ap.add_argument("--raw", action="store_true", help="print only the access token (default behaviour)")
    a = ap.parse_args()
    print(ensure_token(a.scope, a.token_file, a.redirect_uri, not a.no_browser))


if __name__ == "__main__":
    main()
