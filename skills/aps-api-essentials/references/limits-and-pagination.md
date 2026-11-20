# Rate limits and pagination

Read this when you see HTTP 429, when a loop over a list stops early or repeats, or when you're designing a
bulk job.

## Rate limits and quotas

- A **rate limit** is the maximum number of calls per minute. Exceeding it returns **429** with a `Retry-After`
  header (seconds to wait). A **quota** limits resource use after a request is accepted (file sizes, job time,
  monthly consumption) and fails with an error that names the quota.
- Limits are set per endpoint or per API, and counted per application, per user, or both. The limits for an
  API are in its developer guide under rate limits. Look the current value up with `aps-reference`.
- Limits aren't guaranteed service levels and can drop temporarily when the service is overloaded.
- GraphQL APIs (AEC Data Model) use a **cost-based** limit instead of a call count: each query is scored by
  complexity, there's a points-per-minute cap for the app, and a cap for a single query. Heavy queries cost
  more, so trimming the query helps more than slowing the loop.

### Handling 429

```js
async function apsFetch(url, options = {}, attempt = 0) {
  const res = await fetch(url, options);
  if (res.status !== 429 || attempt >= 6) return res;
  const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
  const jitter = Math.random() * 500;
  await new Promise(r => setTimeout(r, retryAfter * 1000 + jitter));
  return apsFetch(url, options, attempt + 1);
}
```

- Prefer the server's `Retry-After` over your own schedule; use exponential backoff only when it's missing.
- Cap retries, then surface the failure. A job that retries forever hides an outage.
- Retry only requests that are safe to repeat. A 429 means the request wasn't processed, so retrying is fine.

### Reducing calls before asking for a higher limit

1. **Cache** data that rarely changes (folder contents, project metadata, property definitions).
2. **Use webhooks** instead of polling for changes. See `async-patterns.md`.
3. **Raise page limits** where the endpoint allows it, so one call returns more.
4. **Batch** where an API offers batch endpoints instead of one call per item.
5. **Run work at a bounded concurrency** (a small pool), not unbounded `Promise.all` over thousands of items.

If limits still block legitimate use, a higher limit is requested through support and reviewed case by case,
with a proposal based on measured usage. The process can require membership in the developer program; check
the current rate limit blog post via `aps-reference`.

## Pagination

Each API family paginates differently.

| API family | Style | Details |
| --- | --- | --- |
| Object Storage (buckets, objects) | Key-based | `limit` 1 to 100 (default 10), `startAt`, `beginsWith`; follow the `next` URL in the response |
| Data Management projects and data, Forma REST APIs | JSON:API pages | `page[number]` (0-based) and `page[limit]`; follow `links.next.href` |
| Webhooks | Opaque token | `pageState` from the previous response's `next` |
| Application Management | `pagination.nextUrl` | Follow `nextUrl` |
| GraphQL (AEC, Manufacturing, Data Exchange) | Cursor | `pagination { cursor }`, pass it back; see `graphql.md` |

Rules:

- **Loop until there's no next link or cursor.** Don't stop when a page is short: in Data Management,
  pagination is applied before filtering, so a page can hold fewer items than the limit and still have more
  pages.
- **Don't build offsets yourself** if the API gives a `next` link; links carry the state.
- **Use the largest page the endpoint supports** to reduce calls. Defaults are small.
- **Don't persist cursors or page tokens** across long gaps. Treat them as short-lived; if one is rejected,
  restart that listing from the beginning and de-duplicate by ID.
- **De-duplicate by ID.** Items can move between pages while you list a changing collection.

### Counting objects in a bucket

Object Storage has no count endpoint, so count by paging. The `scripts/count-bucket-objects.mjs` script does
this with `limit=100` and the `next` link.
