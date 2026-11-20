# Auth: Secure Service Accounts — .NET / C#

## Install

```bash
dotnet add package System.IdentityModel.Tokens.Jwt
```

## `Services/ApsSsaAuthService.cs`

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using System.Net.Http.Json;
using System.Text.Json;

public class ApsSsaAuthService(IConfiguration config, IHttpClientFactory httpClientFactory)
{
    private const string TokenUrl = "https://developer.api.autodesk.com/authentication/v2/token";

    private string? _cachedToken;
    private DateTime _expiresAt = DateTime.MinValue;

    public async Task<string> GetAccessTokenAsync(string scope = "data:read")
    {
        if (_cachedToken != null && DateTime.UtcNow < _expiresAt.AddSeconds(-60))
            return _cachedToken;

        var assertion = BuildAssertion(scope);
        var client = httpClientFactory.CreateClient();
        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
            ["assertion"] = assertion,
        };

        var response = await client.PostAsync(TokenUrl, new FormUrlEncodedContent(form));
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
        var keyBase64 = config["APS_SSA_KEY_BASE64"]!;
        var keyBytes = Convert.FromBase64String(keyBase64);

        using var rsa = RSA.Create();
        rsa.ImportPkcs8PrivateKey(keyBytes, out _);

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
            Claims = new Dictionary<string, object> { ["scope"] = scope.Split(' ') },
        };

        var handler = new JwtSecurityTokenHandler();
        return handler.CreateEncodedJwt(descriptor);
    }
}
```

## `Program.cs` registration

Replace `ApsAuthService` with `ApsSsaAuthService`:

```csharp
builder.Services.AddSingleton<ApsSsaAuthService>();
```

Inject `ApsSsaAuthService` into tool classes instead of `ApsAuthService`.
