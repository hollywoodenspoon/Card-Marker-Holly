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
  protocol,
  session,
  shell,
  type IpcMainInvokeEvent,
} from 'electron'
import { APP_NAME } from '../src/app/appInfo'
import { AllowedRoots, isInside } from './paths'

/**
 * The desktop app: the same build as the website, served from disk, with a
 * small bridge (preload.ts) for reading and writing project folders. It never
 * goes online.
 */

// Fixed folder names, so renaming the app never loses settings.
const DATA_ID = 'card-maker'
const PORTABLE_DATA = 'Card Maker data'

// The portable Windows exe keeps its data next to itself, never in AppData.
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
app.setPath(
  'userData',
  process.env.CARDMAKER_DATA_DIR ??
    (portableDir
      ? path.join(portableDir, PORTABLE_DATA)
      : path.join(app.getPath('appData'), DATA_ID)),
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
      const tmp = `${file}.tmp-${process.pid}`
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

/** Nothing leaves the computer: block every request that is not the app itself. */
function stayOffline() {
  const s = session.defaultSession
  s.webRequest.onBeforeRequest((d, cb) => {
    const ok =
      /^(app|data|blob|devtools):/.test(d.url) ||
      // The app's own files, read by the app:// handler.
      (d.url.startsWith('file:') && isInside(distDir, fileURLToPath(d.url))) ||
      (!!devUrl && /^(https?|wss?):\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(d.url))
    cb({ cancel: !ok })
  })
  s.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(['clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(permission)),
  )
}

let mainWindow: BrowserWindow | null = null

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  })
  mainWindow = win
  win.once('ready-to-show', () => win.show())
  // The app has its own zoom (Ctrl + wheel, pinch); never zoom the whole page.
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
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!isOwnUrl(url)) e.preventDefault()
  })

  // Let the page finish saving before the window goes away.
  let closing = false
  win.on('close', (e) => {
    if (closing) return
    e.preventDefault()
    closing = true
    const done = () => {
      if (!win.isDestroyed()) win.destroy()
    }
    ipcMain.once('app:close-ready', done)
    setTimeout(done, 5000)
    win.webContents.send('app:before-close')
  })
  win.on('closed', () => (mainWindow = null))

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
    createWindow()
  })
}
