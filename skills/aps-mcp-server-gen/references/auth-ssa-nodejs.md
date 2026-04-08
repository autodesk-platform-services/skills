# Auth: Secure Service Accounts — Node.js / TypeScript

## Install

```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

## `src/auth.ts`

```typescript
import jwt from "jsonwebtoken";
import { ServerOptions } from "./server.js";

const TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token";

interface TokenCache { accessToken: string; expiresAt: number }
let cache: TokenCache | null = null;

export async function getAccessToken(
  options: ServerOptions,
  scope = "data:read"
): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) return cache.accessToken;

  const privateKey = Buffer.from(options.ssaKeyBase64!, "base64").toString("utf-8");
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: options.clientId,
      sub: options.ssaId,
      aud: TOKEN_URL,
      exp: now + 300,
      scope: scope.split(" "),
    },
    privateKey,
    { algorithm: "RS256", header: { alg: "RS256", kid: options.ssaKeyId! } }
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

## `ServerOptions` extension

```typescript
// src/server.ts
export interface ServerOptions {
  clientId: string;
  clientSecret: string;
  ssaId: string;
  ssaKeyId: string;
  ssaKeyBase64: string;
}
```

## `src/index.ts` — reading env vars

```typescript
const options: ServerOptions = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
  ssaId: process.env.APS_SSA_ID!,
  ssaKeyId: process.env.APS_SSA_KEY_ID!,
  ssaKeyBase64: process.env.APS_SSA_KEY_BASE64!,
};
```
