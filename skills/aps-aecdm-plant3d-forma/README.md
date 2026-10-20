# AEC Data Model — Plant 3D on Forma / ACC

Agent skill for discovering **AutoCAD Plant 3D** data sets in **Forma / ACC** through the **AEC Data Model GraphQL API**: hubs, projects, folders, P&ID and 3D piping element groups, local **`.dcf`** table schema, and production-oriented element queries.

## Requirements

- APS **Traditional Web App** (or equivalent) with **AEC Data Model API** enabled
- **3-legged OAuth** with at least `data:read`; user must have access to the target hub and project
- Plant 3D content **published/synced** to AEC Data Model in the ACC project
- For schema work: **ProcessPower.dcf** / **Piping.dcf** from the Plant 3D project folder (SQLite, read-only)

## Installation

Recommended (project-level):

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-aecdm-plant3d-forma
```

After this skill is merged to [autodesk-platform-services/skills](https://github.com/autodesk-platform-services/skills), the command above installs from the marketplace. Until then, copy this folder to your agent skills directory (for example `~/.cursor/skills/aps-aecdm-plant3d-forma/` or `.cursor/skills/aps-aecdm-plant3d-forma/` in a repo).

Claude Code plugin (once published):

```bash
claude plugin marketplace add autodesk-platform-services/skills
claude plugin install aps-aecdm-plant3d-forma@aps-skills
```

## Example prompts

- “List the GraphQL steps to find P&ID and 3D data sets under Project Files in an ACC project.”
- “Why does filtering for Engineering Items over-fetch elements, and what should I do instead?”
- “How do I get Plant 3D column types and picklists if AEC Data Model only returns property values?”
- “Draft a folder-scoped scan for element groups named P&ID Data Set and 3D Piping Data Set.”

## Reference implementation

[aps-aecdm-plant3d-dashboard-sample](https://github.com/autodesk-platform-services/aps-aecdm-plant3d-dashboard-sample) demonstrates OAuth, folder scan, sync, quality checks, and bundled `.dcf` SQL tooling. It is not required to use this skill.

## Submitting updates to APS skills

This folder is shaped for [CONTRIBUTING.md](https://github.com/autodesk-platform-services/skills/blob/main/CONTRIBUTING.md) in **autodesk-platform-services/skills**. See [SUBMIT-TO-APS-SKILLS.md](SUBMIT-TO-APS-SKILLS.md) in this folder for the PR checklist (marketplace entry, root README table, validation script).
