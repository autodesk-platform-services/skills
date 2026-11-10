---
name: aps-viewer-view-model
description: Display a translated model in the APS Viewer in the browser, via a tiny local server that hands the page a short-lived `viewables:read` token (client secret never reaches the browser). Use for "show it in the Viewer", "display the model", "open the SVF2 in a viewer page". Read-only — no approval needed. Model must already be translated (`aps-md-translate`).
---

# View a translated model (Viewer)

## Prerequisites
- `.env` credentials. 2-legged `viewables:read` for OSS objects; `--three-legged` (scope `data:read viewables:read`, browser sign-in if needed) for Fusion Team / ACC / BIM 360 files.
- Source already translated to SVF2 (or SVF) — `aps-md-translate --wait`, check with `aps-md-inspect`.

## Usage
```bash
python scripts/view_model.py --bucket my-bucket --key house.rvt
python scripts/view_model.py --object-id "urn:adsk.objects:os.object:b/k.ipt" --port 8200
python scripts/view_model.py --urn <base64url urn> --no-open
python scripts/view_model.py --urn <version urn, base64url> --three-legged   # Fusion Team / ACC / BIM 360
```
Opens `http://127.0.0.1:8123` (127.0.0.1 only). Ctrl+C stops the server.

## How it works
- `GET /` serves one HTML page: Viewer `7.*` (`env: AutodeskProduction2`, `api: streamingV2` for SVF2), `GuiViewer3D`, `Document.load('urn:<urn>')`.
- `GET /token` returns `{access_token, expires_in}` for scope `viewables:read` only; the Viewer calls it via `getAccessToken` and refreshes before expiry.
- Nothing is written to APS; the only APS call is the token request.

## Pitfalls
- Load failure code 4/403: token scope or region mismatch; translation must exist in the region the Viewer reads (US by default).
- Blank viewer, no error: translation failed or has no 3D view — `aps-md-inspect manifest`.
- SVF (not SVF2) sources still load, but drop `streamingV2`/`AutodeskProduction2` for legacy `env: 'AutodeskProduction'` only if SVF2 derivatives are absent.
- Never put the client secret or a write-scope token in the page. For Fusion/ACC/BIM 360 files use `--three-legged` with the version's derivatives URN (`GET …/items/{id}/tip` → `relationships.derivatives.data.id`, same as base64url of the version URN). That puts the user's token in the page — localhost only, keep it that way.
