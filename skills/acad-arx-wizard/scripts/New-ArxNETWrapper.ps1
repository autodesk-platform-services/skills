<#
.SYNOPSIS
    Scaffolds a managed .NET wrapper class for an ObjectARX custom object (.h + .cpp).
    Equivalent to the ArxWizNETWrapper Visual Studio item wizard.

.PARAMETER WrapperName
    Name for the managed wrapper class (e.g. MyManagedLine).

.PARAMETER CustomObjectName
    The unmanaged C++ class being wrapped (e.g. CMyLine).

.PARAMETER CompanyNamespace
    Top-level C++/CLI namespace (e.g. Autodesk or MyCompany).

.PARAMETER ObjectNamespace
    Inner namespace (e.g. AutoCAD or MyProduct).

.PARAMETER ManagedDerivation
    The managed base class to derive from (e.g. Entity, Curve, DBObject).
    Defaults to Entity.

.PARAMETER ProjectName
    Owning project name.

.PARAMETER OutputPath
    Folder to write the generated files into.

.EXAMPLE
    .\New-ArxNETWrapper.ps1 -WrapperName MyManagedLine -CustomObjectName CMyLine `
        -CompanyNamespace MyCompany -ObjectNamespace MyPlugin `
        -ProjectName MyPlugin -OutputPath C:\Dev\MyPlugin
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $WrapperName,
    [Parameter(Mandatory)][string] $OutputPath,
    [string] $CustomObjectName   = 'AcDbEntity',
    [string] $CompanyNamespace   = 'Autodesk',
    [string] $ObjectNamespace    = 'AutoCAD',
    [string] $ManagedDerivation  = 'Entity',
    [string] $ProjectName        = 'MyProject'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
. "$scriptDir\Invoke-TemplateExpansion.ps1"

if ($WrapperName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "WrapperName '$WrapperName' is not a valid C++ identifier."
}

$safeName  = New-SafeName $ProjectName
$upperSafe = $safeName.ToUpper()
$headerFile = "$WrapperName.h"
$implFile   = "$WrapperName.cpp"

$symbols = @{
    MANAGED_WRAPPER_NAME         = $WrapperName
    CUSTOM_OBJECTNAME            = $CustomObjectName
    COMPANY_NAMESPACE            = $CompanyNamespace
    OBJECT_NAMESPACE             = $ObjectNamespace
    MANAGED_DERIVATION           = $ManagedDerivation
    HEADER_FILE                  = $headerFile
    IMPL_FILE                    = $implFile
    PROJECT_NAME                 = $ProjectName
    SAFE_PROJECT_NAME            = $safeName
    UPPER_CASE_SAFE_PROJECT_NAME = $upperSafe

    DOTNET_MODULE                = $true
    MFC_EXT_SHARED               = $false
    APP_ARX_TYPE                 = $false
    ATL_COM_SERVER               = $false
}

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$templateDir = Join-Path $scriptDir "..\templates\net-wrapper"
Expand-TemplateFile "$templateDir\managedWrapper.h"   (Join-Path $OutputPath $headerFile) $symbols
Expand-TemplateFile "$templateDir\managedWrapper.cpp" (Join-Path $OutputPath $implFile)   $symbols

$vcxproj = Get-ChildItem -Path $OutputPath -Filter "*.vcxproj" | Select-Object -First 1
if ($vcxproj) {
    Add-FilesToProject -ProjectPath $vcxproj.FullName -CppFiles @($implFile) -HeaderFiles @($headerFile)
}

Write-Host "Generated: $headerFile, $implFile  →  $OutputPath"
Write-Host "Next: In Visual Studio → Project → Add Existing Item → select both files."
Write-Host "Ensure the project has CLRSupport=NetCore in its .vcxproj."
