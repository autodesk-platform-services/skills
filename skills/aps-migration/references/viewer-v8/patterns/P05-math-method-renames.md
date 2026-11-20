# P5. Math method renames (r71 → v8)

From the v8 reference for `Box3`, `Vector3`, and `Matrix4`. When a method isn't in this table,
check the class page before using it.

| r71 (v7 `THREE`) | v8 (`avm`) |
| --- | --- |
| `box.center(target)` | `box.getCenter(target)` |
| `box.size(target)` | `box.getSize(target)` |
| `box.empty()` | `box.isEmpty()` |
| `box.isIntersectionBox(other)` | `box.intersectsBox(other)` |
| `box.setFromObject(object3d)` | None. Use `instances.getWorldBounds(id, box)` (`P19-bounding-boxes.md`). |
| `m.getInverse(other)` | `m.copy(other).invert()` |
| `m.getPosition()`, `v.getPositionFromMatrix(m)` | `v.setFromMatrixPosition(m)` |
| `m.multiplyVector3(v)` | `v.applyMatrix4(m)` |
| `m.extractRotation(...)`, `m.makePerspective(...)`, `m.makeOrthographic(...)` | Not in the reference. Use `decompose` or `makeRotationFromQuaternion`; for cameras, use `av.Camera` (P10). |
| `v.project(camera)`, `v.unproject(camera)` | Not on `avm.Vector3`. Use `viewer.worldToClient` / `viewer.clientToWorld` (P11). |
