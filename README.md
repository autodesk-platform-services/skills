# Agent Skills for Autodesk Platform Services

A collection of reusable AI agent skills for [Autodesk Platform Services](https://aps.autodesk.com). Each skill is a self-contained instruction set that teaches a coding agent how to perform a specific APS-related task.

## Available Skills

| Skill | Description |
| ----- | ----------- |
| [`aps-mcp-server-gen`](skills/aps-mcp-server-gen/SKILL.md) | Scaffold a custom MCP (Model Context Protocol) server that integrates with APS. Supports Node.js/TypeScript, .NET/C#, and Python. |

## Installation

Each skill is a folder inside [`skills/`](skills/) containing a `SKILL.md` file and optional supporting reference documents. To install a skill, copy or symlink its folder into the location your coding agent reads from.

### Cursor

```bash
# Project-level (recommended)
cp -r skills/<skill-name> path/to/your/project/.agents/skills/

# Project-level (Cursor-specific)
cp -r skills/<skill-name> path/to/your/project/.cursor/skills/

# Global (all projects, Cursor-specific)
cp -r skills/<skill-name> ~/.cursor/skills/
```

To use a skill, type `/` in Cursor's Agent chat and search for the skill name, or describe your task and let the agent pick the right skill automatically. Installed skills also appear under **Cursor Settings → Rules**.

For more details, see the [docs](https://cursor.com/docs/skills).

### VS Code (GitHub Copilot)

```bash
# Project-level (recommended)
cp -r skills/<skill-name> path/to/your/project/.agents/skills/

# Global (all projects)
cp -r skills/<skill-name> ~/.agents/skills/
```

To use a skill, type `/skill-name` in the Copilot Chat panel, or describe your task and let Copilot select the skill automatically. You can also configure custom skill locations via the `chat.skillsLocations` VS Code setting.

For more details, see the [docs](https://code.visualstudio.com/docs/copilot/customization/agent-skills).

### Claude Code

Copy the skill folder to your project or home directory:

```bash
# Project-level (recommended, Claude-specific)
cp -r skills/<skill-name> path/to/your/project/.claude/skills/

# Global (all projects, Claude-specific)
cp -r skills/<skill-name> ~/.claude/skills/
```

To use a skill, type `/skill-name` at the Claude Code prompt, or describe your task and let Claude select the skill automatically. Type `/` to browse all available skills.

For more details, see the [docs](https://code.claude.com/docs/en/skills).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE) for details.
