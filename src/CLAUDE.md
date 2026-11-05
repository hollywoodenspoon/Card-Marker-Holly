# src/ map
Three apps share this folder: Card Maker (editor), Hearthside Table (playtest) and the Engine (game editor).

- `app/`: entry (`main.tsx`), workspaces (`workspace.ts`), Card Maker shell (`CardsApp.tsx`)
- Card Maker: `core/` (document model, render), `templates/`, `ui/`, `print/`, `storage/`, `assets/`, `vector/` (Vector Maker), `types/`
- Card game rules: `adventure/` (engine, card reader, bots, lab). Free-form table: `playtest/`
- Table app UI: `playtest-app/`. Game editor: `engine/`
- `help/`: in-app help (pages in `help/pages/`, cozy copies in `help/cozy/`)
- `platform/`: desktop (Electron bridge) and Android. `cozy/`: Cozy edition stubs (builds only on request)
- `lib/`: tiny shared helpers (`cn`, pointer)

Each big folder has its own CLAUDE.md. Spec: `.claude/rules/`.
