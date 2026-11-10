#!/usr/bin/env python3
"""Read-only Model Derivative inspection: manifest, views, object tree, properties.

Examples:
  python inspect_model.py manifest URN
  python inspect_model.py views URN
  python inspect_model.py tree URN [--guid GUID]
  python inspect_model.py properties URN [--guid GUID] [--objectid 3] [--json]
  python inspect_model.py properties URN --three-legged     # ACC / BIM 360 / Fusion sources
URN may be the base64url URN or a raw objectId (urn:adsk.objects:…), which is encoded for you.
"""
import argparse
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import (SCOPES_MD_READ, ApsError, b64url, die, get_2legged_token,  # noqa: E402
                        get_3legged_token, print_json, request)

MD = "/modelderivative/v2/designdata"


def norm(urn: str) -> str:
    return b64url(urn) if urn.startswith("urn:") else urn


def views(urn, tok):
    return request("GET", f"{MD}/{urn}/metadata", tok, with_region=True).json()["data"]["metadata"]


def pick_guid(urn, tok, guid):
    if guid:
        return guid
    v = views(urn, tok)
    g = next((x["guid"] for x in v if x.get("role") == "3d"), None) or (v[0]["guid"] if v else None)
    if not g:
        die("no viewables found — has the model been translated?")
    return g


def fetch_when_ready(path, tok, params=None, tries=24, wait=5):
    """Tree/properties return 202 while the service is still extracting them — poll until 200."""
    for _ in range(tries):
        r = request("GET", path, tok, params=params, with_region=True)
        if r.status_code == 200:
            return r.json()
        print("[md] still processing (202)…", file=sys.stderr)
        time.sleep(wait)
    die("properties/tree not ready after waiting — try again later")


def print_props(coll):
    for o in coll:
        print(f"\n[{o['objectid']}] {o['name']}")
        for g, ps in o.get("properties", {}).items():
            if isinstance(ps, dict):
                print(f"  {g}")
                for k, v in ps.items():
                    print(f"    {k}: {v}")
            else:
                print(f"  {g}: {ps}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("what", choices=("manifest", "views", "tree", "properties"))
    ap.add_argument("urn")
    ap.add_argument("--guid", help="viewable guid (default: the first 3d view)")
    ap.add_argument("--objectid", type=int, help="properties: only this object")
    ap.add_argument("--json", action="store_true", help="raw JSON instead of readable text")
    ap.add_argument("--three-legged", action="store_true")
    ap.add_argument("--region", choices=("US", "EMEA", "AUS"))
    a = ap.parse_args()
    if a.region:
        os.environ["APS_REGION"] = a.region
    urn = norm(a.urn)
    try:
        tok = get_3legged_token(SCOPES_MD_READ) if a.three_legged else get_2legged_token(SCOPES_MD_READ)
        if a.what == "manifest":
            print_json(request("GET", f"{MD}/{urn}/manifest", tok, with_region=True).json())
        elif a.what == "views":
            print_json(views(urn, tok))
        elif a.what == "tree":
            print_json(fetch_when_ready(f"{MD}/{urn}/metadata/{pick_guid(urn, tok, a.guid)}", tok))
        else:
            params = {"forceget": "true"}
            if a.objectid is not None:
                params["objectid"] = a.objectid
            d = fetch_when_ready(f"{MD}/{urn}/metadata/{pick_guid(urn, tok, a.guid)}/properties", tok, params)
            print_json(d) if a.json else print_props(d["data"]["collection"])
    except ApsError as e:
        die(str(e))


if __name__ == "__main__":
    main()
