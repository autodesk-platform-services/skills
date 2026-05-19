# Civil 3D .NET API — Patterns & Verified Facts

Civil 3D is a vertical toolset on AutoCAD. All base AutoCAD patterns apply (see `autocad-api.md`).
Everything here is verified against `Civil3D.NET 13.9.628` targeting AutoCAD 2027.

## Assembly → DLL Map

| DLL | NuGet source | Key namespaces |
|-----|-------------|----------------|
| `AeccDbMgd.dll` | `Civil3D.NET` | `Autodesk.Civil.DatabaseServices`, `Autodesk.Civil.ApplicationServices` |
| `AeccDataShortcutMgd.dll` | `Civil3D.NET` | `Autodesk.Civil.DataShortcuts` |
| `AecBaseMgd.dll` | `Civil3D.NET` | `Autodesk.Aec.DatabaseServices` (AEC base types) |
| `AeccDrainageDesignMgd.dll` | `Civil3D.NET` | Drainage/hydrology |
| `AeccPressurePipesMgd.dll` | `Civil3D.NET` | Pressure pipes |

All Civil 3D DLLs live in `<ACAD_HOME>\C3D\` at runtime, NOT in the AutoCAD root folder.

## Required Using Statements

```csharp
using Autodesk.AutoCAD.ApplicationServices.Core;  // Application (Core-safe)
using Autodesk.AutoCAD.DatabaseServices;           // Transaction, ObjectId, OpenMode
using Autodesk.AutoCAD.EditorInput;                // Editor
using Autodesk.AutoCAD.Runtime;                    // CommandMethod, ExtensionApplication
using Autodesk.Civil.ApplicationServices;          // CivilDocument
using Autodesk.Civil.DatabaseServices;             // Alignment, TinSurface, Profile, Corridor, etc.
using Autodesk.Civil.DataShortcuts;                // DataShortcuts static class

// REQUIRED when both AutoCAD and Civil 3D have an Entity class:
using CivilEntity = Autodesk.Civil.DatabaseServices.Entity;
```

The `CivilEntity` alias is **mandatory** in any file that uses both `Autodesk.AutoCAD.DatabaseServices` and `Autodesk.Civil.DatabaseServices` — without it, `Entity` is ambiguous.

## NuGet Package

```xml
<PackageReference Include="Civil3D.NET" Version="13.9.628" ExcludeAssets="runtime" />
```

Also requires AutoCAD base packages:
```xml
<PackageReference Include="AutoCAD.NET.Core" Version="26.0.0" ExcludeAssets="runtime" />
<PackageReference Include="AutoCAD.NET.Model" Version="26.0.0" ExcludeAssets="runtime" />
```

## Official References & API Guides

| Resource | URL |
|----------|-----|
| Civil 3D Help Portal (2027) | https://help.autodesk.com/view/CIV3D/2027/ENU/ |
| Civil 3D .NET API Reference (2025) | https://help.autodesk.com/view/CIV3D/2025/ENU/?guid=GUID-4FA1E051-3099-49F6-B448-4B9D4F10B673 |
| Civil 3D NuGet (`Civil3D.NET`) | https://www.nuget.org/packages/Civil3D.NET |
| AutoCAD .NET Developer's Guide | https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-C3F3C736-40CF-44A0-9210-55F6A939B6F2 |

### Civil 3D .NET API — Key Categories

Civil 3D's .NET API covers these domain areas (all inherit base AutoCAD patterns):

| Category | Key types | Notes |
|----------|-----------|-------|
| Alignments | `Alignment`, `AlignmentSubEntityLine`, `AlignmentSubEntityArc`, `AlignmentSubEntitySpiral` | Station/offset, geometry, labels |
| Profiles | `Profile`, `ProfileView`, `ProfilePVI` | Children of Alignments — no top-level collection |
| Surfaces | `TinSurface`, `GridSurface`, `TinVolumeSurface` | Triangulated, grid, volume calculations |
| Corridors | `Corridor`, `Baseline`, `BaselineRegion`, `CorridorSurface` | Multi-baseline, assemblies, subassemblies |
| Pipe Networks | `Network`, `Pipe`, `Structure` | Gravity & pressure piping |
| Parcels | `Parcel`, `Site` | Parcels are children of Sites |
| COGO Points | `CogoPoint`, `CogoPointCollection`, `PointGroup` | Large collections — use index loops |
| Grading | `Grading`, `GradingGroup`, `FeatureLine` | Surface-based grading |
| Sections & Sample Lines | `SampleLine`, `SampleLineGroup`, `SectionView` | Cross-sections from alignments |
| Quantity Takeoff | `QTOCriteria`, `PayItem` | Material volumes, earthwork |
| Data Shortcuts | `DataShortcuts` (static), `DataShortcutManager` | Cross-drawing references (DREFs) |
| Styles | `*Style` classes in `Autodesk.Civil.DatabaseServices.Styles` | Every Civil object type has styles |
| Labels | `*Label`, `*LabelGroup` | Annotation for all Civil objects |
| Settings | `CivilDocument.Settings` | Drawing/command/feature settings hierarchy |
| Survey | `SurveyDatabase`, `SurveyNetwork` | Survey data management |

For base AutoCAD categories (plotting, XRefs, events, CUI, entities), see `autocad-api.md`.

### Autodesk Help MCP Server

For AI-assisted doc lookup across all Autodesk products, install the Autodesk Help MCP server.
See `autocad-api.md` → "Autodesk Help MCP Server" section for setup instructions.

Example Civil 3D queries:
- `"Search help content for 'data shortcuts' in Civil 3D 2027 in en_US"`
- `"Search help content for 'corridor surface' in Civil 3D 2027 in English"`

---

## Entry Point

```csharp
// From a known database (preferred — works in DA, multi-doc, accoreconsole)
CivilDocument civilDoc = CivilDocument.GetCivilDocument(db);

