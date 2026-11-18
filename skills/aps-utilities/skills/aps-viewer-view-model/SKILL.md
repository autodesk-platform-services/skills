---
name: aps-viewer-view-model
description: Display a translated model in the APS Viewer in the browser by writing a small static HTML page with a short-lived read-only `viewables:read` token, obtained with curl (client secret never reaches the page). Use for "show it in the Viewer", "display the model", "open the SVF2 in a viewer page". Read-only, no approval needed. Model must already be translated (`aps-md-translate`).
---

# View a translated model (Viewer, curl + static HTML)

Spec: `authentication/authentication.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi (token). The Viewer itself is a browser library.

## Prerequisites
- Model translated to SVF2 (or SVF). Run `aps-md-translate`, check with `aps-md-inspect`.
- 2-legged `viewables:read` for OSS objects. For Fusion Team / ACC / BIM 360 files use a 3-legged token (scope `data:read viewables:read`) and the version's derivatives URN.
- No server and no Python: the page is a static file.

## Recipe
```bash
# token: from the aps-auth-* skill (credentials, scopes, errors there); run from the aps-utilities folder
TOKEN=$(python3 skills/aps-auth-2legged/scripts/get_token.py --raw --scope "viewables:read")
URN=$(printf %s "urn:adsk.objects:os.object:my-bucket/house.rvt" | base64 | tr -d '=\n' | tr '+/' '-_')

OUT=$(mktemp -d)/viewer.html
cat > "$OUT" <<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"><title>APS Viewer</title>
<link rel="stylesheet" href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css">
<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"></script>
<style>html,body,#viewer{margin:0;height:100%}</style></head>
<body><div id="viewer"></div><script>
const token = "$TOKEN";
Autodesk.Viewing.Initializer({
  env: 'AutodeskProduction2', api: 'streamingV2',
  getAccessToken: (cb) => cb(token, 3000)
}, () => {
  const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
  viewer.start();
  Autodesk.Viewing.Document.load('urn:$URN',
    (doc) => viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()),
    (code, msg) => console.error('load failed', code, msg));
});
</script></body></html>
HTML
open "$OUT" 2>/dev/null || xdg-open "$OUT"     # macOS / Linux; on Windows: start "$OUT"
echo "$OUT"
```
The token lasts about an hour. Reload by re-running the recipe. Delete the file when done: `rm "$OUT"`.

## Gotchas
- The `viewables:read` token is read-only and short-lived. Never put the client secret or a write-scope token in the page.
- Fusion / ACC / BIM 360: use `GET …/items/{id}/tip` (via `aps-dm-browse`) to get `relationships.derivatives.data.id`, which is the same as base64url of the version URN. That puts the user's token in the file. Keep it local and delete it afterwards.
- Load failure code 4/403: token scope or region mismatch. The translation must exist in the region the Viewer reads (US by default).
- Blank viewer, no error: translation failed or has no 3D view. Check `aps-md-inspect` manifest.
- SVF (not SVF2) sources load too, but if SVF2 derivatives are absent use `env: 'AutodeskProduction'` and drop `api: 'streamingV2'`.
- If the browser blocks scripts on `file://`, serve the folder with `python3 -m http.server --bind 127.0.0.1 8123` from the page's directory and open `http://127.0.0.1:8123/viewer.html`.
