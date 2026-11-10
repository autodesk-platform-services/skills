#!/usr/bin/env python3
"""Create an OSS bucket (optionally idempotent).

Examples:
  python create_bucket.py --key myapp-models --policy persistent
  python create_bucket.py --key myapp-models --ensure
  python create_bucket.py --key myapp-eu --region EMEA
"""
import argparse
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import SCOPES_OSS_WRITE, ApsError, confirm_modification, die, get_2legged_token, print_json, request  # noqa: E402

KEY_RE = re.compile(r"^[a-z0-9_-]{3,128}$")
POLICIES = ("transient", "temporary", "persistent")


def validate_key(key: str) -> None:
    if not KEY_RE.match(key):
        raise ValueError("bucketKey must be 3-128 chars of lowercase a-z, 0-9, '-' or '_'")


def get_bucket(key: str) -> Optional[Dict[str, Any]]:
    tok = get_2legged_token(SCOPES_OSS_WRITE)
    try:
        return request("GET", f"/oss/v2/buckets/{key}/details", tok, with_region=True).json()
    except ApsError as e:
        if e.status == 404:
            return None
        raise


def create_bucket(key: str, policy: str = "persistent", access: str = "full") -> Dict[str, Any]:
    validate_key(key)
    if policy not in POLICIES:
        raise ValueError(f"policy must be one of {POLICIES}")
    tok = get_2legged_token(SCOPES_OSS_WRITE)
    body = {"bucketKey": key, "policyKey": policy, "access": access}
    return request("POST", "/oss/v2/buckets", tok, json_body=body, with_region=True).json()


def ensure_bucket(key: str, policy: str = "persistent", access: str = "full") -> Dict[str, Any]:
    """Create if missing; return details either way."""
    existing = get_bucket(key)
    if existing:
        return existing
    try:
        return create_bucket(key, policy, access)
    except ApsError as e:
        if e.status == 409:  # raced, or owned by another app
            got = get_bucket(key)
            if got:
                return got
        raise


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--key", required=True, help="bucketKey (lowercase, globally unique)")
    ap.add_argument("--policy", default="persistent", choices=POLICIES)
    ap.add_argument("--access", default="full", choices=("full", "read"))
    ap.add_argument("--region", choices=("US", "EMEA", "AUS"), help="overrides APS_REGION")
    ap.add_argument("--ensure", action="store_true", help="succeed if the bucket already exists")
    ap.add_argument("--yes", action="store_true", help="user already approved this exact action (agents: only then)")
    a = ap.parse_args()
    if a.region:
        os.environ["APS_REGION"] = a.region
    confirm_modification(f"POST /oss/v2/buckets: create bucket '{a.key}' (policy={a.policy}, access={a.access}, "
                         f"region={os.environ.get('APS_REGION', 'US')}) — policy/region can't be changed later", a.yes)
    try:
        info = ensure_bucket(a.key, a.policy, a.access) if a.ensure else create_bucket(a.key, a.policy, a.access)
    except (ValueError, ApsError) as e:
        die(str(e))
    print_json(info)


if __name__ == "__main__":
    main()
