import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  powerSaveBlocker,
  protocol,
  session,
  shell,
  type IpcMainInvokeEvent,
} from 'electron'
import { APP_NAME } from '../src/app/appInfo'
import { AllowedRoots, isInside } from './paths'
import { isUpdateHost } from './updateHosts'
import { initUpdates, updatesEnabled } from './updater'
import { routeOpen } from './windows'

/**
 * The desktop app: the same build as the website, served from disk, with a
 * small bridge (preload.ts) for reading and writing project folders. It never
 * goes online.
 */

// Fixed folder names, so renaming the app never loses settings.
const DATA_ID = 'card-maker'
// The portable exe's data folder: the old name is kept when it is already there.
const portableData = (dir: string) =>
  existsSync(path.join(dir, 'Card Maker data'))
    ? path.join(dir, 'Card Maker data')
    : path.join(dir, `${APP_NAME} data`)

// The portable Windows exe keeps its data next to itself, never in AppData.
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
app.setPath(
  'userData',
  process.env.CARDMAKER_DATA_DIR ??
    (portableDir ? portableData(portableDir) : path.join(app.getPath('appData'), DATA_ID)),
)
const documentsDir = () => process.env.CARDMAKER_DOCUMENTS_DIR ?? app.getPath('documents')

const devUrl = process.env.CARDMAKER_DEV_URL
const distDir = path.join(__dirname, '..', 'dist')
const APP_ORIGIN = 'app://cardmaker'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
])

// ---------- paths the app may touch ----------

/** Real path of `p`, following links in the part of it that exists. */
function realPath(p: string): string {
  const full = path.resolve(p)
  let head = full
  const tail: string[] = []
  while (!existsSync(head)) {
    const up = path.dirname(head)
    if (up === head) return full
    tail.unshift(path.basename(head))
    head = up
  }
  return path.join(realpathSync.native(head), ...tail)
}

const roots = new AllowedRoots(realPath)
function seedRoots() {
  roots.add(app.getPath('userData'))
  roots.add(path.join(documentsDir(), APP_NAME))
  try {
    const s = JSON.parse(
      readFileSync(path.join(app.getPath('userData'), 'settings.json'), 'utf8'),
    ) as { projectsDir?: string; recent?: { location?: string }[] }
    roots.add(s.projectsDir)
    for (const r of s.recent ?? []) roots.add(r.location)
  } catch {
    // No settings yet.
  }
}

// ---------- file system bridge ----------

const isMissing = (e: unknown) => (e as NodeJS.ErrnoException)?.code === 'ENOENT'
let lastSaveDir: string | null = null

