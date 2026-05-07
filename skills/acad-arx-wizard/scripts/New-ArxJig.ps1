<#
.SYNOPSIS
    Scaffolds an AcEdJig subclass pair (.h + .cpp).
    Equivalent to the ArxWizJig Visual Studio item wizard.

.PARAMETER ClassName
    Name for the jig class (e.g. CMyJig).

.PARAMETER ObjectName
    The AcDbEntity-derived class being jigged (e.g. AcDbLine, AcDbCircle).

.PARAMETER NumberOfInputs
    Number of point-input steps in the jig loop (1–20). Defaults to 1.

.PARAMETER ProjectName
    Owning project name (used for safe-name guard symbol).

.PARAMETER OutputPath
    Folder to write the generated files into.

.EXAMPLE
    .\New-ArxJig.ps1 -ClassName CMyJig -ObjectName AcDbLine -NumberOfInputs 2 `
        -ProjectName MyPlugin -OutputPath C:\Dev\MyPlugin
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $ClassName,
    [Parameter(Mandatory)][string] $OutputPath,
    [string] $ObjectName     = 'AcDbEntity',
    [ValidateRange(1,20)][int] $NumberOfInputs = 1,
    [string] $ProjectName    = 'MyProject'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
. "$scriptDir\Invoke-TemplateExpansion.ps1"

if ($ClassName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "ClassName '$ClassName' is not a valid C++ identifier."
}

$safeName  = New-SafeName $ProjectName
$upperSafe = $safeName.ToUpper()

$headerFile = "$ClassName.h"
$implFile   = "$ClassName.cpp"

# Build INPUT_PROMPTS / INPUT_KEYWORDS arrays (mirrors default.js loop)
$inputPrompts    = '"\\nPick point"'
$kwords          = '""'
$userCtrls       = '/*AcEdJig::UserInputControls::*/(AcEdJig::UserInputControls)0'
$cursorTypes     = '/*AcEdJig::CursorType::*/(AcEdJig::CursorType)0'
$samplerSwitch   = "case 1:`n`t`t`t// TODO : get an input here`n`t`t`t//status =GetStartPoint () ;`n`t`t`tbreak ;`n"
$updateSwitch    = "case 1:`n`t`t`t// TODO : update your entity for this input`n`t`t`t//mpEntity->setCenter (mInputPoints [mCurrentInputLevel]) ;`n`t`t`tbreak ;`n"

for ($j = 1; $j -lt $NumberOfInputs; $j++) {
    $inputPrompts  += ",`n`t`t`"\\nPick point`""
    $kwords        += ",`n`t`t`"`""
    $userCtrls     += ",`n`t`t/*AcEdJig::UserInputControls::*/(AcEdJig::UserInputControls)0"
    $cursorTypes   += ",`n`t`t/*AcEdJig::CursorType::*/(AcEdJig::CursorType)0"
    $samplerSwitch += "`t`tcase $($j+1):`n`t`t`t// TODO : get an input here`n`t`t`t//status =GetStartPoint () ;`n`t`t`tbreak ;`n"
    $updateSwitch  += "`t`tcase $($j+1):`n`t`t`t// TODO : update your entity for this input`n`t`t`t//mpEntity->setCenter (mInputPoints [mCurrentInputLevel]) ;`n`t`t`tbreak ;`n"
}

$symbols = @{
    CLASS_NAME                   = $ClassName
    ARX_OBJECTNAME               = $ObjectName
    HEADER_FILE                  = $headerFile
    IMPL_FILE                    = $implFile
    NUMBER_OF_INPUTS             = "$NumberOfInputs"
    INPUT_PROMPTS                = $inputPrompts
    INPUT_KEYWORDS               = $kwords
    INPUT_USERCTRLS              = $userCtrls
    INPUT_CURSORTYPES            = $cursorTypes
    SAMPLER_SWITCH               = $samplerSwitch
    UPDATE_SWITCH                = $updateSwitch
    PROJECT_NAME                 = $ProjectName
    SAFE_PROJECT_NAME            = $safeName
    UPPER_CASE_SAFE_PROJECT_NAME = $upperSafe

    DOTNET_MODULE                = $false
    MFC_EXT_SHARED               = $false
    APP_ARX_TYPE                 = $false
    ATL_COM_SERVER               = $false
}

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$templateDir = Join-Path $scriptDir "..\templates\jig"
Expand-TemplateFile "$templateDir\Jig.h"   (Join-Path $OutputPath $headerFile) $symbols
Expand-TemplateFile "$templateDir\Jig.cpp" (Join-Path $OutputPath $implFile)   $symbols

$vcxproj = Get-ChildItem -Path $OutputPath -Filter "*.vcxproj" | Select-Object -First 1
if ($vcxproj) {
    Add-FilesToProject -ProjectPath $vcxproj.FullName -CppFiles @($implFile) -HeaderFiles @($headerFile)
}

Write-Host "Generated: $headerFile, $implFile  →  $OutputPath"
Write-Host "Next: In Visual Studio → Project → Add Existing Item → select both files."
