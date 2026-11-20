---
type: llm
focus: last_message
weight: 3
---
Score PASS only if ALL of these hold in the rewritten code (ignore any "before" code quoted for comparison):
1. `StatusExtension` is an ES6 class that extends `Autodesk.Viewing.Extension` and calls `super(viewer, options)`; there is no `Autodesk.Viewing.Extension.call(this, ...)` and no `Object.create(Autodesk.Viewing.Extension.prototype)`.
2. The Initializer is awaited (or its returned promise is used with `.then`), and the viewer is created only after it resolves; the callback argument is gone.
3. `viewer.prefs` is replaced with `viewer.getPreferences()` (for example `getPreferences().set(...)`).
4. `model.getPropertySet(..., onSuccess, onError)` is replaced with `await model.getPropertySetAsync(dbIds, options)` (or `.then`) with errors handled via `try/catch` or `.catch`.
5. It doesn't use `THREE.*`, `viewer.impl`, `Autodesk.Viewing.Private`, or any API the original didn't need.
FAIL if any item is missing or wrong.
