# Agent Skills for Autodesk Platform Services

A collection of reusable AI agent skills for [Autodesk Platform Services](https://aps.autodesk.com). Each skill is a self-contained instruction set that teaches a coding agent how to perform a specific APS-related task.

## Available Skills

| Skill | Description |
| ----- | ----------- |
| [`aps-mcp-server-gen`](skills/aps-mcp-server-gen/SKILL.md) | Scaffold a custom MCP (Model Context Protocol) server that integrates with APS. Supports Node.js/TypeScript, .NET/C#, and Python. |

## Installation

Each skill is a folder inside [`skills/`](skills/) containing a `SKILL.md` file and optional supporting reference documents. To install a skill, use the [skills](https://www.npmjs.com/package/skills) utility, for example:

```bash
# Add all skills globally
npx skills add -g autodesk-platform-services/skills

# Add a single skill to current project, for a specific agent
npx skills add autodesk-platform-services/skills --skill aps-mcp-server-gen --agent claude-code
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE) for details.
