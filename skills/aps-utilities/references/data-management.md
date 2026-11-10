# Data Management API — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills live in `skills/data-management/<skill-name>/`.
Conventions (naming, Python-only, vendored `aps_common.py`, env vars) are in [`conventions.md`](conventions.md); auth skills are in [`authentication.md`](authentication.md).

Scope: OSS (Buckets & Objects), Hubs & Projects, Folders, Items & Versions, Commands. Other APIs appear only where a DM workflow hands off to them.

Status legend: ✅ built · 🔜 next · ⬜ planned

---

## 0. Foundation (cross-cutting — see `conventions.md`; no separate skills)

Identifier/URN rules, pagination, regions and error handling are documented once in `references/conventions.md` and implemented in `_shared/aps_common.py` (`enc`, `b64url`, `iter_jsonapi_pages`, `iter_oss_pages`, `request` with retry). Tokens come from the Authentication family (`aps-auth-2legged`, `aps-auth-3legged`).

---

## 1. OSS / Buckets & Objects (app-owned storage, 2-legged)

| Skill | Purpose | Endpoints wrapped |
|---|---|---|
| ✅ `aps-oss-create-bucket` | Create a bucket with the right retention policy and region | `POST /oss/v2/buckets` (`bucketKey` naming rules, `policyKey` transient/temporary/persistent, `x-ads-region`) |
| ✅ `aps-oss-list-objects --buckets` | List buckets owned by the app, paged | `GET /oss/v2/buckets` (`startAt`, `limit`, `region`) |
| ✅ `aps-oss-bucket-admin` | Inspect, protect/unprotect, or delete a bucket (delete is permanent and refused with 403 while protected) | `GET …/details`, `POST …/protect` `{"protection": true\|false}` (`bucket:update`), `DELETE /oss/v2/buckets/{bucketKey}` (`bucket:delete`) |
| ✅ `aps-oss-upload-object` | Upload a file (small or large) via signed S3 URLs | `GET …/objects/{objectKey}/signeds3upload` → `PUT` to S3 (single/multipart, `parts`, `firstPart`) → `POST …/signeds3upload` to complete; chunk sizing, retry per part, `uploadKey` expiry |
| ✅ `aps-oss-download-object` | Download an object via signed S3 URL | `GET …/objects/{objectKey}/signeds3download` (optional `response-content-disposition`, range requests) |
| ✅ `aps-oss-list-objects` | List objects in a bucket, paged | `GET /oss/v2/buckets/{bucketKey}/objects` (`beginsWith`, `startAt`, `limit`) |
| ⬜ `aps-oss-object-details-and-delete` | Inspect metadata or delete an object | `GET …/objects/{objectKey}/details`, `DELETE …/objects/{objectKey}` |
| ⬜ `aps-oss-copy-object` | Copy an object within a bucket | `PUT …/objects/{objectKey}/copyto/{newObjectKey}` |
| ⬜ `aps-oss-signed-resource-urls` | Create/consume shareable signed URLs (non-S3 style) | `POST …/objects/{objectKey}/signed` (`access`, `minutesExpiration`), `GET/PUT/DELETE /oss/v2/signedresources/{id}`, when to prefer `signeds3*` instead |
| ⬜ `aps-oss-object-urn-for-derivatives` | Produce the base64 URN Model Derivative expects | `objectId` → URL-safe base64; hand-off to Model Derivative skills |

---

## 2. Hubs & Projects (user-owned storage: ACC / BIM 360 / Fusion Team, 3-legged)

