# P6. Custom materials and shaders → built-in materials

| v7 | v8 |
| --- | --- |
| `MeshPhongMaterial`, `MeshLambertMaterial`, `MeshStandardMaterial` | `avs.StandardMaterial` (`color`, `opacity`, `specularColor`, `specularPower`, `fresnelStrength`, `metal`, `map`, `specularMap`, `normalMap`/`normalScale` or `bumpMap`/`bumpScale` (mutually exclusive), `alphaMap`, `vertexColors`, `side`, `depthTest`, `depthWrite`, `transparent`) |
| `MeshBasicMaterial`, `SpriteMaterial` | `avs.UnlitMaterial` (`color`, `opacity`, `map`, `alphaMap`, `vertexColors`, `side`, `depthTest`, `depthWrite`, `transparent`) |
| `LineBasicMaterial`, `LineDashedMaterial` | `avs.LineMaterial` (`color`, `opacity`, `vertexColors`, `depthTest`, `depthWrite`, `transparent`; always 1 px, no dashes, no textures). Geometry indices are vertex pairs, one pair per segment. |
| `PointsMaterial` / `PointCloudMaterial` | `avs.PointsMaterial` (`size` in px, `color`, `opacity`, `vertexColors`, `map`, `depthTest`, `depthWrite`, `transparent`) |
| `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile` | No equivalent. Approximate with `vertexColors`, textures, or theming; otherwise report a gap. |
| `viewer.impl.matman().addMaterial(...)` | Not needed; `instances.add`/`setMaterial` take ownership. |

All four share the `Material` interface (`clone`, `get/setColor`, `get/setOpacity`,
`get/setVertexColors`, `get/setDepthTest`, `get/setDepthWrite`, `get/setTransparent`). Pass
`color` as a hex number; the reference also lists `avs.Color` and CSS strings, but `avs.Color` was
reported missing at runtime (see the gotchas in `SKILL.md`). `opacity` below 1 needs `transparent: true`.

Never invent a shader workaround. List the gap (see `../gaps.md`) and move on.

## Color and vector arguments to viewer methods

| Method | Argument on v8 |
| --- | --- |
| `viewer.setThemingColor(dbId, color, model, recursive)` | `avm.Vector4(r, g, b, intensity)`, all in [0, 1] (the reference says `Vector4`). Replace `new THREE.Vector4(...)`. |
| `viewer.setSelectionColor(color, selectionType)` | The reference still says `THREE.Color`, which v8 doesn't expose. Leave the call in place, wrap it in a try/catch, and ask the user to test which argument works (a hex number, or `{ r, g, b }`). Report the docs gap. |
| Section planes, `setCutPlanes` | `avm.Vector4` (P5) |
| Text hit-testing helpers using `THREE.Vector2`/`Box2` | `avm.Vector2`/`avm.Box2` |
