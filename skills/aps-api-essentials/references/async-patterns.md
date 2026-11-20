# Async operations, polling, and webhooks

Read this when a call returns 202, when a job's status needs tracking, or when deciding between polling and
webhooks.

## Recognize the pattern

Many APS operations accept work and finish later. Signals:

- **202 Accepted** on the call itself. Model Derivative metadata and property calls return 202 while the data is
  still being prepared; the same call succeeds later.
- A **job or status resource** to read afterwards (translation manifest, work item status, data exchange
  status, a Data Management `jobs/{id}` resource).
- A **success response that only means "queued"**. A translation `201` or `200` from the job endpoint means the
  job was created, not that it finished.

Treat the first response as a receipt, then wait for completion in one of two ways.

## Polling

- Poll at an **increasing interval** (for example 2s, 4s, 8s, then cap at 30 to 60s), with a **maximum total
  wait**. Fixed tight loops waste rate limit and often hit 429.
- Read the **overall status** and the **per-item status**. A manifest has an overall `status` plus a status for
  each derivative, and the overall one becomes complete only when all are complete.
- Stop on terminal states (success, failed, timeout) and report the failure details (error codes and messages
  in the status body), not just "failed".
- For a 202 on a read call, retry the **same** request after a delay. Don't start a new job.
- Honor `Retry-After` when present.

```js
async function waitFor(check, { first = 2000, max = 60000, timeout = 15 * 60 * 1000 } = {}) {
  const start = Date.now();
  let delay = first;
  for (;;) {
    const result = await check();
    if (result.done) return result;
    if (Date.now() - start > timeout) throw new Error('Timed out waiting for the job');
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 2, max);
  }
}
```

## Webhooks instead of polling

Use webhooks when work is long, runs for many items, or should start something else on completion.

- They avoid polling cost and rate limit use, and react within seconds.
- Delivery is **at least once**: duplicates happen, so handle each event idempotently (key on the event or
  resource ID and version).
- A webhook that keeps failing is deactivated. Monitor status and re-activate (see `aps-webhooks` for
  verification, retries, and hook management).
- A callback isn't enough alone for critical workflows: also keep a periodic reconciliation (a slow poll) to
  catch missed events.

Choose:

| Situation | Choose |
| --- | --- |
| One job, a user waiting, a short wait | Poll with backoff |
| Many jobs, or hours between events | Webhooks, plus a slow reconciliation poll |
| No public HTTPS URL for a callback | Poll (or a tunnel in development) |
| An API has no events for what you need | Poll at the slowest interval that meets the need |

## Timeouts

- Set client timeouts explicitly. Large uploads and downloads need long timeouts or chunking, and short
  calls need short ones so failures surface.
- A timeout on the client doesn't cancel the server-side work. Before retrying a create call, check whether
  the first attempt created the resource, or you may get duplicates or a 409.

## HTTP 200 with errors inside

Some endpoints return 200 while individual items failed:

- **Bulk or batch operations** return per-item results; look for `errors`, `failed`, or `skipped` entries and
  surface them. A batch that says "skipped" did nothing for those items.
- **Translation status**: a manifest with status `success` can still hold derivatives with `failed` status or
  warnings. Check each one that you need.
- **GraphQL always returns 200** for query errors. Check the `errors` array before using `data`, which can be
  partially filled. See `graphql.md`.
- **Automation work items** can report an overall success while the plugin reported failures. Read the report
  for the work item.

Make this a habit in shared helper code: one function that checks status, then the body for errors, and
raises with the details.
