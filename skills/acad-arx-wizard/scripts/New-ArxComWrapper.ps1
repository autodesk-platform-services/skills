<#
.SYNOPSIS
    Scaffolds an ATL COM wrapper object for an AutoCAD entity (.h + .cpp + .idl + .rgs).
    Equivalent to the ArxAtlWizComWrapper Visual Studio item wizard.

.PARAMETER ShortName
    Short identifier used to derive class/interface names (e.g. MyLine → IMyLine, CMyLine).

.PARAMETER ClassName
    ATL coclass name. Defaults to "C$ShortName".

.PARAMETER InterfaceName
    COM interface name. Defaults to "I$ShortName".

.PARAMETER CoClass
    COM coclass name. Defaults to ShortName.

.PARAMETER ConnectionPoints
    Generate connection point (event sink) stubs.

.PARAMETER InterfaceDual
    Use dual IDispatch interface (for scripting support).

.PARAMETER ProjectName
    Owning project name.

.PARAMETER OutputPath
    Folder to write the generated files into.

.EXAMPLE
    .\New-ArxComWrapper.ps1 -ShortName MyLine -ProjectName MyPlugin -OutputPath C:\Dev\MyPlugin
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $ShortName,
    [Parameter(Mandatory)][string] $OutputPath,
    [string] $ClassName       = '',
    [string] $InterfaceName   = '',
    [string] $CoClass         = '',
    [switch] $ConnectionPoints,
    [switch] $InterfaceDual,
    [string] $ProjectName     = 'MyProject'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
. "$scriptDir\Invoke-TemplateExpansion.ps1"

if ($ShortName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "ShortName '$ShortName' is not a valid C++ identifier."
}

if (-not $ClassName)     { $ClassName     = "C$ShortName" }
if (-not $InterfaceName) { $InterfaceName = "I$ShortName" }
if (-not $CoClass)       { $CoClass       = $ShortName }

$upperShort = $ShortName.ToUpper()
$safeName   = New-SafeName $ProjectName
$upperSafe  = $safeName.ToUpper()

$headerFile = "$ClassName.h"
$implFile   = "$ClassName.cpp"

# Generate GUIDs for interface and coclass
$interfaceIid  = [System.Guid]::NewGuid().ToString().ToUpper()
$coclassClsid  = [System.Guid]::NewGuid().ToString().ToUpper()
$libId         = [System.Guid]::NewGuid().ToString().ToUpper()

$viProgId = "$ProjectName.$ShortName"
$progId   = "$viProgId.1"

$symbols = @{
    SHORT_NAME                         = $ShortName
    UPPER_SHORT_NAME                   = $upperShort
    CLASS_NAME                         = $ClassName
    ARX_CLASS_NAME                     = $ClassName
    INTERFACE_NAME                     = $InterfaceName
    COCLASS                            = $CoClass
    HEADER_FILE                        = $headerFile
    IMPL_FILE                          = $implFile
    PROJECT_NAME                       = $ProjectName
    SAFE_PROJECT_NAME                  = $safeName
    UPPER_CASE_SAFE_PROJECT_NAME       = $upperSafe
    INTERFACE_IID                      = $interfaceIid
    CLSID_REGISTRY_FORMAT              = $coclassClsid
    LIBID_REGISTRY_FORMAT              = $libId
    VERSION_INDEPENDENT_PROGID         = $viProgId
    PROGID                             = $progId
    CONNECTION_POINTS                  = $ConnectionPoints.IsPresent
    INTERFACE_DUAL                     = $InterfaceDual.IsPresent
    AUTOMATION                         = $InterfaceDual.IsPresent
    ATTRIBUTED                         = $false
    DLL_APP                            = $true
    LIB_NAME                           = "${ProjectName}Lib"
    TYPELIB_VERSION_MAJOR              = '1'
    TYPELIB_VERSION_MINOR              = '0'

    DOTNET_MODULE                      = $false
    MFC_EXT_SHARED                     = $false
    APP_ARX_TYPE                       = $false
    ATL_COM_SERVER                     = $true
    STD_COM_SERVER                     = $true
}

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$templateDir = Join-Path $scriptDir "..\templates\com-wrapper"
Expand-TemplateFile "$templateDir\object.h"    (Join-Path $OutputPath $headerFile)        $symbols
Expand-TemplateFile "$templateDir\object.cpp"  (Join-Path $OutputPath $implFile)          $symbols
Expand-TemplateFile "$templateDir\object.rgs"  (Join-Path $OutputPath "$ClassName.rgs")   $symbols
Expand-TemplateFile "$templateDir\objco.idl"   (Join-Path $OutputPath "$ClassName.idl")   $symbols

if ($ConnectionPoints) {
    Expand-TemplateFile "$templateDir\connpt.h" (Join-Path $OutputPath "_${InterfaceName}Events_CP.h") $symbols
}

$vcxproj = Get-ChildItem -Path $OutputPath -Filter "*.vcxproj" | Select-Object -First 1
if ($vcxproj) {
    $hFiles = @($headerFile)
    if ($ConnectionPoints) { $hFiles += "_${InterfaceName}Events_CP.h" }
    Add-FilesToProject -ProjectPath $vcxproj.FullName -CppFiles @($implFile) -HeaderFiles $hFiles
}

Write-Host "Generated: $headerFile, $implFile, $ClassName.rgs, $ClassName.idl  →  $OutputPath"
Write-Host "Next: In Visual Studio → Project → Add Existing Item → select all generated files."
