---
name: aps-auth-3legged
description: Obtain a 3-legged (user-context) OAuth token for Autodesk Platform Services via the authorization-code flow with PKCE, including refresh tokens. Use whenever a task touches user-owned data — Hubs, Projects, Folders, Items, Versions in ACC / BIM 360 / Fusion Team — or when the user asks to "log in with Autodesk", "get a user token", or hits 403 on /project/v1/hubs with a 2-legged token. Whenever a 3-legged token is needed and none is available, run `scripts/ensure_token.py`: it pops up the browser login page automatically.
---

# APS 3-legged authentication (authorization code + PKCE)

## When to use
- Any `/project/v1/...` or `/data/v1/...` call against ACC, BIM 360 or Fusion Team hubs.
- Acting on behalf of a signed-in Autodesk user.
- If you only need OSS buckets or Model Derivative, use `aps-auth-2legged` instead.

## When a 3-legged token is needed — show the login
If a task needs a user token and `APS_ACCESS_TOKEN` is not a valid 3-legged token, **do not ask the user to paste a token or to log in manually**. Run `scripts/ensure_token.py` with the scopes the task needs. It reuses a stored token, refreshes it silently, or otherwise **opens the Autodesk sign-in page in the user's browser**, catches the callback on `localhost:8080`, and prints the access token. Tell the user a browser window is opening and to sign in; the command blocks (up to 5 min) until they finish.

```bash
export APS_ACCESS_TOKEN=$(python scripts/ensure_token.py --scope "data:read")
```
The login URL is also printed to stderr as a fallback if no browser could be launched.

## Prerequisites
- APS app with a **Callback URL** registered (for the CLI helper: `http://localhost:8080/callback`).
- `pip install requests`
- Env vars: `APS_CLIENT_ID`; `APS_CLIENT_SECRET` for confidential (server) apps. Public apps (desktop/SPA) omit the secret and rely on PKCE.

## Flow
1. **Authorize** — send the user's browser to
   `GET https://developer.api.autodesk.com/authentication/v2/authorize?response_type=code&client_id=…&redirect_uri=…&scope=…&state=…&code_challenge=…&code_challenge_method=S256`
2. **Callback** — Autodesk redirects to `redirect_uri?code=…&state=…`.
3. **Exchange** — `POST /authentication/v2/token` with `grant_type=authorization_code&code=…&redirect_uri=…&code_verifier=…` (Basic auth header for confidential apps, `client_id` in body for public apps).
   Response includes `access_token`, `refresh_token`, `expires_in`.
4. **Refresh** — `POST /authentication/v2/token` with `grant_type=refresh_token&refresh_token=…&scope=…` (scope must be a subset of the original). Each refresh returns a *new* refresh token; store it.

## Scopes cheat-sheet
| Task | Scope string |
|---|---|
| Browse hubs/projects/folders, download | `data:read` |
| Upload / create folders / new versions | `data:read data:write data:create` |
| Keep user logged in (refresh token) | add `offline_access` |
| Read user profile | add `user-profile:read` |

## Usage
```bash
# Preferred: reuse / refresh / else open browser — returns just the access token
export APS_ACCESS_TOKEN=$(python scripts/ensure_token.py --scope "data:read")
# Force a fresh interactive login: opens browser, catches callback on localhost:8080, saves tokens
python scripts/login.py --scope "data:read data:write data:create offline_access"
# Refresh later
python scripts/refresh.py            # reads/writes ~/.aps_tokens.json
export APS_ACCESS_TOKEN=$(python scripts/refresh.py --raw)
```
In Python:
```python
from ensure_token import ensure_token
access_token = ensure_token("data:read")          # opens the browser only if needed

from aps_common import exchange_code_for_token, refresh_3legged_token
tok = exchange_code_for_token(code, redirect_uri, code_verifier)
tok = refresh_3legged_token(tok.refresh_token)
```
Downstream DM skills read `APS_ACCESS_TOKEN` from the environment, so export it after login.

## Pitfalls
- Login times out after 300 s (`--timeout`); port 8080 must be free.
- `redirect_uri` must match the app's registered callback **exactly** (scheme, host, port, path).
- `invalid_grant` on refresh: refresh token already used or expired (15 days idle) — re-run login.
- A user token only sees hubs the user is a member of; "no hubs returned" usually means wrong account or the app isn't a Custom Integration in that BIM 360/ACC account (needed for 2-legged on ACC, not for 3-legged).
- Store refresh tokens encrypted; `~/.aps_tokens.json` in this skill is for local dev only.
