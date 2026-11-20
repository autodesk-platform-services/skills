# Other APS sources: specs, schemas, samples, blog, changelogs

Read this when the docs portal pages (the method in `SKILL.md`) aren't enough: you need an exact request or
response shape, runnable code, a migration story, a changelog, or a deprecation notice.

Pick the source by the question:

| You need | Go to |
| --- | --- |
| Exact REST request and response shapes | The OpenAPI specs (below), then the REST reference page |
| GraphQL types and fields | The API's published schema or introspection (below) |
| Runnable, current code | The `autodesk-platform-services` GitHub organization |
| Announcements, deprecations, migration notes, "how do I" posts | The APS blog JSON:API |
| What changed in an API and when | The `change_history` pages in the TOC, then the blog |
| An official SDK's methods | The SDK repository and the SDK reference section of the API's docs TOC |

## OpenAPI specs

The OpenAPI specs that the official SDKs are generated from are in the `aps-sdk-openapi` repository of the
`autodesk-platform-services` GitHub organization. They are the ground truth for request and response shapes,
parameters, and enums. Read a spec with `curl` or `gh`, then `jq` or `yq` for the path you need, instead of
loading it whole.

```bash
# Public repo: no authentication needed. As of 2026-11-20 the top-level folders are:
# authentication, datamanagement, forma, modelderivative, oss, secureserviceaccount, webhooks
curl -s "https://api.github.com/repos/autodesk-platform-services/aps-sdk-openapi/contents/" | jq -r '.[].name'
curl -s "https://api.github.com/repos/autodesk-platform-services/aps-sdk-openapi/contents/webhooks" | jq -r '.[].path'
```

Not every API has a spec there (the GraphQL APIs don't, and some REST APIs may be missing). When it isn't
in the repo, the REST reference page in the docs is the source of truth.

## GraphQL schemas

The AEC Data Model, Manufacturing Data Model, and Data Exchange APIs are GraphQL. To get the schema:

- Open the API's docs (source IDs `aecdatamodel_v1`, `mfgdataapi_v3`, `fdxgraph_v1`) and look for the schema or
  reference section and the explorer.
- Or run a standard GraphQL introspection query against the endpoint with a valid token. The AEC Data Model
  endpoint is `POST https://developer.api.autodesk.com/aec/graphql`.

Use the schema to check field names and argument types before writing a query.

## GitHub: samples and SDKs

`https://github.com/autodesk-platform-services` holds the official SDKs, a large set of samples, viewer extensions,
and Postman collections. Samples are named `aps-<feature>-<language>`, often as matching Node.js and .NET pairs
(for example `aps-simple-viewer-nodejs` and `aps-simple-viewer-dotnet`). Repos with the older `forge-` prefix
are stale, and some repos are archived, so check the `archived` flag before recommending one as a starting
point for new work.

```bash
# Find repos by keyword or topic (unauthenticated: roughly 10 search calls per minute)
curl -s "https://api.github.com/search/repositories?q=org:autodesk-platform-services+webhook" | jq -r '.items[] | "\(.name)\t\(.archived)\t\(.description)"'
curl -s "https://api.github.com/search/repositories?q=org:autodesk-platform-services+topic:autodesk-viewer" | jq -r '.items[].name'

# Read a README
curl -s https://raw.githubusercontent.com/autodesk-platform-services/aps-simple-viewer-nodejs/main/README.md
```

Gotchas:

- GitHub code search needs authentication. Use `gh search code --owner autodesk-platform-services "<query>"` after
  `gh auth login`, or clone the repo and grep locally.
- Unauthenticated GitHub rate limits are tight (about 60 core requests per hour). Don't loop over every repo.
- Check a sample's last commit date and the SDK version it pins before trusting it as current.

## The APS blog (JSON:API)

The blog at `aps.autodesk.com/blog` is a Drupal site with a JSON:API. Unlike the docs portal it returns real
content. Use it for announcements, deprecations, migration guides, and worked examples.

```bash
# Search titles, newest first
curl -sg -A "Mozilla/5.0" "https://aps.autodesk.com/jsonapi/node/blog?filter[title][value]=Webhook&filter[title][operator]=CONTAINS&fields[node--blog]=title,path,field_blog_date&sort=-created&page[limit]=10" \
  | jq -r '.data[] | "\(.attributes.field_blog_date)\thttps://aps.autodesk.com\(.attributes.path.alias)\t\(.attributes.title)"'

# Search the body text
curl -sg -A "Mozilla/5.0" "https://aps.autodesk.com/jsonapi/node/blog?filter[field_body.value][value]=x-user-id&filter[field_body.value][operator]=CONTAINS&fields[node--blog]=title,path,field_blog_date&sort=-created"

# Read one post by exact title (HTML body), as plain text
curl -sg -A "Mozilla/5.0" "https://aps.autodesk.com/jsonapi/node/blog?filter[title][value]=Developer%20hubs%20user%20guide&fields[node--blog]=title,field_body&page[limit]=1" \
  | jq -r '.data[0].attributes.field_body.processed' | htmlq --text 'h2,h3,p,li,pre'
```

Gotchas:

- **Send a non-curl User-Agent** (`-A "Mozilla/5.0"`) on every request to `aps.autodesk.com`. The edge returns an
  empty HTTP 406 to curl's default.
- **Use `curl -g`** so `[` and `]` aren't treated as globbing.
- **Filtering by `path.alias` isn't supported** (the API returns a 500). Filter by title text instead, or search
  and then fetch by title.
- **`page[limit]` is capped at 50.** Page with `page[offset]` until `links.next` is gone.
- A post's publish date matters. Prefer the newest post when two disagree, and see `older-answers.md`.

## Changelogs and deprecation notices

- **Per-module changelogs** for the Forma APIs are in the `acc_v1` TOC under `change_history/` (Issues, RFIs,
  Forms, Cost, Sheets, Admin, and others).
- **Migration guides** are in the same TOC under `overview/migration-guides/` (for example the Forms API v1 to v2
  guide and the Takeoff migration guide).
- **Deprecations** are announced on the blog and in a *Note* on the endpoint's reference page (the Model
  Derivative direct derivative download, for example, is marked deprecated in favor of the signed URL endpoint).
  When an endpoint or field looks old, open its reference page and check the notes, then search the blog by the
  endpoint or field name.
- Each API's *Migration* or *What's new* guide, if present, is listed in its TOC. Index the TOC and `grep -i` for
  "migrat", "deprecat", and "changelog".
