# Node.js Test Harness

Uses [Vitest](https://vitest.dev/) (ESM-native, no config needed) and the MCP
SDK's `InMemoryTransport` to test the server in-process without a real HTTP
server or APS credentials.

## Install

```bash
npm install -D vitest
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
import { describe, it, expect, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
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

async function createTestClient() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer({ clientId: "test-id", clientSecret: "test-secret" });
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);

  return { client, server };
}

describe("APS MCP Server", () => {
  it("exposes expected tools", async () => {
    const { client, server } = await createTestClient();
    const { tools } = await client.listTools();

    const names = tools.map((t) => t.name);
    expect(names).toContain("list-buckets");
    expect(names).toContain("list-objects");

    await client.close();
    await server.close();
  });

  it("list-buckets returns bucket data", async () => {
    const { client, server } = await createTestClient();
    const result = await client.callTool({ name: "list-buckets", arguments: {} });

    expect(result.isError).toBeFalsy();
    expect((result.structuredContent as any).buckets).toHaveLength(1);
    expect((result.structuredContent as any).buckets[0].bucketKey).toBe("my-bucket");

    await client.close();
    await server.close();
  });

  it("list-objects requires bucketKey", async () => {
    const { client, server } = await createTestClient();
    await expect(
      client.callTool({ name: "list-objects", arguments: {} })
    ).rejects.toThrow();

    await client.close();
    await server.close();
  });

  it("list-objects returns object data", async () => {
    const { client, server } = await createTestClient();
    const result = await client.callTool({
      name: "list-objects",
      arguments: { bucketKey: "my-bucket" },
    });

    expect(result.isError).toBeFalsy();
    expect((result.structuredContent as any).objects[0].objectKey).toBe("drawing.rvt");

    await client.close();
    await server.close();
  });
});
```

## Run

```bash
npm test
```
