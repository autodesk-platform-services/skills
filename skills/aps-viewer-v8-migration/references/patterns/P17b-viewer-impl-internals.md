# P17b. `viewer.impl` and fragment internals (P17)

Part of P17 (`P17-internal-and-removed-apis.md`). Every hit is a required change.

| v7 | v8 |
| --- | --- |
| `viewer.overlays`, `viewer.layers`, `OverlayManager` | Render layers via `viewer.getRenderLayers()` (`P02-overlays-to-render-layers.md`) |
| `viewer.impl.scene`/`sceneAfter` | Main-pass render layers (`P03-impl-scene-to-main-pass-layer.md`) |
| `av.UnifiedCamera` | `av.Camera` (`P10-camera.md`) |
| `instances.getCount()` | `instances.getMaxIndex()` (highest instance id; doesn't decrease on `remove`) |
| `model.getFragmentList()`, `fragList.getWorldBounds`, `fragList.boxes` | `instances.getWorldBounds(id, box)` (P19) |
| `viewer.impl.getFragmentProxy(...)` (moving parts) | `avs.InstanceNode3D.fromInstance` or `instances.setTransformWorld` (P8) |
| `viewer.impl.getRenderProxy(...)` (`vb`, `ib`, `vbstride`) | Instance geometry read-back (`P17d-model-internals-and-mesh-readback.md`) |
| `viewer.impl.matman()` | Built-in materials and `instances.setMaterial` (`P06-custom-materials-and-shaders.md`) |
| `viewer.impl.sceneUpdated(...)`, `viewer.impl.invalidate(...)` | `viewer.refresh(true)`, or `viewer.refresh(false)` for overlay-only changes |
| `viewer.impl.createOverlayScene`, `addOverlay`, `removeOverlay`, `removeOverlayScene` | Overlay render layer (`P02-overlays-to-render-layers.md`) |
| `viewer.impl.intersectGround(...)` | Plane picking recipe (`P11-raycasting-and-picking.md`) |
| `viewer.impl.camera`, `viewer.autocam`, `viewer.utilities` | `P10-camera.md` |
| `viewer.impl.canvas`, `viewer.impl.getCanvasBoundingClientRect()` | `getBoundingClientRect()` on the container element you passed to the viewer constructor |
| `viewer.impl.glrenderer()` | None (P14) |
| `viewer.impl.unloadModel(model)`, `viewer.impl.findModel(id)` | `viewer.unloadModel(model)`; find a model with `viewer.getAllModels()` |
| `viewer.impl.worldToClient(point)` | `viewer.worldToClient(point, camera?)` |
| `viewer.impl.layers.showAllLayers()` and layer hacks | `viewer.setLayerVisible(nodes, visible, isolate)` / `isLayerVisible(node)` (layer nodes, not dbIds); the Layer Manager extension for UI |

Anything else on `viewer.impl`, `model.getFragmentList()`, `model.getGeometryList()`,
`viewer.impl.matman()`, `viewer.impl.getFragmentProxy`, `NOP_VIEWER`, underscore-prefixed members,
or members that aren't in the reference guide: map it to a documented equivalent, or report "no
documented equivalent" in the plan. `NOP_VIEWER` is a debugging global; pass the viewer instance
explicitly instead.

## Visibility, highlight, and click internals

- `viewer.impl.highlightObjectNode(...)`, `viewer.impl.clearHighlight()`: no documented
  equivalent. Closest: `viewer.select(dbIds, model)` (shows selection color) or
  `setThemingColor`. Report as a gap if the app needs a hover-only highlight.
- Monkey-patching `viewer.clickHandler.handleSingleClick`: use `viewer.setCanvasClickBehavior(...)`
  / `setClickConfig(...)` for the documented click options, or a `ToolInterface` for custom
  handling.
- `viewer.impl.fragments.fragId2dbId`, `model.getFragmentMap`, raw `fragments.boxes`: fragments
  aren't a v8 concept. Map between instances and `dbId`s with `tree.enumNodeInstances` and
  `instances.getDbId(id)`.
