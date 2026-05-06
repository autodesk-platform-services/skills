<#
.SYNOPSIS
    Scaffolds an ObjectARX Custom Object class pair (.h + .cpp).
    Equivalent to the ArxWizCustomObject Visual Studio item wizard.

.PARAMETER ClassName
    Name for the new custom object class (e.g. CMyEntity).

.PARAMETER BaseClass
    ObjectARX base class to derive from. Defaults to AcDbEntity.
    Common choices: AcDbEntity, AcDbCurve, AcDbObject.

.PARAMETER IncludeHeader
    Header file to #include for the base class.
    Defaults are inferred from BaseClass if not supplied.

.PARAMETER Protocols
    Which AcDb protocol overrides to stub out:
      0 – none
      1 – AcDbObject (dwgIn/dwgOut, dxfIn/dxfOut)
      2 – AcDbObject + AcDbEntity (worldDraw, subentPtr, ...)
      3 – AcDbObject + AcDbEntity + AcDbCurve

.PARAMETER DwgProtocol    Add dwgInFields / dwgOutFields stubs.
.PARAMETER DxfProtocol    Add dxfInFields / dxfOutFields stubs.
.PARAMETER SelfReactor    Add subOpen / subErase / subClose self-notification stubs.

.PARAMETER ProjectName
    Owning project name (used for DLLIMPEXP guard symbol).

.PARAMETER OutputPath
    Folder to write the generated files into.
    Files are written directly — no sub-folder is created.

.EXAMPLE
    .\New-ArxCustomObject.ps1 -ClassName CMyLine -BaseClass AcDbCurve `
        -Protocols 3 -ProjectName MyPlugin -OutputPath C:\Dev\MyPlugin
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $ClassName,
    [Parameter(Mandatory)][string] $OutputPath,
    [string] $BaseClass    = 'AcDbEntity',
    [string] $IncludeHeader = '',
    [ValidateRange(0,3)][int] $Protocols = 2,
    [switch] $DwgProtocol,
    [switch] $DxfProtocol,
    [switch] $SelfReactor,
    [string] $ProjectName  = 'MyProject'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
. "$scriptDir\Invoke-TemplateExpansion.ps1"

if ($ClassName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "ClassName '$ClassName' is not a valid C++ identifier."
}

# Infer include header from base class if not provided
if (-not $IncludeHeader) {
    $IncludeHeader = switch ($BaseClass) {
        'AcDbCurve'  { 'dbcurve.h' }
        'AcDbEntity' { 'dbents.h'  }
        default      { 'dbmain.h'  }
    }
}

$safeName  = New-SafeName $ProjectName
$upperSafe = $safeName.ToUpper()

# Protocol flags
$objProto    = $Protocols -ge 1
$entProto    = $Protocols -ge 2
$curveProto  = $Protocols -ge 3
$dwg         = $DwgProtocol.IsPresent -or $objProto
$dxf         = $DxfProtocol.IsPresent -or $objProto

$headerFile = "$ClassName.h"
$implFile   = "$ClassName.cpp"

$symbols = @{
    CLASS_NAME                   = $ClassName
    BASE_CLASS                   = $BaseClass
    INCLUDE_HEADER               = $IncludeHeader
    HEADER_FILE                  = $headerFile
    IMPL_FILE                    = $implFile
    PROJECT_NAME                 = $ProjectName
    SAFE_PROJECT_NAME            = $safeName
    UPPER_CASE_SAFE_PROJECT_NAME = $upperSafe
    DXFNAME                      = $ClassName.ToUpper()
    APPNAME                      = $safeName.ToUpper()

    ACDBOBJECT_PROTOCOLS         = $objProto
    ACDBENTITY_PROTOCOLS         = $entProto
    ACDBCURVE_PROTOCOLS          = $curveProto
    DWG_PROTOCOL                 = $dwg
    DXF_PROTOCOL                 = $dxf
    SELF_REACTOR                 = $SelfReactor.IsPresent

    # keep template engine happy
    DOTNET_MODULE                = $false
    MFC_EXT_SHARED               = $false
    APP_ARX_TYPE                 = $false
    APP_DBX_TYPE                 = $false
    APP_CRX_TYPE                 = $false
    ATL_COM_SERVER               = $false
    STD_COM_SERVER               = $false
}

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$templateDir = Join-Path $scriptDir "..\templates\custom-object"
Expand-TemplateFile "$templateDir\object.h"   (Join-Path $OutputPath $headerFile) $symbols
Expand-TemplateFile "$templateDir\object.cpp" (Join-Path $OutputPath $implFile)   $symbols

$vcxproj = Get-ChildItem -Path $OutputPath -Filter "*.vcxproj" | Select-Object -First 1
if ($vcxproj) {
    Add-FilesToProject -ProjectPath $vcxproj.FullName -CppFiles @($implFile) -HeaderFiles @($headerFile)
}

Write-Host "Generated: $headerFile, $implFile  →  $OutputPath"
Write-Host "Next: In Visual Studio → Project → Add Existing Item → select both files."
