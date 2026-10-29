import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/** Cozy Edition builds set VITE_EDITION=cozy (the page) or EDITION=cozy (electron/). */
export const isCozy = () => process.env.VITE_EDITION === 'cozy' || process.env.EDITION === 'cozy'

/** Cozy Edition's own version, separate from package.json's. */
export const COZY_VERSION = '0.1.0-beta.1'

const at = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))

/** Modules Cozy Edition leaves out, by how they are imported, and what stands in for them. */
export const COZY_STUBS: Record<string, string> = {
  '@/vector/ui/VectorMaker': 'src/cozy/none.tsx',
  '@/ui/export/GamePackDialog': 'src/cozy/none.tsx',
  '@/ui/desktop/UpdateMenuItems': 'src/cozy/none.tsx',
  '@/ui/pwa/UpdateButton': 'src/cozy/none.tsx',
  '@/ui/desktop/updates': 'src/cozy/noUpdates.ts',
  '@/ui/pwa/checkNow': 'src/cozy/noUpdates.ts',
  './updater': 'electron/cozy/noUpdater.ts',
  './updateHosts': 'electron/cozy/noUpdater.ts',
}

/** Swaps the left-out modules for their stand-ins, and drops the table's files (only in Cozy Edition builds). */
export function cozyStubs(): Plugin {
  let outDir = ''
  return {
    name: 'cozy-stubs',
    enforce: 'pre',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir)
    },
    // public/playtest/ (the table's icons and manifest) is copied in by Vite; take it out again.
    closeBundle() {
      if (isCozy()) rmSync(path.join(outDir, 'playtest'), { recursive: true, force: true })
    },
    resolveId(id) {
      if (!isCozy()) return undefined
      // Vite's "@" alias runs first, so "@/x" arrives as an absolute path into src/.
      const src = at('src/').replace(/\\/g, '/')
      const key = id
        .replace(/\\/g, '/')
        .replace(src, '@/')
        .replace(/\.tsx?$/, '')
      const stub = COZY_STUBS[key]
      return stub ? at(stub) : undefined
    },
  }
}
