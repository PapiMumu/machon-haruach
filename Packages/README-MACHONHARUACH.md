# Publishing `@machonharuach/*` packages

Phased publish pipeline for the Machon HaRuach fork of [ChurchApps/Packages](https://github.com/ChurchApps/Packages).

## Prerequisites

1. **npm org**: Create [@machonharuach](https://www.npmjs.com/org/create) on npmjs.com.
2. **Login**: `npm login` as a user with publish access to `@machonharuach`.
3. **Verify**: `npm whoami`

## Build status (local)

Phase 1 and Phase 2 **builds are complete** under `Packages/`:

- `helpers/dist`, `texting/dist`, `content-providers/dist`, `apihelper/dist`
- `apphelper/dist` plus `publish/apphelper-*` split packages

Publishing requires `npm login` on your machine.

## Phase 1 — Api backend packages

| Package | Version |
|---------|---------|
| `@machonharuach/helpers` | 1.2.31 |
| `@machonharuach/texting` | 0.1.1 |
| `@machonharuach/content-providers` | 0.1.8 |
| `@machonharuach/apihelper` | 0.5.4 |

```powershell
cd Packages
npm run phase1:build      # rebrand + build (no publish)
npm run phase1:publish    # build + publish all phase-1 packages
```

Publish order is enforced by the script (helpers → texting/content-providers → apihelper).

## Phase 2 — Admin / App frontend packages

Builds unified `apphelper`, then copies `dist/{donations,forms,login,markdown,website}` into `publish/apphelper-*` for legacy separate package names.

```powershell
cd Packages
npm run phase2:build
npm run phase2:publish
```

## Phase 3 — Consume in `machon-haruach`

After packages are on npm:

1. **Api** — remove `npm:@churchapps/...` aliases from `Api/package.json` and `Api/tools/layer-package.json`; use plain `@machonharuach/*` versions.
2. Run `npm install` in `Api`, `Admin`, `App`.
3. **Admin** — remove Vite `@churchapps` aliases once published `dist` imports `@machonharuach`.
4. Deploy: `cd Api && npm run deploy-staging`

## Notes

- First publish must use the versions in `machonharuach-versions.json` (match this repo’s lockfiles).
- To publish a fix, bump the version in `machonharuach-versions.json` and in app `package.json` files.
- `rebrand-scope.mjs` replaces `@churchapps/` in source and fixes `file:../helpers` peer deps.
