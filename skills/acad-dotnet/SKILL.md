---
name: acad-dotnet
description: "Scaffold and develop AutoCAD 2027 .NET plugins (AutoCAD, Civil 3D, Plant 3D) targeting .NET 10 / x64. Covers dotnet new templates, csproj patterns, bundle packaging, desktop NETLOAD testing, and Design Automation deployment."
argument-hint: "Target product and project name (e.g. 'create a Civil 3D plugin called AlignmentExporter', or 'package my AutoCAD plugin as a DA bundle')"
---

# Scaffold Skill — AutoCAD .NET Plugins

Agentic steps to create a new plugin project end-to-end. Execute these steps in order.
All csproj patterns here are verified against AutoCAD 2027 / .NET 10.

## Step 0 — Identify the target product

| User says | Target | Template | Extra packages |
|-----------|--------|----------|----------------|
| "AutoCAD plugin" / "acad add-in" | AutoCAD 2027 | `acad` | `AutoCAD.NET 26.0.0` |
| "Civil 3D plugin" / "c3d add-in" | Civil 3D 2027 | `civil` | `Civil3D.NET 13.9.628` |
| "Plant 3D plugin" / "plant add-in" | Plant 3D 2027 | *(manual)* | `AutoCAD.NET.Core 26.0.0` + SDK DLL refs |
| "Design Automation" / "DA" | Any (headless) | `acad` | Use `.Core` + `.Model` only (no AcMgd) |

---

## Step 1 — Scaffold

### AutoCAD

```bash
dotnet new acad -n <ProjectName> -o <ProjectName>
cd <ProjectName>
```

### Civil 3D

```bash
dotnet new civil --rootNamespace=<ProjectName> -o <ProjectName>
cd <ProjectName>
```

### Plant 3D (manual)

Create `<ProjectName>/<ProjectName>.csproj` — see Plant 3D section below.

---

## Step 2 — Fix csproj (CRITICAL)

Templates may generate outdated or incorrect settings. Apply all of these fixes:

### Target framework
If the template generated `net8.0-windows` or `net6.0-windows`, change to `net10.0-windows`.

### Platform target — x64 preferred over RuntimeIdentifier
```xml
<!-- WRONG for most plugins — creates RID subfolder, assembly won't load in AutoCAD -->
<RuntimeIdentifier>win-x64</RuntimeIdentifier>

<!-- CORRECT — outputs to bin\Debug\net10.0-windows\ (no RID subfolder) -->
<PlatformTarget>x64</PlatformTarget>
```

**Why:** AutoCAD probes for assemblies in the direct output folder. `RuntimeIdentifier` creates a `win-x64` subfolder that AutoCAD/accoreconsole doesn't search by default.
*Exception:* If you are importing cross-platform native NuGet packages (like Oracle or SQLite), you *do* need `<RuntimeIdentifier>win-x64</RuntimeIdentifier>` to fetch the correct windows binaries. In this rare case, also add `<AppendRuntimeIdentifierToOutputPath>false</AppendRuntimeIdentifierToOutputPath>` to your csproj to prevent the output from being pushed into an unreachable subfolder.

### GenerateTargetFrameworkAttribute
```xml
<GenerateTargetFrameworkAttribute>false</GenerateTargetFrameworkAttribute>
```

Prevents conflict with AutoCAD host's own TargetFramework attribute.

### Reference csproj template — DA / Civil 3D headless

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Library</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <PlatformTarget>x64</PlatformTarget>
    <RootNamespace>$(MSBuildProjectName)</RootNamespace>
    <Nullable>enable</Nullable>
    <GenerateTargetFrameworkAttribute>false</GenerateTargetFrameworkAttribute>
  </PropertyGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.WindowsDesktop.App" />
    <PackageReference Include="AutoCAD.NET.Core" Version="26.0.0" ExcludeAssets="runtime" />
    <PackageReference Include="AutoCAD.NET.Model" Version="26.0.0" ExcludeAssets="runtime" />
    <!-- Add Civil3D.NET for Civil 3D plugins -->
    <!-- <PackageReference Include="Civil3D.NET" Version="13.9.628" ExcludeAssets="runtime" /> -->
  </ItemGroup>
