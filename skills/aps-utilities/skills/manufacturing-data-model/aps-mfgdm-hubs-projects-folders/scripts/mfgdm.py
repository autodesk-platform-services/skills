#!/usr/bin/env python3
"""Manufacturing Data Model (GraphQL) — read-only navigation, 3-legged.

Examples:
  python mfgdm.py hubs
  python mfgdm.py hubs --json
"""
import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterator, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import ApsError, die, get_3legged_token, request  # noqa: E402

GRAPHQL_PATH = "/mfg/graphql"
SCOPE = "data:read"

HUBS_QUERY = """
query($cursor: String) {
  hubs(pagination: {cursor: $cursor}) {
    pagination { cursor }
    results { id name }
  }
}
"""


def graphql(token: Any, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """POST one GraphQL query; raise ApsError-style on GraphQL `errors` (HTTP is 200 then)."""
    r = request("POST", GRAPHQL_PATH, token, json_body={"query": query, "variables": variables or {}}).json()
    if r.get("errors"):
        raise ValueError(f"GraphQL errors: {json.dumps(r['errors'])}")
    return r["data"]


def iter_hubs(token: Any) -> Iterator[Dict[str, Any]]:
    """All hubs, following pagination.cursor until it is empty."""
    cursor = None
    while True:
        hubs = graphql(token, HUBS_QUERY, {"cursor": cursor})["hubs"]
        yield from hubs["results"]
        cursor = (hubs.get("pagination") or {}).get("cursor")
        if not cursor:
            return


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("hubs", help="list hubs: id | name")
    h.add_argument("--json", action="store_true", help="raw results as JSON")
    a = ap.parse_args()
    try:
        tok = get_3legged_token(SCOPE)
        hubs = list(iter_hubs(tok))
    except (ValueError, ApsError) as e:
        die(str(e))
    if a.json:
        print(json.dumps(hubs, indent=2))
    else:
        for x in hubs:
            print(f"{x['id']} | {x['name']}")
        print(f"{len(hubs)} hub(s)")


if __name__ == "__main__":
    main()
