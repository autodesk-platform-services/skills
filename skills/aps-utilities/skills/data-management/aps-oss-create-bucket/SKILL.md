---
name: aps-oss-create-bucket
description: Create an APS Object Storage Service (OSS) bucket with curl, with the right retention policy and region, and check whether a bucket already exists. Use when the user wants to "create a bucket", "set up storage for uploads", prepare for Model Derivative translation of app-owned files, or hits 409 "Bucket already exists" / 400 bucket-name errors. 2-legged auth. A modification, so it needs the user's explicit approval first.
---

# Create an OSS bucket (curl)

Spec: `oss/oss.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## When to use
- First step before uploading app-owned files to OSS (`aps-oss-upload-object`).
- Not needed for ACC/BIM 360/Fusion files. Those use project storage (`aps-dm-upload-file-to-folder`).

## Prerequisites
- 2-legged token with `bucket:create bucket:read` (see `aps-auth-2legged`).
- `curl`, `jq`.

## Create (POST, needs approval)
```bash
APS=https://developer.api.autodesk.com
TOKEN=$(python skills/authentication/aps-auth-2legged/scripts/get_token.py --raw --scope "bucket:create bucket:read")

curl -sS -X POST "$APS/oss/v2/buckets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-ads-region: US" \
  -d '{"bucketKey":"myapp-models","policyKey":"persistent"}'
```
`201` returns `{bucketKey, bucketOwner, createdDate, permissions, policyKey}`. `409` means the key is taken.

## Check whether it exists (GET, no approval)
```bash
curl -sS -o /dev/null -w "%{http_code}\n" "$APS/oss/v2/buckets/myapp-models/details" \
  -H "Authorization: Bearer $TOKEN" -H "x-ads-region: US"
```
`200` exists and is yours, `404` does not exist (or wrong region), `403` exists but belongs to another app or the token lacks `bucket:read`.

## Rules
| Field | Rule |
|---|---|
| `bucketKey` | 3–128 chars, lowercase `a-z 0-9 - _` only, **globally unique across all APS apps**. Prefix it with something app-specific |
| `policyKey` | `transient` (24 h), `temporary` (30 days), `persistent` (until deleted). Cannot be changed later |
| `x-ads-region` | `US` (default), `EMEA` or `AUS`. The bucket lives there forever; every later call needs the same header |

## Pitfalls
- `409`: key taken by you (fine) or another app (pick another key; you can't inspect it).
- `400` bucket key invalid: uppercase or illegal characters.
- Bucket created in `EMEA` but later calls without `x-ads-region: EMEA` give `404`.
- `persistent` does not mean protected. To block deletion, use `aps-oss-bucket-admin` (`protect`).
- Transient buckets auto-delete objects after 24 h. Don't use them for anything needed later.
