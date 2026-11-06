# Custom scene content (P2–P5)

## Scene API in one paragraph

Custom content lives in a `Model` (a "dynamic model" when you create it with `new av.Model()`).
`model.getInstances()` returns an `InstanceCollection3D`; `instances.add(geometry, material,
transform, ..., dbId)` adds an instance and returns its id, which replaces the v7 mesh reference.
You place a model either in the **main scene** (`viewer.showModel(model)`, rendered progressively
like a loaded design) or in a **render layer** (`viewer.getRenderLayers()`, drawn every frame).
Nothing redraws on its own after a mutation: call `viewer.refresh(true)` when main-scene or
main-pass content changed. When only overlay-layer content changed (for example, an animated
marker), `viewer.refresh(false)` redraws just the overlays, which is much cheaper on heavy scenes.

Choose:

| Content | Target |
| --- | --- |
| A few markers, gizmos, highlights that must stay on top | Overlay render layer (P2) |
| Content that should be occluded by the model, small | Main-pass render layer (P3) |
| Large or numerous custom geometry, imported formats | Dynamic model in the main scene (P4) |

## P2. `viewer.overlays` → render layer + dynamic model

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

## P3. `viewer.impl.scene`/`sceneAfter` → main-pass render layer

```js
// v7
viewer.impl.sceneAfter.add(mesh);   // or viewer.impl.scene.add(mesh)
viewer.impl.invalidate(true);

// v8
layers.create('after-model', { renderTarget: 'main', renderOrder: 1 });   // replaces sceneAfter
layers.create('before-model', { renderTarget: 'main', renderOrder: -1 }); // replaces scene
layers.addModel(myModel, 'after-model');
viewer.refresh(true);
```

`renderTarget: 'main'` shares the depth buffer with the loaded model, so model geometry still
occludes the content. `'overlay'` is the "always on top" replacement.

## P4. `Autodesk.Viewing.SceneBuilder` → dynamic model in the main scene

```js
// v7
const sceneBuilder = await viewer.loadExtension('Autodesk.Viewing.SceneBuilder');
const modelBuilder = await sceneBuilder.addNewModel({ conserveMemory: false, modelNameOverride: 'Equipment' });
modelBuilder.addMesh(new THREE.Mesh(geom, mat));   // or addFragment(...)

// v8
const model = new av.Model();
viewer.showModel(model);                 // must come before touching instances
const instances = model.getInstances();
instances.add(geometry, material, transform, undefined, dbId);
viewer.refresh(true);
```

- Main-scene models render progressively, like loaded designs, so this is the right home for large
  custom content.
- A `dbId` passed to `add()` affects selection, isolation, and theming only if that `dbId` exists
  in the model's object tree. A dynamic model has no object tree by default. Build one with
  `ObjectTreeBuilder` and install it with `model.setObjectTree(tree)`:

  ```js
  const builder = new av.ObjectTreeBuilder(1, 'Equipment');   // root dbId must be a non-zero int32
  const pumpId = builder.createNode(undefined, builder.getRootId(), 'Pump 1');   // dbId auto-allocated
  model.setObjectTree(builder.build());
  instances.add(pumpGeometry, pumpMaterial, pumpTransform, undefined, pumpId);
  // or link an existing instance: instances.setDbId(instanceId, pumpId)
  ```

  `setObjectTree` replaces any existing tree and fires `OBJECT_TREE_CREATED_EVENT`. Instance
  membership comes from the instances' `dbId`s, not from the tree. Check the `NODE_TYPE` values and
  whether the property panel shows anything for these objects (there's no property database) in
  the reference.

## P5. three.js types → Scene API and math types

| v7 (three.js) | v8 |
| --- | --- |
| `THREE.Vector2/3/4`, `Matrix3/4`, `Quaternion`, `Box2/3` | `avm.Vector2/3/4`, `avm.Matrix3/4`, `avm.Quaternion`, `avm.Box2/3` |
| `THREE.Color` | `avs.Color` (or hex numbers in material options) |
| `THREE.BufferGeometry` + `BufferAttribute` | `avs.BufferGeometry` + `avs.BufferAttribute`; `setIndices(Uint16Array \| Uint32Array)` |
| `THREE.Geometry` (legacy, r71) | Convert to `avs.BufferGeometry` |
| `BoxGeometry`, `SphereGeometry`, `CylinderGeometry`, `PlaneGeometry`, … | `avs.GeometryFactory.create*` (spheres, boxes, cylinders, cones, planes; optional trailing flag for edge indices) |
| `THREE.Texture` | `avs.Texture` |
| `THREE.Mesh` / `Line` / `Points` | An instance: `instances.add(geometry, material, transform)` with `StandardMaterial`/`UnlitMaterial`, `LineMaterial`, or `PointsMaterial` |
| `THREE.Object3D` / `Group` hierarchy | `avs.Node3D` scene graph via `instances.getSceneGraph(true)` |
| `THREE.Vector4` cut planes (`setCutPlanes`) | `avm.Vector4` |

Rules:

- `StandardMaterial` requires normals.
- Don't read typed arrays back after `add()`; use `getVertexCount()` and `getPosition(i, target)`.
- Geometries and materials belong to one model; clone before reusing across models.
- `GeometryFactory` creators: `createSphere(radius, widthSegments, heightSegments)`,
  `createBox(width, height, depth, generateEdges)`, `createCylinder(radius, height, radialSegments,
  generateEdges)`, `createCone(radiusTop, radiusBottom, height, radialSegments, generateEdges)`,
  `createPlane(width, height, widthSegments, heightSegments, generateEdges)`.
- Hierarchies authored in code: `new avs.InstanceNode3D(geometry, material)` creates an instance
  node you can `add()` to any `Node3D` under `instances.getSceneGraph(true)`. Node transforms are
  relative to the parent; `remove()` then `add()` reparents a subtree without recreating it.
- `avm` types keep three.js-compatible method names, but those of r71 (bundled with v7), not current
  three.js. Code written against the bundled `THREE` migrates by renaming the namespace. Code
  written against newer three.js (helpers copied from current docs, a separately installed `three`
  package) must be checked against the r71 API and rewritten where methods differ.
- Custom loaders (glTF via three.js loaders, point clouds) should parse into `avs.BufferGeometry`
  and add instances to a dynamic model (P4), not into an overlay.
- TypeScript: remove `@types/three` imports from viewer-facing code and type against the viewer's
  own typings.
