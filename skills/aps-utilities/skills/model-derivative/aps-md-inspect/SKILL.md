---
name: aps-md-inspect
description: Read-only Model Derivative inspection with curl. Manifest/translation status, list views (viewables), object tree, and ALL properties of a translated model. Use for "list all the properties", "is the translation done", "what views does the model have", "get the object tree". No approval needed (GET only).
---

# Inspect a translated model (curl)

Spec: `modelderivative/modelderivative.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## Prerequisites
- 2-legged token `data:read viewables:read`, or a 3-legged one for ACC/BIM 360/Fusion sources.
- The model has been translated (`aps-md-translate`).
- `curl`, `jq`.

```bash
APS=https://developer.api.autodesk.com
# token: see "Getting an access token" in aps-utilities/SKILL.md (run from the aps-utilities folder)
TOKEN=$(python3 skills/authentication/aps-auth-2legged/scripts/get_token.py --raw --scope "data:read viewables:read")
H=(-H "Authorization: Bearer $TOKEN")
# URN = URL-safe base64, no padding, of the objectId / version URN
URN=$(printf %s "urn:adsk.objects:os.object:my-bucket/house.rvt" | base64 | tr -d '=\n' | tr '+/' '-_')
MD="$APS/modelderivative/v2/designdata/$URN"
```

## Calls
```bash
curl -sS "$MD/manifest" "${H[@]}" | jq '{status, progress, derivatives: [.derivatives[]? | {outputType, status}]}'

# Views (viewables): name | role | guid
curl -sS "$MD/metadata" "${H[@]}" | jq -r '.data.metadata[] | [.name, .role, .guid] | @tsv'
GUID=$(curl -sS "$MD/metadata" "${H[@]}" | jq -r '[.data.metadata[] | select(.role=="3d")][0].guid')

# Object tree
curl -sS "$MD/metadata/$GUID" "${H[@]}" | jq .

# All properties (add &objectid=3 for one object)
curl -sS "$MD/metadata/$GUID/properties?forceget=true" "${H[@]}" | jq .
```

## Handling 202
Tree and properties return `202` while the service extracts them. Repeat the call until `200`:
```bash
PROPS=$(mktemp)
until [ "$(curl -sS -o "$PROPS" -w '%{http_code}' "$MD/metadata/$GUID/properties?forceget=true" "${H[@]}")" = 200 ]; do sleep 5; done
jq '.data.collection | length' "$PROPS"
```

## Notes
- Property groups can be plain strings (e.g. `Appearance`) instead of objects. Test with `jq 'type'` before indexing.
- `externalId` values are base64 paths; ignore for display.
- Filtering server-side: `POST …/metadata/{guid}/properties:query` with a `query` body (see the spec) instead of downloading everything. It is a read-only `POST`.
- Endpoints: `GET …/{urn}/manifest`, `…/metadata`, `…/metadata/{guid}`, `…/metadata/{guid}/properties`, `…/thumbnail`.
