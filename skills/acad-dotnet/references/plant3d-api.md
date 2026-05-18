# Plant 3D .NET API — Core Patterns

Plant 3D is a vertical toolset on AutoCAD. All base AutoCAD patterns apply.
API reference: `plantsdk_ref.chm` and `plantsdk_dev.chm` in the Plant SDK `docs\` folder.

## API World Map

Identify which area owns your task before choosing any class.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. P&ID Drawing Entities     │  2. Plant Project                       │
│  Autodesk.ProcessPower        │  Autodesk.ProcessPower.ProjectManager   │
│  .PnIDObjects                 │                                         │
│  Asset / DynamicAsset         │  PlantApplication (singleton)           │
│  DynamicOffPage (OPC)         │  PlantProject / Project                 │
│  LineSegment                  │  ProjectPartCollection                  │
│  LineStyle / LineGroupManager │  PnPProjectDrawing / PnPProjectUtils    │
│  AssetAdder / AssetUtil       │                                         │
│  LineSegmentAdder / LineUtil  │                                         │
│  NozzleAdder                  │                                         │
├───────────────────────────────┴─────────────────────────────────────────┤
│  3. Data Manager (P&ID + 3D)                                            │
│  Autodesk.ProcessPower.DataLinks + DataObjects                          │
│  DataLinksManager  DataLinksManager3d  PnPDatabase                      │
│  PnPTable  PnPRow  PnPColumn  PnPRowIdArray  PnPRelationshipType        │
├─────────────────────────────────────┬───────────────────────────────────┤
│  4. 3D Equipment                    │  5. 3D Pipe Routing               │
│  Autodesk.ProcessPower              │  Autodesk.ProcessPower            │
│  .PnP3dEquipment                    │  .PnP3dPipeRouting                │
│  EquipmentHelper / EquipmentType    │  AutoRoute / RoutingHelper        │
│  EquipmentPrimitives                │  PipeWrapper / ElbowWrapper       │
│  CategoryInfo / NozzleInfo          │  ReducerWrapper / BranchWrapper   │
└─────────────────────────────────────┴───────────────────────────────────┘
```

**P&ID entities = Assets + LineSegments only.** Styles, groups, annotations are non-entity objects.

---

## SDK DLL → World Map Area

| DLL | Area |
|-----|------|
| `PnIDMgd.dll` | 1 — P&ID drawing entities |
| `PnIDGUIUtilMgd.dll` | 1 — AssetAdder, LineSegmentAdder, NozzleAdder, StyleUtil |
| `PnPDataLinks.dll` | 3 — DataLinksManager |
| `PnPDataObjects.dll` | 3 — PnPTable, PnPRow, PnPRowIdArray |
| `PnPProjectManagerMgd.dll` | 2 — PlantApplication, project access |
| `PnPCommonMgd.dll` | Shared managed utilities |
| `PnPCommonDbxMgd.dll` | Shared DBX utilities (FormatStringUtils) |
| `PnIdProjectPartsMgd.dll` | 2 — PnIdProject, project parts |
| `PnP3dObjectsMgd.dll` | 4+5 — 3D piping objects |

Add only what the task requires.

---

## Area 2 — Project Access

```csharp
using Autodesk.ProcessPower.PlantInstance;   // PlantApplication
using Autodesk.ProcessPower.ProjectManager;  // PlantProject, Project, PnPProjectUtils

// PlantApplication.CurrentProject returns PlantProject, not Project
PlantProject plantProject = PlantApplication.CurrentProject;
string projectFolder = plantProject.ProjectFolderPath;

// Access specific parts by name — these strings are fixed
Project pnid   = plantProject.ProjectParts["PnId"];     // P&ID
Project piping = plantProject.ProjectParts["Piping"];   // 3D Piping
// Other valid keys: "Ortho", "Iso"

// List all drawings in a part
List<PnPProjectDrawing> dwgs = pnid.GetPnPDrawingFiles();
foreach (PnPProjectDrawing d in dwgs)
    ed.WriteMessage($"\n{d.RelativeFilePath}");

// Verify active drawing type: "PnId", "Piping", "Ortho", "Iso"
string type = PnPProjectUtils.GetActiveDocumentType();
```

