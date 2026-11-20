# P17e. Selection, aggregate isolation, and behavior changes (P17)

Part of P17 (`P17-internal-and-removed-apis.md`). Every hit is a required change.

| v7 | v8 |
| --- | --- |
| `viewer.impl.visibilityManager.aggregateIsolate(...)` | `viewer.isolate(ids, model)` per model, or `viewer.setAggregateIsolation(...)` / `getAggregateIsolation()` |
| `viewer.getAggregateHiddenNodes()` | Same name, documented. Returns `{ model, ids }[]`. |

Behavior changes with no rename (review the calling code, don't just search and replace):

- `viewer.setAggregateSelection(selection)` now **replaces** the selection: models omitted from the
  array are deselected. Code that called it once per model to add to the selection must pass all
  models in one call.
- Dithered ghosting is the default, and the WebGL-only "Ground Reflection" setting is removed.
  Screenshot-based tests of ghosted views will differ.

## Selection events

`SELECTION_CHANGED_EVENT` still carries `fragIdsArray`, but fragments aren't a v8 concept. Use
`event.dbIdArray` with `event.model`, and map to instances with `tree.enumNodeInstances` when you
need geometry.
