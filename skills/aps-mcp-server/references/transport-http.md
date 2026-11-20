# Transport: Streamable HTTP

The server runs as a persistent HTTP service. MCP clients connect over HTTP.
Mount the MCP endpoint at `/mcp` by convention.

**When to use:** Cloud deployment, multi-user servers, web-based MCP clients,
any scenario where the server runs independently of the client process.

**Characteristics:**

- Multiple clients can connect simultaneously
- Requires a publicly accessible URL for remote use
- Stateless: each request stands alone, with no MCP session

## Stateless by default

The MCP `2026-07-28` protocol revision removed sessions (the `Mcp-Session-Id` header, SEP-2567)
and the `initialize` handshake (SEP-2575) from Streamable HTTP. Serve every APS MCP server
statelessly, whatever the auth pattern:

| Auth pattern | Per-user state | How the server knows the user |
| ------------ | -------------- | ----------------------------- |
| **2-legged OAuth, SSA** | None; one app-wide APS token | It doesn't need to |
| **3-legged OAuth** | APS tokens per MCP user | MCP authorization: the validated access token's `sub` (see `auth.md`) |

Don't keep per-user data under a session ID. Stateless servers don't have one, and FastMCP's
`ctx.session_id` changes on every `2026-07-28` request. Clients on older revisions that still send
`initialize` keep working, and nothing in these patterns depends on whether they get a session.

## Node.js

`createMcpHandler` from `@modelcontextprotocol/server` serves the endpoint statelessly, and
`toNodeHandler` adapts it to Express. There's no transport object, session map, or
`sessionIdGenerator` to manage.

```typescript
// src/index.ts
import "dotenv/config";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMcpServer } from "./server.js";

const options = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
};

const host = process.env.HOST ?? "127.0.0.1";
const app = createMcpExpressApp({ host, allowedHosts: process.env.ALLOWED_HOSTS?.split(",") });

const mcpHandler = toNodeHandler(createMcpHandler(() => createMcpServer(options)));
app.all("/mcp", (req, res) => void mcpHandler(req, res, req.body));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, host, () => console.log(`APS MCP server listening on http://${host}:${port}/mcp`));
```

`createMcpExpressApp` applies `express.json()` and DNS rebinding protection. It only protects
localhost binds automatically: when `HOST=0.0.0.0`, set `ALLOWED_HOSTS` to the public hostnames.
Older clients that send `initialize` are answered per request from the same factory; pass
`{ legacy: "reject" }` as the second argument of `createMcpHandler` to serve `2026-07-28` only.

For 3-legged OAuth, keep this setup and put `requireBearerAuth` in front of `/mcp` (see
`auth.md`).

## Python

FastMCP 4 serves `2026-07-28` requests statelessly. Pass `stateless_http=True` so clients on
older revisions that send `initialize` don't get a server-side session either. For 3-legged
OAuth, pass `auth=` to `FastMCP(...)` (see `auth.md`); the transport setup doesn't change.

```python
# src/aps_mcp_server/server.py
import os

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    mcp.run(transport="http", host="0.0.0.0", port=port, stateless_http=True)
```

Or run via the FastMCP CLI without changing `server.py`:

```bash
uv run fastmcp run src/aps_mcp_server/server.py:mcp \
  --transport http --port 5000 --stateless
```

FastMCP's `Host`/`Origin` validation is opt-in. Behind a public hostname, add
`host_origin_protection=True, allowed_hosts=["your-server.example.com"]` to `mcp.run(...)`.

## .NET

Requires `Microsoft.AspNetCore.App` framework reference in the `.csproj`:

```xml
<ItemGroup>
  <FrameworkReference Include="Microsoft.AspNetCore.App" />
</ItemGroup>
```

Stateless is the SDK default; set it explicitly so a future default change doesn't alter the
server. Don't switch to `HttpServerSessionMode.Stateful` for 3-legged OAuth: a stateful server
refuses `2026-07-28` requests and forces those clients back to `initialize`. Add authentication
instead (see `auth.md`).

```csharp
// Program.cs
using ModelContextProtocol.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<ApsAuthService>();
builder.Services.AddHttpClient<ApsOssClient>();

builder.Services
    .AddMcpServer()
    .WithHttpTransport(o => o.SessionMode = HttpServerSessionMode.Stateless)
    .WithToolsFromAssembly();

var app = builder.Build();
app.MapMcp("/mcp");
app.Run($"http://0.0.0.0:{builder.Configuration["PORT"] ?? "3000"}");
```

## Environment Variables

```dotenv
PORT=5000
# Node.js: bind address, and the public hostnames to accept when binding to 0.0.0.0
HOST=0.0.0.0
ALLOWED_HOSTS=your-server.example.com
# 3LO only — must be the externally accessible base URL:
PUBLIC_ENDPOINT_URL=https://your-server.example.com
APS_CALLBACK_URL=https://your-server.example.com/callback
MCP_AUTH_ISSUER=https://your-idp.example.com
MCP_AUTH_JWKS_URI=https://your-idp.example.com/.well-known/jwks.json
```

## Testing

See [`testing.md`](testing.md) for MCP Inspector usage and language-specific test harnesses.

## Deployment Checklist

- [ ] Set `PORT` and (for 3LO) `PUBLIC_ENDPOINT_URL`, `APS_CALLBACK_URL`, `MCP_AUTH_ISSUER`, and `MCP_AUTH_JWKS_URI`
- [ ] Add `/callback` to APS portal allowed redirect URIs (3LO only)
- [ ] Register the MCP server with the IdP so access tokens carry `${PUBLIC_ENDPOINT_URL}/mcp` as the audience (3LO only)
- [ ] Use a shared store for APS tokens and pending sign-ins when running several instances (3LO only)
- [ ] Ensure `/mcp` is publicly accessible (Node.js: `HOST=0.0.0.0` with `ALLOWED_HOSTS` set)
- [ ] For 2LO and SSA, consider MCP authorization or another gate (API key header, mTLS) if the endpoint should not be open to the public internet

## Docker Example (Node.js)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
ENV PORT=5000 HOST=0.0.0.0
# Set ALLOWED_HOSTS to the public hostname at deploy time
EXPOSE 5000
CMD ["node", "dist/index.js"]
```
