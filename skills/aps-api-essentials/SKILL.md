---
name: aps-api-essentials
description: >
  Cross-API conventions for Autodesk Platform Services (APS) REST and GraphQL calls. Use when the user hits
  a 429, 202, 401, 403, or 404 from any APS API, needs to encode or decode a URN, mixes up hub, project,
  item, and version IDs (the b. prefix), must pick a data region (US, EMEA, AUS, and others), paginates
  results or GraphQL cursors, polls or waits for an async job, wants to write efficient GraphQL queries, or asks
  whether to use an APS SDK or raw REST. Includes operator scripts to get a token, count bucket objects,
  check translation status, list webhooks, and download a derivative.
metadata:
  author: Developer Advocates @ Autodesk
  version: "0.1"
  products: "APS, Data Management, Model Derivative, Webhooks, AEC Data Model, Manufacturing Data Model"
  technologies: "REST, GraphQL, Node.js, .NET, TypeScript"
  industries: "AEC, Manufacturing, Media & Entertainment"
---

# APS API essentials

The conventions every APS API shares, and the first place to look when a call fails for a reason that isn't
specific to one API. Per-API behavior lives in the domain skills.

Numbers (rate limits, page sizes, scopes per endpoint) are in each API's docs and change. Use the
`aps-reference` skill to read them, and don't copy them into code comments as facts.

## Where to look

| The problem is about | Read |
| --- | --- |
| A call fails and the cause isn't obvious | `references/errors-and-triage.md` (start here) |
| URNs, `b.` prefixes, hub, project, item, version, and lineage IDs | `references/ids-and-urns.md` |
| Which region, and how each API takes it | `references/regions.md` |
| 429s, `Retry-After`, page sizes, `next` links, cursor expiry | `references/limits-and-pagination.md` |
| 202 responses, jobs, polling versus webhooks, timeouts, HTTP 200 with errors | `references/async-patterns.md` |
| GraphQL (AEC Data Model, Manufacturing Data Model, Data Exchange): pagination, fragments, cost | `references/graphql.md` |
| Official SDK or raw REST, SDK mismatches, shell quoting | `references/sdks-and-cli.md` |

## Operator scripts

Node.js 18 or later, no dependencies. Each prints usage with `--help` and reads `APS_CLIENT_ID` and
`APS_CLIENT_SECRET` from the environment (or `APS_TOKEN` to use a token you already have).

| Script | Does |
| --- | --- |
| `scripts/get-token.mjs` | Gets a 2-legged token and prints it |
| `scripts/count-bucket-objects.mjs` | Counts the objects in an OSS bucket by paging through them |
| `scripts/translation-status.mjs` | Prints the Model Derivative manifest status and progress for a URN |
| `scripts/list-webhooks.mjs` | Lists registered webhooks for the app in a region, with status |
| `scripts/download-derivative.mjs` | Downloads a derivative through a signed URL |

Run them to answer a factual question ("how many files are in this bucket?") instead of writing new code,
and read the script before adapting it. They are read-only, except `get-token.mjs`, which only requests a token.

## Rules that prevent most problems

- **Check the token type before anything else.** Each reference page states its Authentication Context (app
  only, user context required, or optional). A 2-legged token on a user-context endpoint is the most common
  403. See `aps-auth`.
- **Encode URNs as URL-safe Base64 without padding** before putting them in Model Derivative paths. Don't
  encode DM item and version IDs for DM calls; do URL-encode them as path or query values.
- **Match the region to the data.** Hubs, buckets, translations, and webhooks live in a region. A request that
  names the wrong one looks like "not found" or an empty list.
- **Honor `Retry-After` on 429.** Back off, add jitter, and cap retries. Don't loop at full speed.
- **Follow `next` links.** Never compute offsets from page counts, and never assume a short page is the last
  one (filtering happens after paging in Data Management).
- **A 200 isn't always success.** Some bulk and async responses carry per-item errors or `skipped` entries. Read
  the body.
- **Poll sparingly or use webhooks.** Poll at a growing interval, not in a tight loop.

## Gotchas

- **ACC Admin IDs have no `b.` prefix; Data Management IDs do.** The same project is `b.<guid>` in Data
  Management and `<guid>` in Admin, Issues, and most Forma APIs. Convert deliberately.
- **AEC Data Model IDs are different again.** They are opaque strings, not DM IDs. The DM ID is under
  `alternativeIdentifiers.externalProjectId`.
- **The SDK and raw REST can disagree.** An SDK may lag a new field or send a different default. When behavior
  differs, capture the raw request (see `references/sdks-and-cli.md`) and compare.
- **Shell quoting corrupts URLs.** `&` in a URL ends the command in most shells, `[` and `]` trigger globbing in
  curl, and Windows shells quote differently. Quote the whole URL and use `curl -g`.

## Known gaps

Last verified: 2026-11-20. Confirm against the OpenAPI spec or GraphQL schema before telling a user something isn't possible.

- The GraphQL cost (point) model for the AEC Data Model API is documented per field type, but exact point values
  per field aren't published as a table. Measure with real queries instead of computing.
- Cursor lifetime for GraphQL pagination isn't documented as a number. Treat cursors as short-lived.
