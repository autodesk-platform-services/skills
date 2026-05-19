# AutoCAD .NET API — Patterns & Verified Facts

Everything here is verified against AutoCAD 2027 (`26.0.0`). Use this file as ground truth when generating plugin code.

## Assembly → DLL → Namespace Map

This is the critical mapping. Getting it wrong causes `Unable to load assembly` at runtime.

| DLL | NuGet source | Loaded by | Key namespaces |
|-----|-------------|-----------|----------------|
| `AcCoreMgd.dll` | `AutoCAD.NET.Core` | accoreconsole + acad.exe | `Autodesk.AutoCAD.ApplicationServices.Core`, `Autodesk.AutoCAD.EditorInput`, `Autodesk.AutoCAD.Runtime` |
| `AcDbMgd.dll` | `AutoCAD.NET.Model` | accoreconsole + acad.exe | `Autodesk.AutoCAD.DatabaseServices`, `Autodesk.AutoCAD.Geometry`, `Autodesk.AutoCAD.PlottingServices` |
| `AcMgd.dll` | `AutoCAD.NET` (full desktop) | **acad.exe ONLY** | `Autodesk.AutoCAD.ApplicationServices` (non-Core overloads), WPF/WinForms UI |

**Rule:** If your plugin must run in accoreconsole or Design Automation, do NOT reference `AcMgd.dll`. Use only `AcCoreMgd` + `AcDbMgd`.

### How to verify after build

```powershell
$asm = [System.Reflection.Assembly]::LoadFile("path\to\Plugin.dll")
$asm.GetReferencedAssemblies() | ForEach-Object { $_.Name }
# Must NOT contain "acmgd" for DA/headless plugins
```

## NuGet Packages (2027)

| Package | Version | Contains | Use for |
|---------|---------|----------|---------|
| `AutoCAD.NET.Core` | 26.0.0 | `AcCoreMgd.dll` | DA, headless, vertical toolset base |
| `AutoCAD.NET.Model` | 26.0.0 | `AcDbMgd.dll`, `acdbmgdbrep.dll` | Database/entity access (Core-safe) |
| `AutoCAD.NET` | 26.0.0 | `AcMgd.dll` + Core + Model | Desktop-only plugins with UI |

All packages: `ExcludeAssets="runtime"` — AutoCAD loads assemblies from its install directory. Never copy them to output.

## When to use Core vs Full

| Scenario | Packages | Avoid |
|----------|----------|-------|
| Desktop plugin (NETLOAD in acad.exe) | `AutoCAD.NET 26.0.0` | — |
| Design Automation (cloud/headless) | `AutoCAD.NET.Core` + `AutoCAD.NET.Model` | `AutoCAD.NET` (has AcMgd) |
| Vertical toolset (Civil/Plant) | `AutoCAD.NET.Core` + `AutoCAD.NET.Model` | `AutoCAD.NET` |
| accoreconsole local testing | `AutoCAD.NET.Core` + `AutoCAD.NET.Model` | `AutoCAD.NET` |

## ApplicationServices: Core vs Desktop

```csharp
// CORRECT for DA / accoreconsole — uses Core namespace
using Autodesk.AutoCAD.ApplicationServices.Core;
Application.DocumentManager.MdiActiveDocument;  // works in Core

// WRONG for DA — this pulls from AcMgd.dll
using Autodesk.AutoCAD.ApplicationServices;     // desktop-only overloads
```

Always import `Autodesk.AutoCAD.ApplicationServices.Core` explicitly. If you also need `Autodesk.AutoCAD.ApplicationServices` for `Document` type, import both — the Core one takes priority for `Application`.

## Plotting API (Verified Signatures)

These are the exact correct calls. All alternatives found in old docs/samples are wrong for 2027.

```csharp
using Autodesk.AutoCAD.PlottingServices;
using Autodesk.AutoCAD.DatabaseServices;

// PlotSettingsValidator — use static .Current, NOT constructor
var psValidator = PlotSettingsValidator.Current;  // CORRECT
// var psValidator = new PlotSettingsValidator();  // WRONG: no parameterless constructor

// MatchingPolicy — use MatchEnabled, NOT BestMatch
plotInfoValidator.MediaMatchingPolicy = MatchingPolicy.MatchEnabled;  // CORRECT
// plotInfoValidator.MediaMatchingPolicy = MatchingPolicy.BestMatch;  // WRONG: doesn't exist

// BeginPage argument order: (PlotPageInfo, PlotInfo, bool, string)
var pageInfo = new PlotPageInfo();
plotEngine.BeginPage(pageInfo, plotInfo, true, null);  // CORRECT
// plotEngine.BeginPage(plotInfo, pageInfo, true, null);  // WRONG: arg order reversed

// PlotFactory — use CreatePublishEngine for PDF output
using var plotEngine = PlotFactory.CreatePublishEngine();
```

### Complete PDF Plot Pattern

