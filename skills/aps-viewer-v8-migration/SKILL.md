---
name: aps-viewer-v8-migration
description: >
  Migrate Autodesk Platform Services (APS) Viewer apps from v7 to v8. Use when the user wants to
  upgrade, port, or audit Viewer code for v8 (or the v8 preview), or when Viewer code breaks after
  switching to viewer3D-v8.min.js or /viewers/8.*. Covers three.js removal, viewer.overlays and
  SceneBuilder replacement with the Scene API and render layers, custom materials, fragment and
  viewer.impl internals, camera and raycasting, Autodesk.DataVisualization and other retired
  extensions, ES6-class extensions, removed preferences and Private APIs, Large Model Experience
  streaming, WebGPU, secure-context hosting, and the mandatory Initializer promise.
metadata:
  author: Developer Advocates @ Autodesk
  version: "0.2"
  products: "APS, Viewer"
  technologies: "JavaScript, TypeScript, WebGPU, three.js"
  industries: "AEC, Manufacturing, Media & Entertainment"
compatibility: Requires Node.js 18+ to run the audit script.
---

# APS Viewer v7 → v8 migration

Port an existing APS Viewer v7 app to v8. v8 removes three.js from the public API, replaces
overlays and SceneBuilder with the Scene API, renders with WebGPU, always streams models (Large
Model Experience), requires a secure context and ES6-class extensions, and removes APIs that were
deprecated in v7.

Conventions in this skill and its references: `av = Autodesk.Viewing`,
`avs = Autodesk.Viewing.Scene`, `avm = Autodesk.Viewing.Math`.

## Ground rules

- **Default: port against v7 first, then switch the script URL.** Most v8 code in this skill also
  runs on v7 with the Scene API enabled. Making the app work on v7 + Scene API first keeps a
  working baseline and separates renderer/loading issues from API issues. v7 + Scene API is a
  stand-in, not the v8 runtime: math types, loading, and renderer behavior differ, so verify on v8
  too. Several replacements (`getRenderLayers()`, `getPreferences()`, the Initializer promise, the
  `Camera` class) first shipped in v7.131.0, so apps pinned to an older version (for example
  `/viewers/7.89/`) must move to `7.*` (or 7.131 or later) first.
- **Alternative: go straight to v8.** Offer this in the plan when the user doesn't need the app to
  keep running on v7, or when v7 + Scene API behaves differently from v8 for the code being ported.
  Switch the URLs first (step 6), then port and verify on v8 only.
- **Use only documented APIs.** Only write code that uses members listed in the
  [v8 reference](https://aps.autodesk.com/en/docs/viewer/v8/reference/) or shown in the v8
  developer's guide (docs source ID `viewer_v8` in the `aps-docs-portal` skill). In v8, `viewer.impl`, `Autodesk.Viewing.Private`, and
  other internals can change without notice. When unsure whether a member exists or what its
  signature is, look it up instead of guessing. `viewer.navigation` and `model.getInstances()` are
  used throughout the v8 guides but aren't listed on the `Viewer3D`/`Model` reference pages (the
  `Navigation` and `InstanceCollection3D` classes are); treat them as documented.
- **The v8 reference and changelog win.** When a blog post, a sample, or a v8 guide page disagrees
  with the v8 reference or the `v8:` entries in the v7 changelog (7.131.0 and later), follow the
  reference and the changelog.
- **Report gaps, don't invent workarounds.** Some v7 capabilities have no v8 equivalent (custom
  shaders, WebXR, arbitrary-ray intersection, gradient heatmaps). List them in the gaps section of
  the report (see `references/gaps.md`). Never reach back into internals or write a fake shader
  workaround to close a gap.
- **Every v7-deprecated API is a required change.** `getInstanceTree`, the sync property methods,
  `viewer.overlays`/`viewer.layers`/`OverlayManager`, `viewer.impl.scene`/`sceneAfter`,
  `viewer.prefs`, and `Autodesk.Viewing.Private.*` are removed or renamed for internal use in v8.
  Existing calls break; treat them as errors, not warnings.

## Workflow

Copy this checklist into your response and tick it off as you go:

