// Already-migrated v8 code: the audit must not report anything in this file.
const av = Autodesk.Viewing;
const avs = Autodesk.Viewing.Scene;
const avm = Autodesk.Viewing.Math;

class MyExtension extends av.Extension {
    load() { return true; }
    unload() { return true; }
}
av.theExtensionManager.registerExtension('MyExtension', MyExtension);

await av.Initializer(options);
const prefs = viewer.getPreferences();
const tree = await model.getObjectTreeAsync();
const props = await model.getPropertySetAsync([1, 2]);
const layers = viewer.getRenderLayers();
layers.create('markers', { renderTarget: 'overlay', renderOrder: 1 });
viewer.navigation.setView(new avm.Vector3(10, 10, 10), new avm.Vector3(0, 0, 0));
const max = model.getInstances().getMaxIndex();
const material = new avs.StandardMaterial({ color: 0xff0000 });
