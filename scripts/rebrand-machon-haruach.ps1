# Rebrand ChurchApps / B1* paths and labels to Machon HaRuach (Mobile, Admin, App).
# Excludes node_modules, build output, and lockfiles.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

$excludeDirNames = @(
  "node_modules", "dist", ".git", ".expo", ".cxx", "Pods", "build",
  "intermediates", "cmake", ".gradle", "DerivedData"
)
$excludeExtensions = @(".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".pptx", ".zip", ".jar", ".aar", ".so", ".dll", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4")

function ShouldSkipPath([string]$path) {
  foreach ($part in $excludeDirNames) {
    if ($path -match [regex]::Escape([IO.Path]::DirectorySeparatorChar + $part + [IO.Path]::DirectorySeparatorChar) -or
        $path -match [regex]::Escape([IO.Path]::AltDirectorySeparatorChar + $part + [IO.Path]::AltDirectorySeparatorChar) -or
        $path -match "\\$part$") {
      return $true
    }
  }
  $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
  if ($excludeExtensions -contains $ext) { return $true }
  if ($path -match "package-lock\.json$") { return $true }
  return $false
}

$replacements = @(
  @{ Old = "B1AdminPersonHelper"; New = "AdminPersonHelper" },
  @{ Old = "B1MobilePage"; New = "MobilePage" },
  @{ Old = "B1ShareModal"; New = "ShareModal" },
  @{ Old = "\\B1Mobile\\"; New = "\Mobile\" },
  @{ Old = "/B1Mobile/"; New = "/Mobile/" },
  @{ Old = "\\B1Admin\\"; New = "\Admin\" },
  @{ Old = "/B1Admin/"; New = "/Admin/" },
  @{ Old = "\\B1App\\"; New = "\App\" },
  @{ Old = "/B1App/"; New = "/App/" },
  @{ Old = "..\B1Mobile"; New = "..\Mobile" },
  @{ Old = "..\B1Admin"; New = "..\Admin" },
  @{ Old = "..\B1App"; New = "..\App" },
  @{ Old = "GNW Admin"; New = "Machon HaRuach Admin" },
  @{ Old = '"B1Admin"'; New = '"Admin"' },
  @{ Old = "'B1Admin'"; New = "'Admin'" },
  @{ Old = '"B1Mobile"'; New = '"Mobile"' },
  @{ Old = "'B1Mobile'"; New = "'Mobile'" },
  @{ Old = '"B1App"'; New = '"App"' },
  @{ Old = "'B1App'"; New = "'App'" },
  @{ Old = "B1Mobile registrations"; New = "Mobile app registrations" },
  @{ Old = "B1Mobile ("; New = "Mobile (" },
  @{ Old = "B1Admin ("; New = "Admin (" },
  @{ Old = "in B1Mobile"; New = "in the Mobile app" },
  @{ Old = "in B1Admin"; New = "in Admin" },
  @{ Old = "B1Admin →"; New = "Admin →" },
  @{ Old = "B1Admin "; New = "Admin " },
  @{ Old = "B1Mobile "; New = "Mobile " },
  @{ Old = "B1Mobile."; New = "Mobile." },
  @{ Old = "B1Mobile/"; New = "Mobile/" },
  @{ Old = "B1Admin/"; New = "Admin/" },
  @{ Old = "b1admin"; New = "admin" },
  @{ Old = "b1mobile"; New = "mobile" },
  @{ Old = 'name": "B1Mobile"'; New = 'name": "mobile"' },
  @{ Old = 'name": "b1admin"'; New = 'name": "admin"' },
  @{ Old = "$churchapps"; New = "$repoRoot" },
  @{ Old = "churchapps project"; New = "Machon HaRuach project" },
  @{ Old = '"b1MobilePage"'; New = '"mobileAppPage"' }
)

$scanRoots = @(
  (Join-Path $root "Admin"),
  (Join-Path $root "Mobile"),
  (Join-Path $root "App"),
  (Join-Path $root "Api\src"),
  (Join-Path $root "scripts")
)

$filesChanged = 0
foreach ($scanRoot in $scanRoots) {
  if (-not (Test-Path $scanRoot)) { continue }
  Get-ChildItem -Path $scanRoot -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    if (ShouldSkipPath $_.FullName) { return }
    $content = [IO.File]::ReadAllText($_.FullName)
    $original = $content
    foreach ($r in $replacements) {
      $content = $content.Replace($r.Old, $r.New)
    }
    if ($content -ne $original) {
      [IO.File]::WriteAllText($_.FullName, $content)
      $filesChanged++
    }
  }
}

Write-Host "Updated $filesChanged files under Admin, Mobile, App, Api/src, scripts."