// From active document (desktop convenience)
CivilDocument civilDoc = CivilApplication.ActiveDocument;
```

---

## Collection Navigation

Civil 3D collections return `ObjectIdCollection`. Always resolve inside a transaction.

```csharp
using var tr = db.TransactionManager.StartTransaction();
var civilDoc = CivilDocument.GetCivilDocument(db);

// Top-level — method-based: GetXxxIds()
civilDoc.GetAlignmentIds()      // ObjectIdCollection
civilDoc.GetSurfaceIds()        // ObjectIdCollection
civilDoc.GetPipeNetworkIds()    // ObjectIdCollection
civilDoc.GetSiteIds()           // ObjectIdCollection

// Profiles — children of Alignments (NO top-level GetProfileIds)
foreach (ObjectId alignId in civilDoc.GetAlignmentIds())
{
    var alignment = tr.GetObject(alignId, OpenMode.ForRead) as Alignment;
    foreach (ObjectId profileId in alignment.GetProfileIds()) { ... }
}

// Corridors — PROPERTY, not method. NO GetCorridorIds() exists.
foreach (ObjectId id in civilDoc.CorridorCollection) { ... }

// Sites → Parcels (parcels are children of sites)
foreach (ObjectId siteId in civilDoc.GetSiteIds())
{
    var site = tr.GetObject(siteId, OpenMode.ForRead) as Site;
    foreach (ObjectId parcelId in site.GetParcelIds()) { ... }
}

tr.Commit();
```

**Key distinction:** Most collections use `Get*Ids()` methods. `CorridorCollection` is a property — iterating it yields `ObjectId` values but it is NOT an `ObjectIdCollection`. You cannot pass it directly to methods expecting `ObjectIdCollection`. Copy IDs manually:

```csharp
var corridorIds = new ObjectIdCollection();
foreach (ObjectId cid in civilDoc.CorridorCollection)
    corridorIds.Add(cid);
