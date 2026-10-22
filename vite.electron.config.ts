import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

/** Which build this is, as in vite.config.ts (electron/ reads src/app/appInfo.ts too). */
const build = process.env.GITHUB_SHA
  ? `${process.env.GITHUB_SHA.slice(0, 7)} · ${new Date().toISOString().slice(0, 10)}`
  : 'dev'

/** Builds the desktop app's main process and preload script (electron/) into dist-electron/. */
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(build) },
  publicDir: false,
  // Bundle electron-updater and its helpers in, so the app ships without node_modules.
  ssr: { noExternal: true },
  build: {
    ssr: true,
    outDir: 'dist-electron',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    rollupOptions: {
      input: { main: 'electron/main.ts', preload: 'electron/preload.ts' },
      external: ['electron', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
      output: { format: 'cjs', entryFileNames: '[name].cjs' },
    },
  },
})
