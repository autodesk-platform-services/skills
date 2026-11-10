# AEC Data Model API (GraphQL) — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills will live in `skills/aec-data-model/`.
Base: `https://developer.api.autodesk.com/aec/graphql` · Skill prefix: `aps-aecdm-*` · Conventions: [`conventions.md`](conventions.md)

Status legend: ✅ built · 🔜 next · ⬜ planned — **all planned; nothing built yet in this family.**

| Status | Skill | Purpose | Endpoints / notes |
|---|---|---|---|
| ⬜ | `aps-aecdm-query-basics` | Run a GraphQL query with pagination (`cursor`) and the Python client pattern | `POST /aec/graphql` |
| ⬜ | `aps-aecdm-hubs-projects` | hubs → projects → elementGroups (Revit models) | `query { hubs { projects { elementGroupsByProject … }}}` |
| ⬜ | `aps-aecdm-elements-and-properties` | Elements by category/filter, property definitions, values | `elementsByElementGroup(filter:…)` |
| ⬜ | `aps-aecdm-reference-properties` | Type/host relationships (`references`) | `referenceProperty` |
| ⬜ | `aps-aecdm-versions` | Query a specific model version | `elementGroupAtVersion` |
| ⬜ | `aps-aecdm-export-table` | Composite: flatten elements+properties to CSV/XLSX | `composes above` |
