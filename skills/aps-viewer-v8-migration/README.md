# APS Viewer v8 Migration Skill

Migrate [APS Viewer](https://aps.autodesk.com/viewer-sdk) apps from v7 to v8. The skill audits your code for v7 APIs that break in v8, proposes a migration plan, and ports the code pattern by pattern: three.js types and overlays to the Scene API and render layers, custom materials to built-in materials, `viewer.impl`, fragment internals, `viewer.prefs`, and `Autodesk.Viewing.Private` to documented APIs, ES5-style extensions to ES6 classes, `Autodesk.DataVisualization` and other retired extensions to v8 alternatives, and initialization and hosting to v8 requirements (awaited `Initializer`, secure context, WebGPU, WebSockets).

The skill ports against v7 with the Scene API enabled first, then switches to the v8 script URL, and reports features that have no documented v8 equivalent instead of working around them with internals.

## Requirements

- Node.js 18+ (to run the audit script)
- Recommended: the [`aps-docs-portal`](../aps-docs-portal/) skill, which this skill uses to look up Viewer reference pages

## Installation

From inside a Claude Code session:

```
/plugin install aps-viewer-v8-migration --marketplace autodesk-platform-services/skills
```

Or with the [skills](https://www.npmjs.com/package/skills) utility (project-level):

```bash
npx skills add autodesk-platform-services/skills --project --skill aps-viewer-v8-migration
```

## Usage

Ask your agent, for example:

- "Migrate this viewer app to Viewer v8."
- "Which parts of our viewer extensions will break in the v8 preview?"
- "Our markers built with `viewer.overlays` don't show up in v8. Fix them."
- "Replace the DataVisualization sprites in `src/iot` with something that works in v8."

You can also run the audit on its own:

```bash
node skills/aps-viewer-v8-migration/scripts/audit.mjs path/to/your/app/src
```
