# P8. Moving or animating loaded parts

On v7, everything here that calls `model.getInstances()` on a loaded model needs
`av.PublicFeatureFlags.SceneAPI` set before the Initializer.

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
`ensureModelBBoxUpToDate`), check the Initializer `env` first (`P18-initializer-and-viewer-creation.md`, known issue).

**Usage hints.** Loaded models default to `avs.UsageHint.Static`: after instances are added,
removed, moved, or get new geometry, the model is optimized again, and added instances appear only
once that's done. For animations and other frequent changes, call
`instances.setUsageHint(avs.UsageHint.Dynamic)` first. Programmatically created models default to
`Dynamic`. `add` and `remove` work on loaded models only after they've finished loading. Switch
back to `Static` when the interaction ends, so the model is optimized again for rendering.
