// v7 app entry point: every line below is a v8 migration finding.
Autodesk.Viewing.FeatureFlags.set(Autodesk.Viewing.PublicFeatureFlags.WebGPU, false);
Autodesk.Viewing.Initializer(options, function () {
    start();
});
const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
viewer.prefs.set('ghosting', false);
const loader = new Autodesk.Viewing.Private.PropDbLoader();
viewer.loadExtension('Autodesk.ViewerSettings');
viewer.loadExtension('Autodesk.DataVisualization');
viewer.loadExtension('Autodesk.MemoryLimited');
viewer.overlays.addScene('markers');
viewer.impl.sceneAfter.add(mesh);
const builder = await viewer.loadExtension('Autodesk.Viewing.SceneBuilder');
const material = new THREE.ShaderMaterial({});
const pos = new THREE.Vector3(0, 0, 0);
viewer.navigation.getCamera().position.set(1, 2, 3);
const raycaster = new THREE.Raycaster();
const gl = viewer.canvas.getContext('webgl');
const tree = model.getInstanceTree();
model.getPropertySet([1, 2], onSuccess, onError);
model.getObjectTree(function (tree) { console.log(tree); });
viewer.getProperties(1, onProps);
const count = model.getInstances().getCount();
tree.enumNodeFragments(dbId, (fragId) => {});
fragList.getWorldBounds(fragId, box);
