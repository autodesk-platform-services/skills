<#
.SYNOPSIS
    Expands ObjectARX wizard template files by resolving [!output KEY] and
    [!if / !else / !endif] directives — a PowerShell port of the VsWizardEngine
    token processor.

.DESCRIPTION
    Supported directives (identical to the original .vsz wizard engine):
        [!output KEY]               – replaced by $Symbols["KEY"]
        [!if KEY]                   – include block when KEY is truthy
        [!if !KEY]                  – include block when KEY is falsy
        [!if A || B]                – OR  (any truthy)
        [!if A && B]                – AND (all truthy)
        [!if A && !B]               – AND with negation
        [!else]                     – alternate branch
        [!endif]                    – closes if block

.PARAMETER TemplateContent
    The raw text of a template file.

.PARAMETER Symbols
    Hashtable of symbol name → value (string or bool).

.OUTPUTS
    Expanded string.

.EXAMPLE
    $sym = @{ PROJECT_NAME = "MyPlugin"; APP_ARX_TYPE = $true; MFC_EXT_SHARED = $false }
    $out = Invoke-TemplateExpansion -TemplateContent (Get-Content file.cpp -Raw) -Symbols $sym
#>
function Invoke-TemplateExpansion {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string] $TemplateContent,
        [Parameter(Mandatory)][hashtable] $Symbols
    )

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------
    function IsTrue([string]$key) {
        if (-not $Symbols.ContainsKey($key)) { return $false }
        $v = $Symbols[$key]
        if ($v -is [bool])   { return $v }
        if ($v -is [int])    { return $v -ne 0 }
        if ($v -is [string]) { return ($v -ne "" -and $v -ne "0" -and $v -ne "false") }
        return [bool]$v
    }

    # Evaluate a single [!if ...] condition expression.
    # Supports: KEY, !KEY, A || B, A && B, A && !B, !A || !B (any combo)
    function EvalCondition([string]$expr) {
        $expr = $expr.Trim()

        if ($expr -match '\|\|') {
            $parts = $expr -split '\|\|'
            foreach ($p in $parts) { if (EvalCondition $p.Trim()) { return $true } }
            return $false
        }

        if ($expr -match '&&') {
            $parts = $expr -split '&&'
            foreach ($p in $parts) { if (-not (EvalCondition $p.Trim())) { return $false } }
            return $true
        }

        if ($expr.StartsWith('!')) {
            return -not (IsTrue $expr.Substring(1).Trim())
        }

        return IsTrue $expr
    }

    # -------------------------------------------------------------------------
    # Line-by-line processor using an if-stack
    # -------------------------------------------------------------------------
    $lines  = $TemplateContent -split "`r?`n"
    $output = [System.Text.StringBuilder]::new()

    # Stack entries: [bool active, bool seenElse, bool parentActive]
    $stack  = [System.Collections.Generic.Stack[hashtable]]::new()
    $active = $true  # whether current block is being emitted

    foreach ($line in $lines) {
        $trimmed = $line.Trim()

        # ---- [!if ...] -------------------------------------------------------
        if ($trimmed -match '^\[!if\s+(.+?)\s*\]\s*$') {
            $stack.Push(@{ active = $active; seenElse = $false; parentActive = $active })
            if ($active) {
                $active = EvalCondition $Matches[1]
            } else {
                $active = $false
            }
            continue
        }

        # ---- [!else] ---------------------------------------------------------
        if ($trimmed -eq '[!else]') {
            if ($stack.Count -gt 0) {
                $top = $stack.Peek()
                if (-not $top.seenElse) {
                    $top.seenElse = $true
                    $active = $top.parentActive -and (-not $active)
                }
            }
            continue
        }

        # ---- [!endif] --------------------------------------------------------
        if ($trimmed -eq '[!endif]') {
            if ($stack.Count -gt 0) {
                $top = $stack.Pop()
                $active = $top.active
            }
            continue
        }

        # ---- Skip lines in inactive blocks -----------------------------------
        if (-not $active) { continue }

        # ---- [!output KEY] inline replacements --------------------------------
        $expanded = [regex]::Replace($line, '\[!output\s+(\w+)\]', {
            param($m)
            $k = $m.Groups[1].Value
            if ($Symbols.ContainsKey($k)) { [string]$Symbols[$k] } else { $m.Value }
        })

        [void]$output.AppendLine($expanded)
    }

    # Remove trailing extra newline added by last AppendLine
    $result = $output.ToString()
    if ($result.EndsWith("`r`n")) { $result = $result.Substring(0, $result.Length - 2) }
    elseif ($result.EndsWith("`n")) { $result = $result.Substring(0, $result.Length - 1) }

    return $result
}

