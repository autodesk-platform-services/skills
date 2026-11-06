# Working with loaded models (P8, P9, P13, P17, P19)

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

## P19. Bounding boxes from fragment lists → instance and object-tree bounds

v7 code computes bounds by walking fragments and merging their boxes. v8 exposes the same
information per instance, per object, and per model.

```js
// v7 (internal)
const tree = model.getInstanceTree();
const fragList = model.getFragmentList();
const box = new THREE.Box3();
const fragBox = new THREE.Box3();
tree.enumNodeFragments(dbId, (fragId) => {
    fragList.getWorldBounds(fragId, fragBox);
    box.union(fragBox);
}, true);

// v8
const tree = await model.getObjectTreeAsync();
const instances = model.getInstances();
const box = new avm.Box3();
const instanceBox = new avm.Box3();
tree.enumNodeInstances(dbId, (id) => {
    if (!instances.getGeometry(id)) return;
    instances.getWorldBounds(id, instanceBox);
    box.union(instanceBox);
}, true);
```

| v7 | v8 |
| --- | --- |
| `fragList.getWorldBounds(fragId, box)`, `getOriginalWorldBounds` | `instances.getWorldBounds(instanceId, target)` (returns `target`) |
| `fragList.boxes` (raw `Float32Array`) | Don't read it. Use `getWorldBounds` per instance. |
| `tree.getNodeBox(dbId, float32Array)` | Same name on `ObjectTree`, still fills a 6-number `Float32Array` (min xyz, max xyz) and returns nothing. Convert with `new avm.Box3().setFromArray(arr, 0)`. |
| Union of fragment boxes for a set of `dbId`s | Loop `enumNodeInstances` per `dbId` and `box.union(...)`, as above. |
| `model.getBoundingBox()` | Same name. `getBoundingBox(ignoreTransform, excludeShadow)` returns an `avm.Box3`, or `null` if unavailable. |
| Bounds that ignore outliers (home view, fit-to-model) | `model.getFuzzyBox({ quantile, center, ignoreTransforms, allowlist })`. By default it uses the 75% of instances closest to the center of mass. |
| Bounds only to zoom to objects | `viewer.fitToView(objectIds, model, immediate)`. No box needed. |

Rules:

- Result types are `avm.Box3`, not `THREE.Box3`. Math types follow three.js r71 (see the gotchas in
  `SKILL.md`), and `Box3` has `union`, `expandByPoint`, `getCenter`, `getSize`, and
  `getBoundingSphere`.
- Skip instances without geometry (`instances.getGeometry(id)` is falsy), as in P8. Start from an
  empty box and check `box.isEmpty()` before using it, for example when a `dbId` has no geometry.
- `getWorldBounds` is documented as world-space and follows instance transforms, so bounds reflect
  any move made through P8. The reference doesn't state the coordinate space of
  `ObjectTree.getNodeBox`; if the code mixes it with `placementTransform`, `globalOffset`, or moved
  instances, compare it against `getWorldBounds` on a known object and ask the user to verify.
- Bounds are per-instance, so recompute after a transform change instead of caching the result.
- Models stream in (P13): a bounding box computed right after load may not cover geometry that
  hasn't arrived. Whether `getBoundingBox` and `getFuzzyBox` grow as geometry streams isn't
  confirmed; ask the user to verify on a large model before relying on them for camera framing.
- Bounds for a selection: get the `dbId`s from `viewer.getSelection()` (or
  `viewer.getAggregateSelection(callback)` for multiple models), then loop as above. There's no
  documented `getSelectionBounds`.
- Don't derive bounds from geometry buffers (`getPosition(i, target)` on dynamic geometry) when
  `getWorldBounds` exists. Only fall back to buffers for custom content you created yourself.

