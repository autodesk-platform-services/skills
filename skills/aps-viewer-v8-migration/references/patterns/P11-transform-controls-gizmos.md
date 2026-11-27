# P11. Gizmos built on three.js `TransformControls`

## Gizmos built on three.js `TransformControls`

`TransformControls` needs a three.js scene and camera, so it can't run in v8. Replace it with a
drag on a plane:

1. Draw the handles (axis arrows, plane squares) as instances in an overlay render layer
   (`P02-overlays-to-render-layers.md`), each with its own `dbId`, so `viewer.hitTest(x, y)` tells you which
   handle was grabbed.
2. In `handleButtonDown`, pick the drag plane: for an axis handle, the plane that contains the
   axis and faces the camera most; for a plane handle, that plane. Record the start point with
   `pickOnPlane`.
3. In `handleMouseMove`, call `pickOnPlane` again. For an axis drag, project the delta onto the
   axis. Apply it to the moved part (`P08-move-or-animate-loaded-parts.md`) and to the handles, then
   `viewer.refresh(true)`.
4. Return `true` from the handlers while dragging, so orbit doesn't start, and set the usage hint
   back to `Static` in `handleButtonUp`.

Rotation rings work the same way, using the angle between the start and current points around
the ring's center on the ring's plane.
- Tools (`ToolInterface`) that do three.js math in their event handlers need both P10/P11 and the
  type renames in P5.
