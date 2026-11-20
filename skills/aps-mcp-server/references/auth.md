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
| **3-legged OAuth** | Each MCP user, after they sign in through the browser. | Streamable HTTP with MCP authorization, and a public callback URL |

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

With 3-legged OAuth, the server stores APS tokens per **MCP user**, so it has to know who's
calling. MCP sessions can't tell it: the `2026-07-28` protocol revision removed them, and the
SDKs now serve Streamable HTTP statelessly, so a session ID is missing or changes on every
request. Identify the user with MCP authorization instead:

1. **Protect `/mcp` with MCP authorization.** The MCP server is an OAuth resource server for an
   identity provider (IdP) you choose, such as Microsoft Entra ID, Auth0, Okta, or Keycloak. The
   MCP client signs the user in to that IdP and sends its access token as `Authorization: Bearer`.
   The server validates the token (signature, issuer, expiry, and an audience that names this
   server) and serves the protected resource metadata that tells clients which IdP to use.
2. **Key APS tokens by the token's `sub` claim.** The validated subject is the MCP user ID. Pass
   it as the `key` argument of the `aps-auth` helpers. Never use client-supplied values (tool
   arguments, `clientInfo`, or the MCP client ID), which every user of the same client shares or
   can forge.
3. **Use a random, single-use `state`.** When a tool has no APS token for the user, generate an
   unguessable `state`, store `state → user ID` on the server with a short expiry, and return an
   `auth_required` reply with the authorization URL. Don't put the user ID itself in `state`.
4. **Serve a `/callback` route** next to `/mcp`, without MCP authorization (the browser doesn't
   have the bearer token). It takes the pending entry for `state` (and deletes it), rejects
   unknown or expired values, exchanges the code under that user ID, and shows a "you can close
   this window" page. The user then calls the tool again.

The IdP access token only authorizes calls to the MCP server. It's not an APS token, and the
server never sends it to APS (no token passthrough). APS tokens never leave the server.

This works in stateless mode, so use the default stateless Streamable HTTP setup from
`transport-http.md`. Clients on older revisions that still use `initialize` and `Mcp-Session-Id`
work too, because nothing depends on the session.

> [!IMPORTANT]
> An `auth_url` is a link anyone can open. If a user forwards it and someone else signs in, that
> person's APS tokens get stored under the first user's ID. The MCP spec requires the server to
> confirm that the user who completes the flow is the user who started it. On a server shared by
> several people, make `auth_url` point to a `/connect` page on the MCP server that signs the
> browser in to the same IdP, checks that its `sub` matches the pending entry, and only then
> redirects to the APS authorization URL.

Add these env vars to `.env.example`, next to the `aps-auth` ones:

```dotenv
# MCP authorization (the IdP that signs users in to the MCP server)
MCP_AUTH_ISSUER=https://your-idp.example.com
MCP_AUTH_JWKS_URI=https://your-idp.example.com/.well-known/jwks.json
# Externally reachable base URL; the token audience must be ${PUBLIC_ENDPOINT_URL}/mcp
PUBLIC_ENDPOINT_URL=https://your-server.example.com
```

Check which audience the IdP puts in access tokens for the MCP server, and use that value if it
differs.

### Node.js

Install `jose` to validate the IdP's JWTs. `requireBearerAuth` puts the verified `AuthInfo` on
`req.auth`, `toNodeHandler` forwards it, and tool handlers read it as `ctx.http?.authInfo`.
`AuthInfo` has no subject field, so the verifier stores `sub` in `extra`.

