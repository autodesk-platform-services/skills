# Webhooks API — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills will live in `skills/webhooks/`.
Base: `https://developer.api.autodesk.com/webhooks/v1` · Skill prefix: `aps-wh-*` · Conventions: [`conventions.md`](conventions.md)

Status legend: ✅ built · 🔜 next · ⬜ planned — **all planned; nothing built yet in this family.**

| Status | Skill | Purpose | Endpoints / notes |
|---|---|---|---|
| ⬜ | `aps-wh-list-events` | Supported systems/events (`data`, `derivative`, `adsk.c4r`, `autodesk.construction.*`) | `GET /systems/{system}/events` |
| ⬜ | `aps-wh-create-hook` | Create a hook for one event or all events of a system, with scope (folder/workflow) and filter | `POST /systems/{s}/events/{e}/hooks, POST /systems/{s}/hooks` |
| ⬜ | `aps-wh-list-and-delete-hooks` | Inventory and clean up hooks | `GET /hooks, GET /systems/{s}/hooks, DELETE …/hooks/{id}` |
| ⬜ | `aps-wh-update-hook` | Enable/disable, change callback or filter | `PATCH …/hooks/{id}` |
| ⬜ | `aps-wh-verify-signature` | Validate `x-adsk-signature` with the secret token | `PUT /tokens, POST /tokens` |
| ⬜ | `aps-wh-local-receiver` | Minimal Python receiver + tunnel for dev | `pattern` |
| ⬜ | `aps-wh-watch-acc-folder` | Composite: subscribe to `dm.version.added` on a folder (recursive) | `composes aps-dm-get-folder + create-hook` |
