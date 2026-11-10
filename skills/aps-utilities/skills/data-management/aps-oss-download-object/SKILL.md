---
name: aps-oss-download-object
description: Download an object from an APS OSS bucket via a signed S3 download URL, streaming to disk with optional SHA-1 verification. Use when the user wants to "download a file from a bucket", fetch the raw file behind a Data Management version's storage objectId, or asks about signeds3download. Works with 2-legged tokens for your own buckets and 3-legged tokens for ACC/BIM 360 project storage (wip.dm.prod).
---

# Download an object from OSS (signed S3 download)

## When to use
- Pull a file out of a bucket you own.
- Final step of `aps-dm-download-file` after resolving a version's `relationships.storage.data.id` (`urn:adsk.objects:os.object:wip.dm.prod/<guid>.rvt`).
- Give a browser/other service a time-limited direct download link.

## Prerequisites
- Token with `data:read` (2-legged for own buckets; the user's 3-legged token for `wip.dm.prod`).

## Endpoint
`GET /oss/v2/buckets/{bucketKey}/objects/{objectKey}/signeds3download?minutesExpiration=60&useCdn=true`
→ `{ "status": "complete", "url": "https://…", "size": 123, "sha1": "…" }`
Then plain `GET url` (no auth header, supports `Range`).

Optional: `response-content-disposition=attachment; filename=...` to set the download filename.

## Usage
```bash
python scripts/download_object.py --bucket myapp-models --key house.rvt --out ./house.rvt
python scripts/download_object.py --object-id "urn:adsk.objects:os.object:wip.dm.prod/abc.rvt" --out ./abc.rvt
python scripts/download_object.py --bucket myapp-models --key house.rvt --url-only   # just print the signed URL
```
Python:
```python
from download_object import download, signed_url, split_object_id
bucket, key = split_object_id(version["relationships"]["storage"]["data"]["id"])
download(bucket, key, "out.rvt", token=user_token)
```

## Pitfalls
- `status` may be `chunked` for very large objects (>~? GB): response then has `urls[]` to fetch in order; the script handles both.
- `403` from S3: URL expired — request a new one.
- `404`: wrong region header, wrong bucket, or object key not URL-encoded.
- `wip.dm.prod` objects need the **user's** token with `data:read`; 2-legged works only for ACC/BIM 360 accounts where your app is a Custom Integration.