```

---

## Data References (DREFs) — `Autodesk.Civil.DataShortcuts`

Data References are cross-drawing links to Civil 3D objects published via Data Shortcuts. A DREF entity in a host drawing points to a source drawing's published object (alignment, surface, pipe network, profile, corridor).

### Architecture

```
WorkingFolder/
  ProjectFolder/
    _Shortcuts/
      Alignments/        ← XML files describing published shortcuts
      Surfaces/
      PipeNetworks/
      Profiles/
    SourceDrawing.dwg    ← contains the real civil objects
  HostDrawing.dwg        ← contains DREF entities pointing to SourceDrawing
```

### Static Methods on `DataShortcuts`

```csharp
using Autodesk.Civil.DataShortcuts;

// Configure project context (MUST be done before any DREF operations)
DataShortcuts.SetWorkingFolder(fullPath);             // absolute path to working folder
DataShortcuts.SetCurrentProjectFolder(projectName);   // folder name under working folder
DataShortcuts.Validate();                              // validates shortcuts XML structure

// Create the manager for inspecting published items
bool isValid = false;
var mgr = DataShortcuts.CreateDataShortcutManager(ref isValid);
if (isValid)
{
    int count = mgr.GetPublishedItemsCount();
    for (int i = 0; i < count; i++)
    {
        var item = mgr.GetPublishedItemAt(i);
        // item.Name, item.DSEntityType, item.SourceFileName, item.IsBroken
    }
}

// Repair a broken DREF — re-point to a new source drawing
bool success = DataShortcuts.RepairBrokenDRef(entityObjectId, newSourceFullPath, validateFirst: true);
```

### DREF Entity Properties (on `CivilEntity`)

Every Civil 3D entity exposes these reference-related properties:

```csharp
var ent = tr.GetObject(id, OpenMode.ForRead) as CivilEntity;

ent.IsReferenceObject          // true if this is a DREF (not a native object)
ent.IsReferenceValid           // false if the shortcut XML or source is corrupted
ent.IsReferencedSourceExisting // false if source drawing was deleted/moved
ent.IsReferenceStale           // true if source has been modified since last sync
ent.IsReferenceSubObject       // true for child objects (e.g., profile under alignment DREF)

// Get detailed reference info
var refInfo = ent.GetReferenceInfo();
refInfo.SourceDrawing          // full path to source DWG
refInfo.IsSourceDrawingExistent
```

### DREF Status Logic

```csharp
if (!ent.IsReferenceObject) continue;  // skip native objects

if (!ent.IsReferenceValid || !ent.IsReferencedSourceExisting)
    status = "BROKEN";
else if (ent.IsReferenceStale)
    status = "STALE";
else
    status = "OK";
```

### Supported DREF Entity Types

| Type | Collection | Entity class |
|------|-----------|--------------|
| Alignment | `civilDoc.GetAlignmentIds()` | `Alignment` |
| Surface | `civilDoc.GetSurfaceIds()` | `TinSurface` / `GridSurface` |
| Pipe Network | `civilDoc.GetPipeNetworkIds()` | `Network` |
| Profile | `alignment.GetProfileIds()` | `Profile` |
| Corridor | `civilDoc.CorridorCollection` | `Corridor` |

### Disk Layout — `_Shortcuts` Folder

The `_Shortcuts` folder under the project contains XML files that describe each published shortcut. Structure:

```
_Shortcuts/
  ShortcutsHistory.xml          ← history/metadata
  Alignments/
    AlignmentName_<guid>.xml    ← one XML per published alignment
  Surfaces/
    SurfaceName_<guid>.xml
  PipeNetworks/
    NetworkName_<guid>.xml
  Profiles/
    ProfileName_<guid>.xml
```

For testing, copy `_Shortcuts.bak` → `_Shortcuts` to restore a known state.

### DA Workflow for DREFs

In Design Automation, send all project files as a zip with `pathInZip`:

```
Activity parameter:
  inputFile = { verb: "get", required: true, localName: "input", zip: true }

WorkItem argument:
  inputFile = { url: <signedUrl>, pathInZip: "HostDrawing.dwg" }
