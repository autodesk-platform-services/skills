# Python APS MCP Server Reference

## Package Manager: uv

Always use `uv` for Python APS MCP servers. It provides fast, reproducible
environments and the `uv run` command for running FastMCP servers directly.

## Dependencies

```toml
# pyproject.toml
[project]
name = "aps-mcp-server"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastmcp>=2.3.4",
    "httpx>=0.27",
    "python-dotenv>=1.0",
    # SSA auth only:
    "pyjwt[crypto]>=2.8",
    # 3LO auth only: (fastmcp includes starlette)
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

## Project Initialisation

```bash
uv init aps-mcp-server
cd aps-mcp-server
uv add fastmcp httpx python-dotenv
# SSA auth:
uv add "pyjwt[crypto]"
```

## Project Structure

```
aps-mcp-server/
├── pyproject.toml
├── .env
├── .env.example
├── README.md
└── src/
    └── aps_mcp_server/
        ├── __init__.py
        ├── server.py        # FastMCP app + tool registration
        ├── auth.py          # Token helper from the aps-auth skill (per auth type)
        └── aps/
            ├── __init__.py
            └── oss.py       # APS OSS API helpers
```

## FastMCP Server — STDIO

```python
# src/aps_mcp_server/server.py
from fastmcp import FastMCP
from .auth import get_access_token
from .aps.oss import list_oss_buckets, list_oss_objects

mcp = FastMCP("APS MCP Server")


@mcp.tool()
async def list_buckets() -> list[dict]:
    """List all OSS buckets owned by the configured APS application."""
    token = await get_access_token()
    return await list_oss_buckets(token)


@mcp.tool()
async def list_objects(bucket_key: str) -> list[dict]:
    """List all objects stored in a specific OSS bucket.

    Args:
        bucket_key: The unique key identifying the OSS bucket.
    """
    token = await get_access_token()
    return await list_oss_objects(token, bucket_key)


if __name__ == "__main__":
    mcp.run()  # defaults to STDIO
```

## FastMCP Server — Streamable HTTP (Stateless)

For 2-legged OAuth and SSA (no per-user sessions needed):

```python
# src/aps_mcp_server/server.py
from fastmcp import FastMCP
from .auth import get_access_token
from .aps.oss import list_oss_buckets, list_oss_objects
import os

mcp = FastMCP("APS MCP Server")


@mcp.tool()
async def list_buckets() -> list[dict]:
    """List all OSS buckets owned by the configured APS application."""
    token = await get_access_token()
    return await list_oss_buckets(token)


@mcp.tool()
async def list_objects(bucket_key: str) -> list[dict]:
    """List all objects stored in a specific OSS bucket.

    Args:
        bucket_key: The unique key identifying the OSS bucket.
    """
    token = await get_access_token()
    return await list_oss_objects(token, bucket_key)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
```

Run:
```bash
uv run python -m aps_mcp_server.server
# or via fastmcp CLI:
uv run fastmcp run src/aps_mcp_server/server.py:mcp --transport streamable-http --port 5000
```

## FastMCP Server — Streamable HTTP (Stateful, 3LO only)

When using 3-legged OAuth, the server must be **stateful** to track per-user
tokens by `session_id`. The token helper (`auth.py`) comes from the `aps-auth`
skill; the callback route and tool pattern are in [`auth.md`](auth.md). Tools
use `ctx: Context` to get the session ID, and `await get_access_token(ctx.session_id)`.

## APS OSS API Helpers

```python
# src/aps_mcp_server/aps/oss.py
import httpx

APS_BASE_URL = "https://developer.api.autodesk.com"


async def list_oss_buckets(token: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{APS_BASE_URL}/oss/v2/buckets",
            headers={"Authorization": f"Bearer {token}"},
        )
        r.raise_for_status()
        return r.json().get("items", [])


async def list_oss_objects(token: str, bucket_key: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{APS_BASE_URL}/oss/v2/buckets/{bucket_key}/objects",
            headers={"Authorization": f"Bearer {token}"},
        )
        r.raise_for_status()
        return r.json().get("items", [])
```

## `.env.example`

```dotenv
# APS Application credentials (https://aps.autodesk.com/myapps)
APS_CLIENT_ID=
APS_CLIENT_SECRET=

# SSA auth only
APS_SSA_ID=
APS_SSA_KEY_ID=
APS_SSA_KEY_BASE64=

# 3LO auth only
APS_CALLBACK_URL=http://localhost:5000/callback

# HTTP transport only
PORT=5000
```

## Claude Desktop Config (STDIO)

```json
{
  "mcpServers": {
    "aps-mcp-server": {
      "command": "uv",
      "args": [
        "run",
        "--directory", "/absolute/path/to/aps-mcp-server",
        "python", "-m", "aps_mcp_server.server"
      ],
      "env": {
        "APS_CLIENT_ID": "your-client-id",
        "APS_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Loading `.env` in Python

Load environment variables at module level, before any code that depends on
them. The `aps-auth` helpers for `src/aps_mcp_server/auth.py` already call
`load_dotenv()` at the top.

## Type Hints and Return Values

FastMCP infers tool input schema from function signatures and output schema
from return type annotations. Always annotate:

```python
@mcp.tool()
async def list_buckets() -> list[dict]:   # structured output inferred
    ...
```

Return `list[dict] | dict` when the tool may return either data or an
auth-required redirect response (3LO pattern).
