---
name: aps-da-list-appbundles
description: List Design Automation AppBundles visible to the APS app (own and Autodesk/shared), with automatic pagination and an option to show only the app's own bundles. Use when the user asks "list my app bundles", "what AppBundles do I have", or needs an AppBundle id/alias for an Activity. 2-legged auth, read-only.
---

# List Design Automation AppBundles

## When to use
- Discover AppBundle ids (`owner.name+alias`) before creating an Activity.
- Not for creating/versioning bundles — that is `aps-da-appbundle` (planned).

## Prerequisites
- 2-legged token with `code:all`.

## Endpoints
| Call | Notes |
|---|---|
| `GET /da/us-east/v3/appbundles?page=…` | returns `{data: ["owner.name+alias", …], paginationToken}`; pass `paginationToken` as `page` until absent |
| `GET /da/us-east/v3/forgeapps/me` | app nickname (a JSON string); used by `--mine` |

The list includes Autodesk and shared bundles, not only your own.

## Usage
```bash
python scripts/list_appbundles.py                     # all visible, JSON
python scripts/list_appbundles.py --mine --table      # only this app's bundles
python scripts/list_appbundles.py --engine-prefix Fusion
```
Python:
```python
from list_appbundles import iter_appbundles
for bundle_id in iter_appbundles():
    print(bundle_id)
```

## Pitfalls
- Owner prefix is the **nickname** once one is set, otherwise the client ID; `--mine` matches both.
- Each alias (`+dev`, `+Latest`, `+$LATEST`) is listed as a separate entry.
- `403`: token lacks `code:all`. Unqualified names resolve only after a nickname is set.
