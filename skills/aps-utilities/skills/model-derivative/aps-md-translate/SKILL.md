---
name: aps-md-translate
description: Start a Model Derivative translation job with curl (SVF2 by default; also SVF, OBJ, STL, STEP, IGES, IFC, thumbnail) for an OSS object or an ACC/BIM 360/Fusion file, and poll the manifest until it finishes. Use for "translate to SVF2", "prepare for the Viewer", "convert to OBJ/STL", "re-translate". A modification, so it needs user approval first.
---

# Translate a model (Model Derivative, curl)

Spec: `modelderivative/modelderivative.yaml` in https://github.com/autodesk-platform-services/aps-sdk-openapi

## Prerequisites
- 2-legged token (`data:read data:write viewables:read`) for OSS objects. For ACC/BIM 360/Fusion sources use a 3-legged token (`aps-auth-3legged`, scope `data:read data:write viewables:read`).
- Source already uploaded (`aps-oss-upload-object` or `aps-dm-upload-file-to-folder`).
- `curl`, `jq`.

## URN
URL-safe base64 (no padding) of the OSS `objectId`, or of the version URN for project files:
```bash
URN=$(printf %s "urn:adsk.objects:os.object:my-bucket/house.rvt" | base64 | tr -d '=\n' | tr '+/' '-_')
```

## Start the job (POST, needs approval)
`POST /modelderivative/v2/designdata/job`
```bash
APS=https://developer.api.autodesk.com
TOKEN=$(python skills/authentication/aps-auth-2legged/scripts/get_token.py --raw --scope "data:read data:write viewables:read")

curl -sS -X POST "$APS/modelderivative/v2/designdata/job" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"input\":{\"urn\":\"$URN\"},
       \"output\":{\"destination\":{\"region\":\"us\"},\"formats\":[{\"type\":\"svf2\",\"views\":[\"2d\",\"3d\"]}]}}"
```
`200` = job created, `201` = the derivative already exists (nothing new generated). Other `type` values: `svf`, `obj`, `stl`, `step`, `iges`, `ifc`, `thumbnail`; the supported input to output matrix is `GET /modelderivative/v2/designdata/formats`.

Variants:
- **Overwrite existing derivatives**: add header `-H "x-ads-force: true"`. Call this out in the approval request, because it replaces the current derivatives.
- **ZIP source (e.g. composite design)**: `"input":{"urn":"…","compressedUrn":true,"rootFilename":"main.iam"}`.
- **Different region**: `destination.region` is lowercase (`us`, `emea`); reads need a matching `x-ads-region`.

## Wait for completion (GET, no approval)
```bash
until s=$(curl -sS "$APS/modelderivative/v2/designdata/$URN/manifest" -H "Authorization: Bearer $TOKEN" | jq -r '.status'); \
      [ "$s" = success ] || [ "$s" = failed ] || [ "$s" = timeout ]; do echo "status=$s"; sleep 10; done
echo "final status: $s"
```
The manifest has `status`, `progress` and per-derivative `status`/`messages`.

## Pitfalls
- `success` can still carry per-derivative `messages`. Inspect them (`aps-md-inspect`).
- Region must match where the derivatives should live; reads need the same `x-ads-region`.
- Deleted source buckets make the URN dead.
- `403`: token lacks scope, or for project files the token is 2-legged and the app is not a Custom Integration. Use the 3-legged token.
