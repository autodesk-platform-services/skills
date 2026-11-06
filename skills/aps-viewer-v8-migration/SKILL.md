---
name: aps-viewer-v8-migration
description: >
  Migrate Autodesk Platform Services (APS) Viewer apps from v7 to v8. Use when the user wants to
  upgrade, port, or audit Viewer code for v8 (or the v8 preview), or when Viewer code breaks after
  switching to viewer3D-v8.min.js or /viewers/8.*. Covers three.js removal, viewer.overlays and
  SceneBuilder replacement with the Scene API and render layers, custom materials, fragment and
  viewer.impl internals, camera and raycasting, Autodesk.DataVisualization and other retired
  extensions, Large Model Experience streaming, WebGPU, secure-context hosting, and the mandatory
  Initializer call.
metadata:
  author: Developer Advocates @ Autodesk
  version: "0.1"
  products: "APS, Viewer"
  technologies: "JavaScript, TypeScript, WebGPU, three.js"
  industries: "AEC, Manufacturing, Media & Entertainment"
compatibility: Requires Node.js 18+ to run the audit script.
---

# APS Viewer v7 → v8 migration

Port an existing APS Viewer v7 app to v8. v8 removes three.js from the public API, replaces
overlays and SceneBuilder with the Scene API, renders with WebGPU, always streams models (Large
Model Experience), requires a secure context, and removes APIs that were deprecated in v7.

Conventions in this skill and its references: `av = Autodesk.Viewing`,
`avs = Autodesk.Viewing.Scene`, `avm = Autodesk.Viewing.Math`.

## Ground rules

- **Port against v7 first, then switch the script URL.** All v8 code in this skill also runs on
  v7 with the Scene API enabled. Make the app work on v7 + Scene API, verify, and only then load
  v8. This keeps a working baseline and isolates renderer/loading issues from API issues.
- **Use only documented APIs.** Only write code that uses members listed in the Viewer reference
  guide. In v8, `viewer.impl` and other internals can change without notice. When unsure whether a
  member exists or what its signature is, look it up with the `aps-docs-portal` skill instead of
  guessing.
- **Report gaps, don't invent workarounds.** Some v7 capabilities have no v8 equivalent (custom
  shaders, WebXR, arbitrary-ray intersection, gradient heatmaps). List them in the gaps section of
  the report (see `references/gaps.md`). Never reach back into internals or write a fake shader
  workaround to close a gap.
- **Every v7-deprecated API is a required change.** `getInstanceTree`, the sync property methods,
  `viewer.overlays`/`OverlayManager`, and `viewer.impl.scene`/`sceneAfter` are removed or renamed
  for internal use in v8. Existing calls break; treat them as errors, not warnings.

## Workflow

Copy this checklist into your response and tick it off as you go:

- [ ] 1. Audit: run `scripts/audit.mjs` and group findings by pattern
- [ ] 2. Plan: map each finding to a pattern, list gaps, and confirm with the user
- [ ] 3. Prepare v7: enable the Scene API flag and fix initialization
- [ ] 4. Port: apply patterns file by file, staying on v7
- [ ] 5. Verify on v7: user runs the app, pastes console output
- [ ] 6. Switch to v8: change the script/stylesheet URL
- [ ] 7. Verify on v8: user runs the app, pastes console output; fix and repeat

### 1. Audit

Run the audit script from the skill folder against the user's source (not `node_modules`):

```bash
node <skill-root>/scripts/audit.mjs <path-to-app-source>
```

