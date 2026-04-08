# Auth: Secure Service Accounts — Python

## Install

```bash
uv add "pyjwt[crypto]"
```

## `src/aps_mcp_server/auth.py`

```python
import os
import time
import base64
import httpx
import jwt  # pyjwt[crypto]
from dotenv import load_dotenv

load_dotenv()

APS_CLIENT_ID = os.environ["APS_CLIENT_ID"]
APS_SSA_ID = os.environ["APS_SSA_ID"]
APS_SSA_KEY_ID = os.environ["APS_SSA_KEY_ID"]
APS_SSA_PRIVATE_KEY = base64.b64decode(os.environ["APS_SSA_KEY_BASE64"]).decode()
APS_TOKEN_URL = "https://developer.api.autodesk.com/authentication/v2/token"

_cache: dict = {"access_token": None, "expires_at": 0.0}


def _build_assertion(scope: list[str]) -> str:
    now = int(time.time())
    payload = {
        "iss": APS_CLIENT_ID,
        "sub": APS_SSA_ID,
        "aud": APS_TOKEN_URL,
        "exp": now + 300,
        "scope": scope,
    }
    return jwt.encode(
        payload,
        APS_SSA_PRIVATE_KEY,
        algorithm="RS256",
        headers={"kid": APS_SSA_KEY_ID},
    )


async def get_access_token(scope: str = "data:read") -> str:
    if _cache["access_token"] and time.time() < _cache["expires_at"] - 60:
        return _cache["access_token"]

    assertion = _build_assertion(scope.split())
    async with httpx.AsyncClient() as client:
        r = await client.post(
            APS_TOKEN_URL,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )
        r.raise_for_status()
        data = r.json()

    _cache["access_token"] = data["access_token"]
    _cache["expires_at"] = time.time() + data["expires_in"]
    return _cache["access_token"]
```
