<#
.SYNOPSIS
    Scaffolds a complete ObjectARX / ObjectDBX / CRX C++ project for AutoCAD 2027 / VS 2026.
    Equivalent to the ArxAppWiz Visual Studio wizard (.vsz), which is broken in VS 2026.

.DESCRIPTION
    Generates all source files and the .vcxproj into -OutputPath\-ProjectName\.
    Props files (Autodesk.arx-2027.props etc.) are copied alongside the project
    so the folder is self-contained with no ObjectARX SDK path assumption.

.PARAMETER ProjectName
    C++ project name. Used as the DLL base name and class prefix.
    Must be a valid C++ identifier (letters, digits, underscores; no leading digit).

.PARAMETER OutputPath
    Parent directory to create the project folder inside.
    The script creates: OutputPath\ProjectName\

.PARAMETER AppType
    arx  – AutoCAD ARX application  (links to acad.lib, has document reactor)
    dbx  – ObjectDBX application    (no AutoCAD UI dependency)
    crx  – Civil / Map CRX extension

.PARAMETER MfcMode
    none   – No MFC
    shared – MFC as a shared DLL   (UseOfMfc=Dynamic)
    ext    – MFC extension DLL     (UseOfMfc=Dynamic + _AFXEXT)

.PARAMETER UseAtl
    Include ATL COM server support (generates .idl and .rgs).

.PARAMETER UseDotNet
    Include CLR/.NET wrapper support (generates AssemblyInfo.cpp, sets CLRSupport=NetCore).

.PARAMETER RdsPrefix
    Three-letter Registered Developer Symbol prefix (e.g. "Adk").
    Defaults to "Adk".

.PARAMETER AcadVersion
    AutoCAD release year. Defaults to 2027.

.EXAMPLE
    .\New-ArxApp.ps1 -ProjectName MyPlugin -OutputPath C:\Dev -AppType arx -MfcMode shared

.EXAMPLE
    .\New-ArxApp.ps1 -ProjectName MyCOM -OutputPath C:\Dev -AppType arx -MfcMode shared -UseAtl -RdsPrefix "Abc"
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $ProjectName,
    [Parameter(Mandatory)][string] $OutputPath,
    [ValidateSet('arx','dbx','crx')][string] $AppType   = 'arx',
    [ValidateSet('none','shared','ext')][string] $MfcMode = 'none',
    [switch] $UseAtl,
    [switch] $UseDotNet,
    [string] $RdsPrefix    = 'Adk',
    [string] $AcadVersion  = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Load shared template engine
# ---------------------------------------------------------------------------
$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
. "$scriptDir\Invoke-TemplateExpansion.ps1"

# ---------------------------------------------------------------------------
# Auto-detect AcadVersion if not provided
# ---------------------------------------------------------------------------
if (-not $AcadVersion) {
    $availableProps = @(Get-ChildItem (Join-Path $scriptDir "..\props\Autodesk.arx-*.props") | 
                      Where-Object Name -notmatch '-net' | 
                      Sort-Object Name -Descending)

    if ($availableProps.Count -gt 0) {
        $AcadVersion = $availableProps[0].Name -replace 'Autodesk\.arx-(\d+)\.props', '$1'
    } else {
        $AcadVersion = '2027' # Fallback
    }
}

# ---------------------------------------------------------------------------
# Validate project name is a legal C++ identifier
# ---------------------------------------------------------------------------
if ($ProjectName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "ProjectName '$ProjectName' is not a valid C++ identifier. Use letters, digits, and underscores only; must not start with a digit."
}

# ---------------------------------------------------------------------------
# Derive symbols (mirrors ArxAppWiz\Scripts\1033\default.js  OnFinish logic)
# ---------------------------------------------------------------------------
$safeName      = New-SafeName $ProjectName
$upperSafe     = $safeName.ToUpper()
$rcFileName    = (New-SafeRCFileName $ProjectName) + '.rc'

# AppType booleans
$isArx = $AppType -eq 'arx'
$isDbx = $AppType -eq 'dbx'
$isCrx = $AppType -eq 'crx'

# MFC booleans
$mfcExtShared  = $MfcMode -eq 'ext'
$mfcRegShared  = $MfcMode -eq 'shared' -or $mfcExtShared
$mfcRegStatic  = $false   # static MFC not offered in this skill
$mfcSupport    = $mfcRegStatic -or $mfcRegShared
$noMfc         = -not $mfcSupport

# CLR
$dotNet        = $UseDotNet.IsPresent
$clrSupport    = if ($dotNet) { 'NetCore' } else { 'false' }

# Derive project type token (used by vcxproj <ArxAppType>)
$prjTypeApp = switch ($true) {
    ($isArx -and $dotNet) { 'arxnet' }
    ($isDbx -and $dotNet) { 'dbxnet' }
    ($isCrx -and $dotNet) { 'crxnet' }
    ($isArx)              { 'arx'    }
    ($isDbx)              { 'dbx'    }
    default               { 'crx'    }
}

