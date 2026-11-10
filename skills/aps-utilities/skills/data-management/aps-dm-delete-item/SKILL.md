---
name: aps-dm-delete-item
description: Delete (soft-delete) a file/item in a BIM 360 Docs / ACC project by posting a "Deleted" version. NOT possible for Fusion Team (`a.` ids) — the API has no documented delete there; tell the user to delete in the Fusion UI. Use for "delete this file from the project / folder". 3-legged; opens the browser login if needed. A modification — needs the user's explicit approval first.
---

# Delete a project item (soft delete) — BIM 360 Docs / ACC only

**Fusion Team (`a.` project/hub ids) is unsupported.** Tried on a Fusion Team project: `POST …/versions` with `versions:autodesk.core:Deleted` → `400 BAD_INPUT`; nothing changed. The OpenAPI spec documents deleting files via a Deleted version for BIM 360 Docs only, and `PATCH items` only changes `displayName` (not on BIM 360 Docs). The script refuses `a.` projects.

## Usage
```bash
python scripts/delete_item.py --project PROJECT_ID --item urn:adsk.wipprod:dm.lineage:xxxx --yes
```
Find ids with `aps-dm-browse` (`contents` / `tree` print the item URN).

## How
Data Management has no `DELETE` for items. The script reads the item name (`GET …/items/{id}`), then
`POST /data/v1/projects/{project}/versions` (`Content-Type: application/vnd.api+json`) with
```json
{"data":{"type":"versions","attributes":{"name":"<item name>","extension":{"type":"versions:autodesk.core:Deleted","version":"1.0"}},
 "relationships":{"item":{"data":{"type":"items","id":"<item urn>"}}}}}
```
Scope `data:read data:write data:create`.

## Approval rule (enforced in code)
Prints the plan; refuses non-interactively without `--yes`. **Agents: name the item and folder, get an explicit "yes", then add `--yes`.**

## Notes
- Soft delete: the item is marked deleted and leaves folder listings; recoverability depends on the product (not verified here).
- The BIM 360 / ACC path follows the docs but is untested here; the extension type may need to be `…autodesk.bim360:…`.
- Deleting the item does not delete a separate local copy of the file.
