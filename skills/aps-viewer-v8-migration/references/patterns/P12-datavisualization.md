# P12. `Autodesk.DataVisualization` replacement

Deprecated in v7 (loading it logs a warning) and no longer registered in v8, so
`loadExtension('Autodesk.DataVisualization')` fails. There's no drop-in replacement. Split the
migration by feature:

| DataVisualization feature | v8 pattern |
| --- | --- |
| Sprites/icons (`ViewableData`, `SpriteViewable`) | **Default, fewer than ~1,000 markers:** HTML elements over the viewer canvas, repositioned with `viewer.worldToClient` on `av.CAMERA_CHANGE_EVENT`. Full CSS and DOM events, accessible. **Many markers:** an overlay render layer (`P02-overlays-to-render-layers.md`) with `avs.PointsMaterial` + `map` (one point per marker, `size` in px), or textured quads with `avs.UnlitMaterial`. Hover and click via `dbId` on instances. |
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