- [ ] 1. Audit: run `scripts/audit.mjs` and group findings by pattern
- [ ] 2. Plan: map each finding to a pattern, list gaps, pick the v7-first or v8-only path, and
  confirm with the user
- [ ] 3. Prepare v7: enable the Scene API flag and fix initialization (v8-only: fix initialization)
- [ ] 4. Port: apply patterns file by file, staying on v7 (v8-only: do step 6 first)
- [ ] 5. Verify on v7: user runs the app, pastes console output (v8-only: skip)
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

It also reports:

- `three`, `@types/three`, `forge-viewer`, and `@types/forge-viewer` dependencies in `package.json`,
  code that subclasses three.js types, and libraries that need a global `THREE` (P5).
- Initializer calls that pass a callback, more than one Initializer call site, and the legacy
  `env: 'AutodeskProduction'` (P18).
- Folders it skipped (`vendor`, `dist`, `build`, …) that contain scripts, and minified or
  oversized files. If app code lives there (a vendored gizmo, a copied helper), scan it explicitly.

Most regexes work line by line and match common names, so aliased objects (`const nav =
viewer.navigation`) and constructors split across lines can slip through. Skim the entry point and
every extension file yourself, and grep for any internal name you see in one file across the rest.

### 2. Plan

For each finding, open the reference file the audit points to and decide the target pattern. Then
present a plan to the user before editing:

```markdown
## Viewer v8 migration plan

| Pattern | Files | Change | Effort |
| --- | --- | --- | --- |
| P2 overlays → render layer | markers.js | 3 overlay scenes → 3 layers | S |
| ... | ... | ... | ... |

Path: v7 first (default) / v8 only

### Gaps (no documented v8 equivalent)
- <feature>: <what it does today>, <closest documented option, if any>

### Removed with no replacement
- <undocumented extension / internal API>: recommend removing <feature>
```

Wait for the user to confirm the plan, especially the gaps, before you change code.

### 3. Prepare v7

- Keep the viewer script and stylesheet URLs in a single config constant, so switching to the v8
  preview, and later to the `8.*` GA path, is one edit.
Skip the Scene API flag on the v8-only path; do the rest.

- If any code touches loaded models through the Scene API (patterns P7–P9), enable
  `av.PublicFeatureFlags.SceneAPI` on v7 **before** calling the Initializer. Remove the flag again
  when you switch to v8; it doesn't exist there.
- Make sure `av.Initializer` runs once per page, is awaited (the callback form is deprecated), and
  that every viewer is created after it resolves (P18). v7 tolerated skipping it; v8 throws.
- Convert ES5-style extensions and viewer subclasses to ES6 classes (P20). Both forms run on v7.

### 4. Port

Apply the patterns. Read only the reference files that the audit findings point to:

| Read | When the audit reports |
| --- | --- |
| `references/patterns/loading-and-init.md` | P1 script URLs, P15 non-secure origins, P18 viewer construction |
| `references/patterns/scene-content.md` | P2 overlays, P3 `impl.scene`/`sceneAfter`, P4 SceneBuilder, P5 `THREE.*` types |
| `references/patterns/materials-and-appearance.md` | P6 custom materials/shaders, P7 recoloring loaded elements |
| `references/patterns/loaded-models.md` | P7–P9 fragment access, P13 streaming/LME, P17 internals, removed APIs, preferences, `Private` namespace, mesh read-back, selection events, and behavior changes, P19 bounding boxes |
| `references/patterns/camera-and-picking.md` | P10 camera, `autocam`/`utilities`, P11 raycasting, projection, plane picking (`intersectGround`), and `TransformControls` gizmos |
| `references/patterns/extensions-and-renderer.md` | P12 DataVisualization, P14 WebGL code, P16 retired extensions, P20 ES5-style extensions and subclasses |
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

When v8 reaches general availability, it moves to `/viewers/8.*/viewer3D.min.js` (the v8
getting-started guide already shows that path); check the current URL with the `aps-docs-portal`
skill. Confirm the loaded version with `LMV_VIEWER_VERSION` in the console.

## Gotchas

