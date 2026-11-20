# Tokens for the Viewer

Read this when a browser app needs to show models and the question is which token to hand to the Viewer.

## The problem

The Viewer runs in the browser, so whatever token you give it is visible to the user (dev tools, network tab).
Never send the token your backend uses for uploads, translation, or data writes.

## The pattern

1. The backend gets a token with **only the scope the Viewer needs**: `viewables:read` ("View your viewable
   data"). Request it explicitly, so the token can't also create buckets, write data, or run jobs.
2. The backend exposes a small authenticated endpoint that returns `{ access_token, expires_in }` for that token.
3. The Viewer asks for it through its `getAccessToken` option, and renews it when `expires_in` is about to run out:

```js
const options = {
  env: 'AutodeskProduction2',
  api: 'streamingV2',               // use 'derivativeV2' for SVF; see aps-viewer for the current options
  getAccessToken: async onTokenReady => {
    const { access_token, expires_in } = await (await fetch('/api/auth/token')).json();
    onTokenReady(access_token, expires_in);
  }
};
Autodesk.Viewing.Initializer(options, () => { /* create the viewer */ });
```

4. Cache the viewer token on the server and reuse it until shortly before expiry, so each page load doesn't mint a new one.

The Viewer accepts both 2-legged and 3-legged tokens. Use 3-legged (with `viewables:read`, plus `data:read`
if the user loads files straight from a hub) when the viewing rights must follow the signed-in user. Use a 2-legged
`viewables:read` token for models that your own app owns, such as an app that translates and shows its own
files.

## What the scope does and doesn't limit

The scope limits what operations the token can perform. It doesn't, on its own, limit **which models** the token
can read. Anyone holding a 2-legged `viewables:read` token can request the derivatives of any model the app
translated, if they know its URN, until the token expires. So:

- Keep the lifetime short and cache only on the server.
- Decide on the server which URNs a user may open, and hand out URNs only for those. Don't expose a list of all URNs.
- If per-user isolation matters, prefer 3-legged tokens, so that product permissions apply.
- Check the current Authentication and Viewer docs for any newer scoping controls (use `aps-reference`).

## Gotchas

- A Viewer token request that includes `data:write` or `bucket:*` "just in case" defeats the point. Request the
  minimum.
- The token's `expires_in` is in seconds. Pass it through as given and don't hardcode 3600.
- Older samples request tokens with Authentication v1. Use the v2 token endpoint (see `SKILL.md`).
- Embedding the Viewer in a web view or headless browser and region handling are covered in `aps-viewer`.
