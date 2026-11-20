# 3-legged OAuth

The user opens an authorization URL in a browser, signs in to Autodesk, and grants consent. APS
redirects to the app's callback URL with an authorization code, and the app exchanges the code
for an access token and a refresh token.

## App setup

1. Go to https://aps.autodesk.com/myapps and select the app.
2. Under **Callback URLs**, add the callback URL (for example, `http://localhost:8080/callback`).
   The `redirect_uri` the app sends must match it exactly.
3. Make sure the APIs the app calls are enabled for it.

## Required env vars

```dotenv
APS_CLIENT_ID=      # From https://aps.autodesk.com/myapps
APS_CLIENT_SECRET=  # Confidential clients only; PKCE public clients have no secret
APS_CALLBACK_URL=http://localhost:8080/callback
```

## Flow

1. **Authorize.** Send the user to
   `https://developer.api.autodesk.com/authentication/v2/authorize` with `response_type=code`,
   `client_id`, `redirect_uri`, `scope` (space-delimited), and `state`.
2. **Callback.** APS redirects to `redirect_uri?code=...&state=...`. Look up `state` on the server
   to find which user or session started the flow, and reject unknown values.
3. **Exchange.** `POST /authentication/v2/token` with `grant_type=authorization_code`, `code`, and
   `redirect_uri`, authenticated with `Authorization: Basic base64(client_id:client_secret)`.
4. **Store.** Save `access_token`, `refresh_token`, and the expiry time, keyed by the user or
   session. Store tokens on the server, never in the browser.
5. **Refresh.** When the access token is about to expire, `POST /authentication/v2/token` with
   `grant_type=refresh_token` and `refresh_token`, with the same Basic auth. Store the new refresh
   token from the response. Refresh tokens expire after 15 days; after that, the user has to sign
   in again.

The language helpers implement steps 1, 3, 4, and 5 with an in-memory store. For production, put
the store in a database or cache that survives restarts and is shared across instances. Wire the
callback route (step 2) into the app's web framework.

## PKCE

Public clients (desktop, mobile, and single-page apps) can't keep a client secret, so they use the
authorization code flow with PKCE:

- Generate a random `code_verifier` for each sign-in, and send its SHA-256 hash as
  `code_challenge` with `code_challenge_method=S256` in the authorization request.
- In the code exchange, send `client_id` and `code_verifier` in the body instead of Basic auth.
- Refresh the same way, with `client_id` in the body.

Confidential clients can use PKCE too, in addition to the client secret. Check the "Get a 3-Legged
Token with Authorization Code Grant (PKCE)" tutorials (source ID `oauth_v2`) for the exact
parameters.

## Implementation

Load the language-specific file:

- **Node.js** → read `references/three-legged-nodejs.md`
- **Python** → read `references/three-legged-python.md`
- **.NET** → read `references/three-legged-dotnet.md`