It prints Markdown findings grouped by pattern ID with `file:line`, and classifies `THREE.*` hits
as math, geometry, material, object, camera, raycasting, or renderer. Use `--json` if you want to
post-process the output. The regexes are broad on purpose: read every hit in context and discard
false positives (for example, `.project(` on an unrelated object, or an `http://` URL that is not
the viewer's host).

Also check `package.json` for a separately installed `three` package or `@types/three`, and for
`forge-viewer` typings that pull three.js types into TypeScript code.

### 2. Plan

For each finding, open the reference file the audit points to and decide the target pattern. Then
present a plan to the user before editing:

```markdown
## Viewer v8 migration plan

| Pattern | Files | Change | Effort |
| --- | --- | --- | --- |
| P2 overlays → render layer | markers.js | 3 overlay scenes → 3 layers | S |
| ... | ... | ... | ... |

### Gaps (no documented v8 equivalent)
- <feature>: <what it does today>, <closest documented option, if any>

### Removed with no replacement
- <undocumented extension / internal API>: recommend removing <feature>
```

Wait for the user to confirm the plan, especially the gaps, before you change code.

### 3. Prepare v7

- Keep the viewer script and stylesheet URLs in a single config constant, so switching to the v8
  preview, and later to the `8.*` GA path, is one edit.
- If any code touches loaded models through the Scene API (patterns P7–P9), enable
  `av.PublicFeatureFlags.SceneAPI` on v7 **before** calling the Initializer.
- Make sure `av.Initializer` runs once per page and that every viewer is created after its
  callback (P18). v7 tolerated skipping it; v8 doesn't.

### 4. Port

Apply the patterns. Read only the reference files that the audit findings point to:

| Read | When the audit reports |
| --- | --- |
| `references/patterns/loading-and-init.md` | P1 script URLs, P15 non-secure origins, P18 viewer construction |
| `references/patterns/scene-content.md` | P2 overlays, P3 `impl.scene`/`sceneAfter`, P4 SceneBuilder, P5 `THREE.*` types |
| `references/patterns/materials-and-appearance.md` | P6 custom materials/shaders, P7 recoloring loaded elements |
| `references/patterns/loaded-models.md` | P7–P9 fragment access, P13 streaming/LME, P17 internals and removed APIs, P19 bounding boxes |
| `references/patterns/camera-and-picking.md` | P10 camera, P11 raycasting and projection |
| `references/patterns/extensions-and-renderer.md` | P12 DataVisualization, P14 WebGL code, P16 retired extensions |
| `references/breaking-changes.md` | You need the full list of v8 breaking changes, or the user asks "what changed" |
| `references/gaps.md` | A feature has no documented v8 equivalent |

Port one file or feature at a time, so each step stays reviewable.

### 5–7. Verify and switch

You can't see the browser, so ask the user to run the app, open the developer console, and paste
warnings and errors back. Fix the issues, then repeat. After v7 works, switch the URLs:

```html
<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D-v8.min.js"></script>
<link href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style-v8.min.css" rel="stylesheet">
```

When v8 reaches general availability, it moves to `/viewers/8.*`; check the current URL with the
`aps-docs-portal` skill.

## Gotchas

- **Every Scene API mutation needs `viewer.refresh(true)`**; nothing redraws on its own.
- **Render layers draw everything every frame.** Large custom content belongs in the main scene as
  a dynamic model (P4), not in an overlay layer (P2).
- **`viewer.showModel(model)` must come before** touching a dynamic model's instances.
- **Geometries and materials belong to one model.** Clone them before reusing across models.
- **`StandardMaterial` needs normals.** Geometry without normals renders incorrectly; use
  `UnlitMaterial` or compute normals.
- **Don't read typed arrays back after `instances.add()`.** Use `getVertexCount()` and
  `getPosition(i, target)`.
- **`avm` math types follow three.js r71** (the version bundled with v7), not current three.js.
  Code written against the bundled `THREE` migrates by renaming the namespace; code copied from
  current three.js docs or a separately installed `three` package must be checked against r71
  method names.
- **Camera properties are read-only in v8.** Writes go through `viewer.navigation` or
  `viewer.setFOV`.
- **Models stream in.** Don't rely on a fixed fragment/instance order or on
  `GEOMETRY_LOADED_EVENT` timing; apply object-level state by `dbId` and await
  `model.getObjectTreeAsync()`.
- **`setThemingColor` survives.** For "tint by status/value", prefer it over material changes.
- **Forcing WebGL is a deprecated escape hatch**, never a fix. If you use it, label it as such and
  leave a TODO.
- **Secure-context availability depends on the host.** LAN IPs over plain HTTP
  (`http://192.168.x.x`) are not secure contexts; top-level `file://` may be treated as trustworthy.
  Check `window.isSecureContext` and whether `navigator.gpu` is available in the actual host, and
  assess Viewer local-model-loading support separately. `http://localhost` is a secure context.
- **Docs inconsistency:** the Scene API blog post uses `viewer.layers.create(...)`; the reference
  documents `viewer.getRenderLayers()`. Use `getRenderLayers()`.

## Out of scope

- Undocumented extensions (Beeline, CAM360, DataPersistence, DOF, Fusion360.Simulation, MSDF, OMV,
  PropertyQuery, PropertySearch, Scalaris, ScalarisSimulation, ReCap, MemoryLimitedDebug) are
  retired with no replacement. Report them and recommend removal.
- AR/VR/WebXR integrations have no v8 equivalent. Report them as unsupported.
