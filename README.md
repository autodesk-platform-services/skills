# Agent Skills for Autodesk Platform Services

A collection of reusable AI agent skills for [Autodesk Platform Services](https://aps.autodesk.com) and Autodesk industry clouds like Flow, Forma and Fusion products. Each skill is a self-contained instruction set that teaches a coding agent how to perform a specific Autodesk API-related development task.

https://github.com/user-attachments/assets/7126310c-4ef6-4b21-9b29-a702dfc0a16d

## Installation

Each skill is a folder inside [`skills/`](skills/) containing a `SKILL.md` file and optional supporting reference documents.

### Claude Code plugin marketplace

This repository is also a [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins/install) called `aps-skills`, with one plugin per skill. Add the marketplace once, then install the skills you need:

```bash
claude plugin marketplace add autodesk-platform-services/skills
claude plugin install <skill-name>@aps-skills
```

Or do both from inside a Claude Code session:

```
/plugin install <skill-name> --marketplace autodesk-platform-services/skills
```

You can also browse and install the skills interactively with `/plugin`. To get the latest changes later, run `claude plugin update <skill-name>@aps-skills`.

### GitHub Copilot plugin marketplace

The same marketplace works with GitHub Copilot. In VS Code, add the repository to the [`chat.plugins.marketplaces`](https://code.visualstudio.com/docs/agent-customization/agent-plugins#_configure-plugin-marketplaces) setting:

```json
"chat.plugins.marketplaces": [
    "autodesk-platform-services/skills"
]
```

Then search for `@agentPlugins` in the Extensions view (or run **Chat: Open Customizations** and go to **Plugins** > **Browse Marketplace**), and install the skills you need.

With the [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace), add the marketplace and install skills from the terminal:

```bash
copilot plugin marketplace add autodesk-platform-services/skills
copilot plugin install <skill-name>@aps-skills
```

Plugins installed with the Copilot CLI also show up in VS Code automatically.

### Manual installation

Clone this repository and copy the skill folder to wherever your AI agent looks for skills. For example, for Claude Code:

```bash
git clone https://github.com/autodesk-platform-services/skills.git
cd skills
cp -r skills/<skill-name> ~/.claude/skills/
```

### Automated installation

Use the [skills](https://www.npmjs.com/package/skills) utility to install and manage skills globally or per project:

```bash
# Install all skills globally (user-level)
npx skills add autodesk-platform-services/skills --global

# Install a single skill into the current project
npx skills add autodesk-platform-services/skills --project --skill <skill-name>
```

## Available Skills

| Skill | Description |
| ----- | ----------- |
| [`acad-arx-wizard`](skills/acad-arx-wizard/) | Scaffold ObjectARX C++ projects/classes for AutoCAD 2027 and Visual Studio 2026 using deterministic PowerShell generators (ARX/DBX/CRX, Jig, Reactors, Custom Object, MFC, .NET, COM, DynProp). |
| [`acad-cuix-builder`](skills/acad-cuix-builder/) | Generate AutoCAD partial CUIX files from prompts. Describe your ribbon panels and LISP/command buttons conversationally and get a ready-to-CUILOAD `.cuix` with embedded BMP icons. |
| [`acad-dotnet`](skills/acad-dotnet/) | Scaffold and develop AutoCAD 2027 .NET plugins (AutoCAD, Civil 3D, Plant 3D) targeting .NET 10 / x64. Covers csproj patterns, bundle packaging, desktop testing, and Design Automation deployment. |
| [`aps-docs-portal`](skills/aps-docs-portal/) | Navigate the APS documentation portal — decode glossary terms, crawl TOC JSON trees, extract content from static HTML pages, and convert CDN URLs to clickable portal links. |
| [`aps-mcp-server-gen`](skills/aps-mcp-server-gen/) | Scaffold a custom MCP (Model Context Protocol) server that integrates with APS. Supports Node.js/TypeScript, .NET/C#, and Python. |
| [`flow-ptr-app`](skills/flow-ptr-app/) | Guide for developing Flow Production Tracking (FPTR) / ShotGrid Toolkit apps following a spec-driven lifecycle — capture intent, write and validate a spec, plan, implement, verify, release, and maintain. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE.md](LICENSE.md) for details.
