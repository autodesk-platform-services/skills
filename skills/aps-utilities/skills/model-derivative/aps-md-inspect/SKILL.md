---
name: aps-md-inspect
description: Read-only Model Derivative inspection — manifest/translation status, list views (viewables), object tree, and ALL properties of a translated model. Use for "list all the properties", "is the translation done", "what views does the model have", "get the object tree". No approval needed (GET only).
---

# Inspect a translated model

## Prerequisites
- `.env` credentials; 2-legged `data:read viewables:read`, or `--three-legged` for ACC/BIM 360/Fusion sources.
- The model has been translated (`aps-md-translate`).

## Usage
```bash
python scripts/inspect_model.py manifest   URN
python scripts/inspect_model.py views      URN                     # GET …/metadata → guids, roles
python scripts/inspect_model.py tree       URN [--guid GUID]
python scripts/inspect_model.py properties URN [--guid GUID] [--objectid 3] [--json]
```
`URN` = base64url URN, or a raw `urn:adsk.objects:…` objectId (encoded for you). `--guid` defaults to the first `3d` view.

## Notes
- Tree and properties return `202` while the service extracts them; the script polls (up to ~2 min) until `200`. Properties use `forceget=true`.
- Property groups can be plain strings (e.g. `Appearance`) instead of dicts — the readable printer handles both; `--json` gives everything.
- `externalId` values are base64 paths; ignore for display.
- Endpoints: `GET /modelderivative/v2/designdata/{urn}/manifest`, `…/metadata`, `…/metadata/{guid}`, `…/metadata/{guid}/properties`.
