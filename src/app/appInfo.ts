/**
 * The app's display name and version. "Hearthside Cardworks" is a working title: change
 * APP_NAME here, productName in electron-builder.yml, the <title> in index.html
 * and the PWA manifest in vite.config.ts to rename the app.
 * Stored data uses fixed internal ids (IndexedDB "card-maker", "cardmaker.*"
 * keys, the "card-maker-folder" format), so a rename never loses anything.
 */
export const APP_NAME = __COZY__ ? 'Hearthside Cardworks Cozy Edition' : 'Hearthside Cardworks'
/** Cozy Edition: the Windows-only edition (see docs/cozy-edition.md). */
export const IS_COZY: boolean = __COZY__
/** The companion app that plays game packs (also a working title; see playtest/index.html and its manifest). */
export const PLAYTEST_NAME = __COZY__ ? '' : 'Hearthside Table'
/** The game-maker app (working title; see engine/index.html and docs/engine.md). Not in the Cozy Edition. */
export const ENGINE_NAME = __COZY__ ? '' : 'Hearthside Engine'
/** The engine's own version, separate from the card app's package.json version. */
export const ENGINE_VERSION = '0.4.0-alpha.1'
export const APP_VERSION: string = __APP_VERSION__
export const APP_BUILD: string = __APP_BUILD__
/** The version as shown to people: "0.4.0 (abc1234 · 2026-10-22)". */
export const VERSION_LABEL = `${APP_VERSION} (${APP_BUILD})`
