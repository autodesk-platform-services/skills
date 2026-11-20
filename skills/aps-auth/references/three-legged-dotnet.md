# 3-legged token helper: .NET / C#

The callback route needs a web server. In a non-web project, add the ASP.NET Core framework
reference to the `.csproj`:

```xml
<ItemGroup>
  <FrameworkReference Include="Microsoft.AspNetCore.App" />
</ItemGroup>
```

## `Services/ApsThreeLeggedAuthService.cs`

```csharp
using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Web;

public class ApsThreeLeggedAuthService(IConfiguration config, IHttpClientFactory httpClientFactory)
{
    private const string TokenUrl = "https://developer.api.autodesk.com/authentication/v2/token";
    private const string AuthUrl = "https://developer.api.autodesk.com/authentication/v2/authorize";
    private const string Scopes = "data:read bucket:read";

    // Keyed by user or session ID. Replace with a persistent store in production.
    private readonly ConcurrentDictionary<string, Tokens> _tokens = new();

    public string BuildAuthUrl(string state)
    {
        var query = HttpUtility.ParseQueryString(string.Empty);
        query["response_type"] = "code";
        query["client_id"] = config["APS_CLIENT_ID"];
        query["redirect_uri"] = config["APS_CALLBACK_URL"];
        query["scope"] = Scopes;
        query["state"] = state;
        return $"{AuthUrl}?{query}";
    }

    // Call from the callback route, with the key that `state` maps to.
    public async Task ExchangeCodeAsync(string key, string code)
    {
        _tokens[key] = await PostTokenAsync(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = config["APS_CALLBACK_URL"]!,
        });
    }

    // Returns a valid access token, refreshing it if needed, or null if the user must sign in.
    public async Task<string?> GetAccessTokenAsync(string key)
    {
        if (!_tokens.TryGetValue(key, out var tokens)) return null;
        if (DateTime.UtcNow < tokens.ExpiresAt.AddSeconds(-60)) return tokens.AccessToken;
        if (tokens.RefreshToken is null) return null;

        try
        {
            var refreshed = await PostTokenAsync(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = tokens.RefreshToken,
            });
            refreshed = refreshed with { RefreshToken = refreshed.RefreshToken ?? tokens.RefreshToken };
            _tokens[key] = refreshed;
            return refreshed.AccessToken;
        }
        catch (HttpRequestException)
        {
            _tokens.TryRemove(key, out _); // refresh token expired or revoked
            return null;
        }
    }

    private async Task<Tokens> PostTokenAsync(Dictionary<string, string> form)
    {
        var clientId = config["APS_CLIENT_ID"]!;
        var clientSecret = config["APS_CLIENT_SECRET"]!;
        var request = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(form),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}")));

        var client = httpClientFactory.CreateClient();
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new Tokens(
            json.GetProperty("access_token").GetString()!,
            json.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null,
            DateTime.UtcNow.AddSeconds(json.GetProperty("expires_in").GetInt32()));
    }

    private record Tokens(string AccessToken, string? RefreshToken, DateTime ExpiresAt);
}
```

## Registration

```csharp
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ApsThreeLeggedAuthService>();
```