| Skill | Purpose | Endpoints wrapped |
|---|---|---|
| ✅ `aps-dm-list-hubs` → via `aps-dm-browse` | List hubs the user can access and classify them | `GET /project/v1/hubs` (`extension.type` → ACC / BIM 360 / Fusion / A360), `filter[id]`, region caveats |
| ⬜ `aps-dm-get-hub` | Fetch one hub | `GET /project/v1/hubs/{hub_id}` |
| ✅ `aps-dm-list-projects` → via `aps-dm-browse` | List projects in a hub, paged | `GET /project/v1/hubs/{hub_id}/projects` (`page[number]`, `page[limit]`, `filter[id]`) |
| ⬜ `aps-dm-get-project` | Fetch a project and its hub link | `GET /project/v1/hubs/{hub_id}/projects/{project_id}`, `GET …/projects/{project_id}/hub` |
| ✅ `aps-dm-get-top-folders` → via `aps-dm-browse` | Find a project's root folders (Project Files, Plans, …) | `GET /project/v1/hubs/{hub_id}/projects/{project_id}/topFolders` (`excludeDeleted`, `projectFilesOnly`) |
| ⬜ `aps-dm-list-project-downloads-and-jobs` | Track async downloads/jobs on a project | `GET …/projects/{project_id}/downloads/{download_id}`, `GET …/jobs/{job_id}`, `POST …/downloads` |

---

## 3. Folders

| Skill | Purpose | Endpoints wrapped |
|---|---|---|
| ⬜ `aps-dm-get-folder` | Fetch folder metadata, parent, and refs | `GET /data/v1/projects/{project_id}/folders/{folder_id}`, `…/parent`, `…/refs`, `…/relationships/links`, `…/relationships/refs` |
| ✅ `aps-dm-list-folder-contents` → via `aps-dm-browse` | List items and subfolders, with filters and paging | `GET …/folders/{folder_id}/contents` (`filter[type]`, `filter[extension.type]`, `filter[displayName]`, `includeHidden`, `page[*]`) |
| ⬜ `aps-dm-search-folder` | Recursive search within a folder | `GET …/folders/{folder_id}/search` (`filter[*]`, `page[number]`), limits vs ACC search |
| ⬜ `aps-dm-create-folder` | Create a subfolder (ACC/BIM 360 need the right `extension.type`) | `POST /data/v1/projects/{project_id}/folders` (`folders:autodesk.bim360:Folder` vs `folders:autodesk.core:Folder`) |
| ⬜ `aps-dm-rename-move-hide-folder` | Patch a folder: rename, move, hide/unhide | `PATCH …/folders/{folder_id}` (`attributes.name`, `attributes.hidden`, `relationships.parent`) |
| ✅ `aps-dm-walk-folder-tree` → via `aps-dm-browse` | Recursively traverse a project's folder tree | Composes `topFolders` + `contents`; depth limits, rate-limit-friendly concurrency |

---

## 4. Items & Versions (files)

| Skill | Purpose | Endpoints wrapped |
|---|---|---|
| ⬜ `aps-dm-get-item` | Fetch an item (lineage) and its tip version | `GET /data/v1/projects/{project_id}/items/{item_id}`, `…/tip`, `…/parent` |
| ⬜ `aps-dm-list-item-versions` | List all versions of an item | `GET …/items/{item_id}/versions` (`filter[versionNumber]`, `page[*]`) |
| ⬜ `aps-dm-get-version` | Fetch a version, its storage, and derivatives link | `GET …/versions/{version_id}`, `…/item`, `…/downloadFormats`, `…/downloads`; reading `relationships.storage` and `derivatives` |
| ⬜ `aps-dm-item-and-version-refs` | Read/create references (xrefs, attachments, auxiliary) | `GET …/items/{item_id}/refs`, `…/relationships/refs`, `…/relationships/links`, `POST …/relationships/refs` (`xrefs`, `auxiliary`, `derived`) |
| ✅ `aps-dm-create-storage` → used inside `aps-dm-upload-file-to-folder` | Reserve an OSS storage location in a project folder | `POST /data/v1/projects/{project_id}/storage` → `objectId`; extract `bucketKey`/`objectKey` |
| ✅ `aps-dm-upload-file-to-folder` | **End-to-end: upload a local file into an ACC/BIM 360/Fusion folder** | `create-storage` → `aps-oss-upload-object` (signed S3 on the `wip.dm.prod` bucket) → `POST /data/v1/projects/{project_id}/items` (first version, `items:autodesk.bim360:File` vs `items:autodesk.core:File`) |
| ⬜ `aps-dm-upload-new-version` | **End-to-end: add a new version to an existing item** | `create-storage` → signed S3 upload → `POST …/versions` with `relationships.item` |
| ⬜ `aps-dm-download-file` | **End-to-end: download the tip (or specific) version of an item** | `get-version` → storage `objectId` → `aps-oss-download-object`; handling non-downloadable (cloud-only) formats via `downloadFormats`/`downloads` |
| ⬜ `aps-dm-rename-move-item` | Rename, move or hide an item | `PATCH …/items/{item_id}`, `PATCH …/versions/{version_id}` (`displayName`), move via Commands or new version in target folder |
| ✅ `aps-dm-delete-item` | Delete (soft-delete) a file — **BIM 360 Docs / ACC only**; Fusion Team has no documented delete (400) | `POST …/versions` with `versions:autodesk.core:Deleted` extension; restoring |
| ⬜ `aps-dm-copy-item` | Copy a file to another folder | `POST …/versions` with `copyFrom` |
| ⬜ `aps-dm-custom-attributes-handoff` | Point to ACC Document Management custom attributes when DM is not enough | Explains boundary with `bim360/docs/v1` custom attribute endpoints |

