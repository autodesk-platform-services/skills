# Node.js Test Harness

Uses [Vitest](https://vitest.dev/) (ESM-native, no config needed) and a real
MCP `Client` from `@modelcontextprotocol/client`. The client's transport calls
the server's `createMcpHandler` in-process through its `fetch` option, so tests
need no port, no running server, and no APS credentials, and they exercise the
same `2026-07-28` request path as production.

## Install

```bash
npm install -D vitest @modelcontextprotocol/client
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

## Test file

```typescript
// test/server.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMcpServer } from "../src/server.js";

// Mock APS API calls so tests run without real credentials
vi.mock("../src/auth.js", () => ({
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("../src/aps/oss.js", () => ({
  listBuckets: vi.fn().mockResolvedValue([
    { bucketKey: "my-bucket", bucketOwner: "test-app" },
  ]),
  listObjects: vi.fn().mockResolvedValue([
    { objectKey: "drawing.rvt", size: 1024000, objectId: "urn:abc123" },
  ]),
}));

let client: Client | undefined;

async function createTestClient(): Promise<Client> {
  const handler = createMcpHandler(() =>
    createMcpServer({ clientId: "test-id", clientSecret: "test-secret" })
  );
  // The URL is never dialed: handler.fetch serves every request in-process
  const transport = new StreamableHTTPClientTransport(new URL("http://test.local/mcp"), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  client = new Client(
    { name: "test-client", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } }
  );
  await client.connect(transport);
  return client;
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

describe("APS MCP Server", () => {
  it("speaks MCP 2026-07-28", async () => {
    const client = await createTestClient();
    expect(client.getProtocolEra()).toBe("modern");
  });

  it("exposes expected tools", async () => {
    const client = await createTestClient();
    const { tools } = await client.listTools();

    const names = tools.map((t) => t.name);
    expect(names).toContain("list-buckets");
    expect(names).toContain("list-objects");
  });

  it("list-buckets returns bucket data", async () => {
    const client = await createTestClient();
    const result = await client.callTool({ name: "list-buckets", arguments: {} });

    expect(result.isError).toBeFalsy();
    expect((result.structuredContent as any).buckets).toHaveLength(1);
    expect((result.structuredContent as any).buckets[0].bucketKey).toBe("my-bucket");
  });

  it("list-objects requires bucketKey", async () => {
    const client = await createTestClient();
    // Invalid arguments come back as a tool error result, not a thrown error
    const result = await client.callTool({ name: "list-objects", arguments: {} });
    expect(result.isError).toBe(true);
  });

  it("list-objects returns object data", async () => {
    const client = await createTestClient();
    const result = await client.callTool({
      name: "list-objects",
      arguments: { bucketKey: "my-bucket" },
    });

    expect(result.isError).toBeFalsy();
    expect((result.structuredContent as any).objects[0].objectKey).toBe("drawing.rvt");
  });
});
```

## Run

```bash
npm test
```
