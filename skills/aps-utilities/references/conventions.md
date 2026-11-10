# Conventions for all APS skills

Part of the [`aps`](../SKILL.md) umbrella skill. Every leaf skill in `skills/<api>/` follows these rules.

## Skill design

- **Granularity**: one skill = one task a developer asks for ("upload a file to an ACC folder"), not one endpoint. Each `SKILL.md` lists the endpoints it wraps.
- **Naming**: `aps-<family>-<verb>-<noun>`, kebab-case. Family prefixes: `auth`, `oss`, `dm`, `md` (Model Derivative), `viewer`, `da` (Design Automation), `wh` (Webhooks), `acc`, `aecdm`, `mfgdm`, `rc` (Reality Capture).
- **Layout**: `skills/<api>/<skill-name>/SKILL.md` (frontmatter `name`, `description`; sections: When to use, Prerequisites, Endpoint(s), Usage, Pitfalls) + `scripts/` + optional `references/` for payload samples.
- **Language**: Python 3.9+ and `requests` only, raw REST (no APS SDK). Scripts are both CLI (`argparse`, `--help`, non-zero exit on error) and importable (pure functions returning dicts).
- **Shared helper**: `_shared/aps_common.py` is the source of truth; `python _shared/vendor.py` copies it into every `scripts/` folder so each skill is self-contained. Never edit the vendored copies.
- **Auth declaration**: each SKILL.md states 2-legged / 3-legged / either, and the exact scopes.
- **Secrets**: read `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, `APS_ACCESS_TOKEN` from env only; never log tokens.

## Environment variables

| Var | Purpose |
|---|---|
| `APS_CLIENT_ID` / `APS_CLIENT_SECRET` | app credentials |
| `APS_ACCESS_TOKEN` | if set, used as-is (skips token calls) — how 3-legged tokens flow into DM skills |
| `APS_REGION` | `US` (default) · `EMEA` · `AUS`; sent as `x-ads-region` where relevant |
| `APS_BASE_URL` | default `https://developer.api.autodesk.com` |

## Identifiers & URNs

| Thing | Shape | Notes |
|---|---|---|
| Hub ID | `b.<guid>` (ACC/BIM 360), `a.<base64>` (Fusion/A360) | `b.` prefix = BIM 360/ACC account ID with `b.` prepended |
| Project ID | `b.<guid>` | ACC Admin APIs use the same GUID **without** `b.` |
| Folder URN | `urn:adsk.wipprod:fs.folder:co.<id>` | `wipprod` = US, `wipemea` = EMEA |
| Item (lineage) URN | `urn:adsk.wipprod:dm.lineage:<id>` | stable across versions |
| Version URN | `urn:adsk.wipprod:fs.file:vf.<id>?version=N` | must be URL-encoded in paths (`enc()`) |
| OSS objectId | `urn:adsk.objects:os.object:<bucket>/<key>` | → `b64url()` for Model Derivative URNs |
| Model Derivative URN | URL-safe base64 of objectId or version URN, no padding | |

## Pagination

- `/project/v1`, `/data/v1` (JSON:API): `page[number]`, `page[limit]` (max 200); follow `links.next.href`. Helper: `iter_jsonapi_pages`.
- `/oss/v2`: `limit` (max 100), `startAt` cursor; follow `next`. Helper: `iter_oss_pages`.
- GraphQL APIs (AEC/MFG Data Model): `pagination.cursor` → pass as `after`.

## Errors

| Status | Usual cause |
|---|---|
| 401 | missing/expired token |
| 403 | token lacks scope, or user/app lacks permission on the resource (ACC: app not a Custom Integration) |
| 404 | wrong region header, wrong ID, or un-encoded URN |
| 409 | resource exists (bucket) or state conflict |
| 429 | rate limit — `aps_common.request` honours `Retry-After` with exponential backoff |
| 5xx | retried automatically up to 5× |

`aps_common.ApsError` carries `.status`, `.url`, `.body` and a readable message; network failures surface as `ApsError` too.

## Regions

Buckets, hubs and projects are region-bound. OSS calls need `x-ads-region`; DM hub/project/folder calls infer the region from the URN (`wipprod`/`wipemea`) but some ACC endpoints need an explicit `region` query/header. When a call 404s on a known resource, try the other region first.