---

## 5. Commands (batch / special operations)

| Skill | Purpose | Endpoints wrapped |
|---|---|---|
| ⬜ `aps-dm-check-permissions` | Check what the user may do on a set of resources | `POST /data/v1/projects/{project_id}/commands` with `commands:autodesk.core:CheckPermission` (`requiredActions`) |
| ⬜ `aps-dm-list-refs-batch` | Fetch refs for many items/versions in one call | `commands:autodesk.core:ListRefs` |
| ⬜ `aps-dm-list-items-batch` | Fetch many items in one call | `commands:autodesk.core:ListItems` (`includePathInProject`) |
| ⬜ `aps-dm-publish-c4r-model` | Publish a Revit Cloud Worksharing model | `commands:autodesk.bim360:C4RModelPublish`, `commands:autodesk.bim360:C4RModelGetPublishJob`, `C4RPublishWithoutLinks` |
| ⬜ `aps-dm-create-folder-command` | Alternative folder creation via commands (ACC) | `commands:autodesk.core:CreateFolder` |

---

## 6. Composite workflow skills (highest user value)

| Skill | Composes | Typical trigger |
|---|---|---|
| ⬜ `aps-dm-browse-tree` | list-hubs → list-projects → top-folders → walk-folder-tree | "Show me everything in project X" / build a file picker |
| ⬜ `aps-dm-find-file-by-name` | list-hubs → list-projects → search-folder | "Where is `Site.rvt`?" |
| ⬜ `aps-dm-sync-local-folder-up` | walk tree + upload-file-to-folder + upload-new-version (skip unchanged by size/hash) | "Push this directory to ACC" |
| ⬜ `aps-dm-sync-folder-down` | walk tree + download-file (parallel, resumable) | "Back up project files locally" |
| ⬜ `aps-dm-upload-and-translate` | aps-oss-upload-object or upload-file-to-folder → Model Derivative job (handoff skill) | "Upload and view in the Viewer" |
| ⬜ `aps-dm-watch-folder-changes` | folder URN → Webhooks API `dm.version.added` / `dm.folder.*` (handoff skill) | "Notify me when files change" |
| ⬜ `aps-dm-audit-project-files` | walk tree + list-item-versions + check-permissions → CSV/Excel report | "Report on all files, versions, owners" |

---

## 7. Suggested build order

1. ✅ Foundation (`aps-auth-*`, `_shared/aps_common.py`).
2. ✅ OSS core: `create-bucket`, `upload-object`, `download-object`, `list-objects`.
3. Hubs/Projects/Folders read path: `list-hubs`, `list-projects`, `get-top-folders`, `list-folder-contents`, `walk-folder-tree`.
4. File write path: `create-storage`, `upload-file-to-folder`, `upload-new-version`, `download-file`.
5. Remaining folder/item mutations, refs, Commands.
6. Composite workflows.

## 8. Boundaries

- ACC-only extensions (Docs custom attributes, naming standards, reviews, Issues, Admin) live in the **ACC / BIM 360** family (`references/acc-bim360.md`), not here. DM skills link to them where a workflow crosses over (`aps-dm-custom-attributes-handoff`).
- Translation/viewing hand off to **Model Derivative** (`references/model-derivative.md`); change notifications hand off to **Webhooks** (`references/webhooks.md`).