- **Every Scene API mutation needs a refresh**; nothing redraws on its own. Use
  `viewer.refresh(true)` for main-scene and main-pass changes, `viewer.refresh(false)` when only
  overlay-layer content changed.
- **Loaded models optimize after every change.** Their default `UsageHint` is `Static`, so added or
  moved instances appear only after re-optimization. Call
  `instances.setUsageHint(avs.UsageHint.Dynamic)` before animating.
- **Render layers draw everything every frame.** Large custom content belongs in the main scene as
  a dynamic model (P4), not in an overlay layer (P2).
- **`viewer.showModel(model)` must come before** touching a dynamic model's instances.
- **Geometries and materials belong to one model.** Clone them before reusing across models.
  Materials read from a loaded model are opaque `InternalMaterial`s: reusable within that model
  only, not editable, not cloneable into another model.
- **`StandardMaterial` needs normals.** Geometry without normals renders incorrectly; use
  `UnlitMaterial` or compute normals.
- **Don't read typed arrays back after `instances.add()`.** Use `getVertexCount()` and
  `getPosition(i, target)`.
- **`avm` math types use current three.js method names**, not those of r71 (the version bundled
  with v7). For example, `avm.Box3` has `getCenter`, `getSize`, and `intersectsBox`, not `center`,
  `size`, and `isIntersectionBox`. Some r71 names still work but log deprecation warnings. Renaming
  the namespace isn't enough; apply the renames in `scene-content.md` (P5).
- **Colors: pass hex numbers** (`0xff5522`) in material options and `setColor`. The reference
  documents `new avs.Color(colorOrRed, green, blue)`, but a migration reported
  `undefined is not a constructor` at runtime; `avm.Color` doesn't exist. Use `avs.Color` only if
  `typeof avs.Color === 'function'` in the loaded build.
- **Camera properties are read-only in v8.** Writes go through `viewer.navigation` or
  `viewer.setFOV`.
- **Models stream in.** Don't rely on a fixed fragment/instance order or on
  `GEOMETRY_LOADED_EVENT` timing; apply object-level state by `dbId` and await
  `model.getObjectTreeAsync()`.
- **`setThemingColor` survives.** For "tint by status/value", prefer it over material changes.
- **WebGL fallback is automatic.** Forcing it with the Initializer option `renderer: 'webgl'` is a
  deprecated escape hatch, never a fix. If you use it, label it as such and leave a TODO.
- **Secure-context availability depends on the host.** LAN IPs over plain HTTP
  (`http://192.168.x.x`) are not secure contexts; top-level `file://` may be treated as trustworthy.
  Check `window.isSecureContext` and whether `navigator.gpu` is available in the actual host, and
  assess Viewer local-model-loading support separately. `http://localhost` is a secure context.
- **Docs inconsistencies:**
  - `viewer.navigation` and `model.getInstances()` appear in the v8 guides but not on the
    `Viewer3D`/`Model` reference pages. Use them, and mention the gap when reporting to Autodesk.
  - The Scene API blog post uses `viewer.layers.create(...)`. `viewer.layers` is removed in v8; use
    `viewer.getRenderLayers()`.
  - The v8 getting-started page still says "the Viewer has a hard dependency on three.js R71". v8 exposes
    no three.js types in its public API, so treat this as a leftover. Don't add a `three`
    dependency.
  - The v8 "Hello Triangle" guide calls `viewer.getCamera().setView(...)` on the active camera. The
    `Camera` reference says to prefer `viewer.navigation.setView(...)`; use that.
  - The getting-started page says to "verify that WebGL support is available" via `viewer.start()`.
    The return-code check still applies; the renderer is WebGPU with a WebGL fallback.

## Out of scope

- Undocumented extensions (Beeline, CAM360, DataPersistence, DOF, Fusion360.Simulation, MSDF, OMV,
  PropertyQuery, PropertySearch, Scalaris, ScalarisSimulation, ReCap, MemoryLimitedDebug) are
  retired with no replacement. Report them and recommend removal.
- AR/VR/WebXR integrations have no v8 equivalent. Report them as unsupported.
