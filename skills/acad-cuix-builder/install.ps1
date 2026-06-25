# install.ps1 — Download CuixBuilder.exe from GitHub Releases
# Usage: irm https://raw.githubusercontent.com/autodesk-platform-services/skills/main/skills/acad-cuix-builder/install.ps1 | iex

$ErrorActionPreference = "Stop"

$repo  = "ADN-DevTech/acad-cuix-builder"
$dest  = "$env:USERPROFILE\.cuixbuilder"
$exe   = "$dest\CuixBuilder.exe"

Write-Host ""
Write-Host "CuixBuilder installer"
Write-Host "Repository : https://github.com/$repo"
Write-Host "Install to : $dest"
Write-Host ""

# Fetch latest release metadata
$api     = "https://api.github.com/repos/$repo/releases/latest"
$headers = @{ "User-Agent" = "cuix-builder-installer"; "Accept" = "application/vnd.github+json" }
$release = Invoke-RestMethod -Uri $api -Headers $headers
$asset   = $release.assets | Where-Object { $_.name -eq "CuixBuilder.exe" } | Select-Object -First 1

if (-not $asset) {
    Write-Error "CuixBuilder.exe not found in release $($release.tag_name). Check https://github.com/$repo/releases"
    exit 1
}

Write-Host "Downloading $($release.tag_name) / $($asset.name) ($([math]::Round($asset.size/1MB, 1)) MB)..."

New-Item -ItemType Directory -Force -Path $dest | Out-Null
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $exe -UseBasicParsing

Write-Host ""
Write-Host "Done."
Write-Host "  Exe : $exe"
Write-Host ""
Write-Host "Next: install the skill (if not already done)"
Write-Host "  npx skills add autodesk-platform-services/skills --global --skill acad-cuix-builder"
Write-Host ""
Write-Host "Then in Claude Code: /acad-cuix-builder"
