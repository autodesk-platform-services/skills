# 3-legged token helper: Node.js / TypeScript

## `src/auth.ts`

```typescript
const TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token";
const AUTH_URL = "https://developer.api.autodesk.com/authentication/v2/authorize";
const SCOPES = "data:read bucket:read";

export interface ApsCredentials { clientId: string; clientSecret: string; callbackUrl: string }

interface Tokens { accessToken: string; refreshToken?: string; expiresAt: number }

// Keyed by user or session ID. Replace with a persistent store in production.
export const tokenStore = new Map<string, Tokens>();

export function buildAuthUrl(credentials: ApsCredentials, state: string): string {
  return `${AUTH_URL}?` + new URLSearchParams({
    response_type: "code",
    client_id: credentials.clientId,
    redirect_uri: credentials.callbackUrl,
    scope: SCOPES,
    state,
  });
}

async function postToken(credentials: ApsCredentials, form: Record<string, string>): Promise<Tokens> {
  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams(form),
  });
  if (!res.ok) throw new Error(`Token request failed: ${await res.text()}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// Call from the callback route, with the key that `state` maps to.
export async function exchangeCode(credentials: ApsCredentials, key: string, code: string): Promise<void> {
  const tokens = await postToken(credentials, {
    grant_type: "authorization_code",
    code,
    redirect_uri: credentials.callbackUrl,
  });
  tokenStore.set(key, tokens);
}

// Returns a valid access token, refreshing it if needed, or null if the user must sign in.
export async function getAccessToken(credentials: ApsCredentials, key: string): Promise<string | null> {
  const tokens = tokenStore.get(key);
  if (!tokens) return null;
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;
  if (!tokens.refreshToken) return null;
  try {
    const refreshed = await postToken(credentials, {
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    });
    refreshed.refreshToken ??= tokens.refreshToken;
    tokenStore.set(key, refreshed);
    return refreshed.accessToken;
  } catch {
    tokenStore.delete(key); // refresh token expired or revoked
    return null;
  }
}
```

## Reading env vars

```typescript
const credentials: ApsCredentials = {
  clientId: process.env.APS_CLIENT_ID!,
  clientSecret: process.env.APS_CLIENT_SECRET!,
  callbackUrl: process.env.APS_CALLBACK_URL!,
};
```
