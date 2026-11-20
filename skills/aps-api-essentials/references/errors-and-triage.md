# Error triage

Read this when an APS call fails and the cause isn't obvious. Work down the list in order: each step rules out
a whole class of causes, and the earlier ones are the most common.

## First, capture the facts

Record the HTTP status, the response body, the full URL (with region and IDs), the request headers except the
token, and which token type and scopes were used. Decode the token (it's a JWT) at the JWT debugger or in code to
read `scope`, `exp`, and `client_id`. Don't paste live tokens into third-party sites.

## The triage path

### 1. Authentication: is the token valid and of the right type?

- **401** means the token is missing, expired, malformed, or for the wrong environment. Check `exp`, and that the
  header is `Authorization: Bearer <token>`.
- **Authentication error `Auth-006`**: the access token is invalid. **`Auth-010`**: the token doesn't have the
  privilege for this request.
- **Token type**: read the endpoint's Authentication Context. App only needs 2-legged, user context required
  needs 3-legged or SSA. A 2-legged token on a user-context endpoint is a very common 403. See `aps-auth`.
- **Wrong user**: with 3-legged, the user needs real access to the data in the product. They must at least be able
  to open the project's files for it to appear in Data Management lists.

### 2. Product enablement: may this app call this API?

- Messages like "The client_id specified does not have access to the api product", or **`Auth-001`**, mean the API
  isn't enabled in the app's settings. See `aps-app-management`.
- For Forma, ACC, and BIM 360: the hub must also have provisioned the app (custom integration, or an app
  gallery install). Symptom: the hub doesn't appear in `GET /hubs`, or appears under one customer's account but
  not another. See `aps-auth`.
- Don't add the same client ID as both a custom integration and an app gallery install on one hub.

### 3. Scopes: does the token carry what this endpoint needs?

- 403 "insufficient scope", or a token that works for reads and fails for writes.
- Compare the endpoint's *Required OAuth Scopes* line with the token's `scope` claim. Request the missing
  scope, then get a new token (existing tokens don't gain scopes).

### 4. Region and IDs: is the request pointed at the right data?

- 404 or an empty list for something that exists: wrong region, wrong ID kind, or missing `b.` prefix. See
  `regions.md` and `ids-and-urns.md`.
- Webhooks not found: list them in the region they were created in.
- 406 with a region message: conflicting region values (header versus body versus URI).

### 5. Limits: is the app being throttled or out of quota?

- **429** (error `ERR-001`): rate limit. Honor `Retry-After`. See `limits-and-pagination.md`.
- A quota error names the quota (file size, job time, monthly use).
- Authorization or access errors on paid APIs that began without a code change can mean the team ran out of
  tokens (see `aps-app-management`).

### 6. The API itself: is the request valid?

- **400/422**: read the body; it usually names the field. Fix and don't retry unchanged.
- **409**: the resource or job already exists or is in a conflicting state. For translation jobs, an existing
  job for that source and output may still be running, and for uploads, a key may already be taken.
- **202**: not an error; the work isn't ready. See `async-patterns.md`.
- **500, 502, 503, 504**: retry with backoff; if it persists, gather the request ID and contact support.

## Error body shapes

| Source | Fields |
| --- | --- |
| Authentication | `developerMessage`, `userMessage`, `errorCode` (for example `ERR-001`, `Auth-001`) |
| Application Management | `title`, `detail`, `errors[]`, `logref` |
| Data Management, Model Derivative, others | Varies: look for `errors`, `developerMessage`, or `detail` in the body |
| GraphQL | HTTP 200 with an `errors` array |

Log the whole body. Product teams ask for `logref` or request IDs and the exact timestamp when you contact
support.

## Common symptoms

| Symptom | Likely cause |
| --- | --- |
| Works on localhost, fails in production for 3-legged login | Callback URL doesn't exactly match the app's registered one |
| "Invalid redirect uri" after a domain change | Update the callback URL in the app settings |
| Hub missing from `GET /hubs` | Provisioning not done, or user lacks project access |
| Works for one customer's hub, not another's | The second customer hasn't provisioned the app |
| Token worked yesterday, now 401 | Expired; refresh or request a new one early |
| 403 on a user-context endpoint with a valid token | 2-legged token used where user context is required |
| Empty folder or list that has content | Wrong region, filter applied after paging, or no permission |
