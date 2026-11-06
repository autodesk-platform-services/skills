# Known gaps in v8

Features below have no documented v8 equivalent. Don't work around them with internals or invented
APIs. List each one in the "Gaps" section of the migration plan with:

1. What the feature does today, and where (`file:line`).
2. The closest documented option, if there is one, and what it loses.
3. A recommendation: drop the feature, keep it on v7 for now, or accept the approximation.
4. A pointer to report the need to Autodesk through [APS support](https://aps.autodesk.com/get-help),
   so it can be considered for v8.

| Gap | Closest documented option |
| --- | --- |
| Custom shaders (`ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile`) | Built-in materials with `vertexColors`, textures, or `setThemingColor`. There are no plans for custom materials at the moment. |
| Dashed or textured lines, lines thicker than 1 px | `LineMaterial` (always 1 px, solid). For thick lines, build thin quads or tubes as triangle geometry. `viewer.setScreenSpaceLineWidth(true)` only keeps line width constant while zooming (WebGPU only); it doesn't make lines thicker. |
| Gradient heatmaps / surface shading (DataVisualization) | Flat `setThemingColor` per room or element. Heatmap support is planned, with no published date. |
| Arbitrary-ray intersection (not from a screen point) | None. `viewer.hitTest(x, y)` covers screen-space picking only. For a point on a plane under the cursor, see the plane picking recipe in `patterns/camera-and-picking.md`. |
| Three.js `TransformControls` gizmos | Handles in an overlay render layer plus a drag on a plane (`patterns/camera-and-picking.md`). |
| Libraries that need a global `THREE` (ThreeCSG/ThreeBSP and similar) | None in the viewer. Run them on a separate three.js copy and convert the output to `avs.BufferGeometry`, or drop the feature. |
| AR/VR/WebXR | None. |
| WebGL context access, custom post-processing passes | None. Use `viewer.getScreenShot` for image export. |
| Changing parameters of materials that came from a loaded model | None. `getMaterial()` returns an opaque `avs.InternalMaterial`; replace it with a new built-in material instead. |
| `viewer.searchText` (property panel highlighting of the last search) | None. Removed in v8. |
| `Autodesk.NPR` (non-photorealistic rendering) | `viewer.setDisplayEdges(true)` with a light preset and background. |
| `Autodesk.BIM360.GestureDocumentNavigation` | A custom `ToolInterface` that handles gestures. |
| Third-party three.js renderers in the viewer scene (Potree, geo-three, map tiles) | Rebuild the content as Scene API geometry (P4/P5), or render it in a separate canvas. |
| Undocumented extensions (Beeline, CAM360, DataPersistence, DOF, Fusion360.Simulation, MSDF, OMV, PropertyQuery, PropertySearch, Scalaris, ScalarisSimulation, ReCap, MemoryLimited, MemoryLimitedDebug) | None. Recommend removing the dependent feature. |
| `Autodesk.GoHome`, `Autodesk.ViewerSettings` (not in the v8 reference) | `viewer.fitToView()`/`restoreState()` for home; the built-in settings panel or `viewer.getPreferences()` for settings. |

## Known issues to report

These are bugs or undocumented behavior seen during migrations, not missing features. Report them
to Autodesk with the steps that reproduce them, and tell the user what you changed to work around
them.

| Issue | Workaround |
| --- | --- |
| With `env: 'AutodeskProduction'`, moving loaded instances makes `model.getBoundingBox()` throw `e.makeEmpty is not a function` (from `ensureModelBBoxUpToDate`). Not isolated: the usage hint and node grouping changed in the same step. | `env: 'AutodeskProduction2', api: 'streamingV2'` (`patterns/loading-and-init.md`, P18). |
| `new avs.Color(...)` reportedly throws `undefined is not a constructor`, although the reference documents it. | Hex numbers for colors. |
| `viewer.navigation` and `model.getInstances()` are used in the v8 guides but missing from the `Viewer3D`/`Model` reference pages. | Use them; mention the docs gap. |
