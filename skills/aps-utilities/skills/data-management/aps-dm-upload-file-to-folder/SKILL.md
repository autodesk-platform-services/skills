---
name: aps-dm-upload-file-to-folder
description: Upload a local file into a Data Management project folder (ACC, BIM 360 or Fusion Team) as a new item — create storage, signed-S3 upload, create item. Use for "upload this file to project X / folder Y / the Milano project root". 3-legged; opens the browser login if needed. A modification — needs the user's explicit approval first.
---

# Upload a file into a project folder

## Prerequisites
- `.env` credentials; 3-legged token with `data:read data:write data:create` (obtained automatically; the browser sign-in may pop up and ask for the wider scope).
- `pip install requests`. Find hub/project/folder ids with `aps-dm-browse`.

## Usage
```bash
python scripts/upload_to_folder.py --hub HUB --project PROJ --top-folder "Project Files" --file ./a.rvt
python scripts/upload_to_folder.py --project PROJ --folder urn:adsk.wipprod:fs.folder:co.xxx --file ./a.ipt --name a.ipt --yes
```

## What it does (3 modifying calls)
1. `POST /data/v1/projects/{project}/storage` → `objectId` (`urn:adsk.objects:os.object:wip.dm.prod/<uuid>.<ext>`).
2. `GET …/signeds3upload` → `PUT` bytes to S3 (multipart for big files) → `POST …/signeds3upload` to complete.
3. `POST /data/v1/projects/{project}/items` with `tip`/`parent` relationships and an `included` version 1 pointing at the storage. Extension types: `items|versions:autodesk.core:File` (Fusion Team, `a.` ids) or `…autodesk.bim360:File` (ACC/BIM 360, `b.` ids).

## Approval rule (enforced in code)
The script prints the plan and refuses non-interactively without `--yes`. **Agents: describe it, get an explicit "yes" naming the file, then add `--yes`.** If an item with the same name is already in the folder the script stops (new versions are not implemented) — choose another `--name`.

## Pitfalls
- Creating the item without step 2 leaves an empty/broken item — the script does them in order and stops on the first error.
- Wrong `extension.type` for the hub type → `400`.
- Verified on Fusion Team (`a.`); ACC/BIM 360 path is implemented per the docs but untested here.
