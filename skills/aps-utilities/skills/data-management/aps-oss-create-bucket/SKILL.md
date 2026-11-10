---
name: aps-oss-create-bucket
description: Create (or idempotently ensure) an APS Object Storage Service bucket with the right retention policy and region. Use when the user wants to "create a bucket", "set up storage for uploads", prepare for Model Derivative translation of app-owned files, or hits 409 "Bucket already exists" / 400 bucket-name errors. 2-legged auth.
---

# Create an OSS bucket

## When to use
- First step before uploading app-owned files to OSS (`aps-oss-upload-object`).
- Not needed for ACC/BIM 360/Fusion files — those use project storage (`aps-dm-create-storage`).

## Prerequisites
- 2-legged token with `bucket:create bucket:read` (see `aps-auth-2legged`).
- Env (auto-loaded from `.env`): `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, optional `APS_REGION` (US | EMEA | AUS).

## Endpoint
`POST /oss/v2/buckets`
Headers: `Authorization: Bearer …`, `Content-Type: application/json`, `x-ads-region: US|EMEA|AUS`
Body:
```json
{ "bucketKey": "myapp-2f3a…", "policyKey": "persistent", "access": "full" }
```
`GET /oss/v2/buckets/{bucketKey}/details` to check existence.

## Rules you must respect
| Field | Rule |
|---|---|
| `bucketKey` | 3–128 chars, **lowercase** `a-z 0-9 - _` only, **globally unique across all APS apps** — prefix with your client ID or a hash of it |
| `policyKey` | `transient` (24 h), `temporary` (30 days), `persistent` (until deleted). Cannot be changed later |
| `x-ads-region` | Bucket lives in that region forever; all later object calls must use the same region |
| `access` | `full` (default) or `read` (other apps can read if they know the key) |

## Usage
```bash
python scripts/create_bucket.py --key myapp-models --policy persistent
python scripts/create_bucket.py --key myapp-tmp --policy transient --region EMEA
python scripts/create_bucket.py --key myapp-models --ensure   # no error if it exists
# modifying: non-interactive runs need --yes, passed only after the user approved the exact action
python scripts/create_bucket.py --key myapp-models --yes
# protect/unprotect/delete afterwards: see the aps-oss-bucket-admin skill
```
Python:
```python
from create_bucket import ensure_bucket
info = ensure_bucket("myapp-models", "persistent")
```

## Protecting a bucket from deletion
`policyKey: persistent` only means "no auto-expiry" — it does **not** stop `DELETE`. OSS has a separate **Protect Bucket** operation that blocks deletion until you explicitly unprotect. A new bucket is **unprotected** by default; there is no protect flag on `POST /oss/v2/buckets`, so protecting is a second call after creation.

`POST /oss/v2/buckets/{bucketKey}/protect` — [docs](https://aps.autodesk.com/en/docs/data/v2/reference/http/oss/post-oss-v2-buckets-bucketkey-pr-POST/)
- Scope: `bucket:update` (2-legged). Not part of `SCOPES_OSS_WRITE` in `aps_common.py` — request it explicitly.
- Headers: `Authorization: Bearer …`, `Content-Type: application/json`, `x-ads-region: US|EMEA|AUS`
- Body: `{ "protection": true }` to protect, `{ "protection": false }` to unprotect.
- Response `200` (`text/plain`): `Bucket <key> protection set to true|false`. Idempotent — repeating it is not an error. Takes effect immediately. Errors: `400 401 403 404 500`.
- Only the owning app (or one with permission) can change protection.

```bash
curl -X POST "https://developer.api.autodesk.com/oss/v2/buckets/adam_claude_protected/protect" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "x-ads-region: US" \
  --data '{"protection":true}'
```
Both creating and protecting/unprotecting are modifications — follow the root `SKILL.md` rule: describe the request and wait for an explicit "yes" before each. Unprotecting is the step that re-enables deletion, so confirm it just as carefully as a delete.

## Deleting a bucket (for reference)
`DELETE /oss/v2/buckets/{bucketKey}` — scope `bucket:delete`; permanent; only the owning app may call it (others get `403`); a **protected** bucket must be unprotected first — otherwise `403` with body `Cannot delete protected bucket <key>` (verified; the bucket stays intact). Note this is the same status as "not the owning app", so read the body. Deletion is slow for buckets with many objects (docs recommend it only for small test buckets), so an immediate `GET …/details` can briefly return `409` before settling to `404`. The key of a deleted bucket is **not immediately reusable**. Suggest protecting any bucket holding data the user cares about.

## Pitfalls
- `409 Conflict`: key already taken — by you (fine, use `--ensure`) or by another app (pick another key; you can't inspect it).
- `400 "Bucket key … invalid"`: uppercase or illegal characters.
- Bucket created in `EMEA` but requests sent without `x-ads-region: EMEA` → `404`.
- `persistent` ≠ protected: the bucket can still be deleted unless you call Protect Bucket (above).
- Transient buckets auto-delete objects after 24 h — don't use for anything you need later.
