# Agent Skills for Autodesk Platform Services

A collection of reusable AI agent skills for [Autodesk Platform Services](https://aps.autodesk.com) and Autodesk industry clouds like Flow, Forma and Fusion products. Each skill is a self-contained instruction set that teaches a coding agent how to perform a specific Autodesk API-related development task.

https://github.com/user-attachments/assets/7126310c-4ef6-4b21-9b29-a702dfc0a16d

## Installation

Each skill is a folder inside [`skills/`](skills/) containing a `SKILL.md` file and optional supporting reference documents. You can install all of them at once as an agent plugin, pick individual skills with `npx skills`, or copy them manually.

### Agent plugin

This repository is a plugin marketplace called `aps-plugins`, with a single plugin, `aps-skills`, that bundles all the skills. The same marketplace works with Claude Code, Codex and GitHub Copilot. The repository is also an [Agent Plugin](https://agent-plugins.org) (see [`plugin.json`](plugin.json)), so any client that supports the spec can load the skills from `skills/`.

#### Claude Code

See [Discover and install plugins](https://code.claude.com/docs/en/discover-plugins) for details.

**From the shell:** add the marketplace once, then install the plugin:

```bash
claude plugin marketplace add autodesk-platform-services/skills
claude plugin install aps-skills@aps-plugins
```

**From an existing Claude Code session:** run these commands, then pick an installation scope when prompted:

```
/plugin marketplace add autodesk-platform-services/skills
/plugin install aps-skills@aps-plugins
```

On Claude Code 2.1.275 or later, you can also do both in one step with `/plugin install aps-skills --marketplace autodesk-platform-services/skills`, or browse and install interactively with `/plugin`.

**From the desktop app:** add the marketplace first, using either of the options above (the desktop app shares settings with the CLI). Then, in a local session in the **Code** tab, click **+** next to the prompt box, select **Add plugins** (or **Plugins** > **Browse plugins**), select `aps-skills`, and choose an installation scope.

To get the latest changes later, run `claude plugin update aps-skills@aps-plugins`.

#### Codex

See [Codex plugins](https://developers.openai.com/codex/plugins) for details.

**From the shell:** add the marketplace once, then install the plugin:

```bash
codex plugin marketplace add autodesk-platform-services/skills
codex plugin add aps-skills@aps-plugins
```

**From an existing Codex session:** run `/plugins`, open the **Add marketplace** tab, and enter `autodesk-platform-services/skills`. Then switch to the `aps-plugins` marketplace tab, open the `aps-skills` plugin, and install it.

**From the desktop app:** add the marketplace first, using either of the options above (the desktop app shares configuration with the CLI), and restart the app if it's running. Then open **Plugins**, choose the `aps-plugins` marketplace, open the `aps-skills` plugin, and install it.

To get the latest changes later, run `codex plugin marketplace upgrade aps-plugins`.

#### GitHub Copilot

See [Finding and installing plugins](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing) for details.

**From the shell:** add the marketplace once, then install the plugin with the [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli):

```bash
copilot plugin marketplace add autodesk-platform-services/skills
copilot plugin install aps-skills@aps-plugins
```

**From an existing Copilot CLI session:**

```
/plugin marketplace add autodesk-platform-services/skills
/plugin install aps-skills@aps-plugins
```

To get the latest changes later, run `copilot plugin update aps-skills@aps-plugins`.

**From VS Code:** plugins installed with the Copilot CLI show up in VS Code automatically. To install from VS Code instead, make sure [agent plugins](https://code.visualstudio.com/docs/copilot/customization/agent-plugins) are enabled (`chat.plugins.enabled`), and add the repository to the `chat.plugins.marketplaces` setting:

```json
"chat.plugins.marketplaces": [
    "autodesk-platform-services/skills"
]
```

Then run **Chat: Open Customizations** from the Command Palette, go to **Plugins** > **Browse Marketplace**, and install the `aps-skills` plugin.

### Individual skills with `npx skills`

Use the [skills](https://www.npmjs.com/package/skills) utility to install and manage individual skills for most coding agents, either in the current project or globally:

```bash
# List the available skills
npx skills add autodesk-platform-services/skills --list

# Pick skills and agents interactively, and install them into the current project
npx skills add autodesk-platform-services/skills

# Install a single skill into the current project
npx skills add autodesk-platform-services/skills --skill <skill-name>

# Install all skills globally (user-level)
npx skills add autodesk-platform-services/skills --skill '*' --global
```

Add `--agent <agent>` (for example, `--agent claude-code`) to skip the agent selection prompt. To get the latest changes later, run `npx skills update`.

### Manual installation

Clone this repository and copy the skill folders you want to wherever your agent looks for skills:

```bash
git clone https://github.com/autodesk-platform-services/skills.git
cd skills

# Claude Code
cp -r skills/<skill-name> ~/.claude/skills/

# Codex
cp -r skills/<skill-name> ~/.agents/skills/

# GitHub Copilot
cp -r skills/<skill-name> ~/.copilot/skills/
```

To make a skill available only in a specific project, copy it into the project's `.claude/skills/`, `.agents/skills/` or `.github/skills/` folder instead. Create the target folder first if it doesn't exist.

## Available Skills

| Skill | Description |
| ----- | ----------- |
| [`acad-arx-wizard`](skills/acad-arx-wizard/) | Scaffold ObjectARX C++ projects/classes for AutoCAD 2027 and Visual Studio 2026 using deterministic PowerShell generators (ARX/DBX/CRX, Jig, Reactors, Custom Object, MFC, .NET, COM, DynProp). |
| [`acad-cuix-builder`](skills/acad-cuix-builder/) | Generate AutoCAD partial CUIX files from prompts. Describe your ribbon panels and LISP/command buttons conversationally and get a ready-to-CUILOAD `.cuix` with embedded BMP icons. |
| [`acad-dotnet`](skills/acad-dotnet/) | Scaffold and develop AutoCAD 2027 .NET plugins (AutoCAD, Civil 3D, Plant 3D) targeting .NET 10 / x64. Covers csproj patterns, bundle packaging, desktop testing, and Design Automation deployment. |
| [`aps-docs-portal`](skills/aps-docs-portal/) | Navigate the APS documentation portal — decode glossary terms, index TOC JSON trees, extract content from static HTML pages, and build valid portal links. |
| [`aps-mcp-server-gen`](skills/aps-mcp-server-gen/) | Scaffold a custom MCP (Model Context Protocol) server that integrates with APS. Supports Node.js/TypeScript, .NET/C#, and Python. |
| [`aps-viewer-v8-migration`](skills/aps-viewer-v8-migration/) | Migrate APS Viewer apps from v7 to v8 — audit for breaking changes, then port three.js overlays, SceneBuilder, custom materials, internals, and retired extensions to the Scene API and documented APIs. |
| [`flow-ptr-app`](skills/flow-ptr-app/) | Guide for developing Flow Production Tracking (FPTR) / ShotGrid Toolkit apps following a spec-driven lifecycle — capture intent, write and validate a spec, plan, implement, verify, release, and maintain. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE.md](LICENSE.md) for details.
