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

// v8 (sequence from the "Wrapping Loaded Instances" guide)
const instances = model.getInstances();
const tree = await model.getObjectTreeAsync();
instances.setUsageHint(avs.UsageHint.Dynamic);   // while moving; see "Usage hints" below
const root = instances.getSceneGraph(true);
const group = new avs.Node3D();
root.add(group);
tree.enumNodeInstances(dbId, (id) => {
    if (instances.getGeometry(id)) avs.InstanceNode3D.fromInstance(id, group);
}, true);
group.position.z += 10;
group.updateTransformWorld(true);
viewer.refresh(true);

// when the drag or animation ends
instances.setUsageHint(avs.UsageHint.Static);
viewer.refresh(true);
```

For a single instance without hierarchy, `instances.setTransformWorld(id, matrix)` is enough. This
covers explode-style tools, configurators, and 4D/phasing animations. For multi-model alignment,
prefer the documented load options (`placementTransform`, `applyScaling`, and `globalOffset` with
Aggregated View) over moving instances.

Moving a group: call `group.updateTransformWorld(true)` on the moved node, as above. When many
nodes change per frame, `markDirty()` each changed node and call `root.updateTransformWorld()`
once per frame instead (the "Detach and Reattach" guide).

`Node3D.position` is relative to the parent node. The reference doesn't say whether it's in the
model's coordinates before or after `globalOffset`/`placementTransform`; when moving by a world
delta (for example, a drag distance), check on a known object that the part ends up where
expected.

If moving parts breaks bounding boxes (`e.makeEmpty is not a function` from
`ensureModelBBoxUpToDate`), check the Initializer `env` first (`loading-and-init.md`, known issue).

**Usage hints.** Loaded models default to `avs.UsageHint.Static`: after instances are added,
removed, moved, or get new geometry, the model is optimized again, and added instances appear only
once that's done. For animations and other frequent changes, call
`instances.setUsageHint(avs.UsageHint.Dynamic)` first. Programmatically created models default to
`Dynamic`. `add` and `remove` work on loaded models only after they've finished loading. Switch
back to `Static` when the interaction ends, so the model is optimized again for rendering.

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
| `model.getData().instanceTree` | `await model.getObjectTreeAsync()` |
| `model.getFragmentList()`, `fragList.getWorldBounds`, `fragList.boxes` | `instances.getWorldBounds(id, box)` (P19) |
| `viewer.impl.getFragmentProxy(...)` (moving parts) | `avs.InstanceNode3D.fromInstance` or `instances.setTransformWorld` (P8) |
| `viewer.impl.getRenderProxy(...)` (`vb`, `ib`, `vbstride`) | Instance geometry read-back (below) |
| `viewer.impl.matman()` | Built-in materials and `instances.setMaterial` (`materials-and-appearance.md`) |
| `viewer.impl.sceneUpdated(...)`, `viewer.impl.invalidate(...)` | `viewer.refresh(true)`, or `viewer.refresh(false)` for overlay-only changes |
| `viewer.impl.createOverlayScene`, `addOverlay`, `removeOverlay`, `removeOverlayScene` | Overlay render layer (`scene-content.md`, P2) |
| `viewer.impl.intersectGround(...)` | Plane picking recipe (`camera-and-picking.md`, P11) |
| `viewer.impl.camera`, `viewer.autocam`, `viewer.utilities` | `camera-and-picking.md` (P10) |
| `viewer.impl.canvas`, `viewer.impl.getCanvasBoundingClientRect()` | `getBoundingClientRect()` on the container element you passed to the viewer constructor |
| `viewer.impl.glrenderer()` | None (P14) |
| `new Autodesk.Viewing.Private.GuiViewer3D(...)` | `new Autodesk.Viewing.GuiViewer3D(...)` (documented). Common in older samples. |
| `Private.logger`, `Private.analytics` | Drop. Not documented; use `console` or the app's own logging. |
| `Private.OptionSlider`, `Private.OptionDropDown`, `Private.formatValueWithUnits` | Not documented. Build the control with the documented `UI` classes or plain DOM; format units with `model.getDisplayUnit()` and your own formatter. Report it if the user needs the helper itself. |
| `model.getProperties2(dbId, ...)` / `getBulkProperties2(...)` (and the `PropDbLoader` versions) | `await model.getPropertiesAsync(dbId, options)` / `getBulkPropertiesAsync(dbIds, options)`. The `*2` variants only skipped `externalId`; the async methods take `needsExternalId` (properties) and `propFilter` (bulk) options. |
| `model.getBulkProperties(ids, ['externalId'], cb)` (array filter) | `await model.getBulkPropertiesAsync(ids, { propFilter: ['externalId'] })`. `propFilter: null` means no filtering. |
| `model.getPropertyDb().executeUserFunction(fn, userData)` | Same call. `PropDbLoader#executeUserFunction(code, userData)` is documented in v8; the function runs on the worker against the `PropertyDatabase`. |
| `propertyDb.getObjectIds(...)`, `getObjectProperties(...)` | Not documented on `PropDbLoader`/`PropertyDatabase`. Use `model.searchAsync` and `getPropertiesAsync`. |
| `viewer.model` | Not documented. Use `viewer.getFirstModel()`, `viewer.getAllModels()`, or the model from the event or `loadDocumentNode` result. |
| `viewer.impl.visibilityManager.aggregateIsolate(...)` | `viewer.isolate(ids, model)` per model, or `viewer.setAggregateIsolation(...)` / `getAggregateIsolation()` |
| `viewer.getAggregateHiddenNodes()` | Same name, documented. Returns `{ model, ids }[]`. |
| `viewer.impl.unloadModel(model)`, `viewer.impl.findModel(id)` | `viewer.unloadModel(model)`; find a model with `viewer.getAllModels()` |
| `viewer.impl.worldToClient(point)` | `viewer.worldToClient(point, camera?)` |
| `viewer.impl.layers.showAllLayers()` and layer hacks | `viewer.setLayerVisible(nodes, visible, isolate)` / `isLayerVisible(node)` (layer nodes, not dbIds); the Layer Manager extension for UI |

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

