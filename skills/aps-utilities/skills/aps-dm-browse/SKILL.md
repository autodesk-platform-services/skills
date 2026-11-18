---
name: aps-dm-browse
description: Read-only browsing of user-owned Data Management data with curl and a 3-legged token. List hubs, projects in a hub, a project's top folders, a folder's contents, or a whole folder tree (ACC, BIM 360, Fusion Team). Use for "list hubs", "list projects in hub X", "list files in project Y", "what's in this folder". Opens the browser login automatically when no token is available.
---

# Browse hubs, projects and folders (curl, 3-legged, read-only)

Spec: `datamanagement/datamanagement.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## Prerequisites
- `.env` with `APS_CLIENT_ID` / `APS_CLIENT_SECRET` (root `SKILL.md`), and the callback `http://localhost:8080/callback` registered on the APS app.
- A 3-legged token from `aps-auth-3legged`: stored token, silent refresh, otherwise the **browser sign-in page pops up** (tell the user to sign in).
- `curl`, `jq`. All calls are `GET`, no approval needed.

```bash
APS=https://developer.api.autodesk.com
# token: from the aps-auth-* skill (credentials, scopes, errors there); run from the aps-utilities folder
TOKEN=$(python3 skills/aps-auth-3legged/scripts/ensure_token.py --scope "data:read")
H=(-H "Authorization: Bearer $TOKEN")
enc() { jq -rn --arg v "$1" '$v|@uri'; }      # URL-encode ids/URNs for path segments
```

## Endpoints
| Goal | Call |
|---|---|
| Hubs | `GET /project/v1/hubs` |
| Projects in a hub | `GET /project/v1/hubs/{hub_id}/projects` |
| Top folders of a project | `GET /project/v1/hubs/{hub_id}/projects/{project_id}/topFolders` |
| Folder contents (folders and items) | `GET /data/v1/projects/{project_id}/folders/{folder_id}/contents` |
| Item details / tip version | `GET /data/v1/projects/{project_id}/items/{item_id}` · `…/tip` |
| Versions of an item | `GET /data/v1/projects/{project_id}/items/{item_id}/versions` |

## Examples
```bash
# Hubs: id | name | type | region
curl -sS "$APS/project/v1/hubs" "${H[@]}" \
  | jq -r '.data[] | [.id, .attributes.name, .attributes.extension.type, .attributes.region] | @tsv'

# Projects in a hub
HUB=b.xxxx
curl -sS "$APS/project/v1/hubs/$(enc $HUB)/projects" "${H[@]}" | jq -r '.data[] | [.id, .attributes.name] | @tsv'

# Top folders
PROJ=b.yyyy
curl -sS "$APS/project/v1/hubs/$(enc $HUB)/projects/$(enc $PROJ)/topFolders" "${H[@]}" \
  | jq -r '.data[] | [.id, .attributes.displayName] | @tsv'

# Folder contents: type | id | name
FOLDER="urn:adsk.wipprod:fs.folder:co.xxx"
curl -sS "$APS/data/v1/projects/$(enc $PROJ)/folders/$(enc $FOLDER)/contents" "${H[@]}" \
  | jq -r '.data[] | [.type, .id, (.attributes.displayName // .attributes.name)] | @tsv'
```
Add `?filter[type]=items` or `?filter[extension.type]=items:autodesk.bim360:File` to narrow the contents.

## Pagination
JSON:API lists return `links.next.href` when there is another page (`page[number]`, `page[limit]` max 200). Follow it until absent:
```bash
URL="$APS/data/v1/projects/$(enc $PROJ)/folders/$(enc $FOLDER)/contents?page[limit]=200"
while [ -n "$URL" ]; do
  PAGE=$(curl -sS -g "$URL" "${H[@]}")
  echo "$PAGE" | jq -r '.data[] | [.type, .id, (.attributes.displayName // .attributes.name)] | @tsv'
  URL=$(echo "$PAGE" | jq -r '.links.next.href // empty')
done
```
(`-g` stops curl treating `[` `]` as globs.)

## Recursive tree
Walk `contents`, recursing into entries whose `type` is `folders`:
```bash
walk() {  # walk PROJECT FOLDER INDENT
  curl -sS -g "$APS/data/v1/projects/$(enc "$1")/folders/$(enc "$2")/contents?page[limit]=200" "${H[@]}" \
  | jq -r '.data[] | [.type, .id, (.attributes.displayName // .attributes.name)] | @tsv' \
  | while IFS=$'\t' read -r type id name; do
      echo "$3$name  ($type) $id"
      [ "$type" = folders ] && walk "$1" "$id" "$3  "
    done
}
walk "$PROJ" "$FOLDER" ""
```
(First page only per folder here; add the `links.next` loop above for very large folders.)

## Gotchas
- Hub id prefix `a.` = Fusion Team (`autodesk.core`), `b.` = ACC / BIM 360 (`autodesk.bim360`). Project ids share the prefix.
- Hubs in other regions (e.g. `GBR`, `CAN`) may need a matching `x-ads-region`. A `404` can mean wrong region.
- Folder URNs and item ids go in URL paths and must be URL-encoded (`enc`).
- "No hubs" usually means the wrong Autodesk account was used to sign in.
- The item URN is what `aps-dm-delete-item` needs; a version's `relationships.storage.data.id` is what `aps-oss-download-object` needs.
