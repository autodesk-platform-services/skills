#!/usr/bin/env python3
"""Soft-delete a BIM 360 Docs / ACC item by posting a version with extension `versions:autodesk.core:Deleted`.

NOT supported for Fusion Team (`a.` project ids): the API has no documented delete there (a 400 BAD_INPUT is
returned) — delete those files in the Fusion web UI.

3-legged. Modifying -> needs approval (confirm_modification / --yes).

Example:
  python delete_item.py --project PROJECT_ID --item urn:adsk.wipprod:dm.lineage:xxxx --yes
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import (SCOPES_DM_WRITE, ApsError, confirm_modification, die, enc,  # noqa: E402
                        get_3legged_token, print_json, request)


def delete_item(tok, project: str, item: str, name: str) -> dict:
    body = {"jsonapi": {"version": "1.0"},
            "data": {"type": "versions",
                     "attributes": {"name": name, "extension": {"type": "versions:autodesk.core:Deleted", "version": "1.0"}},
                     "relationships": {"item": {"data": {"type": "items", "id": item}}}}}
    return request("POST", f"/data/v1/projects/{enc(project)}/versions", tok,
                   headers={"Content-Type": "application/vnd.api+json"}, json_body=body).json()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True)
    ap.add_argument("--item", required=True, help="item (lineage) URN")
    ap.add_argument("--yes", action="store_true", help="user already approved this exact action (agents: only then)")
    a = ap.parse_args()
    if a.project.startswith("a."):
        die("Fusion Team items can't be deleted through the Data Management API (the 'Deleted' version method is "
            "documented for BIM 360 Docs / ACC only). Delete the file in the Fusion web UI instead.")
    try:
        tok = get_3legged_token(SCOPES_DM_WRITE)
        info = request("GET", f"/data/v1/projects/{enc(a.project)}/items/{enc(a.item)}", tok).json()["data"]["attributes"]
        name = info.get("displayName") or info.get("name")
        confirm_modification(f"POST /data/v1/projects/{a.project}/versions: soft-DELETE item '{name}' ({a.item}) "
                             "by adding a versions:autodesk.core:Deleted version", a.yes)
        print_json(delete_item(tok, a.project, a.item, name))
    except ApsError as e:
        die(str(e))


if __name__ == "__main__":
    main()
