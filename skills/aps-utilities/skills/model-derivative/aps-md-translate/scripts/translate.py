#!/usr/bin/env python3
"""Start a Model Derivative translation job (default SVF2) and optionally wait for it.

Modifies data (creates derivatives) -> needs approval (confirm_modification / --yes).

Examples:
  python translate.py --bucket myapp-models --key house.rvt --wait
  python translate.py --object-id "urn:adsk.objects:os.object:b/k.ipt" --format svf2 --views 2d 3d --wait
  python translate.py --urn dXJuOmFkc2s... --force --yes          # re-translate, overwrite derivatives
  python translate.py --urn <ACC version urn> --three-legged      # files in ACC/BIM 360/Fusion
"""
import argparse
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import (SCOPES_MD_WRITE, ApsError, b64url, confirm_modification, die,  # noqa: E402
                        get_2legged_token, get_3legged_token, print_json, region, request)

FORMATS = ("svf2", "svf", "obj", "stl", "step", "iges", "ifc", "thumbnail")
MD = "/modelderivative/v2/designdata"


def to_urn(urn=None, object_id=None, bucket=None, key=None) -> str:
    if urn:
        return urn
    if bucket and key:
        object_id = f"urn:adsk.objects:os.object:{bucket}/{key}"
    if not object_id:
        die("give --urn, --object-id, or --bucket and --key")
    return b64url(object_id)


def start_job(urn, tok, fmt="svf2", views=("2d", "3d"), root_filename=None, force=False) -> dict:
    out = {"type": fmt}
    if fmt in ("svf", "svf2"):
        out["views"] = list(views)
    body = {"input": {"urn": urn}, "output": {"destination": {"region": region().lower()}, "formats": [out]}}
    if root_filename:
        body["input"].update({"compressedUrn": True, "rootFilename": root_filename})
    headers = {"x-ads-force": "true"} if force else {}
    return request("POST", f"{MD}/job", tok, json_body=body, headers=headers, with_region=True).json()


def wait_manifest(urn, tok, timeout=1800, every=8) -> dict:
    end = time.time() + timeout
    while time.time() < end:
        m = request("GET", f"{MD}/{urn}/manifest", tok, with_region=True).json()
        print(f"[md] {m.get('status')} {m.get('progress')}", file=sys.stderr)
        if m.get("status") in ("success", "failed", "timeout"):
            return m
        time.sleep(every)
    die("timed out waiting for the translation")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--urn", help="base64url URN of the source")
    ap.add_argument("--object-id")
    ap.add_argument("--bucket"); ap.add_argument("--key")
    ap.add_argument("--format", default="svf2", choices=FORMATS)
    ap.add_argument("--views", nargs="+", default=["2d", "3d"], choices=("2d", "3d"))
    ap.add_argument("--root-filename", help="main file inside a ZIP source")
    ap.add_argument("--force", action="store_true", help="x-ads-force: overwrite existing derivatives")
    ap.add_argument("--three-legged", action="store_true", help="source lives in ACC/BIM 360/Fusion Team")
    ap.add_argument("--region", choices=("US", "EMEA", "AUS"))
    ap.add_argument("--wait", action="store_true", help="poll the manifest until it finishes")
    ap.add_argument("--yes", action="store_true", help="user already approved this exact action (agents: only then)")
    a = ap.parse_args()
    if a.region:
        os.environ["APS_REGION"] = a.region
    urn = to_urn(a.urn, a.object_id, a.bucket, a.key)
    try:
        confirm_modification(f"POST {MD}/job: translate urn {urn} to {a.format}"
                             + (f" views={a.views}" if a.format in ('svf', 'svf2') else "")
                             + f" in region {region()}" + (" — FORCE overwrites existing derivatives" if a.force else ""),
                             a.yes)
        tok = get_3legged_token(SCOPES_MD_WRITE) if a.three_legged else get_2legged_token(SCOPES_MD_WRITE)
        print_json({"job": start_job(urn, tok, a.format, a.views, a.root_filename, a.force), "urn": urn})
        if a.wait:
            m = wait_manifest(urn, tok)
            print_json({"status": m.get("status"), "progress": m.get("progress"),
                        "derivatives": [{"outputType": d.get("outputType"), "status": d.get("status"),
                                         "messages": d.get("messages", [])} for d in m.get("derivatives", [])]})
    except ApsError as e:
        die(str(e))


if __name__ == "__main__":
    main()
