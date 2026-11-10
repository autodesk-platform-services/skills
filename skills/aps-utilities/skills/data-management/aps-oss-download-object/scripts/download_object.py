#!/usr/bin/env python3
"""Download an OSS object via signed S3 URL.

Examples:
  python download_object.py --bucket myapp-models --key house.rvt --out ./house.rvt
  python download_object.py --object-id urn:adsk.objects:os.object:wip.dm.prod/abc.rvt --out abc.rvt
  python download_object.py --bucket myapp-models --key house.rvt --url-only
"""
import argparse
import hashlib
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import SCOPES_OSS_READ, ApsError, Token, die, enc, get_2legged_token, request  # noqa: E402

OBJ_PREFIX = "urn:adsk.objects:os.object:"


def split_object_id(object_id: str) -> Tuple[str, str]:
    """'urn:adsk.objects:os.object:bucket/key' -> ('bucket', 'key')."""
    if not object_id.startswith(OBJ_PREFIX):
        raise ValueError(f"not an OSS objectId: {object_id}")
    bucket, _, key = object_id[len(OBJ_PREFIX):].partition("/")
    return bucket, key


def signed_url(bucket: str, key: str, token: Optional[Token] = None, minutes: int = 60,
               use_cdn: bool = True) -> Dict[str, Any]:
    tok = token or get_2legged_token(SCOPES_OSS_READ)
    return request("GET", f"/oss/v2/buckets/{bucket}/objects/{enc(key)}/signeds3download", tok,
                   params={"minutesExpiration": minutes, "useCdn": str(use_cdn).lower()},
                   with_region=True).json()


def download(bucket: str, key: str, out: str, token: Optional[Token] = None, verify: bool = True) -> Path:
    info = signed_url(bucket, key, token)
    urls = info.get("urls") or [info["url"]]  # 'chunked' status returns urls[]
    dest = Path(out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha1()
    with dest.open("wb") as fh:
        for u in urls:
            with requests.get(u, stream=True, timeout=600) as r:
                r.raise_for_status()
                for chunk in r.iter_content(1024 * 1024):
                    fh.write(chunk)
                    h.update(chunk)
    if verify and info.get("sha1") and h.hexdigest() != info["sha1"]:
        dest.unlink(missing_ok=True)
        raise RuntimeError(f"sha1 mismatch: expected {info['sha1']}, got {h.hexdigest()}")
    return dest


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--object-id", help="urn:adsk.objects:os.object:bucket/key")
    g.add_argument("--bucket")
    ap.add_argument("--key", help="objectKey (with --bucket)")
    ap.add_argument("--out", help="destination path (default: object key basename)")
    ap.add_argument("--url-only", action="store_true", help="print the signed URL and exit")
    ap.add_argument("--no-verify", action="store_true", help="skip sha1 check")
    ap.add_argument("--region", choices=("US", "EMEA", "AUS"))
    a = ap.parse_args()
    if a.region:
        os.environ["APS_REGION"] = a.region
    try:
        bucket, key = split_object_id(a.object_id) if a.object_id else (a.bucket, a.key)
        if not key:
            die("--key is required with --bucket")
        if a.url_only:
            print(signed_url(bucket, key)["url"])
            return
        dest = download(bucket, key, a.out or Path(key).name, verify=not a.no_verify)
        print(f"saved {dest} ({dest.stat().st_size} bytes)")
    except (ApsError, RuntimeError, ValueError, requests.HTTPError) as e:
        die(str(e))


if __name__ == "__main__":
    main()
