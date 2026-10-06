---
type: llm
focus: last_message
weight: 1
---
Score PASS only if ALL of these hold:
1. The token is obtained with the client_credentials grant from `https://developer.api.autodesk.com/authentication/v2/token` (client id/secret sent via Basic auth or body), OR via the `@aps_sdk/authentication` package.
2. Requested scopes include `data:read` AND at least one of `data:create` or `data:write`.
3. The job is started with POST `https://developer.api.autodesk.com/modelderivative/v2/designdata/job`, OR via `@aps_sdk/model-derivative` (e.g. startJob).
4. The URN is base64-encoded (URL-safe, padding stripped) or the answer states the URN must already be base64url-encoded.
5. The output format specifies `type: "svf2"` with views including "2d" and/or "3d".
6. No deprecated package (`forge-apis`, `forge-server-utils`) and no `/authentication/v1/` endpoint appears anywhere.
FAIL if any item is missing or wrong.
