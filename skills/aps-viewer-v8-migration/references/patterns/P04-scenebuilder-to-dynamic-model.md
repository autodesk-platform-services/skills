# P4. `Autodesk.Viewing.SceneBuilder` → dynamic model in the main scene

Read `_shared-scene-api-primer.md` first if you haven't: it covers the Scene API model and how to choose a target.

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
