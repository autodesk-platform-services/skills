---
name: aps-oss-bucket-admin
description: Inspect, protect, unprotect or delete an APS OSS bucket using curl (2-legged). Use when the user wants to "show bucket details", "protect a bucket", "stop a bucket being deleted", "unprotect", or "delete a bucket"; also when a delete fails with 403 "Cannot delete protected bucket". Protect, unprotect and delete are modifications that need user approval first.
---

# OSS bucket admin (curl): details, protect, unprotect, delete

Spec: `oss/oss.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## Prerequisites
- 2-legged token. Scope per action: details `bucket:read`, protect/unprotect `bucket:update`, delete `bucket:delete`.
- Only the app that owns the bucket can change or delete it (others get `403`).

```bash
APS=https://developer.api.autodesk.com
B=my-bucket; R=US
# token: from the aps-auth-* skill (credentials, scopes, errors there); run from the aps-utilities folder
TOKEN=$(python3 skills/aps-auth-2legged/scripts/get_token.py --raw --scope "bucket:read bucket:update bucket:delete")
H=(-H "Authorization: Bearer $TOKEN" -H "x-ads-region: $R")
```

## Details (GET, no approval)
```bash
curl -sS "$APS/oss/v2/buckets/$B/details" "${H[@]}"
```

## Protect / unprotect (POST, needs approval)
```bash
curl -sS -X POST "$APS/oss/v2/buckets/$B/protect" "${H[@]}" \
  -H "Content-Type: application/json" -d '{"protection":true}'    # false to unprotect
```
`200 text/plain`: `Bucket <key> protection set to true|false`. Idempotent. Unprotecting re-enables deletion, so confirm it as carefully as a delete.

## Delete (DELETE, needs approval, irreversible)
Before asking, count what will be destroyed (GET, no approval):
```bash
curl -sS "$APS/oss/v2/buckets/$B/objects?limit=100" "${H[@]}" | jq '.items | length'
```
Then, after an explicit "yes" naming the bucket:
```bash
curl -sS -X DELETE "$APS/oss/v2/buckets/$B" "${H[@]}"
```
Poll until gone: `details` returns `404` (it may briefly return `409` while deletion settles).

## Gotchas
- Protected bucket plus delete gives `403` with body `Cannot delete protected bucket <key>`. The bucket stays intact. Same status as "not the owner", so read the body.
- A deleted bucket's key is not immediately reusable.
- New buckets are unprotected by default; `persistent` policy is not protection.
- Suggest protecting any bucket holding data the user cares about.
