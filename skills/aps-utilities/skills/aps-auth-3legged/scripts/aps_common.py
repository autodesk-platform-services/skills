"""
aps_common.py — shared helpers for APS (Autodesk Platform Services) skills.

This file is the single source of truth in `_shared/` and is vendored (copied)
into every skill's `scripts/` folder so each skill stays self-contained.
Do not edit the vendored copies; edit `_shared/aps_common.py` and re-run
`python _shared/vendor.py`.

Configuration comes from environment variables, which are auto-loaded from a
`.env` file (see `load_env`) — real environment variables take precedence.
A missing `.env` / missing required values produces an error asking the user
to fill the file in.

Environment variables:
    APS_CLIENT_ID        required for token acquisition
    APS_CLIENT_SECRET    required for 2-legged and for 3-legged code exchange
    APS_ACCESS_TOKEN     optional; if set, used as-is (skips token calls)
    APS_REGION           optional; US (default) | EMEA | AUS
    APS_BASE_URL         optional; default https://developer.api.autodesk.com
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional
from urllib.parse import quote

import requests

DEFAULT_BASE_URL = "https://developer.api.autodesk.com"
VALID_REGIONS = ("US", "EMEA", "AUS")

# Scopes used across Data Management skills
SCOPES_OSS_READ = "bucket:read data:read"
SCOPES_OSS_WRITE = "bucket:create bucket:read data:read data:write data:create"
SCOPES_OSS_ADMIN = "bucket:create bucket:read bucket:delete data:read data:write data:create"
SCOPES_DM_READ = "data:read"
SCOPES_DM_WRITE = "data:read data:write data:create"
SCOPES_MD_READ = "data:read viewables:read"
SCOPES_MD_WRITE = "data:read data:write viewables:read"
SCOPES_DA = "code:all"


class ApsError(RuntimeError):
    """Raised for non-2xx APS responses (or network failures) with a readable message."""

    def __init__(self, resp: Optional[requests.Response] = None, message: Optional[str] = None):
        self.status: Optional[int] = None
        self.url: Optional[str] = None
        self.body: Any = None
        if resp is not None:
            self.status = resp.status_code
            self.url = resp.url
            try:
                self.body = resp.json()
            except ValueError:
                self.body = resp.text
            message = f"APS {self.status} {resp.request.method} {self.url}\n{_pretty(self.body)}"
        super().__init__(message or "APS request failed")


def _post_form(url: str, data: Dict[str, str], headers: Dict[str, str]) -> requests.Response:
    try:
        return requests.post(url, data=data, headers=headers, timeout=30)
    except requests.RequestException as e:
        raise ApsError(message=f"network error calling {url}: {e.__class__.__name__}: {e}") from e


# --------------------------------------------------------------------------- #
# .env loading
# --------------------------------------------------------------------------- #

_ENV_LOADED_FROM: Optional[Path] = None


def find_env_file() -> Optional[Path]:
    """$APS_ENV_FILE, else the nearest `.env` walking up from the CWD, then from this file."""
    explicit = os.environ.get("APS_ENV_FILE")
    if explicit:
        return Path(explicit).expanduser() if Path(explicit).expanduser().is_file() else None
    for start in (Path.cwd(), Path(__file__).resolve().parent):
        for d in (start, *start.parents):
            if (d / ".env").is_file():
                return d / ".env"
    return None


def load_env() -> Optional[Path]:
    """Load KEY=VALUE lines from the `.env` file into os.environ (never overriding existing variables).

    Supports comments, blank lines, `export KEY=...` and single/double-quoted values.
    Returns the file used, or None if there is none.
    """
    global _ENV_LOADED_FROM
    path = find_env_file()
    if path is None:
        return None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export "):]
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        elif " #" in val:
            val = val.split(" #", 1)[0].rstrip()
        if key and val:                      # empty `KEY=` means "not filled in yet"
            os.environ.setdefault(key, val)
    _ENV_LOADED_FROM = path
    return path


def require_env(*names: str) -> List[str]:
    """Return the values of the required variables, or raise ApsError asking the user to fill in `.env`."""
    missing = [n for n in names if not os.environ.get(n)]
    if missing:
        where = _ENV_LOADED_FROM or find_env_file()
        if where:
            hint = f"Fill in these values in {where}:"
        else:
            hint = ("No .env file found. Create one (copy .env.example to .env in the repo root, "
                    "or set APS_ENV_FILE) and fill in:")
        raise ApsError(message=f"{hint}\n" + "\n".join(f"  {n}=" for n in missing)
                       + "\n(Do not paste secrets into the chat — put them in the .env file.)")
    return [os.environ[n] for n in names]


load_env()


def _pretty(x: Any) -> str:
    return json.dumps(x, indent=2) if isinstance(x, (dict, list)) else str(x)


def base_url() -> str:
    return os.environ.get("APS_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


def region() -> str:
    r = os.environ.get("APS_REGION", "US").upper()
    if r not in VALID_REGIONS:
        raise ValueError(f"APS_REGION must be one of {VALID_REGIONS}, got {r!r}")
    return r


def enc(s: str) -> str:
    """URL-encode a path segment (object keys, URNs) safely."""
    return quote(s, safe="")


def b64url(s: str) -> str:
    """URL-safe base64 without padding — the URN form Model Derivative expects."""
    return base64.urlsafe_b64encode(s.encode()).decode().rstrip("=")


# --------------------------------------------------------------------------- #
# Tokens
# --------------------------------------------------------------------------- #

@dataclass
class Token:
    access_token: str
    expires_at: float  # epoch seconds
    refresh_token: Optional[str] = None
    scope: str = ""

    @property
    def expired(self) -> bool:
        return time.time() > self.expires_at - 60  # 60 s safety margin

    def header(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}


def _basic_auth_header() -> Dict[str, str]:
    cid, sec = require_env("APS_CLIENT_ID", "APS_CLIENT_SECRET")
    raw = base64.b64encode(f"{cid}:{sec}".encode()).decode()
    return {"Authorization": f"Basic {raw}"}


def _token_request(data: Dict[str, str], use_basic: bool = True) -> Token:
    headers = {"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"}
    if use_basic:
        headers.update(_basic_auth_header())
    else:
        data = {**data, "client_id": require_env("APS_CLIENT_ID")[0]}
    resp = _post_form(f"{base_url()}/authentication/v2/token", data, headers)
    if not resp.ok:
        raise ApsError(resp)
    j = resp.json()
    return Token(
        access_token=j["access_token"],
        expires_at=time.time() + int(j.get("expires_in", 3600)),
        refresh_token=j.get("refresh_token"),
        scope=data.get("scope", ""),
    )


_token_cache: Dict[str, Token] = {}


def get_2legged_token(scope: str = SCOPES_OSS_WRITE) -> Token:
    """Client-credentials token, cached per scope string for the process lifetime."""
    env = os.environ.get("APS_ACCESS_TOKEN")
    if env:
        return Token(access_token=env, expires_at=time.time() + 3600, scope=scope)
    t = _token_cache.get(scope)
    if t and not t.expired:
        return t
    t = _token_request({"grant_type": "client_credentials", "scope": scope})
    _token_cache[scope] = t
    return t


def exchange_code_for_token(code: str, redirect_uri: str, code_verifier: Optional[str] = None) -> Token:
    """3-legged: swap an authorization code for tokens (PKCE supported)."""
    data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
    if code_verifier:
        data["code_verifier"] = code_verifier
    # Confidential apps use Basic auth; public (PKCE-only) apps send client_id in body.
    return _token_request(data, use_basic=bool(os.environ.get("APS_CLIENT_SECRET")))


def refresh_3legged_token(refresh_token: str, scope: Optional[str] = None) -> Token:
    data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
    if scope:
        data["scope"] = scope
    return _token_request(data, use_basic=bool(os.environ.get("APS_CLIENT_SECRET")))


def get_3legged_token(scope: str = SCOPES_DM_READ) -> Token:
    """User-context token for hubs/projects/folders/items.

    Delegates to the `aps-auth-3legged` skill's `ensure_token.py`: reuses the stored token
    (~/.aps_tokens.json), refreshes it silently, or otherwise **opens the Autodesk sign-in page
    in the browser** (stderr/stdin are inherited so the user sees the prompt). Blocks until done.
    """
    for d in Path(__file__).resolve().parents:
        script = d / "skills" / "authentication" / "aps-auth-3legged" / "scripts" / "ensure_token.py"
        if script.is_file():
            break
    else:
        raise ApsError(message="aps-auth-3legged skill not found — run its scripts/ensure_token.py "
                               "yourself and export APS_USER_TOKEN")
    if os.environ.get("APS_USER_TOKEN"):
        return Token(access_token=os.environ["APS_USER_TOKEN"], expires_at=time.time() + 3000, scope=scope)
    proc = subprocess.run([sys.executable, str(script), "--scope", scope], stdout=subprocess.PIPE, text=True)
    tok = proc.stdout.strip()
    if proc.returncode != 0 or not tok:
        raise ApsError(message="3-legged login failed or was cancelled")
    return Token(access_token=tok, expires_at=time.time() + 3000, scope=scope)


# --------------------------------------------------------------------------- #
# HTTP with retries
# --------------------------------------------------------------------------- #

RETRY_STATUSES = {429, 500, 502, 503, 504}


def request(
    method: str,
    path_or_url: str,
    token: Optional[Token] = None,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_body: Any = None,
    data: Any = None,
    headers: Optional[Dict[str, str]] = None,
    with_region: bool = False,
    max_retries: int = 5,
    timeout: int = 60,
    stream: bool = False,
) -> requests.Response:
    """
    Call an APS endpoint with bearer auth, optional x-ads-region, and
    exponential backoff on 429/5xx. `path_or_url` may be a path ("/oss/v2/...")
    or a full URL (e.g. a `links.next` or signed S3 URL — pass token=None then).
    """
    url = path_or_url if path_or_url.startswith("http") else f"{base_url()}{path_or_url}"
    h: Dict[str, str] = {"Accept": "application/json"}
    if token:
        h.update(token.header())
    if with_region:
        h["x-ads-region"] = region()
    if headers:
        h.update(headers)

    delay = 1.0
    for attempt in range(max_retries + 1):
        try:
            resp = requests.request(method, url, params=params, json=json_body, data=data,
                                    headers=h, timeout=timeout, stream=stream)
        except requests.RequestException as e:
            if attempt == max_retries:
                raise ApsError(message=f"network error calling {method} {url}: {e.__class__.__name__}: {e}") from e
            time.sleep(delay)
            delay = min(delay * 2, 30)
            continue
        if resp.status_code not in RETRY_STATUSES or attempt == max_retries:
            if not resp.ok:
                raise ApsError(resp)
            return resp
        wait = float(resp.headers.get("Retry-After", delay))
        print(f"[aps] {resp.status_code} on {method} {url} — retry in {wait:.0f}s", file=sys.stderr)
        time.sleep(wait)
        delay = min(delay * 2, 30)
    raise AssertionError("unreachable")


def get_json(path: str, token: Token, **kw: Any) -> Any:
    return request("GET", path, token, **kw).json()


# --------------------------------------------------------------------------- #
# Pagination
# --------------------------------------------------------------------------- #

def iter_jsonapi_pages(path: str, token: Token, params: Optional[Dict[str, Any]] = None,
                       page_limit: int = 200) -> Iterator[Dict[str, Any]]:
    """
    Walk JSON:API style endpoints (Data Management /project/v1, /data/v1):
    yields each entry in `data`, following `links.next.href`.
    """
    p = dict(params or {})
    p.setdefault("page[limit]", page_limit)
    url: Optional[str] = path
    first = True
    while url:
        j = request("GET", url, token, params=p if first else None).json()
        first = False
        for d in j.get("data", []):
            yield d
        url = (j.get("links") or {}).get("next", {}).get("href")


def iter_oss_pages(path: str, token: Token, params: Optional[Dict[str, Any]] = None,
                   limit: int = 100) -> Iterator[Dict[str, Any]]:
    """
    Walk OSS list endpoints (/oss/v2/buckets, /oss/v2/buckets/{k}/objects):
    yields each entry in `items`, following `next`.
    """
    p = dict(params or {})
    p.setdefault("limit", limit)
    url: Optional[str] = path
    first = True
    while url:
        j = request("GET", url, token, params=p if first else None, with_region=first).json()
        first = False
        for it in j.get("items", []):
            yield it
        url = j.get("next")


# --------------------------------------------------------------------------- #
# CLI helpers
# --------------------------------------------------------------------------- #

def print_json(x: Any) -> None:
    print(json.dumps(x, indent=2, ensure_ascii=False))


def die(msg: str, code: int = 1) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def confirm_modification(summary: str, yes: bool = False) -> None:
    """Gate for every non-GET action. Prints what is about to happen, then requires approval.

    Interactive terminal: the user must type `yes`. Non-interactive (agents, CI): refuses unless
    `--yes` was passed — agents must pass it ONLY after the user explicitly approved this exact action.
    """
    print(f"[confirm] {summary}", file=sys.stderr)
    if yes:
        return
    if sys.stdin.isatty():
        if input("Type 'yes' to proceed: ").strip().lower() == "yes":
            return
        die("aborted — not confirmed")
    die("this modifies data and needs explicit approval. Re-run with --yes ONLY after the user "
        "approved exactly this action.")