```typescript
// src/index.ts — stateless Streamable HTTP with MCP authorization
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  createMcpExpressApp,
  getOAuthProtectedResourceMetadataUrl,
  requireBearerAuth,
} from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, type AuthInfo } from "@modelcontextprotocol/server";
import { createMcpServer, type ServerOptions } from "./server.js";
import { exchangeCode } from "./auth.js";
import { takeSignIn } from "./signin.js";

const issuer = process.env.MCP_AUTH_ISSUER!;
const mcpUrl = new URL("/mcp", process.env.PUBLIC_ENDPOINT_URL!);
const jwks = createRemoteJWKSet(new URL(process.env.MCP_AUTH_JWKS_URI!));

const options: ServerOptions = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
  callbackUrl: process.env.APS_CALLBACK_URL!,
};

const auth = requireBearerAuth({
  verifier: {
    async verifyAccessToken(token): Promise<AuthInfo> {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience: mcpUrl.href });
      return {
        token,
        clientId: String(payload.azp ?? payload.client_id ?? ""),
        scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
        expiresAt: payload.exp,
        extra: { sub: payload.sub },
      };
    },
  },
  resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpUrl),
});

const host = process.env.HOST ?? "127.0.0.1";
const app = createMcpExpressApp({ host, allowedHosts: process.env.ALLOWED_HOSTS?.split(",") });

// RFC 9728 protected resource metadata: tells MCP clients which IdP to sign in with
app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
  res.json({ resource: mcpUrl.href, authorization_servers: [issuer] });
});

const mcpHandler = toNodeHandler(createMcpHandler(() => createMcpServer(options)));
app.all("/mcp", auth, (req, res) => void mcpHandler(req, res, req.body));

app.get("/callback", async (req, res) => {
  const { code, state } = req.query as Record<string, string | undefined>;
  const userId = state ? takeSignIn(state) : undefined;
  if (!code || !userId) {
    res.status(400).send("Invalid or expired sign-in link. Call the tool again to get a new one.");
    return;
  }
  await exchangeCode(options, userId, code);
  res.send("<h2>Authentication successful! You can close this window.</h2>");
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, host, () => console.log(`APS MCP server listening on http://${host}:${port}/mcp`));
```

The token check is in the verifier (`jwtVerify` with `issuer` and `audience`). Don't rely on the
`expectedResource` option of `requireBearerAuth` for it: `@modelcontextprotocol/express` 2.0.x
doesn't pass it on.

```typescript
// src/signin.ts — pending sign-ins: state -> MCP user ID.
// Use a shared store (for example Redis) when running several instances.
import { randomBytes } from "node:crypto";

const pending = new Map<string, { userId: string; expiresAt: number }>();

export function startSignIn(userId: string): string {
  const state = randomBytes(32).toString("base64url");
  pending.set(state, { userId, expiresAt: Date.now() + 10 * 60_000 });
  return state;
}

// Single use: returns the user ID for a known, unexpired state, and forgets it.
export function takeSignIn(state: string): string | undefined {
  const entry = pending.get(state);
  pending.delete(state);
  return entry && entry.expiresAt > Date.now() ? entry.userId : undefined;
}
```

```typescript
// src/tools/oss.ts — the user ID comes from the verified token
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { ServerOptions } from "../server.js";
import { buildAuthUrl, getAccessToken } from "../auth.js";
import { startSignIn } from "../signin.js";
import { listObjects } from "../aps/oss.js";

export function registerOssTools(server: McpServer, options: ServerOptions) {
  server.registerTool(
    "list-objects",
    {
      title: "List Objects in Bucket",
      description: "List objects in an OSS bucket the signed-in user can access.",
      inputSchema: z.object({ bucketKey: z.string().min(1).describe("The OSS bucket key.") }),
    },
    async ({ bucketKey }, ctx) => {
      const userId = ctx.http?.authInfo?.extra?.sub;
      if (typeof userId !== "string") throw new Error("This tool requires MCP authorization.");
      const token = await getAccessToken(options, userId);
      if (!token) {
        return {
          content: [{ type: "text", text: "Authentication required." }],
          structuredContent: {
            auth_required: true,
            auth_url: buildAuthUrl(options, startSignIn(userId)),
            message: "Open auth_url in a browser to sign in, then call this tool again.",
          },
        };
      }
      const objects = await listObjects(token, bucketKey);
      return {
        content: [{ type: "text", text: `Found ${objects.length} object(s).` }],
        structuredContent: { objects },
      };
    }
  );
}
```

### Python

FastMCP validates the IdP's tokens with `JWTVerifier`, and `RemoteAuthProvider` serves the
protected resource metadata. Tools read the validated token with `get_access_token()`; its
`claims` hold the JWT payload, including `sub`. Name the APS helper import differently so it
doesn't clash.

```python
# src/aps_mcp_server/server.py
import os
import secrets
import time

