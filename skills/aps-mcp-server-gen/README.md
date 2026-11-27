# APS MCP Server Generator Skill

Scaffold a custom MCP (Model Context Protocol) server that integrates with Autodesk Platform Services (APS). Supports Node.js/TypeScript, .NET/C#, and Python; STDIO (local) and Streamable HTTP (cloud) transports; and 2-legged OAuth, Secure Service Accounts, and 3-legged OAuth authentication.

## Requirements

- Node.js 20+, .NET 9+, or Python 3.11+ (depending on the target language)
- Internet access for package installation

## Installation

Recommended (project-level):

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-mcp-server-gen
```
