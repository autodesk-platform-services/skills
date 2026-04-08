# Transport: Streamable HTTP

The server runs as a persistent HTTP service. MCP clients connect over HTTP.
Mount the MCP endpoint at `/mcp` by convention.

**When to use:** Cloud deployment, multi-user servers, web-based MCP clients,
any scenario where the server runs independently of the client process.

**Characteristics:**

- Multiple clients can connect simultaneously
- Requires a publicly accessible URL for remote use
- Supports stateless (default) and stateful (session) modes

## Stateless vs. Stateful

| Mode | Session ID | When to use |
| ---- | ---------- | ----------- |
| **Stateless** | `undefined` / omitted | 2LO and SSA auth — token is app-wide, no per-user state needed |
| **Stateful** | UUID per connection | 3-legged OAuth — must track tokens per user session |

Default to stateless. Only use stateful when 3-legged OAuth is chosen.

## Node.js — Stateless

```typescript
// src/index.ts
import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";

const app = express();
app.use(express.json());

const options = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
};

app.all("/mcp", async (req, res) => {
  const server = createMcpServer(options);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — no sessions
  });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`APS MCP server listening on port ${port}`));
```

## Node.js — Stateful (3LO only)

```typescript
// src/index.ts  (stateful, for 3-legged OAuth)
import "dotenv/config";
import express from "express";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";

const app = express();
app.use(express.json());

const options = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
  callbackUrl: process.env.APS_CALLBACK_URL!,
};

const sessionTransports = new Map<string, StreamableHTTPServerTransport>();

app.all("/mcp", async (req, res) => {
  const existingId = req.headers["mcp-session-id"] as string | undefined;
  if (existingId && sessionTransports.has(existingId)) {
    await sessionTransports.get(existingId)!.handleRequest(req, res, req.body);
    return;
  }
  const server = createMcpServer(options);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  transport.onSessionInitialized = (id) => sessionTransports.set(id, transport);
  res.on("close", () => {
    if (transport.sessionId) sessionTransports.delete(transport.sessionId);
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`APS MCP server listening on port ${port}`));
```

## Python

FastMCP handles stateful sessions automatically when tools declare a `Context`
parameter — no transport-level configuration needed.

```python
# src/aps_mcp_server/server.py
import os

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
```

Or run via the FastMCP CLI without changing `server.py`:

```bash
uv run fastmcp run src/aps_mcp_server/server.py:mcp \
  --transport streamable-http --port 5000
```

## .NET

Requires `Microsoft.AspNetCore.App` framework reference in the `.csproj`:

```xml
<ItemGroup>
  <FrameworkReference Include="Microsoft.AspNetCore.App" />
</ItemGroup>
```

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<ApsAuthService>();
builder.Services.AddHttpClient<ApsOssClient>();

builder.Services
    .AddMcpServer()
    .WithHttpTransport()
    .WithToolsFromAssembly();

var app = builder.Build();
app.MapMcp("/mcp");
app.Run($"http://0.0.0.0:{builder.Configuration["PORT"] ?? "3000"}");
```

## Environment Variables

```dotenv
PORT=5000
# 3LO only — must be the externally accessible base URL:
PUBLIC_ENDPOINT_URL=https://your-server.example.com
APS_CALLBACK_URL=https://your-server.example.com/callback
```

## Testing

See [`testing.md`](testing.md) for MCP Inspector usage and language-specific test harnesses.

## Deployment Checklist

- [ ] Set `PORT` and (for 3LO) `PUBLIC_ENDPOINT_URL` / `APS_CALLBACK_URL`
- [ ] Add `/callback` to APS portal allowed redirect URIs (3LO only)
- [ ] Ensure `/mcp` is publicly accessible
- [ ] Consider Layer 1 auth (API key header, mTLS) if the endpoint should not be open to the public internet

## Docker Example (Node.js)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
ENV PORT=5000
EXPOSE 5000
CMD ["node", "dist/index.js"]
```
