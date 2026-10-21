import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}
// The desktop (Electron) and Android (Capacitor) apps serve the same build from
// their own files and need no service worker.
const nativeApp = ['desktop', 'android'].includes(process.env.VITE_TARGET ?? '')

/** The Playtest page keeps only its own manifest (the PWA plugin adds Card Maker's to every page). */
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

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // GitHub Pages serves the app under /<repo>/; local dev and preview stay at /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: nativeApp,
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Card Maker',
        short_name: 'Card Maker',
        description: 'Design cards and print them on A4 sheets. Works offline.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f6f6f7',
        theme_color: '#0e9494',
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
      // Two apps from one build: Card Maker, and the Playtest app at playtest/.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        playtest: fileURLToPath(new URL('./playtest/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'electron/**/*.test.ts'],
  },
})
