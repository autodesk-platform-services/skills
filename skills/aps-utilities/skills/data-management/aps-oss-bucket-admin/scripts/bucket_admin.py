#!/usr/bin/env python3
"""Inspect, protect, unprotect or delete an OSS bucket (2-legged).

protect / unprotect / delete modify data and need approval (see confirm_modification / --yes).

Examples:
  python bucket_admin.py details myapp-models
  python bucket_admin.py protect myapp-models --yes
  python bucket_admin.py unprotect myapp-models --yes
  python bucket_admin.py delete myapp-tmp --yes --wait
"""
import argparse
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import (ApsError, confirm_modification, die, enc, get_2legged_token,  # noqa: E402
                        iter_oss_pages, print_json, request)

SCOPES = {
    "details": "bucket:read",
    "protect": "bucket:update bucket:read",
    "unprotect": "bucket:update bucket:read",
    "delete": "bucket:delete bucket:read data:read",
}


def details(key: str) -> dict:
    return request("GET", f"/oss/v2/buckets/{enc(key)}/details", get_2legged_token(SCOPES["details"]),
                   with_region=True).json()


def set_protection(key: str, protect: bool) -> str:
    """POST /oss/v2/buckets/{key}/protect  body {"protection": bool}; idempotent; returns the text reply."""
    r = request("POST", f"/oss/v2/buckets/{enc(key)}/protect", get_2legged_token(SCOPES["protect"]),
                json_body={"protection": protect}, with_region=True)
    return r.text


def delete(key: str, wait: bool = False, timeout: int = 90) -> str:
    """DELETE the bucket. A protected bucket is refused with 403 'Cannot delete protected bucket'."""
    tok = get_2legged_token(SCOPES["delete"])
    request("DELETE", f"/oss/v2/buckets/{enc(key)}", tok, with_region=True)
    if not wait:
        return "delete accepted (large buckets may take a while; 409 on details = still being removed)"
    end = time.time() + timeout
    while time.time() < end:
        try:
            request("GET", f"/oss/v2/buckets/{enc(key)}/details", tok, with_region=True, max_retries=0)
        except ApsError as e:
            if e.status == 404:
                return "deleted (details now 404)"
        time.sleep(3)
    return "delete accepted but bucket still visible after wait — check again later"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("action", choices=SCOPES)
    ap.add_argument("key")
    ap.add_argument("--region", choices=("US", "EMEA", "AUS"))
    ap.add_argument("--yes", action="store_true", help="user already approved this exact action (agents: only then)")
    ap.add_argument("--wait", action="store_true", help="delete: poll until the bucket is gone")
    a = ap.parse_args()
    if a.region:
        os.environ["APS_REGION"] = a.region
    region = os.environ.get("APS_REGION", "US")
    try:
        if a.action == "details":
            print_json(details(a.key))
        elif a.action in ("protect", "unprotect"):
            verb = "PROTECT (blocks deletion)" if a.action == "protect" else "UNPROTECT (re-enables deletion)"
            confirm_modification(f"POST /oss/v2/buckets/{a.key}/protect: {verb} bucket '{a.key}' [{region}]", a.yes)
            print(set_protection(a.key, a.action == "protect"))
        else:
            n = sum(1 for _ in iter_oss_pages(f"/oss/v2/buckets/{enc(a.key)}/objects",
                                              get_2legged_token(SCOPES["delete"])))
            confirm_modification(f"DELETE /oss/v2/buckets/{a.key} [{region}]: PERMANENTLY removes the bucket and its "
                                 f"{n} object(s) — cannot be undone; protected buckets are refused with 403", a.yes)
            print(delete(a.key, a.wait))
    except ApsError as e:
        die(str(e))


if __name__ == "__main__":
    main()
