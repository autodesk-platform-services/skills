# Materials and appearance (P6, P7)

## P6. Custom materials and shaders → built-in materials

| v7 | v8 |
| --- | --- |
| `MeshPhongMaterial`, `MeshLambertMaterial`, `MeshStandardMaterial` | `avs.StandardMaterial` (`color`, `opacity`, `specularColor`, `specularPower`, `fresnelStrength`, `metal`, `map`, `specularMap`, `normalMap`/`normalScale` or `bumpMap`/`bumpScale` (mutually exclusive), `alphaMap`, `vertexColors`, `side`, `depthTest`, `depthWrite`, `transparent`) |
| `MeshBasicMaterial`, `SpriteMaterial` | `avs.UnlitMaterial` (`color`, `opacity`, `map`, `alphaMap`, `vertexColors`, `side`, `depthTest`, `depthWrite`, `transparent`) |
| `LineBasicMaterial`, `LineDashedMaterial` | `avs.LineMaterial` (`color`, `opacity`, `vertexColors`, `depthTest`, `depthWrite`, `transparent`; always 1 px, no dashes, no textures). Geometry indices are vertex pairs, one pair per segment. |
| `PointsMaterial` / `PointCloudMaterial` | `avs.PointsMaterial` (`size` in px, `color`, `opacity`, `vertexColors`, `map`, `depthTest`, `depthWrite`, `transparent`) |
| `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile` | No equivalent. Approximate with `vertexColors`, textures, or theming; otherwise report a gap. |
| `viewer.impl.matman().addMaterial(...)` | Not needed; `instances.add`/`setMaterial` take ownership. |

All four share the `Material` interface (`clone`, `get/setColor`, `get/setOpacity`,
`get/setVertexColors`, `get/setDepthTest`, `get/setDepthWrite`, `get/setTransparent`). Pass
`color` as a hex number; the reference also lists `avs.Color` and CSS strings, but `avs.Color` was
reported missing at runtime (see the gotchas in `SKILL.md`). `opacity` below 1 needs `transparent: true`.

Never invent a shader workaround. List the gap (see `../gaps.md`) and move on.

## P7. Recoloring or re-materialing loaded elements

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
