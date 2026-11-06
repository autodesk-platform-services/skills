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

## P11. Raycasting, hit-testing, and screen projection

| v7 | v8 |
| --- | --- |
| `new THREE.Raycaster(...)`, `viewer.impl.viewportToRay`, `viewer.impl.rayIntersect` | `viewer.hitTest(x, y, ignoreTransparent)` → `Intersection` |
| `viewer.impl.hitTest(...)` | `viewer.hitTest(...)` or `viewer.clientToWorld(clientX, clientY, ignoreTransparent)` |
| `point.clone().project(camera)` + manual NDC→pixel conversion | `viewer.worldToClient(point, camera)` (camera optional, defaults to the viewer's camera) |
| Picking custom overlay meshes via raycaster | Give instances a `dbId` (`scene-content.md`, P4) so built-in selection and hit-testing return them |

- Arbitrary-ray intersection (a ray that doesn't start at a screen point, for example "find
  neighboring elements" or sensor placement) has no documented v8 API. Report it as a gap; don't
  reach into internals.
- `hitTest` and `clientToWorld` return `null` where the cursor isn't over geometry. To get a point
  on a plane under the cursor (`viewer.impl.intersectGround`, drawing and markup tools, gizmo
  drags), use the recipe below.

### Point on a plane under the cursor

`worldToClient` is documented and works with any camera, so solve for the plane point that
projects to the cursor. A plane projects to the screen as a smooth 2D map, so Newton's method
converges in a few steps:

```js
// Returns the point on the plane through `origin` spanned by unit vectors `axisU` and `axisV`
// (avm.Vector3) that projects to (x, y), in pixels relative to the viewer container.
// `step` is a small world-space distance, for example 1e-4 of the model's bounding-box diagonal.
function pickOnPlane(viewer, x, y, origin, axisU, axisV, step) {
    const at = (u, v) => origin.clone().addScaledVector(axisU, u).addScaledVector(axisV, v);
    let u = 0, v = 0;
    for (let i = 0; i < 20; i++) {
        const s = viewer.worldToClient(at(u, v));
        const fx = s.x - x, fy = s.y - y;
        if (Math.hypot(fx, fy) < 0.5) return at(u, v);
        const su = viewer.worldToClient(at(u + step, v));
        const sv = viewer.worldToClient(at(u, v + step));
        const a = (su.x - s.x) / step, b = (sv.x - s.x) / step;
        const c = (su.y - s.y) / step, d = (sv.y - s.y) / step;
        const det = a * d - b * c;
        if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
        u -= (d * fx - b * fy) / det;
        v -= (a * fy - c * fx) / det;
    }
    return null;   // the cursor is at or above the plane's horizon
}

// in a ToolInterface handler:
const rect = container.getBoundingClientRect();   // the element passed to the viewer constructor
const hit = pickOnPlane(viewer, event.clientX - rect.left, event.clientY - rect.top,
    new avm.Vector3(0, 0, 0), new avm.Vector3(1, 0, 0), new avm.Vector3(0, 1, 0), step);
```

- For a ground plane, use the axes perpendicular to `model.getUpVector()`.
- Check `null` results and `Number.isFinite` on the output; points near the horizon don't converge.
- Ask the user to confirm that `worldToClient` returns container-relative pixels in their layout
  (scrolled pages, CSS transforms), as in v7.

### Gizmos built on three.js `TransformControls`

`TransformControls` needs a three.js scene and camera, so it can't run in v8. Replace it with a
drag on a plane:

1. Draw the handles (axis arrows, plane squares) as instances in an overlay render layer
   (`scene-content.md`, P2), each with its own `dbId`, so `viewer.hitTest(x, y)` tells you which
   handle was grabbed.
2. In `handleButtonDown`, pick the drag plane: for an axis handle, the plane that contains the
   axis and faces the camera most; for a plane handle, that plane. Record the start point with
   `pickOnPlane`.
3. In `handleMouseMove`, call `pickOnPlane` again. For an axis drag, project the delta onto the
   axis. Apply it to the moved part (`loaded-models.md`, P8) and to the handles, then
   `viewer.refresh(true)`.
4. Return `true` from the handlers while dragging, so orbit doesn't start, and set the usage hint
   back to `Static` in `handleButtonUp`.

Rotation rings work the same way, using the angle between the start and current points around
the ring's center on the ring's plane.
- Tools (`ToolInterface`) that do three.js math in their event handlers need both P10/P11 and the
  type renames in P5.
