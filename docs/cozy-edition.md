# Hearthside Cardworks Cozy Edition: plan

Agreed with the owner (Hanielle Marie N. Armas) on 2026-10-22. Build starts when the owner says go (planned for the weekend).

## What it is

- **Name:** "Hearthside Cardworks Cozy Edition", everywhere visible (window title, exe, About, Help, dialogs). The old name (Card Maker) never appears; internal storage ids may keep it.
- **Version:** `0.1.0-beta.1`.
- **Shell:** Electron (Tauri was dropped), Windows only, one portable exe, fully offline.

## Left out

- The Vector Maker.
- Hearthside Table, the game pack export and all of Adventure Scuffle! (rules engine, bots, Balance lab, the Playtest Help page). The words "Adventure" and "Scuffle" must not appear anywhere in the shipped files; the build checks this.
- The update checker: it never goes online.
- Any mention of the GitHub repository, of other devices or versions (web, Android, Linux, pacman), or of the old name.

## Help

- Its own pages, only about this Windows edition.
- Neutral examples: the Templates page uses `ATK`, `DEF` and `HP` instead of `A_AS` / `D_AS` / `FS_AS`. Comments in the mail-merge code that mention `Name_AS` are reworded.

## About, Credits and licence

- © 2026 Hanielle Marie N. Armas, all rights reserved. No Adventure Scuffle! or Village Wizard mention (none of their content ships).
- Required credits stay: the game-icons.net line (CC BY 3.0) and THIRD_PARTY_NOTICES.txt.
- Its own short end-user licence, shown in About.

## Protection (Electron)

- The page code is obfuscated at build time.
- The main process and preload are compiled to V8 bytecode.
- Electron fuses: asar integrity on, the app loads only from the asar, and RunAsNode, NODE_OPTIONS and inspect are all off.
- DevTools and F12 are removed.
- None of this makes extraction impossible; it makes it hard. The portable exe unpacks itself to %TEMP% each run.
- Without a code-signing certificate, SmartScreen warns about an unknown publisher.

## Since the plan

- CMYK PDF export (main app v0.3.0) is part of the print code, so Cozy Edition gets it too (owner's choice, 2026-10-23), with FOGRA39 and its Heidelberg licence text in the notices.
- The single portable exe stays, accepting a few seconds' slower start (owner confirmed, 2026-10-23).

## Replaces the Windows release

From main app v0.3.2-beta the Release workflow builds only the Arch package: the Windows Setup, the portable exe and the AppImage have stopped (owner, 2026-10-23). The Cozy Edition becomes the Windows download. When it is built it gets its own `windows-latest` job in `.github/workflows/release.yml`, reusing the `win` / `portable` sections kept in `electron-builder.yml` (with its own name, version and artifact name).

## Unchanged

The main app (web and the Arch package) keeps every feature, the credits for Adventure Scuffle! and Village Wizard, and its licence.

## As built (v0.6.0-beta)

One codebase, a build-time edition flag: `VITE_EDITION=cozy` (the page) and `EDITION=cozy` (electron/) set the `__COZY__` define. A Vite plugin (`scripts/cozyStubs.ts`) swaps the left-out modules for tiny stand-ins at resolve time, so the Vector Maker, the game pack dialog, Hearthside Table and the updater are absent from the Cozy bundle, not just hidden. The `{!__COZY__ && …}` branches in the UI are dropped as dead code.

- **Names and version:** `src/app/appInfo.ts` reads `__COZY__`; `APP_VERSION` is `0.1.0-beta.1` (its own, from `COZY_VERSION` in `scripts/cozyStubs.ts`), separate from `package.json`.
- **Left out:** the Vector Maker (rail, Assets buttons, the lazy view), the playtest link and game pack, and the updater. `src/app/main.tsx` skips the Android setup. The Android browser regex and library URLs that survive in third-party code are hidden by the obfuscator.
- **Help:** `src/help/topics.ts` filters the Vector Maker section, the playtest page and the website page under `__COZY__`, and gives `desktop-app` the Windows title; `src/help/cozy/*.md` replace a dozen pages (own About with the draft EULA, a Windows-only "The Windows app", no website/updater/table/vector mentions).
- **Electron:** `electron/main.ts` turns off DevTools (`devTools: false`, no F12 handler), never opens the table window, and keeps its data in a `cardworks-cozy` / "Hearthside Cardworks Cozy Edition data" folder so it never mixes with the main app.
- **Protection:** `scripts/cozy.mjs` obfuscates the page and preload (javascript-obfuscator 5.9.0, string array + base64, no control-flow flattening so the editor stays fast), compiles the main process to V8 bytecode (bytenode 1.5.7), and drops source maps. `electron-builder.cozy.yml` sets the fuses (asar integrity on, load only from asar, RunAsNode / NODE_OPTIONS / inspect off) and builds a Windows portable exe only, with its own appId and `Hearthside-Cardworks-Cozy-Edition-0.1.0-beta.1.exe` artifact name.
- **String check:** `scripts/cozyCheck.mjs` fails the build if "Adventure", "Scuffle", "Card Maker", "github", "pacman", "Android", "Linux" or "Hearthside Table" appear in the shipped files (the licence texts are exempt). It runs over `dist` + `dist-electron` and again over the packaged `app.asar`.
- **Release:** a `cozy` job on `windows-latest` in `.github/workflows/release.yml` runs `npm run cozy:dist` (bytecode must be made on the OS that runs it) and uploads the exe, which the publish job attaches to the versioned release next to the Arch package. It runs **only when the owner asks** (owner, 2026-10-29): tick **Build the Cozy Edition** when running the workflow by hand. Tag pushes and untouched runs build the Arch package alone.
- **Scope:** the Cozy Edition ships the basic Cardworks card editor only, never the whole suite (no Engine, no Play).
- **Draft EULA:** shown in About and shipped as `LICENSE.txt` (`electron/cozy/LICENSE.txt`). **The owner reviews the licence text before the build ships.**
- **Tests:** `src/cozy/edition.test.ts` (the flag and the stub map), `scripts/cozyCheck.test.ts` (the banned-word rules), and the Help tests run clean under `VITE_EDITION=cozy`.
