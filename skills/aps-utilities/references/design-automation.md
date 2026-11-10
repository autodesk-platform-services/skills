# Design Automation API v3 — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills will live in `skills/design-automation/`.
Base: `https://developer.api.autodesk.com/da/us-east/v3` · Skill prefix: `aps-da-*` · Conventions: [`conventions.md`](conventions.md)

Status legend: ✅ built · 🔜 next · ⬜ planned — **1 built (`aps-da-list-appbundles`); the rest planned.**

| Status | Skill | Purpose | Endpoints / notes |
|---|---|---|---|
| ⬜ | `aps-da-nickname-and-engines` | Set app nickname, list engines (AutoCAD/Revit/Inventor/3dsMax versions) | `PATCH /forgeapps/me, GET /engines` |
| ✅ | `aps-da-list-appbundles` | List AppBundles (own + shared), auto-paginated, `--mine` filter | `GET /appbundles, GET /forgeapps/me` |
| ⬜ | `aps-da-appbundle` | Create/version/alias an AppBundle and upload the ZIP | `POST /appbundles, POST /appbundles/{id}/versions, …/aliases, S3 form upload` |
| ⬜ | `aps-da-activity` | Create/version/alias an Activity (command line, parameters, engine) | `POST /activities, …/versions, …/aliases` |
| ⬜ | `aps-da-workitem` | Submit a WorkItem with signed OSS/DM input/output URLs, poll status, fetch report | `POST /workitems, GET /workitems/{id}` |
| ⬜ | `aps-da-workitem-callback` | onComplete webhook pattern | `POST /workitems with `onComplete`` |
| ⬜ | `aps-da-batch-convert` | Composite: fan out WorkItems over a folder of files | `composes above + OSS` |
| ⬜ | `aps-da-revit-acc-roundtrip` | Composite: read Revit model from ACC, run activity, publish new version | `composes DM + DA` |
