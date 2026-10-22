import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { themesCss } from './scripts/themesCss.ts'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}
// The desktop (Electron) and Android (Capacitor) apps serve the same build from
// their own files and need no service worker.
const nativeApp = ['desktop', 'android'].includes(process.env.VITE_TARGET ?? '')

/** `import 'virtual:themes.css'`: the colour themes, generated from src/ui/theme/themes.json. */
const themes = (): Plugin => ({
  name: 'themes-css',
  resolveId: (id) => (id === 'virtual:themes.css' ? '\0themes.css' : undefined),
  load: (id) => (id === '\0themes.css' ? themesCss() : undefined),
  handleHotUpdate: ({ file, server }) => {
    if (file.endsWith('themes.json')) server.moduleGraph.invalidateAll()
  },
})

/** The Playtest page keeps only its own manifest (the PWA plugin adds Hearthside Cardworks' to every page). */
const playtestManifest = (): Plugin => ({
  name: 'playtest-manifest',
  enforce: 'post',
  transformIndexHtml: {
    order: 'post',
    handler: (html, ctx) =>
      ctx.path.includes('/playtest/')
        ? html.replace(/<link rel="manifest" href="[^"]*\/manifest\.webmanifest">/, '')
        : html,
  },
})

/** Which build this is: the commit (from GitHub Actions) and the day, or "dev" locally. */
const build = process.env.GITHUB_SHA
  ? `${process.env.GITHUB_SHA.slice(0, 7)} · ${new Date().toISOString().slice(0, 10)}`
  : 'dev'

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(build) },
  // GitHub Pages serves the app under /<repo>/; local dev and preview stay at /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    themes(),
    VitePWA({
      disable: nativeApp,
      // A new version is offered ("Update"), never applied under a game in progress.
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Hearthside Cardworks',
        short_name: 'Hearthside',
        description: 'Design cards and print them on A4 sheets. Works offline.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#10131b',
        theme_color: '#10131b',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs offline, including the on-demand text editor
        // and PDF export chunks, the bundled fonts used for PDF outlines and the Help pictures.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,woff}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        // The Playtest app (playtest/) is precached too, but opens its own page.
        navigateFallbackDenylist: [/\/playtest\//],
      },
    }),
    playtestManifest(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // The editor shell (React, Konva, Radix, Dexie) is ~300 kB gzipped; the text editor is split out.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Two apps from one build: Hearthside Cardworks, and the Playtest app at playtest/.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        playtest: fileURLToPath(new URL('./playtest/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'electron/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
