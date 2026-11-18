---
name: aps-utilities
description: Entry point for anything involving Autodesk Platform Services (APS, formerly Forge) — authentication, Data Management (OSS buckets, hubs, projects, folders, files), Model Derivative, Viewer, Design Automation, Webhooks, ACC/BIM 360, Fusion, AEC Data Model, Reality Capture, and the rest. Use whenever the user mentions APS, Forge, developer.api.autodesk.com, an APS client ID/secret, OSS buckets, hubs/projects, ACC or BIM 360 APIs, SVF/translation, the Viewer, or Design Automation. This skill identifies which APS API the task needs and routes to the specialised skill under skills/<name>/; it does not implement API calls itself.
compatibility: Requires python3 with the requests package (token scripts only), curl, jq, and network access to developer.api.autodesk.com.
metadata:
  author: Developer Advocates @ Autodesk
  products: "APS, Data Management, Model Derivative, Viewer, Design Automation, Manufacturing Data Model"
  industries: "AEC, Manufacturing, Media & Entertainment"
  technologies: "Python, REST"
---

# APS utilities (router)

Autodesk Platform Services skills. Each task has its own skill in `skills/<name>/` (name and description load at startup, so they trigger on their own). This file only routes and holds the rules every skill shares. Everything except token requests is plain `curl` + `jq` against the REST API (specs: https://github.com/autodesk-platform-services/aps-sdk-openapi). Run commands from this folder.

## Route a request

1. **Auth type first.** App-owned (OSS buckets, Model Derivative, Design Automation, Webhooks) → `aps-auth-2legged`. User-owned (hubs, projects, folders, files in ACC / BIM 360 / Fusion Team, GraphQL data models) → `aps-auth-3legged`. Each leaf skill's first command already calls the right one; credentials, scopes and token errors are documented there.
2. **Open the leaf skill** for the task and run its recipe. Compose skills for workflows (create bucket → upload → translate → view).
3. **No leaf skill for the ask?** Read the family reference, then the spec (`references/conventions.md`, "Spec lookup").

| API family | Leaf skills (`skills/`) | Read when no leaf skill fits |
|---|---|---|
| Authentication | `aps-auth-2legged`, `aps-auth-3legged` | [`references/authentication.md`](references/authentication.md) |
| Data Management | `aps-oss-*`, `aps-dm-*` | [`references/data-management.md`](references/data-management.md) |
| Model Derivative | `aps-md-translate`, `aps-md-inspect` | [`references/model-derivative.md`](references/model-derivative.md) |
| Viewer | `aps-viewer-view-model` | [`references/viewer.md`](references/viewer.md) |
| Design Automation | `aps-da-list-appbundles`, `aps-da-list-engines` | [`references/design-automation.md`](references/design-automation.md) |
| Manufacturing Data Model | `aps-mfgdm-hubs-projects-folders` | [`references/manufacturing-data-model.md`](references/manufacturing-data-model.md) |
| Webhooks, ACC / BIM 360, AEC Data Model, Reality Capture, other | none yet | [`webhooks`](references/webhooks.md), [`acc-bim360`](references/acc-bim360.md), [`aec-data-model`](references/aec-data-model.md), [`reality-capture`](references/reality-capture.md), [`other-apis`](references/other-apis.md) |

## Confirm before any modification (mandatory)

Only `GET`/`HEAD` run without asking. Before any `POST`, `PUT`, `PATCH` or `DELETE` (create, upload, translate, delete, webhook, work item, …): describe the method, URL, headers, body, target and what changes (flag anything irreversible), then **wait for an explicit "yes" to that description**. The user's original request is not approval; approval for one action does not cover the next. Read-only exceptions: token requests and GraphQL *queries* (not mutations). Full rules: [`references/confirmation.md`](references/confirmation.md), read them before the first modifying call.

## Gotchas

- Use `python3`, not `python` (macOS has none). Token scripts need `requests` (ask before `pip3 install`).
- Credentials live only in the git-ignored `.env` here; scripts read it. Never print, export or ask for secrets or tokens in chat; if the user pastes one, tell them to put it in `.env` and rotate it. Missing `.env` handling: see `aps-auth-2legged`.
- Never print `$TOKEN`. Shell state doesn't persist between tool calls: get the token and run `curl` in the same command.
- **Regions**: `x-ads-region: US | EMEA | AUS` on OSS and some ACC calls (`APS_REGION`). A `404` often means wrong region.
- **IDs**: hub/project ids start `b.` (ACC/BIM 360) or `a.` (Fusion Team). URN ids must be URL-encoded in paths. OSS `objectId` → URL-safe base64 (no padding) for Model Derivative.
- **Errors**: `401` bad/expired token; `403` missing scope or permission; `429` wait for `Retry-After`.
- More (pagination styles, env vars, skill-authoring rules): [`references/conventions.md`](references/conventions.md).
