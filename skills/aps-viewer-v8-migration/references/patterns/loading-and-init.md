# Loading, initialization, and hosting (P1, P15, P18)

## P1. Load the v8 preview

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

### Legacy baselines and script URL forms

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

### Initializer options

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

## P21. Legacy loading APIs and load options

`ViewingApplication` is gone (removed in v7; it was a separate script, `ViewingApplication.js`).
Replace it with the documented document flow:

```js
// v6/v7 legacy
const app = new Autodesk.Viewing.ViewingApplication('viewer');
app.registerViewer(app.k3D, Autodesk.Viewing.Private.GuiViewer3D);
app.loadDocument('urn:' + urn, (doc) => app.selectItem(doc.getRoot().search({ type: 'geometry', role: '3d' })[0]));

// v8 (and 7.*)
await Autodesk.Viewing.Initializer(options);
const viewer = new Autodesk.Viewing.GuiViewer3D(container);
viewer.start();
Autodesk.Viewing.Document.load('urn:' + urn, async (doc) => {
    const node = doc.getRoot().search({ type: 'geometry', role: '3d' })[0]
        ?? doc.getRoot().getDefaultGeometry();
    await viewer.loadDocumentNode(doc, node);
}, (code, message) => console.error(`Document load failed [${code}] ${message}`));
```

- `Document.load(documentId, onSuccess, onError, options)` with callbacks is the documented form,
  so keep it. `BubbleNode#search`, `getDefaultGeometry`, and `findAllViewables` are documented.
- `viewer.startWithDocumentNode` isn't in the v8 reference. Call `viewer.start()`, then
  `loadDocumentNode(doc, node, options)`.
- Path-based loading is documented: `viewer.loadModel(url, options, onSuccess, onError)` with
  `LoadOptions`. `Document.load(url + '/bubble.json')` and `doc.getViewablePath(...)` aren't on the
  v8 `Document` reference; prefer `loadDocumentNode` where the app has a manifest. Whether
  locally hosted bubbles (`env: 'Local'`) still load is untested. Ask the user to test it early.
- Documented `LoadOptions`: `fileLoader`, `keepCurrentModels`, `loadOptions`, `sharedPropertyDbPath`,
  `ids`, `loadAsHidden`, `modelNameOverride`, `placementTransform`, `applyScaling`,
  `applyPlacementInModelUnits`, `useFileProfile`, `filter`. `placementTransform` is a `Matrix4`
  (`avm.Matrix4`); the old `THREE.Matrix4` goes away.
- Not in `LoadOptions` (seen in older apps): `skipPropertyDb`, `extendStringsFetching`,
  `preserveView`, `useConsolidation`, `useADP`, `globalOffset` as a `THREE.Vector3`. Remove them
  or, if the app depends on one (for example a viewer that never needs properties), list it in the
  plan's gaps with the line that uses it. For `globalOffset` in Aggregated View, follow the
  Aggregated View guide.
- `doc.downloadAecModelData(cb)` isn't documented in v8. Report it.
- `viewer.tearDown()` and `viewer.setUp(config)` are documented, so re-initializing an existing
  viewer (for example when switching between models) still works. `tearDown(false)` keeps the
  loaded models.

### Script injected from JavaScript

Frameworks and hosts that inject the viewer `<script>` themselves (React, SvelteKit, Teams tabs,
Power BI visuals, SharePoint web parts) must wait for the script's `load` event before they touch
`window.Autodesk`, and then await the Initializer (P18). A module-level `const { Autodesk } =
window` runs before the script has loaded, and on v8 creating a viewer before the Initializer completes throws. Wrap the
injection in a promise and resolve it from `script.onload`; keep the URL in the single config
constant.

```js
function loadViewerScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${url}`));
        document.head.appendChild(script);
    });
}
await loadViewerScript(VIEWER_SCRIPT_URL);
await Autodesk.Viewing.Initializer(options);
```

## P15. Secure context and hosting

v8 runs only in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts):
HTTPS or `localhost`. The Initializer promise **rejects** when the page isn't a secure context, so
handle the rejection and show an actionable error:

```js
try {
    await Autodesk.Viewing.Initializer(options);
} catch (err) {
    showError(window.isSecureContext
        ? `Viewer initialization failed: ${err.message}`
        : 'The viewer requires HTTPS (or http://localhost).');
    throw err;
}
```

- Development: `http://localhost` works; LAN IPs (`http://192.168.x.x`) and custom hostnames over
  plain HTTP don't.
- Electron and other desktop apps loading from `file://`: check `window.isSecureContext` and
  `navigator.gpu` in the actual host; top-level `file://` may be trustworthy. Assess Viewer
  local-model-loading support separately. If the host isn't a secure context, serve the app from
  a privileged custom protocol or a local `http://localhost` server.
- Embedded hosts (SharePoint/Dynamics iframes, Power BI visuals, WebView2, Capacitor/Ionic custom
  schemes): ask the user to check `window.isSecureContext` and `navigator.gpu` inside the host.
- MCP Apps (sandboxed iframes inside an AI client) and Microsoft Teams tabs are embedded hosts too:
  check `window.isSecureContext` and `navigator.gpu` inside the host, and check the host's
  content security policy allows the viewer: `script-src` and `style-src` for the viewer host,
  and `connect-src` for the APS endpoints, including `wss:` for SVF2 streaming (see the WebSocket
  note below). Ask the user to confirm in the real host.
- Pages that open `ws://` connections (a local dev socket, for example) from an HTTPS page are
  blocked as mixed content. Use `wss://`. This is unrelated to the viewer's own connections.
- Service workers that cache viewer script URLs: cache-first strategies pin an old viewer
  version, and `7.*`/`8.*` are moving targets. Exclude viewer URLs from the cache, or version them.
  The viewer caches SVF2 geometry itself in OPFS (see below); whether a service worker that also
  caches model requests still helps offline use is untested, so ask the user to verify.
- On-prem and offline deployments: serve the intranet app over HTTPS.
- **WebSockets are required for SVF2.** v8 removed the HTTP fallback for SVF2 geometry download.
  Corporate proxies, firewalls, and reverse proxies that block or don't upgrade WebSocket
  connections to the APS streaming endpoints break model loading. Ask the user to verify on their network.
- **SVF2 geometry caching uses OPFS only** (IndexedDB is disabled). OPFS needs a secure context and
  may be unavailable or ephemeral in private browsing and some embedded hosts.
- SVF (v1) derivatives still load: the v8 getting-started guide documents `env: 'AutodeskProduction'`
  with `api: 'derivativeV2'`. Prefer `env: 'AutodeskProduction2', api: 'streamingV2'` for models
  hosted by APS (see P18). `env: 'Local'` is documented on the Initializer for locally hosted
  files; ask the user to test local viewing early, because loading is always streamed in v8.

## P18. Call the Initializer before creating a viewer

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
