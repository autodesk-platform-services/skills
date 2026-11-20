# 2-legged OAuth (client credentials)

The app exchanges its client ID and secret for an app-only access token. No user interaction is
involved, and the token can only reach data the app itself owns or has been granted (for example,
OSS buckets it created).

## Required env vars

```dotenv
APS_CLIENT_ID=      # From https://aps.autodesk.com/myapps
APS_CLIENT_SECRET=
```

## Node.js / TypeScript

```typescript
// src/auth.ts
const TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token";

export interface ApsCredentials { clientId: string; clientSecret: string }

interface TokenCache { accessToken: string; expiresAt: number }
let cache: TokenCache | null = null;

export async function getAccessToken(
  credentials: ApsCredentials,
  scope = "bucket:read data:read"
): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) return cache.accessToken;

  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope }),
  });

  if (!res.ok) throw new Error(`Auth failed: ${await res.text()}`);
  const data = await res.json();
  cache = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cache.accessToken;
}
```

The cache holds one token. If the app requests tokens with different scopes, key the cache by
scope.

## Python

```python
# auth.py
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

## .NET / C#

```csharp
// Services/ApsAuthService.cs
using System.Net.Http.Json;
using System.Text.Json;

public class ApsAuthService(IConfiguration config, IHttpClientFactory httpClientFactory)
{
    private const string TokenUrl = "https://developer.api.autodesk.com/authentication/v2/token";

    private string? _cachedToken;
    private DateTime _expiresAt = DateTime.MinValue;

    public async Task<string> GetAccessTokenAsync(string scope = "bucket:read data:read")
    {
        if (_cachedToken != null && DateTime.UtcNow < _expiresAt.AddSeconds(-60))
            return _cachedToken;

        var client = httpClientFactory.CreateClient();
        var clientId = config["APS_CLIENT_ID"] ?? throw new InvalidOperationException("APS_CLIENT_ID not set");
        var clientSecret = config["APS_CLIENT_SECRET"] ?? throw new InvalidOperationException("APS_CLIENT_SECRET not set");

        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["scope"] = scope,
        };

        var request = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(form),
        };
        var credentials = Convert.ToBase64String(
            System.Text.Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);

        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        _cachedToken = json.GetProperty("access_token").GetString()!;
        _expiresAt = DateTime.UtcNow.AddSeconds(json.GetProperty("expires_in").GetInt32());
        return _cachedToken;
    }
}
```

Register it as a singleton so the cache is shared:

```csharp
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ApsAuthService>();
```
