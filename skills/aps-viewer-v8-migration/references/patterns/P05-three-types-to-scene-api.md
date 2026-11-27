# P5. three.js types → Scene API and math types

| v7 (three.js) | v8 |
| --- | --- |
| `THREE.Vector2/3/4`, `Matrix3/4`, `Quaternion`, `Box2/3` | `avm.Vector2/3/4`, `avm.Matrix3/4`, `avm.Quaternion`, `avm.Box2/3` |
| `THREE.Color` | Hex numbers (`0xff0000`) in material options and `setColor`. `avs.Color` is documented but reported missing at runtime; see the gotchas in `SKILL.md`. |
| `THREE.BufferGeometry` + `BufferAttribute` | `avs.BufferGeometry` + `avs.BufferAttribute`; `setIndices(Uint16Array \| Uint32Array)` |
| `THREE.Geometry` (legacy, r71) | Convert to `avs.BufferGeometry` |
| `BoxGeometry`, `SphereGeometry`, `CylinderGeometry`, `PlaneGeometry`, … | `avs.GeometryFactory.create*` (spheres, boxes, cylinders, cones, planes; optional trailing flag for edge indices) |
| `THREE.Texture` | `avs.Texture` |
| `THREE.Mesh` / `Line` / `Points` | An instance: `instances.add(geometry, material, transform)` with `StandardMaterial`/`UnlitMaterial`, `LineMaterial`, or `PointsMaterial` |
| `THREE.Object3D` / `Group` hierarchy | `avs.Node3D` scene graph via `instances.getSceneGraph(true)` |
| `THREE.Vector4` cut planes (`setCutPlanes`) | `avm.Vector4` |

Rules:

- `StandardMaterial` requires normals.
- Don't read typed arrays back after `add()`; use `getVertexCount()` and `getPosition(i, target)`.
- Geometries and materials belong to one model; clone before reusing across models.
- `GeometryFactory` creators: `createSphere(radius, widthSegments, heightSegments)`,
  `createBox(width, height, depth, generateEdges)`, `createCylinder(radius, height, radialSegments,
  generateEdges)`, `createCone(radiusTop, radiusBottom, height, radialSegments, generateEdges)`,
  `createPlane(width, height, widthSegments, heightSegments, generateEdges)`.
- Hierarchies authored in code: `new avs.InstanceNode3D(geometry, material)` creates an instance
  node you can `add()` to any `Node3D` under `instances.getSceneGraph(true)`. Node transforms are
  relative to the parent; `remove()` then `add()` reparents a subtree without recreating it.
- `avm` types use current three.js method names, not those of r71 (bundled with v7). Renaming the
  namespace isn't enough; apply the renames below. Some r71 names still work but log deprecation
  warnings, so code that must run on both v7 and v8 should use the names that both accept, or
  branch on `LMV_VIEWER_VERSION`.
- `instances.add(geometry, material, transform, bbox, dbId)`: `transform`, `bbox`, and `dbId` are
  optional.
- `avs.LineMaterial` draws one segment per pair of indices (line-pieces mode), not a line strip. A
  v7 `THREE.Line` with consecutive points needs indices `0,1, 1,2, 2,3, …`.
- Subclasses of three.js types (`THREE.MeshBasicMaterial.call(this)`,
  `Object.create(THREE.Object3D.prototype)`, `class X extends THREE.Mesh`) can't be ported by
  renaming. Rewrite them as plain classes that own an instance id (or an `avs.Node3D`) and a
  built-in material, and port ES5 constructors to classes (P20).
- Libraries that need a global `THREE` (ThreeCSG/ThreeBSP, `TransformControls`, `OrbitControls`)
  break: v8 exposes no `THREE`. Replace them (for gizmos, see `P11-transform-controls-gizmos.md`) or run CSG
  in a separate three.js copy and convert its output to `avs.BufferGeometry`.
- Custom loaders (glTF via three.js loaders, point clouds) should parse into `avs.BufferGeometry`
  and add instances to a dynamic model (P4), not into an overlay.
- TypeScript: remove `@types/three` imports from viewer-facing code. The v8 docs don't name a
  typings package, and `@types/forge-viewer` describes the v7 API (including three.js types), so
  it won't cover the Scene API or `avm` types. Don't pull in `three` to satisfy it. Remove
  `/// <reference types="forge-viewer" />` lines and the package once the app stops using v7 types,
  declare minimal local types for the v8 members you call (the geometry-exporter sample ships its
  own `scene-api.d.ts`), and ask Autodesk about official typings. Public props typed as
  `THREE.Camera` (for example in a React component) become `Autodesk.Viewing.Camera`.
