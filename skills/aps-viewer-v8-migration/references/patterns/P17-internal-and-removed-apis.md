# P17. Internal and removed APIs

APIs deprecated in v7 are removed or renamed for internal use in v8. Every hit is a required change:

P17 is split by the kind of API the code touches. Open only the file(s) that match the audit hit:

| If the code uses | Read |
| --- | --- |
| `getInstanceTree`, sync `getProperties`/`getBulkProperties`/`search`, `ObjectTree`, "all dbIds" | `P17a-properties-and-object-tree.md` |
| `viewer.impl.*` (scene, matman, fragments, glrenderer, canvas, camera, `unloadModel`), highlight and click internals | `P17b-viewer-impl-internals.md` |
| `viewer.prefs`, `Prefs*`, `Private.*`, viewer setters (`setQualityLevel`, ground reflection), `restoreState` | `P17c-preferences-and-private-namespace.md` |
| `model.getData()`, URN lookups, placement transform, `viewer.model`, reading mesh buffers | `P17d-model-internals-and-mesh-readback.md` |
| `setAggregateSelection`, `aggregateIsolate`, `SELECTION_CHANGED_EVENT` fragment ids, dithered ghosting | `P17e-selection-and-behavior-changes.md` |

Anything on `viewer.impl`, `model.getFragmentList()`, `model.getGeometryList()`, `NOP_VIEWER`,
underscore-prefixed members, or members that aren't in the v8 reference: map it to a documented
equivalent, or report "no documented equivalent" in the plan (see `../gaps.md`).
