# ACC / BIM 360 APIs — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills will live in `skills/acc-bim360/`.
Base: `https://developer.api.autodesk.com/construction/* and /bim360/* and /hq/*` · Skill prefix: `aps-acc-*` · Conventions: [`conventions.md`](conventions.md)

Status legend: ✅ built · 🔜 next · ⬜ planned — **all planned; nothing built yet in this family.**

| Status | Skill | Purpose | Endpoints / notes |
|---|---|---|---|
| ⬜ | `aps-acc-account-projects` | List/create projects in an account (Account Admin) | `GET/POST /construction/admin/v1/accounts/{id}/projects` |
| ⬜ | `aps-acc-project-users` | List/add/update project users and products | `/construction/admin/v1/projects/{id}/users` |
| ⬜ | `aps-acc-companies-and-roles` | Companies, roles, business units | `/hq/v1/accounts/{id}/companies, /roles` |
| ⬜ | `aps-acc-docs-custom-attributes` | Define and set custom attributes on Docs files | `/bim360/docs/v1/projects/{id}/folders/{f}/custom-attribute-definitions, …/versions:batch-update` |
| ⬜ | `aps-acc-docs-permissions` | Folder permissions for users/roles/companies | `/bim360/docs/v1/projects/{id}/folders/{f}/permissions` |
| ⬜ | `aps-acc-issues` | List/create/update issues, types, attributes, comments, attachments | `/construction/issues/v1/projects/{id}/issues` |
| ⬜ | `aps-acc-rfis` | RFIs CRUD | `/construction/rfis/v2/projects/{id}/rfis` |
| ⬜ | `aps-acc-submittals` | Submittals items/specs | `/construction/submittals/v2/projects/{id}/items` |
| ⬜ | `aps-acc-assets` | Assets, categories, statuses | `/construction/assets/v2/projects/{id}/assets` |
| ⬜ | `aps-acc-cost` | Budgets, contracts, change orders | `/cost/v1/containers/{id}/…` |
| ⬜ | `aps-acc-sheets` | Sheets, version sets, uploads | `/construction/sheets/v1/projects/{id}/…` |
| ⬜ | `aps-acc-model-coordination` | Model sets, clashes | `/bim360/modelset/v3, /bim360/clash/v3` |
| ⬜ | `aps-acc-data-connector` | Schedule and download data extracts | `/data-connector/v1/accounts/{id}/requests, /jobs` |
| ⬜ | `aps-acc-forms` | Forms and templates | `/construction/forms/v1/projects/{id}/forms` |
| ⬜ | `aps-acc-photos` | Photos | `/construction/photos/v1/projects/{id}/photos` |
| ⬜ | `aps-acc-locations` | Location breakdown structure | `/construction/locations/v2/projects/{id}/trees` |
| ⬜ | `aps-acc-relationships` | Link entities across modules | `/bim360/relationship/v2/containers/{id}/relationships` |