</Project>
```

### Reference csproj template — Desktop-only (with UI)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Library</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <PlatformTarget>x64</PlatformTarget>
    <RootNamespace>$(MSBuildProjectName)</RootNamespace>
    <Nullable>enable</Nullable>
    <GenerateTargetFrameworkAttribute>false</GenerateTargetFrameworkAttribute>
  </PropertyGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.WindowsDesktop.App" />
    <PackageReference Include="AutoCAD.NET" Version="26.0.0" ExcludeAssets="runtime" />
  </ItemGroup>
</Project>
```

### Plant 3D csproj

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Library</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <PlatformTarget>x64</PlatformTarget>
    <Nullable>enable</Nullable>
    <RootNamespace>$(MSBuildProjectName)</RootNamespace>
    <GenerateTargetFrameworkAttribute>false</GenerateTargetFrameworkAttribute>
  </PropertyGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.WindowsDesktop.App" />
    <PackageReference Include="AutoCAD.NET.Core" Version="26.0.0" ExcludeAssets="runtime" />
    <PackageReference Include="AutoCAD.NET.Model" Version="26.0.0" ExcludeAssets="runtime" />
  </ItemGroup>

  <!-- Plant 3D SDK — PLANT_SDK = path to inc-x64\ folder -->
  <!-- Download: https://aps.autodesk.com/developer/overview/autocad-plant-3d-objectarx-sdk-downloads -->
  <ItemGroup>
    <Reference Include="PnIDMgd">
      <HintPath>$(PLANT_SDK)\PnIDMgd.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="PnPDataLinks">
      <HintPath>$(PLANT_SDK)\PnPDataLinks.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="PnPDataObjects">
      <HintPath>$(PLANT_SDK)\PnPDataObjects.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="PnPProjectManagerMgd">
      <HintPath>$(PLANT_SDK)\PnPProjectManagerMgd.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="PnPCommonMgd">
      <HintPath>$(PLANT_SDK)\PnPCommonMgd.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="PnPCommonDbxMgd">
      <HintPath>$(PLANT_SDK)\PnPCommonDbxMgd.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="PnIdProjectPartsMgd">
      <HintPath>$(PLANT_SDK)\PnIdProjectPartsMgd.dll</HintPath>
      <Private>false</Private>
    </Reference>
  </ItemGroup>
</Project>
```

Set `PLANT_SDK` via `Directory.Build.props`:

```xml
<!-- Directory.Build.props (repo root) -->
<Project>
  <PropertyGroup>
    <PLANT_SDK Condition="'$(PLANT_SDK)'==''">D:\SDKS\Plant2027\inc-x64</PLANT_SDK>
  </PropertyGroup>
</Project>
```

---

## Step 3 — Entry point boilerplate

Create `App.cs` (or verify template generated it):

```csharp
using Autodesk.AutoCAD.Runtime;

[assembly: ExtensionApplication(typeof(<ProjectName>.App))]
[assembly: CommandClass(typeof(<ProjectName>.Commands))]

namespace <ProjectName>;

