# Testing APS MCP Servers

Always scaffold a test harness alongside the server. Tests should cover two
layers independently:

1. **Unit tests** — tool logic with APS API calls mocked. Fast, no credentials needed.
2. **Inspector smoke test** — run the real server and exercise tools manually via MCP Inspector.

---

## MCP Inspector

MCP Inspector is the official interactive debugger for MCP servers. It lets you
browse tools, call them with custom arguments, and inspect raw protocol messages.

### HTTP transport

```bash
npx @modelcontextprotocol/inspector http://localhost:5000/mcp
```

Start your server first, then run the command. The Inspector opens a web UI at
`http://localhost:5173`.

### STDIO transport

Pass the server launch command directly — Inspector spawns it as a child process:

```bash
# Node.js
npx @modelcontextprotocol/inspector node dist/index.js

# Python
npx @modelcontextprotocol/inspector \
  uv run --directory . python -m aps_mcp_server.server

# .NET
npx @modelcontextprotocol/inspector \
  dotnet run --project ApsMcpServer.csproj
```

### What to verify in Inspector

- [ ] All expected tools appear in the **Tools** tab
- [ ] Tool descriptions and input schemas are accurate
- [ ] Calling `list-buckets` (or equivalent) returns data or a clear error
- [ ] Auth errors surface as readable messages, not raw stack traces
- [ ] For 3LO: unauthenticated tool call returns `auth_required` + `auth_url`

---

## Test Harness

Load the language-specific test harness file:

- **Node.js** → read [`references/testing-nodejs.md`](testing-nodejs.md)
- **Python** → read [`references/testing-python.md`](testing-python.md)
- **.NET** → read [`references/testing-dotnet.md`](testing-dotnet.md)
