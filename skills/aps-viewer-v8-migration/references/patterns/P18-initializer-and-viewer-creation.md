# P18. Call the Initializer before creating a viewer

In v7, creating a `GuiViewer3D` or `Viewer3D` without calling `Autodesk.Viewing.Initializer` first
worked, typically in apps that load local SVF files or create extra viewers later in the page
lifecycle. In v8, creating a viewer (or a `MultiViewerFactory`) before the Initializer has completed
**throws an error**.

The Initializer returns a promise in v8. The callback parameter is deprecated; use `await`.

```js
// v7 (worked without the Initializer, e.g. a locally hosted SVF)
const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
viewer.start('/models/house/output/0.svf');

// v7 with a callback (deprecated)
Autodesk.Viewing.Initializer(options, () => { /* create viewer */ });

// v8
const options = { env: 'Local' };   // or the APS options below for models hosted by APS
await Autodesk.Viewing.Initializer(options);
const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
viewer.start('/models/house/output/0.svf');
```

For models hosted by APS, use the streaming endpoint:

```js
await Autodesk.Viewing.Initializer({
    env: 'AutodeskProduction2',
    api: 'streamingV2',
    getAccessToken: (callback) => fetchToken().then(({ access_token, expires_in }) => callback(access_token, expires_in)),
});
```

**Known issue with the legacy env.** With `env: 'AutodeskProduction'`, one migration found that
after moving loaded instances (P8), `model.getBoundingBox()` threw `e.makeEmpty is not a function`
from `ensureModelBBoxUpToDate`. Moving parts worked after switching to `AutodeskProduction2` +
`streamingV2`. The usage hint and node grouping changed in the same step, so the env isn't
confirmed as the only cause. If the app keeps the legacy env (for example, because a derivative
doesn't load through the streaming endpoint), test moving parts and bounding boxes, and report the
error to Autodesk (see `references/gaps.md`).

Frameworks (React, Angular, Vue): initialize once per page and await it before creating each viewer.

```js
let initPromise;
function initViewerRuntime(options) {
    initPromise ??= Autodesk.Viewing.Initializer(options);
    return initPromise;
}

// in the component's mount hook:
await initViewerRuntime(options);
const viewer = new Autodesk.Viewing.GuiViewer3D(container);
```

Rules:

- Call the Initializer once per page ("needs to be run just once", per the v8 guide), before the
  first viewer is created and after any `FeatureFlags.set(...)` calls.
- Create viewers only after the Initializer promise resolves. Move any
  `new GuiViewer3D(...)`/`new Viewer3D(...)` that runs at module load, in a class constructor, or in
  a code path that can run before initialization completes.
- Replace the callback form with `await` (or `.then(...)`). Don't wrap the callback in a
  `new Promise(...)`; the Initializer already returns one.
- Multiple viewers (split screen, version comparison, minimaps): one Initializer, then create all
  viewers.
- Framework components: share one module-level initialization promise instead of calling the
  Initializer on every mount. To tear down, call `viewer.finish()` on every viewer, then
  `Autodesk.Viewing.shutdown()`.
- Local or offline viewing: pass `{ env: 'Local' }`; no access token is needed.
- Models hosted by APS: use `env: 'AutodeskProduction2', api: 'streamingV2'`. Treat
  `env: 'AutodeskProduction'` as legacy (see the known issue above).
- Remove `webglInitParams` (including `useWebGL2`). v8 renders with WebGPU and falls back to WebGL
  on its own (P14).
- Don't call the Initializer each time a model loads. Loading another model needs only
  `viewer.loadDocumentNode(...)` (or `viewer.loadModel(...)`) on the existing viewer.
- `viewer.start()` returns a non-zero code when the viewer can't be created; check it.
- The audit flags files that construct a viewer with no Initializer call (`no Initializer in file`),
  files that have both (`check ordering`), Initializer calls that pass a callback, files that
  call the Initializer more than once, and the legacy env. For `check ordering`, trace that every
  construction site runs after the Initializer resolves. Calls in different files aren't flagged;
  check that each page runs exactly one, and that no call sits in a function that runs per model
  load.

## Initializer options

`InitOptions` in the v8 reference documents `env`, `api`, `getAccessToken`, `language`, `logLevel`,
and `webGLHelpLink`.

- **Regions.** `api` takes a region suffix when the models live outside the US:
  `streamingV2_EU` (SVF2) or `derivativeV2_EU` (SVF) for Europe, and `streamingV2_AUS` or
  `derivativeV2_AUS` for Australia. The suffix applies when automatic routing (the `DSEndpoints`
  feature flag) is off; with it on, use `streamingV2` or `derivativeV2` and the viewer picks the
  region. When the code builds `api` from a region variable, keep the suffix logic and change only
  the base name (`derivativeV2` → `streamingV2`). Don't collapse it to `streamingV2`: that
  points EU and AUS users at the US endpoint.
- **Tokens.** `getAccessToken(onSuccess)` is documented as asynchronous: call `onSuccess(token,
  expiresInSeconds)`. A static `accessToken` option, or a `getAccessToken` that returns the token
  synchronously, isn't documented. Convert both to the callback form (fetch the token first, then
  call `onSuccess`). The viewer uses the expiry to renew the token, so always pass it.
- **Other options seen in older apps** (`isAEC`, `document`, `useConsolidation`,
  `experimental: [...]`, `webglInitParams`) aren't in `InitOptions`. Remove them, or ask the user
  what they were for and test without them. Don't invent replacements.
