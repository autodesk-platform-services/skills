---
name: aps-md-translate
description: Start a Model Derivative translation job (SVF2 by default; also SVF, OBJ, STL, STEP, IGES, IFC, thumbnail) for an OSS object or an ACC/BIM 360/Fusion file, and optionally wait for the manifest to finish. Use for "translate to SVF2", "prepare for the Viewer", "convert to OBJ/STL", "re-translate". A modification — needs user approval first.
---

# Translate a model (Model Derivative)

## Prerequisites
- `.env` credentials. 2-legged (`data:read data:write viewables:read`) for OSS objects; add `--three-legged` for ACC/BIM 360/Fusion sources (browser login opens if needed).
- Source already uploaded (`aps-oss-upload-object` or `aps-dm-upload-file-to-folder`).

## Usage
```bash
python scripts/translate.py --bucket my-bucket --key house.rvt --wait
python scripts/translate.py --object-id "urn:adsk.objects:os.object:b/k.ipt" --format svf2 --views 2d 3d --wait --yes
python scripts/translate.py --urn <base64url urn> --format obj
python scripts/translate.py --urn <urn> --force --yes        # overwrite existing derivatives
```
URN = URL-safe base64 (no padding) of the OSS `objectId`; the script encodes `--object-id` / `--bucket --key` for you.

## Request
`POST /modelderivative/v2/designdata/job`
```json
{"input":{"urn":"…"},"output":{"destination":{"region":"us"},"formats":[{"type":"svf2","views":["2d","3d"]}]}}
```
Optional `x-ads-force: true` (overwrite), ZIP sources need `"compressedUrn":true,"rootFilename"`. `--wait` polls `GET …/manifest` until `success|failed|timeout`.

## Approval rule (enforced in code)
Prints the plan and refuses non-interactively without `--yes`. **Agents: describe it, wait for an explicit "yes", then add `--yes`.** `--force` is called out in the plan because it overwrites derivatives.

## Pitfalls
- Result `success` can still carry per-derivative `messages` — inspect them (`aps-md-inspect manifest`).
- Region must match where the derivatives should live (`destination.region` is lowercase: `us`, `emea`); reads need the same `x-ads-region`.
- Inventor `.ipt` etc. translate fine from OSS; deleted source buckets make the URN dead.
