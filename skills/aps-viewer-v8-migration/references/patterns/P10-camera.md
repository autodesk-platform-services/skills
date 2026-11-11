# P10. Camera

```js
// v7
const cam = viewer.navigation.getCamera();      // THREE.Camera subclass
cam.position.set(10, 10, 10);
cam.lookAt(new THREE.Vector3(0, 0, 0));
viewer.impl.syncCamera();

// v8
viewer.navigation.setView(new avm.Vector3(10, 10, 10), new avm.Vector3(0, 0, 0));
// read-only access:
const cam = viewer.getCamera();   // position, target, up, fov, isPerspective, matrices are read-only
```

Rules:

- Camera properties are read-only. Writes go through `viewer.navigation` (`setView`,
  `setPivotPoint`, …) or `viewer.setFOV`.
- `Navigation.setView(from, to, up)` takes positional `avm.Vector3` arguments. `setPosition`,
  `setTarget`, `setPivotPoint`, and `fitBounds` are also on `Navigation`.
- Writing to `viewer.getCamera().position` etc. "is not guaranteed to take effect", per the
  reference. Note: the v8 "Hello Triangle" guide calls `viewer.getCamera().setView({...})` on the
  active camera; the `Camera` reference says to prefer `Navigation#setView`. Follow the reference.
- For "what-if" math (frustum tests, projecting points), use `cam.clone()`, then
  `clone.setView(viewParams)` or `updateCameraMatrices()` on the clone. Changes to a clone don't
  affect the viewer. `camera.pixelsPerUnitAtDistance(dist)` replaces manual screen-size math.
- Saved views: keep `viewer.getState()`/`viewer.restoreState()`.
- `Autodesk.Viewing.UnifiedCamera` is removed in v8; use `Autodesk.Viewing.Camera`. `AggregatedView#setCamera`
  accepts a `Camera` or a `ViewParams` object.
- Replace `viewer.impl.camera` with `viewer.getCamera()`.
- `viewer.navigation` is used in the v8 guides but isn't listed on the `Viewer3D` reference page;
  the `Navigation` class it returns is documented. Use it.

Camera write-backs and helpers that aren't in the v8 `Navigation` reference:

| v7 | v8 |
| --- | --- |
| `navigation.setCameraUpVector(up)`, `getCameraUpVector()` | Pass `up` as the third argument of `navigation.setView(from, to, up)`; read it from `viewer.getCamera().up` |
| `navigation.setWorldUpVector(up)`, `getWorldUpVector()` | Read the world up axis with `model.getUpVector()`. There's no documented setter; `navigation.orientCameraUp(force)` re-aligns the camera to it. |
| `viewer.autocam.center`, `autocam.pivot` | `navigation.getPivotPoint()` / `setPivotPoint(point)` |
| `viewer.autocam.goHome()` | `viewer.fitToView()` or `viewer.restoreState(savedHomeState)` |
| `viewer.utilities.fitToView(...)` | `viewer.fitToView(objectIds, model, immediate)` |
| `viewer.utilities.setPivotPoint(...)` | `navigation.setPivotPoint(point)` |

More camera, navigation, and utility members seen in older apps:

| v7 | v8 |
| --- | --- |
| `viewer.utilities.getHitPoint(x, y)` | `viewer.clientToWorld(x, y, ignoreTransparent)` or `viewer.hitTest(x, y)` |
| `viewer.utilities.transitionView(...)`, `viewer.utilities.goHome()` | `ViewingUtilities` is documented, but `viewer.utilities` isn't on the `Viewer3D` page. Prefer `viewer.restoreState(state)` (animated unless told otherwise) or `viewer.fitToView()`; if the user needs the transition itself, report it. |
| `viewer.autocam.shotParams.destinationPercent`, `.duration` | No documented equivalent. Remove the tuning and accept the default transition. |
| `navigation.toOrthographic()`, `toPerspective()` | Not on the `Navigation` reference. Report as a gap, or use a saved state with `isPerspective` set. |
| `navigation.fitBounds(immediate, THREE.Box3)` | `navigation.fitBounds(immediate, bounds, reorient, force)` with an `avm.Box3` |
| `viewer.setActiveNavigationTool('bimwalk')` | Same call, documented. The BimWalk extension (`Autodesk.BimWalk`) is documented too. |
