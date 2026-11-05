# Camera, raycasting, and projection (P10, P11)

## P10. Camera

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
- Check whether `Navigation.setView` takes positional arguments or a view-params object in the
  current reference before writing the call.
- For "what-if" math (frustum tests, projecting points), use `cam.clone()` and
  `updateCameraMatrices()` on the clone.
- Saved views: keep `viewer.getState()`/`viewer.restoreState()`.
- `Autodesk.Viewing.UnifiedCamera` is deprecated; use `Autodesk.Viewing.Camera`.
- Replace `viewer.impl.camera` with `viewer.getCamera()`.

## P11. Raycasting, hit-testing, and screen projection

| v7 | v8 |
| --- | --- |
| `new THREE.Raycaster(...)`, `viewer.impl.viewportToRay`, `viewer.impl.rayIntersect` | `viewer.hitTest(x, y, ignoreTransparent)` → `Intersection` |
| `viewer.impl.hitTest(...)` | `viewer.hitTest(...)` or `viewer.clientToWorld(clientX, clientY, ignoreTransparent)` |
| `point.clone().project(camera)` + manual NDC→pixel conversion | `viewer.worldToClient(point)` (check that it's in the v8 reference) |
| Picking custom overlay meshes via raycaster | Give instances a `dbId` (`scene-content.md`, P4) so built-in selection and hit-testing return them |

- Arbitrary-ray intersection (a ray that doesn't start at a screen point, for example "find
  neighboring elements" or sensor placement) has no documented v8 API. Report it as a gap; don't
  reach into internals.
- Tools (`ToolInterface`) that do three.js math in their event handlers need both P10/P11 and the
  type renames in P5.
