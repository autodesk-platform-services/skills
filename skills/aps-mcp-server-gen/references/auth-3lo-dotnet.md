# Auth: 3-Legged OAuth — .NET / C#

3LO in .NET requires ASP.NET Core to serve the OAuth callback route alongside
the MCP endpoint. Add the framework reference to the `.csproj`:

```xml
<ItemGroup>
  <FrameworkReference Include="Microsoft.AspNetCore.App" />
</ItemGroup>
```

## `Services/ApsThreeLeggedAuthService.cs`

```csharp
using System.Net.Http.Json;
using System.Text.Json;
using System.Web;

public class ApsThreeLeggedAuthService(IConfiguration config, IHttpClientFactory httpClientFactory)
{
    private const string TokenUrl = "https://developer.api.autodesk.com/authentication/v2/token";
    private const string AuthUrl = "https://developer.api.autodesk.com/authentication/v2/authorize";
    private const string Scopes = "data:read bucket:read";

    private readonly Dictionary<string, SessionTokens> _sessions = new();

    public string BuildAuthUrl(string sessionId)
    {
        var query = HttpUtility.ParseQueryString(string.Empty);
        query["response_type"] = "code";
        query["client_id"] = config["APS_CLIENT_ID"];
        query["redirect_uri"] = config["APS_CALLBACK_URL"];
        query["scope"] = Scopes;
        query["state"] = sessionId;
        return $"{AuthUrl}?{query}";
    }

    public async Task ExchangeCodeAsync(string sessionId, string code)
    {
        var tokens = await PostTokenAsync(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = config["APS_CALLBACK_URL"]!,
        });
        _sessions[sessionId] = tokens;
    }

    public async Task<string?> GetAccessTokenAsync(string sessionId)
    {
        if (!_sessions.TryGetValue(sessionId, out var session)) return null;
        if (DateTime.UtcNow < session.ExpiresAt.AddSeconds(-60)) return session.AccessToken;
        if (session.RefreshToken is null) return null;

        var tokens = await PostTokenAsync(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = session.RefreshToken,
        });
        _sessions[sessionId] = tokens;
        return tokens.AccessToken;
    }

    private async Task<SessionTokens> PostTokenAsync(Dictionary<string, string> form)
    {
        var clientId = config["APS_CLIENT_ID"]!;
        var clientSecret = config["APS_CLIENT_SECRET"]!;
        var creds = Convert.ToBase64String(
            System.Text.Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

        var client = httpClientFactory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(form),
        };
        req.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", creds);

        var res = await client.SendAsync(req);
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return new SessionTokens(
            json.GetProperty("access_token").GetString()!,
            json.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null,
            DateTime.UtcNow.AddSeconds(json.GetProperty("expires_in").GetInt32())
        );
    }

    private record SessionTokens(string AccessToken, string? RefreshToken, DateTime ExpiresAt);
}
```

## `Program.cs` additions

```csharp
builder.Services.AddSingleton<ApsThreeLeggedAuthService>();

// ...after app.Build():
app.MapGet("/callback", async (
    string code, string state,
    ApsThreeLeggedAuthService authService) =>
{
    await authService.ExchangeCodeAsync(state, code);
    return Results.Content(
        "<h2>Authentication successful! You can close this window.</h2>",
        "text/html");
});
```

## Tool usage

Inject `ApsThreeLeggedAuthService` into tool classes and retrieve the session
ID from the MCP server context:

```csharp
[McpServerToolType]
public class OssTools(ApsThreeLeggedAuthService authService)
{
    [McpServerTool]
    [Description("List OSS buckets accessible to the authenticated user.")]
    public async Task<string> ListBuckets(IMcpServer server)
    {
        var sessionId = server.ClientInfo?.Name; // or however session ID is surfaced
        var token = await authService.GetAccessTokenAsync(sessionId ?? "");
        if (token is null)
        {
            var authUrl = authService.BuildAuthUrl(sessionId ?? "");
            return $$$"""{"auth_required":true,"auth_url":"{{{authUrl}}}","message":"Open auth_url in a browser, then call this tool again."}""";
        }
        // ... use token
        return "...";
    }
}
```
