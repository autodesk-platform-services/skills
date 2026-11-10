# Reality Capture API — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills will live in `skills/reality-capture/`.
Base: `https://developer.api.autodesk.com/photo-to-3d/v1` · Skill prefix: `aps-rc-*` · Conventions: [`conventions.md`](conventions.md)

Status legend: ✅ built · 🔜 next · ⬜ planned — **all planned; nothing built yet in this family.**

| Status | Skill | Purpose | Endpoints / notes |
|---|---|---|---|
| ⬜ | `aps-rc-create-photoscene` | Create a photoscene with output formats and scene type | `POST /photoscene` |
| ⬜ | `aps-rc-add-images` | Upload images or image URLs | `POST /file` |
| ⬜ | `aps-rc-process-and-poll` | Start processing, poll progress | `POST /photoscene/{id}, GET /photoscene/{id}/progress` |
| ⬜ | `aps-rc-download-result` | Download mesh/ortho outputs | `GET /photoscene/{id}?format=…` |
| ⬜ | `aps-rc-delete` | Delete photoscene | `DELETE /photoscene/{id}` |
