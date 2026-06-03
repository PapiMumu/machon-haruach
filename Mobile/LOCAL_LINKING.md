# Linking Admin ↔ Mobile (Local)

Admin and Mobile are linked through the **same backend APIs** (especially `MembershipApi`), not by directly calling each other.

## Branches example

- **Admin** saves branches as a **public church setting**:
  - `keyName = "branches"`
  - Value is JSON (array)
  - Stored in the Membership API / database

- **Mobile** reads branches from:
  - `GET /settings/public/<churchId>` on `MembershipApi`
  - It then parses `settings.branches` and shows it in the dropdown.

## Make them point to the same APIs (local)

1) Start your backend `Api` (the aggregated server on `http://localhost:8084`).

2) Start Admin (already uses `Admin/.env`):

- `REACT_APP_MEMBERSHIP_API=http://localhost:8084/membership`
- etc.

3) Start Mobile using the helper script:

```powershell
.\scripts\start-b1mobile-local.ps1
```

This sets Expo env vars (`MEMBERSHIP_API`, `GIVING_API`, etc.) so the mobile app reads the same environment as Admin.

## Ensuring the correct churchId

For best reliability, set the Spirit Embassy church id in your shell before starting Expo:

```powershell
$env:DEFAULT_CHURCH_ID="<spirit-embassy-church-id>"
.\scripts\start-b1mobile-local.ps1
```

If `DEFAULT_CHURCH_ID` is not set, the app will fall back to searching for “Spirit Embassy” and using the first match (less reliable).

