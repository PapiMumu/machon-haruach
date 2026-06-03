# Renames ios/B1Mobile* to Mobile* and updates Xcode project references.
$ErrorActionPreference = "Stop"
$ios = Join-Path (Split-Path $PSScriptRoot -Parent) "Mobile\ios"
if (-not (Test-Path $ios)) { throw "Mobile/ios not found" }

function Replace-InFile($path, $map) {
  if (-not (Test-Path $path)) { return }
  $c = [IO.File]::ReadAllText($path)
  $n = $c
  foreach ($kv in $map.GetEnumerator()) { $n = $n.Replace($kv.Key, $kv.Value) }
  if ($n -ne $c) { [IO.File]::WriteAllText($path, $n) }
}

$map = [ordered]@{
  "B1Mobile" = "Mobile"
  "church.b1.mobile" = "org.machonharuach.mobile"
  "Pods-B1Mobile" = "Pods-Mobile"
  "Pods_B1Mobile" = "Pods_Mobile"
}

# Rename directories and files
$renames = @(
  @{ Old = "B1Mobile"; New = "Mobile" },
  @{ Old = "B1Mobile.xcodeproj"; New = "Mobile.xcodeproj" },
  @{ Old = "B1Mobile.xcworkspace"; New = "Mobile.xcworkspace" }
)
foreach ($r in $renames) {
  $oldPath = Join-Path $ios $r.Old
  $newPath = Join-Path $ios $r.New
  if ((Test-Path $oldPath) -and -not (Test-Path $newPath)) {
    Rename-Item -LiteralPath $oldPath -NewName $r.New
    Write-Host "Renamed $($r.Old) -> $($r.New)"
  }
}

$appDir = Join-Path $ios "Mobile"
$bridgeOld = Join-Path $appDir "B1Mobile-Bridging-Header.h"
$bridgeNew = Join-Path $appDir "Mobile-Bridging-Header.h"
if ((Test-Path $bridgeOld) -and -not (Test-Path $bridgeNew)) {
  Rename-Item -LiteralPath $bridgeOld -NewName "Mobile-Bridging-Header.h"
}

# Text replacements in ios tree
$textExts = @(".pbxproj", ".plist", ".xcscheme", ".xcworkspacedata", ".h", ".swift", ".m", ".json", ".entitlements", "")
Get-ChildItem $ios -Recurse -File | Where-Object {
  $textExts -contains $_.Extension -or $_.Name -eq "Podfile"
} | ForEach-Object {
  Replace-InFile $_.FullName $map
}

Write-Host "iOS native project renamed to Mobile."