from fastmcp import FastMCP
from fastmcp.server.auth import RemoteAuthProvider
from fastmcp.server.auth.providers.jwt import JWTVerifier
from fastmcp.server.dependencies import get_access_token as get_mcp_access_token
from pydantic import AnyHttpUrl
from starlette.requests import Request
from starlette.responses import HTMLResponse

from .auth import build_auth_url, exchange_code, get_access_token
from .aps.oss import list_oss_buckets

PUBLIC_ENDPOINT_URL = os.environ["PUBLIC_ENDPOINT_URL"].rstrip("/")
MCP_AUTH_ISSUER = os.environ["MCP_AUTH_ISSUER"]

auth = RemoteAuthProvider(
    token_verifier=JWTVerifier(
        jwks_uri=os.environ["MCP_AUTH_JWKS_URI"],
        issuer=MCP_AUTH_ISSUER,
        audience=f"{PUBLIC_ENDPOINT_URL}/mcp",
    ),
    authorization_servers=[AnyHttpUrl(MCP_AUTH_ISSUER)],
    base_url=PUBLIC_ENDPOINT_URL,
)
mcp = FastMCP("APS MCP Server", auth=auth)

# Pending sign-ins: state -> (MCP user ID, expiry). Use a shared store when running several instances.
_pending: dict[str, tuple[str, float]] = {}


def _current_user_id() -> str:
    token = get_mcp_access_token()
    if token is None or not token.claims.get("sub"):
        raise RuntimeError("This tool requires MCP authorization.")
    return token.claims["sub"]


def _auth_required(user_id: str) -> dict:
    state = secrets.token_urlsafe(32)
    _pending[state] = (user_id, time.time() + 600)
    return {
        "auth_required": True,
        "auth_url": build_auth_url(state),
        "message": "Open auth_url in a browser to sign in, then call this tool again.",
    }


@mcp.custom_route("/callback", methods=["GET"])
async def oauth_callback(request: Request) -> HTMLResponse:
    code = request.query_params.get("code")
    pending = _pending.pop(request.query_params.get("state", ""), None)
    if not code or not pending or pending[1] < time.time():
        return HTMLResponse("Invalid or expired sign-in link. Call the tool again.", status_code=400)
    await exchange_code(pending[0], code)
    return HTMLResponse("<h2>Authentication successful! You can close this window.</h2>")


@mcp.tool()
async def list_buckets() -> list[dict] | dict:
    """List all OSS buckets accessible to the signed-in user."""
    user_id = _current_user_id()
    token = await get_access_token(user_id)
    if not token:
        return _auth_required(user_id)
    return await list_oss_buckets(token)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    mcp.run(transport="http", host="0.0.0.0", port=port, stateless_http=True)
```

Don't key tokens by `ctx.session_id`. On `2026-07-28` connections FastMCP generates a new one
for every request.

### .NET

Add the `Microsoft.AspNetCore.Authentication.JwtBearer` package, with the same major version as
the target framework (for example 9.x for `net9.0`). `AddJwtBearer` validates the
IdP's tokens, `AddMcp` serves the protected resource metadata and the `WWW-Authenticate`
challenge, and the SDK injects the authenticated `ClaimsPrincipal` into tool methods. Keep the
session mode stateless; `McpServer.SessionId` is `null` there, and tokens don't depend on it.

```csharp
// Program.cs
using System.Collections.Concurrent;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using ModelContextProtocol.AspNetCore;
using ModelContextProtocol.AspNetCore.Authentication;

