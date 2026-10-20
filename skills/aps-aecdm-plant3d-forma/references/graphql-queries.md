# AEC Data Model — Plant 3D GraphQL reference

## Hubs (paginated)

```graphql
query GetHubs($pagination: PaginationInput) {
  hubs(pagination: $pagination) {
    pagination { cursor }
    results {
      id
      name
      alternativeIdentifiers { dataManagementAPIHubId }
    }
  }
}
```

Keep hubs where `dataManagementAPIHubId` starts with `b.`.

## Projects (paginated)

```graphql
query GetProjects($hubId: ID!, $pagination: PaginationInput) {
  projects(hubId: $hubId, pagination: $pagination) {
    pagination { cursor }
    results {
      id
      name
      alternativeIdentifiers { dataManagementAPIProjectId }
    }
  }
}
```

## Folders

```graphql
query GetFoldersByProject($projectId: ID!) {
  foldersByProject(projectId: $projectId) {
    results {
      id
      name
      folders { results { id name } }
    }
  }
}
```

## Element groups by folder subtree (preferred)

```graphql
query GetElementGroupsByFolderAndSubFolders(
  $projectId: ID!
  $folderId: ID!
  $filter: ElementGroupFilterInput
  $pagination: PaginationInput
) {
  elementGroupsByFolderAndSubFolders(
    projectId: $projectId
    folderId: $folderId
    filter: $filter
    pagination: $pagination
  ) {
    pagination { pageSize cursor }
    results {
      id
      name
      parentFolder {
        id
        name
        parentFolder { id name }
      }
      alternativeIdentifiers { fileUrn fileVersionUrn }
    }
  }
}
```

Example variables:

```json
{
  "projectId": "<aec-project-id>",
  "folderId": "<acc-folder-id>",
  "filter": { "searchType": "ALL" },
  "pagination": { "limit": 50, "cursor": null }
}
```

## Element groups by whole project (small projects only)

```graphql
query GetElementGroupsByProject(
  $projectId: ID!
  $filter: ElementGroupFilterInput
  $pagination: PaginationInput
) {
  elementGroupsByProject(
    projectId: $projectId
    filter: $filter
    pagination: $pagination
  ) {
    pagination { cursor }
    results {
      id
      name
      parentFolder {
        id
        name
        parentFolder { id name }
      }
      alternativeIdentifiers { fileUrn fileVersionUrn }
    }
  }
}
```

## Targeted element fetch (production-oriented)

```graphql
query ElementsByClass(
  $elementGroupId: ID!
  $pagination: PaginationInput
) {
  elementsByElementGroup(
    elementGroupId: $elementGroupId
    filter: {
      query: "property.name.category==Doors"
    }
    pagination: $pagination
  ) {
    pagination { cursor }
    results {
      id
      name
      properties(filter: { names: ["Mark", "Tag"] }) {
        results { name value displayValue }
      }
    }
  }
}
```

For Plant 3D, prefer property **definition ids** from `propertyDefinitionsByElementGroup` in `filter.query` once discovered.

## Property definitions (cache per element group)

```graphql
query PropertyDefinitions($elementGroupId: ID!, $pagination: PaginationInput) {
  propertyDefinitionsByElementGroup(
    elementGroupId: $elementGroupId
    pagination: $pagination
  ) {
    pagination { cursor }
    results {
      id
      name
      specification
      units { id name }
    }
  }
}
```

## ID cheat sheet

| API | Id to use |
| --- | --- |
| AEC Data Model GraphQL | `hubs.results[].id`, `projects.results[].id`, element group `id` |
| Data Management REST | `dataManagementAPIHubId`, `dataManagementAPIProjectId`, `fileUrn` / `fileVersionUrn` |

Never pass `b.xxx` DM hub id where GraphQL expects the AEC hub `id`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No hubs | OAuth scopes; user not member of hub; all hubs filtered out (no `b.*` id) |
| No data sets | Wrong element group names; wrong folder; model not published to AEC Data Model |
| Scan hangs / 502 | Whole-project scan on large ACC project — use folder subtree |
| Wrong 2D/3D pairing | Data sets under different Plant 3D project folders (grandparent mismatch) |

## Table Names filter example

Property: `autodesk.plant3d.parameter:tableNames-1.0.0`

Display value (leaf-first): `GateValve,HandValves,InLineAssets,EngineeringItems`

Example filter fragment:

```
property.id.autodesk.plant3d.parameter:tableNames-1.0.0=contains='GateValve,HandValves,InLineAssets,EngineeringItems'
```

Do **not** use `=contains='EngineeringItems'` alone — it over-matches `NonEngineeringItems`.
