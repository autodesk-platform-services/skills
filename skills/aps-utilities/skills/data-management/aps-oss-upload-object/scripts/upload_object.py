#!/usr/bin/env python3
"""Upload a file to an OSS bucket with the signed S3 (multipart) flow.

Examples:
  python upload_object.py --bucket myapp-models --file ./house.rvt
  python upload_object.py --bucket myapp-models --file ./big.nwd --chunk-mb 25
"""
import argparse
import math
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import (SCOPES_OSS_WRITE, ApsError, Token, b64url, confirm_modification, die, enc,  # noqa: E402
                        get_2legged_token, print_json, request)

URLS_PER_BATCH = 25          # API maximum
MIN_CHUNK = 5 * 1024 * 1024  # S3 minimum for all but the last part


def _signed_urls(bucket: str, key: str, tok: Token, parts: int, first_part: int,
                 upload_key: Optional[str], minutes: int) -> Dict[str, Any]:
    params: Dict[str, Any] = {"parts": parts, "firstPart": first_part, "minutesExpiration": minutes}
    if upload_key:
        params["uploadKey"] = upload_key
    return request("GET", f"/oss/v2/buckets/{bucket}/objects/{enc(key)}/signeds3upload",
                   tok, params=params, with_region=True).json()


def _put_part(url: str, data: bytes, retries: int = 3) -> None:
    for i in range(retries):
        r = requests.put(url, data=data, timeout=300)
        if r.ok:
            return
        if i == retries - 1:
            raise RuntimeError(f"S3 PUT failed {r.status_code}: {r.text[:200]}")
        time.sleep(2 ** i)


def upload_file(bucket: str, path: str, object_key: Optional[str] = None, *,
                chunk_bytes: int = 10 * 1024 * 1024, token: Optional[Token] = None,
                minutes_expiration: int = 60, verbose: bool = True) -> Dict[str, Any]:
    """Upload `path` into `bucket`; returns the completion response plus `urn_b64`."""
    p = Path(path)
    key = object_key or p.name
    size = p.stat().st_size
    chunk_bytes = max(chunk_bytes, MIN_CHUNK)
    total_parts = max(1, math.ceil(size / chunk_bytes))
    tok = token or get_2legged_token(SCOPES_OSS_WRITE)

    upload_key: Optional[str] = None
    urls: List[str] = []
    with p.open("rb") as fh:
        for part in range(1, total_parts + 1):
            if not urls:  # fetch next batch of signed URLs
                batch = min(URLS_PER_BATCH, total_parts - part + 1)
                j = _signed_urls(bucket, key, tok, batch, part, upload_key, minutes_expiration)
                upload_key = j["uploadKey"]
                urls = list(j["urls"])
            data = fh.read(chunk_bytes)
            try:
                _put_part(urls.pop(0), data)
            except RuntimeError:
                # expired/failed URL: request a fresh one for this single part and retry once
                j = _signed_urls(bucket, key, tok, 1, part, upload_key, minutes_expiration)
                _put_part(j["urls"][0], data)
            if verbose:
                print(f"[upload] part {part}/{total_parts} ({len(data)} bytes)", file=sys.stderr)

    done = request("POST", f"/oss/v2/buckets/{bucket}/objects/{enc(key)}/signeds3upload", tok,
                   json_body={"uploadKey": upload_key, "size": size}, with_region=True).json()
    done["urn_b64"] = b64url(done["objectId"])
    return done


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bucket", required=True)
    ap.add_argument("--file", required=True)
    ap.add_argument("--key", help="objectKey (default: file name)")
    ap.add_argument("--chunk-mb", type=int, default=10)
    ap.add_argument("--region", choices=("US", "EMEA", "AUS"))
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--yes", action="store_true", help="user already approved this exact action (agents: only then)")
    a = ap.parse_args()
    if a.region:
        os.environ["APS_REGION"] = a.region
    if not Path(a.file).is_file():
        die(f"file not found: {a.file}")
    confirm_modification(f"upload '{a.file}' ({Path(a.file).stat().st_size} bytes) to OSS bucket '{a.bucket}' as "
                         f"object '{a.key or Path(a.file).name}' (overwrites an existing object with that key)", a.yes)
    try:
        print_json(upload_file(a.bucket, a.file, a.key, chunk_bytes=a.chunk_mb * 1024 * 1024, verbose=not a.quiet))
    except (ApsError, RuntimeError, KeyError) as e:
        die(str(e))


if __name__ == "__main__":
    main()
