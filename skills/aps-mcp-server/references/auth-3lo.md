# Auth: 3-Legged OAuth (Authorization Code Flow)

The user opens a browser URL, signs in to Autodesk, and grants consent. The
server receives an authorization code via a callback URL, exchanges it for
access + refresh tokens, and stores them keyed by MCP session ID.

**Requirements:**

- Streamable HTTP transport with **stateful sessions** (mandatory — needed to
  track per-user tokens by session ID)
- A publicly accessible callback URL registered in the APS portal

**Critical rule:** The MCP server must **never** accept APS tokens from the
MCP client and forward them. The server always authenticates itself.

## APS Portal Setup

1. Go to https://aps.autodesk.com/myapps → select your app.
2. Under **Callback URLs**, add your callback URL (e.g., `http://localhost:5000/callback`).
3. Ensure the required API scopes are enabled (Data Management, etc.).

## Required env vars

```dotenv
APS_CLIENT_ID=      # From https://aps.autodesk.com/myapps
APS_CLIENT_SECRET=
APS_CALLBACK_URL=http://localhost:5000/callback
# For production: https://your-server.example.com/callback
```

## Tool pattern for 3LO

Every tool must check for a valid session token and return an auth redirect if
none is found. The MCP client (or user) opens the URL in a browser, signs in,
then calls the tool again.

```python
# Python example — same logic applies to Node.js and .NET
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
```

## Implementation

Load the language-specific implementation file:

- **Node.js** → read [`references/auth-3lo-nodejs.md`](auth-3lo-nodejs.md)
- **Python** → read [`references/auth-3lo-python.md`](auth-3lo-python.md)
- **.NET** → read [`references/auth-3lo-dotnet.md`](auth-3lo-dotnet.md)
