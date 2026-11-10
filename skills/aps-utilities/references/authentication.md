# Authentication API — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills live in `skills/authentication/`.
Base: `https://developer.api.autodesk.com/authentication/v2`

Status legend: ✅ built · 🔜 next · ⬜ planned

| Status | Skill | Purpose | Endpoints wrapped |
|---|---|---|---|
| ✅ | `aps-auth-2legged` | Client-credentials token for app-owned resources (OSS, Model Derivative, DA, Webhooks) | `POST /token` (`grant_type=client_credentials`) |
| ✅ | `aps-auth-3legged` | User login via authorization code + PKCE; refresh; local callback helper | `GET /authorize`, `POST /token` (`authorization_code`, `refresh_token`) |
| ⬜ | `aps-auth-scopes` | Choose the minimal scope set per API / task | reference table only |
| ⬜ | `aps-auth-introspect-and-revoke` | Validate or revoke a token | `POST /introspect`, `POST /revoke`, `GET /keys` (JWKS for local JWT validation) |
| ⬜ | `aps-auth-user-profile` | Who is the logged-in user | `GET /userinfo` |
| ⬜ | `aps-auth-logout` | End the Autodesk session | `GET /logout` |
| ⬜ | `aps-auth-token-service` | Pattern: server-side token endpoint for the Viewer / SPA (public `viewables:read` token vs internal token) | composes 2-legged |

## Which token for which API

| API family | Token |
|---|---|
| OSS buckets/objects (your buckets) | 2-legged |
| OSS `wip.dm.prod` (ACC/BIM 360 file storage) | 3-legged (or 2-legged if app is a Custom Integration) |
| Hubs / Projects / Folders / Items / Versions | 3-legged (2-legged only for ACC/BIM 360 Custom Integrations) |
| Model Derivative, Design Automation, Webhooks | 2-legged (3-legged also accepted) |
| ACC Admin, Issues, etc. | mostly 3-legged; some admin endpoints accept 2-legged with `User-Id` header |
| AEC / MFG Data Model (GraphQL) | 3-legged |

## Scope reference

`data:read` `data:write` `data:create` `data:search` · `bucket:create` `bucket:read` `bucket:update` `bucket:delete` · `code:all` (Design Automation) · `account:read` `account:write` (ACC/BIM 360 admin) · `user-profile:read` `user:read` `user:write` · `viewables:read` · `openid` `offline_access`
