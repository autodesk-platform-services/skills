# acad-dotnet — AutoCAD .NET Plugin Skill

Scaffold and develop AutoCAD 2027 .NET plugins (AutoCAD, Civil 3D, Plant 3D) targeting .NET 10 / x64. Covers project creation, csproj patterns, bundle packaging, desktop testing, and Design Automation deployment.

## What's included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main scaffold steps — end-to-end project creation |
| `references/autocad-api.md` | Base AutoCAD .NET API: DLL map, transactions, plotting, events, gotchas |
| `references/civil3d-api.md` | Civil 3D: alignments, surfaces, corridors, pipe networks, DREFs |
| `references/plant3d-api.md` | Plant 3D: world map, P&ID objects, data manager, pipe routing |
| `references/code-sleuth.md` | How to find SDK samples with `rg` and query Autodesk Help MCP |
| `references/learnings.md` | Append-only log of verified discoveries (human-reviewed before promotion) |
| `templates/acad/` | `dotnet new acad` template — AutoCAD plugin scaffold |
| `templates/civil/` | `dotnet new civil` template — Civil 3D plugin scaffold |

## Installation

### Manual (Claude Code)

```bash
git clone https://github.com/autodesk-platform-services/skills.git
cp -r skills/acad-dotnet ~/.claude/skills/
```

### Register dotnet templates (required for `dotnet new acad` / `dotnet new civil`)

```bash
dotnet new install ./templates/acad
dotnet new install ./templates/civil
```

Verify:
```bash
dotnet new list | grep -E "acad|civil"
```

## Usage

Ask your AI agent:
> "Create an AutoCAD 2027 .NET plugin called MyPlugin"
> "Scaffold a Civil 3D plugin targeting net10.0-windows"
> "Package my plugin as a Design Automation bundle"

The agent reads `SKILL.md` for scaffold steps and loads reference docs as needed.

## Target stack

| Item | Value |
|------|-------|
| Framework | `net10.0-windows` |
| Platform | `win-x64` (`<PlatformTarget>x64</PlatformTarget>`) |
| AutoCAD NuGet | `AutoCAD.NET 26.0.0` |
| Civil 3D NuGet | `Civil3D.NET 13.9.628` |
| Plant 3D | Local SDK — no NuGet |