var builder = WebApplication.CreateBuilder(args);
var issuer = builder.Configuration["MCP_AUTH_ISSUER"]!;
var mcpUrl = $"{builder.Configuration["PUBLIC_ENDPOINT_URL"]!.TrimEnd('/')}/mcp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultChallengeScheme = McpAuthenticationDefaults.AuthenticationScheme;
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Authority = issuer;     // discovers the signing keys
    options.Audience = mcpUrl;
    options.MapInboundClaims = false; // keep "sub" as "sub"
})
.AddMcp(options =>
{
    options.ResourceMetadata = new() { Resource = mcpUrl, AuthorizationServers = { issuer } };
});
builder.Services.AddAuthorization();

builder.Services.AddHttpClient();
builder.Services.AddSingleton<ApsThreeLeggedAuthService>();
builder.Services.AddSingleton<PendingSignIns>();
builder.Services
    .AddMcpServer()
    .WithHttpTransport(o => o.SessionMode = HttpServerSessionMode.Stateless)
    .WithToolsFromAssembly();

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.MapMcp("/mcp").RequireAuthorization();

app.MapGet("/callback", async (string? code, string? state,
    PendingSignIns pending, ApsThreeLeggedAuthService authService) =>
{
    if (code is null || state is null || pending.Take(state) is not { } userId)
        return Results.BadRequest("Invalid or expired sign-in link. Call the tool again.");
    await authService.ExchangeCodeAsync(userId, code);
    return Results.Content("<h2>Authentication successful! You can close this window.</h2>", "text/html");
});

app.Run($"http://0.0.0.0:{builder.Configuration["PORT"] ?? "3000"}");

// Pending sign-ins: state -> MCP user ID. Use a shared store when running several instances.
public class PendingSignIns
{
    private readonly ConcurrentDictionary<string, (string UserId, DateTime ExpiresAt)> _pending = new();

    public string Start(string userId)
    {
        var state = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _pending[state] = (userId, DateTime.UtcNow.AddMinutes(10));
        return state;
    }

    public string? Take(string state) =>
        _pending.TryRemove(state, out var entry) && entry.ExpiresAt > DateTime.UtcNow ? entry.UserId : null;
}
```

```csharp
// Tools/OssTools.cs
using System.ComponentModel;
using System.Security.Claims;
using System.Text.Json;
using ModelContextProtocol.Server;

[McpServerToolType]
public class OssTools(ApsThreeLeggedAuthService authService, PendingSignIns pending, ApsOssClient ossClient)
{
    [McpServerTool]
    [Description("List OSS buckets accessible to the signed-in user.")]
    public async Task<string> ListBuckets(ClaimsPrincipal? user)
    {
        var userId = user?.FindFirstValue("sub")
            ?? throw new InvalidOperationException("This tool requires MCP authorization.");

        var token = await authService.GetAccessTokenAsync(userId);
        if (token is null)
        {
            return JsonSerializer.Serialize(new
            {
                auth_required = true,
                auth_url = authService.BuildAuthUrl(pending.Start(userId)),
                message = "Open auth_url in a browser to sign in, then call this tool again.",
            });
        }
        // ... call APS with token, for example through ossClient
        return "...";
    }
}
```

The `ClaimsPrincipal` parameter doesn't appear in the tool's input schema. Never key tokens by
`McpServer.ClientInfo` (the client app's name and version) or `McpServer.SessionId`.

### Optional: URL-mode elicitation

Clients on `2026-07-28` that declare URL-mode elicitation (`"elicitation": { "url": {} }`) can
open the sign-in page for the user. Instead
of the `auth_required` reply, the tool returns an `InputRequiredResult` with an
`elicitation/create` request in `mode: "url"`, and the client retries the call after the user
finishes. The same rules apply: bind the request to the `sub` of the MCP token, and confirm in
the browser that the same user completes the flow. Keep the `auth_required` reply for clients
that don't declare it.
