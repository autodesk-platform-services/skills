---
name: aps-da-list-appbundles
description: List Design Automation AppBundles visible to the APS app (own and Autodesk/shared) with curl, following pagination, and optionally show only the app's own bundles. Use when the user asks "list my app bundles", "what AppBundles do I have", or needs an AppBundle id/alias for an Activity. 2-legged auth, read-only.
---

# List Design Automation AppBundles (curl)

No OpenAPI spec for Design Automation is in https://github.com/autodesk-platform-services/aps-sdk-openapi; endpoints below are from the Design Automation v3 reference and verified earlier.

## When to use
- Discover AppBundle ids (`owner.name+alias`) before creating an Activity.
- Not for creating or versioning bundles (planned `aps-da-appbundle`).

## Prerequisites
- 2-legged token with `code:all`. `curl`, `jq`. `GET` only, no approval needed.

## Endpoints
| Call | Notes |
|---|---|
| `GET /da/us-east/v3/appbundles?page=…` | `{data: ["owner.name+alias", …], paginationToken}`; pass `paginationToken` as `page` until absent |
| `GET /da/us-east/v3/forgeapps/me` | the app's nickname (a JSON string), used to filter your own |

The list includes Autodesk and shared bundles, not only yours.

## Recipe
```bash
APS=https://developer.api.autodesk.com
TOKEN=$(python skills/authentication/aps-auth-2legged/scripts/get_token.py --raw --scope "code:all")
H=(-H "Authorization: Bearer $TOKEN")

# all visible bundles, paginated
PAGE=""
while :; do
  R=$(curl -sS -G "$APS/da/us-east/v3/appbundles" "${H[@]}" ${PAGE:+--data-urlencode "page=$PAGE"})
  echo "$R" | jq -r '.data[]'
  PAGE=$(echo "$R" | jq -r '.paginationToken // empty'); [ -z "$PAGE" ] && break
done

# only this app's bundles (nickname if set, otherwise client ID prefix)
NICK=$(curl -sS "$APS/da/us-east/v3/forgeapps/me" "${H[@]}" | jq -r .)
# pipe the loop above through: grep -E "^($NICK|$APS_CLIENT_ID)\."   (do not echo the client ID)

# filter by engine/name, e.g. Fusion
# ... | grep -i '^[^.]*\.Fusion'
```

## Pitfalls
- Owner prefix is the **nickname** once one is set, otherwise the client ID.
- Each alias (`+dev`, `+Latest`, `+$LATEST`) is listed as a separate entry.
- `403`: token lacks `code:all`. Unqualified names resolve only after a nickname is set.
