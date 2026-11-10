#!/usr/bin/env python3
"""Browse user-owned data (3-legged, read-only): hubs, projects, top folders, folder contents, tree.

If no valid 3-legged token exists, the Autodesk login page opens in the browser automatically.

Examples:
  python browse.py hubs
  python browse.py projects a.YnVzaW5lc3M6...            # hub id
  python browse.py top-folders HUB_ID PROJECT_ID
  python browse.py contents PROJECT_ID FOLDER_URN
  python browse.py tree HUB_ID PROJECT_ID [--folder "Project Files"]
  python browse.py projects HUB_ID --json
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aps_common import (SCOPES_DM_READ, ApsError, die, enc, get_3legged_token,  # noqa: E402
                        iter_jsonapi_pages, print_json)


def _name(x: dict) -> str:
    a = x.get("attributes", {})
    return a.get("displayName") or a.get("name") or ""


def _kind(x: dict) -> str:
    return (x.get("attributes", {}).get("extension", {}).get("type") or x.get("type", "")).split(":")[-1]


def hubs(tok):
    return list(iter_jsonapi_pages("/project/v1/hubs", tok))


def projects(tok, hub):
    return list(iter_jsonapi_pages(f"/project/v1/hubs/{enc(hub)}/projects", tok))


def top_folders(tok, hub, project):
    return list(iter_jsonapi_pages(f"/project/v1/hubs/{enc(hub)}/projects/{enc(project)}/topFolders", tok))


def contents(tok, project, folder):
    return list(iter_jsonapi_pages(f"/data/v1/projects/{enc(project)}/folders/{enc(folder)}/contents", tok))


def walk(tok, project, folder_id, depth=0, out=None):
    out = out if out is not None else []
    for x in contents(tok, project, folder_id):
        is_folder = x["type"] == "folders"
        out.append((depth, x, is_folder))
        if is_folder:
            walk(tok, project, x["id"], depth + 1, out)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("hubs")
    sub.add_parser("projects").add_argument("hub")
    p = sub.add_parser("top-folders"); p.add_argument("hub"); p.add_argument("project")
    p = sub.add_parser("contents"); p.add_argument("project"); p.add_argument("folder")
    p = sub.add_parser("tree"); p.add_argument("hub"); p.add_argument("project")
    p.add_argument("--folder", help="only this top folder (by name)")
    ap.add_argument("--json", action="store_true", help="raw JSON:API entries")
    a = ap.parse_args()
    try:
        tok = get_3legged_token(SCOPES_DM_READ)
        if a.cmd == "tree":
            tops = [t for t in top_folders(tok, a.hub, a.project) if not a.folder or _name(t) == a.folder]
            if not tops:
                die(f"no top folder named {a.folder!r}")
            rows = []
            for t in tops:
                rows.append((0, t, True))
                walk(tok, a.project, t["id"], 1, rows)
            if a.json:
                return print_json([r[1] for r in rows])
            for d, x, f in rows:
                print("  " * d + (_name(x) + "/" if f else f"{_name(x)}  [{_kind(x)}]  {x['id']}"))
            return
        items = {"hubs": lambda: hubs(tok), "projects": lambda: projects(tok, a.hub),
                 "top-folders": lambda: top_folders(tok, a.hub, a.project),
                 "contents": lambda: contents(tok, a.project, a.folder)}[a.cmd]()
        if a.json:
            return print_json(items)
        for x in items:
            extra = x["attributes"].get("region", "") if a.cmd == "hubs" else _kind(x)
            print(f"{x['id']} | {_name(x)} | {_kind(x) if a.cmd == 'hubs' else x['type']} | {extra}")
        print(f"{len(items)} item(s)", file=sys.stderr)
    except ApsError as e:
        die(str(e))


if __name__ == "__main__":
    main()
