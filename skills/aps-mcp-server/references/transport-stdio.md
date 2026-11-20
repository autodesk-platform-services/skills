# Transport: STDIO

The MCP client launches the server as a child process and communicates over
stdin/stdout. No network port required.

**When to use:** Local development, desktop clients (Claude Desktop, Cursor,
VS Code Copilot), single-user scenarios.

**Characteristics:**

- Server lifetime tied to the MCP client process
- One client per server process
- Simplest security model (no network exposure)
- Logs **must** go to **stderr**, never stdout (stdout is reserved for MCP messages)
- The client owns the process, so there's no multi-user state to manage

## Node.js

```typescript
// src/index.ts
import "dotenv/config";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createMcpServer } from "./server.js";

const options = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
};

serveStdio(() => createMcpServer(options)); // runs until stdin closes
console.error("APS MCP server running on stdio");
```

`serveStdio` negotiates the protocol revision with the client: `2026-07-28` clients probe with
`server/discover`, and older clients still get their `initialize` handshake.

## Python

```python
# src/aps_mcp_server/server.py
if __name__ == "__main__":
    mcp.run()  # defaults to STDIO
    # or explicitly: mcp.run(transport="stdio")
```

FastMCP 4 answers both `2026-07-28` clients and older clients that send `initialize`.

Run:

```bash
uv run python -m aps_mcp_server.server
```

## .NET

```csharp
// Program.cs
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();
```

Ensure logs go to stderr so they don't corrupt the MCP stream:

```csharp
builder.Logging.AddConsole(options =>
    options.LogToStandardErrorThreshold = LogLevel.Trace);
```

## Claude Desktop Config

Config file locations:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

**Node.js:**

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

**Python (via uv):**

```json
{
  "mcpServers": {
    "aps-mcp-server": {
      "command": "uv",
      "args": [
        "run", "--directory", "/absolute/path/to/aps-mcp-server",
        "python", "-m", "aps_mcp_server.server"
      ],
      "env": {
        "APS_CLIENT_ID": "your-client-id",
        "APS_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**.NET:**

```json
{
  "mcpServers": {
    "aps-mcp-server": {
      "command": "dotnet",
      "args": ["run", "--project", "/absolute/path/to/ApsMcpServer/ApsMcpServer.csproj"],
      "env": {
        "APS_CLIENT_ID": "your-client-id",
        "APS_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Testing

See [`testing.md`](testing.md) for MCP Inspector usage and language-specific test harnesses.
