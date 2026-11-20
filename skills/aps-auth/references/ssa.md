# Secure Service Accounts (SSA)

The app signs a short-lived JWT assertion with an RSA private key that belongs to a Secure Service
Account, and exchanges it for a 3-legged (user-context) access token. This lets server-to-server
jobs call user-scoped APIs (for example, ACC and BIM 360) without interactive sign-in. The
service account acts as its own user.

## Setup

1. Create a service account for the app (Create Service Account operation, or the APS portal).
2. Create a key for it (Create Key operation). The response holds the key ID (`kid`) and the
   private key in PEM format (`-----BEGIN RSA PRIVATE KEY-----`). Store the private key securely:
   it can't be downloaded again. If it's lost, create a new key.
3. Provision the service account to each hub whose data it needs, like any other user.
4. Base64-encode the PEM private key, so it fits in a single environment variable:

   ```bash
   base64 -i private_key.pem   # macOS / Linux
   ```

## Required env vars

```dotenv
APS_CLIENT_ID=       # From https://aps.autodesk.com/myapps
APS_CLIENT_SECRET=   # Required: the token exchange uses Basic auth
APS_SSA_ID=          # Service account ID
APS_SSA_KEY_ID=      # Key ID (kid) from Create Key
APS_SSA_KEY_BASE64=  # Base64-encoded PEM private key
```

## JWT assertion

Sign with RS256.

| Part | Field | Value |
| --- | --- | --- |
| Header | `alg` | `RS256` |
| Header | `kid` | Key ID from Create Key |
| Claim | `iss` | Client ID of the app |
| Claim | `sub` | Service account ID |
| Claim | `aud` | `https://developer.api.autodesk.com/authentication/v2/token` |
| Claim | `exp` | Epoch seconds, at most 5 minutes in the future |
| Claim | `scope` | Array of scope strings, for example `["data:read"]` |

## Token exchange

`POST https://developer.api.autodesk.com/authentication/v2/token` with
`Authorization: Basic base64(client_id:client_secret)` and a form-encoded body:

- `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`
- `assertion=<signed JWT>`
- `scope` (optional): a subset of the assertion's scopes

The response holds `access_token` and `expires_in`, but no refresh token. Sign a new assertion
when the token is about to expire. Tokens issued this way have a `jti` claim that starts with
`SA-`.

## Implementation

Load the language-specific file:

- **Node.js** → read `references/ssa-nodejs.md`
- **Python** → read `references/ssa-python.md`
- **.NET** → read `references/ssa-dotnet.md`
