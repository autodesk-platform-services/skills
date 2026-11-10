#!/usr/bin/env python3
"""List Design Automation AppBundles visible to the app (auto-paginated).

Ids look like "<owner>.<name>+<alias>"; <owner> is your client ID or nickname.

Examples:
  python list_appbundles.py
  python list_appbundles.py --mine --table
  python list_appbundles.py --engine-prefix AutoCAD
"""
import argparse
import sys
from pathlib import Path
from typing import Any, Iterator, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import SCOPES_DA, ApsError, Token, die, get_2legged_token, get_json, print_json, request, require_env  # noqa: E402

DA_BASE = "/da/us-east/v3"


def iter_appbundles(token: Optional[Token] = None) -> Iterator[str]:
    """Yield every AppBundle id ("owner.name+alias"), following `paginationToken`."""
    tok = token or get_2legged_token(SCOPES_DA)
    params = None
    while True:
        j = request("GET", f"{DA_BASE}/appbundles", tok, params=params).json()
        yield from j.get("data", [])
        page = j.get("paginationToken")
        if not page:
            return
        params = {"page": page}


def owners(token: Optional[Token] = None) -> set:
    """Owner prefixes that mean "mine": the client ID, plus the nickname if one is set."""
    tok = token or get_2legged_token(SCOPES_DA)
    found = {require_env("APS_CLIENT_ID")[0]}
    nick = get_json(f"{DA_BASE}/forgeapps/me", tok)
    if isinstance(nick, str) and nick:
        found.add(nick)
    return found


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mine", action="store_true", help="only bundles owned by this app (client ID or nickname)")
    ap.add_argument("--engine-prefix", help="only bundles whose name starts with this (e.g. AutoCAD, Revit, Fusion)")
    ap.add_argument("--table", action="store_true", help="one id per line instead of JSON")
    a = ap.parse_args()
    try:
        tok = get_2legged_token(SCOPES_DA)
        ids = list(iter_appbundles(tok))
        if a.mine:
            mine = owners(tok)
            ids = [i for i in ids if i.split(".", 1)[0] in mine]
    except KeyError as e:
        die(f"missing env var {e}")
    except ApsError as e:
        die(str(e))
    if a.engine_prefix:
        ids = [i for i in ids if i.startswith(a.engine_prefix)]
    if a.table:
        print("\n".join(ids))
    else:
        print_json(ids)


if __name__ == "__main__":
    main()