```

The zip preserves the relative folder structure so `_Shortcuts` XML paths resolve correctly. The plugin reads `params.json` for `WorkingFolder` and `ProjectFolder` to call `DataShortcuts.SetWorkingFolder()` / `SetCurrentProjectFolder()`.

---

## COGO Points

```csharp
// Read — use index loop, not LINQ (can be thousands)
CogoPointCollection pts = civilDoc.CogoPoints;
for (int i = 0; i < pts.Count; i++)
{
    var pt = tr.GetObject(pts[i], OpenMode.ForRead) as CogoPoint;
    ed.WriteMessage($"\n#{pt.PointNumber}  {pt.Location}  {pt.RawDescription}");
}

// Add
ObjectId ptId = civilDoc.CogoPoints.Add(new Point3d(x, y, z), true);

// Point Groups — check before adding (duplicate names throw)
if (!civilDoc.PointGroups.Contains(groupName))
    civilDoc.PointGroups.Add(groupName);
```

---

## Alignments

```csharp
var alignment = tr.GetObject(id, OpenMode.ForRead) as Alignment;

// Station + offset from point (Z ignored)
double station = 0, offset = 0;
alignment.StationOffset(new Point3d(x, y, 0), ref station, ref offset);

// Point at station + offset
double outX = 0, outY = 0, outZ = 0;
alignment.PointLocation(station, offset, 0, ref outX, ref outY, ref outZ);
```

---

## Surfaces

```csharp
var surface = tr.GetObject(id, OpenMode.ForRead) as TinSurface;

// FindElevationAtXY THROWS if point is outside boundary
try { double z = surface.FindElevationAtXY(x, y); }
catch { /* point outside surface */ }

// Stats
var props = surface.GetGeneralProperties();
// props.MinimumElevation, props.MaximumElevation

// Modify + rebuild
surface.UpgradeOpen();
surface.PointGroupsDefinition.AddPointGroup(pgId);
surface.Rebuild();   // MUST call — changes don't auto-rebuild
```

---

## Profiles

```csharp
var profile = tr.GetObject(profileId, OpenMode.ForRead) as Profile;
var parentAlignment = tr.GetObject(profile.AlignmentId, OpenMode.ForRead) as Alignment;
double elev = profile.ElevationAt(station);
```

---

## Fully-Qualified Type Requirements

AutoCAD assemblies shadow `System.Collections.Generic` in some contexts. If `Dictionary` or `List` don't resolve, use fully-qualified types:

```csharp
System.Collections.Generic.Dictionary<string, string>   // not just Dictionary<string, string>
System.Collections.Generic.List<ObjectId>                // not just List<ObjectId>
```

---

## Best Practices

- **Null-check CivilDocument.** Plain AutoCAD drawings return null from `GetCivilDocument()`.
- **Profiles are NOT top-level.** No `GetProfileIds()` on `CivilDocument`. Always go through parent `Alignment`.
- **CorridorCollection is a property, not a method.** `GetCorridorIds()` does not exist.
- **CorridorCollection is not ObjectIdCollection.** Cannot assign/cast directly. Copy IDs manually.
- **Rebuild after surface edits.** Call `surface.Rebuild()` explicitly.
- **Check for duplicates before Add.** `PointGroups.Add()` throws on duplicate names.
- **StationOffset is XY-only.** Z component of input point is ignored.
- **DocumentLock required for writes.** `using (doc.LockDocument()) { ... }` for any modification.
- **All Civil API calls on main thread.** Civil 3D APIs are not thread-safe.

---

## Code Sleuthing with `rg`

```bash
# Find SDK samples covering a type
rg "TinSurface|CogoPoint|Alignment" "<ACAD_HOME>/C3D/Sample" --type cs -l

# See how a method is actually called
rg "FindElevationAtXY" "<ACAD_HOME>/C3D/Sample" --type cs -C 5

# Find all command entry points
rg "\[CommandMethod" "<ACAD_HOME>/C3D/Sample" --type cs -l

# Search Civil 3D source for API patterns (if available)
rg "DataShortcuts\." "D:\Civil3d\Source" --type cs -l
```
