# P19. Bounding boxes from fragment lists → instance and object-tree bounds

On v7, everything here that calls `model.getInstances()` on a loaded model needs
`av.PublicFeatureFlags.SceneAPI` set before the Initializer.

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
  renames in `P05-math-method-renames.md`): `Box3` has `union`, `expandByPoint`, `getCenter`, `getSize`,
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
