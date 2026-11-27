# P22. UI subclasses and viewer DOM coupling

**Subclassing.** The v8 reference documents `Autodesk.Viewing.UI.PropertyPanel` (its `options` are
"currently unused"), `ObjectContextMenu`, `Tree`, `DataTable`, `DockingPanel`, `Button`,
`ComboButton`, `ControlGroup`, `ToolBar`, `ModelStructurePanel`, and `SettingsPanel`. It doesn't
document these, and each is a gap to report when the app subclasses or calls it:

- `ViewerPropertyPanel` (and `Autodesk.Viewing.Extensions.ViewerPropertyPanel`), including
  `setAggregatedProperties.call(this, ...)`, `requestProperties`, `this.tree.createElement_`, and
  `myRootContainer`. Property-panel customization has no documented pattern. Closest: extend
  `PropertyPanel`, and use the Properties Manager extension (`Autodesk.PropertiesManager`) for
  the stock panel. Keep the customization on v7 until the user confirms behavior on v8.
- `ViewerObjectContextMenu` (use `ObjectContextMenu`), `UI.TreeDelegate`, and
  `registerContextMenuCallback` (check it against `ObjectContextMenu` and the Viewer3D reference).
- Protected `DockingPanel` members (`createTitleBar`, `initializeMoveHandlers`, `createFooter`,
  `createScrollContainer`, `dockRight`): only `initialize` is documented. Builds that call them
  work only if the member survives; ask the user to test and report it.

Port these to ES6 classes (P20) in the same pass.

**DOM and CSS coupling.** Don't depend on the viewer's own DOM or class names. Selectors such as
`.adsk-viewing-viewer`, `docking-panel-container-solid-color-a`, `.adsk-button-icon`,
`button.container.children[0]`, jQuery injection into the viewer's inner elements, and direct
edits of `viewer.canvas.width` or `viewer.clientContainer` can change without notice.

- Add your own elements to the container element you passed to the viewer constructor,
  and size the viewer by resizing that element, then call `viewer.resize()`.
- Style your own classes. For toolbar buttons use the `Button` API (`setIcon`, `setToolTip`,
  `onClick`) instead of reaching into `button.container`.
- Writing to the canvas size directly (the "resizer" extension pattern) isn't a documented way to
  size the viewer; replace it with a container resize plus `viewer.resize()`.
- Where a style override is unavoidable, scope it to your own wrapper and ask the user to check it
  on v8.
