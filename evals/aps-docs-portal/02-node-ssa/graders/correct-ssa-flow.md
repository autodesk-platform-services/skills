---
type: llm
focus: last_message
weight: 1
---
Score PASS only if ALL of these hold:
1. The code builds a JWT assertion signed with RS256 using the service account's private key, with the key ID set as `kid` in the JWT header.
2. The JWT claims include `iss` = the APS app's client ID, `sub` = the service account ID, `aud` = `https://developer.api.autodesk.com/authentication/v2/token`, an `exp` a few minutes (≤ 5 min) in the future, and `scope` given as an ARRAY of strings (e.g. `["data:read"]`), not a space-separated string.
3. It exchanges the assertion via POST `https://developer.api.autodesk.com/authentication/v2/token` with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` and `assertion=<jwt>`, authenticating the app with Basic auth (client_id:client_secret) or client_id/client_secret in the form body.
4. It uses the resulting token to list projects, via GET `/project/v1/hubs` → `/project/v1/hubs/{hubId}/projects` (Data Management) or GET `/construction/admin/v1/accounts/{accountId}/projects` (ACC Admin).
5. It does NOT treat a plain `client_credentials` 2-legged token as the service-account token, and uses no deprecated package (`forge-apis`) or `/authentication/v1/` endpoint.
FAIL if any item is missing or wrong.
