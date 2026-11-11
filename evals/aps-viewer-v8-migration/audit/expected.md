# APS Viewer v8 audit

Scanned 5 files.

## P1: v7 or older viewer script/stylesheet URL (legacy forms, pinned versions), removed feature flags → references/patterns/P01-script-urls-and-baselines.md (3)

- index.html:4: `<link rel="stylesheet" href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css">`
- index.html:5: `<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"></script>`
- src/main.js:2: `Autodesk.Viewing.FeatureFlags.set(Autodesk.Viewing.PublicFeatureFlags.WebGPU, false);`

## P2: viewer.overlays / viewer.layers / OverlayManager → references/patterns/P02-overlays-to-render-layers.md (1)

- src/main.js:12: `viewer.overlays.addScene('markers');`

## P3: viewer.impl.scene / sceneAfter → references/patterns/P03-impl-scene-to-main-pass-layer.md (1)

- src/main.js:13: `viewer.impl.sceneAfter.add(mesh);`

## P4: Autodesk.Viewing.SceneBuilder → references/patterns/P04-scenebuilder-to-dynamic-model.md (1)

- src/main.js:14: `const builder = await viewer.loadExtension('Autodesk.Viewing.SceneBuilder');`

## P5: three.js types → references/patterns/P05-three-types-to-scene-api.md (5)

- package.json:5 [package (dependencies)]: `"three": "^0.160.0"`
- package.json:8 [package (devDependencies)]: `"@types/forge-viewer": "^7.89.0"`
- src/main.js:15 [material (P6)]: `const material = new THREE.ShaderMaterial({});`
- src/main.js:16 [math (P5)]: `const pos = new THREE.Vector3(0, 0, 0);`
- src/main.js:18 [raycasting (P11)]: `const raycaster = new THREE.Raycaster();`

## P6: Custom shaders / material manager → references/patterns/P06-custom-materials-and-shaders.md (1)

- src/main.js:15: `const material = new THREE.ShaderMaterial({});`

## P7-P9: Fragment-level access → references/patterns/P07-recolor-loaded-elements.md, P08-move-or-animate-loaded-parts.md, P09-fragment-visibility.md (1)

- src/main.js:25: `tree.enumNodeFragments(dbId, (fragId) => {});`

## P10: Camera mutation / three.js camera → references/patterns/P10-camera.md (1)

- src/main.js:17: `viewer.navigation.getCamera().position.set(1, 2, 3);`

## P11: Raycasting / projection → references/patterns/P11-raycasting-and-picking.md (1)

- src/main.js:18: `const raycaster = new THREE.Raycaster();`

## P12: Autodesk.DataVisualization → references/patterns/P12-datavisualization.md (1)

- src/main.js:10: `viewer.loadExtension('Autodesk.DataVisualization');`

## P13: Memory-limited / LME toggles → references/patterns/P13-streaming-lme.md (1)

- src/main.js:11: `viewer.loadExtension('Autodesk.MemoryLimited');`

## P14: WebGL-specific code → references/patterns/P14-webgl-specific-code.md (1)

- src/main.js:19: `const gl = viewer.canvas.getContext('webgl');`

## P15: Non-secure origin → references/patterns/P15-secure-context-and-hosting.md (1)

- index.html:6: `<script src="http://intranet.example.com/models/config.js"></script>`

## P16: Retired or unverified extension → references/patterns/P16-retired-extensions.md (1)

- src/main.js:9: `viewer.loadExtension('Autodesk.ViewerSettings');`

## P17: Internal, removed, or changed API → references/patterns/P17-internal-and-removed-apis.md (8)

- src/main.js:7: `viewer.prefs.set('ghosting', false);`
- src/main.js:8: `const loader = new Autodesk.Viewing.Private.PropDbLoader();`
- src/main.js:13: `viewer.impl.sceneAfter.add(mesh);`
- src/main.js:20: `const tree = model.getInstanceTree();`
- src/main.js:21: `model.getPropertySet([1, 2], onSuccess, onError);`
- src/main.js:22: `model.getObjectTree(function (tree) { console.log(tree); });`
- src/main.js:23: `viewer.getProperties(1, onProps);`
- src/main.js:24: `const count = model.getInstances().getCount();`

## P18: Viewer creation and Initializer → references/patterns/P18-initializer-and-viewer-creation.md (2)

- src/main.js:3 [callback form, use await]: `Autodesk.Viewing.Initializer(options, function () {`
- src/main.js:6 [check ordering]: `const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));`

## P19: Bounding boxes from fragments/instances → references/patterns/P19-bounding-boxes.md (1)

- src/main.js:26: `fragList.getWorldBounds(fragId, box);`

## P20: ES5-style extension or viewer subclass → references/patterns/P20-es6-class-extensions.md (4)

- src/extension.js:3: `Autodesk.Viewing.Extension.call(this, viewer, options);`
- src/extension.js:5: `MyExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);`
- src/extension.js:8: `Autodesk.Viewing.UI.DockingPanel.call(this, container, id, title);`
- src/extension.js:11: `Autodesk.Viewing.UI.DockingPanel.prototype.initialize.call(this);`

35 findings in total.
