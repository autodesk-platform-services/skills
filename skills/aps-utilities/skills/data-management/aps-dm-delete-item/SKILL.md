---
name: aps-dm-delete-item
description: Delete (soft-delete) a file/item in a BIM 360 Docs / ACC project with curl by posting a "Deleted" version. NOT possible for Fusion Team (`a.` ids): the API has no documented delete there, so tell the user to delete in the Fusion UI. Use for "delete this file from the project / folder". 3-legged; opens the browser login if needed. A modification, so it needs the user's explicit approval first.
---

# Delete a project item (soft delete, curl): BIM 360 Docs / ACC only

Spec: `datamanagement/datamanagement.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

**Fusion Team (`a.` project/hub ids) is unsupported.** Tried on a Fusion Team project: `POST …/versions` with `versions:autodesk.core:Deleted` gave `400 BAD_INPUT`; nothing changed. The spec documents deleting files via a Deleted version for BIM 360 Docs only, and `PATCH items` only changes `displayName` (not on BIM 360 Docs). Refuse `a.` projects.

## Approval
Name the item and its folder, get an explicit "yes", then run the POST.

## Recipe
Data Management has no `DELETE` for items. Read the item name (GET), then post a version of type `Deleted`:
```bash
APS=https://developer.api.autodesk.com
# token: see "Getting an access token" in aps-utilities/SKILL.md (run from the aps-utilities folder)
TOKEN=$(python3 skills/authentication/aps-auth-3legged/scripts/ensure_token.py --scope "data:read data:write data:create")
enc() { jq -rn --arg v "$1" '$v|@uri'; }
PROJ=b.yyyy; ITEM="urn:adsk.wipprod:dm.lineage:xxxx"        # find with aps-dm-browse

# GET: item name (shown to the user for approval)
NAME=$(curl -sS "$APS/data/v1/projects/$(enc $PROJ)/items/$(enc $ITEM)" -H "Authorization: Bearer $TOKEN" \
  | jq -r .data.attributes.displayName)
echo "Will delete: $NAME"

# POST: after the user said yes
curl -sS -X POST "$APS/data/v1/projects/$(enc $PROJ)/versions" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/vnd.api+json" -d @- <<JSON
{"jsonapi":{"version":"1.0"},
 "data":{"type":"versions",
  "attributes":{"name":"$NAME","extension":{"type":"versions:autodesk.core:Deleted","version":"1.0"}},
  "relationships":{"item":{"data":{"type":"items","id":"$ITEM"}}}}}
JSON
```
Scope `data:read data:write data:create`. The spec says only that this operation "can be used to delete files on BIM 360 Document Management" and does not list the extension type literal. `versions:autodesk.core:Deleted` / `1.0` follows Autodesk's delete tutorial; if it returns `400`, try `versions:autodesk.bim360:Deleted`.

## Notes
- Soft delete: the item is marked deleted and leaves folder listings. Recoverability depends on the product (not verified here).
- The BIM 360 / ACC path follows the docs but is untested here.
- Deleting the item does not delete a separate local copy of the file.
- Folders (BIM 360 Docs / ACC) are "deleted" differently: `PATCH /data/v1/projects/{project_id}/folders/{folder_id}` with `"attributes":{"hidden":true}` (restore with `false`). Same approval rule.
