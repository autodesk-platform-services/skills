---
name: aps-utilities
description: Entry point for anything involving Autodesk Platform Services (APS, formerly Forge) — authentication, Data Management (OSS buckets, hubs, projects, folders, files), Model Derivative, Viewer, Design Automation, Webhooks, ACC/BIM 360, Fusion, AEC Data Model, Reality Capture, and the rest. Use whenever the user mentions APS, Forge, developer.api.autodesk.com, an APS client ID/secret, OSS buckets, hubs/projects, ACC or BIM 360 APIs, SVF/translation, the Viewer, or Design Automation. This skill identifies which APS API the task needs and routes to the specialised skill under skills/<api>/; it does not implement API calls itself.
metadata:
  author: Developer Advocates @ Autodesk
  products: "APS, Data Management, Model Derivative, Viewer, Design Automation, Manufacturing Data Model"
  industries: "AEC, Manufacturing, Media & Entertainment"
  technologies: "Python, REST"
---

# APS utilities — umbrella skill

All implementations are **Python 3 + `requests`** against the raw REST endpoints (no APS SDK). Every leaf skill is self-contained: `SKILL.md` + `scripts/` (CLI-runnable and importable) + a vendored `aps_common.py` (tokens, region header, retries, pagination). Credentials come from `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, optional `APS_ACCESS_TOKEN`, `APS_REGION` — read automatically from a git-ignored `.env` file (see [Credentials](#credentials-env-file)).

## How to route a request

1. **Decide the auth type first.** App-owned resources (OSS buckets, Model Derivative, Design Automation, Webhooks) → 2-legged. User-owned data (hubs, projects, folders, files in ACC / BIM 360 / Fusion Team) → 3-legged. Read `skills/authentication/…` if unsure.
2. **Pick the API family** from the table below and open its reference file — it lists every skill in that family, the endpoints each wraps, and the build status.
3. **Open the leaf skill's `SKILL.md`** and run or import its script — but if the call is anything other than `GET`, first follow [Confirm before any modification](#confirm-before-any-modification-mandatory). Compose several leaf skills for end-to-end workflows (e.g. upload → translate → view).
4. If no leaf skill exists yet, follow the family's reference to find the closest one and the conventions in `references/conventions.md`.

## API families → references

| API family | Typical asks | Reference | Skills folder | Status |
|---|---|---|---|---|
| **Authentication** (OAuth 2-legged / 3-legged, PKCE, refresh, token introspection) | "get a token", "log in with Autodesk", 401/403 | [`references/authentication.md`](references/authentication.md) | `skills/authentication/` | 2 skills built |
| **Data Management** (OSS buckets & objects, Hubs, Projects, Folders, Items, Versions, Commands) | "create a bucket", "upload a file", "list hubs/projects", "download from ACC" | [`references/data-management.md`](references/data-management.md) | `skills/data-management/` | 7 built, ~40 planned (buckets, browse hubs/projects/folders, upload to folder) |
| **Model Derivative** (translate to SVF/SVF2/OBJ/STL/IFC, manifests, metadata, properties, thumbnails) | "translate a model", "get properties", "extract geometry" | [`references/model-derivative.md`](references/model-derivative.md) | `skills/model-derivative/` | 2 built (translate, inspect) |
| **Viewer** (viewer tokens, loading documents, extensions, embedding) | "show it in the Viewer", "viewer HTML page" | [`references/viewer.md`](references/viewer.md) | `skills/viewer/` | 1 built (view model) |
| **Design Automation** (AppBundles, Activities, WorkItems for AutoCAD/Revit/Inventor/3ds Max) | "run a Revit script in the cloud", "batch convert DWGs" | [`references/design-automation.md`](references/design-automation.md) | `skills/design-automation/` | 1 built (list appbundles) |
| **Webhooks** (dm.version.added, dm.folder.*, extraction.finished, hooks CRUD) | "notify me when a file changes" | [`references/webhooks.md`](references/webhooks.md) | `skills/webhooks/` | planned |
| **ACC / BIM 360** (Account Admin, Project Admin, Docs custom attributes, Issues, RFIs, Submittals, Assets, Cost, Sheets, Model Coordination, Data Connector) | "list issues in project X", "add a user to a project", "export project data" | [`references/acc-bim360.md`](references/acc-bim360.md) | `skills/acc-bim360/` | planned |
| **AEC Data Model** (GraphQL: element groups, elements, properties across hubs) | "query Revit elements without downloading", "GraphQL APS" | [`references/aec-data-model.md`](references/aec-data-model.md) | `skills/aec-data-model/` | planned |
| **Manufacturing Data Model / Fusion** (GraphQL: components, occurrences, properties, Fusion Team) | "query Fusion designs", "Fusion BOM" | [`references/manufacturing-data-model.md`](references/manufacturing-data-model.md) | `skills/manufacturing-data-model/` | 1 built (hubs) |
| **Reality Capture** (photoscenes → meshes/orthos) | "photogrammetry", "make a mesh from photos" | [`references/reality-capture.md`](references/reality-capture.md) | `skills/reality-capture/` | planned |
| **Tandem, Forma, Flow Graph Engine, Parameters, Premium Reporting, Token Flex** | niche platform APIs | [`references/other-apis.md`](references/other-apis.md) | `skills/other/` | planned |

## Credentials (.env file)

Every script auto-loads variables from a `.env` file (nearest one walking up from the CWD, then from the script's location upward; `APS_ENV_FILE` overrides the path). Real environment variables win over `.env`. Template: [`.env.example`](.env.example). `.env` is git-ignored.

Agent rules:
0. **Prefer the leaf-skill scripts over hand-written curl**; use curl only where no script exists yet.
1. **Just run the scripts** — do not export, echo or re-pass credentials yourself; the helper reads `.env`.
2. **If `.env` is missing, or the scripts fail with "Fill in these values in …/.env" / "No .env file found"**: create `.env` from `.env.example` if it does not exist, then **ask the user to open it and fill in the listed values** (`APS_CLIENT_ID`, `APS_CLIENT_SECRET`; client credentials from https://aps.autodesk.com/myapps). Stop and wait until they say it is done, then retry.
3. **Never ask the user to paste a secret or token into the chat**, and never print values from `.env` (show key names only). If they paste one anyway, tell them to put it in `.env` instead and treat it as exposed (rotate it).

## Confirm before any modification (mandatory)

Only `GET` (and `HEAD`) calls may run without asking. **Before sending any other request** — `POST`, `PUT`, `PATCH`, `DELETE`, including those made through a leaf-skill script (create bucket, upload, translate job, create/move/delete folder, new version, webhook/hook create, issue/RFI create, user add, Design Automation work items, …) — the agent must stop and get an explicit "yes" from the user in the conversation.

1. **Describe the action first**: the HTTP method + endpoint, the target (hub/project/bucket/object/folder IDs and names, region), and what will change — created, overwritten, or deleted. Flag anything irreversible (DELETE, overwriting an existing object/version, `x-ads-force`, bucket `policyKey`/region that can't be changed later).
2. **Wait for confirmation — the user's original request is never the confirmation.** "Delete X", "create Y", "upload Z" is a request; it only starts step 1. The action runs only after the user replies to your description with an explicit approval ("yes", "confirm", "go ahead"). If you asked for specific wording (e.g. for irreversible deletes), anything else — including repeating the command or naming the target — means ask again. A typo'd or ambiguous target is never resolved by guessing. A fresh request each time; approval for one modification does not cover the next, or a repeat with different targets. Never infer consent from earlier approvals, from a background-task notification, or from the user having supplied credentials.
3. **Batch carefully**: for a multi-step job (e.g. upload → translate) list all the modifying steps in one message and ask once; anything not listed needs a new confirmation.
4. **Read-only `POST`s are exempt** because they change nothing in the user's data: token requests (`/authentication/v2/token`) and read-only queries sent by `POST` (AEC / Manufacturing Data Model GraphQL queries — but **not** GraphQL mutations). If unsure whether a call modifies anything, treat it as a modification and ask.
5. **Scripts enforce this**: every modifying script (create bucket, upload, bucket protect/unprotect/delete, upload-to-folder, translate) prints its plan and refuses to run non-interactively without `--yes`. Pass `--yes` **only after** the user approved that exact action.
6. Prefer a dry run when one exists (print the request without sending it) so the user can see exactly what will be sent.

## Cross-cutting conventions (apply to every family)

- **Regions**: `x-ads-region: US | EMEA | AUS` on OSS and some ACC calls; hubs/projects are region-bound. Set `APS_REGION`.
- **IDs & URNs**: hub/project IDs prefixed `b.`; folder/item/version URNs `urn:adsk.wipprod:…`; OSS `objectId` → URL-safe base64 for Model Derivative. See `references/conventions.md`.
- **Pagination**: JSON:API `links.next` for `/project/v1` & `/data/v1`; `next` cursor for `/oss/v2`; `page[number]`/`page[limit]` params.
- **Errors**: 401 = bad/expired token; 403 = missing scope or no permission; 404 can mean wrong region; 429 honours `Retry-After` (handled in `aps_common.request`).
- **Secrets** never go into logs or the chat; the only place they live is the git-ignored `.env` (or real env vars). Scripts read env vars only.

## Repository layout

```
SKILL.md                     ← this file (router)
references/<api>.md          ← per-API skill inventory, endpoints, status
references/conventions.md    ← IDs, URNs, regions, pagination, error handling
_shared/aps_common.py        ← source of truth for the helper; vendored by _shared/vendor.py
skills/<api>/<skill-name>/   ← leaf skills: SKILL.md + scripts/
```
Skill names are prefixed by family: `aps-auth-*`, `aps-oss-*` / `aps-dm-*`, `aps-md-*`, `aps-da-*`, `aps-wh-*`, `aps-acc-*`, `aps-aecdm-*`, `aps-mfgdm-*`, `aps-rc-*`.
