# Viewer v8 breaking changes

Sources: the [Viewer v8 developer's guide and reference](https://aps.autodesk.com/en/docs/viewer/v8/developers_guide/overview/)
and the [v7 changelog](https://aps.autodesk.com/en/docs/viewer/v8/change_history/changelog_v7/)
(7.131.0 and later list the v8 changes with a `v8:` prefix). The
[v8 preview announcement](https://aps.autodesk.com/blog/aps-viewer-v8-preview-here) and
[Introducing the Scene API](https://aps.autodesk.com/blog/introducing-scene-api-aps-viewer) blog
posts add context. When they disagree, the reference and the changelog win.

| ID | Breaking change | Patterns |
| --- | --- | --- |
| B1 | three.js objects are no longer exposed in the public API: `THREE.*`, the camera derived from `THREE.Camera`, and three.js math types. | P5, P10, P11 |
| B2 | `viewer.overlays`, `viewer.layers`, `OverlayManager`, `viewer.impl.scene`/`sceneAfter`, and `Autodesk.Viewing.SceneBuilder` are replaced by the Scene API and render layers (`viewer.getRenderLayers()`). | P2, P3, P4 |
| B3 | Only documented functionality is supported. `viewer.impl`, `Autodesk.Viewing.Private`, and other internals can change without notice. | P17 |
| B4 | Custom materials and shaders are replaced by four built-in materials: `StandardMaterial`, `UnlitMaterial`, `LineMaterial`, and `PointsMaterial`. Materials read from loaded models are opaque `InternalMaterial` references. There are no plans for custom materials at the moment. | P6, P7 |
| B5 | Large Model Experience (LME) is always on: streamed, progressive loading, a different load order, and no legacy pipeline. The "Large model experience" setting and `Autodesk.MemoryLimited` are removed. | P13 |
| B6 | WebGPU renderer, with an automatic WebGL fallback when no WebGPU device is available. The app can force WebGL with the deprecated Initializer option `renderer: 'webgl'`. | P14 |
| B7 | A secure context is required: HTTPS or `localhost`. The Initializer promise rejects otherwise. SVF2 needs WebSockets (no HTTP fallback), and geometry caching uses OPFS only. | P15 |
| B8 | Retired documented extensions: `Autodesk.FullScreen`, `Autodesk.BIM360.GestureDocumentNavigation`, `Autodesk.NPR`, `Autodesk.Viewing.SceneBuilder`, `Autodesk.DataVisualization` (no longer registered). Not in the v8 reference: `Autodesk.GoHome`, `Autodesk.ViewerSettings`, and several built-ins older apps load (see the table in `patterns/extensions-and-renderer.md`, P16). `Autodesk.Viewing.WebVR` and `ViewingApplication` were already removed in v7. Retired undocumented extensions: Beeline, CAM360, DataPersistence, DOF, Fusion360.Simulation, MemoryLimited, MemoryLimitedDebug, MSDF, OMV, PropertyQuery, PropertySearch, Scalaris, ScalarisSimulation, ReCap. | P12, P16 |
| B9 | Preview load URL: `7.*/viewer3D-v8.min.js` and `style-v8.min.css`. GA moves to `/viewers/8.*`. Rolled-out and deprecated feature flags (`SceneAPI`, `LargeModelExperience`, `WebGPU`) are removed from `PublicFeatureFlags`, and flags are immutable after initialization. | P1 |
| B10 | APIs deprecated in v7 are removed or renamed for internal use: `Model.getInstanceTree`, the sync property methods (`getProperties`, `getProperties2`, `getBulkProperties`, `getBulkProperties2`, `getPropertySet`, `getExternalIdMapping`, `getLayerToNodeIdMapping`, `search`, …), `Viewer3D#getProperties/getObjectTree/search`, `OverlayManager`, `Viewer3D.scene`/`sceneAfter`, `UnifiedCamera`, `viewer.prefs`, `viewer.searchText`, `GuiViewer3D#setPropertiesOnSelect`, and `Autodesk.Viewing.Private.Prefs*`/`Preferences`/`PropDbLoader`/`PropertyDatabase`/`VIEW_TYPES`/`FPS_TARGET_MODES`. `InstanceCollection3D#getCount` is now `getMaxIndex`. Existing calls break. | P13, P17 |
| B11 | `Autodesk.Viewing.Initializer` must complete before instantiating `Viewer3D`/`GuiViewer3D` (or a `MultiViewerFactory`); otherwise the constructor throws. The Initializer returns a promise; the callback parameter is deprecated. | P18 |
| B12 | Custom extensions, and subclasses of `Viewer3D`, `GuiViewer3D`, `Document`, `FileLoader`, `Profile`, `Navigation`, `ViewingUtilities`, and `Snapper`, must be ES6 classes. `Parent.call(this, ...)` constructors aren't supported. | P20 |
| B13 | Behavior changes: `setAggregateSelection` replaces the selection, preferences and enum-like constants are frozen, `Preferences#removeListeners(name)` needs the callbacks, dithered ghosting is the default, and Ground Reflection is removed. | P17 |

## What usually breaks, by feature area

High risk:

- **ES5-style extensions and viewer subclasses**: `Autodesk.Viewing.Extension.call(this, ...)` and `prototype = Object.create(...)` break. Common in older apps and samples. (P20)
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
- **Initialization and hosting**: new script URLs, secure context, removed feature flags, mandatory Initializer promise, WebSockets for SVF2 behind proxies. (P1, P15, P18)
- **Offline and on-prem viewing**: plain-HTTP intranet hosting isn't a secure context; top-level
  `file://` may be treated as trustworthy. Check `window.isSecureContext` and `navigator.gpu` in the
  actual host, separately from Viewer local-model-loading support. (P15, P18)
- **Embedding in host platforms**: iframes in SharePoint/Dynamics, Power BI visuals, WebView2, Capacitor/Ionic custom schemes may not provide a secure context or WebGPU. TypeScript typings that pull in three.js types break. (P15, P5)
- **Multi-model alignment**: load options (`placementTransform`, `applyScaling`, and `globalOffset` in Aggregated View) are documented in v8, but alignment code that builds `THREE.Matrix4` or moves fragments through `viewer.impl` breaks. (P5, P8)
- **2D sheets and 2D↔3D mapping**: helpers that take or return `THREE.Matrix4`/`THREE.Vector3`, and line-weight/color hacks via internal 2D materials. (P5, P17)
- **Pushpins and issue markers**: usually built on DataVisualization sprites or three.js overlays. (P12, P2)
- **Model browser and property panel**: `getInstanceTree` and the sync property methods are removed. The `*Async` replacements already exist in v7. `viewer.prefs` and `setPropertiesOnSelect` move to `viewer.getPreferences()`. (P17)
- **Multi-model selection**: `setAggregateSelection` now replaces the selection instead of merging per model. (P17)

Low risk (documented APIs mostly survive; check for internals):

- Selection, isolation, visibility, ghosting: documented `isolate`/`hide`/`show`/`setGhosting` stay; fragment-level hiding moves. (P9, P13)
- Custom extensions, toolbar, panels: Extension/ToolInterface/UI APIs stay, but extensions must be ES6 classes. `Autodesk.FullScreen` is gone. (P16, P20)
- Section planes: cut planes passed as `THREE.Vector4` become `avm.Vector4`. (P5)
- Measurement and snapping: `SnapResult` geometry and custom snappers that touch three.js types. (P5)
- Screenshots: `getScreenShot` stays; WebGL canvas readback breaks under WebGPU. (P14)
- Events: streamed loading changes event timing and order. (P13)
- Background and environment: hacks via `viewer.impl.renderer()`/`setClearColor` break; documented `setBackgroundColor`/`setLightPreset` remain. (P17)
- Markups and Edit2D: documented in the v8 guide with no change announced. Check whether shape coordinates use three.js types. (P5)