---

## Area 3 — Data Manager

### Initialize

```csharp
using Autodesk.ProcessPower.DataLinks;    // DataLinksManager, DataLinksManager3d
using Autodesk.ProcessPower.DataObjects;  // PnPTable, PnPRow, PnPDatabase

DataLinksManager dlm   = pnid.DataLinksManager;
PnPDatabase      pnpDb = dlm.GetPnPDatabase();

// For 3D piping operations
DataLinksManager3d dlm3d = DataLinksManager3d.Get3dManager(dlm);
```

### The Bridge (AcDb ↔ PnP)

```csharp
// AcDbObjectId → PnP row key
int rowId = dlm.FindAcPpRowId(objectId);

// PnP row key → AcDbObjectId
var pnpIds = dlm.FindAcPpObjectIds(rowId);   // var — type not public
ObjectId acId = dlm.MakeAcDbObjectId(pnpIds.First.Value);
```

### Read properties

```csharp
string   cls = dlm.GetObjectClassname(rowId);   // "PipeLines", "Valves", ...
PnPTable tbl = pnpDb.Tables[cls];

// Always escape filter values — prevents malformed queries
string filter = $"PnPID={PnPDatabase.ToSQLLiteral(rowId.ToString())}";
PnPRow   row  = tbl.Select(filter)[0];
string   tag  = row["Tag"]?.ToString();
string   size = row["Size"]?.ToString();

// Alternative via DLM
var keys = new StringCollection { "Tag", "Size" };
StringCollection vals = dlm.GetProperties(rowId, keys, true);
```

### Write properties

```csharp
using (doc.LockDocument())
{
    dlm.SetProperties(rowId, keys, vals);
    dlm.SavePnPDatabaseChanges();   // Persist to disk
}
```

### Select all rows in current drawing

```csharp
PnPRowIdArray all = dlm.SelectAcPpRowIds(db);
```

### Discover tables and columns

```csharp
foreach (PnPTable t in pnpDb.Tables)
{
    ed.WriteMessage($"\nTable: {t.Name}");
    foreach (PnPColumn col in t.Columns)
        ed.WriteMessage($"  {col.Name}");
}
```

---

## Area 3 — Relationships

```csharp
// Both roles required — no 3-arg overload
dlm.GetRelatedRowIds(relationshipName, role1, sourceRowId, role2);
```

**P&ID relationship table:**

| Relationship | Role 1 | Role 2 |
|---|---|---|
| `LineInlineAsset` | `Line` | `Asset` |
| `LineStartAsset` | `Line` | `Asset` |
| `LineEndAsset` | `Line` | `Asset` |
| `LineOffPageConnector` | `Line` | `OffPageConnector` |
| `LineNozzle` | `Line` | `Nozzle` |
| `AnnotationRelationship` | `Annotated` | `Annotation` |
| `AssetOwnership` | `Owner` | `Owned` |
| `PipeLineGroupRelationship` | `PipeLineGroup` | `PipeLine` |
| `ConnectorsRelationship` | `Connector1` | `Connector2` |

Roles are reversible — pass either side as `role1`.

```csharp
dlm.Relate("AssetOwnership", "Owner", ownerObjId, "Owned", ownedObjId);
dlm.Unrelate("AssetOwnership", "Owner", ownerObjId, "Owned", ownedObjId);

// Discover all relationships in current project
foreach (PnPRelationshipType rt in pnpDb.RelationshipTypes)
    ed.WriteMessage($"\n{rt.Name}");
```

---

## Area 1 — Drawing Entities (P&ID)

### Create an asset

```csharp
using (var adder = new AssetAdder(db, enableAutomations: false))
{
    // Add by position + style name
    int assetRowId = adder.Add(new Point3d(5, 5, 0), "Gate Valve Style");
}
```

### Create a nozzle and connect to asset

```csharp
using (var adder = new AssetAdder(db, enableAutomations: false))
{
    int assetRowId  = adder.Add(assetPos,  "Horizontal Centrifugal Pump Style");
    int nozzleRowId = adder.Add(nozzlePos, "Flanged Nozzle Style");
    AssetUtil.ConnectNozzleWithAsset(nozzleRowId, assetRowId);
}
```

