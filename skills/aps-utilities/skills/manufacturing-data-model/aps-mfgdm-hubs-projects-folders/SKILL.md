---
name: aps-mfgdm-hubs-projects-folders
description: List hubs through the Manufacturing Data Model GraphQL API (`POST /mfg/graphql`) with a 3-legged token. Use for "list my hubs with the Manufacturing Data Model", "MFG DM / GraphQL hubs", "Fusion Team hubs via GraphQL". Read-only queries over POST; currently implements `hubs` only (projects/folders/items planned). Opens the browser login when no token is stored.
---

# Navigate hubs (Manufacturing Data Model, GraphQL)

## Prerequisites
- `.env` with `APS_CLIENT_ID` / `APS_CLIENT_SECRET`; callback `http://localhost:8080/callback` registered (see `aps-auth-3legged`).
- **3-legged**, scope `data:read`. Stored token → silent refresh → browser sign-in.

## Usage
```bash
python scripts/mfgdm.py hubs            # id | name, then a count
python scripts/mfgdm.py hubs --json     # [{"id": …, "name": …}]
```
Import form: `from mfgdm import graphql, iter_hubs`.

## Request
`POST https://developer.api.autodesk.com/mfg/graphql`
```json
{"query":"query($cursor:String){ hubs(pagination:{cursor:$cursor}){ pagination{cursor} results{ id name } } }","variables":{"cursor":null}}
```
Pagination: pass `pagination.cursor` as `cursor` until it is empty (`iter_hubs` does this).

## Approval
Queries only read, but they are `POST`. **Agents: describe the request and wait for an explicit "yes" before running** (project rule: no non-GET APS call without approval). Mutations (`set…`, `create…`) are not implemented here and always need approval.

## Pitfalls
- GraphQL failures return HTTP 200 with an `errors` array; `graphql()` raises on it.
- Hub IDs are `urn:adsk.ace:prod.scope:<guid>` — **not** the `a.`/`b.` IDs of the Data Management API (`aps-dm-browse`); don't mix them.
- Observed: the hub list differed from `aps-dm-browse hubs` (24 vs 26; two ACC accounts in GBR/CAN were absent). Cause not verified — compare both when a hub seems missing.
- "No hubs" usually means the wrong Autodesk account was used to sign in.
