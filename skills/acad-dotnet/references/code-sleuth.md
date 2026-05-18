# Code Sleuth — Finding SDK Samples & API References

When writing plugin code, check SDK samples and enumerate live API objects before generating from scratch.

## The Super Tool: `rg` (ripgrep)

Before running any `rg` command, verify it is available:

```bash
rg --version
```

If missing, prompt the user to install via `winget`:

```bash
winget install BurntSushi.ripgrep.MSVC
```

After install, restart the terminal session so `rg` is on `PATH`.

---

`rg` is the fastest way to find usage patterns across SDK samples and existing codebases.

```bash
# Find all usages of a class in SDK samples
rg "DataLinksManager" /path/to/sdk/samples

# Find method signatures
rg "dlm\.GetRelatedRowIds" --type cs

# Find namespace declarations (locate which DLL a type lives in)
rg "namespace Autodesk\.ProcessPower" --type cs -l

# Case-insensitive, with context
rg -i "cogopoint" --type cs -C 3

# Search only in .csproj for package references
rg "PackageReference" --glob "*.csproj"

# Find all CommandMethod usages
rg "\[CommandMethod" --type cs
```

Use `rg` over IDE search when working outside Visual Studio or when searching large SDK trees.

---

## Online API References

| Resource | URL |
|----------|-----|
| AutoCAD .NET Developer's Guide (2027) | https://help.autodesk.com/view/OARX/2027/ENU/ |
| Civil 3D .NET API Reference (2027) | https://help.autodesk.com/view/CIV3D/2027/ENU/ |
| Plant 3D SDK download | https://aps.autodesk.com/developer/overview/autocad-plant-3d-objectarx-sdk-downloads |
| AutoCAD NuGet (`AutoCAD.NET`) | https://www.nuget.org/packages/AutoCAD.NET |
| Civil 3D NuGet (`Civil3D.NET`) | https://www.nuget.org/packages/Civil3D.NET |

---

## NuGet Package XML Docs

Intellisense XML docs ship with every NuGet package. Grep them directly:

```bash
rg "DataLinksManager" ~/.nuget/packages/autocad.net/ --type xml -l
```

---

## Runtime Discovery Patterns

When docs are sparse, enumerate live objects inside a running AutoCAD command.

### Discover Plant3D table columns

```csharp
foreach (PnPTable t in pnpDb.Tables)
{
    ed.WriteMessage($"\nTable: {t.Name}");
    foreach (var col in t.Columns)
        ed.WriteMessage($"  col: {col.Name}");
}
```

### Discover Plant3D relationships

```csharp
foreach (PnPRelationshipType rt in pnpDb.RelationshipTypes)
{
    ed.WriteMessage($"\nRel: {rt.Name}");
    foreach (PnPRoleType role in rt.RoleTypes)
        ed.WriteMessage($"  role: {role.Name}");
}
```

### Identify unknown entity type at an ObjectId

```csharp
var ent = tr.GetObject(id, OpenMode.ForRead);
ed.WriteMessage($"\nType: {ent.GetType().FullName}  Assembly: {ent.GetType().Assembly.GetName().Name}");
```

### Dump all properties on a Plant3D row

```csharp
string cls  = dlm.GetObjectClassname(rowId);
PnPTable tbl = pnpDb.Tables[cls];
PnPRow   row = tbl.Select($"PnPID={rowId}")[0];
foreach (var col in tbl.Columns)
    ed.WriteMessage($"\n  {col.Name} = {row[col.Name]}");
```
