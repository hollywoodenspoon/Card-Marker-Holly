import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Card Maker',
        short_name: 'Card Maker',
        description: 'Design cards and print them on A4 sheets. Works offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f6f6f7',
        theme_color: '#6d5dfc',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs offline, including the on-demand text editor
        // and PDF export chunks and the bundled fonts used for PDF outlines.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,woff}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // The editor shell (React, Konva, Radix, Dexie) is ~300 kB gzipped; the text editor is split out.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
