# Auth: 3-Legged OAuth — Python

## `src/aps_mcp_server/auth.py`

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


def build_auth_url(session_id: str) -> str:
    return f"{APS_AUTH_URL}?" + urlencode({
        "response_type": "code",
        "client_id": APS_CLIENT_ID,
        "redirect_uri": APS_CALLBACK_URL,
        "scope": SCOPES,
        "state": session_id,
    })


async def exchange_code(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            APS_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": APS_CALLBACK_URL,
            },
            auth=(APS_CLIENT_ID, APS_CLIENT_SECRET),
        )
        r.raise_for_status()
        return r.json()


async def _do_refresh(refresh_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            APS_TOKEN_URL,
            data={"grant_type": "refresh_token", "refresh_token": refresh_token},
            auth=(APS_CLIENT_ID, APS_CLIENT_SECRET),
        )
        r.raise_for_status()
        return r.json()


def refresh_if_needed(session: dict) -> str | None:
    """Return a valid access token, refreshing if needed. Returns None if no refresh token."""
    if time.time() < session["expires_at"] - 60:
        return session["access_token"]
    if not session.get("refresh_token"):
        return None
    import asyncio
    data = asyncio.run(_do_refresh(session["refresh_token"]))
    session.update({
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token", session["refresh_token"]),
        "expires_at": time.time() + data.get("expires_in", 3600),
    })
    return session["access_token"]
```

## `src/aps_mcp_server/server.py` — stateful wiring

```python
import os
import time
from fastmcp import FastMCP, Context
from starlette.requests import Request
from starlette.responses import HTMLResponse
from .auth import build_auth_url, exchange_code, refresh_if_needed
from .aps.oss import list_oss_buckets, list_oss_objects

mcp = FastMCP("APS MCP Server")

# In-memory session store  {session_id: {access_token, refresh_token, expires_at}}
_sessions: dict[str, dict] = {}


def _get_session_token(session_id: str) -> str | None:
    session = _sessions.get(session_id)
    if not session:
        return None
    return refresh_if_needed(session)


@mcp.custom_route("/callback", methods=["GET"])
async def oauth_callback(request: Request) -> HTMLResponse:
    code = request.query_params.get("code")
    session_id = request.query_params.get("state")
    if not code or not session_id:
        return HTMLResponse("Missing code or state.", status_code=400)
    tokens = await exchange_code(code)
    _sessions[session_id] = {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token"),
        "expires_at": time.time() + tokens.get("expires_in", 3600),
    }
    return HTMLResponse("<h2>Authentication successful! You can close this window.</h2>")


@mcp.tool()
async def list_buckets(ctx: Context) -> list[dict] | dict:
    """List all OSS buckets accessible to the authenticated user."""
    token = _get_session_token(ctx.session_id)
    if not token:
        return {
            "auth_required": True,
            "auth_url": build_auth_url(ctx.session_id),
            "message": "Open auth_url in a browser to sign in, then call this tool again.",
        }
    return await list_oss_buckets(token)


@mcp.tool()
async def list_objects(ctx: Context, bucket_key: str) -> list[dict] | dict:
    """List all objects in an OSS bucket.

    Args:
        bucket_key: The unique key identifying the OSS bucket.
    """
    token = _get_session_token(ctx.session_id)
    if not token:
        return {
            "auth_required": True,
            "auth_url": build_auth_url(ctx.session_id),
            "message": "Open auth_url in a browser to sign in, then call this tool again.",
        }
    return await list_oss_objects(token, bucket_key)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
```
