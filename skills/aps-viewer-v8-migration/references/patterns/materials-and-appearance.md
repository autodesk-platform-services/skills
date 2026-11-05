# Materials and appearance (P6, P7)

## P6. Custom materials and shaders → built-in materials

| v7 | v8 |
| --- | --- |
| `MeshPhongMaterial`, `MeshLambertMaterial`, `MeshStandardMaterial` | `avs.StandardMaterial` (`color`, `specularColor`, `specularPower`, `metal`, `map`, `specularMap`, `normalMap`, `bumpMap`/`bumpScale`, `alphaMap`, `transparent`, `vertexColors`, `side`) |
| `MeshBasicMaterial`, `SpriteMaterial` | `avs.UnlitMaterial` (`color`, `opacity`, `transparent`, `map`, `alphaMap`, `vertexColors`, `depthTest`, `depthWrite`) |
| `LineBasicMaterial`, `LineDashedMaterial` | `avs.LineMaterial` (1 px lines only; no dashes, no textures) |
| `PointsMaterial` / `PointCloudMaterial` | `avs.PointsMaterial` (`size` in px, `color`, `vertexColors`, `map`, `depthTest`, `depthWrite`) |
| `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile` | No equivalent. Approximate with `vertexColors`, textures, or theming; otherwise report a gap. |
| `viewer.impl.matman().addMaterial(...)` | Not needed; `instances.add`/`setMaterial` take ownership. |

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

Other appearance changes:

- Background and lighting: use `viewer.setBackgroundColor` and `viewer.setLightPreset`, not
  `viewer.impl.renderer()`/`setClearColor`. Custom environment textures aren't confirmed to be
  supported; check the reference.
- Edges: `viewer.setDisplayEdges(true)`.
- 2D line weights and colors set through internal 2D materials: no documented equivalent; report a
  gap.
