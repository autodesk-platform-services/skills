# APS utility skills

![platforms](https://img.shields.io/badge/platform-windows%20%7C%20osx%20%7C%20linux-lightgray.svg)
[![python](https://img.shields.io/badge/Python-3-blue.svg)](https://www.python.org/)
[![license](https://img.shields.io/:license-mit-green.svg)](https://opensource.org/licenses/MIT)

A set of [Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) that let an AI agent, such as Claude, call Autodesk Platform Services (APS) APIs for you. Ask in plain language, for example "create a bucket", "list the projects in my hub" or "translate this file and show it in the Viewer", and the agent picks the right skill and runs it.

## What the skills are for

The skills are not an SDK or an app. They are instructions (`SKILL.md`) plus small Python scripts that teach an agent how to use the APS REST APIs correctly: which authentication type to use, which endpoints to call, how to handle regions, pagination and errors, and when to ask you before changing anything.

- **Python 3 and `requests` only.** Scripts call the raw REST endpoints. No APS SDK is needed.
- **Self-contained.** Each skill has a `SKILL.md` and a `scripts/` folder. You can run the scripts from the command line or import them.
- **Routed from one entry point.** The root [`SKILL.md`](SKILL.md) identifies which APS API a request needs and hands off to the matching skill. It doesn't call APIs itself.
- **Safe by default.** Only read-only calls (`GET`) run without asking. Anything that creates, uploads, translates, protects or deletes is described first and runs only after you explicitly approve it. Modifying scripts refuse to run non-interactively without `--yes`.
- **Secrets stay local.** Credentials are read from a git-ignored `.env` file. The agent never asks you to paste secrets into the chat.

## Available skills

| Family | Skill | What it does | Auth |
|---|---|---|---|
| Authentication | `aps-auth-2legged` | Gets an app-only (client credentials) access token | 2-legged |
| Authentication | `aps-auth-3legged` | Signs you in through the browser, stores and refreshes a user token | 3-legged |
| Data Management (OSS) | `aps-oss-create-bucket` | Creates, or ensures, a bucket with the right retention policy and region | 2-legged |
| Data Management (OSS) | `aps-oss-list-objects` | Lists your app's buckets, or the objects in a bucket | 2-legged |
| Data Management (OSS) | `aps-oss-upload-object` | Uploads a local file to a bucket | 2-legged |
| Data Management (OSS) | `aps-oss-download-object` | Downloads an object, with optional SHA-1 verification | 2-legged or 3-legged |
| Data Management (OSS) | `aps-oss-bucket-admin` | Shows bucket details, and protects, unprotects or deletes a bucket | 2-legged |
| Data Management | `aps-dm-browse` | Lists hubs, projects, folders and folder contents (ACC, BIM 360, Fusion Team) | 3-legged |
| Data Management | `aps-dm-upload-file-to-folder` | Uploads a local file into a project folder as a new item | 3-legged |
| Data Management | `aps-dm-delete-item` | Soft-deletes a file in a BIM 360 Docs or ACC project | 3-legged |
| Model Derivative | `aps-md-translate` | Starts a translation job (SVF2, SVF, OBJ, STL, STEP, IGES, IFC, thumbnail) | 2-legged or 3-legged |
| Model Derivative | `aps-md-inspect` | Reads manifest status, views, object tree and all properties of a translated model | 2-legged or 3-legged |
| Viewer | `aps-viewer-view-model` | Opens a translated model in the APS Viewer through a small local server | 2-legged |
| Design Automation | `aps-da-list-appbundles` | Lists AppBundles visible to your app | 2-legged |
| Manufacturing Data Model | `aps-mfgdm-hubs-projects-folders` | Lists hubs through the GraphQL API (projects and folders planned) | 3-legged |

More families are planned: Webhooks, ACC/BIM 360, AEC Data Model, Reality Capture and other APIs. See the per-API files in [`references/`](references) for endpoints and build status.

Skills compose for end-to-end workflows, for example create bucket, upload, translate, then view.

## Usage

Point your agent at this folder so it can load the root `SKILL.md`, then ask for what you need:

- "List my hubs and the projects in the first one."
- "Create a bucket called `my-demo-bucket` and upload `model.rvt`."
- "Translate it to SVF2 and show it in the Viewer."
- "List all properties of the translated model."

The agent explains any change it's about to make and waits for your approval before running it.

## Development

### Prerequisites

- Python 3 with `requests`
- An APS app: create one at https://aps.autodesk.com/myapps to get a client ID and secret
- For hubs, projects, folders and files: access to ACC, BIM 360 or Fusion Team, with your app provisioned there

### Setup

1. Create a `.env` file in the repository root.
2. Add `APS_CLIENT_ID` and `APS_CLIENT_SECRET`. Optionally set `APS_ACCESS_TOKEN` and `APS_REGION` (`US`, `EMEA` or `AUS`).
3. Run a script, for example `python skills/data-management/aps-oss-list-objects/scripts/list_objects.py`.

`.env` is git-ignored. Real environment variables override values in `.env`.

### Repository layout

```
SKILL.md                     Entry point and router
references/<api>.md          Per-API skill inventory, endpoints and status
references/conventions.md    IDs, URNs, regions, pagination and error handling
_shared/aps_common.py        Source of truth for the shared helper (tokens, retries, pagination)
_shared/vendor.py            Copies the helper into each skill's scripts/ folder
skills/<api>/<skill-name>/   Leaf skills: SKILL.md and scripts/
```

Each skill vendors its own copy of `aps_common.py`, so edit `_shared/aps_common.py` and run `_shared/vendor.py` rather than changing the copies.

### Known limitations

- Fusion Team items can't be deleted through the API. Delete them in the Fusion UI.
- Many families are still planned. Where no skill exists, the agent follows the relevant reference and `references/conventions.md`.

## License

This sample is licensed under the terms of the [MIT License](LICENSE).
