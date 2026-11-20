# GraphQL patterns

Read this when writing or debugging queries for the AEC Data Model, Manufacturing Data Model, or Data Exchange
GraphQL APIs. Domain-specific types and fields are in each API's schema and in the domain skills. This file
covers what they share.

Don't guess field names. Get the schema from the API docs (find the source ID with `aps-reference`) or by
running introspection against the endpoint with a valid token, and check types before writing queries. The
AEC Data Model endpoint is `POST https://developer.api.autodesk.com/aec/graphql`.

## Shape of a request

```json
{ "query": "query Q($id: ID!) { ... }", "variables": { "id": "..." } }
```

- Send variables separately, never by string interpolation.
- **Check `errors` before `data`.** The HTTP status is 200 even when the query failed, and `data` can be
  partial with `null` for the failed fields.
- A `NOT_FOUND` for something that exists usually means the wrong ID kind, the wrong region, or a hub that
  isn't activated for the API. See `ids-and-urns.md` and `regions.md`.

## Cursor pagination

Lists return `results` and `pagination { cursor }`. Page like this:

```graphql
query Elements($groupId: ID!, $cursor: String) {
  elementsByElementGroup(elementGroupId: $groupId, pagination: { limit: 100, cursor: $cursor }) {
    pagination { cursor pageSize }
    results { id name }
  }
}
```

1. First page: pass `limit` (no cursor).
2. Pass the returned `cursor` into the next request.
3. Stop when `cursor` is empty or `null`, or `results` is empty.
4. The allowed `limit` range has a maximum that depends on the queried object. If it isn't given, a default
   applies. Use the largest value that keeps the response comfortable.
5. Treat cursors as short-lived and tied to the exact query and filters. Don't store them for later; if
   a cursor is rejected, restart the listing.

## Fragments and reuse

Define selection sets once and reuse them so queries stay consistent:

```graphql
fragment ElementBasics on Element { id name }

query { elementsByElementGroup(elementGroupId: "...") { results { ...ElementBasics } } }
```

For string-built queries, keep fragments as constants and append them to each query document. A fragment
must be used by the operation, and unused fragments cause a validation error.

## Keep queries cheap

GraphQL usage is limited by query cost (the rate limit is cost-based), and the AEC Data Model API reports
usage as Data In and Data Out volume, so returning less is both faster and cheaper.

- **Filter for what you need**: filter elements by category or property rather than listing a whole model.
- **Select only needed fields**; filter properties by name or by definition ID instead of returning all of them.
- **Look up property definitions once** per element group, build a local map, cache it, and refresh when a
  definition is missing. Don't resolve each property per request.
- **Don't key on name alone.** The same property name can map to several definitions; include specification
  and units in the key.
- **Aggregate on the server** (distinct values with counts) when the answer is a summary.
- **Process changes, not whole models**: use change notifications plus the version-diff queries instead of
  re-reading everything on a timer. Diff queries have limits (see `aps-aec-data-model`).
- **Measure Data Out per workflow** to find the expensive query, then reduce it.
- **Keep one request under the single-query cost cap.** Split wide queries instead of nesting deeper.

## Debugging

- Reproduce in the API's explorer or with curl using the exact variables.
- Use the same token type the docs require. Some GraphQL APIs require a user token on every call, and some
  accept an app token for part of the surface (see the domain skill).
- If a field is missing, the schema may have changed. Re-fetch it before changing code.
