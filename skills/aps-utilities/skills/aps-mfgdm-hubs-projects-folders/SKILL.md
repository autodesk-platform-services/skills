---
name: aps-mfgdm-hubs-projects-folders
description: List hubs through the Manufacturing Data Model GraphQL API (`POST /mfg/graphql`) with curl and a 3-legged token. Use for "list my hubs with the Manufacturing Data Model", "MFG DM / GraphQL hubs", "Fusion Team hubs via GraphQL". Read-only queries sent by POST; shows the `hubs` query (projects/folders/items follow the same pattern). Opens the browser login when no token is stored.
---

# Navigate hubs (Manufacturing Data Model, GraphQL, curl)

No OpenAPI spec for the Manufacturing Data Model is in https://github.com/autodesk-platform-services/aps-sdk-openapi (it is GraphQL; use the schema explorer at https://aps.autodesk.com/en/docs/fusiondata/v1/developers_guide/).

## Prerequisites
- `.env` credentials; callback `http://localhost:8080/callback` registered (see `aps-auth-3legged`).
- **3-legged**, scope `data:read`. Stored token, silent refresh, then browser sign-in.
- `curl`, `jq`.

## Request
`POST https://developer.api.autodesk.com/mfg/graphql`
```bash
APS=https://developer.api.autodesk.com
# token: from the aps-auth-* skill (credentials, scopes, errors there); run from the aps-utilities folder
TOKEN=$(python3 skills/aps-auth-3legged/scripts/ensure_token.py --scope "data:read")

CURSOR=null
while :; do
  R=$(curl -sS -X POST "$APS/mfg/graphql" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"query\":\"query(\$cursor:String){ hubs(pagination:{cursor:\$cursor}){ pagination{cursor} results{ id name } } }\",\"variables\":{\"cursor\":$CURSOR}}")
  echo "$R" | jq -e '.errors' >/dev/null && { echo "$R" | jq .errors; break; }
  echo "$R" | jq -r '.data.hubs.results[] | [.id,.name] | @tsv'
  NEXT=$(echo "$R" | jq -r '.data.hubs.pagination.cursor // empty'); [ -z "$NEXT" ] && break
  CURSOR=$(jq -n --arg c "$NEXT" '$c')
done
```
Pagination: pass `pagination.cursor` back as `cursor` until it is empty.

## Approval
Queries only read, but they are `POST`. Per the root rule they are exempt from the confirmation step (read-only GraphQL **queries**). **Mutations** (`set…`, `create…`) are not exempt and always need approval.

## Gotchas
- GraphQL failures return HTTP 200 with an `errors` array. Always check `.errors`.
- Hub IDs are `urn:adsk.ace:prod.scope:<guid>`, **not** the `a.`/`b.` IDs of the Data Management API (`aps-dm-browse`). Don't mix them.
- Observed: the hub list differed from `aps-dm-browse` (24 vs 26; two ACC accounts in GBR/CAN were absent). Cause not verified. Compare both when a hub seems missing.
- "No hubs" usually means the wrong Autodesk account was used to sign in.