# -------------------------------------------------------------------------
# Helper: derive safe C++ identifier from a project/class name
# -------------------------------------------------------------------------
function New-SafeName([string]$name) {
    # Replace leading digits or non-identifier chars
    $safe = $name -replace '[^A-Za-z0-9_]', '_'
    if ($safe -match '^[0-9]') { $safe = '_' + $safe }
    return $safe
}

# -------------------------------------------------------------------------
# Helper: safe RC file name (no spaces, first char alpha)
# -------------------------------------------------------------------------
function New-SafeRCFileName([string]$name) {
    return New-SafeName $name
}

# -------------------------------------------------------------------------
# Helper: expand a single template file → write to destination
# -------------------------------------------------------------------------
function Expand-TemplateFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]   $SourcePath,
        [Parameter(Mandatory)][string]   $DestPath,
        [Parameter(Mandatory)][hashtable] $Symbols
    )

    $content  = Get-Content -Path $SourcePath -Raw -Encoding UTF8
    $expanded = Invoke-TemplateExpansion -TemplateContent $content -Symbols $Symbols

    $dir = Split-Path $DestPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    Set-Content -Path $DestPath -Value $expanded -Encoding UTF8 -NoNewline
    Write-Verbose "  Written: $DestPath"
}

# -------------------------------------------------------------------------
# Helper: Add generated files to the .vcxproj if it exists in OutputPath
# -------------------------------------------------------------------------
function Add-FilesToProject {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string] $ProjectPath,
        [string[]] $CppFiles,
        [string[]] $HeaderFiles,
        [string[]] $OtherFiles
    )

    if (-not (Test-Path $ProjectPath)) { return }

    [xml]$proj = Get-Content $ProjectPath
    $ns = @{ msbuild = "http://schemas.microsoft.com/developer/msbuild/2003" }

    $modified = $false

    # Find the ItemGroup containing ClCompile
    $compileGroup = Select-Xml -Xml $proj -XPath "//msbuild:ItemGroup[msbuild:ClCompile]" -Namespace $ns
    if ($compileGroup -and $CppFiles) {
        foreach ($cpp in $CppFiles) {
            # Check if it already exists
            $existing = Select-Xml -Xml $proj -XPath "//msbuild:ItemGroup/msbuild:ClCompile[@Include='$cpp']" -Namespace $ns
            if (-not $existing) {
                $node = $proj.CreateElement("ClCompile", "http://schemas.microsoft.com/developer/msbuild/2003")
                $node.SetAttribute("Include", $cpp)
                $compileGroup.Node.AppendChild($node) | Out-Null
                $modified = $true
            }
        }
    }

    # Find the ItemGroup containing ClInclude
    $includeGroup = Select-Xml -Xml $proj -XPath "//msbuild:ItemGroup[msbuild:ClInclude]" -Namespace $ns
    if ($includeGroup -and $HeaderFiles) {
        foreach ($h in $HeaderFiles) {
            # Check if it already exists
            $existing = Select-Xml -Xml $proj -XPath "//msbuild:ItemGroup/msbuild:ClInclude[@Include='$h']" -Namespace $ns
            if (-not $existing) {
                $node = $proj.CreateElement("ClInclude", "http://schemas.microsoft.com/developer/msbuild/2003")
                $node.SetAttribute("Include", $h)
                $includeGroup.Node.AppendChild($node) | Out-Null
                $modified = $true
            }
        }
    }

    if ($modified) {
        $proj.Save($ProjectPath)
        Write-Verbose "  Added files to project: $ProjectPath"
    }
}
