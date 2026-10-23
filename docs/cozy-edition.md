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

## Unchanged

The main app (web, desktop, pacman) keeps every feature, the credits for Adventure Scuffle! and Village Wizard, and its licence.
