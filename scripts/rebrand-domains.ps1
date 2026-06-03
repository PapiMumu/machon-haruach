# Replace legacy b1.church / churchapps.org defaults in source (not node_modules).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$excludeDirNames = @("node_modules", "dist", ".git", ".expo", ".cxx", "Pods", "build", "intermediates")
$excludeExt = @(".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".pptx", ".zip", ".lock")

function ShouldSkip([string]$path) {
  foreach ($part in $excludeDirNames) {
    if ($path -match [regex]::Escape("\$part\")) { return $true }
  }
  if ($excludeExt -contains [IO.Path]::GetExtension($path).ToLowerInvariant()) { return $true }
  if ($path -match "package-lock\.json$") { return $true }
  return $false
}

$replacements = [ordered]@{
  "https://admin.machonharuach.org" = "https://admin.machonharuach.org"
  "https://api.machonharuach.org" = "https://api.machonharuach.org"
  "https://api.staging.machonharuach.org" = "https://api.staging.machonharuach.org"
  "https://content.machonharuach.org" = "https://content.machonharuach.org"
  "https://content.staging.machonharuach.org" = "https://content.staging.machonharuach.org"
  "https://content.machonharuach.org" = "https://content.machonharuach.org"
  ".staging.machonharuach.org" = ".staging.machonharuach.org"
  ".machonharuach.org" = ".machonharuach.org"
  "proxy.machonharuach.org" = "proxy.machonharuach.org"
  "transfer.machonharuach.org" = "transfer.machonharuach.org"
  "support@machonharuach.org" = "support@machonharuach.org"
  "demo@machonharuach.org" = "demo@machonharuach.org"
  "https://machonharuach.org/app" = "https://machonharuach.org/app"
  "--admin-sidebar-width" = "--admin-sidebar-width"
  "machon-admin-theme-mode" = "machon-admin-theme-mode"
}

$scanRoots = @("Admin\src", "Admin\public\locales\en.json", "App\src", "Mobile\src", "Mobile\app", "Api\src", "scripts")
$changed = 0
foreach ($rel in $scanRoots) {
  $base = Join-Path $root $rel
  if (-not (Test-Path $base)) { continue }
  $files = if ((Get-Item $base).PSIsContainer) {
    Get-ChildItem $base -Recurse -File
  } else { @(Get-Item $base) }
  foreach ($f in $files) {
    if (ShouldSkip $f.FullName) { continue }
    if ($f.Extension -notin @(".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".css", ".ps1", ".md", ".cjs")) { continue }
    $c = [IO.File]::ReadAllText($f.FullName)
    $n = $c
    foreach ($kv in $replacements.GetEnumerator()) { $n = $n.Replace($kv.Key, $kv.Value) }
    if ($n -ne $c) { [IO.File]::WriteAllText($f.FullName, $n); $changed++ }
  }
}
Write-Host "Domain rebrand: $changed files updated."
