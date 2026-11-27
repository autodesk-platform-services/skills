# P13. Streamed loading (Large Model Experience always on)

- Don't do work in `GEOMETRY_LOADED_EVENT` that assumes a fixed fragment or instance order.
- Use `await model.getObjectTreeAsync()` instead of polling `getInstanceTree()` (removed) or relying
  on `OBJECT_TREE_CREATED_EVENT` timing.
- Apply theming and visibility once by `dbId`, rather than per fragment as geometry arrives.
  Whether `setThemingColor` and `isolate` apply to objects that stream in later isn't confirmed;
  ask the user to verify on a large model.
- Remove `Autodesk.MemoryLimited`, `memory`/`limit` load options, and LME feature-flag toggles.
  Which other `LoadOptions` become no-ops isn't confirmed; flag tuning options for the user to test.
- Selective loading (`loadDocumentNode` with `ids` or `filter`): keep it, and ask the user to verify
  it behaves the same.
- Event handlers (selection, hover, camera) may fire in a different order than in v7. Don't chain
  logic on event order.
