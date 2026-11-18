---
name: aps-dm-upload-file-to-folder
description: Upload a local file into a Data Management project folder (ACC, BIM 360 or Fusion Team) as a new item with curl. Create storage, signed-S3 upload, create item. Use for "upload this file to project X / folder Y / the Milano project root". 3-legged; opens the browser login if needed. A modification, so it needs the user's explicit approval first.
---

# Upload a file into a project folder (curl)

Spec: `datamanagement/datamanagement.yaml` and `oss/oss.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## Prerequisites
- 3-legged token with `data:read data:write data:create`. The browser sign-in may pop up and ask for the wider scope.
- `curl`, `jq`. Find hub/project/folder ids with `aps-dm-browse`.

## The flow: 3 modifying steps, list them all in one approval request
1. `POST /data/v1/projects/{project_id}/storage` returns the storage `objectId` (`urn:adsk.objects:os.object:wip.dm.prod/<uuid>.<ext>`).
2. Upload the bytes with the signed S3 flow from `aps-oss-upload-object` (bucket `wip.dm.prod`, object key = the part of `objectId` after `/`), using the user's 3-legged token.
3. `POST /data/v1/projects/{project_id}/items` with `tip`/`parent` relationships and an `included` version 1 pointing at the storage.

Extension types: `items|versions:autodesk.core:File` for Fusion Team (`a.` ids), `items|versions:autodesk.bim360:File` for ACC/BIM 360 (`b.` ids). A wrong type gives `400`.

## Recipe
```bash
APS=https://developer.api.autodesk.com
# token: from the aps-auth-* skill (credentials, scopes, errors there); run from the aps-utilities folder
TOKEN=$(python3 skills/aps-auth-3legged/scripts/ensure_token.py --scope "data:read data:write data:create")
enc() { jq -rn --arg v "$1" '$v|@uri'; }
PROJ=b.yyyy; FOLDER="urn:adsk.wipprod:fs.folder:co.xxx"; FILE=./a.rvt; NAME=$(basename "$FILE")
EXT=autodesk.bim360                         # autodesk.core for a.-prefixed (Fusion Team) projects
J=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/vnd.api+json")

# 0. (GET) stop if the name already exists in the folder: this recipe creates a first version only
curl -sS -g "$APS/data/v1/projects/$(enc $PROJ)/folders/$(enc $FOLDER)/contents?page[limit]=200" -H "Authorization: Bearer $TOKEN" \
  | jq -e --arg n "$NAME" '[.data[] | select(.attributes.displayName == $n)] | length == 0' >/dev/null || echo "ALREADY EXISTS - add a version instead, or pick another name"

# 1. storage
OBJECT_ID=$(curl -sS -X POST "$APS/data/v1/projects/$(enc $PROJ)/storage" "${J[@]}" -d @- <<JSON | jq -r .data.id
{"jsonapi":{"version":"1.0"},"data":{"type":"objects","attributes":{"name":"$NAME"},
 "relationships":{"target":{"data":{"type":"folders","id":"$FOLDER"}}}}}
JSON
)
echo "$OBJECT_ID"        # urn:adsk.objects:os.object:wip.dm.prod/<uuid>.<ext>

# 2. upload bytes: follow aps-oss-upload-object with
#    B=wip.dm.prod  KEY=<object key from OBJECT_ID>  and the 3-legged $TOKEN (x-ads-region as for the hub)

# 3. create the item
curl -sS -X POST "$APS/data/v1/projects/$(enc $PROJ)/items" "${J[@]}" -d @- <<JSON
{"jsonapi":{"version":"1.0"},
 "data":{"type":"items","attributes":{"displayName":"$NAME","extension":{"type":"items:$EXT:File","version":"1.0"}},
  "relationships":{"tip":{"data":{"type":"versions","id":"1"}},"parent":{"data":{"type":"folders","id":"$FOLDER"}}}},
 "included":[{"type":"versions","id":"1","attributes":{"name":"$NAME","extension":{"type":"versions:$EXT:File","version":"1.0"}},
  "relationships":{"storage":{"data":{"type":"objects","id":"$OBJECT_ID"}}}}]}
JSON
```
The `OBJECT_ID` key is `${OBJECT_ID#*/}` and the bucket is `wip.dm.prod`.

## Gotchas
- Creating the item without step 2 leaves an empty or broken item. Run the steps in order and stop on the first error.
- Wrong `extension.type` for the hub type gives `400`.
- An item with the same name already in the folder gives `400`/`409`. Adding a new version of an existing item is a different call: `POST /data/v1/projects/{project_id}/versions` (see the spec) with the same storage flow.
- Verified on Fusion Team (`a.`); the ACC/BIM 360 path follows the docs but is untested here.
