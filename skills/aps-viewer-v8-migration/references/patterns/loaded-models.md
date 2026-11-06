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
prefer the documented load options (`placementTransform`, `applyScaling`, and `globalOffset` with
Aggregated View) over moving instances.

Moving a group: either call `group.updateTransformWorld(true)` on the moved node (as the v8
"Wrapping Loaded Instances" guide does), or `markDirty()` each changed node and call
`root.updateTransformWorld()` once per frame (the "Detach and Reattach" guide). Use the second form
when many nodes change per frame.

**Usage hints.** Loaded models default to `avs.UsageHint.Static`: after instances are added,
removed, moved, or get new geometry, the model is optimized again, and added instances appear only
once that's done. For animations and other frequent changes, call
`instances.setUsageHint(avs.UsageHint.Dynamic)` first. Programmatically created models default to
`Dynamic`. `add` and `remove` work on loaded models only after they've finished loading.

## P9. Fragment-level visibility → instance visibility states

- Object-level: keep `viewer.hide`/`show`/`isolate`/`setGhosting` (documented, unchanged).
- Sub-object or custom content:
  `instances.setVisibilityState(id, avs.VisibilityState.Hidden)` hides an instance. Pass
  `avs.VisibilityState.Ghosted` or `avs.VisibilityState.Visible` instead for those states.
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
| `model.getPropertySet(dbIds, ...)` | `await model.getPropertySetAsync(dbIds, options)` |
| `model.getExternalIdMapping(cb)` | `await model.getExternalIdMappingAsync()` |
| `model.getLayerToNodeIdMapping(cb)` | `await model.getLayerToNodeIdMappingAsync()` |
| `model.getObjectTree(cb)` (callbacks) | `await model.getObjectTreeAsync()` |
| `model.search(...)` / `viewer.search(...)` | `await model.searchAsync(...)` |
| `viewer.getProperties(dbId, cb)` | `await model.getPropertiesAsync(dbId)` on the model |
| `viewer.getObjectTree(cb)` | `await model.getObjectTreeAsync()` on the model |
| `viewer.overlays`, `viewer.layers`, `OverlayManager` | Render layers via `viewer.getRenderLayers()` (`scene-content.md`, P2) |
| `viewer.impl.scene`/`sceneAfter` | Main-pass render layers (`scene-content.md`, P3) |
| `viewer.prefs` | `viewer.getPreferences()` (`get`, `set`, `addListeners`, `removeListeners`) |
| `GuiViewer3D#setPropertiesOnSelect(value)` | `viewer.getPreferences().set(av.Prefs.OPEN_PROPERTIES_ON_SELECT, value)` |
| `av.Private.Prefs`, `Prefs2D`, `Prefs3D`, `Preferences` | `av.Prefs`, `av.Prefs2D`, `av.Prefs3D`, `av.Preferences` |
| `av.Private.PropDbLoader`, `av.Private.PropertyDatabase` | `av.PropDbLoader`, `av.PropertyDatabase` |
| `av.Private.VIEW_TYPES`, `av.Private.FPS_TARGET_MODES` | `av.VIEW_TYPES`, `av.FPS_TARGET_MODES` |
| `av.UnifiedCamera` | `av.Camera` (`camera-and-picking.md`, P10) |
| `viewer.searchText` | Removed. Drop the feature. |
| `instances.getCount()` | `instances.getMaxIndex()` (highest instance id; doesn't decrease on `remove`) |

Check the exact `*Async` signatures (argument order, options objects) in the reference with the
`aps-docs-portal` skill before rewriting calls; they're not always a 1:1 callback-to-promise swap.
When an `*Async` method rejects, the reason is always an `Error`, so replace error callbacks with
`try/catch` and read `err.message`.

Other members of `Autodesk.Viewing.Private` aren't documented in v8 (the namespace has no reference
page). Treat any remaining `av.Private.*` use as internal: map it to a documented member or report it.

Behavior changes with no rename (review the calling code, don't just search and replace):

- `viewer.setAggregateSelection(selection)` now **replaces** the selection: models omitted from the
  array are deselected. Code that called it once per model to add to the selection must pass all
  models in one call.
- Preferences (`Prefs`, `Prefs2D`, `Prefs3D`) and `VIEW_TYPES`, `FPS_TARGET_MODES`, `AttributeType`
  are frozen. Code that adds or overwrites keys on them throws in strict mode.
- `Preferences#removeListeners(name)` without callbacks no longer removes all listeners of the
  preference. Pass the callbacks you registered.
- Dithered ghosting is the default, and the WebGL-only "Ground Reflection" setting is removed.
  Screenshot-based tests of ghosted views will differ.

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

