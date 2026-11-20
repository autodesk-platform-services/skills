# SSA token helper: Node.js / TypeScript

## Install

```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

## `src/auth.ts`

```typescript
import jwt from "jsonwebtoken";

const TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token";

export interface SsaCredentials {
  clientId: string;
  clientSecret: string;
  ssaId: string;
  ssaKeyId: string;
  ssaKeyBase64: string; // base64-encoded PEM private key
}

interface TokenCache { accessToken: string; expiresAt: number }
let cache: TokenCache | null = null;

export async function getAccessToken(
  credentials: SsaCredentials,
  scope = "data:read"
): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) return cache.accessToken;

  const privateKey = Buffer.from(credentials.ssaKeyBase64, "base64").toString("utf-8");
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: credentials.clientId,
      sub: credentials.ssaId,
      aud: TOKEN_URL,
      exp: now + 300,
      scope: scope.split(" "), // must be an array
    },
    privateKey,
    { algorithm: "RS256", header: { alg: "RS256", kid: credentials.ssaKeyId } }
  );

  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) throw new Error(`SSA auth failed: ${await res.text()}`);
  const data = await res.json();
  cache = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cache.accessToken;
}
```

## Reading env vars

```typescript
const credentials: SsaCredentials = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
  ssaId: process.env.APS_SSA_ID!,
  ssaKeyId: process.env.APS_SSA_KEY_ID!,
  ssaKeyBase64: process.env.APS_SSA_KEY_BASE64!,
};
```
