# P17a. Property APIs and the object tree (P17)

Part of P17 (`P17-internal-and-removed-apis.md`). Every hit is a required change.

| v7 | v8 |
| --- | --- |
| `model.getInstanceTree()` | `await model.getObjectTreeAsync()` |
| `model.getProperties(dbId, cb)` | `await model.getPropertiesAsync(dbId)` |
| `model.getBulkProperties(...)` | `await model.getBulkPropertiesAsync(...)` |
| `model.getPropertySet(dbIds, ...)` | `await model.getPropertySetAsync(dbIds, options)` |
| `model.getExternalIdMapping(cb)` | `await model.getExternalIdMappingAsync()` |
| `model.getLayerToNodeIdMapping(cb)` | `await model.getLayerToNodeIdMappingAsync()` |
| `model.getObjectTree(cb)` (callbacks) | `await model.getObjectTreeAsync()` |
| `model.search(...)` / `viewer.search(...)` | `await model.searchAsync(...)` |
| `viewer.getProperties(dbId, cb)` | `await model.getPropertiesAsync(dbId)` on the model |
| `viewer.getObjectTree(cb)` | `await model.getObjectTreeAsync()` on the model |
| `viewer.searchText` | Removed. Drop the feature. |
| `model.getData().instanceTree` | `await model.getObjectTreeAsync()` |
| `model.getProperties2(dbId, ...)` / `getBulkProperties2(...)` (and the `PropDbLoader` versions) | `await model.getPropertiesAsync(dbId, options)` / `getBulkPropertiesAsync(dbIds, options)`. The `*2` variants only skipped `externalId`; the async methods take `needsExternalId` (properties) and `propFilter` (bulk) options. |
| `model.getBulkProperties(ids, ['externalId'], cb)` (array filter) | `await model.getBulkPropertiesAsync(ids, { propFilter: ['externalId'] })`. `propFilter: null` means no filtering. |
| `model.getPropertyDb().executeUserFunction(fn, userData)` | Same call. `PropDbLoader#executeUserFunction(code, userData)` is documented in v8; the function runs on the worker against the `PropertyDatabase`. |
| `propertyDb.getObjectIds(...)`, `getObjectProperties(...)` | Not documented on `PropDbLoader`/`PropertyDatabase`. Use `model.searchAsync` and `getPropertiesAsync`. |

Check the exact `*Async` signatures (argument order, options objects) in the reference with the
`aps-docs-portal` skill before rewriting calls; they're not always a 1:1 callback-to-promise swap.
When an `*Async` method rejects, the reason is always an `Error`, so replace error callbacks with
`try/catch` and read `err.message`.

## ObjectTree methods and "all dbIds" recipes

The v8 `ObjectTree` reference documents `getRootId`, `getNodeName`, `getNodeParentId`,
`getChildCount`, `getInstanceCount`, `getNodeType`, `isNodeHidden`, `isNodeSelectable`,
`isNodeVisibleLocked`, `isNodeExplodeLocked`, `getNodeBox`, `enumNodeChildren`,
`enumNodeInstances`, and `search(text)`.

| v7 `InstanceTree` | v8 `ObjectTree` |
| --- | --- |
| `getRootId`, `getNodeName`, `getNodeParentId`, `getChildCount`, `getNodeType`, `isNodeHidden`, `getNodeBox` | Same names |
| `enumNodeChildren(id, cb, recursive)` | Same name |
| `enumNodeFragments(id, cb, recursive)` | `enumNodeInstances(id, cb, recursive)` (P8, P19) |
| `isNodeOff(dbId)` | Not documented. Use `viewer.getAggregateHiddenNodes()` or `viewer.isNodeVisible(dbId, model)`. |
| `nodeAccess.dbIdToIndex`, `nodeAccess.*` | Not documented. Don't read it; the recipes below cover the common uses. |

```js
const tree = await model.getObjectTreeAsync();

// All dbIds (including the root and group nodes)
const all = [];
tree.enumNodeChildren(tree.getRootId(), (dbId) => { all.push(dbId); }, true);
all.push(tree.getRootId());

// Leaf nodes only (usually the objects with geometry)
const leaves = all.filter((dbId) => tree.getChildCount(dbId) === 0);
```

Don't return a truthy value from an enumeration callback unless you want to stop the loop (the
reference says a truthy result interrupts it); the braces above avoid an accidental `push` return.
