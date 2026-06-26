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
cp -r skills/acad-arx-wizard ~/.claude/skills/
```

### Automated installation

Use the [skills](https://www.npmjs.com/package/skills) utility to install and manage skills globally or per project:

```bash
# Install all skills globally
npx skills add autodesk-platform-services/skills --global

# ... or ...
```

## Available Skills

| Skill | Description | Recommended install |
| ----- | ----------- | ------------------- |
| [`acad-arx-wizard`](skills/acad-arx-wizard/SKILL.md) | Scaffold ObjectARX C++ projects/classes for AutoCAD 2027 and Visual Studio 2026 using deterministic PowerShell generators (ARX/DBX/CRX, Jig, Reactors, Custom Object, MFC, .NET, COM, DynProp). | `npx skills add autodesk-platform-services/skills --global --skill acad-arx-wizard` |
| [`aps-docs-portal`](skills/aps-docs-portal/SKILL.md) | Navigate the APS documentation portal — decode glossary terms, crawl TOC JSON trees, extract content from static HTML pages, and convert CDN URLs to clickable portal links. | `npx skills add autodesk-platform-services/skills --project --skill aps-docs-portal` |
| [`aps-mcp-server-gen`](skills/aps-mcp-server-gen/SKILL.md) | Scaffold a custom MCP (Model Context Protocol) server that integrates with APS. Supports Node.js/TypeScript, .NET/C#, and Python. | `npx skills add autodesk-platform-services/skills --project --skill aps-mcp-server-gen` |
| [`acad-dotnet`](skills/acad-dotnet/SKILL.md) | Scaffold and develop AutoCAD 2027 .NET plugins (AutoCAD, Civil 3D, Plant 3D) targeting .NET 10 / x64. Covers csproj patterns, bundle packaging, desktop testing, and Design Automation deployment. | `npx skills add autodesk-platform-services/skills --project --skill acad-dotnet` |
| [`acad-cuix-builder`](skills/acad-cuix-builder/SKILL.md) | Generate AutoCAD partial CUIX files from prompts. Describe your ribbon panels and LISP/command buttons conversationally — skill builds a ready-to-CUILOAD `.cuix` with embedded BMP icons. Requires `CuixBuilder.exe` — see install note below. | `npx skills add autodesk-platform-services/skills --global --skill acad-cuix-builder` |

### acad-cuix-builder — one-shot install

One command installs both the skill and [`CuixBuilder.exe`](https://github.com/ADN-DevTech/acad-cuix-builder/releases/latest):

```powershell
irm https://raw.githubusercontent.com/autodesk-platform-services/skills/main/skills/acad-cuix-builder/install.ps1 | iex
```

Then in your agent:

```
/acad-cuix-builder

I need a ribbon tab called "Drafting Tools" with two panels:
  Panel 1 — Annotation: Quick Leader (QLEADER), Mtext (MTEXT)
  Panel 2 — View: Zoom Extents (ZOOM E), Regen (REGEN)
Save to C:\Plugins\DraftingTools.cuix
```

→ See [README.md](skills/acad-cuix-builder/README.md) for full usage and examples.  
→ Source: [ADN-DevTech/acad-cuix-builder](https://github.com/ADN-DevTech/acad-cuix-builder)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE) for details.
