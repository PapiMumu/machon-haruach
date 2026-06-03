<#
.SYNOPSIS
  Copies your church logo PNG into Admin, App, and Mobile asset paths.

.EXAMPLE
  .\apply-church-logo.ps1 -SourcePath "C:\Users\Red\Pictures\gnw_logo-gold_512.png"
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $SourcePath
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Source file not found: $SourcePath"
}

$repoRoot = Split-Path $PSScriptRoot -Parent

$destinations = @(
  # Admin — nav button uses logo-icon.png; PWA icons; login hero uses gnw_logo-gold_512.png
  "$repoRoot\Admin\public\images\logo.png",
  "$repoRoot\Admin\public\images\logo-icon.png",
  "$repoRoot\Admin\public\images\logo-login.png",
  "$repoRoot\Admin\public\images\logo-wrapper.png",
  "$repoRoot\Admin\public\images\logo-white.png",
  "$repoRoot\Admin\public\images\gnw_logo-gold_512.png",
  "$repoRoot\Admin\public\logo192.png",
  "$repoRoot\Admin\public\logo512.png",
  # App — member site / login fallbacks
  "$repoRoot\App\public\images\logo.png",
  "$repoRoot\App\public\images\logo-icon.png",
  "$repoRoot\App\public\images\logo-login.png",
  "$repoRoot\App\public\images\logo-wrapper.png",
  # Mobile — app icon + splash image (gold logo on spirit-blue splash)
  "$repoRoot\Mobile\assets\icon.png",
  "$repoRoot\Mobile\src\assets\images\logoWhite.png"
)

foreach ($dest in $destinations) {
  $dir = Split-Path $dest -Parent
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  Copy-Item -LiteralPath $SourcePath -Destination $dest -Force
  Write-Host "OK $dest"
}

Write-Host ""
Write-Host "Done. Restart Admin, App, and rebuild Mobile if needed (Expo caches icons)."
