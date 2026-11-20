---
name: aps-auth
description: >
  Authenticate with Autodesk Platform Services (APS). Use when the user needs to choose between
  2-legged OAuth, 3-legged OAuth (authorization code or PKCE), and Secure Service Accounts (SSA),
  write code that gets, caches, or refreshes APS access tokens, or debug token errors (invalid
  assertion, invalid grant, rejected scopes, callback and PKCE failures). Also covers replacing
  x-user-id impersonation with SSA, provisioning an app on a customer's hub (custom integrations,
  hub not visible), and the token to give the browser Viewer. Includes token helpers for
  Node.js/TypeScript, Python, and .NET/C#.
metadata:
  author: Developer Advocates @ Autodesk
  version: "0.1"
  products: "APS"
  technologies: "OAuth, JWT, Node.js, TypeScript, Python, .NET, C#"
  industries: "AEC, Manufacturing, Media & Entertainment"
---

# APS authentication

Pick the right APS authentication flow, then implement token acquisition, caching, and refresh.
Exact scope lists, grant parameters, and endpoint details live in the Authentication API docs
(source ID `oauth_v2`) and the SSA docs (source ID `ssa_v1`); look them up with the
`aps-reference` skill instead of relying on memory.

## Choose a flow

| Flow | Use when | Token context |
| --- | --- | --- |
| **2-legged** (client credentials) | The app works with its own data (for example, OSS buckets it created and their translations), and no user is involved | App only |
| **3-legged, authorization code** | A confidential app (with a backend that keeps the client secret) acts on behalf of a user who signs in through the browser | User |
| **3-legged, PKCE** | A public client that can't keep a secret (desktop, mobile, single-page app) acts on behalf of a signed-in user | User |
| **SSA** (Secure Service Account) | A server-to-server job needs user-context APIs (for example, ACC and BIM 360 data) without interactive sign-in | User (the service account) |

To decide, check the **Authentication Context** row at the top of the endpoint's REST reference
page: "app only" needs a 2-legged token, "user context required" needs a 3-legged or SSA token,
and "user context optional" accepts both.

## Rules

- **Keep the client secret on the server.** Never ship it to a browser, a desktop app, or a
  mobile app. Public clients use PKCE instead.
- **Cache tokens and refresh early.** Reuse a token until about 60 seconds before `expires_in`
  runs out, then get a new one. Don't request a token per API call.
- **Request the fewest scopes that work.** Pass scopes explicitly for each token request.
- **Store the latest refresh token.** A 3-legged token response includes a refresh token that
  expires after 15 days. Replace the stored refresh token with the one from each refresh
  response.
- **SSA tokens have no refresh token.** When an SSA token is about to expire, sign a new JWT
  assertion and exchange it again.
- **Use Authentication v2.** Use the `/authentication/v2/authorize` and `/authentication/v2/token`
  endpoints. Don't use `/authentication/v1/...`.
- **Treat `state` as a secret.** Use an unguessable value for the 3-legged `state` parameter, and
  map it to the user or session on the server.

## Implement

Read only the files for the chosen flow:

| Read | When |
| --- | --- |
| `references/two-legged.md` | 2-legged OAuth (Node.js, Python, and .NET in one file) |
| `references/three-legged.md` | 3-legged OAuth: app setup, authorization URL, code exchange, refresh, and PKCE |
| `references/three-legged-nodejs.md`, `-python.md`, `-dotnet.md` | 3-legged token helpers for that language |
| `references/ssa.md` | SSA: setup, JWT assertion claims, and token exchange |
| `references/ssa-nodejs.md`, `-python.md`, `-dotnet.md` | SSA token helpers for that language |

All helpers read credentials from environment variables (`APS_CLIENT_ID`, `APS_CLIENT_SECRET`,
and flow-specific ones). Adapt where they read configuration from to the host app, but keep the
caching and refresh logic.

## Common situations

Read the matching file when the question is about one of these, not about a flow:

| Situation | Read |
| --- | --- |
| Code sends `x-user-id` with a 2-legged token, or a backend job needs user-context APIs | `references/impersonation-and-ssa-migration.md` |
| The token is valid but a hub or project isn't visible, or it works for one customer and not another | `references/custom-integrations.md` |
| A browser app needs a token for the Viewer | `references/viewer-tokens.md` |
| A token request, sign-in redirect, or PKCE exchange fails | `references/troubleshooting.md` |

## Gotchas

- **SSA token exchange needs Basic auth.** The `jwt-bearer` token request must include the client
  ID and secret (in the `Authorization: Basic` header, or in the body, but not both).
- **SSA `scope` claim is an array.** In the JWT assertion, `scope` is an array of strings, not a
  space-delimited string. A string causes "The 'assertion' is invalid".
- **SSA assertions expire fast.** `exp` must be at most 5 minutes in the future. Sign a fresh
  assertion for each token exchange.
- **SSA private keys are PKCS#1 PEM.** The Create Key response returns `-----BEGIN RSA PRIVATE
  KEY-----` text. If it was copied from JSON, replace literal `\n` with real newlines before
  using it.
- **SSA needs hub access.** A valid SSA token still can't see a hub's data until the service
  account is provisioned to that hub (see the "Provision the SSA to a Hub" tutorial).
- **The callback URL must match exactly.** The `redirect_uri` in the authorization request and
  the code exchange must match a callback URL registered for the app, including scheme, host,
  port, and path.

- **A valid token doesn't mean the hub is visible.** For Forma, ACC, and BIM 360 data, the customer's
  hub admin must add the app's client ID as a custom integration. See `references/custom-integrations.md`.
- **Never give the browser your backend token.** Hand the Viewer a separate token that carries only
  `viewables:read`. See `references/viewer-tokens.md`.

## Known gaps

Last verified: 2026-11-20. Confirm against the OpenAPI spec or GraphQL schema before telling a user something isn't possible.

- The client assertion JWT used to authenticate secret rotation (Application Management API) isn't covered
  here. Use `aps-app-management` and the Secret Rotation page of the `applications_v2` docs.
- There's no documented way to restrict a `viewables:read` token to specific models. Restrict which URNs
  your server hands out instead.
- Support for `x-user-id` varies per endpoint. Check the endpoint's reference page.
