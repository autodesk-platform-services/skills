# Auth in an APS MCP server

Token acquisition, caching, and refresh code comes from the `aps-auth` skill. This file covers
only how to wire it into an MCP server.

**Critical rule:** The MCP server must **never** accept APS tokens from the MCP client and
forward them. The server always authenticates with APS itself. MCP client auth (who may call the
server) and APS auth (which APS identity the server uses) are separate concerns.

## Choose the server's APS identity

| Pattern | Who the server acts as | Transport |
| --- | --- | --- |
| **2-legged OAuth** | The APS app. Tools see only app-owned data, such as OSS buckets the app created. | STDIO or stateless HTTP |
| **SSA** | One service account, shared by everyone who can reach the server. Protect an HTTP endpoint accordingly (see `transport-http.md`). | STDIO or stateless HTTP |
| **3-legged OAuth** | Each MCP user, after they sign in through the browser. | Stateful Streamable HTTP only, with a public callback URL |

## Token helper

Load the `aps-auth` reference for the chosen pattern and language, and put the helper where the
language reference expects it:

| Language | File | Notes |
| --- | --- | --- |
| Node.js | `src/auth.ts` | Make `ServerOptions` (in `src/server.ts`) include the credential fields the helper needs, and pass `options` as its `credentials` argument |
| Python | `src/aps_mcp_server/auth.py` | Tools import `get_access_token` from `.auth` |
| .NET | `Services/Aps*AuthService.cs` | Register the service as a singleton, and inject it into `ApsOssClient` and tool classes |

Add the flow's env vars from the `aps-auth` reference to `.env.example`.

## 3-legged wiring

With 3-legged OAuth, tokens are stored per MCP session:

- Use the MCP session ID as both the token store key and the OAuth `state`. The server generates
  session IDs as random UUIDs, so they're unguessable.
- Serve a `/callback` route next to the MCP endpoint. It exchanges the code for tokens under the
  session ID from `state`, and shows a "you can close this window" page.
- When a tool has no valid token for its session, it returns an `auth_required` response with
  the authorization URL instead of failing. The user opens the URL, signs in, and calls the tool
  again.
- Use the stateful Streamable HTTP setup from `transport-http.md`.

### Node.js

```typescript
// src/index.ts — next to the stateful /mcp endpoint
import { exchangeCode } from "./auth.js";

app.get("/callback", async (req, res) => {
  const { code, state: sessionId } = req.query as Record<string, string>;
  if (!code || !sessionId) { res.status(400).send("Missing parameters"); return; }
  await exchangeCode(options, sessionId, code);
  res.send("<h2>Authentication successful! You can close this window.</h2>");
});
```

```typescript
// In a tool callback — the session ID comes from the MCP request context
import { getAccessToken, buildAuthUrl } from "../auth.js";

callback: async ({ bucketKey }, { sessionId }) => {
  const token = await getAccessToken(options, sessionId!);
  if (!token) {
    return {
      content: [{ type: "text", text: "Authentication required." }],
      structuredContent: {
        auth_required: true,
        auth_url: buildAuthUrl(options, sessionId!),
        message: "Open auth_url in a browser to sign in, then call this tool again.",
      },
    };
  }
  // ... proceed with token
}
```

### Python

```python
# src/aps_mcp_server/server.py
import os
from fastmcp import FastMCP, Context
from starlette.requests import Request
from starlette.responses import HTMLResponse
from .auth import build_auth_url, exchange_code, get_access_token
from .aps.oss import list_oss_buckets

mcp = FastMCP("APS MCP Server")


def _auth_required(session_id: str) -> dict:
    return {
        "auth_required": True,
        "auth_url": build_auth_url(session_id),
        "message": "Open auth_url in a browser to sign in, then call this tool again.",
    }


@mcp.custom_route("/callback", methods=["GET"])
async def oauth_callback(request: Request) -> HTMLResponse:
    code = request.query_params.get("code")
    session_id = request.query_params.get("state")
    if not code or not session_id:
        return HTMLResponse("Missing code or state.", status_code=400)
    await exchange_code(session_id, code)
    return HTMLResponse("<h2>Authentication successful! You can close this window.</h2>")


@mcp.tool()
async def list_buckets(ctx: Context) -> list[dict] | dict:
    """List all OSS buckets accessible to the authenticated user."""
    token = await get_access_token(ctx.session_id)
    if not token:
        return _auth_required(ctx.session_id)
    return await list_oss_buckets(token)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
```

### .NET

```csharp
// Program.cs — after app.Build()
app.MapGet("/callback", async (string code, string state, ApsThreeLeggedAuthService authService) =>
{
    await authService.ExchangeCodeAsync(state, code);
    return Results.Content("<h2>Authentication successful! You can close this window.</h2>", "text/html");
});
```

```csharp
[McpServerToolType]
public class OssTools(ApsThreeLeggedAuthService authService)
{
    [McpServerTool]
    [Description("List OSS buckets accessible to the authenticated user.")]
    public async Task<string> ListBuckets(IMcpServer server)
    {
        var sessionId = server.ClientInfo?.Name; // or however session ID is surfaced
        var token = await authService.GetAccessTokenAsync(sessionId ?? "");
        if (token is null)
        {
            var authUrl = authService.BuildAuthUrl(sessionId ?? "");
            return $$$"""{"auth_required":true,"auth_url":"{{{authUrl}}}","message":"Open auth_url in a browser, then call this tool again."}""";
        }
        // ... use token
        return "...";
    }
}
```
