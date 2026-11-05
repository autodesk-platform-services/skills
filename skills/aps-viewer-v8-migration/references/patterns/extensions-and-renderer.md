# Retired extensions and renderer-specific code (P12, P14, P16)

## P12. `Autodesk.DataVisualization` replacement

There's no drop-in replacement. Split the migration by feature:

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
- Forcing WebGL (through the renderer Initializer option or by disabling
  `PublicFeatureFlags.WebGPU`) is a temporary escape hatch only. If you use it, label it deprecated
  in a code comment and a TODO, and never present it as the fix. Look up the exact option name in
  the reference before writing it.
- AR/VR/XR: report as unsupported. No pattern.
- Ask users with WebGPU problems to check `navigator.gpu` in their browser, and to test on a
  supported browser before changing code.

## P16. Retired documented extensions

| Extension | Replacement |
| --- | --- |
| `Autodesk.FullScreen` | Browser Fullscreen API on the viewer container: `viewer.container.requestFullscreen()`, then `viewer.resize()` on `fullscreenchange`. |
| `Autodesk.BIM360.GestureDocumentNavigation` | None. A custom `ToolInterface` that handles gestures, if needed. |
| `Autodesk.NPR` | None. Closest: `viewer.setDisplayEdges(true)` with a light preset and background. Report as a gap. |
| `Autodesk.Viewing.SceneBuilder` | `scene-content.md`, P4 |
| `Autodesk.DataVisualization` | P12 above |
| `Autodesk.MemoryLimited` | Remove; LME is always on (`loaded-models.md`, P13). |

```js
// Autodesk.FullScreen replacement
fullscreenButton.onClick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else viewer.container.requestFullscreen();
};
document.addEventListener('fullscreenchange', () => viewer.resize());
```

Undocumented retired extensions: report them and recommend removing the dependent feature (see
`../gaps.md`).

Status unconfirmed for v8: DWF, glTF, SmartSection, and Wireframes extensions. If the app uses
them, ask the user to test them on the v8 preview early.
