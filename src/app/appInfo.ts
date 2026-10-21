/**
 * The app's display name and version. "Card Maker" is a working title: change
 * APP_NAME here, productName in electron-builder.yml, the <title> in index.html
 * and the PWA manifest in vite.config.ts to rename the app.
 * Stored data uses fixed internal ids (IndexedDB "card-maker", "cardmaker.*"
 * keys, the "card-maker-folder" format), so a rename never loses anything.
 */
export const APP_NAME = 'Card Maker'
/** The companion app that plays game packs (also a working title; see playtest/index.html and its manifest). */
export const PLAYTEST_NAME = 'Card Maker Playtest'
export const APP_VERSION: string = __APP_VERSION__
