# P1. Load the v8 preview

```html
<!-- v7 -->
<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"></script>
<link href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css" rel="stylesheet">

<!-- v8 preview -->
<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D-v8.min.js"></script>
<link href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style-v8.min.css" rel="stylesheet">

<!-- v8 GA (as shown in the v8 getting-started guide) -->
<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/8.*/viewer3D.min.js"></script>
```

- Keep the URLs in a single config constant, so the switch (and later the `8.*` GA path) is one edit.
- On the default path, switch only after the app works on v7 with the Scene API. On the v8-only
  path, switch first (see SKILL.md workflow).
- Check the loaded version at runtime with the global `LMV_VIEWER_VERSION`.
- v8 removes rolled-out and deprecated flags from `PublicFeatureFlags`; the v8 reference lists only
  `DSEndpoints` and `SlowGpuDetection`. Delete every `FeatureFlags.set(...)` call for `SceneAPI`,
  `LargeModelExperience`, and `WebGPU` once the app runs on v8 (rolled-out features are always on).
- Feature flags must be set before the Initializer. After initialization they're immutable:
  `set()` logs a warning and has no effect.

## Legacy baselines and script URL forms

Older apps load the viewer from URLs the v8 path doesn't cover. Move them to `7.*` first (one
step, on v7), then port as usual:

| Found | Do |
| --- | --- |
| `viewers/6.*/...`, `viewers/7.<n>/...` with n below 131, or a pinned `7.96.0`, `7.126`, … | Change to `viewers/7.*/`. Review the changelog for the skipped versions; the v6-era APIs below break on `7.*`. |
| `viewingservice/v1/viewers/...?v=7.25` and similar `viewingservice` URLs | Replace with `modelderivative/v2/viewers/7.*/viewer3D.min.js` and `style.min.css`. |
| `viewers/viewer3D.min.js?v=v7.0` (version only in the query string) | Same replacement. |
| Version held in a variable (`viewerVersion`, `` `viewers/${version}/...` ``) | Change the variable's value, and keep it in the single config constant. |
| Unminified `viewer3D.js` and `style.css` | Only `viewer3D-v8.min.js` and `style-v8.min.css` are documented for the v8 preview. Use the minified names. If the app needs unminified files for debugging, tell the user to ask Autodesk. |

Removed before v8, so they fail on `7.*` too (the v7 changelog lists them): `ViewingApplication`
(see P21), the `Autodesk.Viewing.WebVR` extension, and `viewerCE.js`.
