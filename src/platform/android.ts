import type { DesktopBridge } from './desktop'
import type { FoldersPlugin } from './androidFolders'

/**
 * The Android app's bridge: the same API as the desktop app, on top of the
 * native folder plugin, so the folder storage (src/storage/folderBackend.ts)
 * works unchanged.
 */
export function androidBridge(
  plugin: FoldersPlugin,
  opts: { onPause?: (fn: () => void) => void } = {},
): DesktopBridge & { refreshRoots(): Promise<void> } {
  const labels = new Map<string, string>()
  const refreshRoots = async () => {
    const { roots } = await plugin.roots()
    labels.clear()
    for (const r of roots) labels.set(r.path, r.label)
  }
  void refreshRoots().catch(() => {})

  return {
    platform: 'android',
    canReveal: false,
    hasTrash: false,
    needsProjectsFolder: true,
    refreshRoots,
    label(path) {
      const m = /^(\/tree\/\d+)(.*)$/.exec(path)
      const root = m && labels.get(m[1])
      return root ? root + m![2] : path
    },
    // No Documents folder of our own: the first run asks for one (/tree/N).
    paths: async () => ({ userData: '/app', documents: '/app/projects' }),
    async readFile(path) {
      const { data } = await plugin.read({ path })
      return data == null ? null : fromBase64(data)
    },
    async writeFile(path, data, o) {
      const body = typeof data === 'string' ? { text: data } : { data: toBase64(data) }
      await plugin.write({ path, ...body, atomic: o?.atomic, backup: o?.backup })
    },
    exists: async (path) => (await plugin.exists({ path })).exists,
    list: async (dir) => (await plugin.list({ path: dir })).names,
    remove: (path) => plugin.remove({ path }),
    removeProjectFolder: (dir) => plugin.removeProject({ path: dir }),
    async pickFolder() {
      const r = await plugin.pickFolder()
      if (r.path && r.label) labels.set(r.path, r.label)
      return r.path
    },
    async saveFile(name, data) {
      return (await plugin.saveAs({ name, data: toBase64(data) })).name
    },
    reveal: async () => {},
    onBeforeClose(fn) {
      // Android may stop a backgrounded app without warning: save on every pause.
      opts.onPause?.(() => void fn())
    },
  }
}

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step)
    s += String.fromCharCode(...bytes.subarray(i, i + step))
  return btoa(s)
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}
