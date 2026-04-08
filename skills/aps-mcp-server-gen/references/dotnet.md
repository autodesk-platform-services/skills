# .NET / C# APS MCP Server Reference

## NuGet Packages

- `ModelContextProtocol` — latest (≥0.2.0-preview)
- `Microsoft.Extensions.Hosting` — latest
- `Microsoft.Extensions.Http` — latest
- `System.IdentityModel.Tokens.Jwt` — latest (SSA auth only)

## Project Initialisation

```bash
dotnet new console -n ApsMcpServer
cd ApsMcpServer
dotnet add package ModelContextProtocol --prerelease
dotnet add package Microsoft.Extensions.Hosting
dotnet add package Microsoft.Extensions.Http
# SSA auth:
dotnet add package System.IdentityModel.Tokens.Jwt
# 3LO auth (embedded web server for OAuth callback):
dotnet add package Microsoft.AspNetCore.App
```

### `.csproj` (ensure nullable and implicit usings)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <AllowUnsafeBlocks>false</AllowUnsafeBlocks>
  </PropertyGroup>
</Project>
```

## Entry Point — STDIO Transport

STDIO is the primary transport for .NET. The `WithToolsFromAssembly()` call
auto-discovers all `[McpServerToolType]` classes in the assembly.

```csharp
// Program.cs
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = Host.CreateEmptyApplicationBuilder(settings: null);

builder.Logging.AddConsole(options =>
{
    // Send logs to stderr so stdout remains clean for MCP messages
    options.LogToStandardErrorThreshold = LogLevel.Trace;
});

builder.Services.AddSingleton<ApsAuthService>();
builder.Services.AddHttpClient<ApsOssClient>();

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();

var app = builder.Build();
await app.RunAsync();
```

## Entry Point — Streamable HTTP Transport

```csharp
// Program.cs  (HTTP transport — requires Microsoft.AspNetCore.App)
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddConsole();

builder.Services.AddSingleton<ApsAuthService>();
builder.Services.AddHttpClient<ApsOssClient>();

builder.Services
    .AddMcpServer()
    .WithHttpTransport()
    .WithToolsFromAssembly();

var app = builder.Build();
app.MapMcp("/mcp");
app.Run($"http://0.0.0.0:{builder.Configuration["PORT"] ?? "3000"}");
```

## Tool Definition Pattern

Use `[McpServerToolType]` on the class and `[McpServerTool]` on each method.
Use `[Description]` for docstrings — the LLM uses them to decide when to call
a tool and what each parameter means. Inject services via constructor.

```csharp
// Tools/OssTools.cs
using System.ComponentModel;
using ModelContextProtocol.Server;

[McpServerToolType]
public class OssTools(ApsOssClient ossClient)
{
    [McpServerTool]
    [Description("List all Object Storage Service (OSS) buckets owned by the APS application.")]
    public async Task<string> ListBuckets()
    {
        var buckets = await ossClient.GetBucketsAsync();
        if (buckets.Count == 0)
            return "No buckets found.";

        var lines = buckets.Select(b => $"- {b.BucketKey} (region: {b.BucketOwner})");
        return $"Found {buckets.Count} bucket(s):\n{string.Join("\n", lines)}";
    }

    [McpServerTool]
    [Description("List all objects stored in a specific OSS bucket.")]
    public async Task<string> ListObjects(
        [Description("The unique key identifying the OSS bucket.")] string bucketKey)
    {
        var objects = await ossClient.GetObjectsAsync(bucketKey);
        if (objects.Count == 0)
            return $"No objects found in bucket \"{bucketKey}\".";

        var lines = objects.Select(o => $"- {o.ObjectKey} ({o.Size} bytes)");
        return $"Found {objects.Count} object(s) in \"{bucketKey}\":\n{string.Join("\n", lines)}";
    }
}
```

## Auth Service

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

## OSS API Client

```csharp
// Services/ApsOssClient.cs
using System.Net.Http.Json;
using System.Text.Json;

public record OssBucket(string BucketKey, string BucketOwner);
public record OssObject(string ObjectKey, long Size, string ObjectId);

public class ApsOssClient(HttpClient httpClient, ApsAuthService authService)
{
    private const string BaseUrl = "https://developer.api.autodesk.com/oss/v2";

    public async Task<List<OssBucket>> GetBucketsAsync()
    {
        var token = await authService.GetAccessTokenAsync();
        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var json = await httpClient.GetFromJsonAsync<JsonElement>($"{BaseUrl}/buckets");
        return json.GetProperty("items").EnumerateArray()
            .Select(b => new OssBucket(
                b.GetProperty("bucketKey").GetString()!,
                b.GetProperty("bucketOwner").GetString()!))
            .ToList();
    }

    public async Task<List<OssObject>> GetObjectsAsync(string bucketKey)
    {
        var token = await authService.GetAccessTokenAsync();
        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var encoded = Uri.EscapeDataString(bucketKey);
        var json = await httpClient.GetFromJsonAsync<JsonElement>($"{BaseUrl}/buckets/{encoded}/objects");
        return json.GetProperty("items").EnumerateArray()
            .Select(o => new OssObject(
                o.GetProperty("objectKey").GetString()!,
                o.GetProperty("size").GetInt64(),
                o.GetProperty("objectId").GetString()!))
            .ToList();
    }
}
```

## `appsettings.json`

```json
{
  "APS_CLIENT_ID": "",
  "APS_CLIENT_SECRET": "",
  "PORT": "3000",
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  }
}
```

Prefer env vars over `appsettings.json` for secrets in production.

## `.env.example` (for local development)

```dotenv
# APS Application credentials (https://aps.autodesk.com/myapps)
APS_CLIENT_ID=
APS_CLIENT_SECRET=

# HTTP transport only
PORT=3000
```

Set env vars before `dotnet run`, or use `launchSettings.json`.

## Claude Desktop Config (STDIO)

```json
{
  "mcpServers": {
    "aps-mcp-server": {
      "command": "dotnet",
      "args": ["run", "--project", "/absolute/path/to/ApsMcpServer/ApsMcpServer.csproj"],
      "env": {
        "APS_CLIENT_ID": "your-client-id",
        "APS_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Or point to the published binary:
```json
{
  "mcpServers": {
    "aps-mcp-server": {
      "command": "/absolute/path/to/ApsMcpServer/bin/Release/net9.0/ApsMcpServer"
    }
  }
}
```

## SSA-specific additions

For Secure Service Account auth, register `ApsSsaAuthService` instead of
`ApsAuthService`. See [`auth-patterns.md`](auth-patterns.md) for the JWT
assertion implementation. Add to DI:

```csharp
builder.Services.AddSingleton<ApsSsaAuthService>();
```

Replace `ApsAuthService` injected into `ApsOssClient` with `ApsSsaAuthService`
(or extract a common `IApsAuthService` interface).
