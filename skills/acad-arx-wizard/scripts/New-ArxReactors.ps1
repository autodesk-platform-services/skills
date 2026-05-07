<#
.SYNOPSIS
    Scaffolds an ObjectARX transient reactor class pair (.h + .cpp).
    Equivalent to the ArxWizReactors Visual Studio item wizard.

.PARAMETER ClassName
    Name for the reactor class (e.g. CMyDbReactor).

.PARAMETER ReactorType
    Which reactor template to use. Must match one of the _tmpl.h files
    in templates\reactors\ (without the _tmpl suffix).

    Common values:
      AcDbDatabaseReactor
      AcDbObjectReactor
      AcDbEntityReactor
      AcEdInputContextReactor
      AcApDocManagerReactor
      AcDbLayoutManagerReactor
      AcDbAnnotationScaleReactor
      AcDMMReactor

    Run:  Get-ChildItem ..\templates\reactors\*_tmpl.h | Select Name
    for the full list.

.PARAMETER ProjectName
    Owning project name (used for DLLIMPEXP guard symbol).

.PARAMETER OutputPath
    Folder to write the generated files into.

.EXAMPLE
    .\New-ArxReactors.ps1 -ClassName CMyReactor -ReactorType AcDbDatabaseReactor `
        -ProjectName MyPlugin -OutputPath C:\Dev\MyPlugin
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $ClassName,
    [Parameter(Mandatory)][string] $ReactorType,
    [Parameter(Mandatory)][string] $OutputPath,
    [string] $ProjectName = 'MyProject'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
. "$scriptDir\Invoke-TemplateExpansion.ps1"

if ($ClassName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "ClassName '$ClassName' is not a valid C++ identifier."
}

$templateDir = Join-Path $scriptDir "..\templates\reactors"
$tmplH   = Join-Path $templateDir "${ReactorType}_tmpl.h"
$tmplCpp = Join-Path $templateDir "${ReactorType}_tmpl.cpp"

if (-not (Test-Path $tmplH)) {
    $available = Get-ChildItem $templateDir -Filter "*_tmpl.h" |
                 ForEach-Object { $_.Name -replace '_tmpl\.h$','' }
    throw "ReactorType '$ReactorType' not found. Available types:`n  $($available -join "`n  ")"
}

$safeName  = New-SafeName $ProjectName
$upperSafe = $safeName.ToUpper()

$headerFile = "$ClassName.h"
$implFile   = "$ClassName.cpp"

# Infer base class include header from reactor type
$includeHeader = switch -Wildcard ($ReactorType) {
    'AcDb*'  { 'acdb.h'    }
    'AcEd*'  { 'acdocman.h' }
    'AcAp*'  { 'acdocman.h' }
    'AcDMM*' { 'AcDMM.h'   }
    default  { 'acdb.h'    }
}

$symbols = @{
    CLASS_NAME_ROOT              = $ClassName
    CLASS_NAME                   = $ClassName
    BASE_CLASS                   = $ReactorType
    INCLUDE_HEADER               = $includeHeader
    HEADER_FILE                  = $headerFile
    IMPL_FILE                    = $implFile
    PROJECT_NAME                 = $ProjectName
    SAFE_PROJECT_NAME            = $safeName
    UPPER_CASE_SAFE_PROJECT_NAME = $upperSafe

    # keep template engine happy
    DOTNET_MODULE                = $false
    MFC_EXT_SHARED               = $false
    APP_ARX_TYPE                 = $false
    ATL_COM_SERVER               = $false
}

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

Expand-TemplateFile $tmplH   (Join-Path $OutputPath $headerFile) $symbols
if (Test-Path $tmplCpp) {
    Expand-TemplateFile $tmplCpp (Join-Path $OutputPath $implFile) $symbols
}

$vcxproj = Get-ChildItem -Path $OutputPath -Filter "*.vcxproj" | Select-Object -First 1
if ($vcxproj) {
    $cppFiles = @()
    if (Test-Path $tmplCpp) { $cppFiles += $implFile }
    Add-FilesToProject -ProjectPath $vcxproj.FullName -CppFiles $cppFiles -HeaderFiles @($headerFile)
}

Write-Host "Generated: $headerFile$(if (Test-Path $tmplCpp) { ', ' + $implFile })  →  $OutputPath"
Write-Host "Next: In Visual Studio → Project → Add Existing Item → select the generated files."
