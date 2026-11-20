# P11. Raycasting, hit-testing, and screen projection

| v7 | v8 |
| --- | --- |
| `new THREE.Raycaster(...)`, `viewer.impl.viewportToRay`, `viewer.impl.rayIntersect` | `viewer.hitTest(x, y, ignoreTransparent)` → `Intersection` |
| `viewer.impl.hitTest(...)` | `viewer.hitTest(...)` or `viewer.clientToWorld(clientX, clientY, ignoreTransparent)` |
| `point.clone().project(camera)` + manual NDC→pixel conversion | `viewer.worldToClient(point, camera)` (camera optional, defaults to the viewer's camera) |
| Picking custom overlay meshes via raycaster | Give instances a `dbId` (`P04-scenebuilder-to-dynamic-model.md`) so built-in selection and hit-testing return them |

- Multi-hit picking (every surface along a ray, `impl.castRayViewport` with `clientToViewport`) and
  hit-testing restricted to some models (`impl.hitTest(x, y, true, null, modelIds)`) have no
  documented v8 equivalent. `viewer.hitTest` returns the nearest hit only. Report both as gaps
  (`../gaps.md`). The closest documented option for model filtering is hiding the other models
  with `viewer.hideModel(modelId)` while picking; ask the user to test whether hidden models are
  skipped.
- Arbitrary-ray intersection (a ray that doesn't start at a screen point, for example "find
  neighboring elements" or sensor placement) has no documented v8 API. Report it as a gap; don't
  reach into internals.
- `hitTest` and `clientToWorld` return `null` where the cursor isn't over geometry. To get a point
  on a plane under the cursor (`viewer.impl.intersectGround`, drawing and markup tools, gizmo
  drags), use the recipe below.

## Point on a plane under the cursor

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
