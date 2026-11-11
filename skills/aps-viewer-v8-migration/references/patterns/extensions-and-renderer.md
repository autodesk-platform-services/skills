# Extensions and renderer-specific code (P12, P14, P16, P20, P22)

## P12. `Autodesk.DataVisualization` replacement

Deprecated in v7 (loading it logs a warning) and no longer registered in v8, so
`loadExtension('Autodesk.DataVisualization')` fails. There's no drop-in replacement. Split the
migration by feature:

| DataVisualization feature | v8 pattern |
| --- | --- |
| Sprites/icons (`ViewableData`, `SpriteViewable`) | **Default, fewer than ~1,000 markers:** HTML elements over the viewer canvas, repositioned with `viewer.worldToClient` on `av.CAMERA_CHANGE_EVENT`. Full CSS and DOM events, accessible. **Many markers:** an overlay render layer (`scene-content.md`, P2) with `avs.PointsMaterial` + `map` (one point per marker, `size` in px), or textured quads with `avs.UnlitMaterial`. Hover and click via `dbId` on instances. |
| Tooltips on hover | A DOM tooltip driven by `viewer.hitTest` on `mousemove` (or DOM events with HTML markers). |
| Heatmaps / surface shading | `viewer.setThemingColor` per room or element `dbId`, with the color computed from the sensor value. Flat color per object only; gradient shading is a gap until heatmap support ships. |
| Rooms via `ModelStructureInfo` / `getLevelRoomsMap` | Query room objects with `model.searchAsync` or property queries (for example, Revit category "Rooms"), then theme them. Rooms must be included in the translated view. |
| Time slider (`TimeSlider` UI) | An app-owned UI component that re-themes on change. |

Present the theming approach to heatmaps as an interim solution.

HTML marker sketch:

```js
const markers = sensors.map((sensor) => {
    const el = document.createElement('div');
    el.className = 'sensor-marker';
    viewer.container.appendChild(el);
    return { el, position: new avm.Vector3(sensor.x, sensor.y, sensor.z) };
});

function updateMarkers() {
    for (const { el, position } of markers) {
        const { x, y } = viewer.worldToClient(position);
        el.style.transform = `translate(${x}px, ${y}px)`;
    }
}
viewer.addEventListener(av.CAMERA_CHANGE_EVENT, updateMarkers);
updateMarkers();
```

## P14. WebGL-specific code

- Remove `viewer.impl.glrenderer()`, `getContext('webgl')`, `webglcontextlost` handlers,
  `preserveDrawingBuffer` tweaks, custom post-processing passes, and WebXR sessions bound to the
  WebGL context.
- Screenshots: use `viewer.getScreenShot(width, height, callback, overlayRenderer)` instead of
  reading back the canvas.
- The viewer uses WebGPU whenever the browser can create a WebGPU device and falls back to WebGL
  automatically otherwise. Remove any `PublicFeatureFlags.WebGPU` toggle; the flag doesn't exist in
  v8.
- Forcing WebGL with the Initializer option `renderer: 'webgl'` is a deprecated escape hatch only
  (WebGL "may lack newer features"). If you use it, label it deprecated in a code comment and a
  TODO, and never present it as the fix:

  ```js
  // DEPRECATED: forces the WebGL fallback. TODO: remove once <issue> is fixed on WebGPU.
  await Autodesk.Viewing.Initializer({ ...options, renderer: 'webgl' });
  ```
- AR/VR/XR: report as unsupported. No pattern.
- Ask users with WebGPU problems to check `navigator.gpu` in their browser, and to test on a
  supported browser before changing code. If many objects drop out of view while navigating, the
  v8 requirements page recommends lowering the Target Frame Rate setting.

## P16. Retired documented extensions

| Extension | Replacement |
| --- | --- |
| `Autodesk.FullScreen` | Browser Fullscreen API on the viewer container: `viewer.container.requestFullscreen()`, then `viewer.resize()` on `fullscreenchange`. |
| `Autodesk.BIM360.GestureDocumentNavigation` | None. A custom `ToolInterface` that handles gestures, if needed. |
| `Autodesk.NPR` | None. Closest: `viewer.setDisplayEdges(true)` with a light preset and background. Report as a gap. |
| `Autodesk.DWF` | None. The extension isn't available in v8. Delete the load call, and report DWF viewing as unsupported. |
| `Autodesk.Viewing.SceneBuilder` | `scene-content.md`, P4 |
| `Autodesk.DataVisualization` | P12 above |
| `Autodesk.MemoryLimited` | Remove; LME is always on (`loaded-models.md`, P13). |
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

