# P21. Legacy loading APIs and load options

`ViewingApplication` is gone (removed in v7; it was a separate script, `ViewingApplication.js`).
Replace it with the documented document flow:

```js
// v6/v7 legacy
const app = new Autodesk.Viewing.ViewingApplication('viewer');
app.registerViewer(app.k3D, Autodesk.Viewing.Private.GuiViewer3D);
app.loadDocument('urn:' + urn, (doc) => app.selectItem(doc.getRoot().search({ type: 'geometry', role: '3d' })[0]));

// v8 (and 7.*)
await Autodesk.Viewing.Initializer(options);
const viewer = new Autodesk.Viewing.GuiViewer3D(container);
viewer.start();
Autodesk.Viewing.Document.load('urn:' + urn, async (doc) => {
    const node = doc.getRoot().search({ type: 'geometry', role: '3d' })[0]
        ?? doc.getRoot().getDefaultGeometry();
    await viewer.loadDocumentNode(doc, node);
}, (code, message) => console.error(`Document load failed [${code}] ${message}`));
```

- `Document.load(documentId, onSuccess, onError, options)` with callbacks is the documented form,
  so keep it. `BubbleNode#search`, `getDefaultGeometry`, and `findAllViewables` are documented.
- `viewer.startWithDocumentNode` isn't in the v8 reference. Call `viewer.start()`, then
  `loadDocumentNode(doc, node, options)`.
- Path-based loading is documented: `viewer.loadModel(url, options, onSuccess, onError)` with
  `LoadOptions`. `Document.load(url + '/bubble.json')` and `doc.getViewablePath(...)` aren't on the
  v8 `Document` reference; prefer `loadDocumentNode` where the app has a manifest. Whether
  locally hosted bubbles (`env: 'Local'`) still load is untested. Ask the user to test it early.
- Documented `LoadOptions`: `fileLoader`, `keepCurrentModels`, `loadOptions`, `sharedPropertyDbPath`,
  `ids`, `loadAsHidden`, `modelNameOverride`, `placementTransform`, `applyScaling`,
  `applyPlacementInModelUnits`, `useFileProfile`, `filter`. `placementTransform` is a `Matrix4`
  (`avm.Matrix4`); the old `THREE.Matrix4` goes away.
- Not in `LoadOptions` (seen in older apps): `skipPropertyDb`, `extendStringsFetching`,
  `preserveView`, `useConsolidation`, `useADP`, `globalOffset` as a `THREE.Vector3`. Remove them
  or, if the app depends on one (for example a viewer that never needs properties), list it in the
  plan's gaps with the line that uses it. For `globalOffset` in Aggregated View, follow the
  Aggregated View guide.
- `doc.downloadAecModelData(cb)` isn't documented in v8. Report it.
- `viewer.tearDown()` and `viewer.setUp(config)` are documented, so re-initializing an existing
  viewer (for example when switching between models) still works. `tearDown(false)` keeps the
  loaded models.

## Script injected from JavaScript

Frameworks and hosts that inject the viewer `<script>` themselves (React, SvelteKit, Teams tabs,
Power BI visuals, SharePoint web parts) must wait for the script's `load` event before they touch
`window.Autodesk`, and then await the Initializer (P18). A module-level `const { Autodesk } =
window` runs before the script has loaded, and on v8 creating a viewer before the Initializer completes throws. Wrap the
injection in a promise and resolve it from `script.onload`; keep the URL in the single config
constant.

```js
function loadViewerScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${url}`));
        document.head.appendChild(script);
    });
}
await loadViewerScript(VIEWER_SCRIPT_URL);
await Autodesk.Viewing.Initializer(options);
```
