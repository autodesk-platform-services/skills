# Auth: Secure Service Accounts (SSA)

The server signs a short-lived JWT assertion using an RSA private key linked to
a Secure Service Account. APS exchanges this for a user-context token that can
call user-scoped APIs (ACC, BIM360, etc.) without any interactive login.

Use this pattern for automated server-to-server workflows where you need to act
on behalf of a real user.

**Critical rule:** The MCP server must **never** accept APS tokens from the
MCP client and forward them. The server always authenticates itself.

## Setup

1. In the APS portal, go to your app → **Secure Service Accounts** → create a new account.
2. Download the RSA key pair.
3. Encode the private key to base64:

   ```bash
   base64 -i private_key.pem   # macOS / Linux
   ```

4. Set the environment variables below.

## Required env vars

```dotenv
APS_CLIENT_ID=       # From https://aps.autodesk.com/myapps
APS_CLIENT_SECRET=
APS_SSA_ID=          # Service account ID from APS portal
APS_SSA_KEY_ID=      # Key ID from the downloaded key pair
APS_SSA_KEY_BASE64=  # Base64-encoded RSA private key (PEM)
```

## Implementation

Load the language-specific implementation file:

- **Node.js** → read [`references/auth-ssa-nodejs.md`](auth-ssa-nodejs.md)
- **Python** → read [`references/auth-ssa-python.md`](auth-ssa-python.md)
- **.NET** → read [`references/auth-ssa-dotnet.md`](auth-ssa-dotnet.md)
