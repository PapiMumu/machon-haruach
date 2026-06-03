## Spirit Embassy only (all stages)

This repo supports locking Admin to a **single church** (Spirit Embassy) so the user cannot switch between test/demo churches.

### Admin lock (UI-level)

In your environment variables (dev / staging / prod), set:

- `REACT_APP_DEFAULT_CHURCH_ID=<SPIRIT_EMBASSY_CHURCH_ID>`
- `REACT_APP_LOCK_CHURCH_ID=true`

Notes:

- `REACT_APP_DEFAULT_CHURCH_ID` should be the **Spirit Embassy** `churchId` from your Membership DB.
- When lock is enabled, the app filters `userChurches` to only the chosen church after login.

### Remove/disable demo churches (DB-level)

The Membership DB already supports hiding churches via `churches.archivedDate`.

Use the API tool script to archive all churches except Spirit Embassy:

```powershell
cd c:\Users\Red\Documents\Projects\churchapps\Api

# Dry run (prints what would be archived)
npm run archive-other-churches -- --stage staging --region us-east-2 --keep-church-name "Spirit Embassy" --dry-run

# Apply (requires --confirm)
npm run archive-other-churches -- --stage staging --region us-east-2 --keep-church-name "Spirit Embassy" --confirm
```

If you know the exact Spirit Embassy id, prefer:

```powershell
npm run archive-other-churches -- --stage staging --region us-east-2 --keep-church-id CHUxxxxxxxxxx --confirm
```

Repeat per stage (`dev`, `staging`, `prod`).