$mfcSupportToken = if ($mfcSupport) { 'Dynamic' } else { 'false' }
$atlSupport      = if ($UseAtl) { 'Dynamic' } else { 'false' }

# COM / STD COM
$stdComServer = $UseAtl.IsPresent   # simplified: ATL → COM server
$atlComServer = $UseAtl.IsPresent

# DEBUG workaround symbol — always true (standard practice)
$implDebug = $mfcSupport -or $UseAtl.IsPresent

# APPID / LIBID GUIDs for COM templates
$appIdGuid  = [System.Guid]::NewGuid().ToString().ToUpper()
$libIdGuid  = [System.Guid]::NewGuid().ToString().ToUpper()
$compregGuid = [System.Guid]::NewGuid().ToString().ToUpper()

$symbols = @{
    # Core
    PROJECT_NAME                  = $ProjectName
    SAFE_PROJECT_NAME             = $safeName
    UPPER_CASE_PROJECT_NAME       = $ProjectName.ToUpper()
    UPPER_CASE_SAFE_PROJECT_NAME  = $upperSafe
    RC_FILE_NAME                  = $rcFileName
    RDS_SYMB                      = $RdsPrefix
    ACAD_VERSION                  = $AcadVersion

    # App type
    APP_ARX_TYPE                  = $isArx
    APP_DBX_TYPE                  = $isDbx
    APP_CRX_TYPE                  = $isCrx
    PRJ_TYPE_APP                  = $prjTypeApp

    # MFC
    MFC_REG_STATIC                = $mfcRegStatic
    MFC_REG_SHARED                = $mfcRegShared
    MFC_EXT_SHARED                = $mfcExtShared
    NO_MFC                        = $noMfc
    ARX_MFC_SUPPORT               = $mfcSupportToken

    # ATL / COM
    ATL_COM_SERVER                = $atlComServer
    STD_COM_SERVER                = $stdComServer
    ACAD_ATL_EXT                  = $UseAtl.IsPresent
    SUPPORT_COMPONENT_REGISTRAR   = $false
    ATTRIBUTED                    = $false
    ARX_ATL_SUPPORT               = $atlSupport

    # .NET
    DOTNET_MODULE                 = $dotNet
    ARX_CLR_SUPPORT               = $clrSupport

    # Misc / template flags
    IMPL_DEBUG                    = $implDebug
    ACDBOBJECT_PROTOCOLS          = $false
    SELF_REACTOR                  = $false

    # GUIDs (COM)
    APPID_REGISTRY_FORMAT         = $appIdGuid
    LIBID_REGISTRY_FORMAT         = $libIdGuid
    COMPREG_REGISTRY_FORMAT       = $compregGuid

    # IDD placeholder for dialogs (not used in ArxAppWiz but keeps engine happy)
    IDD_DIALOG                    = 'IDD_DIALOG1'
}

# ---------------------------------------------------------------------------
# Destination folder
# ---------------------------------------------------------------------------
$projectDir = Join-Path $OutputPath $ProjectName
if (Test-Path $projectDir) {
    throw "Destination already exists: $projectDir"
}
New-Item -ItemType Directory -Path $projectDir -Force | Out-Null
Write-Host "Creating project at: $projectDir"

# ---------------------------------------------------------------------------
# Template source folder
# ---------------------------------------------------------------------------
$templateDir = Join-Path $scriptDir "..\templates\arx-app"
$propsDir    = Join-Path $scriptDir "..\props"

# ---------------------------------------------------------------------------
# Determine which files to emit (mirrors Templates.inf logic)
# ---------------------------------------------------------------------------
# Core files always emitted
$coreFiles = @(
    'StdAfx.cpp'
    'StdAfx.h'
    'acrxEntryPoint.cpp'
    'Resource.h'
    'root.rc'
    'ReadMe.txt'
)

# root.cpp → renamed to <ProjectName>.cpp
# root.idl → renamed to <ProjectName>_i.idl  (COM only)
# root.rgs → renamed to <ProjectName>.rgs     (ATL only)

$conditionalFiles = @()
if ($dotNet) { $conditionalFiles += 'AssemblyInfo.cpp' }
if ($isArx -or $isCrx) {
    $conditionalFiles += 'DocData.cpp'
    $conditionalFiles += 'DocData.h'
}

# ---------------------------------------------------------------------------
# Helper: expand a template with the right destination filename
# ---------------------------------------------------------------------------
function Emit-Template([string]$templateName, [string]$destName) {
    $src  = Join-Path $templateDir $templateName
    $dest = Join-Path $projectDir  $destName
    Expand-TemplateFile -SourcePath $src -DestPath $dest -Symbols $symbols
}

# ---------------------------------------------------------------------------
# Emit core + conditional files
# ---------------------------------------------------------------------------
foreach ($f in $coreFiles + $conditionalFiles) {
    Emit-Template $f $f
}

# root.cpp → <ProjectName>.cpp
Emit-Template 'root.cpp' "$ProjectName.cpp"