public class App : IExtensionApplication
{
    public void Initialize() { }
    public void Terminate() { }
}
```

---

## Step 4 — Add launchSettings.json

Create `Properties/launchSettings.json`. Replace `<ACAD_HOME>` with the AutoCAD install path.

### AutoCAD

```json
{
  "profiles": {
    "<ProjectName>": { "commandName": "Project" },
    "AutoCAD2027": {
      "commandName": "Executable",
      "executablePath": "<ACAD_HOME>\\acad.exe"
    }
  }
}
```

### Civil 3D

```json
{
  "profiles": {
    "<ProjectName>": { "commandName": "Project" },
    "C3D2027_Metric": {
      "commandName": "Executable",
      "executablePath": "<ACAD_HOME>\\acad.exe",
      "commandLineArgs": "/ld \"<ACAD_HOME>\\AecBase.dbx\" /p \"<<C3D_Metric>>\" /product C3D /language en-US"
    },
    "C3D2027_Imperial": {
      "commandName": "Executable",
      "executablePath": "<ACAD_HOME>\\acad.exe",
      "commandLineArgs": "/ld \"<ACAD_HOME>\\AecBase.dbx\" /p \"<<C3D_Imperial>>\" /product C3D /language en-US"
    }
  }
}
```

### Plant 3D

```json
{
  "profiles": {
    "<ProjectName>": { "commandName": "Project" },
    "Plant3D2027": {
      "commandName": "Executable",
      "executablePath": "<ACAD_HOME>\\acad.exe",
      "commandLineArgs": "/product PLNT3D /language \"en-US\""
    }
  }
}
```

---

## Step 5 — Build and load

```bash
dotnet build -c Debug
```

Output: `bin\Debug\net10.0-windows\<ProjectName>.dll`

**Desktop:** In AutoCAD, use `NETLOAD` to load the DLL (see Step 5a).
**accoreconsole:** Use `.scr` script with `SECURELOAD 0` then `NETLOAD`, or use `/al` (see Step 6).

---

## Step 5a — Desktop UI testing (NETLOAD)

### First-time load

1. Launch AutoCAD (or Civil 3D / Plant 3D) via the launchSettings profile or directly
2. At the command line: `NETLOAD`
3. Browse to `bin\Debug\net10.0-windows\<ProjectName>.dll`
4. Run your command (e.g., `MYCOMMAND`)

### SECURELOAD handling

AutoCAD defaults to `SECURELOAD=1` which blocks DLLs from untrusted paths. Options:

| Approach | When to use |
|----------|-------------|
| `SECURELOAD 0` at command line | Quick one-off testing — reset per session |
| `TRUSTEDPATHS` sysvar | Add your build output folder to the trusted list (persists in registry) |
| `TRUSTEDLOCATIONS` dialog | UI version of TRUSTEDPATHS — Settings > Files > Trusted Locations |

To add a trusted path programmatically:
```
TRUSTEDPATHS
```
Append `;C:\your\build\output\path` to the existing value.

### Auto-load on startup (without ApplicationPlugins bundle)

For repeated testing, avoid typing NETLOAD every launch. Add to the Startup Suite:

1. `APPLOAD` command
2. Click "Contents..." under Startup Suite
3. Add your DLL

Or use `acad.lsp` / `acaddoc.lsp` in the support path:
```lisp
;; acaddoc.lsp — runs on every document open
(command "NETLOAD" "C:\\path\\to\\Plugin.dll")
```

### Debugging with Visual Studio / VS Code

With `launchSettings.json` configured (Step 4):

1. Set breakpoints in your code
2. Start debugging (F5) — AutoCAD launches with the selected profile
3. In AutoCAD: `NETLOAD` your DLL, then run your command
4. Breakpoints hit in VS

For attach-to-process (when AutoCAD is already running):
- Debug > Attach to Process > select `acad.exe`

---

## Step 6 — Local testing with accoreconsole (headless)

### Method A: NETLOAD via script

Create a `.scr` script file:
```
SECURELOAD
0
NETLOAD
C:\full\path\to\Plugin.dll
MYCOMMAND
```

Launch:
```
accoreconsole.exe /i "drawing.dwg" /s "test.scr" /ld "AecBase.dbx" /product C3D /language en-US
```

### Method B: /al with .bundle (recommended)

Matches DA behavior more closely. Create a bundle folder structure:

```
TestBundle/
  <ProjectName>.bundle/
    PackageContents.xml
    Contents/
      <ProjectName>.dll
      <ProjectName>.deps.json