### ObjectTree methods and "all dbIds" recipes

The v8 `ObjectTree` reference documents `getRootId`, `getNodeName`, `getNodeParentId`,
`getChildCount`, `getInstanceCount`, `getNodeType`, `isNodeHidden`, `isNodeSelectable`,
`isNodeVisibleLocked`, `isNodeExplodeLocked`, `getNodeBox`, `enumNodeChildren`,
`enumNodeInstances`, and `search(text)`.

| v7 `InstanceTree` | v8 `ObjectTree` |
| --- | --- |
| `getRootId`, `getNodeName`, `getNodeParentId`, `getChildCount`, `getNodeType`, `isNodeHidden`, `getNodeBox` | Same names |
| `enumNodeChildren(id, cb, recursive)` | Same name |
| `enumNodeFragments(id, cb, recursive)` | `enumNodeInstances(id, cb, recursive)` (P8, P19) |
| `isNodeOff(dbId)` | Not documented. Use `viewer.getAggregateHiddenNodes()` or `viewer.isNodeVisible(dbId, model)`. |
| `nodeAccess.dbIdToIndex`, `nodeAccess.*` | Not documented. Don't read it; the recipes below cover the common uses. |

```js
const tree = await model.getObjectTreeAsync();

// All dbIds (including the root and group nodes)
const all = [];
tree.enumNodeChildren(tree.getRootId(), (dbId) => { all.push(dbId); }, true);
all.push(tree.getRootId());

// Leaf nodes only (usually the objects with geometry)
const leaves = all.filter((dbId) => tree.getChildCount(dbId) === 0);
```

Don't return a truthy value from an enumeration callback unless you want to stop the loop (the
reference says a truthy result interrupts it); the braces above avoid an accidental `push` return.

### Model internals

