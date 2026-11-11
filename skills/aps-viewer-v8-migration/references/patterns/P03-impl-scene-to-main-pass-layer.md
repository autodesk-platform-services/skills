# P3. `viewer.impl.scene`/`sceneAfter` → main-pass render layer

Read `_shared-scene-api-primer.md` first if you haven't: it covers the Scene API model and how to choose a target.

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
