# Machon HaRuach

**Machon HaRuach** (Hebrew: “Institute of the Spirit” / “Center of the Spirit”) is the ministry platform for mobile members, church administration, and the public member portal.

> **Workspace path:** clone or open this repo as `machon-haruach` (formerly `churchapps`).

## Applications

| Folder | Purpose |
|--------|---------|
| **Mobile** | React Native (Expo) member app — Machon HaRuach Mobile |
| **Admin** | Web admin console — Machon HaRuach Admin |
| **App** | Next.js member portal / giving / check-in |
| **Api** | Backend APIs (membership, giving, content, messaging, attendance) |

## Local development

```powershell
# Admin (from Admin/)
npm install
npm run dev

# Mobile — local API (from repo root)
.\scripts\start-mobile-local.ps1

# Mobile — hosted APIs
.\scripts\start-mobile-live.ps1
```

## Branding assets

Copy your logo into Admin, App, and Mobile asset paths:

```powershell
.\scripts\apply-church-logo.ps1 -SourcePath "C:\path\to\your-logo.png"
```

Admin UI overrides live in `Admin/public/machon-brand.css`.

## Notes

- NPM packages use the `@machonharuach/*` scope (helpers, apphelper, etc.). See [Packages/README-MACHONHARUACH.md](Packages/README-MACHONHARUACH.md) to build and publish them.
- Hosted API URLs may still use `churchapps.org` infrastructure until you point DNS/env to your own deployment.
- **Rename workspace folder** (close the IDE first):
  ```powershell
  .\scripts\rename-workspace-folder.ps1
  ```
  Then reopen the project at `Documents\Projects\machon-haruach`.

## Native app IDs

| Platform | Bundle / package ID |
|----------|---------------------|
| iOS | `org.machonharuach.mobile` |
| Android | `org.machonharuach.mobile` |
| Deep link scheme | `machonharuach` |

After changing bundle IDs, update **Firebase** / **Google Play** / **App Store Connect** and run a clean native build:

```powershell
cd Mobile
npx expo prebuild --clean
```

## API & DNS

Default URLs use **`machonharuach.org`**. Point DNS (or override `.env`) before production:

- `api.machonharuach.org` — API gateway
- `admin.machonharuach.org` — Admin
- `{subdomain}.machonharuach.org` — Member sites
