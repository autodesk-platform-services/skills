# P16. Retired documented extensions

| Extension | Replacement |
| --- | --- |
| `Autodesk.FullScreen` | Browser Fullscreen API on the viewer container: `viewer.container.requestFullscreen()`, then `viewer.resize()` on `fullscreenchange`. |
| `Autodesk.BIM360.GestureDocumentNavigation` | None. A custom `ToolInterface` that handles gestures, if needed. |
| `Autodesk.NPR` | None. Closest: `viewer.setDisplayEdges(true)` with a light preset and background. Report as a gap. |
| `Autodesk.DWF` | None. The extension isn't available in v8. Delete the load call, and report DWF viewing as unsupported. |
| `Autodesk.Viewing.SceneBuilder` | `P04-scenebuilder-to-dynamic-model.md` |
| `Autodesk.DataVisualization` | P12 above |
| `Autodesk.MemoryLimited` | Remove; LME is always on (`P13-streaming-lme.md`). |
| `Autodesk.GoHome`, `Autodesk.ViewerSettings` | Not in the v8 reference (both were in v7). Treat as retired: for "home", use `viewer.fitToView()` or `viewer.restoreState(savedHomeState)`; for settings, use the built-in settings panel or `viewer.getPreferences()`. Ask the user to confirm on the v8 preview. |

```js
// Autodesk.FullScreen replacement
fullscreenButton.onClick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else viewer.container.requestFullscreen();
};
document.addEventListener('fullscreenchange', () => viewer.resize());
```

Built-in extensions that older apps load, and where they stand in the v8 reference:

| Extension | Status in v8 | What to do |
| --- | --- | --- |
| `Autodesk.DocumentBrowser` | Documented | Keep. |
| Explode, BimWalk, FusionOrbit, Geolocation, ViewCubeUi, ZoomWindow, LayerManager, ModelStructure, NavTools, PDF, Popout, PropertiesManager, RollCamera, Hyperlink, Animation, Section, Snapping, Wireframes, Minimap, Measure, SplitScreen, Edit2D, MarkupsCore, glTF, CrossFadeEffects | Documented (class pages in the reference) | Keep. Port any subclass or three.js use (P5, P20). |
| `Autodesk.DiffTool` | In the v8 guide ("Using DiffTool"), no reference class | Keep; ask the user to test it. |
| `Autodesk.Viewing.WebVR`, `webVR` | Removed in v7 (changelog) | Delete the load call (also when commented out) and report VR as unsupported. `experimental: ['webVR_orbitModel']` goes with it. |
| `Autodesk.AEC.LevelsExtension`, `FloorSelector` | Not in the v8 reference | Ask the user to test early. Code that reads a private `_floorSelectorFilter` has no documented replacement; report it. |
| `Autodesk.BIM360.Extension.PushPin` (the `loadItems` shape) | Not in the v8 reference | No documented replacement. Rebuild pushpins as HTML markers or overlay instances (P12 and P2), or report the gap. |
| `Autodesk.Viewing.MarkupsGui` | Not in the v8 reference (only `MarkupsCore`) | Ask the user to test the markup UI early. |
| `VisualClusters`, `StringExtractor`, `BoxSelection`, other `Autodesk.*` IDs not listed above | Not in the v8 reference | Treat as unverified: ask the user to test on the v8 preview. If one fails to load, report it with the extension ID. |
| `Autodesk.Snapping` / `Snapper` internals (`Snapping.Snapper` members beyond the documented ones) | Documented class only | Check each member used against the reference. |

Undocumented retired extensions: report them and recommend removing the dependent feature (see
`../gaps.md`).

Documented in v8: `Autodesk.glTF` ("Loading glTF 2.0 Models" guide), Wireframes, DiffTool, Edit2D,
Markups, Measure, Section, Snapping, SplitScreen, Minimap, and the other extension classes in the v8
reference. Not in the v8 reference: SmartSection. `Autodesk.DWF` is retired (see the table above). If the app uses an extension that isn't
in the v8 reference, ask the user to test it on the v8 preview early.