# COM-only
if ($stdComServer -or $atlComServer) {
    Emit-Template 'root.idl' "$ProjectName.idl"
}
if ($atlComServer) {
    Emit-Template 'root.rgs' "$ProjectName.rgs"
}

# ---------------------------------------------------------------------------
# Emit .vcxproj  (rename from x64win32.vcxproj → <ProjectName>.vcxproj)
# and patch ProjectGuid to a fresh GUID so every project is unique
# ---------------------------------------------------------------------------
$vcxSrc      = Join-Path $templateDir 'x64win32.vcxproj'
$vcxContent  = Get-Content -Path $vcxSrc -Raw -Encoding UTF8
$vcxExpanded = Invoke-TemplateExpansion -TemplateContent $vcxContent -Symbols $symbols

# Replace the static placeholder GUID with a fresh one
$freshGuid   = [System.Guid]::NewGuid().ToString('B').ToUpper()
# Matches any existing GUID inside the ProjectGuid tag
$vcxExpanded = $vcxExpanded -replace '(?i)<ProjectGuid>\{[A-F0-9-]+\}</ProjectGuid>', "<ProjectGuid>{$freshGuid}</ProjectGuid>"

# ---------------------------------------------------------------------------
# Inject source-file ItemGroups (the template vcxproj has none — VS would
# normally add them via the wizard UI).  StdAfx.cpp gets /Yc (Create PCH),
# all other .cpp files get /Yu (Use PCH).
# ---------------------------------------------------------------------------
$clCompileItems = [System.Text.StringBuilder]::new()
[void]$clCompileItems.AppendLine('  <ItemGroup>')
# StdAfx.cpp — creates the PCH
[void]$clCompileItems.AppendLine('    <ClCompile Include="StdAfx.cpp">')
[void]$clCompileItems.AppendLine('      <PrecompiledHeader>Create</PrecompiledHeader>')
[void]$clCompileItems.AppendLine('    </ClCompile>')
# All other .cpp files — use the PCH
$otherCpp = @("acrxEntryPoint.cpp", "$ProjectName.cpp") +
            $(if ($isArx -or $isCrx) { @("DocData.cpp") } else { @() }) +
            $(if ($dotNet) { @("AssemblyInfo.cpp") } else { @() }) +
            $(if ($stdComServer -or $atlComServer) { @("$ProjectName.idl") } else { @() })
foreach ($f in $otherCpp) {
    if ($f -match '\.cpp$') {
        [void]$clCompileItems.AppendLine("    <ClCompile Include=`"$f`" />")
    }
}
[void]$clCompileItems.AppendLine('  </ItemGroup>')
[void]$clCompileItems.AppendLine('  <ItemGroup>')
[void]$clCompileItems.AppendLine('    <ClInclude Include="StdAfx.h" />')
[void]$clCompileItems.AppendLine('    <ClInclude Include="Resource.h" />')
if ($isArx -or $isCrx) {
    [void]$clCompileItems.AppendLine('    <ClInclude Include="DocData.h" />')
}
[void]$clCompileItems.AppendLine('  </ItemGroup>')
[void]$clCompileItems.AppendLine('  <ItemGroup>')
[void]$clCompileItems.AppendLine('    <ResourceCompile Include="root.rc" />')
[void]$clCompileItems.AppendLine('  </ItemGroup>')
if ($stdComServer -or $atlComServer) {
    [void]$clCompileItems.AppendLine('  <ItemGroup>')
    [void]$clCompileItems.AppendLine("    <Midl Include=`"$ProjectName.idl`" />")
    [void]$clCompileItems.AppendLine('  </ItemGroup>')
}
# Insert the ItemGroups just before </Project>
$vcxExpanded = $vcxExpanded -replace '(?s)(\s*</Project>\s*)$', "`n$($clCompileItems.ToString())`$1"

$vcxDest = Join-Path $projectDir "$ProjectName.vcxproj"
Set-Content -Path $vcxDest -Value $vcxExpanded -Encoding UTF8 -NoNewline
Write-Verbose "  Written: $vcxDest"

# ---------------------------------------------------------------------------
# Copy .props files into project folder (self-contained)
# ---------------------------------------------------------------------------
$propsFiles = @(
    "Autodesk.arx-$AcadVersion.props"
    "Autodesk.arx-$AcadVersion-net.props"
    'crx.props'
)
foreach ($pf in $propsFiles) {
    $psrc = Join-Path $propsDir $pf
    if (Test-Path $psrc) {
        Copy-Item $psrc (Join-Path $projectDir $pf) -Force
        Write-Verbose "  Copied:  $pf"
    }
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
$generated = Get-ChildItem -Path $projectDir | Select-Object -ExpandProperty Name
Write-Host ""
Write-Host "Done. Generated $($generated.Count) files in: $projectDir"
Write-Host ""
$generated | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open $ProjectName.vcxproj in Visual Studio 2026"
Write-Host "  2. Verify the ObjectARX SDK path in Autodesk.arx-$AcadVersion.props"
Write-Host "  3. Build -> x64 Debug"