### Create a line segment and connect to asset

```csharp
using (var adder = new LineSegmentAdder(db, enableAutomations: false))
{
    var pts = new Point3dCollection { new Point3d(0, 0, 0), new Point3d(10, 0, 0) };
    int lineRowId = adder.Add(pts, "New Primary Style");
    LineUtil.ConnectLineWithAsset(lineRowId, nozzleRowId, AssetContext.ContextStart);
}
```

### Traverse line objects on a segment

```csharp
LineObjectCollection col = sline.GetLineObjectCollection(null);
foreach (LineObject lo in col)
{
    if (lo is InlineEntity ie)
    {
        var ent = tr.GetObject(ie.ObjectId, OpenMode.ForRead) as Entity;
        if (ent is Asset asset)
            ed.WriteMessage($"\n  inline asset: {asset.ClassName}");
    }
}
```

**LineObject subtypes:**

| Type | What it is |
|------|------------|
| `EndlineObject` | Asset or OPC at segment start/end |
| `InlineEntity` | Asset inline (not at endpoints) |
| `InlineGap` | Explicit user gap |
| `InlineIntersection` | Implied gap from line crossing |

### Line groups

```csharp
var mgr  = new LineGroupManager();
int lgId = mgr.GroupId(slineObjectId);   // preserve this when cloning
ObjectIdCollection segs = mgr.LineDbIds(lgId);
```

---

## Area 1 — Tag Format Strings

```csharp
using Autodesk.ProcessPower.PnPCommonDbx; // FormatStringUtils

string result = FormatStringUtils.Evaluate(
    "#(TargetObject.LineNumber^@NNN) - #(Project.General.Project_Name)",
    targetObjectId
);
```

| Token | Meaning |
|-------|---------|
| `#(TargetObject.Property)` | Property on selected entity |
| `#(Project.General.PropertyName)` | Project-level property |
| `#(@NNN)` | Auto-incremented sequence |
| `^` | Update (consume) sequence counter |
| `=` | Mate tag (second OPC in a pair) |

---

## Best Practices

**Always call `SavePnPDatabaseChanges()` after writes.** `SetProperties` and `Relate` modify in-memory state — nothing persists to disk without this call.

**Use `PnPDatabase.ToSQLLiteral()` for filter values.** Raw string interpolation in `tbl.Select()` filters causes malformed queries. Always escape.

**Project part keys are fixed strings.** `"PnId"`, `"Piping"`, `"Ortho"`, `"Iso"` — no constants class; use these string literals.

**`FindAcPpObjectIds` return type is not public.** Use `var` — do not try to name the type.

**`GetRelatedRowIds` requires both roles.** There is no 3-argument overload.

**Line group IDs must be preserved when cloning.** When duplicating lines across drawings, use `LineGroupManager.GroupId()` to capture group membership and restore it.

**All Plant API calls: main AutoCAD thread only.** Not thread-safe.

---

## Gotchas

| Symptom | Fix |
|---------|-----|
| `FindRelatedRows` exception | Missing `role2` — no 3-arg overload |
| `loc[i]` cast fails | Indexer returns `RXObject` — use `loc[i] as LineObject` |
| `PnPObjectIdArray` not found | Type not public — use `var` |
| DLL reload fails mid-session | Restart AutoCAD — we can't unload .NET DLL in Session unlike (arx|dbx|crx)|
| Property not found by name | Try `"Size"` then `"NominalDiameter"` — or enumerate `tbl.Columns` |
| `entmod`/`entmake` don't work | Plant entities: managed .NET only, no AutoLISP |
| Wrong OPC traversal | Stop at OPC asset — API follows chain to far side |
| Writes not persisting | Missing `dlm.SavePnPDatabaseChanges()` call |

---

## Code Sleuthing with `rg`

```bash
# Find all Plant namespace usages in SDK samples
rg "Autodesk\.ProcessPower" "<PLANT_SDK>/../samples" --type cs -l

# Find how a specific type is used
rg "DataLinksManager3d|AssetAdder|LineUtil" "<PLANT_SDK>/../samples" --type cs -C 5

# Enumerate all DLL references in a project
rg "HintPath.*Pn[IP]" --glob "*.csproj" -C 1
```
