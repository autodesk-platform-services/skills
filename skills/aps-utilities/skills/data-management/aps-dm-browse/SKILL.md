---
name: aps-dm-browse
description: Read-only browsing of user-owned Data Management data with a 3-legged token — list hubs, projects in a hub, a project's top folders, a folder's contents, or a whole folder tree (ACC, BIM 360, Fusion Team). Use for "list hubs", "list projects in hub X", "list files in project Y", "what's in this folder". Opens the browser login automatically when no token is available.
---

# Browse hubs, projects and folders (3-legged, read-only)

## Prerequisites
- `.env` with `APS_CLIENT_ID` / `APS_CLIENT_SECRET` (root `SKILL.md`).
- The APS app's callback `http://localhost:8080/callback` registered. A 3-legged token is obtained by the `aps-auth-3legged` skill: stored token → silent refresh → **browser sign-in page pops up** (tell the user to sign in).

## Usage
```bash
python scripts/browse.py hubs                                   # id | name | hub type | region
python scripts/browse.py projects HUB_ID
python scripts/browse.py top-folders HUB_ID PROJECT_ID
python scripts/browse.py contents PROJECT_ID FOLDER_URN
python scripts/browse.py tree HUB_ID PROJECT_ID [--folder "Project Files"]   # recursive
python scripts/browse.py projects HUB_ID --json                  # raw JSON:API
```
All lists are auto-paginated (`links.next`). All calls are `GET` — no approval needed.

## Notes
- Hub id prefix `a.` = Fusion Team (`autodesk.core`), `b.` = ACC / BIM 360 (`autodesk.bim360`). Project ids share the prefix.
- Hubs in other regions (e.g. `GBR`, `CAN`) may need a matching `x-ads-region`; a 404 can mean wrong region.
- Folder URNs and item ids go in URL paths; the script URL-encodes them.
- "No hubs" usually means the wrong Autodesk account was used to sign in.
