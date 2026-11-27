# P2. `viewer.overlays` → render layer + dynamic model

Read `_shared-scene-api-primer.md` first if you haven't: it covers the Scene API model and how to choose a target.

```js
// v7
viewer.overlays.addScene('markers');
const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshPhongMaterial({ color: 0xff0000 })
);
mesh.position.set(0, 0, 10);
viewer.overlays.addMesh(mesh, 'markers');

// v8
const layers = viewer.getRenderLayers();
const markers = new av.Model();
layers.create('markers', { renderTarget: 'overlay', renderOrder: 1 });
layers.addModel(markers, 'markers');

const instances = markers.getInstances();
const id = instances.add(
    avs.GeometryFactory.createBox(10, 10, 10),   // (width, height, depth, generateEdges)
    new avs.StandardMaterial({ color: 0xff0000 }),
    new avm.Matrix4().makeTranslation(0, 0, 10)
);
viewer.refresh(true);
```

Rules:

- `layers.create(name, options)` takes `renderTarget` (`'main'` or `'overlay'`), `renderOrder`,
  `visible`, and `clearDepthAfter` (`'main'` target only). Attach content with
  `layers.addModel(model, layerId)`.
- One `Model` per layer. Keep the returned instance id for later edits: `setTransformWorld`,
  `setMaterial`, `setVisibilityState`, `remove`.
- `removeMesh` → `instances.remove(id)`; `removeScene` → `layers.remove('markers')`;
  `clearScene` → remove all instances from the layer's model while keeping the model attached.
  `layers.clear('markers')` also detaches the models; if used, create and attach a fresh model
  before adding new content.
- Render layers draw everything every frame. If the overlay held lots of geometry, move it to the
  main scene (P4).
- Overlay layers are refreshed with every main pass but can also be refreshed alone with
  `viewer.refresh(false)`; use that for overlay animation loops.
- Layer options: `renderTarget`, `renderOrder`, `visible`, and `clearDepthAfter` (main target only).
  Toggle a layer with `layers.setLayerOptions(id, { visible: false })` instead of removing it.
- `viewer.layers` is removed in v8. The Scene API blog post uses `viewer.layers.create(...)`; use
  `viewer.getRenderLayers()`.
