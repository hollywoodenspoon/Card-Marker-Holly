import { describe, expect, it } from 'vitest'
import { closeDoc, commit, openDoc, useEditor, updateLibrary } from '@/core/editor/editorStore'
import { createProject } from '@/core/model/factories'
import type { Asset } from '@/core/model/types'
import type { DesktopBridge } from '@/platform/desktop'
import { startAutosave } from './autosave'
import { folderBackend, folderName } from './folderBackend'
import { PROJECT_FILE, parseFolderFile } from './folderFormat'

/** An in-memory file system with the bridge's API. */
function memoryFs({ windows = false } = {}) {
  // Windows: either slash, any letter case.
  const k = (p: string) => (windows ? p.replace(/\\/g, '/').toLowerCase() : p)
  const files = new Map<string, Uint8Array>()
  const toBytes = (d: Uint8Array | string) =>
    typeof d === 'string' ? new TextEncoder().encode(d) : d
  const log: string[] = []
  const bridge: DesktopBridge = {
    platform: windows ? 'win32' : 'linux',
    paths: async () => ({ userData: '/data', documents: '/home/me/Documents' }),
    readFile: async (p) => files.get(k(p)) ?? null,
    async writeFile(p, d, opts) {
      p = k(p)
      if (opts?.backup && files.has(p)) files.set(`${p}.bak`, files.get(p)!)
      files.set(p, toBytes(d))
      log.push(`write ${p}`)
    },
    exists: async (p) => [...files.keys()].some((f) => f === k(p) || f.startsWith(`${k(p)}/`)),
    list: async (dir) => [...files.keys()].filter((k) => k.startsWith(`${dir}/`)),
    async remove(p) {
      files.delete(p)
      log.push(`remove ${p}`)
    },
    async removeProjectFolder(dir) {
      for (const k of [...files.keys()]) if (k.startsWith(`${dir}/`)) files.delete(k)
    },
    pickFolder: async () => null,
    saveFile: async () => null,
    reveal: async () => {},
    onBeforeClose: () => {},
  }
  return { bridge, files, log }
}

const text = (b: Uint8Array | undefined) => new TextDecoder().decode(b)

function picture(projectId: string, id: string, bytes: number[], mime = 'image/png'): Asset {
  return {
    id,
    projectId,
    name: id,
    mime,
    blob: new Blob([new Uint8Array(bytes)], { type: mime }),
    widthPx: 10,
    heightPx: 10,
    isVector: false,
    tags: [],
    createdAt: 1,
  }
}

