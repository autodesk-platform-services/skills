# Python Test Harness

Uses [pytest](https://pytest.org/) with `pytest-asyncio` and FastMCP's
in-process `Client` to call tools without a running HTTP server. APS calls
are mocked with `unittest.mock`.

## Install

```bash
uv add --dev pytest pytest-asyncio
```

Add to `pyproject.toml`:
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

## Test file

```python
# tests/test_server.py
from unittest.mock import AsyncMock, patch
import pytest
from fastmcp import Client
from aps_mcp_server.server import mcp

MOCK_BUCKETS = [{"bucketKey": "my-bucket", "bucketOwner": "test-app"}]
MOCK_OBJECTS = [{"objectKey": "drawing.rvt", "size": 1024000, "objectId": "urn:abc123"}]


@pytest.fixture
def mock_aps():
    """Patch all APS API calls so tests run without real credentials."""
    with (
        patch("aps_mcp_server.auth.get_access_token", new_callable=AsyncMock, return_value="mock-token"),
        patch("aps_mcp_server.aps.oss.list_oss_buckets", new_callable=AsyncMock, return_value=MOCK_BUCKETS),
        patch("aps_mcp_server.aps.oss.list_oss_objects", new_callable=AsyncMock, return_value=MOCK_OBJECTS),
    ):
        yield


async def test_server_exposes_expected_tools(mock_aps):
    async with Client(mcp) as client:
        tools = await client.list_tools()
        names = [t.name for t in tools]
        assert "list_buckets" in names
        assert "list_objects" in names


async def test_list_buckets_returns_data(mock_aps):
    async with Client(mcp) as client:
        result = await client.call_tool("list_buckets", {})
        assert result == MOCK_BUCKETS


async def test_list_objects_returns_data(mock_aps):
    async with Client(mcp) as client:
        result = await client.call_tool("list_objects", {"bucket_key": "my-bucket"})
        assert result == MOCK_OBJECTS


async def test_list_objects_requires_bucket_key(mock_aps):
    async with Client(mcp) as client:
        with pytest.raises(Exception):
            await client.call_tool("list_objects", {})
```

## Run

```bash
uv run pytest
```