```

The `.scr` only needs the command (no SECURELOAD/NETLOAD):
```
MYCOMMAND
```

Launch:
```
accoreconsole.exe /i "drawing.dwg" /al "TestBundle" /s "test.scr" /isolate user1 "D:\Tmp" /ld "AecBase.dbx" /product C3D /language en-US
```

Rules:
- `/al` points to the **parent** of the `.bundle` folder
- **Always use `/isolate`** to prevent registry writes into your working directory
- See `autocad-api.md` for full flag reference.

---

## Step 7 — ApplicationPlugins Bundle (desktop auto-load)

For desktop deployment (not DA), place a `.bundle` folder in one of these paths:

| Path | Scope | Requires admin |
|------|-------|----------------|
| `%APPDATA%\Autodesk\ApplicationPlugins\` | Current user | No |
| `C:\Program Files\Autodesk\ApplicationPlugins\` | All users | Yes |

AutoCAD scans these on startup and loads any `.bundle` with a valid `PackageContents.xml`.

### Minimal bundle for a .NET plugin

```
%APPDATA%\Autodesk\ApplicationPlugins\
  <ProjectName>.bundle/
    PackageContents.xml
    Contents/
      <ProjectName>.dll
      <ProjectName>.deps.json
```

### PackageContents.xml with command registration

```xml
<?xml version="1.0" encoding="utf-8" ?>
<ApplicationPackage SchemaVersion="1.0" Version="1.0.0"
  ProductCode="{generate-new-guid}"
  Name="<ProjectName>"
  Description="..."
  Author="...">
  <CompanyDetails Name="..." Url="..." Email="..." />
  <RuntimeRequirements
    Platform="AutoCAD"
    SeriesMin="R26.0" SeriesMax="R26.0"
    OS="Win64" />
  <Components Description="plugin">
    <RuntimeRequirements
      SupportPath="./Contents"
      Platform="AutoCAD"
      SeriesMin="R26.0" SeriesMax="R26.0"
      OS="Win64" />
    <ComponentEntry
      AppName="<ProjectName>"
      AppType=".NET"
      Version="1.0.0"
      ModuleName="./Contents/<ProjectName>.dll"
      AppDescription="..."
      LoadOnAutoCADStartup="True"
      LoadOnCommandInvocation="False">
      <Commands GroupName="<ProjectName>_Commands">
        <Command Local="MYCOMMAND" Global="MYCOMMAND" />
      </Commands>
    </ComponentEntry>
  </Components>
</ApplicationPackage>
```

Key attributes:
- `Platform`: `AutoCAD` (base), `Civil3D`, `Plant3D`, or pipe-delimited `AutoCAD|Civil3D`
- `SeriesMin/SeriesMax`: `R26.0` = 2027, `R25.1` = 2026, `R25.0` = 2025
- `LoadOnAutoCADStartup="True"`: loads DLL immediately on startup
- `LoadOnCommandInvocation="True"` + `LoadOnAutoCADStartup="False"`: deferred load (only when command is invoked)
- `SupportPath="./Contents"`: adds Contents folder to AutoCAD's support file search path
- `<Commands>`: registers commands so AutoCAD knows which bundle to load on demand

### Build script to deploy bundle locally

```powershell
$BundleName = "<ProjectName>"
$BuildOut = "bin\Debug\net10.0-windows"
$BundleDest = "$env:APPDATA\Autodesk\ApplicationPlugins\$BundleName.bundle"

# Create bundle structure
New-Item "$BundleDest\Contents" -ItemType Directory -Force | Out-Null
Copy-Item "PackageContents.xml" "$BundleDest\" -Force
Copy-Item "$BuildOut\$BundleName.dll" "$BundleDest\Contents\" -Force
Copy-Item "$BuildOut\$BundleName.deps.json" "$BundleDest\Contents\" -Force

