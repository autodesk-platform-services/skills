---
name: aps-auth-2legged
description: Obtain a 2-legged (client-credentials) access token for Autodesk Platform Services. Use whenever a task calls an APS endpoint that works with app-only auth — OSS buckets/objects, Model Derivative, Design Automation, Webhooks — or when the user asks "how do I get an APS token", "authenticate my app", or sees 401 errors from APS. Not for user-context endpoints (Hubs/Projects/Folders); use aps-auth-3legged for those.
---

# APS 2-legged authentication

## When to use
- Calling OSS (`/oss/v2/...`), Model Derivative, Design Automation, Webhooks.
- Any server-to-server job where no end user is logged in.
- **Not** for `/project/v1/hubs`, `/data/v1/projects/...` on ACC/BIM 360/Fusion — those need a user (3-legged) token.

## Prerequisites
- An APS app at https://aps.autodesk.com/myapps with the needed APIs enabled.
- `pip install requests`
- Env vars: `APS_CLIENT_ID`, `APS_CLIENT_SECRET`.

## Endpoint
`POST https://developer.api.autodesk.com/authentication/v2/token`

Headers: `Authorization: Basic base64(client_id:client_secret)`, `Content-Type: application/x-www-form-urlencoded`
Body: `grant_type=client_credentials&scope=<space-separated scopes>`

Response: `{"access_token": "...", "token_type": "Bearer", "expires_in": 3599}`

## Scopes cheat-sheet
| Task | Scope string |
|---|---|
| Read buckets/objects | `bucket:read data:read` |
| Create bucket + upload | `bucket:create bucket:read data:read data:write data:create` |
| Delete bucket/objects | add `bucket:delete` |
| Model Derivative translate | `data:read data:write data:create` (+ `viewables:read` for viewer tokens) |

Request only what you need; a token's scopes are fixed once issued.

## Usage
```bash
python scripts/get_token.py                                  # default OSS write scopes
python scripts/get_token.py --scope "bucket:read data:read"  # custom scopes
export APS_ACCESS_TOKEN=$(python scripts/get_token.py --raw)  # reuse in other skills
```
In Python:
```python
from aps_common import get_2legged_token, SCOPES_OSS_WRITE
tok = get_2legged_token(SCOPES_OSS_WRITE)
headers = tok.header()  # {"Authorization": "Bearer ..."}
```
`get_2legged_token` caches per scope string and refreshes 60 s before expiry. If `APS_ACCESS_TOKEN` is set it is used as-is.

## Pitfalls
- `401 invalid_client`: wrong secret or the client ID/secret pair is from a different app.
- `403` with a valid token: missing scope (e.g. `bucket:create`) — fix the scope, not the token call.
- Tokens last ~60 min; never hard-code one.
- Client secrets must stay server-side. For browser/desktop apps use 3-legged with PKCE.
