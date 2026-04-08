# Transport: STDIO

The MCP client launches the server as a child process and communicates over
stdin/stdout. No network port required.

**When to use:** Local development, desktop clients (Claude Desktop, Cursor,
VS Code Copilot), single-user scenarios.

**Characteristics:**

- Server lifetime tied to the MCP client session
- Single session by design — one client at a time
- Simplest security model (no network exposure)
- Logs **must** go to **stderr**, never stdout (stdout is reserved for MCP messages)
- STDIO servers are inherently single-session — stateful vs. stateless is not applicable

## Node.js

```typescript
// src/index.ts
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
  // Server runs until stdin closes
}

main().catch((err) => { console.error(err); process.exit(1); });
```

## Python

```python
# src/aps_mcp_server/server.py
if __name__ == "__main__":
    mcp.run()  # defaults to STDIO
    # or explicitly: mcp.run(transport="stdio")
```

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
