# install.ps1 — One-shot installer: CuixBuilder.exe + acad-cuix-builder skill
# Usage: irm https://raw.githubusercontent.com/autodesk-platform-services/skills/main/skills/acad-cuix-builder/install.ps1 | iex
# Requires: .NET 10 runtime (ships with AutoCAD 2027)

$ErrorActionPreference = "Stop"

$repo      = "ADN-DevTech/acad-cuix-builder"
$skillsRaw = "https://raw.githubusercontent.com/autodesk-platform-services/skills/main/skills/acad-cuix-builder"
$dest      = "$env:USERPROFILE\.cuixbuilder"
$exe       = "$dest\CuixBuilder.exe"
$skillDest = "$env:USERPROFILE\.claude\skills\acad-cuix-builder"

Write-Host ""
Write-Host "CuixBuilder installer"
Write-Host "Repository : https://github.com/$repo"
Write-Host "Install to : $dest"
Write-Host ""

# --- Step 1: Download CuixBuilder.exe ---
$api     = "https://api.github.com/repos/$repo/releases/latest"
$headers = @{ "User-Agent" = "cuix-builder-installer"; "Accept" = "application/vnd.github+json" }
$release = Invoke-RestMethod -Uri $api -Headers $headers
$asset   = $release.assets | Where-Object { $_.name -eq "CuixBuilder.exe" } | Select-Object -First 1

if (-not $asset) {
    Write-Error "CuixBuilder.exe not found in release $($release.tag_name). Check https://github.com/$repo/releases"
    exit 1
}

Write-Host "[1/2] Downloading $($release.tag_name) / $($asset.name) ($([math]::Round($asset.size/1MB, 1)) MB)..."

New-Item -ItemType Directory -Force -Path $dest | Out-Null
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $exe -UseBasicParsing

Write-Host "      Saved to: $exe"
Write-Host ""

# --- Step 2: Install skill files directly ---
Write-Host "[2/2] Installing acad-cuix-builder skill..."

$files = @(
    "SKILL.md",
    "README.md",
    "references/cuix-architecture.md"
)

foreach ($file in $files) {
    $dir = Split-Path "$skillDest\$file" -Parent
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Invoke-WebRequest -Uri "$skillsRaw/$file" -OutFile "$skillDest\$file" -UseBasicParsing
    Write-Host "      $file"
}

Write-Host ""
Write-Host "All done."
Write-Host "  Exe   : $exe"
Write-Host "  Skill : $skillDest"
Write-Host ""
Write-Host "In Claude Code, type: /acad-cuix-builder"
Write-Host ""
