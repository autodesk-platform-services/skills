# Working with loaded models (P8, P9, P13, P17)

For recoloring loaded elements (P7), see `materials-and-appearance.md`.

On v7, everything here that calls `model.getInstances()` on a loaded model needs
`av.PublicFeatureFlags.SceneAPI` set before the Initializer.

## P8. Moving or animating loaded parts

```js
// v7 (internal)
tree.enumNodeFragments(dbId, (fragId) => {
    const proxy = viewer.impl.getFragmentProxy(model, fragId);
    proxy.getAnimTransform();
    proxy.position.z += 10;
    proxy.updateAnimTransform();
}, true);
viewer.impl.sceneUpdated(true);

// v8
const instances = model.getInstances();
const tree = await model.getObjectTreeAsync();
const root = instances.getSceneGraph(true);
const group = new avs.Node3D();
root.add(group);
tree.enumNodeInstances(dbId, (id) => {
    if (instances.getGeometry(id)) avs.InstanceNode3D.fromInstance(id, group);
}, true);
group.position.z += 10;
group.markDirty();
root.updateTransformWorld();
viewer.refresh(true);
```

For a single instance without hierarchy, `instances.setTransformWorld(id, matrix)` is enough. This
covers explode-style tools, configurators, and 4D/phasing animations. For multi-model alignment,
prefer the documented load options (`placementTransform`, `globalOffset`) over moving instances.

## P9. Fragment-level visibility → instance visibility states

- Object-level: keep `viewer.hide`/`show`/`isolate`/`setGhosting` (documented, unchanged).
- Sub-object or custom content:
  `instances.setVisibilityState(id, avs.VisibilityState.Hidden | avs.VisibilityState.Ghosted | avs.VisibilityState.Visible)`.
- Replace `viewer.impl.visibilityManager.setNodeOff`, `model.getFragmentList().setVisibility`, and
  `setFragOff`.

## P13. Streamed loading (Large Model Experience always on)

- Don't do work in `GEOMETRY_LOADED_EVENT` that assumes a fixed fragment or instance order.
- Use `await model.getObjectTreeAsync()` instead of polling `getInstanceTree()` (removed) or relying
  on `OBJECT_TREE_CREATED_EVENT` timing.
- Apply theming and visibility once by `dbId`, rather than per fragment as geometry arrives.
  Whether `setThemingColor` and `isolate` apply to objects that stream in later isn't confirmed;
  ask the user to verify on a large model.
- Remove `Autodesk.MemoryLimited`, `memory`/`limit` load options, and LME feature-flag toggles.
  Which other `LoadOptions` become no-ops isn't confirmed; flag tuning options for the user to test.
- Selective loading (`loadDocumentNode` with `ids` or `filter`): keep it, and ask the user to verify
  it behaves the same.
- Event handlers (selection, hover, camera) may fire in a different order than in v7. Don't chain
  logic on event order.

## P17. Internal and removed APIs

APIs deprecated in v7 are removed or renamed for internal use in v8. Every hit is a required change:

| v7 | v8 |
| --- | --- |
| `model.getInstanceTree()` | `await model.getObjectTreeAsync()` |
| `model.getProperties(dbId, cb)` | `await model.getPropertiesAsync(dbId)` |
| `model.getBulkProperties(...)` | `await model.getBulkPropertiesAsync(...)` |
| `model.getPropertySet(...)` | `await model.getPropertySetAsync(...)` |
| `model.getExternalIdMapping(cb)` | `await model.getExternalIdMappingAsync()` |
| `model.search(...)` / `viewer.search(...)` | `await model.searchAsync(...)` |
| `viewer.overlays`, `OverlayManager` | Render layers (`scene-content.md`, P2) |
| `viewer.impl.scene`/`sceneAfter` | Main-pass render layers (`scene-content.md`, P3) |

Check the exact `*Async` signatures (argument order, options objects) in the reference with the
`aps-docs-portal` skill before rewriting calls; they're not always a 1:1 callback-to-promise swap.

Anything else on `viewer.impl`, `model.getFragmentList()`, `model.getGeometryList()`,
`viewer.impl.matman()`, `viewer.impl.getFragmentProxy`, `NOP_VIEWER`, underscore-prefixed members,
or members that aren't in the reference guide: map it to a documented equivalent, or report "no
documented equivalent" in the plan. `NOP_VIEWER` is a debugging global; pass the viewer instance
explicitly instead.
