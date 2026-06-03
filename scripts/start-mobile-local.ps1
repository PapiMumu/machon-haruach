$ErrorActionPreference = "Stop"

# This script starts Mobile pointed at your local Api (same endpoints Admin uses).
# NOTE: On Android emulator/device, `localhost` may not resolve to your PC.
# If auth/register show network errors, use scripts/start-b1mobile-live.ps1
# or replace localhost with your machine LAN IP / 10.0.2.2 for emulator.

$env:STAGE = "local"

# Default to a local demo church id (created by `npm run populateDemo:membership`) if not set.
if (-not $env:DEFAULT_CHURCH_ID) { $env:DEFAULT_CHURCH_ID = "CHU00000001" }

# Android emulator reaches your PC as 10.0.2.2. You can override with API_HOST=10.71.91.63 (LAN) if needed.
$apiHost = $env:API_HOST
if (-not $apiHost) { $apiHost = "10.0.2.2" }

# Match Admin/.env defaults (local Api aggregate)
if (-not $env:REACT_APP_MEMBERSHIP_API) { $env:REACT_APP_MEMBERSHIP_API = "http://$apiHost`:8084/membership" }
if (-not $env:REACT_APP_GIVING_API) { $env:REACT_APP_GIVING_API = "http://$apiHost`:8084/giving" }
if (-not $env:REACT_APP_CONTENT_API) { $env:REACT_APP_CONTENT_API = "http://$apiHost`:8084/content" }
if (-not $env:REACT_APP_MESSAGING_API) { $env:REACT_APP_MESSAGING_API = "http://$apiHost`:8084/messaging" }
if (-not $env:REACT_APP_ATTENDANCE_API) { $env:REACT_APP_ATTENDANCE_API = "http://$apiHost`:8084/attendance" }
if (-not $env:REACT_APP_DOING_API) { $env:REACT_APP_DOING_API = "http://$apiHost`:8084/doing" }

# Expo uses these env vars via Mobile/app.config.js
if (-not $env:MEMBERSHIP_API) { $env:MEMBERSHIP_API = $env:REACT_APP_MEMBERSHIP_API }
if (-not $env:GIVING_API) { $env:GIVING_API = $env:REACT_APP_GIVING_API }
if (-not $env:CONTENT_API) { $env:CONTENT_API = $env:REACT_APP_CONTENT_API }
if (-not $env:MESSAGING_API) { $env:MESSAGING_API = $env:REACT_APP_MESSAGING_API }
if (-not $env:ATTENDANCE_API) { $env:ATTENDANCE_API = $env:REACT_APP_ATTENDANCE_API }
if (-not $env:DOING_API) { $env:DOING_API = $env:REACT_APP_DOING_API }

Write-Host "Starting Mobile with:"
Write-Host "  STAGE=$env:STAGE"
Write-Host "  DEFAULT_CHURCH_ID=$env:DEFAULT_CHURCH_ID"
Write-Host "  MEMBERSHIP_API=$env:MEMBERSHIP_API"
Write-Host "  GIVING_API=$env:GIVING_API"

Push-Location (Join-Path $PSScriptRoot "..\\Mobile")
try {
  npm start -- --clear
} finally {
  Pop-Location
}

