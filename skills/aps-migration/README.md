# APS Migration Skill

Migrate existing [Autodesk Platform Services](https://aps.autodesk.com) codebases to newer APIs, SDKs, and viewer versions. The skill follows one method for every migration: inventory the codebase's APS usage, map each usage through the official migration guide, verify step by step, then cut over. Mapping tables come from the official migration guides and deprecation notices, not from the skill.

The skill currently includes a detailed playbook for one migration:

- **APS Viewer v7 → v8.** The skill audits your code for v7 APIs that break in [Viewer](https://aps.autodesk.com/viewer-sdk) v8, proposes a migration plan, and ports the code pattern by pattern: three.js types and overlays to the Scene API and render layers, custom materials to built-in materials, `viewer.impl`, fragment internals, `viewer.prefs`, and `Autodesk.Viewing.Private` to documented APIs, ES5-style extensions to ES6 classes, `Autodesk.DataVisualization` and other retired extensions to v8 alternatives, and initialization and hosting to v8 requirements (awaited `Initializer`, secure context, WebGPU, WebSockets). It ports against v7 with the Scene API enabled first, then switches to the v8 script URL, and reports features that have no documented v8 equivalent instead of working around them with internals.

For other migrations (for example Forge → APS, Authentication v2, x-user-id → SSA, or BIM 360 → Forma), the skill applies the same method and looks up the official migration guide.

## Requirements

- Node.js 18+ (to run the Viewer v8 audit script)
- Recommended: the [`aps-reference`](../aps-reference/) skill, which this skill uses to look up reference pages and migration guides

## Installation

From inside a Claude Code session:

```
/plugin install aps-skills --marketplace autodesk-platform-services/skills
```

Or with the [skills](https://www.npmjs.com/package/skills) utility (project-level):

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-migration
```

## Usage

Ask your agent, for example:

- "Migrate this viewer app to Viewer v8."
- "Which parts of our viewer extensions will break in the v8 preview?"
- "Our markers built with `viewer.overlays` don't show up in v8. Fix them."
- "Replace the DataVisualization sprites in `src/iot` with something that works in v8."

You can also run the Viewer v8 audit on its own:

```bash
node skills/aps-migration/scripts/viewer-v8-audit.mjs path/to/your/app/src
```