| v7 | v8 |
| --- | --- |
| `model.getData().urn`, `model.myData.urn`, `model.loader.svfUrn`, `getSeedUrn()` | `model.getDocumentNode()?.urn()` (`BubbleNode#urn`, `lineageUrn`). For models loaded by path there's no bubble; keep the URL you passed to `loadModel`. |
| `model.getData().loadOptions.bubbleNode` | `model.getDocumentNode()` |
| `model.getData().globalOffset`, `.modelSpaceBBox` | Not documented. For aligning models, use `placementTransform`/`applyScaling` (P21) and `model.getBoundingBox(ignoreTransform)` (P19). `MultipleModelUtil`-style helpers that copy `globalOffset` between models need a rewrite. |
| `model.getData().getPDF()` | Not documented. Report it. |
| `model.getPlacementTransform()` / `setPlacementTransform(m)` (or editing `elements[12]` directly) | Not documented on `Model`. Set `placementTransform` in the load options, or move instances (P8). |
| `model.getDisplayUnit()` | Same name |
| `model.getData()` | Documented, but returns an opaque `Object`. Don't read members from it. |

`viewer.model` is not documented; see the row in the P17 table.

### Visibility, highlight, and click internals

- `viewer.impl.highlightObjectNode(...)`, `viewer.impl.clearHighlight()`: no documented
  equivalent. Closest: `viewer.select(dbIds, model)` (shows selection color) or
  `setThemingColor`. Report as a gap if the app needs a hover-only highlight.
- Monkey-patching `viewer.clickHandler.handleSingleClick`: use `viewer.setCanvasClickBehavior(...)`
  / `setClickConfig(...)` for the documented click options, or a `ToolInterface` for custom
  handling.
- `viewer.impl.fragments.fragId2dbId`, `model.getFragmentMap`, raw `fragments.boxes`: fragments
  aren't a v8 concept. Map between instances and `dbId`s with `tree.enumNodeInstances` and
  `instances.getDbId(id)`.

### Viewer settings and lifecycle

Documented on `Viewer3D` in v8: `setQualityLevel(useSAO, useFXAA)`, `setSwapBlackAndWhite`,
`setEnvMapBackground`, `setGhosting`, `setDisplayEdges`, `setGroundShadow*`, `setLightPreset`,
`setBackgroundColor`, `setTheme`, `setProgressiveRendering`, `setOptimizeNavigation`,
`setScreenSpaceLineWidth` (WebGPU only), `tearDown`, and `setUp`. Keep them.

Not documented in v8, or removed with the "Ground Reflection" setting: `setScreenMode` on
the viewer, `showModelStructurePanel` (use the Model Structure extension), and
`Private.Prefs3D.GROUND_REFLECTION` (removed with the Prefs rename above). `setGroundReflection`,
`setGroundReflectionAlpha`, and `setGroundReflectionColor` are still on the reference page even
though the setting is removed; treat them as no-ops and don't rely on them (B13).

`viewer.restoreState(state)` with a state saved on v7 may carry render options (tone mapping,
`renderOptions`, or a `seedURN` from another model) that mean nothing to the WebGPU renderer. Test
restoring saved states early, and re-save them from v8 where they matter.

### Reading a loaded element's mesh

v7 code read raw buffers through `viewer.impl.getRenderProxy(model, fragId)` (`geometry.vb`, `ib`,
`vbstride`) and `proxy.matrixWorld`. In v8, read geometry through documented accessors:

```js
const tree = await model.getObjectTreeAsync();
const instances = model.getInstances();
const world = new avm.Matrix4();
const p = new avm.Vector3();
tree.enumNodeInstances(dbId, (id) => {
    const geometry = instances.getGeometry(id);
    if (!geometry) return;
    instances.getTransformWorld(id, world);
    const indices = geometry.getIndices();   // Uint16Array | Uint32Array | null
    for (let i = 0; i < geometry.getVertexCount(); i++) {
        geometry.getPosition(i, p).applyMatrix4(world);   // world-space vertex
        // ...
    }
}, true);
```

`getIndices()` returns `null` for non-indexed geometry; then every three vertices form a triangle.
Don't read the vertex attribute's typed array directly; use `getPosition`/`getNormal`.

### Selection events

`SELECTION_CHANGED_EVENT` still carries `fragIdsArray`, but fragments aren't a v8 concept. Use
`event.dbIdArray` with `event.model`, and map to instances with `tree.enumNodeInstances` when you
need geometry.

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

- Result types are `avm.Box3`, not `THREE.Box3`. Math types use current three.js names (see the
  renames in `scene-content.md`): `Box3` has `union`, `expandByPoint`, `getCenter`, `getSize`,
  `intersectsBox`, and `getBoundingSphere`, not r71's `center()` or `size()`.
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

