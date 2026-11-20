# .NET Test Harness

Uses [xUnit](https://xunit.net/) and calls tool methods directly with mocked
service dependencies. This tests tool logic without the full MCP protocol stack.

## Install

```bash
dotnet new xunit -n ApsMcpServer.Tests
cd ApsMcpServer.Tests
dotnet add reference ../ApsMcpServer/ApsMcpServer.csproj
dotnet add package NSubstitute
```

For NSubstitute to mock `ApsOssClient`, extract an interface first:

```csharp
// Services/IApsOssClient.cs
public interface IApsOssClient
{
    Task<List<OssBucket>> GetBucketsAsync();
    Task<List<OssObject>> GetObjectsAsync(string bucketKey);
}
```

Update `ApsOssClient` to implement `IApsOssClient`, and update `OssTools` to
accept `IApsOssClient` in its constructor.

## Test file

```csharp
// ApsMcpServer.Tests/OssToolsTests.cs
using NSubstitute;
using Xunit;

public class OssToolsTests
{
    private readonly IApsOssClient _ossClient = Substitute.For<IApsOssClient>();
    private readonly OssTools _tools;

    public OssToolsTests()
    {
        _tools = new OssTools(_ossClient);
    }

    [Fact]
    public async Task ListBuckets_ReturnsBucketList()
    {
        _ossClient.GetBucketsAsync().Returns([
            new OssBucket("my-bucket", "test-app"),
        ]);

        var result = await _tools.ListBuckets();

        Assert.Contains("my-bucket", result);
    }

    [Fact]
    public async Task ListBuckets_WhenNoBuckets_ReturnsEmptyMessage()
    {
        _ossClient.GetBucketsAsync().Returns([]);

        var result = await _tools.ListBuckets();

        Assert.Equal("No buckets found.", result);
    }

    [Fact]
    public async Task ListObjects_ReturnsObjectList()
    {
        _ossClient.GetObjectsAsync("my-bucket").Returns([
            new OssObject("drawing.rvt", 1024000, "urn:abc123"),
        ]);

        var result = await _tools.ListObjects("my-bucket");

        Assert.Contains("drawing.rvt", result);
        Assert.Contains("1024000", result);
    }

    [Fact]
    public async Task ListObjects_WhenEmpty_ReturnsEmptyMessage()
    {
        _ossClient.GetObjectsAsync("empty-bucket").Returns([]);

        var result = await _tools.ListObjects("empty-bucket");

        Assert.Equal("No objects found in bucket \"empty-bucket\".", result);
    }
}
```

## Run

```bash
dotnet test
```
