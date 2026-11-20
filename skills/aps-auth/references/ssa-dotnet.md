# SSA token helper: .NET / C#

## Install

```bash
dotnet add package System.IdentityModel.Tokens.Jwt
```

## `Services/ApsSsaAuthService.cs`

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

public class ApsSsaAuthService(IConfiguration config, IHttpClientFactory httpClientFactory)
{
    private const string TokenUrl = "https://developer.api.autodesk.com/authentication/v2/token";

    private string? _cachedToken;
    private DateTime _expiresAt = DateTime.MinValue;

    public async Task<string> GetAccessTokenAsync(string scope = "data:read")
    {
        if (_cachedToken != null && DateTime.UtcNow < _expiresAt.AddSeconds(-60))
            return _cachedToken;

        var clientId = config["APS_CLIENT_ID"]!;
        var clientSecret = config["APS_CLIENT_SECRET"]!;
        var request = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = BuildAssertion(scope),
            }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}")));

        var client = httpClientFactory.CreateClient();
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        _cachedToken = json.GetProperty("access_token").GetString()!;
        _expiresAt = DateTime.UtcNow.AddSeconds(json.GetProperty("expires_in").GetInt32());
        return _cachedToken;
    }

    private string BuildAssertion(string scope)
    {
        var clientId = config["APS_CLIENT_ID"]!;
        var ssaId = config["APS_SSA_ID"]!;
        var keyId = config["APS_SSA_KEY_ID"]!;
        // APS_SSA_KEY_BASE64 holds the base64-encoded PEM text (PKCS#1, "BEGIN RSA PRIVATE KEY").
        var pem = Encoding.UTF8.GetString(Convert.FromBase64String(config["APS_SSA_KEY_BASE64"]!));

        using var rsa = RSA.Create();
        rsa.ImportFromPem(pem);

        var signingKey = new RsaSecurityKey(rsa) { KeyId = keyId };
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.RsaSha256);

        var now = DateTimeOffset.UtcNow;
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = clientId,
            Subject = new ClaimsIdentity([new Claim("sub", ssaId)]),
            Audience = TokenUrl,
            Expires = now.AddMinutes(5).UtcDateTime,
            SigningCredentials = credentials,
            Claims = new Dictionary<string, object> { ["scope"] = scope.Split(' ') }, // must be an array
        };

        var handler = new JwtSecurityTokenHandler();
        return handler.CreateEncodedJwt(descriptor);
    }
}
```

## Registration

```csharp
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ApsSsaAuthService>();
```

If the app supports more than one flow, extract a common `IApsAuthService` interface with
`GetAccessTokenAsync`, and register the implementation for the chosen flow.
