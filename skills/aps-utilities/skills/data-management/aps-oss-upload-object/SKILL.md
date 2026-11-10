---
name: aps-oss-upload-object
description: Upload a local file of any size to an APS OSS bucket using the signed S3 upload flow (single-part or multipart with per-part retries), and return the objectId plus the base64 URN needed by Model Derivative. Use when the user wants to "upload a file to APS", "put a model in a bucket", "upload for translation / the Viewer", or asks about signeds3upload, uploadKey, or multipart chunking. Also the low-level upload step used by Data Management uploads to ACC/BIM 360 project storage. 2-legged auth.
---

# Upload an object to OSS (signed S3 upload)

## When to use
- Any upload into an OSS bucket you own (`aps-oss-create-bucket`).
- As the upload step inside `aps-dm-upload-file-to-folder` (bucket `wip.dm.prod`, objectKey from `create-storage`).
- The legacy `PUT /oss/v2/buckets/{b}/objects/{o}` is deprecated — always use this flow.

## Prerequisites
- 2-legged token with `data:write data:create` (and `data:read`). For DM project storage a 3-legged token works too.
- `pip install requests`

## Flow (3 calls)
1. **Get signed URLs**
   `GET /oss/v2/buckets/{bucketKey}/objects/{objectKey}/signeds3upload?parts=N&firstPart=1&minutesExpiration=60`
   → `{ "uploadKey": "...", "urls": ["https://…s3…", …] }`
   Max 25 URLs per call; request more with `firstPart` advanced. `uploadKey` is reused across calls.
2. **PUT each chunk to its S3 URL** (no Authorization header). Chunks ≥ 5 MB except the last; this skill uses 10 MB. Retry a failed part by requesting a fresh URL for that part index.
3. **Complete**
   `POST /oss/v2/buckets/{bucketKey}/objects/{objectKey}/signeds3upload`
   body `{ "uploadKey": "...", "size": <bytes> }`
   → object details incl. `objectId` (`urn:adsk.objects:os.object:bucket/key`), `size`, `sha1`.

Small files (< 10 MB) use the same flow with `parts=1`.

## Usage
```bash
python scripts/upload_object.py --bucket myapp-models --file ./house.rvt
python scripts/upload_object.py --bucket myapp-models --file ./house.rvt --key renamed.rvt --chunk-mb 25
```
Output includes `objectId` and `urn` (base64, ready for Model Derivative `POST /modelderivative/v2/designdata/job`).

Python:
```python
from upload_object import upload_file
info = upload_file("myapp-models", "./house.rvt")          # returns the complete-response dict
print(info["objectId"], info["urn_b64"])
```
For DM project storage: `upload_file(bucket_key, path, object_key=key, token=user_token)`.

## Pitfalls
- `objectKey` must be URL-encoded in the path (handled by `enc()`); spaces/`+`/`#` otherwise break.
- Signed URLs expire (default 2 min each, up to `minutesExpiration=60`) — for huge files request URLs in batches as you go (the script does).
- `403` from S3 PUT: URL expired or wrong part index; re-request.
- The complete call must report the **total** `size` — a mismatch yields a corrupt or rejected object.
- Objects in a `transient` bucket vanish after 24 h.
- Uploading to a bucket in another region without `x-ads-region` → `404`.
