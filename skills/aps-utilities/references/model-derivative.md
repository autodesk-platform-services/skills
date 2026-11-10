# Model Derivative API — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills will live in `skills/model-derivative/`.
Base: `https://developer.api.autodesk.com/modelderivative/v2` · Skill prefix: `aps-md-*` · Conventions: [`conventions.md`](conventions.md)

Status legend: ✅ built · 🔜 next · ⬜ planned — **2 built (`aps-md-translate`, `aps-md-inspect`); the rest planned.**

| Status | Skill | Purpose | Endpoints / notes |
|---|---|---|---|
| ✅ | `aps-md-translate` | Start a translation job (SVF2/SVF/OBJ/STL/STEP/IGES/IFC/DWG/thumbnail), incl. ZIP root filename and region | `POST /designdata/job` |
| ✅ | `aps-md-wait-for-manifest` → `aps-md-translate --wait` | Poll the manifest until complete; report progress/failures | `GET /designdata/{urn}/manifest` |
| ✅ | `aps-md-get-manifest-and-derivatives` → `aps-md-inspect manifest` | Inspect derivatives, download a derivative (OBJ, thumbnails) via signed cookies | `GET …/manifest, GET …/manifest/{derivativeUrn}/signedcookies` |
| ✅ | `aps-md-list-viewables` → `aps-md-inspect views` | List model views / metadata GUIDs | `GET /designdata/{urn}/metadata` |
| ✅ | `aps-md-get-object-tree` → `aps-md-inspect tree` | Object hierarchy for a viewable (handles 202 'processing') | `GET …/metadata/{guid}` |
| ✅ | `aps-md-get-properties` → `aps-md-inspect properties` | All properties, with `objectid` filter and pagination for large models | `GET …/metadata/{guid}/properties` |
| ⬜ | `aps-md-query-properties` | Server-side property query/filter | `POST …/metadata/{guid}/properties:query` |
| ⬜ | `aps-md-thumbnail` | Fetch model thumbnail | `GET /designdata/{urn}/thumbnail` |
| ⬜ | `aps-md-delete-manifest` | Delete derivatives | `DELETE /designdata/{urn}/manifest` |
| ⬜ | `aps-md-supported-formats` | Which output formats exist for an input extension | `GET /designdata/formats` |
| ⬜ | `aps-md-upload-and-translate` | Composite: OSS upload → translate → wait → viewable URN | `composes aps-oss-upload-object + above` |
| ⬜ | `aps-md-translate-acc-version` | Composite: translate/refresh derivatives for an ACC/BIM 360 version URN | `composes aps-dm-get-version + translate` |
