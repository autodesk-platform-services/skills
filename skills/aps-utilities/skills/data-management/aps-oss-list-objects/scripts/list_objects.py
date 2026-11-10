#!/usr/bin/env python3
"""List OSS buckets or the objects in a bucket (auto-paginated).

Examples:
  python list_objects.py --buckets
  python list_objects.py --bucket myapp-models --prefix 2026/ --table
"""
import argparse
import os
import sys
from pathlib import Path
from typing import Any, Dict, Iterator, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import SCOPES_OSS_READ, ApsError, Token, die, get_2legged_token, iter_oss_pages, print_json  # noqa: E402


def iter_buckets(token: Optional[Token] = None) -> Iterator[Dict[str, Any]]:
    tok = token or get_2legged_token(SCOPES_OSS_READ)
    yield from iter_oss_pages("/oss/v2/buckets", tok)


def iter_objects(bucket: str, prefix: Optional[str] = None, token: Optional[Token] = None) -> Iterator[Dict[str, Any]]:
    tok = token or get_2legged_token(SCOPES_OSS_READ)
    params = {"beginsWith": prefix} if prefix else None
    yield from iter_oss_pages(f"/oss/v2/buckets/{bucket}/objects", tok, params)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--buckets", action="store_true", help="list buckets")
    g.add_argument("--bucket", help="list objects in this bucket")
    ap.add_argument("--prefix", help="objectKey prefix filter")
    ap.add_argument("--table", action="store_true", help="human-readable table instead of JSON")
    ap.add_argument("--region", choices=("US", "EMEA", "AUS"))
    a = ap.parse_args()
    if a.region:
        os.environ["APS_REGION"] = a.region
    try:
        rows = list(iter_buckets() if a.buckets else iter_objects(a.bucket, a.prefix))
    except ApsError as e:
        die(str(e))
    if not a.table:
        print_json(rows)
        return
    if a.buckets:
        for b in rows:
            print(f"{b['bucketKey']:<50} {b.get('policyKey', ''):<11} {b.get('createdDate', '')}")
    else:
        total = 0
        for o in rows:
            total += o.get("size", 0)
            print(f"{o.get('size', 0):>14,}  {o['objectKey']}")
        print(f"{len(rows)} objects, {total:,} bytes", file=sys.stderr)


if __name__ == "__main__":
    main()
