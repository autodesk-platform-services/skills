---
name: aps-oss-list-objects
description: List buckets owned by an APS app, or list the objects inside a bucket, with prefix filtering and automatic cursor pagination. Use when the user asks "what buckets do I have", "what files are in my bucket", wants to find an objectKey/objectId, or needs to inventory or clean up OSS storage. 2-legged auth.
---

# List OSS buckets and objects

## When to use
- Discover what's in app-owned storage; locate an `objectId` for download/translation/deletion.
- Not for ACC/BIM 360 project files — use `aps-dm-list-folder-contents`.

## Prerequisites
- 2-legged token with `bucket:read data:read`.

## Endpoints
| Call | Notes |
|---|---|
| `GET /oss/v2/buckets?limit=100&startAt=…` | header `x-ads-region`; returns `items[{bucketKey, createdDate, policyKey}]` + `next` |
| `GET /oss/v2/buckets/{bucketKey}/objects?limit=100&beginsWith=…&startAt=…` | returns `items[{bucketKey, objectKey, objectId, sha1, size, location}]` + `next` |
| `GET /oss/v2/buckets/{bucketKey}/details` | bucket metadata incl. `permissions` |

`next` is a full URL carrying the `startAt` cursor; follow it until absent. Max `limit` is 100.

## Usage
```bash
python scripts/list_objects.py --buckets                       # all buckets in APS_REGION
python scripts/list_objects.py --bucket myapp-models           # all objects
python scripts/list_objects.py --bucket myapp-models --prefix 2026/ --table
python scripts/list_objects.py --bucket myapp-models --region EMEA
```
Python:
```python
from list_objects import iter_buckets, iter_objects
for o in iter_objects("myapp-models", prefix="2026/"):
    print(o["objectKey"], o["size"])
```

## Pitfalls
- Buckets are per region: run once per region (`US`, `EMEA`, `AUS`) for a full inventory.
- `beginsWith` is a plain prefix, not a glob.
- Listing large buckets is slow — paginate lazily (the helpers are generators) rather than collecting everything.
- `403` on list: token lacks `bucket:read`; `404` on a known bucket: wrong region header.
