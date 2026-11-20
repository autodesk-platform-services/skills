# 3-legged token helper: Python

## `auth.py`

```python
import os
import time
import httpx
from urllib.parse import urlencode
from dotenv import load_dotenv

load_dotenv()

APS_CLIENT_ID = os.environ["APS_CLIENT_ID"]
APS_CLIENT_SECRET = os.environ["APS_CLIENT_SECRET"]
APS_CALLBACK_URL = os.environ["APS_CALLBACK_URL"]
APS_TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token"
APS_AUTH_URL = "https://developer.api.autodesk.com/authentication/v2/authorize"
SCOPES = "data:read bucket:read"

# Keyed by user or session ID. Replace with a persistent store in production.
_tokens: dict[str, dict] = {}


def build_auth_url(state: str) -> str:
    return f"{APS_AUTH_URL}?" + urlencode({
        "response_type": "code",
        "client_id": APS_CLIENT_ID,
        "redirect_uri": APS_CALLBACK_URL,
        "scope": SCOPES,
        "state": state,
    })


async def _post_token(form: dict) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(APS_TOKEN_URL, data=form, auth=(APS_CLIENT_ID, APS_CLIENT_SECRET))
        r.raise_for_status()
        data = r.json()
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "expires_at": time.time() + data["expires_in"],
    }


async def exchange_code(key: str, code: str) -> None:
    """Call from the callback route, with the key that `state` maps to."""
    _tokens[key] = await _post_token({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": APS_CALLBACK_URL,
    })


async def get_access_token(key: str) -> str | None:
    """Return a valid access token, refreshing it if needed, or None if the user must sign in."""
    tokens = _tokens.get(key)
    if not tokens:
        return None
    if time.time() < tokens["expires_at"] - 60:
        return tokens["access_token"]
    if not tokens.get("refresh_token"):
        return None
    try:
        refreshed = await _post_token({
            "grant_type": "refresh_token",
            "refresh_token": tokens["refresh_token"],
        })
    except httpx.HTTPStatusError:
        _tokens.pop(key, None)  # refresh token expired or revoked
        return None
    refreshed["refresh_token"] = refreshed["refresh_token"] or tokens["refresh_token"]
    _tokens[key] = refreshed
    return refreshed["access_token"]
```

Keep `get_access_token` async and `await` it. Don't wrap the refresh in `asyncio.run()`: that
fails inside a running event loop, which is where web and MCP handlers run.
