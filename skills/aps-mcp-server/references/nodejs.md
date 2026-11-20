# Node.js / TypeScript APS MCP Server Reference

Use the v2 MCP TypeScript SDK packages. They serve the MCP `2026-07-28` revision (no
`initialize` handshake, no sessions) and still answer older clients that send `initialize`.
The v1 `@modelcontextprotocol/sdk` package only speaks `2025-11-25` and earlier, so don't use it
for new servers.

## Package Versions

- `@modelcontextprotocol/server` — latest (≥2.0; the examples were checked with 2.4)
- `@modelcontextprotocol/express` and `@modelcontextprotocol/node` — latest (HTTP transport only)
- `express` — latest (HTTP transport only)
- `zod` — 4.x (import it as `zod/v4`)
- `dotenv` — latest
- `jsonwebtoken` — latest (SSA auth only)
- `jose` — latest (3-legged OAuth only, to validate MCP access tokens)
- `@modelcontextprotocol/client` and `vitest` — dev dependencies, for tests

Node.js 20 or later has `fetch` built in; no HTTP client package is needed for APS calls.

## Project Initialisation

```bash
mkdir aps-mcp-server && cd aps-mcp-server
npm init -y
npm pkg set type=module
npm install @modelcontextprotocol/server zod dotenv
# HTTP transport:
npm install @modelcontextprotocol/express @modelcontextprotocol/node express
# SSA auth:
npm install jsonwebtoken
# 3-legged OAuth:
npm install jose
# Dev deps:
npm install -D typescript tsx @types/node @types/express @modelcontextprotocol/client vitest
```

The SDK ships ES modules only, so `"type": "module"` is required.

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### `package.json` scripts

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "vitest run"
  }
}
```

## Server Factory Pattern

Always use a factory function that accepts options (credentials, config) and returns an
`McpServer` instance. The SDK's entry points take a factory: `createMcpHandler` builds a fresh
server for every HTTP request, and `serveStdio` builds one for the STDIO connection. Keep
per-user state out of the server instance.

```typescript
// src/server.ts
import { McpServer } from "@modelcontextprotocol/server";
import { registerOssTools } from "./tools/oss.js";

export interface ServerOptions {
  clientId: string;
  clientSecret: string;
  // Add the credential fields of the chosen aps-auth helper (SSA key, callback URL) here
}

export function createMcpServer(options: ServerOptions): McpServer {
  const server = new McpServer({
    name: "APS MCP Server",
    version: "1.0.0",
  });

  registerOssTools(server, options);
  // Register more tool groups here

  return server;
}
```

## Tool Definition Pattern

Register tools with `registerTool(name, config, handler)`. `inputSchema` is a Zod object schema;
the SDK derives the JSON Schema clients see, validates arguments before the handler runs, and
types the handler's arguments. Handlers of tools without `inputSchema` take only the request
context (`ctx`); handlers with one take `(args, ctx)`. Group related tools in one file and export
a `register*Tools` function per group.

```typescript
// src/tools/oss.ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { ServerOptions } from "../server.js";
import { getAccessToken } from "../auth.js";
import { listBuckets, listObjects } from "../aps/oss.js";

export function registerOssTools(server: McpServer, options: ServerOptions) {
  server.registerTool(
    "list-buckets",
    {
      title: "List OSS Buckets",
      description:
        "List all Object Storage Service (OSS) buckets owned by the APS application.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const token = await getAccessToken(options);
      const buckets = await listBuckets(token);
      return {
        structuredContent: { buckets },
        content: [
          {
            type: "text",
            text: `Found ${buckets.length} bucket(s): ${buckets.map((b: any) => b.bucketKey).join(", ")}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "list-objects",
    {
      title: "List Objects in Bucket",
      description: "List all objects stored in a specific OSS bucket.",
      inputSchema: z.object({
        bucketKey: z.string().min(1).describe("The unique key identifying the OSS bucket."),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ bucketKey }) => {
      const token = await getAccessToken(options);
      const objects = await listObjects(token, bucketKey);
      return {
        structuredContent: { objects },
        content: [
          {
            type: "text",
            text: `Found ${objects.length} object(s) in bucket "${bucketKey}".`,
          },
        ],
      };
    }
  );
}
```

Request context, such as the verified MCP access token on HTTP (`ctx.http?.authInfo`), comes
from the `ctx` argument. Don't read the client's identity from `_meta` or tool arguments for
authorization; clients can set those to anything.

## APS API Helpers

```typescript
// src/aps/oss.ts
const APS_BASE_URL = "https://developer.api.autodesk.com";

export async function listBuckets(token: string): Promise<any[]> {
  const res = await fetch(`${APS_BASE_URL}/oss/v2/buckets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`APS error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.items ?? [];
}

export async function listObjects(token: string, bucketKey: string): Promise<any[]> {
  const res = await fetch(
    `${APS_BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`APS error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.items ?? [];
}
```

## STDIO Entry Point

```typescript
// src/index.ts  (STDIO transport)
import "dotenv/config";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createMcpServer } from "./server.js";

const options = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
};

serveStdio(() => createMcpServer(options));
console.error("APS MCP server running on stdio"); // stderr; stdout carries MCP messages
```

## Streamable HTTP Entry Point

`createMcpHandler` serves the endpoint statelessly: every request gets a fresh server from the
factory, with no `Mcp-Session-Id` and no session map. Older clients that open with `initialize`
are served per request too. For 3-legged OAuth, keep this entry point and add MCP authorization
in front of `/mcp` (see [`auth.md`](auth.md)).

```typescript
// src/index.ts  (Streamable HTTP)
import "dotenv/config";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMcpServer } from "./server.js";

const options = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
};

// Binding to 127.0.0.1 turns on DNS rebinding protection. When binding to 0.0.0.0
// (containers, cloud), list the public hostnames in ALLOWED_HOSTS instead.
const host = process.env.HOST ?? "127.0.0.1";
const app = createMcpExpressApp({ host, allowedHosts: process.env.ALLOWED_HOSTS?.split(",") });

const mcpHandler = toNodeHandler(createMcpHandler(() => createMcpServer(options)));
app.all("/mcp", (req, res) => void mcpHandler(req, res, req.body));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, host, () => console.log(`APS MCP server listening on http://${host}:${port}/mcp`));
```

`createMcpExpressApp` is `express()` with `express.json()` and host/origin validation already
applied, so add other routes (such as `/callback`) to `app` as usual.

## `.env.example`

Add the auth-specific variables for the chosen flow from the `aps-auth` skill.

```dotenv
# APS Application credentials (https://aps.autodesk.com/myapps)
APS_CLIENT_ID=
APS_CLIENT_SECRET=

# HTTP transport only
PORT=3000
HOST=127.0.0.1
# Required when HOST=0.0.0.0: comma-separated public hostnames
ALLOWED_HOSTS=
PUBLIC_ENDPOINT_URL=http://localhost:3000
```

## Claude Desktop Config (STDIO)

```json
{
  "mcpServers": {
    "aps-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/aps-mcp-server/dist/index.js"],
      "env": {
        "APS_CLIENT_ID": "your-client-id",
        "APS_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Or with `tsx` (dev mode):
```json
{
  "mcpServers": {
    "aps-mcp-server": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/aps-mcp-server/src/index.ts"]
    }
  }
}
```
