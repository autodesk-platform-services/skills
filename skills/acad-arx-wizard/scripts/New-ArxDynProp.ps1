<#
.SYNOPSIS
    Scaffolds an ATL dynamic property class for an AutoCAD entity (.h + .cpp + .idl + .rgs).
    Equivalent to the ArxAtlWizDynProp Visual Studio item wizard.

.PARAMETER ClassName
    Name for the dynamic property class (e.g. CMyDynProp).

.PARAMETER InterfaceName
    COM interface name for the property (e.g. IMyDynProp).

.PARAMETER ConnectionPoints
    Generate connection point (event sink) stubs.

.PARAMETER ProjectName
    Owning project name.

.PARAMETER OutputPath
    Folder to write the generated files into.

.EXAMPLE
    .\New-ArxDynProp.ps1 -ClassName CMyDynProp -InterfaceName IMyDynProp `
        -ProjectName MyPlugin -OutputPath C:\Dev\MyPlugin
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $ClassName,
    [Parameter(Mandatory)][string] $OutputPath,
    [string] $InterfaceName   = '',
    [switch] $ConnectionPoints,
    [string] $ProjectName     = 'MyProject'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
. "$scriptDir\Invoke-TemplateExpansion.ps1"

if ($ClassName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "ClassName '$ClassName' is not a valid C++ identifier."
}

if (-not $InterfaceName) { $InterfaceName = "I$($ClassName.TrimStart('C'))" }

$safeName  = New-SafeName $ProjectName
$upperSafe = $safeName.ToUpper()

$headerFile = "$ClassName.h"
$implFile   = "$ClassName.cpp"

$interfaceIid = [System.Guid]::NewGuid().ToString().ToUpper()
$coclassClsid = [System.Guid]::NewGuid().ToString().ToUpper()
$libId        = [System.Guid]::NewGuid().ToString().ToUpper()

$symbols = @{
    CLASS_NAME                   = $ClassName
    COCLASS                      = $ClassName.TrimStart('C')
    INTERFACE_NAME               = $InterfaceName
    HEADER_FILE                  = $headerFile
    IMPL_FILE                    = $implFile
    PROJECT_NAME                 = $ProjectName
    SAFE_PROJECT_NAME            = $safeName
    UPPER_CASE_SAFE_PROJECT_NAME = $upperSafe
    INTERFACE_IID                = $interfaceIid
    CLSID_REGISTRY_FORMAT        = $coclassClsid
    LIBID_REGISTRY_FORMAT        = $libId
    CONNECTION_POINTS            = $ConnectionPoints.IsPresent
    ATTRIBUTED                   = $false
    INTERFACE_DUAL               = $false
    AUTOMATION                   = $false
    DLL_APP                      = $true
    LIB_NAME                     = "${ProjectName}Lib"
    TYPELIB_VERSION_MAJOR        = '1'
    TYPELIB_VERSION_MINOR        = '0'

    DOTNET_MODULE                = $false
    MFC_EXT_SHARED               = $false
    APP_ARX_TYPE                 = $false
    ATL_COM_SERVER               = $true
    STD_COM_SERVER               = $true
}

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$templateDir = Join-Path $scriptDir "..\templates\dyn-prop"
Expand-TemplateFile "$templateDir\dynprop.h"          (Join-Path $OutputPath $headerFile)       $symbols
Expand-TemplateFile "$templateDir\dynprop.cpp"        (Join-Path $OutputPath $implFile)         $symbols
Expand-TemplateFile "$templateDir\dynprop.rgs"        (Join-Path $OutputPath "$ClassName.rgs")  $symbols
Expand-TemplateFile "$templateDir\dynpropco.idl"      (Join-Path $OutputPath "${ClassName}co.idl")   $symbols
Expand-TemplateFile "$templateDir\dynpropint.idl"     (Join-Path $OutputPath "${ClassName}int.idl")  $symbols

if ($ConnectionPoints) {
    Expand-TemplateFile "$templateDir\connpt.h" (Join-Path $OutputPath "_${InterfaceName}Events_CP.h") $symbols
}

$vcxproj = Get-ChildItem -Path $OutputPath -Filter "*.vcxproj" | Select-Object -First 1
if ($vcxproj) {
    $hFiles = @($headerFile)
    if ($ConnectionPoints) { $hFiles += "_${InterfaceName}Events_CP.h" }
    Add-FilesToProject -ProjectPath $vcxproj.FullName -CppFiles @($implFile) -HeaderFiles $hFiles
}

Write-Host "Generated: $headerFile, $implFile, $ClassName.rgs + .idl files  →  $OutputPath"
Write-Host "Next: In Visual Studio → Project → Add Existing Item → select all generated files."
