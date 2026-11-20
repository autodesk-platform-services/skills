# Token and sign-in troubleshooting

Read this when a token request fails, a sign-in redirect breaks, or a token is rejected by an API.

## Token endpoint errors

Error names below follow standard OAuth. Read the actual response body for the exact error APS returned, and
for APS error codes (`Auth-001`, `Auth-006`, `Auth-010`, `ERR-001`) see the Authentication API error handling page.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `invalid_client` or 401 on the token request | Wrong client ID or secret, or the secret was rotated | Re-check both, and check for a rotation in progress (`aps-app-management`) |
| `invalid_grant` on a code exchange | The code was already used, expired, or `redirect_uri` differs from the authorize request | Authorization codes are single use: restart the sign-in, and use the identical `redirect_uri` |
| `invalid_grant` on refresh | The refresh token expired or was already replaced by a newer one | Send the user through sign-in again; store the newest refresh token each time |
| `invalid_scope` or rejected scopes | A scope the app or grant type can't have | Request fewer scopes, and check that the API is enabled for the app |
| "The 'assertion' is invalid" (SSA) | `scope` isn't an array, key is wrong, or `exp` is too far out | See the SSA gotchas in `SKILL.md` |
| `Auth-006` | The access token is invalid or expired | Get a new token |
| `Auth-010` | The token lacks the privilege for the request | Wrong token type or missing scope |
| `Auth-001` | The `client_id` isn't authorized for that API | Enable the API for the app |

## 3-legged sign-in and callback problems

- **"Invalid redirect uri"**: the `redirect_uri` must match a callback URL registered for the app exactly (scheme, host,
  port, path, trailing slash). A new domain or port needs the registered value changed too.
- **Works on localhost, not in production**: register the production callback URL as well.
- **The callback receives no code**: the user denied consent, or the redirect went to a different URL than the one
  the app listens on. Log the full callback query string.
- **`state` doesn't match**: the session that created `state` isn't the one receiving the callback (cookie not sent
  across the redirect, multiple server instances without shared state). Store `state` server-side, keyed to the session.

## PKCE problems

- The request must send `code_challenge` with `code_challenge_method=S256`, and the code exchange must send the
  same `code_verifier` that produced it. Generate the pair once per sign-in and keep the verifier until the exchange.
- **Empty or missing challenge errors** mean the authorize request left out `code_challenge`, or a
  proxy or framework dropped the query parameter. Print the final authorize URL and check it.
- A **mismatched verifier** fails the exchange. Common cause: generating a new verifier on the callback request instead of
  reusing the stored one, or applying URL-safe Base64 without padding to the challenge inconsistently.
- Public clients (desktop, mobile, single-page) use PKCE and don't send the client secret. Confidential clients use
  the secret, and may add PKCE. The app's registered type decides which grant it may use.

## Token accepted by one API but not another

- Compare the token's `scope` claim with the endpoint's required scopes.
- Compare the token type with the endpoint's Authentication Context.
- For Forma, ACC, and BIM 360 data, check provisioning (`custom-integrations.md`).
- The token's `exp` may have passed in a long-running job: refresh before the 60-second margin, not after a 401.
