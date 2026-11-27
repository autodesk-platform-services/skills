---
max_turns: 20
timeout_seconds: 600
allowed_tools: [Skill, Read, Grep, Glob]
runs: 3
tags: [porting, es6, initializer, properties]
plugins: [../../../skills/aps-viewer-v8-migration]
---
We're moving our viewer app to the Viewer v8 preview. This is our startup code and our only extension. Rewrite it so it works on v8, and keep the behavior the same.

```js
Autodesk.Viewing.Initializer({ env: 'AutodeskProduction2', api: 'streamingV2', getAccessToken }, function () {
    const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'), { extensions: ['StatusExtension'] });
    viewer.start();
    Autodesk.Viewing.Document.load(urn, (doc) => viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
});

function StatusExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
    this.onSelection = this.onSelection.bind(this);
}
StatusExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
StatusExtension.prototype.constructor = StatusExtension;

StatusExtension.prototype.load = function () {
    this.viewer.prefs.set('ghosting', false);
    this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.onSelection);
    return true;
};

StatusExtension.prototype.unload = function () {
    this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.onSelection);
    return true;
};

StatusExtension.prototype.onSelection = function () {
    const model = this.viewer.model;
    const dbIds = this.viewer.getSelection();
    model.getPropertySet(dbIds, { propFilter: ['Status'] }, (propSet) => {
        console.log(propSet.getAggregation('Status'));
    }, (err) => console.error(err));
};

Autodesk.Viewing.theExtensionManager.registerExtension('StatusExtension', StatusExtension);
```