```csharp
private static void PlotToPdf(Database db, Editor ed, string outputPdf)
{
    using var tr = db.TransactionManager.StartTransaction();
    var layoutMgr = LayoutManager.Current;
    var layout = tr.GetObject(layoutMgr.GetLayoutId(layoutMgr.CurrentLayout),
        OpenMode.ForRead) as Layout;

    var plotInfo = new PlotInfo { Layout = layout.ObjectId };
    var plotInfoValidator = new PlotInfoValidator();
    plotInfoValidator.MediaMatchingPolicy = MatchingPolicy.MatchEnabled;

    var ps = new PlotSettings(layout.ModelType);
    ps.CopyFrom(layout);

    var psValidator = PlotSettingsValidator.Current;
    psValidator.SetPlotConfigurationName(ps, "AutoCAD PDF (General Documentation).pc3", null);
    psValidator.SetPlotType(ps, Autodesk.AutoCAD.DatabaseServices.PlotType.Extents);
    psValidator.SetUseStandardScale(ps, true);
    psValidator.SetStdScaleType(ps, StdScaleType.ScaleToFit);
    psValidator.SetPlotCentered(ps, true);

    plotInfo.OverrideSettings = ps;
    plotInfoValidator.Validate(plotInfo);

    using var plotEngine = PlotFactory.CreatePublishEngine();
    using var dlg = new PlotProgressDialog(false, 1, true);
    dlg.set_PlotMsgString(PlotMessageIndex.DialogTitle, "Plot");
    dlg.set_PlotMsgString(PlotMessageIndex.SheetName, layout.LayoutName);
    dlg.LowerPlotProgressRange = 0;
    dlg.UpperPlotProgressRange = 100;
    dlg.OnBeginPlot();
    dlg.IsVisible = false;

    var pageInfo = new PlotPageInfo();
    plotEngine.BeginPlot(dlg, null);
    plotEngine.BeginDocument(plotInfo, db.Filename, null, 1, true, outputPdf);
    plotEngine.BeginPage(pageInfo, plotInfo, true, null);
    plotEngine.BeginGenerateGraphics(null);
    plotEngine.EndGenerateGraphics(null);
    plotEngine.EndPage(null);
    plotEngine.EndDocument(null);
    plotEngine.EndPlot(null);
    dlg.OnEndPlot();
    tr.Commit();
}
```

## accoreconsole Local Testing

Launch command for Civil 3D product:
```
accoreconsole.exe /i "drawing.dwg" /s "script.scr" /ld "AecBase.dbx" /product C3D /language en-US
```

| Flag | Purpose | Notes |
|------|---------|-------|
| `/i` | Input drawing | Required |
| `/s` | Script file (.scr) | Contains commands, one per line |
| `/ld` | Load DBX on startup | Use `AecBase.dbx` for Civil 3D vertical |
| `/product` | Product key | `C3D` for Civil 3D, `PLNT3D` for Plant 3D |
| `/language` | Locale | `en-US` |
| `/p` | Profile name | `<<C3D_Metric>>` / `<<C3D_Imperial>>` — **only works if profile exists**; omit for default |
| `/al` | AppBundle load | Loads `.bundle` from parent folder. Undocumented but works locally. Always pair with `/isolate` (see below) |

### Script file (.scr) for NETLOAD

```
SECURELOAD
0
NETLOAD
C:\path\to\Plugin.dll
MYCOMMAND
```

`SECURELOAD` defaults to `1` and blocks loading from untrusted paths. Set to `0` before NETLOAD. When using `/al`, SECURELOAD/NETLOAD are not needed -- the bundle loads automatically.

### Using /al locally (undocumented but works)

`/al` is not in the official docs but works in desktop accoreconsole. It expects the **parent folder** containing the `.bundle` directory:

```
ParentFolder/
  MyPlugin.bundle/
    PackageContents.xml
    Contents/
      MyPlugin.dll
```

```
accoreconsole.exe /i "drawing.dwg" /al "D:\ParentFolder" /s "test.scr" /isolate user1 "D:\Tmp"
```

**Always use `/isolate`** when using `/al` locally. Without it, `/al` writes registry additions into the parent folder. `/isolate user1 <tempDir>` redirects those writes to a disposable temp directory.

## Common Gotchas

