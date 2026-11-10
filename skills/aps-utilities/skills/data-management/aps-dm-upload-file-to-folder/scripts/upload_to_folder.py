#!/usr/bin/env python3
"""Upload a local file into a Data Management project folder (ACC / BIM 360 / Fusion Team), 3-legged.

Steps (all modifying): create storage -> upload bytes via signed S3 -> create item (first version).
Needs explicit approval (confirm_modification / --yes). Opens the browser for login if no token.

Examples:
  python upload_to_folder.py --hub HUB --project PROJ --top-folder "Project Files" --file ./a.rvt
  python upload_to_folder.py --project PROJ --folder urn:adsk.wipprod:fs.folder:co.xxx --file ./a.ipt --yes
"""
import argparse
import math
import sys
import time
from pathlib import Path
from typing import List, Optional

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import (SCOPES_DM_WRITE, ApsError, Token, confirm_modification, die, enc,  # noqa: E402
                        get_3legged_token, iter_jsonapi_pages, print_json, request)

MIN_CHUNK = 5 * 1024 * 1024
URLS_PER_BATCH = 25


def resolve_folder(tok: Token, hub: str, project: str, name: str) -> str:
    for f in iter_jsonapi_pages(f"/project/v1/hubs/{enc(hub)}/projects/{enc(project)}/topFolders", tok):
        a = f["attributes"]
        if (a.get("displayName") or a.get("name")) == name:
            return f["id"]
    die(f"no top folder named {name!r} in that project")


def existing_names(tok: Token, project: str, folder: str) -> List[str]:
    return [(x["attributes"].get("displayName") or x["attributes"].get("name"))
            for x in iter_jsonapi_pages(f"/data/v1/projects/{enc(project)}/folders/{enc(folder)}/contents", tok)]


def upload_bytes(tok: Token, object_id: str, path: Path, chunk: int = 10 * 1024 * 1024) -> None:
    bucket, key = object_id.split(":")[-1].split("/", 1)
    base = f"/oss/v2/buckets/{bucket}/objects/{enc(key)}/signeds3upload"
    size = path.stat().st_size
    chunk = max(chunk, MIN_CHUNK)
    parts = max(1, math.ceil(size / chunk))
    upload_key: Optional[str] = None
    urls: List[str] = []
    with path.open("rb") as fh:
        for n in range(1, parts + 1):
            if not urls:
                params = {"parts": min(URLS_PER_BATCH, parts - n + 1), "firstPart": n}
                if upload_key:
                    params["uploadKey"] = upload_key
                j = request("GET", base, tok, params=params).json()
                upload_key, urls = j["uploadKey"], list(j["urls"])
            data = fh.read(chunk)
            for attempt in range(3):
                r = requests.put(urls[0], data=data, timeout=300)
                if r.ok:
                    break
                if attempt == 2:
                    raise ApsError(message=f"S3 PUT failed {r.status_code}: {r.text[:200]}")
                time.sleep(2 ** attempt)
            urls.pop(0)
            print(f"[upload] part {n}/{parts}", file=sys.stderr)
    request("POST", base, tok, json_body={"uploadKey": upload_key, "size": size})


def upload_to_folder(tok: Token, project: str, folder: str, path: Path, name: Optional[str] = None) -> dict:
    name = name or path.name
    kind = "bim360" if project.startswith("b.") else "core"   # ACC/BIM 360 vs Fusion Team
    jsonapi = {"version": "1.0"}
    ct = {"Content-Type": "application/vnd.api+json"}
    st = request("POST", f"/data/v1/projects/{enc(project)}/storage", tok, headers=ct, json_body={
        "jsonapi": jsonapi,
        "data": {"type": "objects", "attributes": {"name": name},
                 "relationships": {"target": {"data": {"type": "folders", "id": folder}}}}}).json()
    object_id = st["data"]["id"]
    upload_bytes(tok, object_id, path)
    item = request("POST", f"/data/v1/projects/{enc(project)}/items", tok, headers=ct, json_body={
        "jsonapi": jsonapi,
        "data": {"type": "items",
                 "attributes": {"displayName": name,
                                "extension": {"type": f"items:autodesk.{kind}:File", "version": "1.0"}},
                 "relationships": {"tip": {"data": {"type": "versions", "id": "1"}},
                                   "parent": {"data": {"type": "folders", "id": folder}}}},
        "included": [{"type": "versions", "id": "1",
                      "attributes": {"name": name,
                                     "extension": {"type": f"versions:autodesk.{kind}:File", "version": "1.0"}},
                      "relationships": {"storage": {"data": {"type": "objects", "id": object_id}}}}]}).json()
    return {"itemId": item["data"]["id"], "name": name, "storage": object_id, "folder": folder}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True)
    ap.add_argument("--folder", help="folder URN (urn:adsk.wipprod:fs.folder:…)")
    ap.add_argument("--top-folder", help="top folder name; needs --hub")
    ap.add_argument("--hub")
    ap.add_argument("--file", required=True, type=Path)
    ap.add_argument("--name", help="display name in the folder (default: file name)")
    ap.add_argument("--yes", action="store_true", help="user already approved this exact action (agents: only then)")
    a = ap.parse_args()
    if not a.file.is_file():
        die(f"file not found: {a.file}")
    if bool(a.folder) == bool(a.top_folder):
        die("give exactly one of --folder or --top-folder")
    if a.top_folder and not a.hub:
        die("--top-folder needs --hub")
    try:
        tok = get_3legged_token(SCOPES_DM_WRITE)
        folder = a.folder or resolve_folder(tok, a.hub, a.project, a.top_folder)
        name = a.name or a.file.name
        if name in existing_names(tok, a.project, folder):
            die(f"'{name}' already exists in that folder — new versions are not supported by this script; "
                "pick another --name")
        confirm_modification(
            f"upload '{a.file}' ({a.file.stat().st_size} bytes) as '{name}' into project {a.project}, folder {folder}: "
            "POST …/storage, signed S3 upload, POST …/items (creates a new item, version 1)", a.yes)
        print_json(upload_to_folder(tok, a.project, folder, a.file, a.name))
    except ApsError as e:
        die(str(e))


if __name__ == "__main__":
    main()
