# Node.js / TypeScript APS MCP Server Reference

## Package Versions

- `@modelcontextprotocol/sdk` — latest (≥1.12.0)
- `zod` — latest
- `express` — latest (HTTP transport only)
- `dotenv` — latest
- `jsonwebtoken` — latest (SSA auth only)
- `jwks-rsa` — latest (SSA auth only)
- `axios` or `node-fetch` — for APS API calls

## Project Initialisation

```bash
mkdir aps-mcp-server && cd aps-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod dotenv
# HTTP transport:
npm install express
# SSA auth:
npm install jsonwebtoken
# Dev deps:
npm install -D typescript @types/node @types/express ts-node
npx tsc --init
```

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
    "dev": "ts-node --esm src/index.ts"
  }
}
```

## Server Factory Pattern

Always use a factory function that accepts options (credentials, config) and
returns an `McpServer` instance. This keeps the server testable and supports
stateless HTTP where a new instance is created per request.

```typescript
// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOssTools } from "./tools/oss.js";

export interface ServerOptions {
  clientId: string;
  clientSecret: string;
  // Add SSA or per-request token fields here as needed
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

Use the factory + Zod schema pattern. Group related tools in one file.
Export a `register*Tools` function per group.

```typescript
// src/tools/oss.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { ServerOptions } from "../server.js";
import { getAccessToken } from "../auth.js";
import { listBuckets, listObjects, getBucketDetails } from "../aps/oss.js";

export function registerOssTools(server: McpServer, options: ServerOptions) {
  server.tool(
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

  server.tool(
    "list-objects",
    {
      title: "List Objects in Bucket",
      description: "List all objects stored in a specific OSS bucket.",
      annotations: { readOnlyHint: true },
    },
    {
      bucketKey: z
        .string()
        .nonempty()
        .describe("The unique key identifying the OSS bucket."),
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
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const options = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
};

async function main() {
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

## Streamable HTTP Entry Point (Stateless)

Use stateless mode (no `sessionIdGenerator`) unless per-user token tracking
is needed (3-legged OAuth).

```typescript
// src/index.ts  (Streamable HTTP — stateless)
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
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`APS MCP server listening on port ${port}`));
```

## `.env.example`

See [`auth-patterns.md`](auth-patterns.md) for the auth-specific variables to add.

```dotenv
# APS Application credentials (https://aps.autodesk.com/myapps)
APS_CLIENT_ID=
APS_CLIENT_SECRET=

# HTTP transport only
PORT=3000
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

Or with `ts-node` (dev mode):
```json
{
  "mcpServers": {
    "aps-mcp-server": {
      "command": "npx",
      "args": ["ts-node", "--esm", "/absolute/path/to/aps-mcp-server/src/index.ts"]
    }
  }
}
```
