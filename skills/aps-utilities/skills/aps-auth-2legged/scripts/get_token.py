#!/usr/bin/env python3
"""Get a 2-legged APS token.

Examples:
  python get_token.py
  python get_token.py --scope "bucket:read data:read"
  export APS_ACCESS_TOKEN=$(python get_token.py --raw)
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import SCOPES_OSS_WRITE, ApsError, die, get_2legged_token, print_json  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--scope", default=SCOPES_OSS_WRITE, help="space-separated scopes")
    ap.add_argument("--raw", action="store_true", help="print only the access token")
    a = ap.parse_args()
    try:
        t = get_2legged_token(a.scope)
    except KeyError as e:
        die(f"missing env var {e}")
    except ApsError as e:
        die(str(e))
    if a.raw:
        print(t.access_token)
    else:
        print_json({"access_token": t.access_token, "expires_at": int(t.expires_at), "scope": t.scope})


if __name__ == "__main__":
    main()
