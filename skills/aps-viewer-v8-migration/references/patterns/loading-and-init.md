# Loading, initialization, and hosting (P1, P15, P18)

## P1. Load the v8 preview

```html
<!-- v7 -->
<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"></script>
<link href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css" rel="stylesheet">

<!-- v8 preview -->
<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D-v8.min.js"></script>
<link href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style-v8.min.css" rel="stylesheet">
```

- Keep the URLs in a single config constant, so the switch (and later the `8.*` GA path) is one edit.
- Switch only after the app works on v7 with the Scene API (see SKILL.md workflow).
- Remove the deprecated `PublicFeatureFlags.SceneAPI`, `LargeModelExperience`, and `WebGPU` toggles
  once the app runs on v8.

## P15. Secure context and hosting

v8 runs only in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts):
HTTPS or `localhost`.

Add a startup guard before initializing the viewer:

```js
if (!window.isSecureContext) {
    showError('The viewer requires HTTPS (or http://localhost).');
    return;
}
```

- Development: `http://localhost` works; LAN IPs (`http://192.168.x.x`) and custom hostnames over
  plain HTTP don't.
- Electron and other desktop apps loading from `file://`: serve the app from a privileged custom
  protocol or a local `http://localhost` server.
- Embedded hosts (SharePoint/Dynamics iframes, Power BI visuals, WebView2, Capacitor/Ionic custom
  schemes): ask the user to check `window.isSecureContext` and `navigator.gpu` inside the host.
- On-prem and offline deployments: serve the intranet app over HTTPS. OPFS caching also needs a
  secure context.
- Unconfirmed: whether SVF (v1) derivatives and `env: 'Local'` still load under LME-only. Tell the
  user to test local SVF viewing early.

## P18. Call the Initializer before creating a viewer

In v7, creating a `GuiViewer3D` or `Viewer3D` without calling `Autodesk.Viewing.Initializer` first
worked, typically in apps that load local SVF files or create extra viewers later in the page
lifecycle. In v8, the Initializer is required.

```js
// v7 (worked without the Initializer, e.g. a locally hosted SVF)
const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
viewer.start('/models/house/output/0.svf');

// v8
const options = { env: 'Local' };   // or env/api/getAccessToken for models hosted by APS
Autodesk.Viewing.Initializer(options, () => {
    const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
    viewer.start('/models/house/output/0.svf');
});
```

Frameworks (React, Angular, Vue): initialize once per page and await it before creating each viewer.

```js
let initPromise;
function initViewerRuntime(options) {
    initPromise ??= new Promise((resolve) => Autodesk.Viewing.Initializer(options, resolve));
    return initPromise;
}

// in the component's mount hook:
await initViewerRuntime(options);
const viewer = new Autodesk.Viewing.GuiViewer3D(container);
```

Rules:

- Call the Initializer once per page, before the first viewer is created and after any
  `FeatureFlags.set(...)` calls (such as the v7 Scene API flag).
- Create viewers only inside the Initializer callback, or after a promise wrapping it resolves. Move
  any `new GuiViewer3D(...)`/`new Viewer3D(...)` that runs at module load, in a class constructor,
  or in a code path that can run before initialization completes.
- Multiple viewers (split screen, version comparison, minimaps): one Initializer, then create all
  viewers.
- Framework components: share one module-level initialization promise instead of calling the
  Initializer on every mount. Calling it more than once per page isn't confirmed to be supported.
- Local or offline viewing: pass `{ env: 'Local' }`; no access token is needed.
- The audit flags files that construct a viewer with no Initializer call (`no Initializer in file`)
  and files that have both (`check ordering`). For the latter, trace that every construction site
  runs after the Initializer callback.
