$ErrorActionPreference = "Stop"

# Start Mobile against hosted (live) APIs.
# Use this when local API networking is unavailable from emulator/device.

if (-not $env:DEFAULT_CHURCH_ID) {
  $env:DEFAULT_CHURCH_ID = "mCCKeam93TO"
}

$env:STAGE = "prod"
$env:MEMBERSHIP_API = "https://api.machonharuach.org/membership"
$env:GIVING_API = "https://api.machonharuach.org/giving"
$env:CONTENT_API = "https://api.machonharuach.org/content"
$env:MESSAGING_API = "https://api.machonharuach.org/messaging"
$env:ATTENDANCE_API = "https://api.machonharuach.org/attendance"
$env:DOING_API = "https://api.machonharuach.org/doing"
$env:LESSONS_API = "https://api.lessons.church"
$env:CONTENT_ROOT = "https://content.machonharuach.org"
$env:LESSONS_ROOT = "https://lessons.church"
$env:MEMBER_WEB_ROOT = "https://{subdomain}.machonharuach.org"

Write-Host "Starting Mobile with LIVE APIs:"
Write-Host "  DEFAULT_CHURCH_ID=$env:DEFAULT_CHURCH_ID"
Write-Host "  MEMBERSHIP_API=$env:MEMBERSHIP_API"

Push-Location (Join-Path $PSScriptRoot "..\\Mobile")
try {
  npm start
} finally {
  Pop-Location
}

