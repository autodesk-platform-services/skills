# install.ps1 — Download CuixBuilder.exe from GitHub Releases
# Usage: irm https://raw.githubusercontent.com/autodesk-platform-services/skills/main/skills/acad-cuix-builder/install.ps1 | iex
# Requires: .NET 10 runtime (ships with AutoCAD 2027)

$ErrorActionPreference = "Stop"

$repo  = "ADN-DevTech/acad-cuix-builder"
$dest  = "$env:USERPROFILE\.cuixbuilder"
$exe   = "$dest\CuixBuilder.exe"

Write-Host ""
Write-Host "CuixBuilder installer"
Write-Host "Repository : https://github.com/$repo"
Write-Host "Install to : $dest"
Write-Host ""

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
Write-Host "Done. CuixBuilder.exe ready at: $exe"
Write-Host ""
