# electron/ map: desktop app
- `main.ts`: windows and IPC · `preload.ts`: the page's only file-system bridge (page side: `src/platform/desktop.ts`)
- `paths.ts`: folder access checks · `windows.ts`: link handling · `updater.ts`, `updateHosts.ts`: updates
- `cozy/`: Cozy edition (builds only on request)
Android lives in `android/` and `src/platform/android*.ts`.
