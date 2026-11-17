---
name: aps-oss-upload-object
description: Upload a local file of any size to an APS OSS bucket with curl, using the signed S3 upload flow (single-part or multipart), and compute the base64 URN needed by Model Derivative. Use when the user wants to "upload a file to APS", "put a model in a bucket", "upload for translation / the Viewer", or asks about signeds3upload, uploadKey, or multipart chunking. Also the low-level upload step used by Data Management uploads to ACC/BIM 360/Fusion project storage. 2-legged auth. A modification, so it needs the user's explicit approval first.
---

# Upload an object to OSS (curl, signed S3 upload)

Spec: `oss/oss.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## When to use
- Any upload into an OSS bucket you own (`aps-oss-create-bucket`).
- As the upload step inside `aps-dm-upload-file-to-folder` (bucket `wip.dm.prod`, objectKey from the storage call; use the user's 3-legged token).
- The legacy `PUT /oss/v2/buckets/{b}/objects/{o}` is deprecated. Always use this flow.

## Prerequisites
- 2-legged token with `data:read data:write data:create` (a 3-legged token works for DM project storage).
- `curl`, `jq`, `split`, `wc`.

## Flow (3 steps; steps 1 and 3 are APS calls, step 2 goes to S3)
1. **Get signed URLs** — `GET /oss/v2/buckets/{bucketKey}/objects/{objectKey}/signeds3upload?parts=N&firstPart=1&minutesExpiration=60` returns `{"uploadKey": "…", "urls": ["https://…s3…", …]}`. At most 25 URLs per call; request more with `firstPart` and the same `uploadKey`.
2. **PUT each chunk to its S3 URL** with no `Authorization` header. Every chunk except the last must be at least 5 MB. Retry a failed part with a fresh URL for that part index.
3. **Complete** — `POST /oss/v2/buckets/{bucketKey}/objects/{objectKey}/signeds3upload` with `{"uploadKey": "…", "size": <total bytes>}`. Required even for a single chunk. Returns `objectId`, `size`, `sha1`.

## Script-free recipe
```bash
APS=https://developer.api.autodesk.com
# token: see "Getting an access token" in aps-utilities/SKILL.md (run from the aps-utilities folder)
TOKEN=$(python3 skills/authentication/aps-auth-2legged/scripts/get_token.py --raw --scope "data:read data:write data:create")
B=my-bucket; R=US; FILE=./house.rvt
KEY=$(basename "$FILE")                       # objectKey; URL-encode it if it has spaces, +, #
KEYENC=$(jq -rn --arg k "$KEY" '$k|@uri')
SIZE=$(wc -c < "$FILE" | tr -d ' ')
CHUNK=$((10*1024*1024))                       # 10 MB
PARTS=$(( (SIZE + CHUNK - 1) / CHUNK ))       # max 25 per URL request; see "More than 25 parts"
AUTH=(-H "Authorization: Bearer $TOKEN" -H "x-ads-region: $R")

# 1. signed URLs
RESP=$(curl -sS "$APS/oss/v2/buckets/$B/objects/$KEYENC/signeds3upload?parts=$PARTS&firstPart=1&minutesExpiration=60" "${AUTH[@]}")
UPLOAD_KEY=$(echo "$RESP" | jq -r .uploadKey)

# 2. split and PUT every part (no auth header)
WORK=$(mktemp -d); split -b $CHUNK "$FILE" "$WORK/part_"
i=0
for part in "$WORK"/part_*; do
  URL=$(echo "$RESP" | jq -r ".urls[$i]")
  curl -sS --fail -X PUT --data-binary @"$part" "$URL" || { echo "part $((i+1)) failed"; break; }
  i=$((i+1))
done
rm -rf "$WORK"

# 3. complete
curl -sS -X POST "$APS/oss/v2/buckets/$B/objects/$KEYENC/signeds3upload" "${AUTH[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"uploadKey\":\"$UPLOAD_KEY\",\"size\":$SIZE}"
```
Files under 5 MB use `parts=1`; the loop then has one iteration.

### URN for Model Derivative
```bash
OBJECT_ID="urn:adsk.objects:os.object:$B/$KEY"
URN=$(printf %s "$OBJECT_ID" | base64 | tr -d '=\n' | tr '+/' '-_')   # URL-safe base64, no padding
```

### More than 25 parts (files above ~250 MB at 10 MB per chunk)
Call step 1 again with `firstPart=26&parts=…&uploadKey=$UPLOAD_KEY` (and so on) to get the next batch of URLs, then continue the PUT loop at the right part index.

## Pitfalls
- `objectKey` must be URL-encoded in the path (the `@uri` filter above does that).
- Signed URLs expire (default 2 min, up to `minutesExpiration=60`). For huge files, request URLs in batches as you go.
- `403` from S3 PUT: URL expired or wrong part index. Request a fresh URL.
- The complete call must report the **total** `size`. A mismatch gives a corrupt or rejected object.
- `split` pieces sort lexically (`part_aa`, `part_ab`, …), which matches the part order.
- Objects in a `transient` bucket vanish after 24 h.
- Wrong region (no `x-ads-region`) gives `404`.
