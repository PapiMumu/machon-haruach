# Phase 3 — Wire `machon-haruach` apps after npm publish

**Until packages are on npm**, Api uses local builds:

```json
"@machonharuach/helpers": "file:../Packages/helpers",
"@machonharuach/apihelper": "file:../Packages/apihelper",
"@machonharuach/content-providers": "file:../Packages/content-providers",
"@machonharuach/texting": "file:../Packages/texting"
```

Run the publish steps below **after** `npm run phase1:publish` and `npm run phase2:publish` succeed, then switch to registry versions.

## 1. Api `package.json`

Replace alias deps with direct versions:

```json
"@machonharuach/apihelper": "0.5.4",
"@machonharuach/content-providers": "0.1.8",
"@machonharuach/texting": "0.1.1"
```

Remove the `overrides` block for `@machonharuach/helpers`.

## 2. Api `tools/layer-package.json`

```json
"@machonharuach/apihelper": "0.5.4",
"@machonharuach/content-providers": "0.1.8",
"@machonharuach/texting": "0.1.1"
```

(no `npm:@churchapps/...` aliases)

## 3. Reinstall and deploy

```powershell
cd Api
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm run deploy-staging
```

## 4. Admin

After publish, reinstall Admin. If login works without Vite `@churchapps` aliases, remove the `churchappsAliases` block from `Admin/vite.config.ts`.

## 5. Verify registry

```powershell
npm view @machonharuach/helpers version
npm view @machonharuach/apihelper version
npm view @machonharuach/apphelper-donations version
```
