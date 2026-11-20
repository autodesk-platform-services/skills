---
name: aps-migration
description: >
  Migrate existing Autodesk Platform Services (APS) codebases to newer APIs, SDKs, and viewer
  versions. Use when the user wants to upgrade, port, or audit code for a breaking change or
  deprecation, or when code breaks after an APS migration. Includes a detailed playbook for
  migrating APS Viewer apps from v7 to v8 (or the v8 preview), including code that breaks after
  switching to viewer3D-v8.min.js or /viewers/8.*: three.js removal, viewer.overlays and
  SceneBuilder replacement with the Scene API and render layers, custom materials, fragment and
  viewer.impl internals, camera and raycasting, Autodesk.DataVisualization and other retired
  extensions, ES6-class extensions, removed preferences and Private APIs, Large Model Experience
  streaming, WebGPU, secure-context hosting, and the mandatory Initializer promise.
metadata:
  author: Developer Advocates @ Autodesk
  version: "0.4"
  products: "APS, Viewer"
  technologies: "JavaScript, TypeScript, WebGPU, three.js"
  industries: "AEC, Manufacturing, Media & Entertainment"
compatibility: Requires Node.js 18+ to run the Viewer v8 audit script.
---

# APS migration

Move an existing codebase off a deprecated or replaced APS API, SDK, or viewer version. This skill
owns the migration *method*. Mapping tables (old endpoint → new endpoint, old member → new member)
come from the official migration guides and deprecation notices; find them with the
`aps-reference` skill instead of relying on memory.

## Method

Every migration follows the same four steps:

1. **Inventory.** Find every place the codebase uses the API being migrated. Prefer a script or a
   systematic search over reading files at random, and list the hits by file and line.
2. **Map.** Map each usage through the official migration guide. When a usage has no documented
   replacement, list it as a gap instead of inventing a workaround or reaching for internals.
   Present the plan (usages, replacements, gaps) to the user and wait for confirmation.
3. **Verify.** Port one file or feature at a time, and verify each step: run the tests, or ask the
   user to run the app and paste the console output.
4. **Cut over.** Switch the endpoint, SDK version, or script URL in one place, verify again, then
   remove leftovers (feature flags, compatibility shims).

## Migrations

| Migration | Read |
| --- | --- |
| APS Viewer v7 → v8 | `references/viewer-v8.md` (workflow, audit script, and port patterns) |

Other migrations aren't covered by a playbook yet: Forge → APS, Authentication v2, x-user-id →
SSA, BIM 360 → Forma (ACC), BuildingConnected v2 → v3, Forms API v1, the deprecated Data Exchange
lookup by file ID, developer hub migration, and SDK target changes. For these, apply the method
above and use the `aps-reference` skill to find the official migration guide and deprecation
notices.