describe('folder backend', () => {
  it('creates a project folder in Documents/<app>/<name> and lists it', async () => {
    const { bridge, files } = memoryFs()
    const b = folderBackend(bridge)
    const bundle = createProject('My: Game?')
    await b.saveBundle({ ...bundle, stylePresets: [], assets: [], fonts: [] })
    const json = files.get('/home/me/Documents/Hearthside Cardworks/My Game/project.json')
    expect(json).toBeDefined()
    expect(parseFolderFile(text(json)).project.id).toBe(bundle.project.id)
    const list = await b.listProjects()
    expect(list).toMatchObject([{ id: bundle.project.id, name: 'My: Game?', missing: false }])
    // A second project with the same name gets its own folder.
    await b.saveBundle({ ...createProject('My: Game?'), stylePresets: [], assets: [], fonts: [] })
    expect(files.has('/home/me/Documents/Hearthside Cardworks/My Game (2)/project.json')).toBe(true)
  })

  it('keeps using Documents/Card Maker from before the rename', async () => {
    const { bridge, files } = memoryFs()
    files.set('/home/me/Documents/Card Maker/Old/project.json', new Uint8Array([1]))
    const b = folderBackend(bridge)
    await b.saveBundle({ ...createProject('New'), stylePresets: [], assets: [], fonts: [] })
    expect(files.has('/home/me/Documents/Card Maker/New/project.json')).toBe(true)
  })

  it('autosaves edits, writes pictures once and removes deleted ones', async () => {
    const { bridge, files, log } = memoryFs()
    const b = folderBackend(bridge)
    const bundle = createProject('Saves')
    const pid = bundle.project.id
    await b.saveBundle({ ...bundle, stylePresets: [], assets: [], fonts: [] })
    const loaded = await b.loadProject(pid)
    openDoc(loaded!.doc, loaded!.library)
    const saver = startAutosave(useEditor, { delayMs: 5, backend: b })
    const dir = '/home/me/Documents/Hearthside Cardworks/Saves'

    updateLibrary((l) => {
      l.assets.a1 = picture(pid, 'a1', [1, 2, 3])
    })
    await saver.flush()
    expect([...files.get(`${dir}/images/a1.png`)!]).toEqual([1, 2, 3])

    // Renaming the picture rewrites project.json only.
    log.length = 0
    updateLibrary((l) => {
      l.assets.a1.name = 'Flame'
    })
    const cardId = bundle.cards[0].id
    commit((d) => {
      d.cards[cardId].name = 'Edited'
    })
    await saver.flush()
    expect(log).toEqual([`write ${dir}/${PROJECT_FILE}`])
    expect(files.has(`${dir}/${PROJECT_FILE}.bak`)).toBe(true)

    updateLibrary((l) => {
      delete l.assets.a1
    })
    await saver.flush()
    expect(files.has(`${dir}/images/a1.png`)).toBe(false)
    saver.stop()
    closeDoc()

    const again = await b.loadProject(pid)
    expect(again!.doc.cards[cardId].name).toBe('Edited')
    expect(again!.library.assets.a1).toBeUndefined()
  })

  it('replaces a project in its own folder, removing files the backup lacks', async () => {
    const { bridge, files } = memoryFs()
    const b = folderBackend(bridge)
    const bundle = createProject('Restore me')
    const pid = bundle.project.id
    const dir = '/home/me/Documents/Hearthside Cardworks/Restore me'
    const old = picture(pid, 'old', [9, 9])
    await b.saveBundle({ ...bundle, stylePresets: [], assets: [old], fonts: [] })
    expect(files.has(`${dir}/images/old.png`)).toBe(true)
    const fresh = picture(pid, 'new', [1, 2])
    await b.replaceBundle({
      ...bundle,
      project: { ...bundle.project, name: 'Restored' },
      stylePresets: [],
      assets: [fresh],
      fonts: [],
    })
    expect(files.has(`${dir}/images/old.png`)).toBe(false)
    expect([...files.get(`${dir}/images/new.png`)!]).toEqual([1, 2])
    const loaded = await b.loadProject(pid)
    expect(loaded!.doc.project.name).toBe('Restored')
    expect((await b.listProjects()).filter((p) => p.id === pid)).toHaveLength(1)
  })

  it('round-trips picture bytes and keeps entries whose file went missing', async () => {
    const { bridge, files } = memoryFs()
    const b = folderBackend(bridge)
    const bundle = createProject('Pics')
    const pid = bundle.project.id
    await b.saveBundle({
      ...bundle,
      stylePresets: [],
      assets: [picture(pid, 'p', [9, 8, 7]), picture(pid, 'gone', [1], 'image/jpeg')],
      fonts: [],
    })
    const dir = '/home/me/Documents/Hearthside Cardworks/Pics'
    files.delete(`${dir}/images/gone.jpg`)
    const loaded = await b.loadProject(pid)
    expect([...new Uint8Array(await loaded!.library.assets.p.blob.arrayBuffer())]).toEqual([
      9, 8, 7,
    ])
    expect(loaded!.library.assets.gone.blob.size).toBe(0)
    expect(loaded!.warnings?.[0]).toMatch(/images\/gone\.jpg/)
  })

  it('opens an existing folder, and gives a copied folder its own id', async () => {
    const { bridge, files } = memoryFs()
    const b = folderBackend(bridge)
    const bundle = createProject('Orig')
    await b.saveBundle({ ...bundle, stylePresets: [], assets: [], fonts: [] })
    const src = '/home/me/Documents/Hearthside Cardworks/Orig'
    for (const [k, v] of [...files])
      if (k.startsWith(src)) files.set(k.replace(src, '/usb/Copy'), v)

    const id = await b.addFolder('/usb/Copy')
    expect(id).not.toBe(bundle.project.id)
    const copy = parseFolderFile(text(files.get('/usb/Copy/project.json')))
    expect(copy.project.id).toBe(id)
    expect(copy.cards.every((c) => c.projectId === id)).toBe(true)
    expect((await b.listProjects()).map((p) => p.location).sort()).toEqual([src, '/usb/Copy'])
    await expect(b.addFolder('/nowhere')).rejects.toThrow(/project\.json/)
  })

  it('treats a Windows path spelled differently as the same folder', async () => {
    const { bridge } = memoryFs({ windows: true })
    const b = folderBackend(bridge)
    const bundle = createProject('Win')
    await b.saveBundle({ ...bundle, stylePresets: [], assets: [], fonts: [] })
    const [entry] = await b.listProjects()
    // The folder dialog hands back backslashes and other letter case.
    const picked = entry.location!.replace(/\//g, '\\').toUpperCase()
    expect(await b.addFolder(picked)).toBe(bundle.project.id)
    expect(await b.listProjects()).toHaveLength(1)
  })

  it('marks moved folders as missing and can locate them again', async () => {
    const { bridge, files } = memoryFs()
    const b = folderBackend(bridge)
    const bundle = createProject('Moved')
    await b.saveBundle({ ...bundle, stylePresets: [], assets: [], fonts: [] })
    const src = '/home/me/Documents/Hearthside Cardworks/Moved'
    for (const [k, v] of [...files])
      if (k.startsWith(src)) {
        files.set(k.replace(src, '/new/Moved'), v)
        files.delete(k)
      }
    expect((await b.listProjects())[0].missing).toBe(true)
    await b.relocate(bundle.project.id, '/new/Moved')
    expect((await b.listProjects())[0]).toMatchObject({ location: '/new/Moved', missing: false })
  })

  it('keeps settings in the data folder', async () => {
    const { bridge, files } = memoryFs()
    await folderBackend(bridge).setSetting('lastProjectId', 'x')
    expect(await folderBackend(bridge).getSetting('lastProjectId')).toBe('x')
    expect(JSON.parse(text(files.get('/data/settings.json'))).projectsDir).toBeUndefined()
  })

  it('recovers from project.json.tmp or .bak when project.json is missing or damaged', async () => {
    const { bridge, files } = memoryFs()
    const b = folderBackend(bridge)
    const bundle = createProject('Crash')
    await b.saveBundle({ ...bundle, stylePresets: [], assets: [], fonts: [] })
    const dir = '/home/me/Documents/Hearthside Cardworks/Crash'
    const good = files.get(`${dir}/${PROJECT_FILE}`)!
    // Stopped mid-save on Android: the old file was moved to .bak, the new one is still .tmp.
    files.delete(`${dir}/${PROJECT_FILE}`)
    files.set(`${dir}/${PROJECT_FILE}.tmp`, good)
    expect((await b.listProjects())[0].missing).toBe(false)
    const fromTmp = await b.loadProject(bundle.project.id)
    expect(fromTmp!.doc.project.id).toBe(bundle.project.id)
    expect(fromTmp!.warnings?.[0]).toMatch(/restored from project\.json\.tmp/)
    // A damaged project.json and a half-written .tmp: the .bak is used.
    files.set(`${dir}/${PROJECT_FILE}`, new TextEncoder().encode('{"format": "card-ma'))
    files.set(`${dir}/${PROJECT_FILE}.tmp`, new TextEncoder().encode('{'))
    files.set(`${dir}/${PROJECT_FILE}.bak`, good)
    expect((await b.loadProject(bundle.project.id))!.warnings?.[0]).toMatch(/project\.json\.bak/)
    // Nothing readable at all: the error says so.
    files.set(`${dir}/${PROJECT_FILE}.bak`, new TextEncoder().encode('x'))
    await expect(b.loadProject(bundle.project.id)).rejects.toThrow(/damaged/)
  })

  it('asks for a projects folder first when the platform needs one (Android)', async () => {
    const { bridge, files } = memoryFs()
    const b = folderBackend({ ...bridge, needsProjectsFolder: true })
    expect(await b.hasProjectsDir()).toBe(false)
    files.set('/sd/Hearthside Cardworks/.keep', new Uint8Array())
    await b.setProjectsDir('/sd/Hearthside Cardworks')
    expect(await b.hasProjectsDir()).toBe(true)
    // Access lost (folder gone): ask again.
    files.delete('/sd/Hearthside Cardworks/.keep')
    expect(await b.hasProjectsDir()).toBe(false)
    expect(await folderBackend(bridge).hasProjectsDir()).toBe(true)
  })

  it('makes safe folder names', () => {
    expect(folderName('a/b\\c:d*e?"f"<g>|h')).toBe('a b c d e f g h')
    expect(folderName('  ..dots.. ')).toBe('dots')
    expect(folderName('???')).toBe('Project')
  })
})
