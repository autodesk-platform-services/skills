# Plant 3D table schema from local `.dcf` files

## Why this exists

**AEC Data Model API does not expose Plant 3D’s PnP table/class/column schema in the cloud.** Element queries return property values and definition ids, but not the full catalog of tables, inheritance, column types, picklists, or relationship types.

Integrations that need completeness rules, class trees, or relationship semantics need the **same Plant 3D project** (or a copy) that was published to Forma/ACC. That project folder contains SQLite **`.dcf`** files.

Element **values** come from GraphQL; `.dcf` files are **schema reference only**.

## Files in a Plant 3D project

| File | Role |
| --- | --- |
| **ProcessPower.dcf** | P&ID (2D) classes, columns, picklists, relationships |
| **Piping.dcf** | 3D piping classes and columns |

Both use the same PnP SQLite layout (`PnPTables`, `PnPColumnAttributes`, …). Match file to data set:

- **P&ID Data Set** → ProcessPower.dcf  
- **3D Piping Data Set** / **3D Models Data Set** → Piping.dcf  

**Read-only:** Do not write to `.dcf` files or leave SQLite journal files beside them.

## Obtaining schema from `.dcf`

1. Locate the Plant 3D project on disk (the source of the published ACC content).
2. Open **ProcessPower.dcf** and/or **Piping.dcf** with read-only SQLite access.
3. Run SQL against standard PnP tables (see below) or use tooling that wraps those queries.

### SQLite access options

- Node **22.5+** with `node:sqlite`
- **`sqlite3` CLI** (3.33+ for `-json`)
- **better-sqlite3** (if already in your project)

### Core PnP tables (typical queries)

| Concern | Tables / attributes |
| --- | --- |
| Class hierarchy | `PnPTables`, `PnPTableAttributes` (`DisplayName`, `BaseTable`, `Abstract`) |
| Column types | `PnPColumnAttributes` (`TYPE`, `PICKLISTNAME`) |
| Picklist values | Picklist storage referenced from column attributes |
| Relationships | Relationship type and endpoint metadata in `.dcf` |

A recursive SQL pattern walks from `PnPBase` through `BaseTable` links to produce a depth-first class tree.

### Class tree output shape (conceptual)

Each node: `tableName`, `displayName`, `parentClass`, `abstract`, `children[]`.

An element’s **Table Names** property in AEC Data Model lists comma-separated table names along the class chain (leaf-first in the API display value). That chain must align with `.dcf` `TableName` values when building filters or validation.

### Column types and picklists

Columns are **inherited** along the class hierarchy. Resolve a column for an element by walking its class ancestry (root-first) until `TableName.ColumnName` is found in the column map.

Map AEC property definition local names to column names when comparing GraphQL values to `.dcf` rules (synthetic AEC-only properties have no `.dcf` column).

### Relationship types

Relationship types declare endpoint **roles**. Relationship elements expose one property per role; values often reference related elements by PnPId within the same data set.

## Workflow

```
Plant 3D project on disk (ProcessPower.dcf + Piping.dcf)
        ↓
Extract class tree, column types, relationships (local SQL)
        ↓
Publish/sync project to ACC → AEC Data Model element groups
        ↓
Query elements via GraphQL; validate using .dcf schema offline
```

If the live project’s catalog differs from a bundled or stale `.dcf`, refresh from **that** project’s files before trusting validation rules.

## Limits

- Schema version is fixed by the `.dcf` file — not queried per element group from the cloud.
- **2D and 3D** schemas differ; do not apply P&ID rules to `Piping.dcf` or vice versa.
- **Table Names** filters using `=contains=` can over-match sibling class names (notably `EngineeringItems` vs `NonEngineeringItems`).

## Optional reference sample

[aps-aecdm-plant3d-dashboard-sample](https://github.com/autodesk-platform-services/aps-aecdm-plant3d-dashboard-sample) bundles demo `.dcf` files, SQL scripts under `server/schemas/`, and a `schema:dump` CLI for class hierarchy export.