| Problem | Symptom | Fix |
|---------|---------|-----|
| Referenced `AutoCAD.NET` (full) in DA plugin | `Unable to load assembly` in accoreconsole | Use `AutoCAD.NET.Core` + `AutoCAD.NET.Model` only |
| `RuntimeIdentifier` in csproj | `Unable to load assembly` — RID subfolder not probed | Use `<PlatformTarget>x64</PlatformTarget>` instead, unless explicitly pulling native dependencies like Oracle. If required, use `<AppendRuntimeIdentifierToOutputPath>false</AppendRuntimeIdentifierToOutputPath>`. |
| `PlotSettingsValidator` constructor | Compile error — no parameterless ctor | Use `PlotSettingsValidator.Current` |
| `MatchingPolicy.BestMatch` | Compile error — member doesn't exist | Use `MatchingPolicy.MatchEnabled` |
| `BeginPage(PlotInfo, PlotPageInfo, ...)` | Compile error — wrong arg order | `BeginPage(PlotPageInfo, PlotInfo, ...)` |
| `SECURELOAD=1` blocks NETLOAD | `Unable to load assembly` in accoreconsole | Add `SECURELOAD 0` to .scr before NETLOAD |
| `Entity` ambiguous (AutoCAD vs Civil) | Compile error with Civil 3D projects | `using CivilEntity = Autodesk.Civil.DatabaseServices.Entity;` |
| `Dictionary` / `List` not found | `System.Collections.Generic` shadowed by AutoCAD namespace | Use `System.Collections.Generic.Dictionary<K,V>` fully qualified |
| `GenerateTargetFrameworkAttribute` clash | Build error with host-loaded plugins | Add `<GenerateTargetFrameworkAttribute>false</GenerateTargetFrameworkAttribute>` |

## Official Docs & API Guides

| Resource | Link |
|----------|------|
| Developer Portal (home) | https://help.autodesk.com/view/OARX/2027/ENU/ |
| Managed .NET Developer's Guide | https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-C3F3C736-40CF-44A0-9210-55F6A939B6F2 |
| Managed .NET API Reference | https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-B1C7E6C8-C90E-4E55-BEB7-B8D08FFE8B21 |
| NuGet: `AutoCAD.NET` | https://www.nuget.org/packages/AutoCAD.NET |
| ObjectARX SDK Download | https://www.autodesk.com/developer-network/platform-technologies/autocad/objectarx |

### .NET Developer's Guide — Category Deep Links

These link directly into the guide sections with code examples. Use them to look up patterns before inventing API usage.

**Fundamentals**
- [About .NET and the AutoCAD .NET API](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-4E1AAFA9-740E-4097-800C-CAED09CDFF12)
- [Getting Started with Visual Studio](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-71683E52-850F-434E-AD8C-3DB20BCBAD14)

**Basics**
- [Basics of the AutoCAD .NET API](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-79A4A44C-DF4C-46CC-B05C-311C8BD226C2) — object hierarchy, collections, properties, methods
- [Control the AutoCAD Environment](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-B9D5DD07-846E-418F-A346-0CEB35E724F7) — application/document windows, open/save/close, DocumentLock, system variables, user prompts, command line
- [Create and Edit AutoCAD Entities](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-F5601807-2FA9-486F-A212-E693D452D81F) — open/close objects, selection sets, layers/colors/linetypes, text
- [Dimensions and Tolerances](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-EE3C2664-3C9F-4702-96AB-CCE5C71C43D9)

**Intermediate**
- [Work in 3D Space](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-2529789F-5C69-4457-A161-CB9AF2133920) — UCS, 3D objects, 3D editing, solids
- [Advanced Drawing & Organization](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-CD733E01-7E42-45E8-AAC9-63B6EC39FF4E) — raster images, blocks/attributes, external references (XRefs), extended data (XData)
- [Define Layouts and Plot](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-0A29EBB7-C010-4C4E-A712-334731DADAB4) — layouts, model/paper space, viewports, plot settings, page setups, plotting, publishing
- [Use Events](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-61F01DC0-F385-43A2-8040-140C051B171E) — application/document/object events, COM events
- [Develop Applications](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-80B7C7EA-0CDC-488D-B10F-783302234998) — error handling, distribution, security
- [Customize User Interface (CUI)](https://help.autodesk.com/view/OARX/2027/ENU/?guid=GUID-71554E76-8FD5-4853-82CD-3587764CBCAC) — CUI Managed API, menus, macros

**When to use the guide:** Before writing any code for a category you haven't used before (plotting, XRefs, events, CUI, etc.), check the relevant guide section first — it has working C# examples.

---

## Autodesk Help MCP Server (AI-Assisted Doc Lookup)

The Autodesk Help MCP server lets AI agents search 110+ Autodesk product docs in real time. If installed, the agent can call `search_help_content` and `get_available_products` tools to retrieve official documentation without web browsing.

**Endpoint:** `https://developer.api.autodesk.com/knowledge/public/v1/mcp`

### VS Code / Cursor Setup

Add to `.vscode/mcp.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "autodesk-product-help": {
      "url": "https://developer.api.autodesk.com/knowledge/public/v1/mcp"
    }
  }
}
```

### Claude Desktop Setup

Add to `%APPDATA%/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "autodesk-product-help": {
      "command": "npx",
      "args": ["mcp-remote", "https://developer.api.autodesk.com/knowledge/public/v1/mcp"]
    }
  }
}
```

### Example Prompts (when MCP is connected)

- `"Search help content for 'plot to PDF' in AutoCAD 2027 in English"`
- `"Search help content for 'external references' in AutoCAD 2027 in en_US"`
- `"List available products"` — discover exact product/version strings

**More info:** https://help.autodesk.com/view/ADSKMCP/ENU/?guid=ADSKMCP_KnowledgeMcp_autodesk_product_help_mcp_server_html
