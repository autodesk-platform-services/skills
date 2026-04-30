# Agent Skills for Autodesk Platform Services

A collection of reusable AI agent skills for [Autodesk Platform Services](https://aps.autodesk.com). Each skill is a self-contained instruction set that teaches a coding agent how to perform a specific APS-related task.

https://github.com/user-attachments/assets/7126310c-4ef6-4b21-9b29-a702dfc0a16d

## Installation

Each skill is a folder inside [`skills/`](skills/) containing a `SKILL.md` file and optional supporting reference documents.

### Manual installation

Clone this repository and copy the skill folder to wherever your AI agent looks for skills. For example, for Claude Code:

```bash
git clone https://github.com/autodesk-platform-services/skills.git
cp -r skills/aps-mcp-server-gen ~/.claude/skills/
```

### Automated installation

Use the [skills](https://www.npmjs.com/package/skills) utility to install and manage skills globally or per project:

```bash
# Install all skills globally
npx skills add --global autodesk-platform-services/skills

# ... or ...

# Install a selected skill in the current project
npx skills add --project autodesk-platform-services/skills --skill aps-mcp-server-gen
```

## Available Skills

| Skill | Description |
| ----- | ----------- |
| [`aps-mcp-server-gen`](skills/aps-mcp-server-gen/SKILL.md) | Scaffold a custom MCP (Model Context Protocol) server that integrates with APS. Supports Node.js/TypeScript, .NET/C#, and Python. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE) for details.
