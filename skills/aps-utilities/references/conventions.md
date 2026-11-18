# Conventions for all APS skills

Part of the [`aps`](../SKILL.md) umbrella skill. Every leaf skill in `skills/<api>/` follows these rules.

## Skill design

- **Granularity**: one skill = one task a developer asks for ("upload a file to an ACC folder"), not one endpoint. Each `SKILL.md` lists the endpoints it wraps.
- **Naming**: `aps-<family>-<verb>-<noun>`, kebab-case. Family prefixes: `auth`, `oss`, `dm`, `md` (Model Derivative), `viewer`, `da` (Design Automation), `wh` (Webhooks), `acc`, `aecdm`, `mfgdm`, `rc` (Reality Capture).
- **Layout**: flat, `skills/<skill-name>/SKILL.md` (plugins discover one level only, so no family sub-folders; the family is the name prefix) (frontmatter `name`, `description`; sections: Prerequisites, Endpoint(s), Recipe, Gotchas; no "When to use" section, the `description` already carries triggers) + optional `references/` for payload samples. No `scripts/` folder except in `skills/aps-auth-*`.
- **Language**: `curl` + `jq` against the raw REST endpoints (no APS SDK), written to match the OpenAPI specs at https://github.com/autodesk-platform-services/aps-sdk-openapi. State the spec file the recipe is based on. For APIs not in that repo (Design Automation, GraphQL), cite the docs page.
- **Tokens**: always from the authentication scripts (`get_token.py --raw`, `ensure_token.py`) so secrets stay in `.env`. Recipes use `TOKEN=$(...)` and `-H "Authorization: Bearer $TOKEN"`. Never print the token. Every leaf recipe puts the `TOKEN=$(...)` line first in its Recipe block and names the `aps-auth-*` skill that holds credentials and scopes. Write `python3`, not `python`.
- **Token helper**: `_shared/aps_common.py` is the source of truth; `python _shared/vendor.py` copies it into the two authentication `scripts/` folders. Never edit the vendored copies.
- **Recipes**: define `APS=https://developer.api.autodesk.com`, URL-encode IDs/URNs with `jq -rn --arg v "$X" '$v|@uri'`, loop on `next` / `links.next.href` for pagination, and mark every non-GET step as needing approval.
- **Auth declaration**: each SKILL.md states 2-legged / 3-legged / either, and the exact scopes.
- **Secrets**: read `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, `APS_ACCESS_TOKEN` from env only; never log tokens.

## Environment variables

| Var | Purpose |
|---|---|
| `APS_CLIENT_ID` / `APS_CLIENT_SECRET` | app credentials |
| `APS_ACCESS_TOKEN` | if set, the token scripts use it as-is (skips token calls) |
| `APS_REGION` | `US` (default) · `EMEA` · `AUS`; sent as `x-ads-region` where relevant |
| `APS_BASE_URL` | default `https://developer.api.autodesk.com` |

## Identifiers & URNs

| Thing | Shape | Notes |
|---|---|---|
| Hub ID | `b.<guid>` (ACC/BIM 360), `a.<base64>` (Fusion/A360) | `b.` prefix = BIM 360/ACC account ID with `b.` prepended |
| Project ID | `b.<guid>` | ACC Admin APIs use the same GUID **without** `b.` |
| Folder URN | `urn:adsk.wipprod:fs.folder:co.<id>` | `wipprod` = US, `wipemea` = EMEA |
| Item (lineage) URN | `urn:adsk.wipprod:dm.lineage:<id>` | stable across versions |
| Version URN | `urn:adsk.wipprod:fs.file:vf.<id>?version=N` | must be URL-encoded in paths (`jq -rn --arg v "$X" '$v|@uri'`) |
| OSS objectId | `urn:adsk.objects:os.object:<bucket>/<key>` | → URL-safe base64 for Model Derivative URNs (`base64 | tr -d '=\n' | tr '+/' '-_'`) |
| Model Derivative URN | URL-safe base64 of objectId or version URN, no padding | |

## Pagination

- `/project/v1`, `/data/v1` (JSON:API): `page[number]`, `page[limit]` (max 200); follow `links.next.href`.. Loop recipe: `aps-dm-browse`.
- `/oss/v2`: `limit` (max 100), `startAt` cursor; follow `next`.. Loop recipe: `aps-oss-list-objects`.
- GraphQL APIs (AEC/MFG Data Model): `pagination.cursor` → pass as `after`.

## Errors

| Status | Usual cause |
|---|---|
| 401 | missing/expired token |
| 403 | token lacks scope, or user/app lacks permission on the resource (ACC: app not a Custom Integration) |
| 404 | wrong region header, wrong ID, or un-encoded URN |
| 409 | resource exists (bucket) or state conflict |
| 429 | rate limit: wait for the `Retry-After` header, then retry |
| 5xx | transient; retry idempotent reads, e.g. `curl --retry 5 --retry-all-errors` |

APS error bodies are JSON with a readable message. Print the body (drop `-f`/`--fail`, or use `-i`) when debugging.

## Regions

Buckets, hubs and projects are region-bound. OSS calls need `x-ads-region`; DM hub/project/folder calls infer the region from the URN (`wipprod`/`wipemea`) but some ACC endpoints need an explicit `region` query/header. When a call 404s on a known resource, try the other region first.

## Spec lookup

For endpoints without a leaf skill, clone or browse https://github.com/autodesk-platform-services/aps-sdk-openapi (`authentication`, `datamanagement`, `modelderivative`, `oss`, `webhooks`, `secureserviceaccount`, `forma/{accountadmin,forms,issues}`). Each YAML has parameters, bodies, scopes and a cURL sample per operation. Design Automation, GraphQL (AEC / Manufacturing Data Model) and others are not in that repo; use https://aps.autodesk.com/en/docs/.

## Pagination styles

JSON:API `links.next.href` for `/project/v1` and `/data/v1`; `next` cursor for `/oss/v2`; `page[number]`/`page[limit]` params.

## Repository layout

```
SKILL.md                     router + token + confirmation rules
references/<api>.md          per-API skill inventory, endpoints, status
references/conventions.md    this file
_shared/aps_common.py        token helper; vendored by _shared/vendor.py into skills/*/scripts/
skills/<skill-name>/   leaf skills: SKILL.md (curl recipes); only aps-auth-* has scripts/
```

## Debugging curl

Add `-i` or `-w '%{http_code}'`; APS error bodies are JSON and say what is wrong.
