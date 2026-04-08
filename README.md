# Agent Skills for Autodesk Platform Services

A collection of reusable AI agent skills for [Autodesk Platform Services](https://aps.autodesk.com). Each skill is a self-contained instruction set that teaches a coding agent how to perform a specific APS-related task.

## Available Skills

| Skill | Description |
| ----- | ----------- |
| [`aps-mcp-server-gen`](skills/aps-mcp-server-gen/SKILL.md) | Scaffold a custom MCP (Model Context Protocol) server that integrates with APS. Supports Node.js/TypeScript, .NET/C#, and Python. |

## Installation

Skills are installed by copying them into the configuration location used by your coding agent. Each skill is a folder inside [`skills/`](skills/) containing a `SKILL.md` file and supporting reference documents.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE) for details.
