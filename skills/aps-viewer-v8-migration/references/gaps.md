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
| Dashed or textured lines, lines thicker than 1 px | `LineMaterial` (1 px, solid). `viewer.setScreenSpaceLineWidth()` exists but requires WebGPU; check the reference before relying on it. |
| Gradient heatmaps / surface shading (DataVisualization) | Flat `setThemingColor` per room or element. Heatmap support is planned, with no published date. |
| Arbitrary-ray intersection (not from a screen point) | None. `viewer.hitTest(x, y)` covers screen-space picking only. |
| AR/VR/WebXR | None. |
| WebGL context access, custom post-processing passes | None. Use `viewer.getScreenShot` for image export. |
| `Autodesk.NPR` (non-photorealistic rendering) | `viewer.setDisplayEdges(true)` with a light preset and background. |
| `Autodesk.BIM360.GestureDocumentNavigation` | A custom `ToolInterface` that handles gestures. |
| Third-party three.js renderers in the viewer scene (Potree, geo-three, map tiles) | Rebuild the content as Scene API geometry (P4/P5), or render it in a separate canvas. |
| Undocumented extensions (Beeline, CAM360, DataPersistence, DOF, Fusion360.Simulation, MSDF, OMV, PropertyQuery, PropertySearch, Scalaris, ScalarisSimulation, ReCap, MemoryLimited, MemoryLimitedDebug) | None. Recommend removing the dependent feature. |
