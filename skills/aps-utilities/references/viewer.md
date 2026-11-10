# Viewer — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills will live in `skills/viewer/`.
Base: `https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/` · Skill prefix: `aps-viewer-*` · Conventions: [`conventions.md`](conventions.md)

Status legend: ✅ built · 🔜 next · ⬜ planned — **1 built (`aps-viewer-view-model`); the rest planned.**

| Status | Skill | Purpose | Endpoints / notes |
|---|---|---|---|
| ⬜ | `aps-viewer-token-endpoint` | Minimal Python (Flask/FastAPI) endpoint serving `viewables:read` tokens to the browser | `composes aps-auth-2legged` |
| ✅ | `aps-viewer-view-model` | Local server + single-page Viewer for a translated URN, serving `viewables:read` tokens (covers token endpoint and basic page) | `GET /viewers/7.*`, token only |
| ⬜ | `aps-viewer-basic-page` | Single-file HTML that loads a URN with `Autodesk.Viewing.Initializer` | `Viewer SDK` |
| ⬜ | `aps-viewer-load-acc-model` | Load an ACC/BIM 360 version (3-legged token, `urn` from derivatives link) | `composes aps-dm-get-version` |
| ⬜ | `aps-viewer-extensions` | Scaffold a Viewer extension (toolbar button, panel, events) | `Viewer SDK` |
| ⬜ | `aps-viewer-properties-and-selection` | Read properties / isolate / color objects from code | `Viewer SDK` |
| ⬜ | `aps-viewer-svf2-vs-svf` | Decide output format and `env`/`api` options | `reference` |
