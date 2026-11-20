# Auth: 2-Legged OAuth (Client Credentials)

The server exchanges `APS_CLIENT_ID` + `APS_CLIENT_SECRET` for an application
token. No user interaction required. Only accesses resources owned by the APS
application (e.g., OSS buckets it created).

> Note: Autodesk marks 2-legged OAuth as legacy/deprecated in some contexts.
> Prefer Secure Service Accounts for new server-to-server integrations.

**Critical rule:** The MCP server must **never** accept APS tokens from the
MCP client and forward them. The server always authenticates itself.

## Required env vars

```dotenv
APS_CLIENT_ID=    # From https://aps.autodesk.com/myapps
APS_CLIENT_SECRET=
```

## Python

```python
# src/aps_mcp_server/auth.py
import os
import time
import httpx
from dotenv import load_dotenv

load_dotenv()

APS_CLIENT_ID = os.environ["APS_CLIENT_ID"]
APS_CLIENT_SECRET = os.environ["APS_CLIENT_SECRET"]
APS_TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token"

_cache: dict = {"access_token": None, "expires_at": 0.0}


async def get_access_token(scope: str = "bucket:read data:read") -> str:
    if _cache["access_token"] and time.time() < _cache["expires_at"] - 60:
        return _cache["access_token"]

    async with httpx.AsyncClient() as client:
        r = await client.post(
            APS_TOKEN_URL,
            data={"grant_type": "client_credentials", "scope": scope},
            auth=(APS_CLIENT_ID, APS_CLIENT_SECRET),
        )
        r.raise_for_status()
        data = r.json()

    _cache["access_token"] = data["access_token"]
    _cache["expires_at"] = time.time() + data["expires_in"]
    return _cache["access_token"]
```

## Node.js / TypeScript

```typescript
// src/auth.ts
import { ServerOptions } from "./server.js";

const TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token";

interface TokenCache { accessToken: string; expiresAt: number }
let cache: TokenCache | null = null;

export async function getAccessToken(
  options: ServerOptions,
  scope = "bucket:read data:read"
): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) return cache.accessToken;

  const creds = Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope }),
  });

  if (!res.ok) throw new Error(`Auth failed: ${await res.text()}`);
  const data = await res.json();
  cache = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cache.accessToken;
}
```

## .NET / C#

The `ApsAuthService` in [`dotnet.md`](dotnet.md) implements 2LO by default —
no additional changes needed.
