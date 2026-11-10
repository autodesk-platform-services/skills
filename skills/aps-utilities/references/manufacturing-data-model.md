# Manufacturing Data Model API (GraphQL) & Fusion — skill reference

Part of the [`aps`](../SKILL.md) umbrella skill. Skills will live in `skills/manufacturing-data-model/`.
Base: `https://developer.api.autodesk.com/mfg/graphql` · Skill prefix: `aps-mfgdm-*` · Conventions: [`conventions.md`](conventions.md)

Status legend: ✅ built · 🔜 next · ⬜ planned — **1 built (`aps-mfgdm-hubs-projects-folders`, hubs only so far); the rest planned.**

| Status | Skill | Purpose | Endpoints / notes |
|---|---|---|---|
| ⬜ | `aps-mfgdm-query-basics` | GraphQL client pattern + pagination | `POST /mfg/graphql` |
| ✅ | `aps-mfgdm-hubs-projects-folders` | List hubs (projects/folders/items still to add) | `query { hubs … }` |
| ⬜ | `aps-mfgdm-components-and-occurrences` | Component tree, occurrences, versions | `component, occurrences` |
| ⬜ | `aps-mfgdm-properties-and-custom-properties` | Read/write properties, custom property definitions | `propertyDefinitions, setProperties` |
| ⬜ | `aps-mfgdm-bom` | Composite: build a BOM table | `composes above` |
| ⬜ | `aps-mfgdm-drawings-and-exports` | Drawings, STEP/STL exports | `createDownload… mutations` |