function registerIpc(win: () => BrowserWindow | null) {
  const handle = (channel: string, fn: (...args: never[]) => unknown) =>
    ipcMain.handle(channel, (e: IpcMainInvokeEvent, ...args: unknown[]) => {
      // Only our own page may call the bridge.
      if (!isOwnUrl(e.senderFrame?.url ?? '')) throw new Error('Not allowed')
      return (fn as (...a: unknown[]) => unknown)(...args)
    })

  handle('fs:paths', () => ({ userData: app.getPath('userData'), documents: documentsDir() }))

  // Long bot runs (Rush, tournaments, the Balance lab) keep the computer awake.
  ipcMain.handle('power:keepAwake', (e, on: unknown) => {
    if (!isOwnUrl(e.senderFrame?.url ?? '')) throw new Error('Not allowed')
    keepAwake(e.sender.id, on === true)
  })

  handle('fs:read', async (p: string) => {
    try {
      return new Uint8Array(await fs.readFile(roots.check(p)))
    } catch (e) {
      if (isMissing(e)) return null
      throw e
    }
  })

  handle(
    'fs:write',
    async (p: string, data: Uint8Array | string, opts?: { atomic?: boolean; backup?: boolean }) => {
      const file = roots.check(p)
      await fs.mkdir(path.dirname(file), { recursive: true })
      if (!opts?.atomic) return fs.writeFile(file, data)
      // Write a temp file, flush it to disk, then swap it in: a crash never leaves half a file.
      // The name the folder backend looks for when recovering after a crash.
      const tmp = `${file}.tmp`
      const h = await fs.open(tmp, 'w')
      try {
        await h.writeFile(data)
        await h.sync()
      } finally {
        await h.close()
      }
      if (opts.backup && existsSync(file)) await fs.copyFile(file, `${file}.bak`)
      await fs.rename(tmp, file)
    },
  )

  handle('fs:exists', (p: string) => existsSync(roots.check(p)))

  handle('fs:list', async (p: string) => {
    try {
      return await fs.readdir(roots.check(p))
    } catch (e) {
      if (isMissing(e)) return null
      throw e
    }
  })

  handle('fs:remove', (p: string) => fs.rm(roots.check(p), { force: true }))

  handle('fs:removeProject', async (p: string) => {
    const dir = roots.check(p)
    if (!existsSync(path.join(dir, 'project.json')))
      throw new Error('This folder does not look like a project, so it was not deleted.')
    // To the Recycle Bin / Trash, so it can still be brought back.
    await shell.trashItem(dir)
  })

  handle('dialog:pickFolder', async (opts: { title?: string; defaultPath?: string }) => {
    const w = win()
    const o = {
      title: String(opts?.title ?? ''),
      defaultPath: typeof opts?.defaultPath === 'string' ? opts.defaultPath : undefined,
      properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[],
    }
    const r = w ? await dialog.showOpenDialog(w, o) : await dialog.showOpenDialog(o)
    const dir = r.canceled ? null : (r.filePaths[0] ?? null)
    roots.add(dir)
    return dir
  })

  handle('dialog:save', async (name: string, data: Uint8Array) => {
    const w = win()
    const ext = path.extname(String(name)).slice(1)
    const o = {
      defaultPath: path.join(lastSaveDir ?? app.getPath('downloads'), path.basename(String(name))),
      filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [],
    }
    const r = w ? await dialog.showSaveDialog(w, o) : await dialog.showSaveDialog(o)
    if (r.canceled || !r.filePath) return null
    await fs.writeFile(r.filePath, data)
    lastSaveDir = path.dirname(r.filePath)
    return r.filePath
  })

  handle('shell:reveal', async (p: string) => {
    if (typeof p !== 'string' || !existsSync(p)) return
    // Folders open in the file manager; files are shown selected (never opened or run).
    if (statSync(p).isDirectory()) await shell.openPath(p)
    else shell.showItemInFolder(p)
  })
}

// ---------- window ----------

const isOwnUrl = (u: string) =>
  u.startsWith(`${APP_ORIGIN}/`) || (!!devUrl && u.startsWith(new URL(devUrl).origin))

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function serveApp() {
  protocol.handle('app', async (req) => {
    const { pathname } = new URL(req.url)
    let file = path.join(distDir, decodeURIComponent(pathname))
    // A folder serves its own page (playtest/ is Hearthside Table); anything else the editor.
    if (isInside(distDir, file) && existsSync(file) && statSync(file).isDirectory())
      file = path.join(file, 'index.html')
    if (!isInside(distDir, file) || !existsSync(file) || statSync(file).isDirectory())
      file = path.join(distDir, 'index.html')
    const res = await net.fetch(pathToFileURL(file).toString())
    if (!file.endsWith('.html')) return res
    const headers = new Headers(res.headers)
    headers.set('Content-Security-Policy', CSP)
    headers.set('Content-Type', 'text/html; charset=utf-8')
    return new Response(res.body, { status: res.status, headers })
  })
}

/**
 * Nothing leaves the computer: block every request that is not the app itself.
 * The one exception, only when the user turned updates on: the main process (never
 * the page) may ask GitHub for new versions.
 */
