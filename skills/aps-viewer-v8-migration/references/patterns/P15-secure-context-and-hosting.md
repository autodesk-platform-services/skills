# P15. Secure context and hosting

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
