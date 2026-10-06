---
type: llm
focus: last_message
weight: 1
---
Score PASS only if ALL of these hold:
1. The script sends a POST request to `https://developer.api.autodesk.com/aec/graphql` with header `Authorization: Bearer <token>` (JSON body `{"query": ..., "variables": ...}` with `Content-Type: application/json`, or raw GraphQL with `application/graphql`).
2. The GraphQL query uses `elementGroupsByProject(projectId: ...)` and requests `results` with at least `name` and `id` of each element group.
3. It handles pagination: requests `pagination { cursor }` and loops passing the cursor back (e.g. via a `pagination: { cursor: $cursor }` argument) until the cursor is null — OR explicitly states that results are paginated by cursor and shows how to fetch the next page.
4. It does not invent fields or queries that are not part of the AEC Data Model API (e.g. no REST endpoints for element groups).
5. It notes or handles that the project ID must be the AEC Data Model project ID (e.g. obtained via the `hubs` → `projects` queries), not just any ID — OR accepts it as an input without claiming a Data Management `b.`-prefixed ID works directly. FAIL if it claims a `b.`-prefixed Data Management project ID can be passed directly.
FAIL if any item is missing or wrong.
