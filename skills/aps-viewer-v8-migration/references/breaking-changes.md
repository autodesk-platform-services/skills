# Viewer v8 breaking changes

Sources: [APS Viewer v8 preview announcement](https://aps.autodesk.com/blog/aps-viewer-v8-preview-here),
[Introducing the Scene API](https://aps.autodesk.com/blog/introducing-scene-api-aps-viewer), and the
v7 Scene API developer guide and reference.

| ID | Breaking change | Patterns |
| --- | --- | --- |
| B1 | three.js objects are no longer exposed in the public API: `THREE.*`, the camera derived from `THREE.Camera`, and three.js math types. | P5, P10, P11 |
| B2 | `viewer.overlays` (`OverlayManager`), `viewer.impl.scene`/`sceneAfter`, and `Autodesk.Viewing.SceneBuilder` are replaced by the Scene API and render layers. | P2, P3, P4 |
| B3 | Only documented functionality is supported. `viewer.impl` and other internals can change without notice. | P17 |
| B4 | Custom materials and shaders are replaced by four built-in materials: `StandardMaterial`, `UnlitMaterial`, `LineMaterial`, and `PointsMaterial`. Custom materials may come later as a backwards-compatible change, but there are no plans at the moment. | P6, P7 |
| B5 | Large Model Experience (LME) is always on: streamed, progressive loading, a different load order, and no legacy pipeline. `Autodesk.MemoryLimited` is removed. `PublicFeatureFlags.LargeModelExperience` is deprecated. | P13 |
| B6 | WebGPU renderer. WebGL remains only as a deprecated fallback that the app (not the user) can force. `PublicFeatureFlags.WebGPU` is deprecated. | P14 |
| B7 | A secure context is required: HTTPS or `localhost`. | P15 |
| B8 | Retired documented extensions: `Autodesk.FullScreen`, `Autodesk.BIM360.GestureDocumentNavigation`, `Autodesk.NPR`, `Autodesk.Viewing.SceneBuilder`, `Autodesk.DataVisualization`. Retired undocumented extensions: Beeline, CAM360, DataPersistence, DOF, Fusion360.Simulation, MemoryLimited, MemoryLimitedDebug, MSDF, OMV, PropertyQuery, PropertySearch, Scalaris, ScalarisSimulation, ReCap. | P12, P16 |
| B9 | Preview load URL: `7.*/viewer3D-v8.min.js` and `style-v8.min.css`. GA moves to `/viewers/8.*`. | P1 |
| B10 | APIs deprecated in v7 are removed or renamed for internal use, not just unsupported: `Model.getInstanceTree`, the sync property methods (`getProperties`, `getBulkProperties`, `getPropertySet`, `getExternalIdMapping`, `search`, …), `OverlayManager`, `Viewer3D.scene`/`sceneAfter`. Existing calls break. | P13, P17 |
| B11 | `Autodesk.Viewing.Initializer` must be called, and its callback reached, before instantiating `Viewer3D`/`GuiViewer3D`. v7 didn't require it. | P18 |

## What usually breaks, by feature area

High risk:

- **Custom geometry, three.js overlays, SceneBuilder**: `THREE.Mesh` + `viewer.overlays`/SceneBuilder all move. Third-party three.js integrations (Potree, geo-three, map tiles) lose their hook into the scene. (P2–P5)
- **Materials, shaders, edges**: `setThemingColor` survives; custom `THREE.*Material`, `ShaderMaterial`, and material swaps through `viewer.impl.matman()` and fragment lists don't. (P6, P7)
- **Data Visualization extension**: removed outright. Sprites, heatmaps, `ModelStructureInfo` rooms all depend on it. (P12)
- **Custom loaders**: loaders that parse into `THREE.BufferGeometry` and inject into overlays lose both their types and their injection point. (P2, P4, P5)
- **AR/VR/XR**: WebXR integrations drive a three.js/WebGL renderer. No documented equivalent. (gap)

Medium risk:

- **Camera and navigation**: code that mutates `camera.position`, calls three.js camera methods, or uses `viewer.impl.camera`. Documented `Navigation`/`getState`/`restoreState` paths are fine. (P10)
- **Raycasting and spatial queries**: `THREE.Raycaster`, `viewer.impl.rayIntersect`, `viewportToRay`, `vector.project(camera)`. (P11)
- **Bounds and extents**: per-object or per-selection bounding boxes built from `getFragmentList().getWorldBounds`, `fragList.boxes`, or `enumNodeFragments`. Documented instance and model bounds replace them. (P19)
- **Performance tuning**: `MemoryLimited` config, LME toggles, WebGL context-loss handlers become no-ops or break. (P13, P14)
- **Initialization and hosting**: new script URLs, secure context, deprecated feature flags, mandatory Initializer. (P1, P15, P18)
- **Offline and on-prem viewing**: `file://` and plain-HTTP intranet hosting aren't secure contexts. (P15, P18)
- **Embedding in host platforms**: iframes in SharePoint/Dynamics, Power BI visuals, WebView2, Capacitor/Ionic custom schemes may not provide a secure context or WebGPU. TypeScript typings that pull in three.js types break. (P15, P5)
- **Multi-model alignment**: load options (`placementTransform`, `globalOffset`) aren't called out as changing, but alignment code that builds `THREE.Matrix4` or moves fragments through `viewer.impl` breaks. (P5, P8)
- **2D sheets and 2D↔3D mapping**: helpers that take or return `THREE.Matrix4`/`THREE.Vector3`, and line-weight/color hacks via internal 2D materials. (P5, P17)
- **Pushpins and issue markers**: usually built on DataVisualization sprites or three.js overlays. (P12, P2)
- **Model browser and property panel**: `getInstanceTree` and the sync property methods are removed. The `*Async` replacements already exist in v7. (P17)

Low risk (documented APIs mostly survive; check for internals):

- Selection, isolation, visibility, ghosting: documented `isolate`/`hide`/`show`/`setGhosting` stay; fragment-level hiding moves. (P9, P13)
- Custom extensions, toolbar, panels: Extension/ToolInterface/UI APIs stay. `Autodesk.FullScreen` is gone. (P16, P11)
- Section planes: cut planes passed as `THREE.Vector4` become `avm.Vector4`. (P5)
- Measurement and snapping: `SnapResult` geometry and custom snappers that touch three.js types. (P5)
- Screenshots: `getScreenShot` stays; WebGL canvas readback breaks under WebGPU. (P14)
- Events: streamed loading changes event timing and order. (P13)
- Background and environment: hacks via `viewer.impl.renderer()`/`setClearColor` break; documented `setBackgroundColor`/`setLightPreset` remain. (P17)
- Markups and Edit2D: no change announced. Check whether shape coordinates use three.js types. (P5)
