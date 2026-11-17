---
name: aps-oss-download-object
description: Download an object from an APS OSS bucket with curl via a signed S3 download URL, with optional SHA-1 verification. Use when the user wants to "download a file from a bucket", fetch the raw file behind a Data Management version's storage objectId, or asks about signeds3download. Works with 2-legged tokens for your own buckets and 3-legged tokens for ACC/BIM 360/Fusion project storage (wip.dm.prod). Read-only.
---

# Download an object from OSS (curl, signed S3 download)

Spec: `oss/oss.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## When to use
- Pull a file out of a bucket you own.
- Final step of downloading a project file: resolve the version's `relationships.storage.data.id` (`urn:adsk.objects:os.object:wip.dm.prod/<guid>.rvt`) via `aps-dm-browse`, then run this.
- Hand a time-limited direct download link to a browser or another service.

## Prerequisites
- Token with `data:read`: 2-legged for your own buckets, the user's 3-legged token for `wip.dm.prod`.
- `GET` only, no approval needed (the file is written locally).

## Endpoint
`GET /oss/v2/buckets/{bucketKey}/objects/{objectKey}/signeds3download?minutesExpiration=60&useCdn=true`

Returns `{"status":"complete","url":"https://…","size":123,"sha1":"…"}`, or `status: "chunked"` with `urls[]` for very large objects. Then `GET url` with **no** auth header (supports `Range`). Optional `response-content-disposition=attachment; filename=…` sets the downloaded filename.

## Script-free recipe
```bash
APS=https://developer.api.autodesk.com
# token: see "Getting an access token" in aps-utilities/SKILL.md (run from the aps-utilities folder)
TOKEN=$(python3 skills/authentication/aps-auth-2legged/scripts/get_token.py --raw --scope "data:read")   # or 3-legged: ensure_token.py
B=my-bucket; KEY=house.rvt; R=US
KEYENC=$(jq -rn --arg k "$KEY" '$k|@uri')

RESP=$(curl -sS "$APS/oss/v2/buckets/$B/objects/$KEYENC/signeds3download?minutesExpiration=60" \
  -H "Authorization: Bearer $TOKEN" -H "x-ads-region: $R")
echo "$RESP" | jq '{status,size,sha1}'
curl -sS --fail -L -o ./house.rvt "$(echo "$RESP" | jq -r '.url')"
```
For a DM storage id, split it: `OBJECT_ID=urn:adsk.objects:os.object:wip.dm.prod/abc.rvt` gives `B=${OBJECT_ID#urn:adsk.objects:os.object:}; B=${B%%/*}` and `KEY=${OBJECT_ID#*/}`.

### Chunked objects
When `status` is `chunked`, download every entry of `.urls[]` in order and concatenate:
```bash
echo "$RESP" | jq -r '.urls[]' | while read -r u; do curl -sS --fail -L "$u"; done > ./big.rvt
```

### Verify the SHA-1
```bash
[ "$(shasum -a 1 ./house.rvt | cut -d' ' -f1)" = "$(echo "$RESP" | jq -r .sha1)" ] && echo OK || echo MISMATCH
```
(`sha1` can be absent for some objects; skip the check then.)

## Pitfalls
- `403` from S3: the URL expired. Request a new one.
- `404`: wrong region header, wrong bucket, or object key not URL-encoded.
- `wip.dm.prod` objects need the **user's** token with `data:read`. A 2-legged token works only where your app is a Custom Integration in the ACC/BIM 360 account.