## P20. Custom extensions and viewer subclasses must be ES6 classes

In v8, custom extensions must be ES6 classes that extend `Autodesk.Viewing.Extension`;
`Autodesk.Viewing.Extension.call(this, viewer, options)` isn't supported. The same applies to
subclasses of `Viewer3D`, `GuiViewer3D`, `Document`, `FileLoader`, `Profile`, `Navigation`,
`ViewingUtilities`, and `Snapper`. ES5 constructors that call `Parent.call(this, ...)` aren't supported on v8.

`ToolInterface` and the `Autodesk.Viewing.UI` classes (`DockingPanel`, `Button`, `ToolBar`, …) are
ES6 classes too. The changelog says ES5-style subclasses of them keep working, but port them in
the same pass so the code base uses one style.

```js
// v7 (ES5)
function MyExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}
MyExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
MyExtension.prototype.constructor = MyExtension;
MyExtension.prototype.load = function () { return true; };
MyExtension.prototype.unload = function () { return true; };

// v8
class MyExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
    }
    load() { return true; }
    unload() { return true; }
}

Autodesk.Viewing.theExtensionManager.registerExtension('MyExtension', MyExtension);
```

Rules:

- Move prototype methods into the class body. Keep `this` bindings for event handlers explicit
  (`this.onSelection = this.onSelection.bind(this)` in the constructor, or arrow-function fields).
- `Object.create(Parent.prototype)`, `Parent.prototype.method.call(this, ...)`, and
  `Parent.call(this, ...)` become `extends`, `super.method(...)`, and `super(...)`.
- Panels: `function MyPanel(...) { Autodesk.Viewing.UI.DockingPanel.call(this, ...) }` becomes
  `class MyPanel extends Autodesk.Viewing.UI.DockingPanel`. Call `super(...)` before touching
  `this`.
- Transpiled code: make sure the build doesn't down-level classes to ES5 functions (for example,
  Babel `preset-env` targeting old browsers, or TypeScript `target: "ES5"`). Target ES2015 or later.
- Both forms run on v7, so port extensions to classes while you're still on v7.

## P22. UI subclasses and viewer DOM coupling

**Subclassing.** The v8 reference documents `Autodesk.Viewing.UI.PropertyPanel` (its `options` are
"currently unused"), `ObjectContextMenu`, `Tree`, `DataTable`, `DockingPanel`, `Button`,
`ComboButton`, `ControlGroup`, `ToolBar`, `ModelStructurePanel`, and `SettingsPanel`. It doesn't
document these, and each is a gap to report when the app subclasses or calls it:

- `ViewerPropertyPanel` (and `Autodesk.Viewing.Extensions.ViewerPropertyPanel`), including
  `setAggregatedProperties.call(this, ...)`, `requestProperties`, `this.tree.createElement_`, and
  `myRootContainer`. Property-panel customization has no documented pattern. Closest: extend
  `PropertyPanel`, and use the Properties Manager extension (`Autodesk.PropertiesManager`) for
  the stock panel. Keep the customization on v7 until the user confirms behavior on v8.
- `ViewerObjectContextMenu` (use `ObjectContextMenu`), `UI.TreeDelegate`, and
  `registerContextMenuCallback` (check it against `ObjectContextMenu` and the Viewer3D reference).
- Protected `DockingPanel` members (`createTitleBar`, `initializeMoveHandlers`, `createFooter`,
  `createScrollContainer`, `dockRight`): only `initialize` is documented. Builds that call them
  work only if the member survives; ask the user to test and report it.

Port these to ES6 classes (P20) in the same pass.

**DOM and CSS coupling.** Don't depend on the viewer's own DOM or class names. Selectors such as
`.adsk-viewing-viewer`, `docking-panel-container-solid-color-a`, `.adsk-button-icon`,
`button.container.children[0]`, jQuery injection into the viewer's inner elements, and direct
edits of `viewer.canvas.width` or `viewer.clientContainer` can change without notice.

- Add your own elements to the container element you passed to the viewer constructor,
  and size the viewer by resizing that element, then call `viewer.resize()`.
- Style your own classes. For toolbar buttons use the `Button` API (`setIcon`, `setToolTip`,
  `onClick`) instead of reaching into `button.container`.
- Writing to the canvas size directly (the "resizer" extension pattern) isn't a documented way to
  size the viewer; replace it with a container resize plus `viewer.resize()`.
- Where a style override is unavoidable, scope it to your own wrapper and ask the user to check it
  on v8.
