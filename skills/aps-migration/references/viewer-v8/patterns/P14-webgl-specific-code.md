# P14. WebGL-specific code

- Remove `viewer.impl.glrenderer()`, `getContext('webgl')`, `webglcontextlost` handlers,
  `preserveDrawingBuffer` tweaks, custom post-processing passes, and WebXR sessions bound to the
  WebGL context.
- Screenshots: use `viewer.getScreenShot(width, height, callback, overlayRenderer)` instead of
  reading back the canvas.
- The viewer uses WebGPU whenever the browser can create a WebGPU device and falls back to WebGL
  automatically otherwise. Remove any `PublicFeatureFlags.WebGPU` toggle; the flag doesn't exist in
  v8.
- Forcing WebGL with the Initializer option `renderer: 'webgl'` is a deprecated escape hatch only
  (WebGL "may lack newer features"). If you use it, label it deprecated in a code comment and a
  TODO, and never present it as the fix:

  ```js
  // DEPRECATED: forces the WebGL fallback. TODO: remove once <issue> is fixed on WebGPU.
  await Autodesk.Viewing.Initializer({ ...options, renderer: 'webgl' });
  ```
- AR/VR/XR: report as unsupported. No pattern.
- Ask users with WebGPU problems to check `navigator.gpu` in their browser, and to test on a
  supported browser before changing code. If many objects drop out of view while navigating, the
  v8 requirements page recommends lowering the Target Frame Rate setting.