function stayOffline() {
  const s = session.defaultSession
  s.webRequest.onBeforeRequest((d, cb) => {
    const ok =
      /^(app|data|blob|devtools):/.test(d.url) ||
      // The app's own files, read by the app:// handler.
      (d.url.startsWith('file:') && isInside(distDir, fileURLToPath(d.url))) ||
      (!!devUrl && /^(https?|wss?):\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(d.url)) ||
      (!d.webContentsId && isUpdateHost(d.url) && updatesEnabled() === true)
    cb({ cancel: !ok })
  })
  s.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(['clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(permission)),
  )
}

let mainWindow: BrowserWindow | null = null
// Hearthside Table, in its own window (opened from the editor).
let tableWindow: BrowserWindow | null = null

// Each long run asks to stay awake (counted per window); the computer may sleep
// again once no run is left, or the window that asked is gone.
const awake = new Map<number, number>()
let blocker: number | null = null
function keepAwake(windowId: number, on: boolean | null) {
  const n = on === null ? 0 : Math.max(0, (awake.get(windowId) ?? 0) + (on ? 1 : -1))
  if (n) awake.set(windowId, n)
  else awake.delete(windowId)
  if (awake.size && blocker === null) blocker = powerSaveBlocker.start('prevent-app-suspension')
  if (!awake.size && blocker !== null) {
    powerSaveBlocker.stop(blocker)
    blocker = null
  }
}

const ownOrigins = () => [APP_ORIGIN, ...(devUrl ? [new URL(devUrl).origin] : [])]

const webPreferences = () => ({
  preload: path.join(__dirname, 'preload.cjs'),
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  spellcheck: true,
})

/** Links and keys every window shares: web links open in the browser, the table in its window. */
function guard(win: BrowserWindow) {
  const id = win.webContents.id
  win.on('closed', () => keepAwake(id, null))
  void win.webContents.setVisualZoomLevelLimits(1, 1)
  win.webContents.on('before-input-event', (e, input) => {
    const mod = input.control || input.meta
    if (input.type !== 'keyDown') return
    if (input.key === 'F12' || (mod && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools()
      e.preventDefault()
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    const route = routeOpen(url, ownOrigins())
    if (route === 'table') openTable(url)
    else if (route === 'external') void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!isOwnUrl(url)) e.preventDefault()
  })
}

/** Open Hearthside Table (with a pack, when the URL names one), or bring its window up. */
function openTable(url: string) {
  if (tableWindow && !tableWindow.isDestroyed()) {
    void tableWindow.loadURL(url)
    if (tableWindow.isMinimized()) tableWindow.restore()
    tableWindow.focus()
    return
  }
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 360,
    minHeight: 480,
    title: 'Hearthside Table',
    show: false,
    backgroundColor: '#1c1c1f',
    icon: path.join(distDir, 'pwa-512.png'),
    // Bot runs keep full speed while the window is behind others.
    webPreferences: { ...webPreferences(), backgroundThrottling: false },
  })
  tableWindow = win
  win.once('ready-to-show', () => win.show())
  guard(win)
  win.on('closed', () => (tableWindow = null))
  void win.loadURL(url)
}
// Set once the page has saved for an update install, so closing doesn't wait again.
let savedForUpdate = false

/** Let the page finish saving (up to 5 s). */
function saveBeforeQuit(win: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(t)
      ipcMain.removeListener('app:close-ready', done)
      resolve()
    }
    const t = setTimeout(done, 5000)
    ipcMain.once('app:close-ready', done)
    win.webContents.send('app:before-close')
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 360,
    minHeight: 480,
    title: APP_NAME,
    show: false,
    backgroundColor: '#1c1c1f',
    icon: path.join(distDir, 'pwa-512.png'),
    webPreferences: webPreferences(),
  })
  mainWindow = win
  win.once('ready-to-show', () => win.show())
  // The app has its own zoom (Ctrl + wheel, pinch); never zoom the whole page.
  guard(win)

  // Let the page finish saving before the window goes away.
  let closing = false
  win.on('close', (e) => {
    if (closing || savedForUpdate) return
    e.preventDefault()
    closing = true
    const done = () => {
      if (!win.isDestroyed()) win.destroy()
    }
    ipcMain.once('app:close-ready', done)
    setTimeout(done, 5000)
    win.webContents.send('app:before-close')
  })
  win.on('closed', () => {
    mainWindow = null
    // The table goes with the editor (the app quits).
    tableWindow?.close()
  })

  void (devUrl ? win.loadURL(devUrl) : win.loadURL(`${APP_ORIGIN}/index.html`))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.on('window-all-closed', () => app.quit())
  void app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    seedRoots()
    stayOffline()
    serveApp()
    registerIpc(() => mainWindow)
    initUpdates(
      () => mainWindow,
      async () => {
        if (mainWindow) await saveBeforeQuit(mainWindow)
        savedForUpdate = true
      },
    )
    createWindow()
  })
}
