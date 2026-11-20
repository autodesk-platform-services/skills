# Scene API primer

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
