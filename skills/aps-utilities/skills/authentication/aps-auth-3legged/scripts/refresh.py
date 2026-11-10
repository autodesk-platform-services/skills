#!/usr/bin/env python3
"""Refresh a stored 3-legged token (~/.aps_tokens.json) and print it.

Examples:
  python refresh.py
  export APS_ACCESS_TOKEN=$(python refresh.py --raw)
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import ApsError, die, print_json, refresh_3legged_token  # noqa: E402

DEFAULT_TOKEN_FILE = Path.home() / ".aps_tokens.json"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--token-file", type=Path, default=DEFAULT_TOKEN_FILE)
    ap.add_argument("--force", action="store_true", help="refresh even if the token is still valid")
    ap.add_argument("--raw", action="store_true", help="print only the access token")
    a = ap.parse_args()

    if not a.token_file.exists():
        die(f"{a.token_file} not found — run login.py first")
    stored = json.loads(a.token_file.read_text())

    if a.force or time.time() > stored.get("expires_at", 0) - 60:
        if not stored.get("refresh_token"):
            die("no refresh_token stored (did you request offline_access?) — run login.py")
        try:
            tok = refresh_3legged_token(stored["refresh_token"], stored.get("scope"))
        except ApsError as e:
            die(str(e))
        stored.update({"access_token": tok.access_token, "refresh_token": tok.refresh_token or stored["refresh_token"],
                       "expires_at": int(tok.expires_at)})
        a.token_file.write_text(json.dumps(stored, indent=2))
        os.chmod(a.token_file, 0o600)

    print(stored["access_token"]) if a.raw else print_json(stored)


if __name__ == "__main__":
    main()
