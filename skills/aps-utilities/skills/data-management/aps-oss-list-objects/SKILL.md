---
name: aps-oss-list-objects
description: List buckets owned by an APS app, or the objects inside a bucket, with prefix filtering and cursor pagination, using curl. Use when the user asks "what buckets do I have", "what files are in my bucket", wants to find an objectKey/objectId, or needs to inventory or clean up OSS storage. 2-legged auth, read-only.
---

# List OSS buckets and objects (curl)

Spec: `oss/oss.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## When to use
- Discover what's in app-owned storage; locate an `objectId` for download, translation or deletion.
- Not for ACC/BIM 360 project files. Use `aps-dm-browse`.

## Prerequisites
- 2-legged token with `bucket:read data:read`. All calls are `GET`, no approval needed.

```bash
APS=https://developer.api.autodesk.com
# token: see "Getting an access token" in aps-utilities/SKILL.md (run from the aps-utilities folder)
TOKEN=$(python3 skills/authentication/aps-auth-2legged/scripts/get_token.py --raw --scope "bucket:read data:read")
```

## Endpoints
| Call | Returns |
|---|---|
| `GET /oss/v2/buckets?region=US&limit=100&startAt=…` | `items[{bucketKey, createdDate, policyKey}]` + `next` |
| `GET /oss/v2/buckets/{bucketKey}/objects?limit=100&beginsWith=…&startAt=…` | `items[{bucketKey, objectKey, objectId, sha1, size, location}]` + `next` |
| `GET /oss/v2/buckets/{bucketKey}/details` | bucket metadata incl. `permissions` |
| `GET /oss/v2/buckets/{bucketKey}/objects/{objectKey}/details` | one object's metadata |

`region` (buckets list) accepts `US` or `EMEA`; the bucket-level calls take the `x-ads-region` header. `limit` max is 100.

## Examples
```bash
# Buckets in a region
curl -sS "$APS/oss/v2/buckets?region=US&limit=100" -H "Authorization: Bearer $TOKEN" \
  | jq -r '.items[] | [.bucketKey,.policyKey,.createdDate] | @tsv'

# Objects with a prefix
curl -sS -G "$APS/oss/v2/buckets/my-bucket/objects" --data-urlencode "beginsWith=2026/" -d limit=100 \
  -H "Authorization: Bearer $TOKEN" -H "x-ads-region: US" \
  | jq -r '.items[] | [.objectKey,.size,.objectId] | @tsv'
```

## Pagination
Responses carry `next`, a full URL that includes the `startAt` cursor. Follow it until it is absent:
```bash
URL="$APS/oss/v2/buckets/my-bucket/objects?limit=100"
while [ -n "$URL" ]; do
  PAGE=$(curl -sS "$URL" -H "Authorization: Bearer $TOKEN" -H "x-ads-region: US")
  echo "$PAGE" | jq -r '.items[].objectKey'
  URL=$(echo "$PAGE" | jq -r '.next // empty')
done
```

## Pitfalls
- Buckets are per region: repeat for `US`, `EMEA`, `AUS` for a full inventory.
- `beginsWith` is a plain prefix, not a glob.
- `403` on list: token lacks `bucket:read`. `404` on a known bucket: wrong region header.
