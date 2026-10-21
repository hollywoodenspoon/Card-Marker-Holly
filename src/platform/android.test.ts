import { describe, expect, it } from 'vitest'
import { closeDoc, commit, openDoc, useEditor } from '@/core/editor/editorStore'
import { createProject } from '@/core/model/factories'
import { startAutosave } from '@/storage/autosave'
import { folderBackend } from '@/storage/folderBackend'
import { androidBridge, fromBase64, toBase64 } from './android'
import type { FoldersPlugin } from './androidFolders'

/** The native plugin's behaviour, in memory: /app and one picked folder, /tree/0. */
function fakePlugin() {
  const files = new Map<string, Uint8Array>()
  const log: string[] = []
  const trees: string[] = []
  const inRoot = (p: string) => p.startsWith('/app/') || trees.some((t) => p.startsWith(`${t}/`))
  const check = (p: string) => {
    if (!inRoot(p)) throw new Error(`Unknown folder: ${p}`)
  }
  const plugin: FoldersPlugin = {
    async pickFolder() {
      trees.push(`/tree/${trees.length}`)
      return { path: trees.at(-1)!, label: 'Documents/Hearthside Cardworks' }
    },
    roots: async () => ({
      roots: trees.map((path) => ({ path, label: 'Documents/Hearthside Cardworks', granted: true })),
    }),
    async read({ path }) {
      check(path)
      const f = files.get(path)
      return { data: f ? toBase64(f) : null }
    },
    async write({ path, data, text, atomic, backup }) {
      check(path)
      const bytes = text != null ? new TextEncoder().encode(text) : fromBase64(data ?? '')
      if (!atomic) {
        files.set(path, bytes)
        log.push(`write ${path}`)
        return
      }
      // The same steps as FoldersPlugin.writeTreeFile.
      files.set(`${path}.tmp`, bytes)
      log.push(`write ${path}.tmp`)
      if (files.has(path)) {
        if (backup) {
          files.set(`${path}.bak`, files.get(path)!)
          log.push(`rename ${path} → .bak`)
        }
        files.delete(path)
      }
      files.set(path, files.get(`${path}.tmp`)!)
      files.delete(`${path}.tmp`)
      log.push(`rename .tmp → ${path}`)
    },
    exists: async ({ path }) => ({
      exists:
        [...files.keys()].some((k) => k === path || k.startsWith(`${path}/`)) ||
        trees.includes(path),
    }),
    list: async ({ path }) => ({
      names: [...files.keys()]
        .filter((k) => k.startsWith(`${path}/`))
        .map((k) => k.slice(path.length + 1)),
    }),
    async remove({ path }) {
      files.delete(path)
    },
    async removeProject({ path }) {
      if (!files.has(`${path}/project.json`)) throw new Error('not a project')
      for (const k of [...files.keys()]) if (k.startsWith(`${path}/`)) files.delete(k)
    },
    saveAs: async ({ name }) => ({ name }),
  }
  return { plugin, files, log }
}

describe('Android bridge', () => {
  it('round-trips bytes through base64, also large ones', () => {
    const big = new Uint8Array(200_000).map((_, i) => i % 256)
    expect(fromBase64(toBase64(big))).toEqual(big)
    expect(toBase64(new Uint8Array())).toBe('')
  })

  it('keeps projects in the picked folder and settings in the app', async () => {
    const { plugin, files, log } = fakePlugin()
    const bridge = androidBridge(plugin)
    const store = folderBackend(bridge)
    expect(await store.hasProjectsDir()).toBe(false)

    const root = await bridge.pickFolder({ title: 'x' })
    expect(root).toBe('/tree/0')
    await store.setProjectsDir(root!)
    expect(await store.hasProjectsDir()).toBe(true)
    expect(bridge.label!('/tree/0/My Game')).toBe('Documents/Hearthside Cardworks/My Game')

    const bundle = createProject('My Game')
    await store.saveBundle({ ...bundle, stylePresets: [], assets: [], fonts: [] })
    expect(files.has('/tree/0/My Game/project.json')).toBe(true)
    expect(files.has('/app/settings.json')).toBe(true)

    const loaded = await store.loadProject(bundle.project.id)
    openDoc(loaded!.doc, loaded!.library)
    const saver = startAutosave(useEditor, { delayMs: 5, backend: store })
    const cardId = bundle.cards[0].id
    log.length = 0
    commit((d) => {
      d.cards[cardId].name = 'Phone edit'
    })
    await saver.flush()
    saver.stop()
    closeDoc()
    // The swap: new file first, old one to .bak, then the rename.
    expect(log.filter((l) => l.includes('My Game'))).toEqual([
      'write /tree/0/My Game/project.json.tmp',
      'rename /tree/0/My Game/project.json → .bak',
      'rename .tmp → /tree/0/My Game/project.json',
    ])
    const again = await folderBackend(androidBridge(plugin)).loadProject(bundle.project.id)
    expect(again!.doc.cards[cardId].name).toBe('Phone edit')
  })

  it('saves on pause', async () => {
    let pause: (() => void) | null = null
    const bridge = androidBridge(fakePlugin().plugin, { onPause: (fn) => (pause = fn) })
    let saved = 0
    bridge.onBeforeClose(async () => {
      saved++
    })
    pause!()
    expect(saved).toBe(1)
  })
})