Write-Host "Deployed to: $BundleDest"
```

Restart AutoCAD after deploying. The bundle loads automatically.

---

## Step 8 — DA Bundle Packaging

### PackageContents.xml

```xml
<?xml version="1.0" encoding="utf-8" ?>
<ApplicationPackage SchemaVersion="1.0" Version="1.0.0"
  ProductCode="{generate-new-guid}"
  Name="<ProjectName>"
  Description="..."
  Author="...">
  <CompanyDetails Name="..." Url="..." Email="..." />
  <Components Description="plugin">
    <RuntimeRequirements
      SeriesMin="R26.0" SeriesMax="R26.0"
      Platform="AutoCAD"
      OS="Win64" />
    <ComponentEntry
      AppName="<ProjectName>"
      Version="1.0.0"
      ModuleName="./Contents/<ProjectName>.dll"
      AppDescription="..."
      LoadOnAutoCADStartup="True"
      LoadOnCommandInvocation="False" />
  </Components>
</ApplicationPackage>
```

**SeriesMin/SeriesMax:** `R26.0` = AutoCAD 2027. Must match the DA engine version.

### Bundle folder structure

```
<ProjectName>.bundle/
  PackageContents.xml
  Contents/
    <ProjectName>.dll
    <ProjectName>.deps.json
```

### Zip correctly (CRITICAL)

```powershell
# CORRECT — bundle folder is zip root
Compress-Archive -Path "$ProjectName.bundle" -DestinationPath "$ProjectName.zip"

# WRONG — puts PackageContents.xml at zip root; bundle silently not loaded
Compress-Archive -Path "$ProjectName.bundle\*" -DestinationPath "$ProjectName.zip"
```

### DA Activity commandLine

```
$(engine.path)\accoreconsole.exe /i "$(args[inputFile].path)" /al "$(appbundles[<BundleName>].path)" /s "$(settings[script].path)"
```

- `/al` loads a .bundle from a parent folder (see below for local usage)
- `/s` passes the script with command invocations

### Using /al locally with accoreconsole (undocumented)

`/al` works in desktop accoreconsole too -- it is just not in the official docs. The argument is the **parent folder** containing the `.bundle` directory:

```
TestFolder/
  MyPlugin.bundle/
    PackageContents.xml
    Contents/
      MyPlugin.dll
```

Launch:
```
accoreconsole.exe /i "drawing.dwg" /al "D:\TestFolder" /s "test.scr" /isolate user1 "D:\Tmp"
```

Rules:
- `/al` points to the **parent** of the `.bundle` folder, not the bundle itself
- **Always use `/isolate`** -- without it, `/al` writes registry entries into the parent folder which pollute your working directory
- `/isolate user1 <tempDir>` redirects those registry writes to a temp directory
- The `.scr` script does NOT need `SECURELOAD 0` or `NETLOAD` when using `/al` -- the bundle is loaded automatically

### DA Engine IDs (use `+` not `.`)

| Product | Engine ID |
|---------|-----------|
| AutoCAD 2027 | `Autodesk.AutoCAD+26_0` |
| AutoCAD 2026 | `Autodesk.AutoCAD+25_1` |
| AutoCAD 2025 | `Autodesk.AutoCAD+25_0` |

---

## Verified Build Output Path

After `dotnet build -c Debug` with the correct csproj settings:
```
bin\Debug\net10.0-windows\<ProjectName>.dll     ← load this
bin\Debug\net10.0-windows\<ProjectName>.deps.json
bin\Debug\net10.0-windows\<ProjectName>.pdb
```

If you see `bin\Debug\net10.0-windows\win-x64\` subfolder, you have `RuntimeIdentifier` in your csproj without the proper overrides. Remove it and use `PlatformTarget`, or set `<AppendRuntimeIdentifierToOutputPath>false</AppendRuntimeIdentifierToOutputPath>`.
