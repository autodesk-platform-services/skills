<#
.SYNOPSIS
    Scaffolds an ObjectARX MFC UI class pair (.h + .cpp).
    Equivalent to the ArxWizMFCSupport Visual Studio item wizard.

.PARAMETER ClassName
    Name for the MFC class (e.g. CMyDialog).

.PARAMETER MfcType
    The type of MFC class to generate:
      Dialog           – CAcUiDialog subclass
      ChildDialog      – CAcUiDialog with embedded child dialog
      TabDialog        – CAcUiTabMainDialog subclass
      Palette          – CAcUiPalette subclass
      PaletteSet       – CAcUiPaletteSet subclass
      DockControlBar   – CAdUiDockControlBar subclass
      Control          – CAdUiMRUComboBox (generic control) subclass
      FileDialog       – CAcUiFileDialog subclass
      FileNavDialog    – CAcUiNavDialog subclass
      FieldDialog      – CAdUiDialog (field) subclass
      FieldFormatDialog – CAcFdUiFormatDialog subclass
      FieldOptionDialog – CAcFdUiFormatOptionDialog subclass

.PARAMETER IddDialog
    Resource ID symbol for the dialog (e.g. IDD_MYDIALOG).
    Only relevant for Dialog / ChildDialog / TabDialog types.

.PARAMETER ProjectName
    Owning project name (used for safe-name guard symbol).

.PARAMETER OutputPath
    Folder to write the generated files into.

.EXAMPLE
    .\New-ArxMFCSupport.ps1 -ClassName CMyDialog -MfcType Dialog `
        -IddDialog IDD_MYDIALOG -ProjectName MyPlugin -OutputPath C:\Dev\MyPlugin
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $ClassName,
    [Parameter(Mandatory)][string] $OutputPath,
    [ValidateSet(
        'Dialog','ChildDialog','TabDialog','Palette','PaletteSet',
        'DockControlBar','Control','FileDialog','FileNavDialog',
        'FieldDialog','FieldFormatDialog','FieldOptionDialog'
    )]
    [string] $MfcType    = 'Dialog',
    [string] $IddDialog  = 'IDD_DIALOG1',
    [string] $ProjectName = 'MyProject'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
. "$scriptDir\Invoke-TemplateExpansion.ps1"

if ($ClassName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "ClassName '$ClassName' is not a valid C++ identifier."
}

# Map MfcType → template file stem and base class / include header
$map = @{
    Dialog              = @{ tmpl = 'Dialog';              base = 'CAcUiDialog';                    inc = 'acuiDialog.h'        }
    ChildDialog         = @{ tmpl = 'ChildDialog';         base = 'CAcUiDialog';                    inc = 'acuiDialog.h'        }
    TabDialog           = @{ tmpl = 'TabDialog';           base = 'CAcUiTabMainDialog';              inc = 'acuiTabCtrl.h'       }
    Palette             = @{ tmpl = 'Palette';             base = 'CAcUiPalette';                   inc = 'AcUiPalette.h'       }
    PaletteSet          = @{ tmpl = 'PaletteSet';          base = 'CAcUiPaletteSet';                inc = 'AcUiPaletteSet.h'    }
    DockControlBar      = @{ tmpl = 'DockControlBar';      base = 'CAdUiDockControlBar';            inc = 'aduiDock.h'          }
    Control             = @{ tmpl = 'Control';             base = 'CAdUiMRUComboBox';               inc = 'aduiComboBox.h'      }
    FileDialog          = @{ tmpl = 'FileDialog';          base = 'CAcUiFileDialog';                inc = 'acuiFileDialog.h'    }
    FileNavDialog       = @{ tmpl = 'FileNavDialog';       base = 'CAcUiNavDialog';                 inc = 'aNavDialog.h'        }
    FieldDialog         = @{ tmpl = 'FieldDialog';         base = 'CAdUiDialog';                    inc = 'aduiDialog.h'        }
    FieldFormatDialog   = @{ tmpl = 'FieldFormatDialog';   base = 'CAcFdUiFormatDialog';            inc = 'AcFdUiFormatDialog.h' }
    FieldOptionDialog   = @{ tmpl = 'FieldOptionDialog';   base = 'CAcFdUiFormatOptionDialog';      inc = 'AcFdUiFormatDialog.h' }
}

$entry  = $map[$MfcType]
$safeName  = New-SafeName $ProjectName
$upperSafe = $safeName.ToUpper()

$headerFile = "$ClassName.h"
$implFile   = "$ClassName.cpp"

$symbols = @{
    CLASS_NAME                   = $ClassName
    BASE_CLASS                   = $entry.base
    INCLUDE_HEADER               = $entry.inc
    HEADER_FILE                  = $headerFile
    IMPL_FILE                    = $implFile
    IDD_DIALOG                   = $IddDialog
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

$templateDir = Join-Path $scriptDir "..\templates\mfc-support"
Expand-TemplateFile "$templateDir\$($entry.tmpl).h"   (Join-Path $OutputPath $headerFile) $symbols
Expand-TemplateFile "$templateDir\$($entry.tmpl).cpp" (Join-Path $OutputPath $implFile)   $symbols

$vcxproj = Get-ChildItem -Path $OutputPath -Filter "*.vcxproj" | Select-Object -First 1
if ($vcxproj) {
    Add-FilesToProject -ProjectPath $vcxproj.FullName -CppFiles @($implFile) -HeaderFiles @($headerFile)
}

Write-Host "Generated: $headerFile, $implFile  →  $OutputPath"
Write-Host "Next: In Visual Studio → Project → Add Existing Item → select both files."
