---
name: aps-oss-bucket-admin
description: Inspect, protect, unprotect or delete an APS OSS bucket (2-legged). Use when the user wants to "show bucket details", "protect a bucket", "stop a bucket being deleted", "unprotect", or "delete a bucket"; also when a delete fails with 403 "Cannot delete protected bucket". protect/unprotect/delete are modifications that need user approval first.
---

# OSS bucket admin (details / protect / unprotect / delete)

## Prerequisites
- Credentials in `.env` (auto-loaded) — see the root `SKILL.md`. 2-legged token; the script requests the right scope per action.
- Only the app that owns the bucket can change or delete it (others get `403`).

## Usage
```bash
python scripts/bucket_admin.py details  my-bucket                 # GET  …/details        (read-only)
python scripts/bucket_admin.py protect  my-bucket --yes           # POST …/protect {"protection": true}
python scripts/bucket_admin.py unprotect my-bucket --yes          # POST …/protect {"protection": false}
python scripts/bucket_admin.py delete   my-bucket --yes --wait    # DELETE …/{bucketKey}, poll until gone
```
`--region US|EMEA|AUS` (default `APS_REGION`/`US`).

## Approval rule (enforced in code)
`protect`, `unprotect` and `delete` print what they will do and refuse to run non-interactively without `--yes`. **Agents: describe the action to the user, wait for an explicit "yes", and only then add `--yes`.** `delete` also lists how many objects will be destroyed.

## Endpoints
| Action | Call | Scope |
|---|---|---|
| details | `GET /oss/v2/buckets/{key}/details` | `bucket:read` |
| protect / unprotect | `POST /oss/v2/buckets/{key}/protect`, body `{"protection": true\|false}`, `200 text/plain`, idempotent | `bucket:update` |
| delete | `DELETE /oss/v2/buckets/{key}` | `bucket:delete` |

## Behaviour verified live
- Protected bucket + delete → `403` body `Cannot delete protected bucket <key>`; bucket stays intact.
- Unprotect → `200` "Bucket <key> protection set to false", then delete → `200`.
- Right after deleting a bucket that held objects, `details` can return `409` for a moment, then `404`. Use `--wait`.
- A deleted bucket's key is not immediately reusable. New buckets are unprotected by default; `persistent` policy ≠ protected.
