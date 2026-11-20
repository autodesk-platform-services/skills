# P17d. Model internals and mesh read-back (P17)

Part of P17 (`P17-internal-and-removed-apis.md`). Every hit is a required change.

On v7, everything here that calls `model.getInstances()` on a loaded model needs
`av.PublicFeatureFlags.SceneAPI` set before the Initializer.

| v7 | v8 |
| --- | --- |
| `viewer.model` | Not documented. Use `viewer.getFirstModel()`, `viewer.getAllModels()`, or the model from the event or `loadDocumentNode` result. |

## Model internals

| v7 | v8 |
| --- | --- |
| `model.getData().urn`, `model.myData.urn`, `model.loader.svfUrn`, `getSeedUrn()` | `model.getDocumentNode()?.urn()` (`BubbleNode#urn`, `lineageUrn`). For models loaded by path there's no bubble; keep the URL you passed to `loadModel`. |
| `model.getData().loadOptions.bubbleNode` | `model.getDocumentNode()` |
| `model.getData().globalOffset`, `.modelSpaceBBox` | Not documented. For aligning models, use `placementTransform`/`applyScaling` (P21) and `model.getBoundingBox(ignoreTransform)` (P19). `MultipleModelUtil`-style helpers that copy `globalOffset` between models need a rewrite. |
| `model.getData().getPDF()` | Not documented. Report it. |
| `model.getPlacementTransform()` / `setPlacementTransform(m)` (or editing `elements[12]` directly) | Not documented on `Model`. Set `placementTransform` in the load options, or move instances (P8). |
| `model.getDisplayUnit()` | Same name |
| `model.getData()` | Documented, but returns an opaque `Object`. Don't read members from it. |

## Reading a loaded element's mesh

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
