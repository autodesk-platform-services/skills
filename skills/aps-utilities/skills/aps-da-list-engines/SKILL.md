---
name: aps-da-list-engines
description: List the Design Automation engines (AutoCAD, Revit, Inventor, 3ds Max, Fusion versions) available to an APS app with curl, following pagination, and optionally filter by product. Use when the user asks "what Design Automation engines exist", "which Revit versions can I run", or needs an engine id for an Activity. 2-legged auth, read-only.
---

# List Design Automation engines (curl)

No OpenAPI spec for Design Automation is in https://github.com/autodesk-platform-services/aps-sdk-openapi; endpoint is from the Design Automation v3 reference and verified against the live API.

## Prerequisites
- 2-legged token with `code:all`. `curl`, `jq`. `GET` only, no approval needed.
- Token: from the `aps-auth-2legged` skill.

## Endpoints
| Call | Notes |
|---|---|
| `GET /da/us-east/v3/engines?page=…` | `{data: ["Autodesk.Revit+2026", …], paginationToken}`; pass `paginationToken` as `page` until absent |
| `GET /da/us-east/v3/engines/{id}` | details for one engine: `id`, `description`, `productVersion`, `deprecationDate`, `version`, `priorityPass` |

## Recipe
```bash
APS=https://developer.api.autodesk.com
# token: from the aps-auth-* skill (credentials, scopes, errors there); run from the aps-utilities folder
TOKEN=$(python3 skills/aps-auth-2legged/scripts/get_token.py --raw --scope "code:all" 2>/dev/null)
H=(-H "Authorization: Bearer $TOKEN")

# all engines, paginated, sorted
PAGE=""
while :; do
  Q=(); [ -n "$PAGE" ] && Q=(--data-urlencode "page=$PAGE")   # array form works in bash and zsh
  R=$(curl -sS -G "$APS/da/us-east/v3/engines" "${H[@]}" "${Q[@]}")
  echo "$R" | jq -r '.data[]'
  PAGE=$(echo "$R" | jq -r '.paginationToken // empty'); [ -z "$PAGE" ] && break
done | sort -uV

# only one product, e.g. Revit: append  | grep -i '^Autodesk\.Revit+'

# details of one engine (URL-encode the + as %2B)
curl -sS "$APS/da/us-east/v3/engines/Autodesk.Revit%2B2026" "${H[@]}" | jq .
```

## Gotchas
- Redirect token-script stderr to `/dev/null` (`2>/dev/null`) so Python warnings don't end up inside `$TOKEN` (symptom: `400 Bad Request` HTML from nginx).
- Page 2 of a paginated call fails if the page token isn't passed as a separate curl argument: use the array form above, not `${PAGE:+…}` (breaks in zsh).
- The list includes internal `Autodesk.Test+*` engines; ignore them.
- Engines are retired over time. An Activity pointing at a retired engine fails at WorkItem time, so recheck before reusing old Activities.
- `403`: token lacks `code:all`.
