# storage/ map
- `index.ts`: picks a backend (folders on desktop, browser storage on web) · `backend.ts`: the interface
- `dexieBackend.ts`, `db.ts` (IndexedDB) · `folderBackend.ts`, `folderFormat.ts`, `sheetFiles.ts` (desktop folders)
- `autosave.ts`, `diff.ts`, `saveStatus.ts` · `projectFile.ts` (backup files), `repo.ts`, `base64.ts`
DB schema changes need a Dexie version bump and migration.
