# P7. Recoloring or re-materialing loaded elements

Decision rule: if the goal is "tint by status/value", use
`viewer.setThemingColor(dbId, color, model, recursive)` (object-level, no material change, works the
same in v7 and v8). Use `setMaterial` only when the appearance itself must change.

```js
// v7 (internal)
const mat = new THREE.MeshPhongMaterial({ color: 0xff5522 });
viewer.impl.matman().addMaterial('highlight', mat, true);
const tree = model.getInstanceTree();
const frags = model.getFragmentList();
tree.enumNodeFragments(dbId, (fragId) => frags.setMaterial(fragId, mat), true);
viewer.impl.invalidate(true);

// v8
const instances = model.getInstances();
const tree = await model.getObjectTreeAsync();
const highlight = new avs.StandardMaterial({ color: 0xff5522 });
tree.enumNodeInstances(dbId, (instanceId) => {
    if (instances.getGeometry(instanceId)) instances.setMaterial(instanceId, highlight);
}, true);
viewer.refresh(true);
```

On v7, `av.PublicFeatureFlags.SceneAPI` must be set before the Initializer for `getInstances()` to
work on loaded models.

Materials read from a loaded model: in v8, `instances.getMaterial(id)` returns an opaque
`avs.InternalMaterial` for materials that came from the loader. You can't read or change its
parameters, but you can pass it to `setMaterial`/`add` **within the same model** (for example, to
restore the original look after a highlight). Save it before overriding:

```js
const original = new Map();
tree.enumNodeInstances(dbId, (id) => {
    if (!instances.getGeometry(id)) return;
    original.set(id, instances.getMaterial(id));
    instances.setMaterial(id, highlight);
}, true);
// later: for (const [id, mat] of original) instances.setMaterial(id, mat);
```

To copy loaded content into another model, clone the geometry and assign a new built-in material;
an `InternalMaterial` can't cross models.

Other appearance changes:

- Background and lighting: use `viewer.setBackgroundColor` and `viewer.setLightPreset`, not
  `viewer.impl.renderer()`/`setClearColor`. Custom environment textures aren't confirmed to be
  supported; check the reference.
- Edges: `viewer.setDisplayEdges(true)`.
- 2D line weights and colors set through internal 2D materials: no documented equivalent; report a
  gap.
