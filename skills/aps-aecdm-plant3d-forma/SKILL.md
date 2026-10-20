---
name: aps-aecdm-plant3d-forma
description: >
  Discovers AutoCAD Plant 3D content in Forma and ACC via AEC Data Model GraphQL—hubs, projects,
  folders, element groups (P&ID and 3D data sets), local .dcf schema, and element queries.
  Covers folder vs project scan modes, Plant 3D project grouping, and production best practices
  (Data Out, filters, pagination). Use when integrating Plant 3D with Forma, ACC, AEC Data Model,
  P&ID Data Set, 3D Piping Data Set, or Plant 3D element quality workflows.
metadata:
  author: Developer Advocates @ Autodesk
  products: "APS, AEC Data Model, Forma, ACC, BIM 360, AutoCAD Plant 3D"
  technologies: "GraphQL, OAuth, Node.js"
  industries: "AEC"
compatibility: Requires 3-legged OAuth with AEC Data Model access and a published Plant 3D project in ACC/Forma.
---

# Plant 3D in Forma / ACC via AEC Data Model

GraphQL endpoint: `POST https://developer.api.autodesk.com/aec/graphql` with 3-legged OAuth (`data:read` minimum).

## When to load references

- GraphQL query templates, variables, troubleshooting: read [references/graphql-queries.md](references/graphql-queries.md) when writing or debugging queries.
- Local `.dcf` schema (classes, columns, picklists, relationships): read [references/plant3d-schema.md](references/plant3d-schema.md) when validating properties, building class filters, or explaining why cloud schema is unavailable.

## Mental model

| AEC Data Model | Plant 3D meaning |
| --- | --- |
| Hub | Forma / ACC / BIM 360 hub |
| Project | ACC project |
| Folder | Project files tree (e.g. **Project Files**) |
| Element group | Synced model container — a Plant 3D **data set** when `name` matches known labels |
| Element | Row in a PnP table (equipment, pipe run, relationship, …) |

Typical data set element group names:

- `P&ID Data Set` (2D / ProcessPower catalog)
- `3D Piping Data Set` (3D / Piping catalog)
- `3D Models Data Set` (often treated like 3D piping for pairing)

Maintain a configurable allowlist; trim and match names exactly.

**Grouping without Data Management folder walks:** Request `parentFolder { parentFolder { id name } }` on each element group. The **grandparent** folder is usually the **Plant 3D project** folder; the **parent** is the folder that directly holds the data set.

## Discovery workflow

```
- [ ] 1. List hubs → keep Forma/ACC/BIM 360 (DM hub id `b.*`)
- [ ] 2. List projects (AEC project id for GraphQL)
- [ ] 3. List folders — user picks subtree (e.g. Project Files)
- [ ] 4. Scan element groups → filter by data set names
- [ ] 5. Group data sets by grandparent folder (Plant 3D project)
- [ ] 6. Load local .dcf schema; query elements with narrow GraphQL filters
```

### Step 1 — Hubs

Paginate `hubs`. Keep rows where `alternativeIdentifiers.dataManagementAPIHubId` **starts with `b.`**.

### Step 2 — Projects

Paginate `projects(hubId: $aecHubId)`. Use **`results[].id`** in GraphQL. Keep `dataManagementAPIProjectId` for Data Management REST only.

### Step 3 — Folders

Use `foldersByProject(projectId)`. Let the user choose a subtree before scanning for data sets.

### Step 4 — Plant 3D data sets

| Mode | Query | When to use |
| --- | --- | --- |
| **Folder subtree** | `elementGroupsByFolderAndSubFolders` | Default for large projects; bounded per folder; parallelize subtrees with modest concurrency |
| **Whole project** | `elementGroupsByProject` | Small projects only — often **timeouts** on large ACC projects |

Paginate with `limit` **1–99** (100 is rejected). Filter client-side to your data set name allowlist.

### Step 5 — Plant 3D project grouping

Bucket by **`parentFolder.parentFolder`**.

### Step 6 — Schema (local) and elements (cloud)

**Schema:** AEC Data Model does **not** publish the full Plant 3D PnP catalog. Use **ProcessPower.dcf** (P&ID) and **Piping.dcf** (3D) from the Plant 3D project that was published to ACC. See [references/plant3d-schema.md](references/plant3d-schema.md).

**Property definitions:** Cache `propertyDefinitionsByElementGroup` per element group.

**Elements:** Use `elementsByElementGroup` with narrow element filters and `properties(filter: { names: [...] })`. Separate offline schema from hot-path element reads.

## Gotchas

- **Ids:** GraphQL uses AEC hub/project/element group ids — not `b.xxx` DM hub ids in GraphQL variables.
- **Table Names:** Comma-separated class chain; `=contains='EngineeringItems'` also matches `NonEngineeringItems`. Filter exact chains in application logic or query deeper classes.
- **2D vs 3D:** Different PnP id spaces; align cross-discipline with **Tag** (and often Spec, Status, Area).
- **Data Out:** Broad property sync is expensive — measure per workflow ([pricing](https://aps.autodesk.com/blog/data-model-apis-included-subscriptions-plus-flexible-ways-scale), [patterns](https://aps.autodesk.com/blog/aec-data-model-api-best-practices-under-new-pricing-model-practical-graphql-patterns)).
- **Point budget:** Watch `extensions.pointValue` on each GraphQL response.

## Best practices

1. Query only required elements and properties.
2. Prefer folder-scoped element group scans on large projects.
3. Cache property definitions and `.dcf` schema for the matching project version.
4. Prefer extraction events and `diffElementGroupByVersionWithLatest` over full re-fetch when state exists downstream.
5. Align APS app team with product subscription team for included API capacity.

## External links

- [AEC Data Model API docs](https://aps.autodesk.com/en/docs/aecdatamodel/v1)
- [Plant 3D publish to AEC Data Model](https://help.autodesk.com/view/PLNT3D/2027/ENU/?guid=GUID-9DDB64C5-DB59-4E78-9105-2B647BABC8A6)
- [Reference dashboard sample](https://github.com/autodesk-platform-services/aps-aecdm-plant3d-dashboard-sample) (optional implementation)
